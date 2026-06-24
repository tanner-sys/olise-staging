export async function hapticLight(): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    if (!window.Capacitor?.isNativePlatform()) return
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // no-op on web
  }
}

export async function hapticSuccess(): Promise<void> {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    if (!window.Capacitor?.isNativePlatform()) return
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    // no-op on web
  }
}
