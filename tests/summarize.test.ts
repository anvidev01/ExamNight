import { describe, expect, it } from 'vitest'
import { summarizeVideo, summarizeSubject, pointsPerVideo } from '../src/lib/summarize'
import { toMarkdown, toPrintableHtml } from '../src/lib/export'
import { VIDEO_BY_ID } from '../src/data/catalog'
import type { Bookmark } from '../src/types'

const bm = (videoId: string, t: number, note: string): Bookmark => ({ id: 'b' + t, videoId, t, note, label: 'Doubt', createdAt: 1 })

describe('summariser', () => {
  const v = VIDEO_BY_ID['ds-sorting']
  it('is deterministic and time-ordered', () => {
    const a = summarizeVideo(v, { maxPoints: 4 })
    const b = summarizeVideo(v, { maxPoints: 4 })
    expect(a).toEqual(b)
    expect(a.points.map((p) => p.t)).toEqual([...a.points.map((p) => p.t)].sort((x, y) => x - y))
    expect(a.points).toHaveLength(4)
  })
  it('prefers exam-cue and formula lines over the intro', () => {
    const s = summarizeVideo(v, { maxPoints: 3 })
    expect(s.points.some((p) => p.t === 0)).toBe(false)
    expect(s.points.some((p) => p.reason === 'exam-tip')).toBe(true)
  })
  it('always includes bookmarked moments with notes', () => {
    const s = summarizeVideo(v, { maxPoints: 2, bookmarks: [bm('ds-sorting', 75, 'why pivot?')] })
    const p = s.points.find((x) => x.reason === 'bookmark')!
    expect(p.t).toBe(70)
    expect(p.note).toBe('why pivot?')
  })
  it('outputs the chosen language', () => {
    const s = summarizeVideo(v, { lang: 'hi', maxPoints: 2 })
    expect(/[ऀ-ॿ]/.test(s.points[0].text)).toBe(true)
  })
  it('scales with time budget and flags itself as heuristic', () => {
    expect(pointsPerVideo(10)).toBeLessThan(pointsPerVideo(60))
    const sub = summarizeSubject('DSA', [v], { budgetMinutes: 10 })
    expect(sub.method).toMatch(/not by an LLM/)
    expect(sub.totalPoints).toBe(2)
  })
})

describe('export', () => {
  const sub = summarizeSubject('Data Structures', [VIDEO_BY_ID['ds-sorting']], { budgetMinutes: 30, bookmarks: [bm('ds-sorting', 75, 'check <this>')] })
  const meta = { studentName: 'Anvi', examName: 'GATE CS/IT', generatedAt: new Date('2026-01-02T00:00:00Z') }
  it('markdown has headings, bookmarks and the heuristic disclaimer', () => {
    const md = toMarkdown(sub, [bm('ds-sorting', 75, 'check <this>')], meta)
    expect(md).toContain('# Data Structures - last-minute revision sheet')
    expect(md).toContain('1:15')
    expect(md).toMatch(/not by an LLM/)
  })
  it('printable html escapes user text', () => {
    const html = toPrintableHtml(sub, [bm('ds-sorting', 75, 'check <this>')], meta)
    expect(html).toContain('check &lt;this&gt;')
    expect(html).not.toContain('check <this>')
    expect(html).toContain('@media print')
  })
})
