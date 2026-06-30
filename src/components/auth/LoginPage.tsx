import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { AuthConfigWarning, AuthLayout } from './AuthLayout'

const PENDING_EMAIL_KEY = 'pendingVerificationEmail'
const VERIFY_REDIRECT = `${window.location.origin}/onboarding/verify-email`

function readPendingEmail(stateEmail?: string): string | null {
  if (stateEmail?.trim()) return stateEmail.trim()
  const stored = sessionStorage.getItem(PENDING_EMAIL_KEY)
  return stored?.trim() || null
}

export function CheckEmailPage() {
  const location = useLocation()
  const stateEmail = (location.state as { email?: string } | null)?.email
  const pendingEmail = readPendingEmail(stateEmail)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (pendingEmail) {
      sessionStorage.setItem(PENDING_EMAIL_KEY, pendingEmail)
    }
  }, [pendingEmail])

  if (!isSupabaseConfigured) {
    return <AuthConfigWarning />
  }

  if (!pendingEmail) {
    return <Navigate to="/signup" replace />
  }

  async function handleResend() {
    if (!supabase || !pendingEmail) return
    setError(null)
    setMessage(null)
    setResending(true)
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: { emailRedirectTo: VERIFY_REDIRECT },
      })
      if (resendError) throw resendError
      setMessage('Verification email sent. Check your inbox.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend email.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout
      title="Check your email"
      subtitle={`We sent a verification link to ${pendingEmail}. Open it to continue setting up Olise.`}
    >
      {error && <div className="auth-error">{error}</div>}
      {message && <p className="auth-hint">{message}</p>}

      <div className="auth-hint">
        <Mail size={14} strokeWidth={1.75} />
        <span>Click the link in your email — you&apos;ll return here to finish onboarding</span>
      </div>

      <p className="auth-footer">
        Didn&apos;t receive it?{' '}
        <button type="button" className="auth-link" onClick={handleResend} disabled={resending}>
          {resending ? 'Sending…' : 'Resend email'}
        </button>
      </p>

      <p className="auth-footer">
        Already verified?{' '}
        <Link to="/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

export function LoginPage() {
  const { session, isEmailVerified, hasConsent } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    if (!supabase) return

    setSubmitting(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) throw signInError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to Olise.">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label className="auth-label" htmlFor="loginEmail">
            Email
          </label>
          <input
            id="loginEmail"
            className="auth-input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="loginPassword">
            Password
          </label>
          <input
            id="loginPassword"
            className="auth-input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-footer">
        New here?{' '}
        <Link to="/signup" className="auth-link">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}

export function VerifyEmailPage() {
  const { session, isEmailVerified, hasConsent, refreshProfile } = useAuth()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    const client = supabase
    if (!session || isEmailVerified || !client) return

    const interval = window.setInterval(() => {
      void client.auth.refreshSession()
    }, 3000)

    return () => window.clearInterval(interval)
  }, [session, isEmailVerified])

  useEffect(() => {
    if (isEmailVerified) {
      sessionStorage.removeItem(PENDING_EMAIL_KEY)
    }
  }, [isEmailVerified])

  if (!isSupabaseConfigured) {
    return <AuthConfigWarning />
  }

  if (!session) {
    const pendingEmail = sessionStorage.getItem(PENDING_EMAIL_KEY)
    if (pendingEmail) return <Navigate to="/onboarding/check-email" replace />
    return <Navigate to="/signup" replace />
  }

  if (isEmailVerified) {
    void refreshProfile()
    sessionStorage.removeItem(PENDING_EMAIL_KEY)
    if (!hasConsent) return <Navigate to="/" replace />
    return <Navigate to="/" replace />
  }

  async function handleResend() {
    if (!supabase || !session?.user?.email) return
    const email = session.user.email
    setError(null)
    setMessage(null)
    setResending(true)
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: VERIFY_REDIRECT,
        },
      })
      if (resendError) throw resendError
      setMessage('Verification email sent. Check your inbox.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend email.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout
      title="Check your email"
      subtitle={`We sent a verification link to ${session?.user?.email ?? 'your email'}.`}
    >
      {error && <div className="auth-error">{error}</div>}
      {message && <p className="auth-hint">{message}</p>}

      <div className="auth-hint">
        <Mail size={14} strokeWidth={1.75} />
        <span>Click the link in your email to continue</span>
      </div>

      <p className="auth-footer">
        Didn&apos;t receive it?{' '}
        <button type="button" className="auth-link" onClick={handleResend} disabled={resending}>
          {resending ? 'Sending…' : 'Resend email'}
        </button>
      </p>
    </AuthLayout>
  )
}
