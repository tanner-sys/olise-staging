import type { Program, ProgramProgress } from '../types/program'
import type { CheckInEntry, Routine } from '../types/routine'

export type EnrolledItem = {
  id: string
  title: string
}

export function getEnrolledProgram(
  programProgress: Record<string, ProgramProgress>,
  programs: Program[],
): EnrolledItem | null {
  for (const program of programs) {
    const progress = programProgress[program.id]
    if (!progress || progress.completed) continue
    if (progress.stepIndex > 0 || Object.keys(progress.answers).length > 0) {
      return { id: program.id, title: program.title }
    }
  }
  return null
}

export function getEnrolledRoutine(
  history: CheckInEntry[],
  routines: Routine[],
): EnrolledItem | null {
  for (const routine of routines) {
    if (history.some((entry) => entry.routineId === routine.id)) {
      return { id: routine.id, title: routine.title }
    }
  }
  return null
}
