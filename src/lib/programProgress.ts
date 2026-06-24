import { storageGetJson, storageRemove } from '../platform'
import type { ProgramProgress } from '../types/program'
import { supabase } from './supabase'

const LEGACY_STORAGE_KEY = 'olise-program-progress'

type ProgressRow = {
  program_id: string
  step_index: number
  answers: Record<string, string> | null
  completed: boolean
}

function mapRow(row: ProgressRow): ProgramProgress {
  return {
    stepIndex: row.step_index,
    answers: row.answers ?? {},
    completed: row.completed,
  }
}

function childFilter<T extends { eq: (col: string, val: string) => T; is: (col: string, val: null) => T }>(
  query: T,
  childId: string | null,
): T {
  return childId ? query.eq('child_id', childId) : query.is('child_id', null)
}

export async function loadProgramProgress(
  caregiverId: string,
  childId: string | null,
): Promise<Record<string, ProgramProgress>> {
  if (!supabase) {
    return storageGetJson<Record<string, ProgramProgress>>(LEGACY_STORAGE_KEY, {})
  }

  let query = supabase
    .from('program_progress')
    .select('program_id, step_index, answers, completed')
    .eq('caregiver_id', caregiverId)

  query = childFilter(query, childId)

  const { data, error } = await query

  if (error) {
    console.error('Failed to load program progress', error)
    return storageGetJson<Record<string, ProgramProgress>>(LEGACY_STORAGE_KEY, {})
  }

  const fromDb: Record<string, ProgramProgress> = {}
  for (const row of data ?? []) {
    fromDb[row.program_id] = mapRow(row as ProgressRow)
  }

  if (Object.keys(fromDb).length > 0) {
    return fromDb
  }

  const legacy = await storageGetJson<Record<string, ProgramProgress>>(LEGACY_STORAGE_KEY, {})
  if (Object.keys(legacy).length === 0) {
    return {}
  }

  await Promise.all(
    Object.entries(legacy).map(([programId, progress]) =>
      saveProgramProgress({ caregiverId, programId, childId, progress }),
    ),
  )
  await storageRemove(LEGACY_STORAGE_KEY)
  return legacy
}

export async function saveProgramProgress(params: {
  caregiverId: string
  programId: string
  childId: string | null
  progress: ProgramProgress
}): Promise<void> {
  if (!supabase) {
    return
  }

  const payload = {
    step_index: params.progress.stepIndex,
    answers: params.progress.answers,
    completed: params.progress.completed,
  }

  let updateQuery = supabase
    .from('program_progress')
    .update(payload)
    .eq('caregiver_id', params.caregiverId)
    .eq('program_id', params.programId)

  updateQuery = childFilter(updateQuery, params.childId)

  const { data: updated, error: updateError } = await updateQuery.select('id').maybeSingle()

  if (updateError) {
    console.error('Failed to update program progress', updateError)
    return
  }

  if (updated) {
    return
  }

  const { error: insertError } = await supabase.from('program_progress').insert({
    caregiver_id: params.caregiverId,
    program_id: params.programId,
    child_id: params.childId,
    ...payload,
  })

  if (insertError) {
    console.error('Failed to insert program progress', insertError)
  }
}
