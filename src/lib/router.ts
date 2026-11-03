import { useSyncExternalStore } from 'react'

export interface Route { path: string[]; query: URLSearchParams }

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/'
  const [p, q = ''] = raw.split('?')
  return { path: p.split('/').filter(Boolean), query: new URLSearchParams(q) }
}

let cached = { hash: '', route: parseHash('') }
function snapshot(): Route {
  const h = window.location.hash
  if (h !== cached.hash) cached = { hash: h, route: parseHash(h) }
  return cached.route
}
function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
export function useRoute(): Route {
  return useSyncExternalStore(subscribe, snapshot)
}
export function navigate(to: string) {
  window.location.hash = to
}
export const watchLink = (videoId: string, t?: number) => `#/watch/${videoId}${t ? `?t=${Math.floor(t)}` : ''}`
