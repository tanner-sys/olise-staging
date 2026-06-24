import { AlertCircle, ArrowUp, MessageSquare, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAccessToken } from '../../lib/accessToken'
import { streamChatMessage, type ChatHistoryMessage } from '../../lib/chat'
import {
  loadSessionMessages,
  saveMessage,
  titleFromFirstMessage,
  touchSession,
} from '../../lib/chatStorage'
import type { ChatMessage } from '../../types/chat'
import { StatePanel } from '../state/StatePanel'
import { ChatMessageBody } from './ChatMessageBody'
import './ChatView.css'

type ChatViewProps = {
  sessionId: string
  onSessionActivity?: () => void
}

type ThreadError = {
  message: string
  retryText: string
  skipUserPersist: boolean
  userMessageId?: string
}

type SendOptions = {
  skipUserPersist?: boolean
  userMessageId?: string
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
  const initialSent = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setThreadError(null)
      const rows = await loadSessionMessages(sessionId)
      if (!cancelled) {
        setMessages(rows)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const sendMessage = useCallback(
    async (text: string, options?: SendOptions) => {
      const trimmed = text.trim()
      if (!trimmed || streaming || !user) return

      setThreadError(null)

      const accessToken = await getAccessToken()
      if (!accessToken) {
        setThreadError({
          message: 'Your session expired. Please sign out and sign in again, then retry.',
          retryText: trimmed,
          skipUserPersist: Boolean(options?.skipUserPersist),
          userMessageId: options?.userMessageId,
        })
        return
      }

      setInput('')
      setStreaming(true)

      const skipUserPersist = Boolean(options?.skipUserPersist)
      let userMessageId = options?.userMessageId
      let historyBase = messages

      if (!skipUserPersist) {
        const isFirstMessage = messages.filter((m) => m.role === 'user').length === 0

        userMessageId = await saveMessage({
          sessionId,
          caregiverId: user.id,
          role: 'user',
          content: trimmed,
        }) ?? undefined

        const optimisticUser: ChatMessage = {
          id: userMessageId ?? `user-${Date.now()}`,
          role: 'user',
          content: trimmed,
          created_at: new Date().toISOString(),
        }
        historyBase = [...messages, optimisticUser]
        setMessages((prev) => [...prev, optimisticUser])

        if (isFirstMessage) {
          await touchSession(sessionId, titleFromFirstMessage(trimmed))
          onSessionActivity?.()
        } else {
          await touchSession(sessionId)
        }
      }

      const streamingAssistant: ChatMessage = {
        id: 'streaming',
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, streamingAssistant])
      scrollToBottom()

      const history: ChatHistoryMessage[] = historyBase
        .filter((m): m is ChatMessage & { role: 'user' | 'assistant' } =>
          m.role === 'user' || m.role === 'assistant',
        )
        .map((m) => ({ role: m.role, content: m.content }))

      let assistantContent = ''
      let hadError = false
      let errorMessage = ''
      let isCrisisResponse = false

      await streamChatMessage(
        trimmed,
        history,
        accessToken,
        sessionId,
        userMessageId,
        (event) => {
          if (event.type === 'token') {
            assistantContent += event.text
            setMessages((prev) =>
              prev.map((m) =>
                m.id === 'streaming' ? { ...m, content: m.content + event.text } : m,
              ),
            )
            scrollToBottom()
          } else if (event.type === 'meta' && event.crisis) {
            isCrisisResponse = true
            setMessages((prev) =>
              prev.map((m) => (m.id === 'streaming' ? { ...m, crisis: true } : m)),
            )
          } else if (event.type === 'error') {
            hadError = true
            errorMessage = event.message
            setMessages((prev) => prev.filter((m) => m.id !== 'streaming'))
          }
        },
      )

      if (hadError) {
        setThreadError({
          message: errorMessage,
          retryText: trimmed,
          skipUserPersist: true,
          userMessageId,
        })
      } else if (assistantContent) {
        const assistantId = await saveMessage({
          sessionId,
          caregiverId: user.id,
          role: 'assistant',
          content: assistantContent,
        })
        setMessages((prev) =>
          prev.map((m) =>
            m.id === 'streaming'
              ? {
                  ...m,
                  id: assistantId ?? `assistant-${Date.now()}`,
                  content: assistantContent,
                  crisis: isCrisisResponse || m.crisis,
                }
              : m,
          ),
        )
        await touchSession(sessionId)
        onSessionActivity?.()
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== 'streaming'))
      }

      setStreaming(false)
      navigate(`/chat/${sessionId}`, { replace: true, state: {} })
      scrollToBottom()
    },
    [user, messages, streaming, scrollToBottom, navigate, sessionId, onSessionActivity],
  )

  useEffect(() => {
    if (initialMessage && !initialSent.current && !loading && user) {
      initialSent.current = true
      void sendMessage(initialMessage)
    }
  }, [initialMessage, loading, user, sendMessage])

  useEffect(() => {
    scrollToBottom()
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
      skipUserPersist: threadError.skipUserPersist,
      userMessageId: threadError.userMessageId,
    })
  }

  const visibleMessages = messages.filter((m) => !m.id.startsWith('error-'))

  return (
    <div className="chat-view">
      <div className="chat-messages">
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
            } ${message.id === 'streaming' ? 'chat-message--streaming' : ''}`}
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

      <form className="chat-composer-wrap" onSubmit={handleSubmit}>
        <div className="composer">
          <textarea
            className="composer-input"
            placeholder="How can I help you today?"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming || loading}
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
                disabled={streaming || loading || !input.trim()}
              >
                <ArrowUp size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
