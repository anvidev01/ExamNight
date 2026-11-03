import { actions, useApp } from '../lib/app'
import { EXAM_BY_ID, SUBJECT_BY_ID, VIDEO_BY_ID, DATA_DISCLAIMER } from '../data/catalog'
import { DemoBadge, ProgressBar, Ring } from '../components/ui'
import { watchedRatio } from '../lib/progress'
import { fmtDuration } from '../lib/format'
import { watchLink } from '../lib/router'

export default function ExamPage({ examId }: { examId: string }) {
  const { data } = useApp()
  const exam = EXAM_BY_ID[examId]
  if (!exam) return <p>Exam not found. <a className="underline" href="#/">Back home</a></p>
  return (
    <div className="grid gap-6">
      <div>
        <a href="#/" className="text-sm underline">&larr; All exams</a>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{exam.name}</h1><DemoBadge />
        </div>
        <p className="mt-1 max-w-2xl muted">{exam.blurb}</p>
        <p className="mt-1 text-xs muted">{DATA_DISCLAIMER}</p>
        {data.examId !== exam.id && <button className="btn-sec mt-2" onClick={() => actions.setExam(exam.id)}>Set as my exam</button>}
      </div>
      {exam.subjects.map((sm) => {
        const subj = SUBJECT_BY_ID[sm.subjectId]
        const vids = sm.units.flatMap((u) => u.videoIds)
        const avg = vids.length ? vids.reduce((n, id) => n + watchedRatio(data.progress[id]), 0) / vids.length : 0
        return (
          <section key={sm.subjectId} className="card" aria-labelledby={`s-${sm.subjectId}`}>
            <div className="flex flex-wrap items-center gap-4">
              <Ring value={avg} label={`${Math.round(avg * 100)}% of ${subj.name} watched`} />
              <div className="flex-1">
                <h2 id={`s-${sm.subjectId}`} className="text-xl font-semibold">{subj.name}</h2>
                <p className="text-sm muted">Playlist: {subj.playlists[0].title} &middot; channel: {subj.playlists[0].channel} (fictional demo)</p>
              </div>
              <a className="btn-sec" href={`#/revise/${sm.subjectId}`}>Revision sheet<span className="sr-only"> for {subj.name}</span></a>
            </div>
            <ol className="mt-4 grid gap-4">
              {sm.units.map((u, i) => (
                <li key={u.title}>
                  <h3 className="font-semibold">{i + 1}. {u.title}</h3>
                  <p className="text-sm muted">{u.topics.join(' · ')}</p>
                  <ul className="mt-2 grid gap-2">
                    {u.videoIds.map((id) => {
                      const v = VIDEO_BY_ID[id]
                      const p = data.progress[id]
                      return (
                        <li key={id}>
                          <a href={watchLink(id)} className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-brand-500 dark:border-slate-700">
                            <span className="flex-1">
                              <span className="block font-medium">{v.title}</span>
                              <span className="block text-xs muted">{fmtDuration(v.durationSec)} &middot; {v.channel}{p?.completed ? ' · completed' : ''}</span>
                              <span className="mt-1 block"><ProgressBar p={p} /></span>
                            </span>
                            <span className="text-sm font-semibold text-brand-700 dark:text-brand-100">{p ? 'Resume' : 'Watch'}</span>
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
