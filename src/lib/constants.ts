export const CONSENT_VERSION = 'v1-placeholder'

export const AGE_BANDS = [
  { value: 'under_3', label: 'Under 3' },
  { value: '3_5', label: '3–5' },
  { value: '6_8', label: '6–8' },
  { value: '9_11', label: '9–11' },
  { value: '12_14', label: '12–14' },
  { value: '15_17', label: '15–17' },
] as const

export const CHILD_CONDITIONS = [
  { value: 'adhd', label: 'ADHD' },
  { value: 'anxiety', label: 'Anxiety' },
  { value: 'autism_spectrum', label: 'Autism spectrum' },
  { value: 'learning_disorder', label: 'Learning disorder' },
  { value: 'behavioral', label: 'Behavioral challenges' },
  { value: 'other', label: 'Other' },
] as const

export type AgeBand = (typeof AGE_BANDS)[number]['value']
export type ChildCondition = (typeof CHILD_CONDITIONS)[number]['value']
