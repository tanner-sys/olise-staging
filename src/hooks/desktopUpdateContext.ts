import { createContext } from 'react'
import type { DesktopUpdateInfo, DesktopUpdateProgress } from '../platform/updater'

export type DesktopUpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'error'

export type DesktopUpdateContextValue = {
  enabled: boolean
  status: DesktopUpdateStatus
  updateInfo: DesktopUpdateInfo | null
  progress: DesktopUpdateProgress | null
  error: string | null
  updateAvailable: boolean
  refresh: () => Promise<void>
  install: () => Promise<void>
}

export const DesktopUpdateContext = createContext<DesktopUpdateContextValue | null>(null)
