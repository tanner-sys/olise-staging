import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ChatMessageBodyProps = {
  content: string
  role: 'user' | 'assistant' | 'system'
}

export function ChatMessageBody({ content, role }: ChatMessageBodyProps) {
  if (role === 'user') {
    return <div className="chat-message-text">{content}</div>
  }

  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
