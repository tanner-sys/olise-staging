const memoryStore = new Map<string, string>()

async function getCapacitorPreferences() {
  try {
    const { Preferences } = await import('@capacitor/preferences')
    return Preferences
  } catch {
    return null
  }
}

async function getTauriStore() {
  try {
    if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return null
    const { load } = await import('@tauri-apps/plugin-store')
    return load('olise-store.json')
  } catch {
    return null
  }
}

export async function storageGet(key: string): Promise<string | null> {
  const tauriStore = await getTauriStore()
  if (tauriStore) {
    return (await tauriStore.get<string>(key)) ?? null
  }

  const preferences = await getCapacitorPreferences()
  if (preferences && window.Capacitor?.isNativePlatform()) {
    const { value } = await preferences.get({ key })
    return value
  }

  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key)
  }

  return memoryStore.get(key) ?? null
}

export async function storageSet(key: string, value: string): Promise<void> {
  const tauriStore = await getTauriStore()
  if (tauriStore) {
    await tauriStore.set(key, value)
    await tauriStore.save()
    return
  }

  const preferences = await getCapacitorPreferences()
  if (preferences && window.Capacitor?.isNativePlatform()) {
    await preferences.set({ key, value })
    return
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value)
    return
  }

  memoryStore.set(key, value)
}

export async function storageRemove(key: string): Promise<void> {
  const tauriStore = await getTauriStore()
  if (tauriStore) {
    await tauriStore.delete(key)
    await tauriStore.save()
    return
  }

  const preferences = await getCapacitorPreferences()
  if (preferences && window.Capacitor?.isNativePlatform()) {
    await preferences.remove({ key })
    return
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key)
    return
  }

  memoryStore.delete(key)
}

export async function storageGetJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await storageGet(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function storageSetJson<T>(key: string, value: T): Promise<void> {
  await storageSet(key, JSON.stringify(value))
}
