import type { VideoProgress } from '../types'

export const BUCKET_SEC = 10
export const COMPLETE_RATIO = 0.9

export function bucketCount(duration: number): number {
  return Math.max(1, Math.ceil(duration / BUCKET_SEC))
}

/** Mark buckets covered between two consecutive playback positions (forward play only, bounded jump). */
export function addWatched(prev: VideoProgress | undefined, from: number, to: number, duration: number): VideoProgress {
  const buckets = new Set(prev?.buckets ?? [])
  const n = bucketCount(duration)
  const lo = Math.max(0, Math.min(from, to))
  const rawHi = Math.max(from, to)
  const hi = Math.min(duration, rawHi)
  // a "tick" should only cover continuous playback; callers pass small spans. Guard against seek-jumps.
  if (rawHi - lo <= 30) {
    for (let b = Math.floor(lo / BUCKET_SEC); b <= Math.min(n - 1, Math.floor(Math.max(lo, hi - 0.001) / BUCKET_SEC)); b++) buckets.add(b)
  }
  const arr = [...buckets].sort((a, b) => a - b)
  const ratio = arr.length / n
  return {
    position: to,
    duration,
    buckets: arr,
    completed: (prev?.completed ?? false) || ratio >= COMPLETE_RATIO,
    updatedAt: Date.now(),
  }
}

export function watchedRatio(p: VideoProgress | undefined): number {
  if (!p) return 0
  return Math.min(1, p.buckets.length / bucketCount(p.duration))
}

export function watchedSeconds(p: VideoProgress | undefined): number {
  if (!p) return 0
  return Math.min(p.duration, p.buckets.length * BUCKET_SEC)
}
