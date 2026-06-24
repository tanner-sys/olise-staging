import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { AuthConfigWarning, AuthLayout } from './AuthLayout'

export function SignUpPage() {
  const navigate = useNavigate()
  const { session, isEmailVerified, hasConsent } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [over18, setOver18] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isSupabaseConfigured) {
    return <AuthConfigWarning />
  }

  if (session) {
    if (!isEmailVerified) return <Navigate to="/onboarding/verify-email" replace />
    if (!hasConsent) return <Navigate to="/" replace />
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!over18) {
      setError('You must confirm you are 18 or older to create an account.')
      return
    }

    if (!supabase) return

    setSubmitting(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo: `${window.location.origin}/onboarding/verify-email`,
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        await supabase
          .from('caregiver_profiles')
          .update({
            display_name: displayName.trim(),
            over_18_attested_at: new Date().toISOString(),
          })
          .eq('id', data.user.id)
      }

      const trimmedEmail = email.trim()

      if (data.session) {
        navigate('/onboarding/verify-email', { replace: true })
      } else {
        sessionStorage.setItem('pendingVerificationEmail', trimmedEmail)
        navigate('/onboarding/check-email', {
          replace: true,
          state: { email: trimmedEmail },
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Caregiver access for pediatric behavioral health guidance."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label className="auth-label" htmlFor="displayName">
            Full name
          </label>
          <input
            id="displayName"
            className="auth-input"
            type="text"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="auth-input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="auth-input"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <label className="auth-checkbox-row">
          <input
            type="checkbox"
            checked={over18}
            onChange={(e) => setOver18(e.target.checked)}
          />
          <span>I am 18 years of age or older</span>
        </label>

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account?{' '}
        <Link to="/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
