import { useState } from 'react'
import { actions, useApp } from '../lib/app'
import { DATA_DISCLAIMER } from '../data/catalog'

export default function SettingsPage() {
  const app = useApp()
  const [rename, setRename] = useState<Record<string, string>>({})
  return (
    <div className="grid max-w-3xl gap-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      {!app.persistOk && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">Browser storage is full or blocked: progress will not survive a reload.</p>}

      <section className="card" aria-labelledby="ld">
        <h2 id="ld" className="text-lg font-semibold">Low-data mode</h2>
        <p className="mt-1 text-sm muted">Text first: the YouTube player script and video are not loaded until you tap &quot;Load YouTube video&quot;, animations are off, and the transcript-clock player is the default. Stored per device.</p>
        <button className="chip mt-3" aria-pressed={app.device.lowData} onClick={() => actions.setLowData(!app.device.lowData)}>{app.device.lowData ? 'On' : 'Off'}</button>
      </section>

      <section className="card" aria-labelledby="th">
        <h2 id="th" className="text-lg font-semibold">Theme</h2>
        <div className="mt-2 flex gap-2" role="group" aria-label="Theme">
          {(['system', 'light', 'dark'] as const).map((t) => <button key={t} className="chip capitalize" aria-pressed={app.device.theme === t} onClick={() => actions.setTheme(t)}>{t}</button>)}
        </div>
      </section>

      <section className="card" aria-labelledby="pr">
        <h2 id="pr" className="text-lg font-semibold">Students on this device</h2>
        <p className="mt-1 text-sm muted">Progress and bookmarks are stored separately per student, in this browser only.</p>
        {app.guest && <p className="mt-2 text-sm">You are in a guest session: nothing is saved.</p>}
        <ul className="mt-3 grid gap-3">
          {app.profiles.map((p) => (
            <li key={p.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full font-bold text-white" style={{ background: p.color }}>{p.name[0].toUpperCase()}</span>
                <label className="sr-only" htmlFor={`rn-${p.id}`}>Name</label>
                <input id={`rn-${p.id}`} className="field !w-40" value={rename[p.id] ?? p.name} maxLength={24} onChange={(e) => setRename({ ...rename, [p.id]: e.target.value })} onBlur={() => rename[p.id] && actions.renameProfile(p.id, rename[p.id])} />
                {p.id === app.activeProfileId && <span className="text-xs muted">current</span>}
                <span className="flex-1" />
                <button className="btn-sec" onClick={() => confirm(`Clear progress and bookmarks for ${p.name}?`) && actions.clearProfileData(p.id)}>Clear data</button>
                <button className="btn-danger" onClick={() => confirm(`Delete ${p.name} and all their data?`) && actions.deleteProfile(p.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
        <button className="btn-danger mt-4" onClick={() => { if (confirm('Erase ALL Exam Night data on this browser (every student and settings)?')) { actions.wipeDevice() } }}>Erase everything on this device</button>
      </section>

      <section className="card" aria-labelledby="ab">
        <h2 id="ab" className="text-lg font-semibold">About this demo</h2>
        <p className="mt-1 text-sm">{DATA_DISCLAIMER}</p>
        <p className="mt-2 text-sm muted">Summaries are heuristic extractive text selection, not an LLM. No account, analytics or server: all data stays in your browser&apos;s localStorage.</p>
      </section>
    </div>
  )
}
