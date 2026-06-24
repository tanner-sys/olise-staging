export { getPlatform, isNative, isMobile, isDesktop, showDecorativeChrome } from './detect'
export type { Platform } from './detect'
export { storageGet, storageSet, storageRemove, storageGetJson, storageSetJson } from './storage'
export { configureShell, getShellClassName } from './shell'
export { hapticLight, hapticSuccess } from './haptics'
export {
  checkForDesktopUpdate,
  getDesktopAppVersion,
  installDesktopUpdate,
  isDesktopUpdaterAvailable,
  updateToInfo,
} from './updater'
export type { DesktopUpdateInfo, DesktopUpdateProgress } from './updater'
