import { AlertCircle, BookOpen, Clock } from 'lucide-react'
import { StatePanel } from './state/StatePanel'
import './ProgramsWelcome.css'

type ProgramsWelcomeProps = {
  loading?: boolean
  error?: string | null
  isEmpty?: boolean
  onRetry?: () => void
}

export function ProgramsWelcome({
  loading = false,
  error = null,
  isEmpty = false,
  onRetry,
}: ProgramsWelcomeProps) {
  if (loading) {
    return (
      <StatePanel
        variant="loading"
        title="Loading programs…"
        size="main"
      />
    )
  }

  if (error) {
    return (
      <StatePanel
        variant="error"
        icon={<AlertCircle size={20} strokeWidth={1.75} />}
        title="Couldn't load programs"
        description={`${error} You can retry, or pick a program from the sidebar if any are available.`}
        primaryAction={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
        size="main"
      />
    )
  }

  if (isEmpty) {
    return (
      <StatePanel
        variant="empty"
        icon={<BookOpen size={20} strokeWidth={1.5} />}
        title="No programs yet"
        description="Structured questionnaires and guided deep dives will appear here once they're published."
        size="main"
      />
    )
  }

  return (
    <div className="programs-welcome">
      <div className="programs-welcome-icon" aria-hidden="true">
        <BookOpen size={22} strokeWidth={1.5} />
      </div>
      <h1 className="programs-welcome-title">Programs</h1>
      <p className="programs-welcome-text">
        Structured questionnaires, assessments, and guided deep dives to help you learn
        and take action.
      </p>
      <div className="programs-welcome-hint">
        <Clock size={13} strokeWidth={1.75} />
        <span>Select a program from the sidebar to begin</span>
      </div>
    </div>
  )
}
