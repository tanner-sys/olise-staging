import { formatChatError } from './formatChatError'

const brainUrl = import.meta.env.VITE_BRAIN_URL?.replace(/\/$/, '') ?? ''

export type CrisisResource = {
  label: string
  detail: string
  href: string
}

export type ChatStreamEvent =
  | { type: 'token'; text: string }
  | {
      type: 'meta'
      crisis?: boolean
      blocked?: boolean
      turnId?: string
      provider?: string
      model?: string
      replayed?: boolean
      code?: string
    }
  | {
      type: 'crisis'
      crisisEventId: string
      category: string
      resources: CrisisResource[]
    }
  | { type: 'blocked'; code: string; message: string }
  | { type: 'replace'; content: string; reason: string }
  | {
      type: 'citation'
      chunkId: string
      citationTitle: string
      documentId: string
      documentVersion: string
    }
  | {
      type: 'done'
      userMessageId: string
      assistantMessageId: string
      replayed?: boolean
    }
  | { type: 'error'; message: string }

export function isChatConfigured(): boolean {
  return Boolean(brainUrl)
}

export async function streamChatMessage(
  content: string,
  accessToken: string,
  sessionId: string,
  clientMessageId: string,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  if (!brainUrl) {
    onEvent({ type: 'error', message: formatChatError('Chat is not configured. Contact support if this persists.') })
    return
  }

  let response: Response
  try {
    response = await fetch(`${brainUrl}/v1/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content, sessionId, clientMessageId }),
    })
  } catch {
    onEvent({
      type: 'error',
      message: formatChatError('Network error — check your connection and try again.'),
    })
    return
  }

  if (!response.ok && !response.headers.get('content-type')?.includes('text/event-stream')) {
    onEvent({
      type: 'error',
      message: formatChatError(`Request failed (${response.status})`),
    })
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onEvent({ type: 'error', message: formatChatError('No response from chat service.') })
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
        } else if (eventType === 'meta') {
          onEvent({
            type: 'meta',
            crisis: data.crisis === true,
            blocked: data.blocked === true,
            turnId: typeof data.turnId === 'string' ? data.turnId : undefined,
            provider: typeof data.provider === 'string' ? data.provider : undefined,
            model: typeof data.model === 'string' ? data.model : undefined,
            replayed: data.replayed === true,
            code: typeof data.code === 'string' ? data.code : undefined,
          })
        } else if (eventType === 'crisis') {
          onEvent({
            type: 'crisis',
            crisisEventId: String(data.crisisEventId ?? ''),
            category: String(data.category ?? 'crisis_self_harm'),
            resources: Array.isArray(data.resources)
              ? (data.resources as CrisisResource[])
              : [],
          })
        } else if (eventType === 'blocked') {
          onEvent({
            type: 'blocked',
            code: String(data.code ?? 'policy_violation'),
            message: String(data.message ?? ''),
          })
        } else if (eventType === 'replace') {
          onEvent({
            type: 'replace',
            content: String(data.content ?? ''),
            reason: String(data.reason ?? 'post_safety'),
          })
        } else if (eventType === 'citation') {
          onEvent({
            type: 'citation',
            chunkId: String(data.chunkId ?? ''),
            citationTitle: String(data.citationTitle ?? ''),
            documentId: String(data.documentId ?? ''),
            documentVersion: String(data.documentVersion ?? '1'),
          })
        } else if (eventType === 'done') {
          onEvent({
            type: 'done',
            userMessageId: String(data.userMessageId ?? ''),
            assistantMessageId: String(data.assistantMessageId ?? ''),
            replayed: data.replayed === true,
          })
        } else if (eventType === 'error') {
          onEvent({
            type: 'error',
            message: formatChatError(String(data.message ?? 'Unknown error')),
          })
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }
}
