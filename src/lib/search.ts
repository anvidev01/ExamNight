import type { CaptionLang, Cue, Video } from '../types'
import { conceptsOf, phoneticKey, tokenSpans, equivalentsOf, tokenize } from './translit'

const LANGS: CaptionLang[] = ['en', 'hi', 'hl']

const QUERY_STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'is', 'to', 'and', 'for', 'what', 'how', 'why',
  'ka', 'ki', 'ke', 'ko', 'hai', 'hain', 'se', 'me', 'mein', 'ye', 'yeh', 'का', 'की', 'के', 'को', 'है', 'हैं', 'से', 'में', 'यह',
])

interface IndexedToken { start: number; end: number; key: string; lower: string; concepts: number[] }
interface IndexedCue {
  videoId: string
  cueIndex: number
  s: number
  cue: Cue
  fields: Record<CaptionLang, IndexedToken[]>
}

export interface Range { start: number; end: number }
export interface SearchHit {
  videoId: string
  cueIndex: number
  s: number
  score: number
  cue: Cue
  /** Matched character ranges per caption language (only languages with matches). */
  ranges: Partial<Record<CaptionLang, Range[]>>
}

export interface CaptionIndex { cues: IndexedCue[] }

export function buildIndex(videos: Video[]): CaptionIndex {
  const cues: IndexedCue[] = []
  for (const v of videos) {
    v.cues.forEach((cue, cueIndex) => {
      const fields = {} as Record<CaptionLang, IndexedToken[]>
      for (const l of LANGS) {
        fields[l] = tokenSpans(cue[l]).map((t) => ({
          start: t.start,
          end: t.end,
          key: phoneticKey(t.token),
          lower: t.token.toLowerCase(),
          concepts: conceptsOf(t.token),
        }))
      }
      cues.push({ videoId: v.id, cueIndex, s: cue.s, cue, fields })
    })
  }
  return { cues }
}

function editDistanceAtMost1(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) // substitution
  if (a.length > b.length) return a.slice(i + 1) === b.slice(i) // deletion
  return a.slice(i) === b.slice(i + 1)
}

interface QueryToken { raw: string; lower: string; key: string; concepts: number[] }

export function parseQuery(query: string): QueryToken[] {
  const toks = tokenize(query).map((raw) => ({
    raw,
    lower: raw.toLowerCase(),
    key: phoneticKey(raw),
    concepts: conceptsOf(raw),
  }))
  const content = toks.filter((t) => !QUERY_STOPWORDS.has(t.lower))
  return content.length ? content : toks
}

/** Score how well one cue token matches one query token (0 = no match). */
function matchScore(q: QueryToken, t: IndexedToken): number {
  if (t.lower === q.lower) return 4
  if (q.key.length >= 3 && t.key === q.key) return 3
  if (q.concepts.length && t.concepts.some((c) => q.concepts.includes(c))) return 2.5
  if (q.lower.length >= 2 && t.lower.startsWith(q.lower)) return 2
  if (q.key.length >= 3 && t.key.startsWith(q.key)) return 1.6
  if (q.key.length >= 4 && editDistanceAtMost1(q.key, t.key)) return 1.2
  return 0
}

/** Transliteration-aware search. All query tokens must match somewhere in the cue (any language). */
export function searchIndex(index: CaptionIndex, query: string, opts: { videoIds?: string[]; limit?: number } = {}): SearchHit[] {
  const qts = parseQuery(query)
  if (!qts.length) return []
  const allow = opts.videoIds ? new Set(opts.videoIds) : null
  const hits: SearchHit[] = []
  for (const ic of index.cues) {
    if (allow && !allow.has(ic.videoId)) continue
    let total = 0
    const ranges: Partial<Record<CaptionLang, Range[]>> = {}
    let ok = true
    for (const q of qts) {
      let best = 0
      const found: { lang: CaptionLang; tok: IndexedToken }[] = []
      for (const l of LANGS) {
        for (const t of ic.fields[l]) {
          const sc = matchScore(q, t)
          if (sc > 0) {
            if (sc > best) best = sc
            found.push({ lang: l, tok: t })
          }
        }
      }
      if (!best) { ok = false; break }
      total += best
      for (const f of found) (ranges[f.lang] ??= []).push({ start: f.tok.start, end: f.tok.end })
    }
    if (!ok) continue
    hits.push({ videoId: ic.videoId, cueIndex: ic.cueIndex, s: ic.s, score: total, cue: ic.cue, ranges })
  }
  hits.sort((a, b) => b.score - a.score || a.videoId.localeCompare(b.videoId) || a.s - b.s)
  return hits.slice(0, opts.limit ?? 50)
}

export interface Segment { text: string; hit: boolean }
/** Split text into highlighted / plain segments given sorted-or-unsorted ranges. */
export function highlightSegments(text: string, ranges: Range[] | undefined): Segment[] {
  if (!ranges?.length) return [{ text, hit: false }]
  const rs = [...ranges].sort((a, b) => a.start - b.start)
  const out: Segment[] = []
  let pos = 0
  for (const r of rs) {
    if (r.start < pos) continue
    if (r.start > pos) out.push({ text: text.slice(pos, r.start), hit: false })
    out.push({ text: text.slice(r.start, r.end), hit: true })
    pos = r.end
  }
  if (pos < text.length) out.push({ text: text.slice(pos), hit: false })
  return out
}

/** Other spellings the engine also considers (shown under the search box). */
export function alsoSearching(query: string): string[] {
  const out = new Set<string>()
  for (const t of parseQuery(query)) for (const e of equivalentsOf(t.raw)) out.add(e)
  return [...out].slice(0, 6)
}
