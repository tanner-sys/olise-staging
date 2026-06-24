import {
  AGE_BANDS,
  CHILD_CONDITIONS,
  type AgeBand,
  type ChildCondition,
} from '../../lib/constants'
import '../auth/AuthLayout.css'
import '../onboarding/SetupWizard.css'

export type ChildFormValues = {
  displayName: string
  ageBand: AgeBand
  conditions: ChildCondition[]
  medicationsNotes: string
}

type ChildProfileFormProps = {
  values: ChildFormValues
  onChange: (values: ChildFormValues) => void
  error?: string | null
  idPrefix?: string
}

export function ChildProfileForm({
  values,
  onChange,
  error,
  idPrefix = 'child',
}: ChildProfileFormProps) {
  function toggleCondition(value: ChildCondition) {
    onChange({
      ...values,
      conditions: values.conditions.includes(value)
        ? values.conditions.filter((c) => c !== value)
        : [...values.conditions, value],
    })
  }

  return (
    <div className="setup-wizard-form">
      {error && <div className="setup-wizard-error">{error}</div>}
      <div className="auth-field">
        <label className="auth-label" htmlFor={`${idPrefix}-name`}>
          First name or nickname
        </label>
        <input
          id={`${idPrefix}-name`}
          className="auth-input"
          value={values.displayName}
          onChange={(e) => onChange({ ...values, displayName: e.target.value })}
          maxLength={50}
        />
      </div>
      <div className="auth-field">
        <label className="auth-label" htmlFor={`${idPrefix}-age`}>
          Age range
        </label>
        <select
          id={`${idPrefix}-age`}
          className="auth-input setup-wizard-select"
          value={values.ageBand}
          onChange={(e) => onChange({ ...values, ageBand: e.target.value as AgeBand })}
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
                checked={values.conditions.includes(condition.value)}
                onChange={() => toggleCondition(condition.value)}
              />
              <span>{condition.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="auth-field">
        <label className="auth-label" htmlFor={`${idPrefix}-meds`}>
          Medication notes (optional)
        </label>
        <textarea
          id={`${idPrefix}-meds`}
          className="auth-input setup-wizard-textarea"
          rows={2}
          maxLength={500}
          value={values.medicationsNotes}
          onChange={(e) => onChange({ ...values, medicationsNotes: e.target.value })}
          placeholder="Brief notes only — no prescription details required"
        />
      </div>
    </div>
  )
}

export function emptyChildFormValues(): ChildFormValues {
  return {
    displayName: '',
    ageBand: '6_8',
    conditions: [],
    medicationsNotes: '',
  }
}

export function childToFormValues(child: {
  display_name: string
  age_band: string
  conditions: string[]
  medications_notes: string | null
  is_placeholder: boolean
}): ChildFormValues {
  return {
    displayName: child.is_placeholder ? '' : child.display_name,
    ageBand: child.age_band as AgeBand,
    conditions: child.conditions as ChildCondition[],
    medicationsNotes: child.medications_notes ?? '',
  }
}
