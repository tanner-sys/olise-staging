import { AlertCircle, ArrowDown, ArrowUp, MessageSquare, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAccessToken } from '../../lib/accessToken'
import { streamChatMessage } from '../../lib/chat'
import {
  acknowledgeCrisis,
  CRISIS_RESOURCES,
  loadUnacknowledgedCrisis,
  type ActiveCrisis,
} from '../../lib/crisisStorage'
import { loadSessionMessages } from '../../lib/chatStorage'
import type { ChatMessage } from '../../types/chat'
import { StatePanel } from '../state/StatePanel'
import { ChatMessageBody } from './ChatMessageBody'
import { CrisisCard } from './CrisisCard'
import './ChatView.css'
import './CrisisCard.css'

type ChatViewProps = {
  sessionId: string
  onSessionActivity?: () => void
}

type ThreadError = {
  message: string
  retryText: string
  clientMessageId: string
  skipUserMessage?: boolean
}

type SendOptions = {
  clientMessageId?: string
  skipUserMessage?: boolean
}

export function ChatView({ sessionId, onSessionActivity }: ChatViewProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const initialMessage = (location.state as { initialMessage?: string } | null)?.initialMessage

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(true)
  const [threadError, setThreadError] = useState<ThreadError | null>(null)
  const [awayFromBottom, setAwayFromBottom] = useState(false)
  const [activeCrisis, setActiveCrisis] = useState<ActiveCrisis | null>(null)
  const [acknowledgingCrisis, setAcknowledgingCrisis] = useState(false)
  const initialSent = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottomRef = useRef(true)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!stickToBottomRef.current) return
    bottomRef.current?.scrollIntoView({ behavior })
  }, [])

  const handleMessagesScroll = useCallback(() => {
    const container = messagesRef.current
    if (!container) return
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    const nearBottom = distanceFromBottom < 96
    stickToBottomRef.current = nearBottom
    setAwayFromBottom(!nearBottom)
  }, [])

  const jumpToBottom = useCallback(() => {
    stickToBottomRef.current = true
    setAwayFromBottom(false)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setThreadError(null)
      const rows = await loadSessionMessages(sessionId)
      const pendingCrisis = await loadUnacknowledgedCrisis(sessionId)
      if (!cancelled) {
        setMessages(rows)
        setActiveCrisis(pendingCrisis)
        setLoading(false)
        stickToBottomRef.current = true
        setAwayFromBottom(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const sendMessage = useCallback(
    async (text: string, options?: SendOptions) => {
      const trimmed = text.trim()
      if (!trimmed || streaming || !user || activeCrisis) return

      setThreadError(null)

      const accessToken = await getAccessToken()
      if (!accessToken) {
        setThreadError({
          message: 'Your session expired. Please sign out and sign in again, then retry.',
          retryText: trimmed,
          clientMessageId: options?.clientMessageId ?? crypto.randomUUID(),
          skipUserMessage: options?.skipUserMessage,
        })
        return
      }

      setInput('')
      setStreaming(true)

      const clientMessageId = options?.clientMessageId ?? crypto.randomUUID()
      const skipUserMessage = Boolean(options?.skipUserMessage)

      if (!skipUserMessage) {
        const optimisticUser: ChatMessage = {
          id: `pending-${clientMessageId}`,
          role: 'user',
          content: trimmed,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, optimisticUser])
      }

      const streamingAssistant: ChatMessage = {
        id: 'streaming',
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, streamingAssistant])
      stickToBottomRef.current = true
      setAwayFromBottom(false)
      scrollToBottom('auto')

      let assistantContent = ''
      let hadError = false
      let errorMessage = ''
      let isCrisisResponse = false
      let isBlockedResponse = false
      let doneUserMessageId = ''
      let doneAssistantMessageId = ''

      await streamChatMessage(trimmed, accessToken, sessionId, clientMessageId, (event) => {
        if (event.type === 'token') {
          assistantContent += event.text
          setMessages((prev) =>
            prev.map((m) =>
              m.id === 'streaming' ? { ...m, content: m.content + event.text } : m,
            ),
          )
          scrollToBottom()
        } else if (event.type === 'crisis') {
          isCrisisResponse = true
          setActiveCrisis({
            crisisEventId: event.crisisEventId || null,
            category: event.category,
            resources: event.resources.length > 0 ? event.resources : CRISIS_RESOURCES,
          })
        } else if (event.type === 'replace') {
          assistantContent = event.content
          setMessages((prev) =>
            prev.map((m) =>
              m.id === 'streaming'
                ? {
                    ...m,
                    content: event.content,
                    crisis: event.reason === 'crisis' ? true : m.crisis,
                    blocked: event.reason === 'blocked' ? true : m.blocked,
                  }
                : m,
            ),
          )
        } else if (event.type === 'blocked') {
          isBlockedResponse = true
          assistantContent = event.message
          setMessages((prev) =>
            prev.map((m) =>
              m.id === 'streaming'
                ? { ...m, content: event.message, blocked: true }
                : m,
            ),
          )
        } else if (event.type === 'meta' && event.crisis) {
          isCrisisResponse = true
          setMessages((prev) =>
            prev.map((m) => (m.id === 'streaming' ? { ...m, crisis: true } : m)),
          )
        } else if (event.type === 'meta' && event.blocked) {
          isBlockedResponse = true
          setMessages((prev) =>
            prev.map((m) => (m.id === 'streaming' ? { ...m, blocked: true } : m)),
          )
        } else if (event.type === 'done') {
          doneUserMessageId = event.userMessageId
          doneAssistantMessageId = event.assistantMessageId
        } else if (event.type === 'error') {
          hadError = true
          errorMessage = event.message
          setMessages((prev) => prev.filter((m) => m.id !== 'streaming'))
        }
      })

      if (hadError) {
        setThreadError({
          message: errorMessage,
          retryText: trimmed,
          clientMessageId,
          skipUserMessage: true,
        })
      } else if (assistantContent && doneAssistantMessageId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === `pending-${clientMessageId}` && doneUserMessageId) {
              return { ...m, id: doneUserMessageId }
            }
            if (m.id === 'streaming') {
              return {
                ...m,
                id: doneAssistantMessageId,
                content: assistantContent,
                crisis: isCrisisResponse || m.crisis,
                blocked: isBlockedResponse || m.blocked,
              }
            }
            return m
          }),
        )
        onSessionActivity?.()
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== 'streaming'))
      }

      setStreaming(false)
      navigate(`/chat/${sessionId}`, { replace: true, state: {} })
      scrollToBottom()
    },
    [user, streaming, scrollToBottom, navigate, sessionId, onSessionActivity, activeCrisis],
  )

  async function handleAcknowledgeCrisis() {
    if (!activeCrisis || acknowledgingCrisis) return

    setAcknowledgingCrisis(true)
    try {
      if (activeCrisis.crisisEventId && user) {
        await acknowledgeCrisis(activeCrisis.crisisEventId, user.id)
      }
      setActiveCrisis(null)
      const rows = await loadSessionMessages(sessionId)
      setMessages(rows)
    } finally {
      setAcknowledgingCrisis(false)
    }
  }

  const composerLocked = Boolean(activeCrisis)

  useEffect(() => {
    if (initialMessage && !initialSent.current && !loading && user) {
      initialSent.current = true
      void sendMessage(initialMessage)
    }
  }, [initialMessage, loading, user, sendMessage])

  useEffect(() => {
    if (!loading && !streaming && !composerLocked) {
      composerRef.current?.focus()
    }
  }, [loading, sessionId, streaming, composerLocked])

  useEffect(() => {
    scrollToBottom('auto')
  }, [messages.length, scrollToBottom])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void sendMessage(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  function handleRetry() {
    if (!threadError || streaming) return
    void sendMessage(threadError.retryText, {
      clientMessageId: threadError.clientMessageId,
      skipUserMessage: threadError.skipUserMessage,
    })
  }

  const visibleMessages = messages.filter((m) => !m.id.startsWith('error-'))

  return (
    <div className="chat-view">
      {activeCrisis && (
        <CrisisCard
          category={activeCrisis.category}
          resources={activeCrisis.resources}
          onAcknowledge={() => void handleAcknowledgeCrisis()}
          acknowledging={acknowledgingCrisis}
        />
      )}

      <div className="chat-messages" ref={messagesRef} onScroll={handleMessagesScroll}>
        {loading && <StatePanel variant="loading" title="Loading conversation…" size="compact" />}
        {!loading && visibleMessages.length === 0 && (
          <StatePanel
            variant="empty"
            icon={<MessageSquare size={20} strokeWidth={1.5} />}
            title="Start the conversation"
            description="Ask anything about supporting your child's behavioral health."
            size="compact"
          />
        )}
        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={`chat-message chat-message--${message.role} ${
              message.crisis ? 'chat-message--crisis' : ''
            } ${message.blocked ? 'chat-message--blocked' : ''} ${
              message.id === 'streaming' ? 'chat-message--streaming' : ''
            }`}
          >
            <div className="chat-message-bubble">
              <ChatMessageBody content={message.content} role={message.role} />
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {threadError && (
        <div className="chat-thread-error">
          <StatePanel
            variant="error"
            icon={<AlertCircle size={18} strokeWidth={1.75} />}
            title="Message couldn't be sent"
            description={threadError.message}
            primaryAction={{ label: 'Retry', onClick: handleRetry }}
            secondaryAction={{ label: 'Dismiss', onClick: () => setThreadError(null) }}
            size="inline"
          />
        </div>
      )}

      <div className={`chat-composer-area ${composerLocked ? 'chat-composer--locked' : ''}`}>
        {awayFromBottom && (
          <button
            type="button"
            className="chat-jump-bottom"
            onClick={jumpToBottom}
            aria-label="Scroll to latest messages"
          >
            <ArrowDown size={16} strokeWidth={2} />
          </button>
        )}

        <form className="chat-composer-wrap" onSubmit={handleSubmit}>
        <div className="composer">
          <textarea
            ref={composerRef}
            className="composer-input"
            data-composer-input
            placeholder="How can I help you today?"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming || loading || composerLocked}
          />
          <div className="composer-toolbar">
            <button type="button" className="icon-btn toolbar-btn" aria-label="Add attachment" disabled>
              <Plus size={16} strokeWidth={1.75} />
            </button>
            <div className="toolbar-right">
              <button
                type="submit"
                className="chat-send-btn"
                aria-label="Send message"
                disabled={streaming || loading || composerLocked || !input.trim()}
              >
                <ArrowUp size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
        <p className="chat-crisis-footer">
          In a crisis, call or text <a href="tel:988">988</a> or text HOME to 741741. For emergencies,
          call 911.
        </p>
      </form>
      </div>
    </div>
  )
}
