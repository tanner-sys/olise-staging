import { useState } from 'react'
import { Shield } from 'lucide-react'
import type { MfaEnrollment } from '../../lib/mfa'
import { markProfileMfaEnrolled, verifyTotpEnrollment } from '../../lib/mfa'
import { useAuth } from '../../hooks/useAuth'
import './MfaEnrollPanel.css'

type MfaEnrollPanelProps = {
  enrollment: MfaEnrollment
  onComplete: () => void
  onCancel: () => void
}

export function MfaEnrollPanel({ enrollment, onComplete, onCancel }: MfaEnrollPanelProps) {
  const { user, refreshProfile } = useAuth()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault()
    if (!user || busy) return

    setBusy(true)
    setError(null)
    try {
      await verifyTotpEnrollment(enrollment.factorId, code)
      await markProfileMfaEnrolled(user.id, true)
      await refreshProfile()
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mfa-enroll-panel">
      <h3 className="mfa-enroll-title">Set up authenticator app</h3>
      <p className="mfa-enroll-intro">
        Scan this QR code with Google Authenticator, 1Password, or another TOTP app. Then enter
        the 6-digit code to confirm.
      </p>

      <div className="mfa-enroll-qr-wrap">
        {enrollment.qrCode ? (
          <div
            className="mfa-enroll-qr"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: enrollment.qrCode }}
          />
        ) : (
          <p className="mfa-enroll-fallback">Use the manual key below if QR scanning is unavailable.</p>
        )}
      </div>

      <div className="mfa-enroll-secret">
        <span className="mfa-enroll-secret-label">Manual key</span>
        <code className="mfa-enroll-secret-value">{enrollment.secret}</code>
      </div>

      <form className="mfa-enroll-form" onSubmit={(event) => void handleVerify(event)}>
        <label className="mfa-enroll-code-label" htmlFor="mfa-verify-code">
          Verification code
        </label>
        <input
          id="mfa-verify-code"
          className="mfa-enroll-code-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          disabled={busy}
        />

        {error && (
          <p className="mfa-enroll-error" role="alert">
            {error}
          </p>
        )}

        <div className="mfa-enroll-actions">
          <button type="submit" className="settings-btn settings-btn--primary" disabled={busy || code.length !== 6}>
            <Shield size={14} strokeWidth={1.75} />
            <span>{busy ? 'Verifying…' : 'Verify and enable'}</span>
          </button>
          <button
            type="button"
            className="settings-btn settings-btn--secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
