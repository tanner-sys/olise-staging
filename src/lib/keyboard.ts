export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}

export function prefersWideLayout(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(min-width: 768px)').matches
}
