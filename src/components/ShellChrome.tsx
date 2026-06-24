import { PanelLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { showDecorativeChrome } from '../platform'
import './ShellChrome.css'

type ShellChromeProps = {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  centerContent?: ReactNode
}

export function ShellChrome({ sidebarOpen, onToggleSidebar, centerContent }: ShellChromeProps) {
  const showChrome = showDecorativeChrome()

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        {showChrome && (
          <div className="window-controls" aria-hidden="true">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
        )}
        <button
          type="button"
          className={`icon-btn pane-btn ${sidebarOpen ? 'icon-btn--active' : ''}`}
          aria-label="Toggle sidebar"
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
        >
          <PanelLeft size={16} strokeWidth={1.75} />
        </button>
      </div>
      {centerContent && <div className="top-bar-center">{centerContent}</div>}
      <button type="button" className="icon-btn ghost-btn" aria-label="Assistant">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M9 2C5.5 2 3 4.2 3 7c0 2.2 1.2 4.1 3 5.2V15l2.5-1.5c.5.1 1 .15 1.5.15 3.5 0 6-2.2 6-5s-2.5-5-7-5z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <circle cx="6.5" cy="7" r="0.75" fill="currentColor" />
          <circle cx="9" cy="7" r="0.75" fill="currentColor" />
          <circle cx="11.5" cy="7" r="0.75" fill="currentColor" />
        </svg>
      </button>
    </header>
  )
}
