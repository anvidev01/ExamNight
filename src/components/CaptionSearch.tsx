import { useMemo } from 'react'
import { VIDEOS, VIDEO_BY_ID } from '../data/catalog'
import { alsoSearching, buildIndex, highlightSegments, searchIndex, type SearchHit } from '../lib/search'
import { CAPTION_LANG_LABEL, type CaptionLang } from '../types'
import { fmtTime } from '../lib/format'

let cachedIndex: ReturnType<typeof buildIndex> | null = null
export const getIndex = () => (cachedIndex ??= buildIndex(VIDEOS))

export type Scope = 'video' | 'exam' | 'all'

function Highlighted({ text, ranges }: { text: string; ranges?: { start: number; end: number }[] }) {
  return (
    <>
      {highlightSegments(text, ranges).map((s, i) => (s.hit ? <mark key={i} className="hit-mark">{s.text}</mark> : <span key={i}>{s.text}</span>))}
    </>
  )
}

export default function CaptionSearch({
  query, onQuery, scope, onScope, videoId, examVideoIds, lang, onPick,
}: {
  query: string
  onQuery: (q: string) => void
  scope: Scope
  onScope: (s: Scope) => void
  videoId: string
  examVideoIds: string[]
  lang: CaptionLang
  onPick: (hit: SearchHit) => void
}) {
  const hits = useMemo(() => {
    if (!query.trim()) return []
    const ids = scope === 'video' ? [videoId] : scope === 'exam' ? examVideoIds : undefined
    return searchIndex(getIndex(), query, { videoIds: ids, limit: 30 })
  }, [query, scope, videoId, examVideoIds])
  const also = useMemo(() => (query.trim() ? alsoSearching(query) : []), [query])

  return (
    <div>
      <label htmlFor="cap-q" className="block text-sm font-semibold">Search captions</label>
      <input
        id="cap-q" type="search" className="field mt-1" value={query} onChange={(e) => onQuery(e.target.value)}
        placeholder="derivative, अवकलन, avkalan, worst case..." autoComplete="off" spellCheck={false}
        aria-describedby="cap-help"
      />
      <p id="cap-help" className="mt-1 text-xs muted">Works across English, Hindi (Devanagari) and Hinglish spellings.</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Search scope">
        {(['video', 'exam', 'all'] as Scope[]).map((s) => (
          <button key={s} className="chip !min-h-11" aria-pressed={scope === s} onClick={() => onScope(s)}>
            {s === 'video' ? 'This video' : s === 'exam' ? 'My exam' : 'All demo videos'}
          </button>
        ))}
      </div>
      {also.length > 0 && <p className="mt-2 text-xs muted">Also matching: {also.join(', ')}</p>}
      <div aria-live="polite" className="mt-2">
        {query.trim() && <p className="text-sm muted" data-testid="hit-count">{hits.length} result{hits.length === 1 ? '' : 's'}</p>}
        <ul className="mt-1 divide-y divide-slate-200 dark:divide-slate-800" data-testid="hits">
          {hits.map((h) => {
            // show the viewer's language if it matched; otherwise the first language that matched
            const shown: CaptionLang = h.ranges[lang] ? lang : ((Object.keys(h.ranges)[0] as CaptionLang) ?? lang)
            return (
              <li key={h.videoId + h.s}>
                <button className="flex min-h-11 w-full items-start gap-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => onPick(h)}>
                  <b className="min-w-12 pt-0.5 text-brand-700 dark:text-brand-100">{fmtTime(h.s)}</b>
                  <span className="flex-1">
                    <span lang={shown === 'hi' ? 'hi' : 'en'}><Highlighted text={h.cue[shown]} ranges={h.ranges[shown]} /></span>
                    <span className="mt-0.5 block text-xs muted">
                      {scope !== 'video' && <>{VIDEO_BY_ID[h.videoId].title} &middot; </>}
                      {shown !== lang ? `matched in ${CAPTION_LANG_LABEL[shown]}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {query.trim() && hits.length === 0 && <p className="py-2 text-sm">No match. Try another spelling or widen the scope.</p>}
      </div>
    </div>
  )
}
