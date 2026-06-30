import { useContext } from 'react'
import { DesktopUpdateContext } from './desktopUpdateContext'

export function useDesktopUpdate() {
  const context = useContext(DesktopUpdateContext)
  if (!context) {
    return {
      enabled: false,
      status: 'idle' as const,
      updateInfo: null,
      progress: null,
      error: null,
      updateAvailable: false,
      refresh: async () => {},
      install: async () => {},
    }
  }
  return context
}
