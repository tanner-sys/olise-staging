import { storageGetJson, storageRemove } from '../platform'
import type { CheckInEntry } from '../types/routine'
import { supabase } from './supabase'

const LEGACY_STORAGE_KEY = 'olise-routine-history'

type CheckInRow = {
  id: string
  child_id: string
  routine_id: string
  date: string
  answers: Record<string, number> | null
  section_scores: Record<string, number> | null
  composite_score: number | null
  completed_at: string
}

function mapRow(row: CheckInRow): CheckInEntry {
  return {
    id: row.id,
    childId: row.child_id,
    routineId: row.routine_id,
    date: row.date,
    answers: row.answers ?? {},
    sectionScores: row.section_scores ?? {},
    compositeScore: Number(row.composite_score ?? 0),
    completedAt: row.completed_at,
  }
}

export async function loadRoutineHistory(
  caregiverId: string,
  childId: string | null,
): Promise<CheckInEntry[]> {
  if (!supabase) {
    return storageGetJson<CheckInEntry[]>(LEGACY_STORAGE_KEY, [])
  }

  if (!childId) {
    const { data, error } = await supabase
      .from('check_in_entries')
      .select(
        'id, child_id, routine_id, date, answers, section_scores, composite_score, completed_at',
      )
      .eq('caregiver_id', caregiverId)
      .order('date', { ascending: true })

    if (error) {
      console.error('Failed to load routine history', error)
      return []
    }

    return (data ?? []).map((row) => mapRow(row as CheckInRow))
  }

  const { data, error } = await supabase
    .from('check_in_entries')
    .select(
      'id, child_id, routine_id, date, answers, section_scores, composite_score, completed_at',
    )
    .eq('caregiver_id', caregiverId)
    .eq('child_id', childId)
    .order('date', { ascending: true })

  if (error) {
    console.error('Failed to load routine history', error)
    return storageGetJson<CheckInEntry[]>(LEGACY_STORAGE_KEY, [])
  }

  const fromDb = (data ?? []).map((row) => mapRow(row as CheckInRow))

  if (fromDb.length > 0) {
    return fromDb
  }

  const legacy = await storageGetJson<CheckInEntry[]>(LEGACY_STORAGE_KEY, [])
  if (legacy.length === 0) {
    return []
  }

  await Promise.all(
    legacy.map((entry) => saveCheckInEntry({ caregiverId, childId, entry })),
  )
  await storageRemove(LEGACY_STORAGE_KEY)
  return legacy
}

export async function saveCheckInEntry(params: {
  caregiverId: string
  childId: string | null
  entry: CheckInEntry
}): Promise<string | null> {
  if (!supabase || !params.childId) {
    return null
  }

  const payload = {
    answers: params.entry.answers,
    section_scores: params.entry.sectionScores,
    composite_score: params.entry.compositeScore,
    completed_at: params.entry.completedAt,
  }

  const { data: updated, error: updateError } = await supabase
    .from('check_in_entries')
    .update(payload)
    .eq('caregiver_id', params.caregiverId)
    .eq('child_id', params.childId)
    .eq('routine_id', params.entry.routineId)
    .eq('date', params.entry.date)
    .select('id')
    .maybeSingle()

  if (updateError) {
    console.error('Failed to update check-in entry', updateError)
    return null
  }

  if (updated) {
    return updated.id as string
  }

  const { data: inserted, error: insertError } = await supabase
    .from('check_in_entries')
    .insert({
      caregiver_id: params.caregiverId,
      child_id: params.childId,
      routine_id: params.entry.routineId,
      date: params.entry.date,
      ...payload,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Failed to insert check-in entry', insertError)
    return null
  }

  return inserted.id as string
}
