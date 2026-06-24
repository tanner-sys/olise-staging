import type { ReactNode } from 'react'
import './StatePanel.css'

export type StatePanelAction = {
  label: string
  onClick: () => void
}

type StatePanelProps = {
  variant: 'empty' | 'error' | 'loading'
  icon?: ReactNode
  title: string
  description?: string
  primaryAction?: StatePanelAction
  secondaryAction?: StatePanelAction
  size?: 'main' | 'compact' | 'inline'
}

export function StatePanel({
  variant,
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  size = 'main',
}: StatePanelProps) {
  const hasActions = Boolean(primaryAction || secondaryAction)

  return (
    <div
      className={`state-panel state-panel--${variant} state-panel--${size}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {icon && variant !== 'loading' && <div className="state-panel-icon">{icon}</div>}
      <div className="state-panel-body">
        {variant === 'loading' ? (
          <p className="state-panel-loading">{title}</p>
        ) : (
          <>
            <h2 className="state-panel-title">{title}</h2>
            {description && <p className="state-panel-description">{description}</p>}
          </>
        )}
        {hasActions && variant !== 'loading' && (
          <div className="state-panel-actions">
            {primaryAction && (
              <button type="button" className="state-panel-btn state-panel-btn--primary" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </button>
            )}
            {secondaryAction && (
              <button type="button" className="state-panel-btn state-panel-btn--ghost" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
