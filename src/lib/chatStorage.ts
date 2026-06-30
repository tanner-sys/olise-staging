import { supabase } from './supabase'
import type { ChatCitation, ChatMessage } from '../types/chat'

export async function loadSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to load messages', error)
    return []
  }

  const messages = (data ?? []) as ChatMessage[]
  const assistantIds = messages.filter((m) => m.role === 'assistant').map((m) => m.id)
  if (assistantIds.length === 0) return messages

  const { data: citationRows, error: citationError } = await supabase
    .from('message_citations')
    .select('message_id, citation_title, document_version')
    .in('message_id', assistantIds)

  if (citationError) {
    console.error('Failed to load citations', citationError)
    return messages
  }

  const byMessage = new Map<string, ChatCitation[]>()
  for (const row of citationRows ?? []) {
    const messageId = row.message_id as string
    const list = byMessage.get(messageId) ?? []
    list.push({
      citationTitle: row.citation_title as string,
      documentVersion: row.document_version as string,
    })
    byMessage.set(messageId, list)
  }

  return messages.map((message) => ({
    ...message,
    citations: byMessage.get(message.id),
  }))
}
export async function touchSession(sessionId: string, title?: string): Promise<void> {
  if (!supabase) return

  const updates: { updated_at: string; title?: string } = {
    updated_at: new Date().toISOString(),
  }
  if (title) updates.title = title

  const { error } = await supabase.from('chat_sessions').update(updates).eq('id', sessionId)
  if (error) console.error('Failed to update session', error)
}

export async function loadSession(
  sessionId: string,
): Promise<{ id: string; child_id: string | null; title: string } | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, child_id, title')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load session', error)
    return null
  }

  return data as { id: string; child_id: string | null; title: string }
}

export async function updateSessionChildId(
  sessionId: string,
  childId: string | null,
): Promise<boolean> {
  if (!supabase) return false

  const { error } = await supabase
    .from('chat_sessions')
    .update({ child_id: childId, updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) {
    console.error('Failed to update session child', error)
    return false
  }

  return true
}

/** Create a child-scoped chat session if none exists yet (e.g. after onboarding a child). */
export async function ensureChildChatSession(
  caregiverId: string,
  childId: string,
  childName: string,
): Promise<void> {
  if (!supabase) return

  const { data: existing, error: lookupError } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('caregiver_id', caregiverId)
    .eq('child_id', childId)
    .limit(1)
    .maybeSingle()

  if (lookupError) {
    console.error('Failed to look up child chat session', lookupError)
    return
  }

  if (existing?.id) return

  const { error } = await supabase.from('chat_sessions').insert({
    caregiver_id: caregiverId,
    child_id: childId,
    title: childName.trim() || 'New chat',
  })

  if (error) console.error('Failed to create child chat session', error)
}

export function titleFromFirstMessage(text: string): string {
  const trimmed = text.trim()
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed
}
