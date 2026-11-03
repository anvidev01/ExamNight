import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { actions, store, useApp } from '../lib/app'
import { VIDEO_BY_ID, examVideoIds, nextVideoId, subjectOfVideo } from '../data/catalog'
import PlayerPanel, { type PlayerHandle } from '../player/PlayerPanel'
import CaptionSearch, { type Scope } from '../components/CaptionSearch'
import { BookmarkRow } from '../components/BookmarkList'
import { BOOKMARK_LABELS, CAPTION_LANG_LABEL, type BookmarkLabel, type CaptionLang } from '../types'
import { fmtTime } from '../lib/format'
import { navigate, watchLink } from '../lib/router'
import { watchedRatio } from '../lib/progress'
import { ProgressBar } from '../components/ui'

export default function Watch({ videoId, startAt }: { videoId: string; startAt?: number }) {
  const app = useApp()
  const { data } = app
  const video = VIDEO_BY_ID[videoId]
  const player = useRef<PlayerHandle>(null)
  const [time, setTime] = useState(0)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('video')
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState<BookmarkLabel>('Exam tip')
  const [note, setNote] = useState('')
  const [announce, setAnnounce] = useState('')
  const noteRef = useRef<HTMLInputElement>(null)
  const timeRef = useRef(0)
  const progress = video ? data.progress[video.id] : undefined

  const resume = useMemo(() => {
    if (!video) return 0
    if (startAt !== undefined) return startAt
    const p = data.progress[video.id]
    return p && p.position < video.durationSec * 0.95 ? p.position : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id, startAt])

  useEffect(() => { if (video) actions.setLastVideo(video.id) }, [video])

  const onTime = useCallback((t: number) => { timeRef.current = t; setTime(t) }, [])
  const onProgress = useCallback((from: number, to: number, dur: number) => {
    if (!video) return
    if (from === to) {
      if (to === 0 && !store.getState().data.progress[video.id]) return
      actions.savePosition(video.id, to, dur)
    } else actions.recordProgress(video.id, from, to, dur)
  }, [video])

  const exam = data.examId
  const examIds = useMemo(() => (exam ? examVideoIds(exam) : []), [exam])
  const bms = useMemo(() => data.bookmarks.filter((b) => b.videoId === videoId).sort((a, b) => a.t - b.t), [data.bookmarks, videoId])
  const subj = subjectOfVideo(videoId)
  const next = nextVideoId(videoId, exam)
  const lang = data.captionLang

  const openAdd = useCallback(() => {
    setAdding(true)
    setTimeout(() => noteRef.current?.focus(), 0)
  }, [])

  // keyboard shortcuts (ignored while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'k') { e.preventDefault(); player.current?.toggle() }
      else if (e.key === 'b') { e.preventDefault(); openAdd() }
      else if (e.key === 'j') player.current?.seek(timeRef.current - 10)
      else if (e.key === 'l') player.current?.seek(timeRef.current + 10)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openAdd])

  if (!video) return <p>Video not found. <a className="underline" href="#/">Back home</a></p>

  const activeIdx = (() => { let i = -1; video.cues.forEach((c, k) => { if (c.s <= time) i = k }); return i })()

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section aria-labelledby="vt">
        <p className="text-sm muted">{subj?.name} &middot; demo video &middot; {video.channel} (fictional)</p>
        <h1 id="vt" className="mb-3 text-2xl font-bold">{video.title}</h1>
        <PlayerPanel ref={player} video={video} startAt={resume} lowData={app.device.lowData} lang={lang} bookmarks={bms} onTime={onTime} onProgress={onProgress} />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn" onClick={openAdd} data-testid="add-bm">Bookmark at {fmtTime(time)}</button>
          <div className="min-w-40 flex-1">
            <ProgressBar p={progress} />
            <p className="mt-1 text-xs muted" data-testid="progress-text">
              Watched {Math.round(watchedRatio(progress) * 100)}%{progress?.completed ? ' (completed)' : ''}. Resume position {fmtTime(progress?.position ?? 0)}.
            </p>
          </div>
          {next && <a className="btn-sec" href={watchLink(next)}>Next video</a>}
          {subj && <a className="btn-sec" href={`#/revise/${subj.id}`}>Revision sheet</a>}
        </div>
        <p className="mt-2 text-xs muted">Shortcuts: k play/pause, j/l back/forward 10s, b bookmark.</p>

        {adding && (
          <form
            className="card mt-3" aria-label="New bookmark"
            onSubmit={(e) => {
              e.preventDefault()
              actions.addBookmark({ videoId, t: timeRef.current, note, label })
              setAnnounce(`Bookmark saved at ${fmtTime(timeRef.current)}`)
              setNote(''); setAdding(false)
            }}
            onKeyDown={(e) => { if (e.key === 'Escape') setAdding(false) }}
          >
            <p className="font-semibold">Save {fmtTime(timeRef.current)}</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Label">
              {BOOKMARK_LABELS.map((l) => <button type="button" key={l} className="chip" aria-pressed={label === l} onClick={() => setLabel(l)}>{l}</button>)}
            </div>
            <label htmlFor="bm-note" className="mt-3 block text-sm font-medium">Note (optional)</label>
            <input id="bm-note" ref={noteRef} className="field mt-1" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} placeholder="Why does this matter?" />
            <div className="mt-3 flex gap-2"><button className="btn" type="submit">Save bookmark</button><button type="button" className="btn-sec" onClick={() => setAdding(false)}>Cancel</button></div>
          </form>
        )}
        <p className="sr-only" role="status">{announce}</p>

        <section className="card mt-4" aria-labelledby="bmh">
          <h2 id="bmh" className="font-semibold">Bookmarks in this video ({bms.length})</h2>
          {bms.length === 0 ? <p className="mt-1 text-sm muted">None yet. Press b or use the button above.</p> : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800" data-testid="bm-list">
              {bms.map((b) => <BookmarkRow key={b.id} b={b} onJump={(x) => player.current?.seek(x.t)} />)}
            </ul>
          )}
        </section>
      </section>

      <aside className="grid content-start gap-4" aria-label="Captions">
        <div className="card">
          <CaptionSearch
            query={query} onQuery={setQuery} scope={scope} onScope={setScope} videoId={videoId} examVideoIds={examIds} lang={lang}
            onPick={(h) => (h.videoId === videoId ? player.current?.seek(h.s) : navigate(watchLink(h.videoId, h.s).slice(1)))}
          />
        </div>
        <div className="card">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto font-semibold">Transcript</h2>
            <div role="group" aria-label="Caption language" className="flex gap-1">
              {(Object.keys(CAPTION_LANG_LABEL) as CaptionLang[]).map((l) => (
                <button key={l} className="chip !px-3" aria-pressed={lang === l} onClick={() => actions.setCaptionLang(l)}>{CAPTION_LANG_LABEL[l]}</button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs muted">Sample captions written for this demo, not real transcripts.</p>
          <ol className="mt-2 max-h-96 overflow-auto" data-testid="transcript">
            {video.cues.map((c, i) => (
              <li key={c.s}>
                <button
                  className={`flex min-h-11 w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 ${i === activeIdx ? 'bg-brand-50 dark:bg-brand-700/30' : ''}`}
                  aria-current={i === activeIdx ? 'true' : undefined}
                  onClick={() => player.current?.seek(c.s)}
                >
                  <b className="min-w-12 pt-0.5 text-brand-700 dark:text-brand-100">{fmtTime(c.s)}</b>
                  <span lang={lang === 'hi' ? 'hi' : 'en'}>{c[lang]}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  )
}
