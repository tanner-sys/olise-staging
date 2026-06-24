export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  crisis?: boolean
}
