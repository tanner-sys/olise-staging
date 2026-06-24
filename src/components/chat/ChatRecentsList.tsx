import type { ChatSession } from '../../hooks/useChatSessions'
import { StatePanel } from '../state/StatePanel'
import './ChatRecentsList.css'

type ChatRecentsListProps = {
  sessions: ChatSession[]
  scopeChildName?: string | null
  onSelectChat: (sessionId: string) => void
}

export function ChatRecentsList({
  sessions,
  scopeChildName,
  onSelectChat,
}: ChatRecentsListProps) {
  const heading = scopeChildName ? `${scopeChildName}'s chats` : 'Recent chats'

  if (sessions.length === 0) {
    return (
      <section className="chat-recents" aria-label={heading}>
        <StatePanel
          variant="empty"
          title={scopeChildName ? `No chats for ${scopeChildName} yet` : 'No chats yet'}
          description="Send a message above to start your first conversation."
          size="compact"
        />
      </section>
    )
  }

  return (
    <section className="chat-recents" aria-label={heading}>
      <p className="chat-recents-label">{heading}</p>
      <ul className="chat-recents-list">
        {sessions.map((session) => (
          <li key={session.id}>
            <button type="button" className="chat-recents-item" onClick={() => onSelectChat(session.id)}>
              <span className="chat-recents-item-title">{session.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
