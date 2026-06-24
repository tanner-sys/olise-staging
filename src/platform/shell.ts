import { getPlatform, isMobile } from './detect'

export async function configureShell(): Promise<void> {
  if (!isMobile()) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#f7f6f3' })
  } catch {
    // Status bar plugin unavailable on web builds
  }
}

export function getShellClassName(): string {
  return `platform-${getPlatform()}`
}
