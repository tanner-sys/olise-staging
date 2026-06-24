import { AlertCircle, Repeat } from 'lucide-react'
import { StatePanel } from './state/StatePanel'
import './RoutinesWelcome.css'

type RoutinesWelcomeProps = {
  loading?: boolean
  error?: string | null
  isEmpty?: boolean
  onRetry?: () => void
}

export function RoutinesWelcome({
  loading = false,
  error = null,
  isEmpty = false,
  onRetry,
}: RoutinesWelcomeProps) {
  if (loading) {
    return (
      <StatePanel
        variant="loading"
        title="Loading routines…"
        size="main"
      />
    )
  }

  if (error) {
    return (
      <StatePanel
        variant="error"
        icon={<AlertCircle size={20} strokeWidth={1.75} />}
        title="Couldn't load routines"
        description={`${error} You can retry, or pick a routine from the sidebar if any are available.`}
        primaryAction={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
        size="main"
      />
    )
  }

  if (isEmpty) {
    return (
      <StatePanel
        variant="empty"
        icon={<Repeat size={20} strokeWidth={1.5} />}
        title="No routines yet"
        description="Daily check-ins and habits will appear here once they're published."
        size="main"
      />
    )
  }

  return (
    <div className="routines-welcome">
      <div className="routines-welcome-icon" aria-hidden="true">
        <Repeat size={22} strokeWidth={1.5} />
      </div>
      <h1 className="routines-welcome-title">Routines</h1>
      <p className="routines-welcome-text">
        Daily check-ins and habits you track over time — with scores, section breakdowns,
        and progress trends.
      </p>
      <div className="routines-welcome-hint">
        <span>Select a routine from the sidebar to begin</span>
      </div>
    </div>
  )
}
