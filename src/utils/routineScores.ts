import type { CheckInEntry, Routine } from '../types/routine'

const SCALE_MIN = 1
const SCALE_MAX = 5

export function scoreToPercent(score: number): number {
  return Math.round(((score - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100)
}

export function calculateSectionScores(
  routine: Routine,
  answers: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    routine.questions.map((question) => [question.id, answers[question.id] ?? 0]),
  )
}

export function calculateCompositeScore(sectionScores: Record<string, number>): number {
  const values = Object.values(sectionScores).filter((score) => score > 0)
  if (values.length === 0) return 0
  const average = values.reduce((sum, score) => sum + score, 0) / values.length
  return scoreToPercent(average)
}

export function buildCheckInEntry(
  routine: Routine,
  answers: Record<string, number>,
): CheckInEntry {
  const sectionScores = calculateSectionScores(routine, answers)
  const compositeScore = calculateCompositeScore(sectionScores)
  const now = new Date()

  return {
    id: `${routine.id}-${now.toISOString()}`,
    routineId: routine.id,
    date: now.toISOString().slice(0, 10),
    answers,
    sectionScores,
    compositeScore,
    completedAt: now.toISOString(),
  }
}

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatShortDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
