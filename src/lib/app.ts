import { useSyncExternalStore } from 'react'
import { createStore } from './store'
import { defaultStorage } from './storage'

const saveData = typeof navigator !== 'undefined' && (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData === true

export const store = createStore(defaultStorage(), { defaultLowData: saveData })
export const actions = store.actions

export function useApp() {
  return useSyncExternalStore(store.subscribe, store.getState)
}
