/**
 * Transliteration-aware normalisation.
 *
 * Goal: 'derivative' / 'अवकलन' / 'avkalan' should find the same cue, and Hinglish spelling variants
 * ('kaal' / 'kal', 'avkalan' / 'avakalan') should collapse together.
 *
 * Two mechanisms:
 *  1. phoneticKey(): Devanagari is romanised, then reduced to a consonant "skeleton" (vowels dropped except a
 *     leading one, aspirates/sibilants/w-v/etc merged). Hindi and Hinglish spellings of the same word agree.
 *  2. GLOSSARY: a small hand-written concept table (English <-> Hindi <-> Hinglish) for cross-language matches
 *     where the words are not transliterations of each other (derivative = अवकलन).
 */

const CONSONANTS: Record<string, string> = {
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'n',
  च: 'ch', छ: 'chh', ज: 'j', झ: 'jh', ञ: 'n',
  ट: 't', ठ: 'th', ड: 'd', ढ: 'dh', ण: 'n',
  त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
  प: 'p', फ: 'ph', ब: 'b', भ: 'bh', म: 'm',
  य: 'y', र: 'r', ल: 'l', व: 'v',
  श: 'sh', ष: 'sh', स: 's', ह: 'h',
  ळ: 'l', क़: 'q', ख़: 'kh', ग़: 'g', ज़: 'z', ड़: 'r', ढ़: 'rh', फ़: 'f', य़: 'y',
}
const INDEPENDENT_VOWELS: Record<string, string> = {
  अ: 'a', आ: 'a', इ: 'i', ई: 'i', उ: 'u', ऊ: 'u', ऋ: 'ri', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au', ऑ: 'o', ऍ: 'e',
}
const MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o', 'ॅ': 'e',
}
const DIGITS: Record<string, string> = { '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9' }

const VIRAMA = '्'
const NUKTA = '़'
const ANUSVARA = 'ं'
const CANDRABINDU = 'ँ'
const VISARGA = 'ः'

export function hasDevanagari(s: string): boolean {
  return /[ऀ-ॿ]/.test(s)
}

/** Romanise Devanagari (approximate, ITRANS-like, schwa kept). Non-Devanagari characters pass through. */
export function devanagariToRoman(input: string): string {
  const s = input.normalize('NFC')
  let out = ''
  const chars = Array.from(s)
  for (let i = 0; i < chars.length; i++) {
    let c = chars[i]
    const next = chars[i + 1]
    // composed nukta consonants (e.g. ज + ़)
    if (CONSONANTS[c] !== undefined) {
      if (next === NUKTA) {
        const composed = c + NUKTA
        c = CONSONANTS[composed] !== undefined ? composed : c
        i++
      }
      out += CONSONANTS[c]
      const after = chars[i + 1]
      if (after === VIRAMA) {
        i++ // conjunct: no inherent vowel
      } else if (after !== undefined && MATRAS[after] !== undefined) {
        out += MATRAS[after]
        i++
      } else {
        out += 'a'
      }
      continue
    }
    if (INDEPENDENT_VOWELS[c] !== undefined) { out += INDEPENDENT_VOWELS[c]; continue }
    if (DIGITS[c] !== undefined) { out += DIGITS[c]; continue }
    if (c === ANUSVARA || c === CANDRABINDU) { out += 'n'; continue }
    if (c === VISARGA) { out += 'h'; continue }
    if (c === NUKTA || c === VIRAMA) continue
    out += c
  }
  return out
}

/** Reduce a romanised word to a phonetic consonant skeleton. */
export function romanSkeleton(roman: string): string {
  let s = roman.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  s = s.replace(/[^a-z0-9]/g, '')
  if (!s) return ''
  s = s
    .replace(/tch/g, '#')
    .replace(/chh/g, '#')
    .replace(/ch/g, '#')
    .replace(/sh/g, 's')
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/jh/g, 'j')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/bh/g, 'b')
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/c(?=[eiy])/g, 's') // English soft c: centre, cycle
    .replace(/c/g, 'k') // hard c: cache, complexity
    .replace(/qu/g, 'k')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/#/g, 'c') // 'ch' sound (sentinel restored)
  const lead = /^[aeiou]/.test(s) ? 'a' : ''
  const body = s.replace(/(.)\1+/g, '$1').replace(/[aeiou]/g, '')
  return lead + body
}

/** Phonetic key for one word (Devanagari or Latin). */
export function phoneticKey(word: string): string {
  const roman = hasDevanagari(word) ? devanagariToRoman(word) : word
  return romanSkeleton(roman)
}

/** Split into word tokens (letters/marks/digits). */
export function tokenize(text: string): string[] {
  return text.normalize('NFC').match(/[\p{L}\p{M}\p{N}]+/gu) ?? []
}

export interface TokenSpan { token: string; start: number; end: number }
export function tokenSpans(text: string): TokenSpan[] {
  const out: TokenSpan[] = []
  const re = /[\p{L}\p{M}\p{N}]+/gu
  let m: RegExpExecArray | null
  const t = text.normalize('NFC')
  while ((m = re.exec(t))) out.push({ token: m[0], start: m.index, end: m.index + m[0].length })
  return out
}

