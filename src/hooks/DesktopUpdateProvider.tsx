import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Update } from '@tauri-apps/plugin-updater'
import {
  checkForDesktopUpdate,
  installDesktopUpdate,
  isDesktopUpdaterAvailable,
  updateToInfo,
} from '../platform/updater'
import { DesktopUpdateContext, type DesktopUpdateContextValue } from './desktopUpdateContext'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

function useDesktopUpdateState(): DesktopUpdateContextValue {
  const [status, setStatus] = useState<DesktopUpdateContextValue['status']>('idle')
  const [updateInfo, setUpdateInfo] = useState<DesktopUpdateContextValue['updateInfo']>(null)
  const [progress, setProgress] = useState<DesktopUpdateContextValue['progress']>(null)
  const [error, setError] = useState<string | null>(null)
  const updateRef = useRef<Update | null>(null)
  const enabled = isDesktopUpdaterAvailable()

  const refresh = useCallback(async () => {
    if (!enabled) return

    setStatus('checking')
    setError(null)

    try {
      const update = await checkForDesktopUpdate()
      updateRef.current = update
      setUpdateInfo(update ? updateToInfo(update) : null)
      setStatus(update ? 'available' : 'idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check for updates.')
      setStatus('error')
    }
  }, [enabled])

  const install = useCallback(async () => {
    const update = updateRef.current
    if (!enabled || !update) return

    setStatus('downloading')
    setError(null)
    setProgress({ downloaded: 0 })

    try {
      await installDesktopUpdate(update, (next) => setProgress(next))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.')
      setStatus('available')
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const timeout = window.setTimeout(() => {
      void refresh()
    }, 0)

    const interval = window.setInterval(() => {
      void refresh()
    }, CHECK_INTERVAL_MS)

    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [enabled, refresh])

  return {
    enabled,
    status,
    updateInfo,
    progress,
    error,
    updateAvailable: Boolean(updateInfo),
    refresh,
    install,
  }
}

export function DesktopUpdateProvider({ children }: { children: ReactNode }) {
  const value = useDesktopUpdateState()
  return <DesktopUpdateContext.Provider value={value}>{children}</DesktopUpdateContext.Provider>
}
