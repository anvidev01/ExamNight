export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  key?(index: number): string | null
  readonly length?: number
}

export const KEY_PREFIX = 'examnight:v1:'
export const ROOT_KEY = KEY_PREFIX + 'root'
export const DEVICE_KEY = KEY_PREFIX + 'device'
export const dataKey = (profileId: string) => KEY_PREFIX + 'data:' + profileId

export function readJson<T>(storage: StorageLike, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key)
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback
  } catch {
    return fallback
  }
}

/** Returns false if the write failed (quota / private mode). */
export function writeJson(storage: StorageLike, key: string, value: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function memoryStorage(): StorageLike {
  const m = new Map<string, string>()
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size },
  }
}

export function defaultStorage(): StorageLike {
  try {
    const t = '__examnight_test__'
    window.localStorage.setItem(t, '1')
    window.localStorage.removeItem(t)
    return window.localStorage
  } catch {
    return memoryStorage()
  }
}
