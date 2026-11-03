import { useApp } from '../lib/app'
import { VIDEO_BY_ID } from '../data/catalog'
import { BookmarkRow } from '../components/BookmarkList'
import { navigate, watchLink } from '../lib/router'
import { BOOKMARK_LABELS, type BookmarkLabel } from '../types'
import { useState } from 'react'

export default function BookmarksPage() {
  const { data } = useApp()
  const [filter, setFilter] = useState<BookmarkLabel | 'All'>('All')
  const list = data.bookmarks.filter((b) => filter === 'All' || b.label === filter)
  const byVideo = [...new Set(list.map((b) => b.videoId))]
  return (
    <div>
      <h1 className="text-3xl font-bold">Your bookmarks</h1>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by label">
        {(['All', ...BOOKMARK_LABELS] as const).map((l) => <button key={l} className="chip" aria-pressed={filter === l} onClick={() => setFilter(l)}>{l}</button>)}
      </div>
      {list.length === 0 && <p className="mt-6 muted">No bookmarks yet. Open a video and press <kbd>b</kbd> to save a moment.</p>}
      {byVideo.map((id) => (
        <section key={id} className="card mt-4">
          <h2 className="font-semibold">{VIDEO_BY_ID[id]?.title ?? id}</h2>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {list.filter((b) => b.videoId === id).sort((a, b) => a.t - b.t).map((b) => (
              <BookmarkRow key={b.id} b={b} onJump={(x) => navigate(watchLink(x.videoId, x.t).slice(1))} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