/**
 * Concept glossary. Each entry lists surface forms in English / Hindi / Hinglish. Every form is indexed by its
 * phonetic key, so spelling variants of any listed form also map to the concept.
 * Hand-written for the demo syllabus; extend as needed.
 */
export const GLOSSARY: string[][] = [
  ['derivative', 'differentiation', 'differentiate', 'अवकलन', 'अवकल', 'avkalan', 'avakalan', 'avkal', 'dervative'],
  ['integration', 'integral', 'integrate', 'समाकलन', 'समाकल', 'samakalan', 'samakal'],
  ['limit', 'सीमा', 'seema'],
  ['continuity', 'continuous', 'सतत', 'सांतत्य', 'satat', 'santatya'],
  ['slope', 'gradient', 'ढाल', 'dhaal', 'dhal'],
  ['series', 'श्रेणी', 'shreni', 'sreni'],
  ['maxima', 'minima', 'maximum', 'minimum', 'उच्चतम', 'निम्नतम', 'uchchatam', 'nimnatam'],
  ['equation', 'समीकरण', 'samikaran', 'sameekaran'],
  ['function', 'फलन', 'फंक्शन', 'phalan', 'falan', 'fanction'],
  ['variable', 'चर', 'char', 'chara'],
  ['constant', 'अचर', 'स्थिरांक', 'achar', 'sthirank'],
  ['array', 'सारणी', 'saranee', 'sarani'],
  ['sorting', 'sort', 'क्रमबद्ध', 'क्रमबद्धीकरण', 'क्रमण', 'kramban', 'krambaddh'],
  ['tree', 'वृक्ष', 'ट्री', 'vriksh', 'pedh', 'ped', 'पेड़'],
  ['node', 'नोड', 'शीर्ष', 'shirsh'],
  ['hash', 'hashing', 'हैशिंग', 'हैश'],
  ['collision', 'टकराव', 'takraav', 'takrav'],
  ['pivot', 'धुरी', 'dhuri'],
  ['complexity', 'जटिलता', 'jatilta', 'jatilata'],
  ['worst', 'सबसे खराब', 'ख़राब', 'kharab', 'kharaab'],
  ['process', 'प्रक्रिया', 'prakriya'],
  ['thread', 'थ्रेड', 'धागा', 'dhaga'],
  ['scheduling', 'schedule', 'शेड्यूलिंग', 'अनुसूचन', 'anusuchan'],
  ['deadlock', 'गतिरोध', 'गतिरोधन', 'gatirodh', 'dedlock'],
  ['memory', 'स्मृति', 'मेमोरी', 'smriti', 'smruti'],
  ['paging', 'page', 'पेज', 'पेजिंग', 'prishth', 'पृष्ठ'],
  ['resource', 'संसाधन', 'sansadhan'],
  ['waiting', 'wait', 'प्रतीक्षा', 'intezaar', 'intezar', 'इंतज़ार', 'इंतजार', 'pratiksha'],
  ['formula', 'सूत्र', 'sutra', 'formulae'],
  ['important', 'महत्वपूर्ण', 'zaroori', 'zaruri', 'जरूरी', 'ज़रूरी', 'mahatvapurn'],
  ['exam', 'परीक्षा', 'pariksha', 'एग्ज़ाम', 'एग्जाम'],
  ['example', 'उदाहरण', 'udaharan', 'udaaharan'],
  ['theorem', 'प्रमेय', 'prameya'],
  ['definition', 'परिभाषा', 'paribhasha', 'paribhaasha'],
  ['average', 'औसत', 'ausat'],
  ['sum', 'योग', 'jod', 'जोड़', 'yog'],
  ['product', 'गुणनफल', 'gunanfal', 'gunanphal'],
  ['rule', 'नियम', 'niyam'],
  ['chain', 'श्रृंखला', 'shrinkhala', 'zanjeer'],
  ['expansion', 'विस्तार', 'vistaar', 'vistar'],
  ['partial', 'आंशिक', 'anshik'],
  ['recursion', 'recursive', 'पुनरावृत्ति', 'punaravritti'],
  ['stack', 'स्टैक', 'ढेर', 'dher'],
  ['queue', 'कतार', 'क्यू', 'katar'],
  ['time', 'समय', 'samay'],
]

let conceptIndex: Map<string, Set<number>> | null = null
function buildConceptIndex(): Map<string, Set<number>> {
  const m = new Map<string, Set<number>>()
  GLOSSARY.forEach((forms, id) => {
    for (const f of forms) {
      for (const tok of tokenize(f)) {
        const key = phoneticKey(tok)
        if (!key) continue
        if (!m.has(key)) m.set(key, new Set())
        m.get(key)!.add(id)
      }
    }
  })
  return m
}

/** Concept ids for a token (by exact phonetic key). */
export function conceptsOf(token: string): number[] {
  conceptIndex ??= buildConceptIndex()
  const key = phoneticKey(token)
  const set = conceptIndex.get(key)
  return set ? [...set] : []
}

/** Human-visible equivalents for a token (used to show "also searching for ..."). */
export function equivalentsOf(token: string): string[] {
  const ids = conceptsOf(token)
  const out = new Set<string>()
  for (const id of ids) for (const f of GLOSSARY[id]) if (f.toLowerCase() !== token.toLowerCase()) out.add(f)
  return [...out]
}
