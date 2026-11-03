import type { Bookmark, BookmarkLabel, CaptionLang, DeviceSettings, Profile, ProfileData } from '../types'
import { addWatched } from './progress'
import { DEVICE_KEY, KEY_PREFIX, ROOT_KEY, dataKey, readJson, writeJson, type StorageLike } from './storage'
import { uid } from './format'

export const PROFILE_COLORS = ['#6366f1', '#0891b2', '#d97706', '#db2777', '#059669', '#7c3aed']

export interface AppState {
  profiles: Profile[]
  activeProfileId: string | null
  guest: boolean
  data: ProfileData
  device: DeviceSettings
  /** false when localStorage writes failed - progress will not survive a reload */
  persistOk: boolean
}

export const emptyData = (): ProfileData => ({
  examId: null,
  lastVideoId: null,
  captionLang: 'en',
  progress: {},
  bookmarks: [],
})

interface Root { profiles: Profile[]; activeProfileId: string | null }

export function createStore(storage: StorageLike, opts: { defaultLowData?: boolean } = {}) {
  const root = readJson<Root>(storage, ROOT_KEY, { profiles: [], activeProfileId: null })
  const device = readJson<DeviceSettings>(storage, DEVICE_KEY, { theme: 'system', lowData: opts.defaultLowData ?? false })
  const activeOk = root.activeProfileId && root.profiles.some((p) => p.id === root.activeProfileId)
  const activeId = activeOk ? root.activeProfileId : null

  let state: AppState = {
    profiles: root.profiles,
    activeProfileId: activeId,
    guest: false,
    data: activeId ? { ...emptyData(), ...readJson<ProfileData>(storage, dataKey(activeId), emptyData()) } : emptyData(),
    device,
    persistOk: true,
  }
  const listeners = new Set<() => void>()

  function commit(next: AppState, persist: { root?: boolean; data?: boolean; device?: boolean } = {}) {
    let ok = true
    const attempted = !!(persist.root || persist.data || persist.device)
    if (persist.root) ok = writeJson(storage, ROOT_KEY, { profiles: next.profiles, activeProfileId: next.activeProfileId }) && ok
    if (persist.data && next.activeProfileId && !next.guest) ok = writeJson(storage, dataKey(next.activeProfileId), next.data) && ok
    if (persist.device) ok = writeJson(storage, DEVICE_KEY, next.device) && ok
    state = { ...next, persistOk: attempted ? ok : state.persistOk }
    listeners.forEach((l) => l())
  }

  const hasSession = () => state.guest || !!state.activeProfileId
  const setData = (fn: (d: ProfileData) => ProfileData) => {
    if (!hasSession()) return
    commit({ ...state, data: fn(state.data) }, { data: true })
  }

  const actions = {
    createProfile(name: string): Profile {
      const clean = name.trim().slice(0, 24) || 'Student'
      const p: Profile = {
        id: uid('p'),
        name: clean,
        color: PROFILE_COLORS[state.profiles.length % PROFILE_COLORS.length],
        createdAt: Date.now(),
      }
      const next = { ...state, profiles: [...state.profiles, p], activeProfileId: p.id, guest: false, data: emptyData() }
      commit(next, { root: true, data: true })
      return p
    },
    switchProfile(id: string) {
      if (!state.profiles.some((p) => p.id === id)) return
      const data = { ...emptyData(), ...readJson<ProfileData>(storage, dataKey(id), emptyData()) }
      commit({ ...state, activeProfileId: id, guest: false, data }, { root: true })
    },
    startGuest() {
      commit({ ...state, activeProfileId: null, guest: true, data: emptyData() }, { root: true })
    },
    /** Leave the current profile / guest session and return to the chooser. Guest data is discarded. */
    signOut() {
      commit({ ...state, activeProfileId: null, guest: false, data: emptyData() }, { root: true })
    },
    /** "Clear my data": wipe progress + bookmarks + choices for a profile but keep the profile itself. */
    clearProfileData(id: string) {
      storage.removeItem(dataKey(id))
      if (state.activeProfileId === id) commit({ ...state, data: emptyData() }, { data: true })
      else commit(state)
    },
    /** Delete a profile and all of its data. */
    deleteProfile(id: string) {
      storage.removeItem(dataKey(id))
      const profiles = state.profiles.filter((p) => p.id !== id)
      const wasActive = state.activeProfileId === id
      commit(
        { ...state, profiles, activeProfileId: wasActive ? null : state.activeProfileId, data: wasActive ? emptyData() : state.data },
        { root: true },
      )
    },
    /** Remove every Exam Night key from this browser (all profiles + device settings). */
    wipeDevice() {
      const keys: string[] = []
      for (let i = 0; i < (storage.length ?? 0); i++) {
        const k = storage.key?.(i)
        if (k && k.startsWith(KEY_PREFIX)) keys.push(k)
      }
      keys.forEach((k) => storage.removeItem(k))
      state = {
        profiles: [], activeProfileId: null, guest: false, data: emptyData(),
        device: { theme: 'system', lowData: false }, persistOk: true,
      }
      listeners.forEach((l) => l())
    },
    renameProfile(id: string, name: string) {
      const clean = name.trim().slice(0, 24)
      if (!clean) return
      commit({ ...state, profiles: state.profiles.map((p) => (p.id === id ? { ...p, name: clean } : p)) }, { root: true })
    },
    setExam(examId: string | null) { setData((d) => ({ ...d, examId })) },
    setCaptionLang(captionLang: CaptionLang) { setData((d) => ({ ...d, captionLang })) },
    setLastVideo(videoId: string) { setData((d) => (d.lastVideoId === videoId ? d : { ...d, lastVideoId: videoId })) },
    /** Record playback from `from` to `to` seconds (a tick). Updates resume position + watched buckets. */
    recordProgress(videoId: string, from: number, to: number, duration: number) {
      setData((d) => ({
        ...d,
        lastVideoId: videoId,
        progress: { ...d.progress, [videoId]: addWatched(d.progress[videoId], from, to, duration) },
      }))
    },
    /** Persist position only (no watched credit), e.g. after a seek or on pause. */
    savePosition(videoId: string, position: number, duration: number) {
      setData((d) => {
        const prev = d.progress[videoId]
        const base = prev ?? { position: 0, duration, buckets: [], completed: false, updatedAt: 0 }
        return { ...d, lastVideoId: videoId, progress: { ...d.progress, [videoId]: { ...base, position, duration, updatedAt: Date.now() } } }
      })
    },
    addBookmark(b: { videoId: string; t: number; note: string; label: BookmarkLabel }): Bookmark | null {
      if (!hasSession()) return null
      const bm: Bookmark = { id: uid('b'), videoId: b.videoId, t: Math.max(0, Math.floor(b.t)), note: b.note.trim().slice(0, 280), label: b.label, createdAt: Date.now() }
      setData((d) => ({ ...d, bookmarks: [...d.bookmarks, bm] }))
      return bm
    },
    updateBookmark(id: string, patch: Partial<Pick<Bookmark, 'note' | 'label'>>) {
      setData((d) => ({ ...d, bookmarks: d.bookmarks.map((b) => (b.id === id ? { ...b, ...patch, note: (patch.note ?? b.note).slice(0, 280) } : b)) }))
    },
    removeBookmark(id: string) { setData((d) => ({ ...d, bookmarks: d.bookmarks.filter((b) => b.id !== id) })) },
    setTheme(theme: DeviceSettings['theme']) { commit({ ...state, device: { ...state.device, theme } }, { device: true }) },
    setLowData(lowData: boolean) { commit({ ...state, device: { ...state.device, lowData } }, { device: true }) },
  }

  return {
    getState: () => state,
    subscribe(l: () => void) { listeners.add(l); return () => void listeners.delete(l) },
    actions,
  }
}

export type AppStore = ReturnType<typeof createStore>
