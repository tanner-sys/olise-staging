import type { ChatSession } from '../hooks/useChatSessions'

export function filterChatSessionsByScope(
  sessions: ChatSession[],
  options: { showChatChildProjects: boolean; chatScopeChildId: string | null },
): ChatSession[] {
  const { showChatChildProjects, chatScopeChildId } = options
  if (!showChatChildProjects) return sessions
  if (chatScopeChildId) {
    return sessions.filter((session) => session.child_id === chatScopeChildId)
  }
  return sessions
}
