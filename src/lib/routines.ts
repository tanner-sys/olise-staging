import { staticRoutines } from '../data/routines'
import type { Routine, RoutineQuestion } from '../types/routine'
import type { FetchResult } from './fetchResult'
import { supabase } from './supabase'

type RoutineRow = {
  id: string
  title: string
  description: string
  frequency: string | null
  questions: RoutineQuestion[] | null
}

function mapRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    frequency: row.frequency ?? '',
    questions: row.questions ?? [],
  }
}

export async function fetchRoutines(): Promise<FetchResult<Routine[]>> {
  if (!supabase) return { data: staticRoutines, error: null }

  const { data, error } = await supabase
    .from('routines')
    .select('id, title, description, frequency, questions')
    .order('published_at', { ascending: true })

  if (error) {
    console.error('Failed to load routines', error)
    return { data: staticRoutines, error: error.message }
  }

  return { data: (data ?? []).map((row) => mapRoutine(row as RoutineRow)), error: null }
}

export async function fetchRoutine(id: string): Promise<Routine | null> {
  if (!supabase) {
    return staticRoutines.find((routine) => routine.id === id) ?? null
  }

  const { data, error } = await supabase
    .from('routines')
    .select('id, title, description, frequency, questions')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Failed to load routine', id, error)
    return staticRoutines.find((routine) => routine.id === id) ?? null
  }

  if (!data) return null
  return mapRoutine(data as RoutineRow)
}

export function getRoutineFromList(routines: Routine[], id: string): Routine | undefined {
  return routines.find((routine) => routine.id === id)
}
