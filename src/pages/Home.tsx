import { actions, useApp } from '../lib/app'
import { EXAMS, VIDEO_BY_ID, DATA_DISCLAIMER } from '../data/catalog'
import { DemoBadge, ProgressBar } from '../components/ui'
import { fmtTime } from '../lib/format'
import { watchLink } from '../lib/router'

export default function Home() {
  const app = useApp()
  const { data } = app
  const last = data.lastVideoId ? VIDEO_BY_ID[data.lastVideoId] : undefined
  const lastP = last ? data.progress[last.id] : undefined
  return (
    <div className="grid gap-8">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">Revise smarter, the night before.</h1>
          <DemoBadge />
        </div>
        <p className="mt-2 max-w-2xl muted">
          Pick your exam, watch the mapped playlist, search captions in English, Hindi or Hinglish, bookmark what matters, then get a printable
          last-minute sheet. {DATA_DISCLAIMER}
        </p>
      </section>

      {last && (
        <section aria-labelledby="cont" className="card">
          <h2 id="cont" className="text-lg font-semibold">Continue where you left off</h2>
          <p className="mt-1">{last.title}</p>
          <div className="mt-2 max-w-md"><ProgressBar p={lastP} /></div>
          <a className="btn mt-3" href={watchLink(last.id, lastP && lastP.position < last.durationSec * 0.95 ? lastP.position : 0)}>
            Resume at {fmtTime(lastP?.position ?? 0)}
          </a>
        </section>
      )}

      <section aria-labelledby="exams">
        <h2 id="exams" className="text-xl font-semibold">Choose your exam</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMS.map((e) => (
            <li key={e.id} className="card flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{e.name}</h3>
                {data.examId === e.id && <span className="rounded-full bg-brand-100 px-2 text-xs font-semibold text-brand-700">Selected</span>}
              </div>
              <p className="mt-1 flex-1 text-sm muted">{e.blurb}</p>
              <p className="mt-2 text-xs muted">{e.subjects.length} subject(s) &middot; {e.kind === 'competitive' ? 'Competitive' : 'University'}</p>
              <a className="btn mt-3 self-start" href={`#/exam/${e.id}`} onClick={() => actions.setExam(e.id)}>
                Open syllabus<span className="sr-only"> for {e.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
