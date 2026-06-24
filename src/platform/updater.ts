import { getVersion } from '@tauri-apps/api/app'
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { getPlatform } from './detect'

export type DesktopUpdateInfo = {
  currentVersion: string
  version: string
  notes?: string
  date?: string
}

export type DesktopUpdateProgress = {
  downloaded: number
  total?: number
}

export function isDesktopUpdaterAvailable(): boolean {
  return getPlatform() === 'desktop'
}

export async function getDesktopAppVersion(): Promise<string | null> {
  if (!isDesktopUpdaterAvailable()) return null
  try {
    return await getVersion()
  } catch {
    return null
  }
}

export async function checkForDesktopUpdate(): Promise<Update | null> {
  if (!isDesktopUpdaterAvailable()) return null

  try {
    return await check()
  } catch (error) {
    console.warn('Desktop update check failed', error)
    return null
  }
}

export function updateToInfo(update: Update): DesktopUpdateInfo {
  return {
    currentVersion: update.currentVersion,
    version: update.version,
    notes: update.body,
    date: update.date,
  }
}

export async function installDesktopUpdate(
  update: Update,
  onProgress?: (progress: DesktopUpdateProgress) => void,
): Promise<void> {
  let downloaded = 0
  let total: number | undefined

  await update.downloadAndInstall((event: DownloadEvent) => {
    if (event.event === 'Started') {
      total = event.data.contentLength
      onProgress?.({ downloaded: 0, total })
    } else if (event.event === 'Progress') {
      downloaded += event.data.chunkLength
      onProgress?.({ downloaded, total })
    } else if (event.event === 'Finished') {
      onProgress?.({ downloaded, total })
    }
  })

  await relaunch()
}
