import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type ChatSession = {
  id: string
  title: string
  child_id: string | null
  created_at: string
  updated_at: string
}

export function useChatSessions() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(Boolean(user))

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setSessions([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, child_id, created_at, updated_at')
      .eq('caregiver_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(30)

    if (!error && data) setSessions(data as ChatSession[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setSessions([])
        setLoading(false)
      })
      return
    }

    let active = true
    void (async () => {
      if (!supabase) return
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, child_id, created_at, updated_at')
        .eq('caregiver_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30)

      if (!active) return
      if (!error && data) setSessions(data as ChatSession[])
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [user])

  const createSession = useCallback(
    async (childId?: string | null) => {
      if (!supabase || !user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          caregiver_id: user.id,
          child_id: childId ?? null,
          title: 'New chat',
        })
        .select('id, title, child_id, created_at, updated_at')
        .single()

      if (error) throw error
      await refresh()
      return data as ChatSession
    },
    [user, refresh],
  )

  return { sessions, loading, refresh, createSession }
}
