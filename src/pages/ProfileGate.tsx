import { useState } from 'react'
import { actions, useApp } from '../lib/app'

export default function ProfileGate() {
  const app = useApp()
  const [name, setName] = useState('')
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">Who is studying tonight?</h1>
      <p className="mt-2 muted">
        Each student gets separate progress and bookmarks on this device. Everything stays in this browser: no account, no server.
      </p>
      {app.profiles.length > 0 && (
        <ul className="mt-6 grid gap-3" aria-label="Existing students">
          {app.profiles.map((p) => (
            <li key={p.id}>
              <button className="card flex min-h-14 w-full items-center gap-3 text-left hover:border-brand-500" onClick={() => actions.switchProfile(p.id)}>
                <span aria-hidden="true" className="grid size-10 place-items-center rounded-full text-lg font-bold text-white" style={{ background: p.color }}>{p.name.slice(0, 1).toUpperCase()}</span>
                <span className="text-lg font-semibold">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="card mt-6" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { actions.createProfile(name); setName('') } }}>
        <label htmlFor="newname" className="font-semibold">Add a student</label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input id="newname" className="field flex-1" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="First name or nickname" autoComplete="off" />
          <button className="btn" type="submit" disabled={!name.trim()}>Start</button>
        </div>
      </form>
      <div className="mt-4">
        <button className="btn-sec" onClick={() => actions.startGuest()}>Continue as guest</button>
        <p className="mt-2 text-sm muted">Guest sessions are kept in memory only and are discarded when you end the session or close the tab. Best on a friend&apos;s or lab computer.</p>
      </div>
    </div>
  )
}
