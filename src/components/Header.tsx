import { useEffect, useRef, useState } from 'react'
import { actions, useApp } from '../lib/app'
import { navigate, useRoute } from '../lib/router'

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <span aria-hidden="true" className="grid size-8 place-items-center rounded-full text-sm font-bold text-white" style={{ background: color }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function ProfileMenu() {
  const app = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = app.profiles.find((p) => p.id === app.activeProfileId)
  const label = app.guest ? 'Guest' : active?.name ?? 'Profile'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDoc)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDoc) }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button className="btn-sec" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="profile-menu-btn">
        <Avatar name={label} color={active?.color ?? '#64748b'} />
        <span className="max-w-24 truncate">{label}</span>
      </button>
      {open && (
        <div role="menu" aria-label="Profiles" className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <p className="px-3 py-1 text-xs muted">Switch student</p>
          {app.profiles.map((p) => (
            <button key={p.id} role="menuitem" className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { actions.switchProfile(p.id); setOpen(false); navigate('/') }}>
              <Avatar name={p.name} color={p.color} />
              <span className="flex-1 truncate">{p.name}</span>
              {p.id === app.activeProfileId && <span className="text-xs muted">current</span>}
            </button>
          ))}
          <hr className="my-2 border-slate-200 dark:border-slate-700" />
          <button role="menuitem" className="flex min-h-11 w-full items-center rounded-xl px-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { actions.signOut(); setOpen(false); navigate('/') }}>
            {app.guest ? 'End guest session (data discarded)' : 'Switch / add student'}
          </button>
          {active && (
            <button role="menuitem" className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950" onClick={() => {
              if (confirm(`Clear all progress and bookmarks for ${active.name}? The profile stays.`)) actions.clearProfileData(active.id)
              setOpen(false)
            }}>
              Clear my data
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const app = useApp()
  const route = useRoute()
  const hasSession = app.guest || app.activeProfileId !== null
  const first = route.path[0] ?? ''
  const link = (to: string, text: string, match: string[]) => (
    <a href={`#${to}`} aria-current={match.includes(first) ? 'page' : undefined} className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium hover:bg-slate-100 aria-[current=page]:bg-brand-100 aria-[current=page]:text-brand-700 dark:hover:bg-slate-800 dark:aria-[current=page]:bg-brand-700/30 dark:aria-[current=page]:text-brand-100">
      {text}
    </a>
  )
  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2">
        <a href="#/" className="mr-2 flex min-h-11 items-center gap-2 text-lg font-bold">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">🌙</span>
          Exam Night
        </a>
        {hasSession && (
          <nav aria-label="Primary" className="flex flex-wrap items-center gap-1">
            {link('/', 'Home', ['', 'exam'])}
            {link('/revise', 'Revise', ['revise'])}
            {link('/bookmarks', 'Bookmarks', ['bookmarks'])}
            {link('/settings', 'Settings', ['settings'])}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button className="chip" aria-pressed={app.device.lowData} onClick={() => actions.setLowData(!app.device.lowData)} title="Low-data mode: text first, no video loads until you ask">
            Low data
          </button>
          <button
            className="btn-sec"
            aria-label={`Theme: ${app.device.theme}. Switch theme`}
            onClick={() => actions.setTheme(app.device.theme === 'system' ? 'dark' : app.device.theme === 'dark' ? 'light' : 'system')}
          >
            {app.device.theme === 'dark' ? 'Dark' : app.device.theme === 'light' ? 'Light' : 'Auto'}
          </button>
          {hasSession && <ProfileMenu />}
        </div>
      </div>
    </header>
  )
}
