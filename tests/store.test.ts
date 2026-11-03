import { beforeEach, describe, expect, it } from 'vitest'
import { createStore } from '../src/lib/store'
import { memoryStorage, dataKey, ROOT_KEY, type StorageLike } from '../src/lib/storage'
import { addWatched, watchedRatio } from '../src/lib/progress'

let storage: StorageLike
beforeEach(() => { storage = memoryStorage() })

describe('progress maths', () => {
  it('counts watched buckets, not position', () => {
    let p = addWatched(undefined, 0, 10, 100)
    p = addWatched(p, 10, 20, 100)
    expect(watchedRatio(p)).toBeCloseTo(0.2, 1)
    p = addWatched(p, 90, 150, 100) // seek jump > 30s span is ignored
    expect(watchedRatio(p)).toBeCloseTo(0.2, 1)
  })
  it('marks completed at 90%', () => {
    let p = addWatched(undefined, 0, 0, 100)
    for (let t = 0; t < 100; t += 10) p = addWatched(p, t, t + 10, 100)
    expect(p.completed).toBe(true)
  })
})

describe('progress store + resume', () => {
  it('persists position across a reload', () => {
    const s1 = createStore(storage)
    s1.actions.createProfile('Anvi')
    s1.actions.recordProgress('ds-sorting', 0, 25, 660)
    s1.actions.savePosition('ds-sorting', 123, 660)
    const s2 = createStore(storage)
    expect(s2.getState().activeProfileId).toBe(s1.getState().activeProfileId)
    expect(s2.getState().data.progress['ds-sorting'].position).toBe(123)
    expect(s2.getState().data.lastVideoId).toBe('ds-sorting')
  })
  it('stores bookmarks and allows edit/remove', () => {
    const s = createStore(storage)
    s.actions.createProfile('A')
    const b = s.actions.addBookmark({ videoId: 'os-deadlock', t: 160.7, note: ' key ', label: 'Exam tip' })!
    expect(s.getState().data.bookmarks[0]).toMatchObject({ t: 160, note: 'key' })
    s.actions.updateBookmark(b.id, { note: 'edited' })
    expect(s.getState().data.bookmarks[0].note).toBe('edited')
    s.actions.removeBookmark(b.id)
    expect(s.getState().data.bookmarks).toHaveLength(0)
  })
})

describe('profile isolation', () => {
  it('keeps progress and bookmarks separate per profile', () => {
    const s = createStore(storage)
    const a = s.actions.createProfile('Asha')
    s.actions.addBookmark({ videoId: 'ds-trees', t: 30, note: 'asha', label: 'Doubt' })
    s.actions.recordProgress('ds-trees', 0, 20, 600)
    const b = s.actions.createProfile('Ben')
    expect(s.getState().data.bookmarks).toHaveLength(0)
    expect(s.getState().data.progress).toEqual({})
    s.actions.addBookmark({ videoId: 'os-paging', t: 5, note: 'ben', label: 'Formula' })
    s.actions.switchProfile(a.id)
    expect(s.getState().data.bookmarks.map((x) => x.note)).toEqual(['asha'])
    expect(Object.keys(s.getState().data.progress)).toEqual(['ds-trees'])
    s.actions.switchProfile(b.id)
    expect(s.getState().data.bookmarks.map((x) => x.note)).toEqual(['ben'])
  })
  it('clear my data wipes only that profile', () => {
    const s = createStore(storage)
    const a = s.actions.createProfile('Asha')
    s.actions.addBookmark({ videoId: 'ds-trees', t: 30, note: 'x', label: 'Doubt' })
    const b = s.actions.createProfile('Ben')
    s.actions.addBookmark({ videoId: 'ds-trees', t: 31, note: 'y', label: 'Doubt' })
    s.actions.clearProfileData(a.id)
    expect(storage.getItem(dataKey(a.id))).toBeNull()
    expect(storage.getItem(dataKey(b.id))).not.toBeNull()
    expect(s.getState().profiles).toHaveLength(2)
    s.actions.switchProfile(a.id)
    expect(s.getState().data.bookmarks).toHaveLength(0)
  })
  it('delete profile removes its data and profile', () => {
    const s = createStore(storage)
    const a = s.actions.createProfile('Asha')
    s.actions.addBookmark({ videoId: 'ds-trees', t: 30, note: 'x', label: 'Doubt' })
    s.actions.deleteProfile(a.id)
    expect(storage.getItem(dataKey(a.id))).toBeNull()
    expect(s.getState().profiles).toHaveLength(0)
    expect(s.getState().activeProfileId).toBeNull()
  })
  it('guest mode never writes to storage and is discarded', () => {
    const s = createStore(storage)
    s.actions.startGuest()
    s.actions.addBookmark({ videoId: 'ds-trees', t: 30, note: 'guest', label: 'Doubt' })
    s.actions.recordProgress('ds-trees', 0, 10, 600)
    expect(s.getState().data.bookmarks).toHaveLength(1)
    const keys = [...Array(storage.length).keys()].map((i) => storage.key!(i)!)
    expect(keys.filter((k) => k.includes(':data:'))).toEqual([])
    s.actions.signOut()
    s.actions.startGuest()
    expect(s.getState().data.bookmarks).toHaveLength(0)
  })
  it('nothing is recorded when no profile/guest is active', () => {
    const s = createStore(storage)
    expect(s.actions.addBookmark({ videoId: 'x', t: 1, note: '', label: 'Doubt' })).toBeNull()
    s.actions.recordProgress('x', 0, 5, 100)
    expect(s.getState().data.progress).toEqual({})
    expect(storage.getItem(ROOT_KEY)).toBeNull()
  })
  it('wipeDevice removes all Exam Night keys', () => {
    const s = createStore(storage)
    s.actions.createProfile('A'); s.actions.setLowData(true)
    storage.setItem('other', '1')
    s.actions.wipeDevice()
    expect(storage.length).toBe(1)
    expect(s.getState().profiles).toHaveLength(0)
  })
})
