import { useCallback, useEffect, useState } from 'react'

export const SIDEBAR_WIDTH_KEY = 'olise-sidebar-width'
export const SIDEBAR_WIDTH_MIN = 220
export const SIDEBAR_WIDTH_MAX = 400
export const SIDEBAR_WIDTH_DEFAULT = 260

function clampWidth(width: number): number {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, width))
}

export function readSidebarWidth(): number {
  if (typeof window === 'undefined') return SIDEBAR_WIDTH_DEFAULT
  const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY)
  if (!stored) return SIDEBAR_WIDTH_DEFAULT
  const parsed = Number.parseInt(stored, 10)
  if (Number.isNaN(parsed)) return SIDEBAR_WIDTH_DEFAULT
  return clampWidth(parsed)
}

export function useSidebarWidth(enabled: boolean) {
  const [width, setWidth] = useState(readSidebarWidth)
  const [resizing, setResizing] = useState(false)

  useEffect(() => {
    if (!enabled) return
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`)
  }, [enabled, width])

  const persistWidth = useCallback((next: number) => {
    const clamped = clampWidth(next)
    setWidth(clamped)
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clamped))
  }, [])

  const startResize = useCallback(
    (clientX: number) => {
      if (!enabled) return

      const startX = clientX
      const startWidth = width
      setResizing(true)

      function onMove(event: MouseEvent) {
        persistWidth(startWidth + (event.clientX - startX))
      }

      function onUp() {
        setResizing(false)
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.classList.remove('sidebar-resizing')
      }

      document.body.classList.add('sidebar-resizing')
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [enabled, persistWidth, width],
  )

  return { width, resizing, startResize }
}
