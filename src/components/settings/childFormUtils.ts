import type { AgeBand, ChildCondition } from '../../lib/constants'

export type ChildFormValues = {
  displayName: string
  ageBand: AgeBand
  conditions: ChildCondition[]
  medicationsNotes: string
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
