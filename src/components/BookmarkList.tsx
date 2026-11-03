import { useState } from 'react'
import { BOOKMARK_LABELS, type Bookmark } from '../types'
import { actions } from '../lib/app'
import { fmtTime } from '../lib/format'

export function BookmarkRow({ b, onJump, title }: { b: Bookmark; onJump: (b: Bookmark) => void; title?: string }) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(b.note)
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-sec !px-3" onClick={() => onJump(b)} aria-label={`Jump to ${fmtTime(b.t)}${title ? ' in ' + title : ''}`}>
          {fmtTime(b.t)}
        </button>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">{b.label}</span>
        {title && <span className="text-sm font-medium">{title}</span>}
        <span className="flex-1" />
        <button className="btn-sec !px-3" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>{editing ? 'Cancel' : 'Edit'}</button>
        <button className="btn-danger !px-3" onClick={() => actions.removeBookmark(b.id)} aria-label={`Delete bookmark at ${fmtTime(b.t)}`}>Delete</button>
      </div>
      {editing ? (
        <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); actions.updateBookmark(b.id, { note }); setEditing(false) }}>
          <label className="sr-only" htmlFor={`n-${b.id}`}>Note</label>
          <input id={`n-${b.id}`} className="field flex-1" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} />
          <select aria-label="Label" className="field !w-auto" defaultValue={b.label} onChange={(e) => actions.updateBookmark(b.id, { label: e.target.value as Bookmark['label'] })}>
            {BOOKMARK_LABELS.map((l) => <option key={l}>{l}</option>)}
          </select>
          <button className="btn" type="submit">Save</button>
        </form>
      ) : (
        <p className="mt-1 text-sm">{b.note || <span className="muted">(no note)</span>}</p>
      )}
    </li>
  )
}
