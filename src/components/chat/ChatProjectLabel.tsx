import { User } from 'lucide-react'
import { childChatScopeLabel } from '../../lib/children'
import './ChatProjectLabel.css'

type ChatProjectLabelProps = {
  name: string
}

export function ChatProjectLabel({ name }: ChatProjectLabelProps) {
  const label = childChatScopeLabel(name)

  return (
    <div className="chat-project-label" aria-label={label}>
      <User size={13} strokeWidth={1.75} />
      <span>{label}</span>
    </div>
  )
}
