import type { Bookmark, BookmarkLabel, CaptionLang, Video } from '../types'
import { phoneticKey, tokenize } from './translit'

/**
 * Deterministic, local, extractive summariser. NOT an LLM: it ranks existing caption lines by
 *   - term frequency of content words within the video (language-agnostic via phonetic keys),
 *   - exam-cue phrases ("exam tip", "important", "common mistake", "याद रखो" ...),
 *   - formula / definition markers,
 *   - proximity to the student's own bookmarks (strongest signal).
 * Same input always gives the same output.
 */

export type PointReason = 'bookmark' | 'exam-tip' | 'formula' | 'definition' | 'key-terms'

export interface SummaryPoint {
  videoId: string
  t: number
  text: string
  reason: PointReason
  score: number
  note?: string
  label?: BookmarkLabel
}

export interface VideoSummary {
  videoId: string
  title: string
  points: SummaryPoint[]
  topTerms: string[]
  bookmarkCount: number
}

export interface SubjectSummary {
  title: string
  lang: CaptionLang
  budgetMinutes: number
  videos: VideoSummary[]
  formulas: SummaryPoint[]
  totalPoints: number
  method: string
}

export const METHOD_NOTE =
  'Heuristic extractive summary: caption lines are ranked by word frequency, exam-cue phrases, formula/definition markers and nearness to your bookmarks. It is generated locally by fixed rules, not by an LLM, and may miss or mis-rank points.'

const STOP = new Set(
  ('the a an of in on is are was to and or for with that this it as at by be from we you your so if then than can will which what when where how not no do does ' +
    'these those its into also all any each one two first next more most such only but because while every always never ' +
    'hai hain ka ki ke ko se me mein hum aap ye yeh to toh jab tab ek aur ya par kar karo karta karte karti hota hote hoti ' +
    'kisi jo woh wo liye isliye agar phir pehle bhi nahi na ho hoga tha the aaj ' +
    'का की के को से में हम आप यह ये तो जब तब एक और या पर कर करो करता करते होता होते होती किसी जो वह लिए इसलिए अगर फिर पहले भी नहीं ना हो है हैं था थे आज').split(' '),
)

const EXAM_CUES = [
  /exam tip|important|common mistake|do not forget|never forget|remember|must|most often|asked/i,
  /exam tip|important|yaad rakho|mat bhul|hamesha|common mistake|zaroor/i,
  /परीक्षा सुझाव|महत्वपूर्ण|याद रखो|मत भूल|हमेशा|आम गलती|ज़रूर/,
]
const FORMULA_CUES = [/formula|equals|recurrence|=|\bT of n\b/i, /formula|barabar|sutra/i, /सूत्र|बराबर/]
const DEFINITION_CUES = [/definition|is called|is a |is the |means /i, /definition/i, /परिभाषा/]

const anyMatch = (res: RegExp[], texts: string[]) => res.some((r) => texts.some((t) => r.test(t)))

export function termFrequencies(video: Video, lang: CaptionLang): Map<string, { n: number; sample: string }> {
  const tf = new Map<string, { n: number; sample: string }>()
  for (const cue of video.cues) {
    for (const tok of tokenize(cue[lang])) {
      const lower = tok.toLowerCase()
      if (STOP.has(lower)) continue
      const key = phoneticKey(tok)
      if (key.length < 2 || /^\d+$/.test(tok)) continue
      const e = tf.get(key)
      if (e) e.n++
      else tf.set(key, { n: 1, sample: tok })
    }
  }
  return tf
}

export function summarizeVideo(
  video: Video,
  opts: { lang?: CaptionLang; bookmarks?: Bookmark[]; maxPoints?: number } = {},
): VideoSummary {
  const lang = opts.lang ?? 'en'
  const bms = (opts.bookmarks ?? []).filter((b) => b.videoId === video.id)
  const tf = termFrequencies(video, lang)
  const maxPoints = Math.max(1, opts.maxPoints ?? 4)

  const scored = video.cues.map((cue, i) => {
    const texts = [cue.en, cue.hl, cue.hi]
    const keys = new Set<string>()
    for (const tok of tokenize(cue[lang])) {
      const lower = tok.toLowerCase()
      if (STOP.has(lower)) continue
      const k = phoneticKey(tok)
      if (k.length >= 2 && tf.has(k)) keys.add(k)
    }
    let freq = 0
    keys.forEach((k) => (freq += tf.get(k)!.n))
    let score = keys.size ? freq / Math.sqrt(keys.size) / 4 : 0
    let reason: PointReason = 'key-terms'
    if (anyMatch(EXAM_CUES, texts)) { score += 3; reason = 'exam-tip' }
    if (anyMatch(FORMULA_CUES, texts)) { score += 2.5; if (reason === 'key-terms') reason = 'formula' }
    if (anyMatch(DEFINITION_CUES, texts)) { score += 2; if (reason === 'key-terms') reason = 'definition' }
    if (i === 0) score -= 1.5 // intro lines are rarely revision material
    const nextS = video.cues[i + 1]?.s ?? Infinity
    const hit = bms.filter((b) => b.t >= cue.s && b.t < nextS)
    const point: SummaryPoint = { videoId: video.id, t: cue.s, text: cue[lang], reason, score, }
    if (hit.length) {
      score += 6 + hit.length
      point.reason = 'bookmark'
      point.note = hit.map((b) => b.note).filter(Boolean).join(' / ') || undefined
      point.label = hit[0].label
    }
    point.score = Math.round(score * 100) / 100
    return point
  })

  // Bookmarks that always make the cut come first, then the best remaining lines.
  const bookmarked = scored.filter((p) => p.reason === 'bookmark')
  const rest = scored.filter((p) => p.reason !== 'bookmark').sort((a, b) => b.score - a.score || a.t - b.t)
  const chosen = [...bookmarked, ...rest].slice(0, Math.max(maxPoints, bookmarked.length)).sort((a, b) => a.t - b.t)

  const topTerms = [...tf.values()].sort((a, b) => b.n - a.n || a.sample.localeCompare(b.sample)).slice(0, 5).map((e) => e.sample.toLowerCase())
  return { videoId: video.id, title: video.title, points: chosen, topTerms, bookmarkCount: bms.length }
}

export function pointsPerVideo(budgetMinutes: number): number {
  if (budgetMinutes <= 10) return 2
  if (budgetMinutes <= 30) return 4
  return 6
}

export function summarizeSubject(
  title: string,
  videos: Video[],
  opts: { lang?: CaptionLang; bookmarks?: Bookmark[]; budgetMinutes?: number } = {},
): SubjectSummary {
  const lang = opts.lang ?? 'en'
  const budget = opts.budgetMinutes ?? 30
  const per = pointsPerVideo(budget)
  const vs = videos.map((v) => summarizeVideo(v, { lang, bookmarks: opts.bookmarks, maxPoints: per }))
  const formulas = vs
    .flatMap((s) => s.points)
    .filter((p) => p.reason === 'formula' || p.label === 'Formula')
    .slice(0, 8)
  return {
    title,
    lang,
    budgetMinutes: budget,
    videos: vs,
    formulas,
    totalPoints: vs.reduce((n, s) => n + s.points.length, 0),
    method: METHOD_NOTE,
  }
}
