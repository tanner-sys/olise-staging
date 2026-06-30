import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ConsentModal } from '../components/auth/ConsentModal'
import { LoginPage, VerifyEmailPage, CheckEmailPage } from '../components/auth/LoginPage'
import { SignUpPage } from '../components/auth/SignUpPage'
import { AuthConfigWarning } from '../components/auth/AuthLayout'
import { SetupWizard } from '../components/onboarding/SetupWizard'
import App from './App'

function AuthLoading() {
  return (
    <div className="auth-layout">
      <p className="auth-hint">Loading…</p>
    </div>
  )
}

export function AppRouter() {
  const { loading, session, isEmailVerified, hasConsent } = useAuth()
  const location = useLocation()

  if (!isSupabaseConfigured) {
    return (
      <Routes>
        <Route path="*" element={<AuthConfigWarning />} />
      </Routes>
    )
  }

  if (loading) {
    return <AuthLoading />
  }

  const publicPaths = ['/signup', '/login', '/onboarding/check-email']
  const isPublicPath = publicPaths.includes(location.pathname)

  if (!session && !isPublicPath) {
    return <Navigate to="/signup" replace />
  }

  if (session && !isEmailVerified) {
    if (location.pathname === '/onboarding/check-email') {
      return <Navigate to="/onboarding/verify-email" replace />
    }
    if (location.pathname !== '/onboarding/verify-email') {
      return <Navigate to="/onboarding/verify-email" replace />
    }
  }

  if (session && isEmailVerified && isPublicPath) {
    return <Navigate to="/" replace />
  }

  if (
    session &&
    isEmailVerified &&
    (location.pathname === '/onboarding/verify-email' ||
      location.pathname === '/onboarding/check-email')
  ) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <Routes>
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding/check-email" element={<CheckEmailPage />} />
        <Route path="/onboarding/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/onboarding/setup"
          element={
            hasConsent ? <SetupWizard /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/*"
          element={
            session && isEmailVerified ? <App /> : <Navigate to="/signup" replace />
          }
        />
      </Routes>
      {session && isEmailVerified && !hasConsent && <ConsentModal />}
    </>
  )
}
