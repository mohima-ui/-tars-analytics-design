import { AlertTriangle, ArrowRight, Sparkles, MessageCircleQuestion, Target } from 'lucide-react'
import { GLOSSARY, KPIS, PERIODS, changePct, fmt } from '../data'
import { useApp } from '../state'
import { Button, Delta, Term, Tip } from '../components/ui'
import { Sparkline } from '../components/charts'

export function KpiRow() {
  const { s, period } = useApp()
  return (
    <div id="summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {KPIS.map((k) => {
        const v = s(k.value)
        const p = s(k.prev)
        const d = changePct(v, p)
        const isOutcome = k.key === 'outcomes'
        return (
          <a
            key={k.key}
            href={k.key === 'impressions' || k.key === 'opens' ? '#funnel' : '#trends'}
            className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-xs transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink-2">
                <Term def={GLOSSARY[k.key]}>{k.label}</Term>
              </span>
              <ArrowRight className="size-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="text-2xl leading-none font-semibold tracking-tight text-ink">{fmt(v)}</div>
              <Sparkline data={k.spark} width={88} height={32} label={`${k.label} by day`} />
            </div>
            <div className="mt-2 flex items-center gap-x-1.5 text-xs whitespace-nowrap text-ink-3">
              <Delta value={d} size="xs" />
              <span>vs {fmt(p)} prev. {PERIODS[period].short}</span>
            </div>
            {k.sub(1) && (
              <div className="mt-4 border-t border-line pt-3 text-xs text-ink-2">
                {isOutcome ? (
                  <span className="flex items-center justify-between gap-2">
                    <span>
                      <b className="font-semibold text-ink">81.8%</b> of conversations
                    </span>
                    <Tip content="You track one goal. Add more goals to see each one here.">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-ink-2">Goal: AI Agent</span>
                    </Tip>
                  </span>
                ) : (
                  <span>
                    <b className="font-semibold text-ink">{k.sub(1).split(' ')[0]}</b> {k.sub(1).split(' ').slice(1).join(' ')}
                  </span>
                )}
              </div>
            )}
            {!k.sub(1) && (
              <div className="mt-4 border-t border-line pt-3 text-xs text-ink-2">
                Shown on <b className="font-semibold text-ink">8</b> pages
              </div>
            )}
          </a>
        )
      })}
    </div>
  )
}

type Insight = {
  tone: 'warning' | 'success' | 'info'
  icon: typeof Sparkles
  title: string
  body: string
  actions: { label: string; onClick?: () => void; href?: string; primary?: boolean }[]
}

export function Insights() {
  const { s, setOpenTopic, toast } = useApp()
  const insights: Insight[] = [
    {
      tone: 'warning',
      icon: AlertTriangle,
      title: 'Launcher impressions fell 72%',
      body: `${fmt(s(514))} vs ${fmt(s(1810))} last period. Conversations fell less (−42%), so the visitors who did see the launcher engaged more.`,
      actions: [{ label: 'See traffic sources', href: '#traffic' }],
    },
    {
      tone: 'info',
      icon: MessageCircleQuestion,
      title: '“Service availability” questions tripled',
      body: `${s(21)} conversations, up from ${s(6)}. 4 in 10 didn’t reach an outcome. Your knowledge base may be missing answers about services and states you cover.`,
      actions: [
        { label: 'Review topic', onClick: () => setOpenTopic('availability'), primary: true },
        { label: 'Open Knowledge', onClick: () => toast('Opens Knowledge → filtered to “Service availability”') },
      ],
    },
    {
      tone: 'success',
      icon: Target,
      title: 'Outcome rate up to 82%',
      body: `${fmt(s(175))} of ${fmt(s(214))} conversations reached your goal, up from 25%. Most of the gain came from the home page (97%).`,
      actions: [{ label: 'View trend', href: '#trends' }],
    },
  ]
  const toneCls = {
    warning: 'bg-warning-50 text-warning-700',
    success: 'bg-success-50 text-success-700',
    info: 'bg-brand-100 text-brand-600',
  }
  return (
    <section aria-labelledby="insights-h" className="rounded-xl border border-line bg-surface shadow-xs">
      <header className="flex flex-wrap items-center justify-between gap-2 px-6 pt-5">
        <h2 id="insights-h" className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="size-4 text-brand-600" />
          <span className="ai-gradient-text">What changed this period</span>
        </h2>
        <span className="text-xs text-ink-3">Generated by TARS from your data · updated daily</span>
      </header>
      <div className="grid gap-px overflow-hidden px-6 pt-4 pb-6 lg:grid-cols-3 lg:gap-4">
        {insights.map((it) => (
          <article key={it.title} className="flex flex-col rounded-lg border border-line p-4 max-lg:mb-3">
            <div className="flex items-start gap-3">
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${toneCls[it.tone]}`}>
                <it.icon className="size-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">{it.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{it.body}</p>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-4 pl-11">
              {it.actions.map((a) =>
                a.href ? (
                  <a key={a.label} href={a.href} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                    {a.label} <ArrowRight className="size-3.5" />
                  </a>
                ) : (
                  <Button key={a.label} size="sm" variant={a.primary ? 'primary' : 'secondary'} onClick={a.onClick}>
                    {a.label}
                  </Button>
                ),
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

