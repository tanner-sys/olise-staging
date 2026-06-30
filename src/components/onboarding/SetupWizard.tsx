import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Shield, UserPlus } from 'lucide-react'
import {
  AGE_BANDS,
  CHILD_CONDITIONS,
  type AgeBand,
  type ChildCondition,
} from '../../lib/constants'
import { activeChildren, getPlaceholderChild, setActiveChild } from '../../lib/children'
import { ensureChildChatSession } from '../../lib/chatStorage'
import { startTotpEnrollment, clearUnverifiedTotpFactors } from '../../lib/mfa'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import '../auth/AuthLayout.css'
import '../ProgramRunner.css'
import './SetupWizard.css'

type WizardStep = 'mfa' | 'add-child' | 'another-child' | 'done'

export function SetupWizard() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo
  const { user, children, refreshProfile, refreshChildren } = useAuth()
  const [step, setStep] = useState<WizardStep>('mfa')
  const childCount = activeChildren(children).filter((child) => !child.is_placeholder).length
  const [displayName, setDisplayName] = useState('')
  const [ageBand, setAgeBand] = useState<AgeBand>('6_8')
  const [conditions, setConditions] = useState<ChildCondition[]>([])
  const [medicationsNotes, setMedicationsNotes] = useState('')
  const [mfaMessage, setMfaMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const steps: WizardStep[] = ['mfa', 'add-child', 'another-child', 'done']
  const stepIndex = steps.indexOf(step)
  const progressPercent = Math.round(((stepIndex + 1) / steps.length) * 100)

  function toggleCondition(value: ChildCondition) {
    setConditions((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    )
  }

  async function skipMfa() {
    setStep('add-child')
  }

  async function enrollMfa() {
    if (!supabase) return
    setError(null)
    setMfaMessage(null)
    setSubmitting(true)
    try {
      await startTotpEnrollment()
      setMfaMessage(
        'Authenticator setup started. Open Settings → Security to scan the QR code and verify your code.',
      )
      setStep('add-child')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA enrollment failed. You can skip for now.')
      try {
        await clearUnverifiedTotpFactors()
      } catch {
        // Ignore cleanup errors on failed enroll.
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function saveChild() {
    if (!supabase || !user || !displayName.trim()) {
      setError('Please enter a name for your child.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const placeholder = getPlaceholderChild(children)
      const isFirstNamedChild = childCount === 0
      const childName = displayName.trim()
      let savedChildId: string | null = null

      if (placeholder && isFirstNamedChild) {
        savedChildId = placeholder.id
        const { error: updateError } = await supabase
          .from('children')
          .update({
            display_name: childName,
            age_band: ageBand,
            conditions,
            medications_notes: medicationsNotes.trim() || null,
            is_placeholder: false,
          })
          .eq('id', placeholder.id)
        if (updateError) throw updateError
        await setActiveChild(user.id, placeholder.id)
      } else {
        const { data: newChild, error: insertError } = await supabase
          .from('children')
          .insert({
            caregiver_id: user.id,
            display_name: childName,
            age_band: ageBand,
            conditions,
            medications_notes: medicationsNotes.trim() || null,
          })
          .select('id')
          .single()
        if (insertError) throw insertError
        savedChildId = newChild?.id ?? null
        if (isFirstNamedChild && savedChildId) {
          await setActiveChild(user.id, savedChildId)
        }
      }

      if (savedChildId) {
        await ensureChildChatSession(user.id, savedChildId, childName)
      }

      setDisplayName('')
      setAgeBand('6_8')
      setConditions([])
      setMedicationsNotes('')
      await refreshChildren()
      await refreshProfile()
      setStep('another-child')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save child profile.')
    } finally {
      setSubmitting(false)
    }
  }

  async function finishWizard() {
    if (!supabase || !user) return
    setSubmitting(true)
    try {
      await supabase
        .from('caregiver_profiles')
        .update({ setup_completed_at: new Date().toISOString() })
        .eq('id', user.id)
      await refreshProfile()
      navigate(returnTo ?? '/')
    } finally {
      setSubmitting(false)
    }
  }

  function skipChild() {
    if (childCount > 0) {
      void finishWizard()
    } else {
      setStep('another-child')
    }
  }

  return (
    <div className="setup-wizard">
      <div className="program-runner">
        <header className="program-runner-header">
          <button type="button" className="program-exit" onClick={() => navigate('/')}>
            <ArrowLeft size={14} strokeWidth={1.75} />
            <span>Chat home</span>
          </button>
          <div className="program-progress-bar" aria-hidden="true">
            <div className="program-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="program-progress-label">
            {stepIndex + 1} / {steps.length}
          </span>
        </header>

        <article className="program-step">
          {step === 'mfa' && (
            <>
              <p className="program-step-eyebrow">Step 1 — Optional</p>
              <h1 className="program-step-title">Secure your account</h1>
              <div className="program-step-body setup-wizard-body">
                <p>
                  Add an authenticator app for an extra layer of security. You can skip this and
                  enable MFA later in Settings.
                </p>
                {mfaMessage && <p className="setup-wizard-success">{mfaMessage}</p>}
              </div>
              <div className="setup-wizard-actions">
                <button type="button" className="setup-wizard-primary" onClick={enrollMfa} disabled={submitting}>
                  <Shield size={14} strokeWidth={1.75} />
                  <span>{submitting ? 'Setting up…' : 'Set up MFA'}</span>
                </button>
                <button type="button" className="setup-wizard-secondary" onClick={skipMfa}>
                  Skip for now
                </button>
              </div>
            </>
          )}

          {step === 'add-child' && (
            <>
              <p className="program-step-eyebrow">Step 2 — Optional</p>
              <h1 className="program-step-title">Add a child</h1>
              <div className="setup-wizard-form">
                {error && <div className="setup-wizard-error">{error}</div>}
                <div className="auth-field">
                  <label className="auth-label" htmlFor="childName">
                    First name or nickname
                  </label>
                  <input
                    id="childName"
                    className="auth-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="ageBand">
                    Age range
                  </label>
                  <select
                    id="ageBand"
                    className="auth-input setup-wizard-select"
                    value={ageBand}
                    onChange={(e) => setAgeBand(e.target.value as AgeBand)}
                  >
                    {AGE_BANDS.map((band) => (
                      <option key={band.value} value={band.value}>
                        {band.label}
                      </option>
                    ))}
                  </select>
                </div>
                <fieldset className="setup-wizard-fieldset">
                  <legend className="auth-label">Conditions (optional)</legend>
                  <div className="setup-wizard-chips">
                    {CHILD_CONDITIONS.map((condition) => (
                      <label key={condition.value} className="setup-wizard-chip">
                        <input
                          type="checkbox"
                          checked={conditions.includes(condition.value)}
                          onChange={() => toggleCondition(condition.value)}
                        />
                        <span>{condition.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="medNotes">
                    Medication notes (optional)
                  </label>
                  <textarea
                    id="medNotes"
                    className="auth-input setup-wizard-textarea"
                    rows={2}
                    maxLength={500}
                    value={medicationsNotes}
                    onChange={(e) => setMedicationsNotes(e.target.value)}
                    placeholder="Brief notes only — no prescription details required"
                  />
                </div>
              </div>
              <div className="setup-wizard-actions">
                <button
                  type="button"
                  className="setup-wizard-primary"
                  onClick={saveChild}
                  disabled={submitting}
                >
                  <UserPlus size={14} strokeWidth={1.75} />
                  <span>{submitting ? 'Saving…' : 'Save child'}</span>
                </button>
                <button type="button" className="setup-wizard-secondary" onClick={skipChild}>
                  Skip for now
                </button>
              </div>
            </>
          )}

          {step === 'another-child' && (
            <>
              <p className="program-step-eyebrow">Step 3</p>
              <h1 className="program-step-title">Add another child?</h1>
              <div className="program-step-body setup-wizard-body">
                <p>
                  {childCount > 0
                    ? `You've added ${childCount} ${childCount === 1 ? 'child' : 'children'}. Add another sibling profile or finish setup.`
                    : 'You can add child profiles anytime from Settings. Finish setup to start chatting.'}
                </p>
              </div>
              <div className="setup-wizard-actions">
                <button
                  type="button"
                  className="setup-wizard-primary"
                  onClick={() => setStep('add-child')}
                >
                  <UserPlus size={14} strokeWidth={1.75} />
                  <span>Add another child</span>
                </button>
                <button
                  type="button"
                  className="setup-wizard-secondary"
                  onClick={finishWizard}
                  disabled={submitting}
                >
                  <Check size={14} strokeWidth={1.75} />
                  <span>{submitting ? 'Finishing…' : 'Finish setup'}</span>
                </button>
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              <p className="program-step-eyebrow">All set</p>
              <h1 className="program-step-title">You&apos;re ready</h1>
              <div className="program-step-body">
                <p>Your account is set up. Head to chat home to get started.</p>
              </div>
              <div className="setup-wizard-actions">
                <button type="button" className="setup-wizard-primary" onClick={() => navigate('/')}>
                  <ArrowRight size={14} strokeWidth={1.75} />
                  <span>Go to chat home</span>
                </button>
              </div>
            </>
          )}
        </article>
      </div>
    </div>
  )
}
