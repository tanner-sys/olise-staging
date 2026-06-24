export type ProgramStatus = 'not_started' | 'in_progress' | 'completed'

export type StepType = 'intro' | 'assessment' | 'content' | 'reflection' | 'completion'

export type AssessmentQuestion = {
  id: string
  prompt: string
  options: string[]
}

export type ProgramStep = {
  id: string
  type: StepType
  title: string
  subtitle?: string
  body?: string[]
  bullets?: string[]
  questions?: AssessmentQuestion[]
  reflectionPrompt?: string
}

export type Program = {
  id: string
  title: string
  description: string
  duration: string
  tags: string[]
  steps: ProgramStep[]
}

export type ProgramProgress = {
  stepIndex: number
  answers: Record<string, string>
  completed: boolean
}

export type SidebarTab = 'chat' | 'programs' | 'routines'
