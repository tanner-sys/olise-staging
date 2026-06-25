import { supabase } from './supabase'

export type CrisisResource = {
  label: string
  detail: string
  href: string
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    label: '988 Suicide & Crisis Lifeline',
    detail: 'Call or text 988 — 24/7 support',
    href: 'tel:988',
  },
  {
    label: 'Crisis Text Line',
    detail: 'Text HOME to 741741',
    href: 'sms:741741&body=HOME',
  },
  {
    label: 'Emergency services',
    detail: 'Call 911 if anyone is in immediate danger',
    href: 'tel:911',
  },
]

export type ActiveCrisis = {
  crisisEventId: string | null
  category: string
  resources: CrisisResource[]
}

export async function loadUnacknowledgedCrisis(sessionId: string): Promise<ActiveCrisis | null> {
  if (!supabase) return null

  const { data: event, error: eventError } = await supabase
    .from('crisis_events')
    .select('id, category')
    .eq('session_id', sessionId)
    .order('detected_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (eventError) {
    console.error('Failed to load crisis event', eventError)
    return null
  }
  if (!event?.id) return null

  const { data: ack, error: ackError } = await supabase
    .from('crisis_acknowledgments')
    .select('crisis_event_id')
    .eq('crisis_event_id', event.id)
    .maybeSingle()

  if (ackError) {
    console.error('Failed to load crisis acknowledgment', ackError)
    return null
  }
  if (ack) return null

  return {
    crisisEventId: event.id as string,
    category: event.category as string,
    resources: CRISIS_RESOURCES,
  }
}

export async function acknowledgeCrisis(
  crisisEventId: string,
  caregiverId: string,
): Promise<boolean> {
  if (!supabase) return false

  const { error } = await supabase.from('crisis_acknowledgments').insert({
    crisis_event_id: crisisEventId,
    caregiver_id: caregiverId,
  })

  if (error) {
    console.error('Failed to acknowledge crisis', error)
    return false
  }

  return true
}
