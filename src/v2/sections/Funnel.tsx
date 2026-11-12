import { useState } from 'react'
import { ArrowDown, Waypoints } from 'lucide-react'
import { ENTRY_CHOICES, FUNNEL, GLOSSARY, fmt, pct } from '../data'
import { useApp } from '../state'
import { Button, Card, Term, Tip } from '../components/ui'

const DEFS: Record<string, string> = {
  impressions: GLOSSARY.impressions,
  opens: GLOSSARY.opens,
  conversations: GLOSSARY.conversations,
  outcomes: GLOSSARY.outcomes,
}

export function FunnelSection() {
  const { s } = useApp()
  const [showPaths, setShowPaths] = useState(false)
  const steps = FUNNEL.map((f) => ({ ...f, v: s(f.value) }))
  const top = steps[0].v || 1
  const worst = steps.slice(1).reduce(
    (w, st, i) => {
      const rate = steps[i].v ? st.v / steps[i].v : 1
      return rate < w.rate ? { i: i + 1, rate } : w
    },
    { i: 1, rate: 2 },
  )

  return (
    <Card
      id="funnel"
      title="From visit to outcome"
      description="Where visitors drop off on the way to your goal."
      actions={
        <Button size="sm" variant="ghost" onClick={() => setShowPaths((v) => !v)} aria-expanded={showPaths}>
          <Waypoints className="size-4" /> {showPaths ? 'Hide' : 'Show'} first choices
        </Button>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <ol className="space-y-0">
          {steps.map((st, i) => {
            const prev = steps[i - 1]
            const rate = prev && prev.v ? st.v / prev.v : null
            const lost = prev ? prev.v - st.v : 0
            const isWorst = i === worst.i
            return (
              <li key={st.key}>
                {prev && (
                  <div className="flex items-center gap-3 py-1.5 pl-[168px] max-sm:pl-0">
                    <ArrowDown className="size-3.5 text-ink-3" aria-hidden />
                    <span className={isWorst ? 'text-xs font-medium text-danger-700' : 'text-xs text-ink-3'}>
                      <b className="font-semibold tnum">{rate !== null ? pct(rate, 1) : '—'}</b> continued
                      <span className="mx-1.5 text-n-300">·</span>
                      <span className="tnum">{fmt(lost)}</span> dropped off
                      {isWorst && <span className="ml-2 rounded bg-danger-50 px-1.5 py-0.5 text-2xs">Biggest drop</span>}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-1.5">
                  <div className="w-[152px] shrink-0 text-sm font-medium text-ink">
                    <Term def={DEFS[st.key]}>{st.label}</Term>
                  </div>
                  <div className="relative h-6 flex-1 rounded-md bg-brand-50">
                    <Tip content={`${fmt(st.v)} · ${pct(st.v / top, 1)} of launcher impressions`}>
                      <div
                        tabIndex={0}
                        className="h-full rounded-md bg-brand-600 transition-[width] duration-500"
                        style={{ width: `${(st.v / top) * 100}%`, opacity: 1 - i * 0.12 }}
                      />
                    </Tip>
                  </div>
                  <div className="w-28 shrink-0 text-right max-sm:text-left">
                    <div className="text-base font-semibold text-ink tnum">{fmt(st.v)}</div>
                    <div className="text-xs text-ink-3 tnum">{pct(st.v / top, 1)} of shown</div>
                  </div>
                </div>
                {st.note && (
                  <div className="mt-1 pl-[168px] text-xs text-ink-3 max-sm:pl-0">
                    {st.note.replace('14', String(s(14)))}
                  </div>
                )}
              </li>
            )
          })}
        </ol>

        {showPaths && (
          <aside className="anim-fade w-full rounded-lg border border-line p-4 lg:w-80">
            <h4 className="text-sm font-semibold text-ink">First choice in the chat</h4>
            <p className="mt-0.5 text-xs text-ink-3">
              From the “{ENTRY_CHOICES.field}” question · {s(ENTRY_CHOICES.total)} visitors
            </p>
            <ul className="mt-4 space-y-3">
              {ENTRY_CHOICES.choices.map((c) => (
                <li key={c.label}>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate text-ink-2">{c.label}</span>
                    <span className="font-medium text-ink tnum">{s(c.value)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-brand-50">
                    <div className="h-full rounded-full bg-brand-400" style={{ width: `${(c.value / 13) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-md bg-warning-50 p-2.5 text-xs text-warning-700">
              Only {s(ENTRY_CHOICES.reached)} of {s(ENTRY_CHOICES.total)} ({pct(ENTRY_CHOICES.reached / ENTRY_CHOICES.total)}) who used this button reached
              an outcome, vs 82% overall.
            </p>
          </aside>
        )}
      </div>
    </Card>
  )
}
