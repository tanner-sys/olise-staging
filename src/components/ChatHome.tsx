import { ArrowUp, LayoutGrid, Mic, Plus, Repeat, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { childChatScopeLabel } from '../lib/children'
import type { ChatSession } from '../hooks/useChatSessions'
import type { EnrolledItem } from '../utils/enrollment'
import { StatePanel } from './state/StatePanel'
import { ChatRecentsList } from './chat/ChatRecentsList'
import './ChatHome.css'
import '../components/onboarding/SetupWizard.css'
import './chat/ChatView.css'

type ChatHomeProps = {
  displayName?: string
  showSetupCta?: boolean
  enrolledProgram: EnrolledItem | null
  enrolledRoutine: EnrolledItem | null
  onContinueProgram: () => void
  onExplorePrograms: () => void
  onContinueRoutine: () => void
  onExploreRoutines: () => void
  onStartSetup?: () => void
  onDismissSetup?: () => void
  onSendMessage?: (text: string) => void
  sending?: boolean
  sendError?: string | null
  onDismissSendError?: () => void
  onRetrySendMessage?: () => void
  chatSessions?: ChatSession[]
  chatScopeChildId?: string | null
  scopeChildName?: string | null
  onSelectChat?: (sessionId: string) => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function SunburstIcon() {
  return (
    <svg className="sunburst" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <g stroke="#d97706" strokeWidth="1.8" strokeLinecap="round">
        <line x1="13" y1="3" x2="13" y2="8" />
        <line x1="13" y1="18" x2="13" y2="23" />
        <line x1="3" y1="13" x2="8" y2="13" />
        <line x1="18" y1="13" x2="23" y2="13" />
        <line x1="5.5" y1="5.5" x2="9" y2="9" />
        <line x1="17" y1="17" x2="20.5" y2="20.5" />
        <line x1="20.5" y1="5.5" x2="17" y2="9" />
        <line x1="9" y1="17" x2="5.5" y2="20.5" />
      </g>
      <circle cx="13" cy="13" r="2.2" fill="#ea580c" />
    </svg>
  )
}

function OliseLogo() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2 11V3.5C2 3.5 3.5 2 5.5 3.5C7.5 5 7.5 9 7.5 9C7.5 9 7.5 5 9.5 3.5C11.5 2 13 3.5 13 3.5V11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WaveformIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {[3, 6, 4, 8, 5, 7, 3].map((h, i) => (
        <rect
          key={i}
          x={1 + i * 2}
          y={(16 - h) / 2}
          width="1.5"
          height={h}
          rx="0.75"
          fill="currentColor"
        />
      ))}
    </svg>
  )
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim()
  if (!trimmed) return 'there'
  return trimmed.split(/\s+/)[0] ?? trimmed
}

export function ChatHome({
  displayName,
  showSetupCta = false,
  enrolledProgram,
  enrolledRoutine,
  onContinueProgram,
  onExplorePrograms,
  onContinueRoutine,
  onExploreRoutines,
  onStartSetup,
  onDismissSetup,
  onSendMessage,
  sending = false,
  sendError = null,
  onDismissSendError,
  onRetrySendMessage,
  chatSessions = [],
  chatScopeChildId = null,
  scopeChildName = null,
  onSelectChat,
}: ChatHomeProps) {
  const greetingName = displayName ? firstName(displayName) : 'there'
  const [input, setInput] = useState('')
  const composerRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!sending) {
      composerRef.current?.focus()
    }
  }, [sending, chatScopeChildId])

  const inChildProject = Boolean(chatScopeChildId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || !onSendMessage || sending) return
    onSendMessage(trimmed)
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const trimmed = input.trim()
      if (trimmed && onSendMessage && !sending) {
        onSendMessage(trimmed)
        setInput('')
      }
    }
  }

  return (
    <>
      {inChildProject && scopeChildName ? (
        <h1 className="greeting chat-project-heading">
          <span>{childChatScopeLabel(scopeChildName)}</span>
        </h1>
      ) : (
        <>
          <div className="brand-badge">
            <OliseLogo />
            <span>Olise</span>
          </div>

          <h1 className="greeting">
            <SunburstIcon />
            <span>{getGreeting()}, {greetingName}</span>
          </h1>
        </>
      )}

      <div className="home-stack">
        {sendError && (
          <StatePanel
            variant="error"
            title="Couldn't start chat"
            description={sendError}
            primaryAction={
              onRetrySendMessage ? { label: 'Retry', onClick: onRetrySendMessage } : undefined
            }
            secondaryAction={
              onDismissSendError ? { label: 'Dismiss', onClick: onDismissSendError } : undefined
            }
            size="inline"
          />
        )}

        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            ref={composerRef}
            className="composer-input"
            data-composer-input
            placeholder={
              inChildProject && scopeChildName
                ? `How can I help with ${scopeChildName}?`
                : 'How can I help you today?'
            }
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <div className="composer-toolbar">
            <button type="button" className="icon-btn toolbar-btn" aria-label="Add attachment" disabled>
              <Plus size={16} strokeWidth={1.75} />
            </button>
            <div className="toolbar-right">
              <button type="button" className="icon-btn toolbar-btn" aria-label="Voice input" disabled>
                <Mic size={16} strokeWidth={1.75} />
              </button>
              <button type="button" className="icon-btn toolbar-btn" aria-label="Audio mode" disabled>
                <WaveformIcon />
              </button>
              <button
                type="submit"
                className="chat-send-btn"
                aria-label="Send message"
                disabled={sending || !input.trim()}
              >
                <ArrowUp size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </form>

        {inChildProject && onSelectChat && (
          <ChatRecentsList
            sessions={chatSessions}
            scopeChildName={scopeChildName}
            onSelectChat={onSelectChat}
          />
        )}

        {!inChildProject && (
        <div className="home-enrollment">
          {enrolledProgram ? (
            <button type="button" className="home-enrollment-btn" onClick={onContinueProgram}>
              <LayoutGrid size={13} strokeWidth={1.75} />
              <span>Continue &ldquo;{enrolledProgram.title}&rdquo; Now</span>
            </button>
          ) : (
            <button type="button" className="home-enrollment-btn" onClick={onExplorePrograms}>
              <LayoutGrid size={13} strokeWidth={1.75} />
              <span>Explore Programs</span>
            </button>
          )}

          {enrolledRoutine ? (
            <button type="button" className="home-enrollment-btn" onClick={onContinueRoutine}>
              <Repeat size={13} strokeWidth={1.75} />
              <span>Continue &ldquo;{enrolledRoutine.title}&rdquo; Now</span>
            </button>
          ) : (
            <button type="button" className="home-enrollment-btn" onClick={onExploreRoutines}>
              <Repeat size={13} strokeWidth={1.75} />
              <span>Explore Routines</span>
            </button>
          )}
        </div>
        )}

        {showSetupCta && (
          <div className="home-setup-cta">
            <button type="button" className="home-setup-btn home-setup-btn--primary" onClick={onStartSetup}>
              <Sparkles size={13} strokeWidth={1.75} />
              <span>Setup — personalize for your child</span>
            </button>
            <button type="button" className="home-setup-btn home-setup-btn--ghost" onClick={onDismissSetup}>
              Dismiss
            </button>
          </div>
        )}
      </div>
    </>
  )
}
