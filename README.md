# Exam Night

A last-minute revision companion for Indian engineering students (GATE, university semester exams). Frontend-only:
React + TypeScript + Tailwind CSS v4 + Vite, tests with Vitest. No backend, no API keys, no LLM.

> **Demo data notice.** Exams, syllabus mappings, playlists, channel names, video IDs and captions are curated samples
> written for this demo. Video IDs are placeholders (the YouTube embed will normally report the video unavailable) and
> captions are not real transcripts. Not affiliated with YouTube or any exam body. The concept builds on the earlier
> "Revision Mode" prototype; no user research or metrics are claimed.

## Features
- **Exam and subject selection** with syllabus-mapped playlists (GATE CS/IT, B.Tech sem 1-2, B.Tech CSE sem 3-4; Maths, DSA, OS).
- **Video player**: YouTube IFrame API loaded on demand, with a graceful fallback to a *transcript-clock player* (simulated timeline showing captions) when offline, blocked, errored, or in low-data mode. Progress tracking (watched 10-second buckets) and resume where you left off.
- **Searchable captions in English, Hindi (Devanagari) and Hinglish.** `derivative`, `अवकलन` and `avkalan` find the same cue. Click a result to seek (cross-video results navigate).
- **Bookmarks** with label and note, edit/delete, jump, markers on the seek bar, and a global bookmarks page.
- **Revision summaries** (10/30/60 minute budgets): deterministic extractive summary from captions + bookmarks. *Heuristic, not an LLM.*
- **Exports**: Markdown, printable HTML, PDF via the browser print dialog.
- **Low-data mode**: no YouTube script or iframe until you tap load, animations off, text first.
- **Shared devices**: multiple local student profiles with separate progress/bookmarks, quick switch, "Clear my data", delete profile, erase device, in-memory guest mode.
- **Accessibility**: keyboard shortcuts (k, j, l, b), skip link, visible focus, ARIA roles/live regions, 44px targets, dark mode, reduced-motion respected.

## Setup
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run test       # unit tests (Vitest)
npm run typecheck
npm run e2e        # headless smoke test; needs `npm run dev` running and Google Chrome (env CHROME_PATH to override)
```

## Architecture
```
src/
  data/       catalog.ts (exams, subjects, playlists, videos), captions.ts (sample cues, en/hi/hl)
  lib/        translit.ts  Devanagari->roman, phonetic skeleton keys, glossary
              search.ts    caption index + AND search + highlight ranges
              summarize.ts extractive summariser; export.ts Markdown/HTML/print
              store.ts     external store + profile isolation; storage.ts; progress.ts; router.ts
  player/     youtube.ts (API loader), PlayerPanel.tsx (YouTube + transcript-clock behind one handle)
  components/ pages/      UI
tests/        unit tests;  e2e/smoke.mjs  Playwright smoke test
```
**Cross-script search.** Every word is reduced to a phonetic consonant skeleton (Devanagari is romanised first; aspirates, sibilants,
w/v, doubled letters merged; vowels dropped), so Hindi and Hinglish spellings agree. A small hand-written glossary links concepts across
languages where words are not transliterations (derivative = अवकलन). Matching is exact > phonetic > concept > prefix > one-edit fuzzy; all query tokens must match.

**Storage.** `localStorage` keys: `examnight:v1:root` (profiles), `examnight:v1:data:<id>` (per-profile data), `examnight:v1:device` (theme, low-data). Guest data is memory only.

## Limitations
- Demo content only; real-video embedding is untested with real IDs.
- Small glossary; phonetic keys can collide or miss some spellings.
- Heuristic summaries can mis-rank lines. PDF export relies on the browser print dialog.
- localStorage only: no sync, no encryption, no profile PIN. Clearing browser data erases everything.

## Screenshots
None are bundled. To add your own, run `npm run dev` and `SHOT_DIR=docs/shots npm run e2e` (saves real screenshots of home, exam, search, revise and low-data pages), then reference them here.
