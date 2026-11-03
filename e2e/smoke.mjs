// Headless smoke test using playwright-core + a locally installed Chrome.
// Usage: npm run dev (other terminal) then: BASE_URL=http://localhost:5173 npm run e2e
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const shots = process.env.SHOT_DIR

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error' && !/youtube|ERR_|Failed to load resource/i.test(m.text())) errors.push(m.text()) })
let n = 0
const step = (name) => console.log(`ok ${++n} - ${name}`)
const shot = async (name) => { if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true }) }

await page.goto(BASE)
await page.getByRole('heading', { name: 'Who is studying tonight?' }).waitFor()
step('profile gate shown on first visit')

await page.getByLabel('Add a student').fill('Asha')
await page.getByRole('button', { name: 'Start' }).click()
await page.getByRole('heading', { name: /Revise smarter/ }).waitFor()
step('create profile Asha')
await shot('home')

await page.getByRole('link', { name: /Open syllabus for GATE/ }).click()
await page.getByRole('heading', { name: 'GATE CS/IT' }).waitFor()
step('exam syllabus page')
await shot('exam')

await page.getByRole('link', { name: /Quick sort vs merge sort/ }).click()
await page.getByTestId('clock-player').waitFor({ timeout: 20000 })
step('video page falls back to transcript-clock player (sample YouTube ID)')

await page.getByTestId('play-btn').click()
await page.waitForTimeout(3500)
await page.getByTestId('play-btn').click() // pause
const txt = await page.getByTestId('progress-text').textContent()
assert.match(txt, /Watched [1-9]\d*%/, txt)
step('progress tracked: ' + txt.trim())

// cross-script search
await page.getByLabel('Search captions').fill('worst case')
await page.getByTestId('hits').locator('button').first().waitFor()
assert.match(await page.getByTestId('hits').locator('button').first().textContent(), /3:55/)
step('English search finds 3:55')
await page.getByTestId('hits').locator('button').first().click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'All demo videos' }).click()
await page.getByLabel('Search captions').fill('गतिरोध')
await page.getByTestId('hits').locator('button').first().waitFor()
assert.match(await page.getByTestId('hits').textContent(), /Deadlock/)
step('Devanagari search finds deadlock video')
await page.getByLabel('Search captions').fill('avkalan')
await page.getByTestId('hits').locator('button').first().waitFor()
assert.match(await page.getByTestId('hits').textContent(), /Differentiation/)
step('Hinglish search "avkalan" finds differentiation video')
await shot('search')
await page.getByTestId('hits').locator('button').first().click()
await page.getByRole('heading', { name: /Differentiation/ }).waitFor()
step('clicking cross-video hit navigates and seeks')

// bookmark
await page.getByTestId('add-bm').click()
await page.getByLabel('Note (optional)').fill('remember chain rule')
await page.getByRole('button', { name: 'Save bookmark' }).click()
await page.getByTestId('bm-list').getByText('remember chain rule').waitFor()
step('bookmark added with note')

// resume after reload
await page.getByTestId('play-btn').click(); await page.waitForTimeout(2500); await page.getByTestId('play-btn').click()
await page.goto(BASE + '/#/'); await page.reload()
await page.getByRole('link', { name: /Resume at/ }).waitFor()
step('home shows Continue/Resume after reload (profile + progress persisted)')

// revise & export
await page.getByRole('link', { name: 'Revise' }).click()
await page.getByTestId('heuristic-note').waitFor()
assert.match(await page.getByTestId('heuristic-note').textContent(), /not by an LLM/)
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download Markdown' }).click()])
assert.match(dl.suggestedFilename(), /\.md$/)
step('revision summary + Markdown download: ' + dl.suggestedFilename())
await shot('revise')

// profile isolation
await page.getByTestId('profile-menu-btn').click()
await page.getByRole('menuitem', { name: /Switch \/ add student/ }).click()
await page.getByLabel('Add a student').fill('Ben')
await page.getByRole('button', { name: 'Start' }).click()
await page.getByRole('link', { name: 'Bookmarks' }).click()
await page.getByText(/No bookmarks yet/).waitFor()
step('second profile sees no bookmarks (isolation)')
await page.getByTestId('profile-menu-btn').click()
await page.getByRole('menuitem', { name: 'Asha' }).click()
await page.getByRole('link', { name: 'Bookmarks' }).click()
await page.getByText('remember chain rule').waitFor()
step('switching back restores Asha bookmarks')

// clear my data
page.once('dialog', (d) => d.accept())
await page.getByTestId('profile-menu-btn').click()
await page.getByRole('menuitem', { name: 'Clear my data' }).click()
await page.getByText(/No bookmarks yet/).waitFor()
step('Clear my data empties bookmarks')

// guest + low data + dark
await page.getByTestId('profile-menu-btn').click()
await page.getByRole('menuitem', { name: /Switch \/ add student/ }).click()
await page.getByRole('button', { name: 'Continue as guest' }).click()
await page.getByRole('heading', { name: /Revise smarter/ }).waitFor()
const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes(':data:')))
step('guest session started (profile data keys in storage: ' + keys.length + ')')
await page.getByRole('button', { name: 'Low data' }).click()
await page.goto(BASE + '/#/watch/os-paging')
await page.getByTestId('clock-player').waitFor()
assert.match(await page.getByTestId('player-note').textContent(), /Low-data/)
assert.equal(await page.locator('script[src*="youtube.com"]').count(), 0)
step('low-data mode: no YouTube script injected, transcript player by default')
await page.getByRole('button', { name: /^Theme/ }).click()
await page.getByRole('button', { name: /^Theme/ }).click()
const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
step('theme toggle cycles (dark class now ' + dark + ')')
await shot('watch-lowdata')

assert.deepEqual(errors, [], 'console/page errors: ' + errors.join('\n'))
step('no console errors')
await browser.close()
console.log('SMOKE PASSED')
