const brainUrl = import.meta.env.VITE_BRAIN_URL?.replace(/\/$/, '') ?? ''

export function isBrainConfigured(): boolean {
  return Boolean(brainUrl)
}

export type ChatHistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatStreamEvent =
  | { type: 'token'; text: string }
  | { type: 'done'; messageId: string }
  | { type: 'error'; message: string }

export async function streamChatMessage(
  content: string,
  history: ChatHistoryMessage[],
  accessToken: string,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  if (!brainUrl) {
    onEvent({ type: 'error', message: 'Brain URL is not configured' })
    return
  }

  const response = await fetch(`${brainUrl}/v1/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ content, history }),
  })

  if (!response.ok && !response.headers.get('content-type')?.includes('text/event-stream')) {
    onEvent({ type: 'error', message: `Request failed (${response.status})` })
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onEvent({ type: 'error', message: 'No response stream' })
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const lines = part.split('\n')
      let eventType = 'message'
      let dataLine = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7)
        if (line.startsWith('data: ')) dataLine = line.slice(6)
      }

      if (!dataLine) continue

      try {
        const data = JSON.parse(dataLine) as Record<string, unknown>
        if (eventType === 'token' && typeof data.text === 'string') {
          onEvent({ type: 'token', text: data.text })
        } else if (eventType === 'done') {
          onEvent({ type: 'done', messageId: String(data.messageId ?? '') })
        } else if (eventType === 'error') {
          onEvent({ type: 'error', message: String(data.message ?? 'Unknown error') })
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }
}
