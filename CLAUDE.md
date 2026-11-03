# Exam Night - CLAUDE.md (living document; read before each batch of changes)

## Purpose
Frontend-only web app for Indian engineering students revising for exams (GATE, university semester exams).
Pick exam -> subject -> syllabus-mapped playlist -> watch with resume -> search captions (English / Hindi /
Hinglish) -> bookmark timestamps -> auto-generated heuristic revision summary -> export (Markdown / print / PDF-via-print).
No backend, no API keys, no LLM. Built from the ideas in `/Users/anvisingh/Documents/Resumes/youtube-ux/prototype/index.html` ("Revision Mode" concept; never modify it).

## Tech stack
React 19 + TypeScript + Vite + Tailwind CSS v4 (`@tailwindcss/vite`) + Vitest (jsdom). Hash router (hand-written).
State: tiny external store (`src/lib/store.ts`) + `useSyncExternalStore`; persistence in localStorage.

## Folder structure (target)
- `src/types.ts` shared types
- `src/data/catalog.ts` DEMO exams / subjects / playlists / videos; `src/data/captions.ts` sample cues
- `src/lib/translit.ts` Devanagari->roman, phonetic skeleton key, glossary concepts
- `src/lib/search.ts` caption index + search; `src/lib/summarize.ts` extractive summariser
- `src/lib/export.ts` Markdown / printable HTML; `src/lib/store.ts` app store; `src/lib/storage.ts` storage helpers
- `src/lib/progress.ts` watched-bucket maths; `src/lib/format.ts`
- `src/player/` YouTube IFrame player + transcript-clock fallback player behind one interface
- `src/components/`, `src/pages/`; `e2e/smoke.mjs` headless smoke test; `tests/` unit tests

## Key decisions
- All catalog data is DEMO. Video IDs are sample strings, captions are hand-written samples; the YouTube
  embed will normally report "unavailable" so the transcript-clock player (simulated timeline) is the working path.
- Cross-script search: phonetic consonant-skeleton keys + small English/Hindi/Hinglish glossary of concept ids.
- Progress = set of watched 10s buckets (robust to seeking), completed at >=90%.
- Profiles: root key `examnight:v1:root`, per-profile `examnight:v1:data:<id>`; guest data lives in memory only.
- Device settings (theme, low-data) are per device, key `examnight:v1:device`.
- Summaries are heuristic extractive (term frequency + exam-cue phrases + bookmark proximity). Not an LLM; UI says so.

## Implemented features (all verified by unit tests and/or the Playwright smoke test)
- Profile gate (named profiles, guest), header profile switcher, "Clear my data", delete profile, erase device.
- Exams -> syllabus units -> videos (demo catalog, labelled), per-subject progress rings, Continue/Resume card.
- Watch page: YouTube IFrame API player (loaded on demand) with automatic fallback to a transcript-clock player
  (simulated timeline) when offline / blocked / error / low-data. Seek bar, +-10s, speed (clock), keyboard k/j/l/b.
- Progress: watched 10s buckets, resume position, completed at 90%.
- Caption search across EN / Devanagari / Hinglish with glossary concepts, scopes (video / exam / all), highlights, click-to-seek (cross-video navigates).
- Bookmarks with label + note, edit, delete, jump, markers on the seek bar, global Bookmarks page with filter.
- Revision sheet: heuristic extractive summary, 10/30/60 min budgets, language, scope; export Markdown, printable HTML, Print / Save as PDF.
- Low-data mode (no YT script/iframe until asked, animations off), dark mode (system/light/dark), skip link, focus rings, 44px targets, ARIA.

## Data contracts
See `src/types.ts`. Cue = `{ s: seconds, en, hi, hl }`. Storage keys: `examnight:v1:root` {profiles, activeProfileId},
`examnight:v1:data:<profileId>` ProfileData, `examnight:v1:device` {theme, lowData}.
Store API: `createStore(storage)` -> `{getState, subscribe, actions}` (see `src/lib/store.ts`).

## Setup
`npm install`, `npm run dev`, `npm run build` (tsc + vite), `npm run test`, `npm run typecheck`,
`npm run e2e` (needs dev server on :5173 and Google Chrome; env BASE_URL, CHROME_PATH, SHOT_DIR).

## Known issues / limitations
- All content is demo; sample YouTube IDs do not resolve, so the real iframe path is unverified against a real video.
- Glossary is small and hand-written; Hindi/Hinglish matching beyond it relies on phonetic skeleton keys (can collide/miss, e.g. anusvara before labials).
- Summaries are heuristic; PDF is via browser print dialog (no PDF library). Pop-up blockers can block print window.
- Storage is localStorage only (no IndexedDB, no cross-device sync, no encryption; profiles are not PIN-protected).
- No automated component/a11y audit tooling run (only manual checks + Playwright smoke).

## Pending / ideas
- Real-video verification with real IDs, IndexedDB for large data, PIN for profiles, more content, axe-core audit.

## Status log
- Core libs + tests done; UI done; build, typecheck, 30 unit tests and 19-step smoke test pass.
