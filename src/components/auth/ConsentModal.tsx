import { useState } from 'react'
import { CONSENT_VERSION } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import './ConsentModal.css'

export function ConsentModal() {
  const { refreshProfile } = useAuth()
  const [hipaa, setHipaa] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [terms, setTerms] = useState(false)
  const [notMedicalAdvice, setNotMedicalAdvice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = hipaa && privacy && terms && notMedicalAdvice

  async function handleAccept() {
    if (!supabase || !canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      const { error: rpcError } = await supabase.rpc('accept_consent', {
        p_version: CONSENT_VERSION,
      })
      if (rpcError) throw rpcError
      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save consent. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="consent-overlay" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="consent-modal">
        <h2 id="consent-title" className="consent-title">
          Before you continue
        </h2>
        <p className="consent-intro">
          Olise provides educational guidance for caregivers. Please review and accept the
          following to use the service.
        </p>

        <div className="consent-sections">
          <div className="consent-section">
            <h3>Not medical advice</h3>
            <p>
              Olise does not provide medical diagnosis, treatment, or emergency services. Always
              consult qualified clinicians for medical decisions. In a crisis, call 988 or your local
              emergency number.
            </p>
          </div>
          <div className="consent-section">
            <h3>Protected health information</h3>
            <p>
              Information you share may include health-related details about you or your children.
              We use it to personalize guidance and store it securely under our privacy practices.
            </p>
          </div>
          <div className="consent-section">
            <h3>Acceptable use</h3>
            <p>
              Attempts to extract system instructions, abuse the service, or misuse child data may
              result in account suspension.
            </p>
          </div>
        </div>

        <div className="consent-checkboxes">
          <label className="consent-checkbox">
            <input type="checkbox" checked={notMedicalAdvice} onChange={(e) => setNotMedicalAdvice(e.target.checked)} />
            <span>I understand Olise is not a substitute for professional medical care</span>
          </label>
          <label className="consent-checkbox">
            <input type="checkbox" checked={hipaa} onChange={(e) => setHipaa(e.target.checked)} />
            <span>I acknowledge how my health information may be used (HIPAA Notice placeholder)</span>
          </label>
          <label className="consent-checkbox">
            <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
            <span>I agree to the Privacy Policy (placeholder v1)</span>
          </label>
          <label className="consent-checkbox">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>I agree to the Terms of Service (placeholder v1)</span>
          </label>
        </div>

        {error && <div className="consent-error">{error}</div>}

        <div className="consent-actions">
          <button
            type="button"
            className="consent-submit"
            disabled={!canSubmit || submitting}
            onClick={handleAccept}
          >
            {submitting ? 'Saving…' : 'Accept and continue'}
          </button>
        </div>

        <p className="consent-legal-note">
          Consent version {CONSENT_VERSION}. Legal copy will be finalized before launch.
        </p>
      </div>
    </div>
  )
}
