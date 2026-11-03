import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import type { Bookmark, CaptionLang, Video } from '../types'
import { loadYouTubeApi, YT_STATE, type YTPlayer } from './youtube'
import { fmtTime } from '../lib/format'

export interface PlayerHandle {
  seek(t: number): void
  play(): void
  pause(): void
  toggle(): void
  getTime(): number
}

interface Props {
  video: Video
  startAt: number
  lowData: boolean
  lang: CaptionLang
  bookmarks: Bookmark[]
  ref?: Ref<PlayerHandle>
  onTime: (t: number) => void
  onProgress: (from: number, to: number, duration: number) => void
}

type Mode = 'clock' | 'yt'

export default function PlayerPanel({ video, startAt, lowData, lang, bookmarks, ref, onTime, onProgress }: Props) {
  const startMode: Mode = lowData || !navigator.onLine ? 'clock' : 'yt'
  const [mode, setMode] = useState<Mode>(startMode)
  const [note, setNote] = useState<string>(
    lowData ? 'Low-data mode: the video is not loaded. The transcript-clock player below works offline.' : !navigator.onLine ? 'You appear to be offline. Using the transcript-clock player.' : '',
  )
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(startAt)
  const [duration, setDuration] = useState(video.durationSec)
  const [rate, setRate] = useState(1)
  const [ytReady, setYtReady] = useState(false)

  const timeRef = useRef(startAt)
  const lastPos = useRef(startAt)
  const playingRef = useRef(false)
  const ytRef = useRef<YTPlayer | null>(null)
  const ytHost = useRef<HTMLDivElement>(null)
  const onProgressRef = useRef(onProgress)
  const onTimeRef = useRef(onTime)
  const durRef = useRef(duration)
  useEffect(() => { onProgressRef.current = onProgress; onTimeRef.current = onTime; durRef.current = duration })

  const setT = useCallback((t: number) => {
    timeRef.current = t
    setTime(t)
    onTimeRef.current(t)
  }, [])

  const flush = useCallback(() => {
    const cur = timeRef.current
    onProgressRef.current(lastPos.current, cur, durRef.current)
    lastPos.current = cur
  }, [])

  const setPlayingBoth = (p: boolean) => { playingRef.current = p; setPlaying(p) }

  const play = useCallback(() => {
    if (ytRef.current && ytReady) ytRef.current.playVideo()
    else if (mode === 'clock') {
      if (timeRef.current >= durRef.current - 1) { timeRef.current = 0; lastPos.current = 0; setT(0) }
      setPlayingBoth(true)
    }
  }, [mode, ytReady, setT])
  const pause = useCallback(() => {
    if (ytRef.current && ytReady) ytRef.current.pauseVideo()
    setPlayingBoth(false)
    flush()
  }, [ytReady, flush])
  const seek = useCallback((t: number) => {
    const clamped = Math.max(0, Math.min(t, durRef.current))
    flush()
    ytRef.current?.seekTo(clamped, true)
    lastPos.current = clamped
    setT(clamped)
    onProgressRef.current(clamped, clamped, durRef.current) // persist resume position
  }, [flush, setT])

  useImperativeHandle(ref, () => ({
    seek,
    play,
    pause,
    toggle: () => (playingRef.current ? pause() : play()),
    getTime: () => timeRef.current,
  }), [seek, play, pause])

  // clock player
  useEffect(() => {
    if (mode !== 'clock' || !playing) return
    const id = setInterval(() => {
      const next = timeRef.current + 0.25 * rate
      if (next >= durRef.current) { setT(durRef.current); setPlayingBoth(false); flush(); return }
      setT(next)
    }, 250)
    return () => clearInterval(id)
  }, [mode, playing, rate, setT, flush])

  // periodic progress flush while playing
  useEffect(() => {
    if (!playing) return
    const id = setInterval(flush, 2000)
    return () => clearInterval(id)
  }, [playing, flush])

  // flush on unmount / tab hide
  useEffect(() => {
    const onHide = () => flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', onHide); flush() }
  }, [flush])

  // YouTube player
  useEffect(() => {
    if (mode !== 'yt') return
    let cancelled = false
    let poll: ReturnType<typeof setInterval> | undefined
    let readyTimer: ReturnType<typeof setTimeout> | undefined
    const fallback = (msg: string) => {
      if (cancelled) return
      try { ytRef.current?.destroy() } catch { /* ignore */ }
      ytRef.current = null
      setYtReady(false)
      setNote(msg)
      setMode('clock')
    }
    setNote('Loading YouTube player...')
    loadYouTubeApi().then((YT) => {
      if (cancelled || !ytHost.current) return
      const holder = document.createElement('div')
      ytHost.current.replaceChildren(holder)
      readyTimer = setTimeout(() => fallback('YouTube did not respond. Using the transcript-clock player.'), 9000)
      ytRef.current = new YT.Player(holder, {
        videoId: video.youtubeId,
        playerVars: { start: Math.floor(startAt), rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            clearTimeout(readyTimer)
            if (cancelled) return
            setYtReady(true)
            setNote('')
            const d = ytRef.current?.getDuration()
            if (d && d > 0) { setDuration(d); durRef.current = d }
            poll = setInterval(() => {
              const t = ytRef.current?.getCurrentTime()
              if (typeof t === 'number' && Math.abs(t - timeRef.current) > 0.01) setT(t)
            }, 500)
          },
          onStateChange: (e) => {
            if (e.data === YT_STATE.PLAYING) setPlayingBoth(true)
            else if (e.data === YT_STATE.PAUSED || e.data === YT_STATE.ENDED) { setPlayingBoth(false); flush() }
          },
          onError: () => { clearTimeout(readyTimer); fallback('This sample video is unavailable on YouTube (demo IDs are placeholders). Using the transcript-clock player.') },
        },
      })
    }).catch(() => fallback('YouTube is offline or blocked. Using the transcript-clock player.'))
    return () => {
      cancelled = true
      clearInterval(poll)
      clearTimeout(readyTimer)
      try { ytRef.current?.destroy() } catch { /* ignore */ }
      ytRef.current = null
      setYtReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode === 'yt', video.youtubeId])

  // initialise time for first render
  useEffect(() => { onTimeRef.current(startAt) }, [startAt])

  const cueIdx = (() => {
    let idx = -1
    video.cues.forEach((c, i) => { if (c.s <= time) idx = i })
    return idx
  })()
  const cue = cueIdx >= 0 ? video.cues[cueIdx] : undefined

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white" style={{ aspectRatio: '16 / 9' }}>
        {mode === 'yt' && <div ref={ytHost} className="absolute inset-0 [&>*]:size-full [&_iframe]:size-full" data-testid="yt-host" />}
        {mode === 'clock' && (
          <div className="absolute inset-0 flex flex-col justify-between p-4" data-testid="clock-player">
            <div className="flex items-start justify-between gap-2 text-xs text-slate-300">
              <span>Transcript-clock player (simulated timeline, no video)</span>
              <span>{video.channel}</span>
            </div>
            <p lang={lang === 'hi' ? 'hi' : 'en'} className="text-center text-lg font-medium leading-snug sm:text-2xl" aria-live="off">
              {cue ? cue[lang] : 'Press play to start the timeline.'}
            </p>
            <p className="text-center text-xs text-slate-300">{fmtTime(time)} / {fmtTime(duration)}</p>
          </div>
        )}
      </div>
      {note && <p role="status" className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200" data-testid="player-note">{note}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn" onClick={() => (playing ? pause() : play())} aria-label={playing ? 'Pause' : 'Play'} data-testid="play-btn" disabled={mode === 'yt' && !ytReady}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button className="btn-sec" onClick={() => seek(timeRef.current - 10)} aria-label="Back 10 seconds">-10s</button>
        <button className="btn-sec" onClick={() => seek(timeRef.current + 10)} aria-label="Forward 10 seconds">+10s</button>
        {mode === 'clock' && (
          <label className="flex items-center gap-2 text-sm">
            <span className="muted">Speed</span>
            <select className="field !w-auto" value={rate} onChange={(e) => { setRate(Number(e.target.value)); ytRef.current?.setPlaybackRate(Number(e.target.value)) }}>
              {[1, 1.5, 2, 4].map((r) => <option key={r} value={r}>{r}x</option>)}
            </select>
          </label>
        )}
        {mode === 'clock' && (
          <button className="btn-sec" onClick={() => { setNote(''); setMode('yt') }} data-testid="load-yt">
            {lowData ? 'Load YouTube video (uses data)' : 'Try YouTube player'}
          </button>
        )}
        {mode === 'yt' && <button className="btn-sec" onClick={() => { pause(); setMode('clock'); setNote('Switched to transcript-clock player.') }}>Use transcript only</button>}
      </div>

      <div className="relative mt-3">
        <label htmlFor="scrub" className="sr-only">Seek position</label>
        <input
          id="scrub" type="range" min={0} max={Math.floor(duration)} step={1} value={Math.floor(time)}
          aria-valuetext={`${fmtTime(time)} of ${fmtTime(duration)}`}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-11 w-full cursor-pointer accent-indigo-600"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2">
          {bookmarks.map((b) => (
            <span key={b.id} title={`${fmtTime(b.t)} ${b.note}`} className="absolute top-0 size-2.5 -translate-x-1/2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" style={{ left: `${Math.min(100, (b.t / duration) * 100)}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
