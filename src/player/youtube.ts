/** Minimal typings + loader for the YouTube IFrame Player API (no npm dependency). */
export interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
  setPlaybackRate(r: number): void
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: () => void
        onStateChange?: (e: { data: number }) => void
        onError?: (e: { data: number }) => void
      }
    },
  ) => YTPlayer
}
declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 } as const

let loading: Promise<YTNamespace> | null = null
/** Loads the API script on demand. Rejects when offline/blocked (script error or timeout). */
export function loadYouTubeApi(timeoutMs = 8000): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (loading) return loading
  loading = new Promise<YTNamespace>((resolve, reject) => {
    const timer = setTimeout(() => { loading = null; reject(new Error('timeout')) }, timeoutMs)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      clearTimeout(timer)
      resolve(window.YT!)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    s.onerror = () => { clearTimeout(timer); loading = null; s.remove(); reject(new Error('blocked')) }
    document.head.appendChild(s)
  })
  return loading
}
