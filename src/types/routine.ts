export type RoutineQuestion = {
  id: string
  section: string
  prompt: string
  lowLabel: string
  highLabel: string
}

export type Routine = {
  id: string
  title: string
  description: string
  frequency: string
  questions: RoutineQuestion[]
}

export type CheckInEntry = {
  id: string
  routineId: string
  childId?: string
  date: string
  answers: Record<string, number>
  sectionScores: Record<string, number>
  compositeScore: number
  completedAt: string
}

export type RoutineSession = {
  questionIndex: number
  answers: Record<string, number>
}
