import { useMemo, useState } from 'react'
import { useApp } from '../lib/app'
import { EXAM_BY_ID, SUBJECTS, SUBJECT_BY_ID, VIDEO_BY_ID, examVideoIds } from '../data/catalog'
import { summarizeSubject, METHOD_NOTE } from '../lib/summarize'
import { download, printSheet, toMarkdown, toPrintableHtml } from '../lib/export'
import { fmtTime } from '../lib/format'
import { watchLink } from '../lib/router'
import { CAPTION_LANG_LABEL, type CaptionLang } from '../types'

const REASON: Record<string, string> = { bookmark: 'Your bookmark', 'exam-tip': 'Exam cue', formula: 'Formula', definition: 'Definition', 'key-terms': 'Key terms' }

export default function Revise({ subjectId }: { subjectId?: string }) {
  const app = useApp()
  const { data } = app
  const [budget, setBudget] = useState(30)
  const [studiedOnly, setStudiedOnly] = useState(false)
  const [lang, setLang] = useState<CaptionLang>(data.captionLang)
  const [msg, setMsg] = useState('')

  const exam = data.examId ? EXAM_BY_ID[data.examId] : undefined
  const subjects = exam ? SUBJECTS.filter((s) => exam.subjects.some((m) => m.subjectId === s.id)) : SUBJECTS
  const subject = SUBJECT_BY_ID[subjectId ?? ''] ?? subjects[0]

  const videos = useMemo(() => {
    const ids = exam && exam.subjects.some((m) => m.subjectId === subject.id) ? examVideoIds(exam.id, subject.id) : subject.playlists.flatMap((p) => p.videoIds)
    return ids
      .map((id) => VIDEO_BY_ID[id])
      .filter((v) => !studiedOnly || data.progress[v.id] || data.bookmarks.some((b) => b.videoId === v.id))
  }, [exam, subject, studiedOnly, data.progress, data.bookmarks])

  const summary = useMemo(
    () => summarizeSubject(subject.name, videos, { lang, bookmarks: data.bookmarks, budgetMinutes: budget }),
    [subject, videos, lang, data.bookmarks, budget],
  )
  const subjectBms = data.bookmarks.filter((b) => videos.some((v) => v.id === b.videoId))
  const profile = app.profiles.find((p) => p.id === app.activeProfileId)
  const meta = { studentName: app.guest ? 'Guest' : profile?.name ?? 'Student', examName: exam?.name ?? 'No exam selected', generatedAt: new Date() }
  const slug = subject.id

  return (
    <div className="grid gap-6">
      <div className="no-print">
        <h1 className="text-3xl font-bold">Last-minute revision</h1>
        <p className="mt-1 max-w-2xl muted">Pick a subject and how much time you have. Your bookmarks always make the cut.</p>
      </div>

      <div className="no-print card grid gap-4">
        <div role="tablist" aria-label="Subject" className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <a key={s.id} role="tab" aria-selected={s.id === subject.id} href={`#/revise/${s.id}`} className="chip">{s.name}</a>
          ))}
        </div>
        <div className="flex flex-wrap gap-6">
          <fieldset>
            <legend className="text-sm font-semibold">Time available</legend>
            <div className="mt-1 flex gap-2">
              {[10, 30, 60].map((m) => <button key={m} className="chip" aria-pressed={budget === m} onClick={() => setBudget(m)}>{m} min</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold">Language</legend>
            <div className="mt-1 flex gap-2">
              {(Object.keys(CAPTION_LANG_LABEL) as CaptionLang[]).map((l) => <button key={l} className="chip" aria-pressed={lang === l} onClick={() => setLang(l)}>{CAPTION_LANG_LABEL[l]}</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold">Scope</legend>
            <div className="mt-1 flex gap-2">
              <button className="chip" aria-pressed={!studiedOnly} onClick={() => setStudiedOnly(false)}>All videos</button>
              <button className="chip" aria-pressed={studiedOnly} onClick={() => setStudiedOnly(true)}>Only what I studied</button>
            </div>
          </fieldset>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => { download(`exam-night-${slug}.md`, 'text/markdown', toMarkdown(summary, subjectBms, meta)); setMsg('Markdown downloaded.') }}>Download Markdown</button>
          <button className="btn-sec" onClick={() => { download(`exam-night-${slug}.html`, 'text/html', toPrintableHtml(summary, subjectBms, meta)); setMsg('Printable HTML downloaded.') }}>Download printable HTML</button>
          <button className="btn-sec" onClick={() => setMsg(printSheet(toPrintableHtml(summary, subjectBms, meta)) ? 'Choose "Save as PDF" in the print dialog.' : 'Pop-up blocked. Use "Download printable HTML", open it, then print.')}>Print / Save as PDF</button>
        </div>
        <p role="status" className="text-sm">{msg}</p>
      </div>

      <article className="card print-area" aria-labelledby="sum-h">
        <h2 id="sum-h" className="text-2xl font-bold">{subject.name}: revision sheet</h2>
        <p className="mt-1 text-sm muted">{meta.studentName} &middot; {meta.examName} &middot; {budget}-minute plan &middot; demo data</p>
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200" data-testid="heuristic-note">{METHOD_NOTE}</p>

        {summary.formulas.length > 0 && (
          <section className="mt-4">
            <h3 className="text-lg font-semibold">Formula and definition cheat-sheet</h3>
            <ul className="mt-1 list-disc pl-5">
              {summary.formulas.map((f) => <li key={f.videoId + f.t} className="my-1">{f.text}</li>)}
            </ul>
          </section>
        )}
        {summary.videos.length === 0 && <p className="mt-4">Nothing studied yet. Switch scope to &quot;All videos&quot; or watch a video first.</p>}
        {summary.videos.map((v) => (
          <section key={v.videoId} className="mt-5" data-testid="sum-video">
            <h3 className="text-lg font-semibold">{v.title}</h3>
            {v.topTerms.length > 0 && <p className="text-xs muted">Key terms: {v.topTerms.join(', ')}</p>}
            <ul className="mt-1 grid gap-2">
              {v.points.map((p) => (
                <li key={p.t} className="flex gap-3">
                  <a href={watchLink(v.videoId, p.t)} className="min-w-12 font-bold text-brand-700 underline dark:text-brand-100" aria-label={`Open at ${fmtTime(p.t)}`}>{fmtTime(p.t)}</a>
                  <span>
                    <span className="mr-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-700/30 dark:text-brand-100">{REASON[p.reason]}</span>
                    <span lang={lang === 'hi' ? 'hi' : 'en'}>{p.text}</span>
                    {p.note && <span className="block text-sm muted">Your note: {p.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </div>
  )
}
