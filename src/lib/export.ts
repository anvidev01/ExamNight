import type { Bookmark } from '../types'
import type { SubjectSummary } from './summarize'
import { fmtTime } from './format'
import { VIDEO_BY_ID } from '../data/catalog'

const REASON_LABEL: Record<string, string> = {
  bookmark: 'Your bookmark',
  'exam-tip': 'Exam cue',
  formula: 'Formula',
  definition: 'Definition',
  'key-terms': 'Key terms',
}

export interface ExportMeta { studentName: string; examName: string; generatedAt: Date }

export function toMarkdown(summary: SubjectSummary, bookmarks: Bookmark[], meta: ExportMeta): string {
  const L: string[] = []
  L.push(`# ${summary.title} - last-minute revision sheet`)
  L.push('')
  L.push(`- Student: ${meta.studentName}`)
  L.push(`- Exam: ${meta.examName}`)
  L.push(`- Generated: ${meta.generatedAt.toISOString().slice(0, 10)} (${summary.budgetMinutes}-minute plan)`)
  L.push(`- Sample/demo data. ${summary.method}`)
  L.push('')
  if (summary.formulas.length) {
    L.push('## Formula and definition cheat-sheet', '')
    for (const f of summary.formulas) L.push(`- ${f.text} _(${VIDEO_BY_ID[f.videoId]?.title ?? f.videoId} @ ${fmtTime(f.t)})_`)
    L.push('')
  }
  for (const v of summary.videos) {
    L.push(`## ${v.title}`, '')
    if (v.topTerms.length) L.push(`Key terms: ${v.topTerms.join(', ')}`, '')
    if (!v.points.length) L.push('_No lines selected._', '')
    for (const p of v.points) {
      L.push(`- **${fmtTime(p.t)}** [${REASON_LABEL[p.reason]}] ${p.text}`)
      if (p.note) L.push(`  - Note: ${p.note}`)
    }
    L.push('')
  }
  L.push('## All my bookmarks', '')
  if (!bookmarks.length) L.push('_No bookmarks yet._')
  for (const b of [...bookmarks].sort((a, b) => a.videoId.localeCompare(b.videoId) || a.t - b.t)) {
    L.push(`- ${VIDEO_BY_ID[b.videoId]?.title ?? b.videoId} @ ${fmtTime(b.t)} [${b.label}]${b.note ? ': ' + b.note : ''}`)
  }
  L.push('')
  return L.join('\n')
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Standalone printable HTML (works offline; use the browser's Print -> Save as PDF). */
export function toPrintableHtml(summary: SubjectSummary, bookmarks: Bookmark[], meta: ExportMeta): string {
  const e = escapeHtml
  const sections = summary.videos
    .map(
      (v) => `<section><h2>${e(v.title)}</h2>${v.topTerms.length ? `<p class="terms">Key terms: ${e(v.topTerms.join(', '))}</p>` : ''}<ul>${v.points
        .map(
          (p) => `<li><b>${fmtTime(p.t)}</b> <span class="tag">${e(REASON_LABEL[p.reason])}</span> ${e(p.text)}${p.note ? `<div class="note">Note: ${e(p.note)}</div>` : ''}</li>`,
        )
        .join('')}</ul></section>`,
    )
    .join('')
  const formulas = summary.formulas.length
    ? `<section><h2>Formula and definition cheat-sheet</h2><ul>${summary.formulas.map((f) => `<li>${e(f.text)} <i>(${fmtTime(f.t)})</i></li>`).join('')}</ul></section>`
    : ''
  const bms = [...bookmarks]
    .sort((a, b) => a.videoId.localeCompare(b.videoId) || a.t - b.t)
    .map((b) => `<li>${e(VIDEO_BY_ID[b.videoId]?.title ?? b.videoId)} @ <b>${fmtTime(b.t)}</b> [${e(b.label)}]${b.note ? ': ' + e(b.note) : ''}</li>`)
    .join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${e(summary.title)} - revision sheet</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#111}h1{font-size:22px}h2{font-size:16px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:20px}
li{margin:6px 0}.tag{font-size:11px;background:#eef;border-radius:8px;padding:1px 6px}.note{color:#444;font-size:13px}.terms,.meta{color:#555;font-size:13px}
@media print{body{margin:0}section{break-inside:avoid}}</style></head><body>
<h1>${e(summary.title)} - last-minute revision sheet</h1>
<p class="meta">${e(meta.studentName)} | ${e(meta.examName)} | ${meta.generatedAt.toISOString().slice(0, 10)} | ${summary.budgetMinutes}-minute plan<br>Sample/demo data. ${e(summary.method)}</p>
${formulas}${sections}<section><h2>All my bookmarks</h2><ul>${bms || '<li>No bookmarks yet.</li>'}</ul></section></body></html>`
}

export function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime + ';charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Open the printable sheet in a new window and trigger print (user picks "Save as PDF"). */
export function printSheet(html: string): boolean {
  const w = window.open('', '_blank', 'noopener=no')
  if (!w) return false
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
  return true
}
