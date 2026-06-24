import { ArrowLeft, CreditCard, LogOut, Shield, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AGE_BANDS } from '../../lib/constants'
import {
  activeChildren,
  archiveChild,
  displayChildName,
  setActiveChild,
} from '../../lib/children'
import { ensureChildChatSession } from '../../lib/chatStorage'
import { supabase } from '../../lib/supabase'
import type { ChildProfile } from '../../types/database'
import { StatePanel } from '../state/StatePanel'
import '../ProgramRunner.css'
import '../auth/AuthLayout.css'
import '../onboarding/SetupWizard.css'
import {
  ChildProfileForm,
  childToFormValues,
  emptyChildFormValues,
  type ChildFormValues,
} from './ChildProfileForm'
import './SettingsPage.css'

const stripePortalUrl = import.meta.env.VITE_STRIPE_PORTAL_URL?.trim() || ''

function ageBandLabel(value: string): string {
  return AGE_BANDS.find((band) => band.value === value)?.label ?? value
}

type ChildEditorMode = { type: 'none' } | { type: 'new' } | { type: 'edit'; childId: string }

export function SettingsPage() {
  const navigate = useNavigate()
  const {
    user,
    profile,
    children,
    isEmailVerified,
    refreshProfile,
    refreshChildren,
    profileError,
    childrenLoadError,
    signOut,
  } = useAuth()

  const [accountName, setAccountName] = useState(profile?.display_name ?? '')
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountMessage, setAccountMessage] = useState<string | null>(null)
  const [accountError, setAccountError] = useState(false)

  const [childEditor, setChildEditor] = useState<ChildEditorMode>({ type: 'none' })
  const [childForm, setChildForm] = useState<ChildFormValues>(emptyChildFormValues())
  const [childError, setChildError] = useState<string | null>(null)
  const [childSaving, setChildSaving] = useState(false)

  const [securityBusy, setSecurityBusy] = useState(false)
  const [securityMessage, setSecurityMessage] = useState<string | null>(null)
  const [securityError, setSecurityError] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const childList = useMemo(() => activeChildren(children), [children])
  const editingChild =
    childEditor.type === 'edit'
      ? childList.find((child) => child.id === childEditor.childId)
      : undefined

  useEffect(() => {
    setAccountName(profile?.display_name ?? '')
  }, [profile?.display_name])

  async function saveAccountName() {
    if (!supabase || !user || !accountName.trim()) return
    setAccountSaving(true)
    setAccountMessage(null)
    setAccountError(false)
    try {
      const { error } = await supabase
        .from('caregiver_profiles')
        .update({ display_name: accountName.trim() })
        .eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      setAccountMessage('Display name saved.')
    } catch (err) {
      setAccountError(true)
      setAccountMessage(err instanceof Error ? err.message : 'Could not save display name.')
    } finally {
      setAccountSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function openNewChildForm() {
    setChildEditor({ type: 'new' })
    setChildForm(emptyChildFormValues())
    setChildError(null)
  }

  function openEditChildForm(child: ChildProfile) {
    setChildEditor({ type: 'edit', childId: child.id })
    setChildForm(childToFormValues(child))
    setChildError(null)
  }

  function cancelChildForm() {
    setChildEditor({ type: 'none' })
    setChildForm(emptyChildFormValues())
    setChildError(null)
  }

  async function saveChildForm() {
    if (!supabase || !user || !childForm.displayName.trim()) {
      setChildError('Please enter a name for your child.')
      return
    }

    setChildSaving(true)
    setChildError(null)

    const payload = {
      display_name: childForm.displayName.trim(),
      age_band: childForm.ageBand,
      conditions: childForm.conditions,
      medications_notes: childForm.medicationsNotes.trim() || null,
      is_placeholder: false,
    }

    try {
      if (childEditor.type === 'edit' && editingChild) {
        const { error } = await supabase
          .from('children')
          .update(payload)
          .eq('id', editingChild.id)
          .eq('caregiver_id', user.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('children')
          .insert({
            caregiver_id: user.id,
            ...payload,
          })
          .select('id')
          .single()
        if (error) throw error
        if (!profile?.active_child_id && data?.id) {
          await setActiveChild(user.id, data.id)
        }
        if (data?.id) {
          await ensureChildChatSession(user.id, data.id, childForm.displayName.trim())
        }
      }

      await refreshChildren()
      await refreshProfile()
      cancelChildForm()
    } catch (err) {
      setChildError(err instanceof Error ? err.message : 'Could not save child profile.')
    } finally {
      setChildSaving(false)
    }
  }

  async function handleSetActive(childId: string) {
    if (!user) return
    await setActiveChild(user.id, childId)
    await refreshProfile()
  }

  async function handleArchive(child: ChildProfile) {
    if (!user) return
    const name = displayChildName(child)
    if (!window.confirm(`Archive ${name}? Their chat and check-in history will be kept.`)) return

    setChildSaving(true)
    try {
      const ok = await archiveChild(user.id, child.id)
      if (!ok) throw new Error('Could not archive child.')
      if (childEditor.type === 'edit' && childEditor.childId === child.id) {
        cancelChildForm()
      }
      await refreshChildren()
      await refreshProfile()
    } catch (err) {
      setChildError(err instanceof Error ? err.message : 'Could not archive child.')
    } finally {
      setChildSaving(false)
    }
  }

  async function enrollMfa() {
    if (!supabase || !user) return
    setSecurityBusy(true)
    setSecurityMessage(null)
    setSecurityError(false)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator app',
      })
      if (error) throw error

      if (data?.totp?.uri) {
        await supabase
          .from('caregiver_profiles')
          .update({ mfa_enrolled_at: new Date().toISOString() })
          .eq('id', user.id)
        await refreshProfile()
        setSecurityMessage(
          'Authenticator enrollment started. Scan the QR code in your app, then verify when prompted on next login.',
        )
      }
    } catch (err) {
      setSecurityError(true)
      setSecurityMessage(err instanceof Error ? err.message : 'MFA enrollment failed.')
    } finally {
      setSecurityBusy(false)
    }
  }

  async function resendVerificationEmail() {
    if (!supabase || !user?.email) return
    setSecurityBusy(true)
    setSecurityMessage(null)
    setSecurityError(false)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding/verify-email`,
        },
      })
      if (error) throw error
      setSecurityMessage('Verification email sent. Check your inbox.')
    } catch (err) {
      setSecurityError(true)
      setSecurityMessage(err instanceof Error ? err.message : 'Could not send verification email.')
    } finally {
      setSecurityBusy(false)
    }
  }

  async function changePassword() {
    if (!supabase || !user?.email) return
    setSecurityMessage(null)
    setSecurityError(false)

    if (newPassword.length < 8) {
      setSecurityError(true)
      setSecurityMessage('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setSecurityError(true)
      setSecurityMessage('New passwords do not match.')
      return
    }

    setSecurityBusy(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) throw new Error('Current password is incorrect.')

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
      setSecurityMessage('Password updated.')
    } catch (err) {
      setSecurityError(true)
      setSecurityMessage(err instanceof Error ? err.message : 'Could not update password.')
    } finally {
      setSecurityBusy(false)
    }
  }

  function cancelPasswordForm() {
    setShowPasswordForm(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSecurityMessage(null)
    setSecurityError(false)
  }

  return (
    <div className="settings-page">
      <div className="program-runner">
        <header className="program-runner-header">
          <button type="button" className="program-exit" onClick={() => navigate('/')}>
            <ArrowLeft size={14} strokeWidth={1.75} />
            <span>Chat home</span>
          </button>
          <span className="program-progress-label">Settings</span>
        </header>

        {(profileError || childrenLoadError) && (
          <div className="settings-load-error">
            <StatePanel
              variant="error"
              title="Couldn't load settings"
              description={profileError ?? childrenLoadError ?? 'Something went wrong.'}
              primaryAction={{
                label: 'Retry',
                onClick: () => {
                  void refreshProfile()
                  void refreshChildren()
                },
              }}
              size="inline"
            />
          </div>
        )}

        <section className="settings-section" aria-labelledby="settings-account">
          <h2 id="settings-account" className="settings-section-title">
            Account
          </h2>
          <div className="auth-field">
            <label className="auth-label" htmlFor="settings-display-name">
              Display name
            </label>
            <input
              id="settings-display-name"
              className="auth-input"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="settings-actions">
            <button
              type="button"
              className="settings-btn settings-btn--primary"
              onClick={saveAccountName}
              disabled={accountSaving || !accountName.trim()}
            >
              {accountSaving ? 'Saving…' : 'Save name'}
            </button>
          </div>
          {accountMessage && (
            <p
              className={`settings-message ${
                accountError ? 'settings-message--error' : 'settings-message--success'
              }`}
            >
              {accountMessage}
            </p>
          )}
          <div className="settings-row" style={{ marginTop: 'var(--space-6)' }}>
            <span className="settings-row-label">Email</span>
            <span className="settings-row-value">{user?.email ?? '—'}</span>
          </div>
          <div className="settings-actions">
            <button type="button" className="settings-btn settings-btn--ghost" onClick={handleSignOut}>
              <LogOut size={14} strokeWidth={1.75} />
              <span>Sign out</span>
            </button>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-children">
          <h2 id="settings-children" className="settings-section-title">
            Children
          </h2>

          {childList.length === 0 && childEditor.type === 'none' && !childrenLoadError && (
            <div className="settings-empty-children">
              <StatePanel
                variant="empty"
                title="No children in your household"
                description="Add a child profile to personalize programs, routines, and chat."
                primaryAction={{ label: 'Add child', onClick: openNewChildForm }}
                size="compact"
              />
            </div>
          )}

          {childList.length > 0 && (
            <div className="settings-child-list">
              {childList.map((child) => (
                <div key={child.id} className="settings-child-card">
                  <div className="settings-child-card-main">
                    <p className="settings-child-name">{displayChildName(child)}</p>
                    <p className="settings-child-meta">
                      {ageBandLabel(child.age_band)}
                      {profile?.active_child_id === child.id ? ' · Active' : ''}
                      {child.is_placeholder ? ' · Placeholder' : ''}
                    </p>
                  </div>
                  <div className="settings-child-card-actions">
                    {profile?.active_child_id !== child.id && (
                      <button
                        type="button"
                        className="settings-btn settings-btn--secondary"
                        onClick={() => handleSetActive(child.id)}
                      >
                        Set active
                      </button>
                    )}
                    <button
                      type="button"
                      className="settings-btn settings-btn--secondary"
                      onClick={() => openEditChildForm(child)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="settings-btn settings-btn--danger"
                      onClick={() => handleArchive(child)}
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {childEditor.type !== 'none' && (
            <div className="settings-child-form-wrap">
              <ChildProfileForm
                idPrefix={childEditor.type === 'new' ? 'new-child' : 'edit-child'}
                values={childForm}
                onChange={setChildForm}
                error={childError}
              />
              <div className="settings-actions">
                <button
                  type="button"
                  className="settings-btn settings-btn--primary"
                  onClick={saveChildForm}
                  disabled={childSaving}
                >
                  {childSaving ? 'Saving…' : childEditor.type === 'new' ? 'Add child' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn--secondary"
                  onClick={cancelChildForm}
                  disabled={childSaving}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {childEditor.type === 'none' && (
            <button type="button" className="settings-btn settings-btn--secondary" onClick={openNewChildForm}>
              <UserPlus size={14} strokeWidth={1.75} />
              <span>Add child</span>
            </button>
          )}
        </section>

        <section className="settings-section" aria-labelledby="settings-subscription">
          <h2 id="settings-subscription" className="settings-section-title">
            Subscription
          </h2>
          <div className="settings-row">
            <div>
              <p className="settings-row-label">Plan</p>
              <p className="settings-row-meta">Subscription billing is not connected yet.</p>
            </div>
            <span className="settings-status settings-status--pending">Not active</span>
          </div>
          <div className="settings-actions">
            <button
              type="button"
              className="settings-btn settings-btn--secondary"
              disabled={!stripePortalUrl}
              onClick={() => {
                if (stripePortalUrl) window.open(stripePortalUrl, '_blank', 'noopener,noreferrer')
              }}
            >
              <CreditCard size={14} strokeWidth={1.75} />
              <span>Manage subscription</span>
            </button>
          </div>
          {!stripePortalUrl && (
            <p className="settings-hint">
              Stripe Customer Portal URL will be configured via <code>VITE_STRIPE_PORTAL_URL</code>.
            </p>
          )}
        </section>

        <section className="settings-section" aria-labelledby="settings-security">
          <h2 id="settings-security" className="settings-section-title">
            Security
          </h2>
          <div className="settings-row">
            <span className="settings-row-label">Email verification</span>
            <span
              className={`settings-status ${
                isEmailVerified ? 'settings-status--ok' : 'settings-status--pending'
              }`}
            >
              {isEmailVerified ? 'Verified' : 'Pending'}
            </span>
          </div>
          {!isEmailVerified && (
            <div className="settings-actions">
              <button
                type="button"
                className="settings-btn settings-btn--secondary"
                onClick={resendVerificationEmail}
                disabled={securityBusy}
              >
                Resend verification email
              </button>
            </div>
          )}

          <div className="settings-row">
            <span className="settings-row-label">Password</span>
            {!showPasswordForm && (
              <button
                type="button"
                className="settings-btn settings-btn--secondary"
                onClick={() => {
                  setShowPasswordForm(true)
                  setSecurityMessage(null)
                  setSecurityError(false)
                }}
              >
                Change password
              </button>
            )}
          </div>
          {showPasswordForm && (
            <div className="settings-child-form-wrap">
              <div className="setup-wizard-form">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="settings-current-password">
                    Current password
                  </label>
                  <input
                    id="settings-current-password"
                    className="auth-input"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="settings-new-password">
                    New password
                  </label>
                  <input
                    id="settings-new-password"
                    className="auth-input"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="settings-confirm-password">
                    Confirm new password
                  </label>
                  <input
                    id="settings-confirm-password"
                    className="auth-input"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="settings-actions">
                <button
                  type="button"
                  className="settings-btn settings-btn--primary"
                  onClick={changePassword}
                  disabled={securityBusy || !currentPassword || !newPassword || !confirmPassword}
                >
                  {securityBusy ? 'Updating…' : 'Update password'}
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn--secondary"
                  onClick={cancelPasswordForm}
                  disabled={securityBusy}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="settings-row">
            <span className="settings-row-label">Multi-factor authentication</span>
            <span
              className={`settings-status ${
                profile?.mfa_enrolled_at ? 'settings-status--ok' : 'settings-status--pending'
              }`}
            >
              {profile?.mfa_enrolled_at ? 'Enrolled' : 'Not enrolled'}
            </span>
          </div>
          {!profile?.mfa_enrolled_at && (
            <div className="settings-actions">
              <button
                type="button"
                className="settings-btn settings-btn--secondary"
                onClick={enrollMfa}
                disabled={securityBusy}
              >
                <Shield size={14} strokeWidth={1.75} />
                <span>{securityBusy ? 'Setting up…' : 'Set up MFA'}</span>
              </button>
            </div>
          )}
          {securityMessage && (
            <p
              className={`settings-message ${
                securityError ? 'settings-message--error' : 'settings-message--success'
              }`}
            >
              {securityMessage}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
