import type { VideoProgress } from '../types'
import { watchedRatio } from '../lib/progress'

export function Ring({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100)
  return (
    <div
      role="img"
      aria-label={label ?? `${pct}% watched`}
      className="relative grid size-12 flex-none place-items-center rounded-full text-xs font-bold"
      style={{ background: `conic-gradient(var(--color-brand-600) ${pct}%, rgb(148 163 184 / .35) 0)` }}
    >
      <span className="absolute inset-[5px] rounded-full bg-white dark:bg-slate-900" />
      <span className="relative">{pct}%</span>
    </div>
  )
}

export function ProgressBar({ p }: { p: VideoProgress | undefined }) {
  const pct = Math.round(watchedRatio(p) * 100)
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Watched">
      <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
      Demo data
    </span>
  )
}
