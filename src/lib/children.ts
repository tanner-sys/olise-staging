import type { CaregiverProfile, ChildProfile } from '../types/database'
import { supabase } from './supabase'

/** Internal DB label for placeholder children — use `displayChildName()` in UI */
export const PLACEHOLDER_CHILD_LABEL = 'Your child'

export function activeChildren(children: ChildProfile[]): ChildProfile[] {
  return children.filter((child) => !child.archived_at)
}

export function displayChildName(child: ChildProfile): string {
  if (child.is_placeholder) return 'Unnamed child'
  return child.display_name
}

export function childChatScopeLabel(name: string): string {
  const trimmed = name.trim()
  return trimmed ? `Let's talk about ${trimmed}` : "Let's talk about your child"
}

export type ChildCheckInGate =
  | { type: 'none' }
  | { type: 'first_child' }
  | { type: 'pick_child'; children: ChildProfile[] }

export function getChildCheckInGate(
  profile: CaregiverProfile | null,
  children: ChildProfile[],
): ChildCheckInGate {
  const list = activeChildren(children)
  if (list.length === 0) return { type: 'first_child' }
  if (list.length === 1) return { type: 'none' }
  if (profile?.active_child_id && list.some((child) => child.id === profile.active_child_id)) {
    return { type: 'none' }
  }
  return { type: 'pick_child', children: list }
}

export function needsChildProfileChoice(children: ChildProfile[]): boolean {
  return activeChildren(children).length === 0
}

export function resolveCheckInChildId(
  profile: CaregiverProfile | null,
  children: ChildProfile[],
): string | null {
  const list = activeChildren(children)
  if (profile?.active_child_id && list.some((child) => child.id === profile.active_child_id)) {
    return profile.active_child_id
  }
  if (list.length === 1) {
    return list[0].id
  }
  return null
}

export function getPlaceholderChild(children: ChildProfile[]): ChildProfile | undefined {
  return activeChildren(children).find((child) => child.is_placeholder)
}

export async function setActiveChild(caregiverId: string, childId: string): Promise<void> {
  if (!supabase) return
  await supabase
    .from('caregiver_profiles')
    .update({ active_child_id: childId })
    .eq('id', caregiverId)
}

export async function archiveChild(caregiverId: string, childId: string): Promise<boolean> {
  if (!supabase) return false

  const { error } = await supabase
    .from('children')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', childId)
    .eq('caregiver_id', caregiverId)

  if (error) {
    console.error('Failed to archive child', error)
    return false
  }

  const { data: profile } = await supabase
    .from('caregiver_profiles')
    .select('active_child_id')
    .eq('id', caregiverId)
    .maybeSingle()

  if (profile?.active_child_id === childId) {
    await supabase
      .from('caregiver_profiles')
      .update({ active_child_id: null })
      .eq('id', caregiverId)
  }

  return true
}

export async function createPlaceholderChild(caregiverId: string): Promise<string | null> {
  if (!supabase) return null

  const existing = await supabase
    .from('children')
    .select('id')
    .eq('caregiver_id', caregiverId)
    .eq('is_placeholder', true)
    .is('archived_at', null)
    .maybeSingle()

  if (existing.data?.id) {
    await supabase
      .from('caregiver_profiles')
      .update({ active_child_id: existing.data.id })
      .eq('id', caregiverId)
    return existing.data.id as string
  }

  const { data, error } = await supabase
    .from('children')
    .insert({
      caregiver_id: caregiverId,
      display_name: PLACEHOLDER_CHILD_LABEL,
      age_band: '6_8',
      conditions: [],
      is_placeholder: true,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('Failed to create placeholder child', error)
    return null
  }

  await supabase
    .from('caregiver_profiles')
    .update({ active_child_id: data.id })
    .eq('id', caregiverId)

  return data.id as string
}
