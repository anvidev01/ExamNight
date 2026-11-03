import { describe, expect, it } from 'vitest'
import { devanagariToRoman, phoneticKey, tokenize, conceptsOf } from '../src/lib/translit'

describe('transliteration', () => {
  it('romanises Devanagari', () => {
    expect(devanagariToRoman('अवकलन')).toBe('avakalana')
    expect(devanagariToRoman('गतिरोध')).toBe('gatirodha')
  })
  it('Hindi and Hinglish spellings share a phonetic key', () => {
    expect(phoneticKey('अवकलन')).toBe(phoneticKey('avkalan'))
    expect(phoneticKey('avakalan')).toBe(phoneticKey('avkalan'))
    expect(phoneticKey('समीकरण')).toBe(phoneticKey('samikaran'))
    expect(phoneticKey('परीक्षा')).toBe(phoneticKey('pariksha'))
    expect(phoneticKey('गतिरोध')).toBe(phoneticKey('gatirodh'))
  })
  it('merges aspirates, w/v and double letters', () => {
    expect(phoneticKey('bhaag')).toBe(phoneticKey('baag'))
    expect(phoneticKey('wait')).toBe(phoneticKey('vait'))
    expect(phoneticKey('collision')).toBe(phoneticKey('colision'))
  })
  it('tokenizes Devanagari words without splitting on combining marks', () => {
    expect(tokenize('अवकलन, derivative! x2')).toEqual(['अवकलन', 'derivative', 'x2'])
  })
  it('glossary links derivative, अवकलन and avkalan', () => {
    const a = conceptsOf('derivative')
    expect(a.length).toBeGreaterThan(0)
    expect(conceptsOf('अवकलन')).toEqual(expect.arrayContaining(a))
    expect(conceptsOf('avkalan')).toEqual(expect.arrayContaining(a))
  })
})
