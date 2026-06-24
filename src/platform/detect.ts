export type Platform = 'web' | 'ios' | 'android' | 'desktop'

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
    Capacitor?: {
      getPlatform: () => string
      isNativePlatform: () => boolean
    }
  }
}

export function getPlatform(): Platform {
  if (typeof window === 'undefined') return 'web'

  if (window.__TAURI_INTERNALS__) {
    return 'desktop'
  }

  const capacitor = window.Capacitor
  if (capacitor?.isNativePlatform()) {
    const platform = capacitor.getPlatform()
    if (platform === 'ios') return 'ios'
    if (platform === 'android') return 'android'
  }

  return 'web'
}

export function isNative(): boolean {
  return getPlatform() !== 'web'
}

export function isMobile(): boolean {
  const platform = getPlatform()
  return platform === 'ios' || platform === 'android'
}

export function showDecorativeChrome(): boolean {
  return getPlatform() === 'web'
}
