import type { ReactNode } from 'react'
import './AuthLayout.css'

function OliseLogo() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2 11V3.5C2 3.5 3.5 2 5.5 3.5C7.5 5 7.5 9 7.5 9C7.5 9 7.5 5 9.5 3.5C11.5 2 13 3.5 13 3.5V11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type AuthLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-brand">
          <OliseLogo />
          <span>Olise</span>
        </div>
        <h1 className="auth-title">{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

export function AuthConfigWarning() {
  return (
    <div className="auth-layout">
      <div className="auth-config-warning">
        Supabase is not configured. Copy <code>.env.example</code> to <code>.env</code> and set{' '}
        <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> from{' '}
        <code>supabase status</code> in <code>olise-supabase</code>.
      </div>
    </div>
  )
}
