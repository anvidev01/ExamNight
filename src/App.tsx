import { useEffect, useRef } from 'react'
import { useApp } from './lib/app'
import { useRoute } from './lib/router'
import Header from './components/Header'
import ProfileGate from './pages/ProfileGate'
import Home from './pages/Home'
import ExamPage from './pages/ExamPage'
import Watch from './pages/Watch'
import Revise from './pages/Revise'
import BookmarksPage from './pages/BookmarksPage'
import SettingsPage from './pages/SettingsPage'
import { DATA_DISCLAIMER } from './data/catalog'

export default function App() {
  const app = useApp()
  const route = useRoute()
  const mainRef = useRef<HTMLElement>(null)
  const dark =
    app.device.theme === 'dark' ||
    (app.device.theme === 'system' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.classList.toggle('low-data', app.device.lowData)
  }, [dark, app.device.lowData])

  // move focus to main content on navigation (screen readers / keyboard)
  const key = route.path.join('/')
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [key])

  const hasSession = app.guest || app.activeProfileId !== null

  let page
  if (!hasSession) page = <ProfileGate />
  else {
    const [a, b] = route.path
    if (a === 'exam' && b) page = <ExamPage examId={b} />
    else if (a === 'watch' && b) page = <Watch key={b} videoId={b} startAt={Number(route.query.get('t')) || undefined} />
    else if (a === 'revise') page = <Revise subjectId={b} />
    else if (a === 'bookmarks') page = <BookmarksPage />
    else if (a === 'settings') page = <SettingsPage />
    else page = <Home />
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus() }} className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-slate-900">
        Skip to content
      </a>
      <Header />
      <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none">
        {page}
      </main>
      <footer className="no-print border-t border-slate-200 px-4 py-4 text-center text-xs muted dark:border-slate-800">
        {DATA_DISCLAIMER} Not affiliated with YouTube or any exam body.
      </footer>
    </div>
  )
}
