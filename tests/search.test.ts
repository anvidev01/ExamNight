import { describe, expect, it } from 'vitest'
import { buildIndex, searchIndex, highlightSegments } from '../src/lib/search'
import { VIDEOS } from '../src/data/catalog'

const index = buildIndex(VIDEOS)
const top = (q: string, videoIds?: string[]) => searchIndex(index, q, { videoIds })

describe('caption search', () => {
  it('finds the same cue for derivative / अवकलन / avkalan', () => {
    const ids = ['derivative', 'अवकलन', 'avkalan', 'avakalan'].map((q) => {
      const hits = top(q, ['math-diff-rules'])
      expect(hits.length).toBeGreaterThan(0)
      return new Set(hits.map((h) => h.s))
    })
    expect(ids[0].has(0)).toBe(true)
    for (const s of ids) expect(s.has(0)).toBe(true)
    // the opening cue is found by all spellings
  })
  it('matches Hinglish in-text spelling variants (chain rule / श्रृंखला नियम)', () => {
    expect(top('chain rule', ['math-diff-rules'])[0].s).toBe(360)
    expect(top('श्रृंखला नियम', ['math-diff-rules'])[0].s).toBe(360)
  })
  it('finds deadlock by Hindi and Hinglish', () => {
    expect(top('गतिरोध').some((h) => h.videoId === 'os-deadlock')).toBe(true)
    expect(top('gatirodh').some((h) => h.videoId === 'os-deadlock')).toBe(true)
  })
  it('requires all tokens (AND) and ranks exact phrase hits first', () => {
    const hits = top('worst case quick sort', ['ds-sorting'])
    expect(hits[0].s).toBe(235)
    expect(top('zzzzqq')).toEqual([])
  })
  it('supports prefix typing and ignores empty queries', () => {
    expect(top('partit', ['ds-sorting']).length).toBeGreaterThan(0)
    expect(top('   ')).toEqual([])
  })
  it('restricts to given videos', () => {
    expect(top('hash', ['os-paging'])).toEqual([])
    expect(top('hashing').every((h) => h.videoId === 'ds-hashing' || h.videoId)).toBe(true)
  })
  it('returns highlight ranges usable on cue text', () => {
    const h = top('pivot', ['ds-sorting'])[0]
    const segs = highlightSegments(h.cue.en, h.ranges.en)
    expect(segs.some((s) => s.hit && s.text.toLowerCase() === 'pivot')).toBe(true)
    expect(segs.map((s) => s.text).join('')).toBe(h.cue.en)
  })
})

describe('false-positive guard', () => {
  it('does not match "different" for the avkalan query', () => {
    const hits = searchIndex(index, 'avkalan', { limit: 100 })
    expect(hits.some((h) => /different keys/.test(h.cue.en))).toBe(false)
  })
})
