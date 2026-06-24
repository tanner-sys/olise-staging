import { staticPrograms } from '../data/programs'
import type { Program, ProgramStep } from '../types/program'
import type { FetchResult } from './fetchResult'
import { supabase } from './supabase'

type ProgramRow = {
  id: string
  title: string
  description: string
  duration: string | null
  tags: string[] | null
  steps: ProgramStep[] | null
}

function mapProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    duration: row.duration ?? '',
    tags: row.tags ?? [],
    steps: row.steps ?? [],
  }
}

export async function fetchPrograms(): Promise<FetchResult<Program[]>> {
  if (!supabase) return { data: staticPrograms, error: null }

  const { data, error } = await supabase
    .from('programs')
    .select('id, title, description, duration, tags, steps')
    .order('published_at', { ascending: true })

  if (error) {
    console.error('Failed to load programs', error)
    return { data: staticPrograms, error: error.message }
  }

  return { data: (data ?? []).map((row) => mapProgram(row as ProgramRow)), error: null }
}

export async function fetchProgram(id: string): Promise<Program | null> {
  if (!supabase) {
    return staticPrograms.find((program) => program.id === id) ?? null
  }

  const { data, error } = await supabase
    .from('programs')
    .select('id, title, description, duration, tags, steps')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Failed to load program', id, error)
    return staticPrograms.find((program) => program.id === id) ?? null
  }

  if (!data) return null
  return mapProgram(data as ProgramRow)
}

export function getProgramFromList(programs: Program[], id: string): Program | undefined {
  return programs.find((program) => program.id === id)
}
