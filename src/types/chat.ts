export type ChatCitation = {
  citationTitle: string
  documentVersion: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  crisis?: boolean
  blocked?: boolean
  citations?: ChatCitation[]
}
