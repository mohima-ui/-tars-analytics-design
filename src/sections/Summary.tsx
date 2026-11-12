import { ArrowRight, Lightbulb, TrendingUp, Sparkles, MessageCircleQuestion, Target } from 'lucide-react'
import { GLOSSARY, KPIS, PERIODS, changePct, fmt } from '../data'
import { useApp } from '../state'
import { Delta, Term, Tip } from '../components/ui'
import { Sparkline } from '../components/charts'

export function KpiRow() {
  const { s, period } = useApp()
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              <Tip content={`Before: ${PERIODS[period].compare}`}><span>was {fmt(p)} before</span></Tip>
            </div>
            {k.sub(1) && (
              <div className="mt-4 border-t border-line pt-3 text-xs text-ink-2">
                {isOutcome ? (
                  <span>
                    <b className="font-semibold text-ink">82%</b> reached a goal
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
      tone: 'success',
      icon: TrendingUp,
      title: 'Your launcher reached more people',
      body: `It was shown ${fmt(s(514))} times, up 14% from ${fmt(s(452))}. More people opened it too: ${fmt(s(385))}, up from ${fmt(s(355))}.`,
      actions: [{ label: 'See where they came from', href: '#traffic' }],
    },
    {
      tone: 'info',
      icon: MessageCircleQuestion,
      title: 'More questions about service availability',
      body: `${s(21)} conversations, up from ${s(6)}. 2 in 10 questions didn’t get an answer. Add answers about the services and states you cover.`,
      actions: [
        { label: 'Review topic', onClick: () => setOpenTopic('availability'), primary: true },
        { label: 'Open Knowledge', onClick: () => toast('Opens Knowledge → filtered to “Service availability”') },
      ],
    },
    {
      tone: 'success',
      icon: Target,
      title: 'More conversations reach your goal',
      body: `${fmt(s(175))} of ${fmt(s(214))} conversations reached your goal (82%). Last period it was 25%.`,
      actions: [{ label: 'View trend', href: '#trends' }],
    },
  ]
  return (
    <section aria-labelledby="insights-h" className="flex flex-col gap-3.5 rounded-xl border border-line bg-surface px-6 py-5 shadow-xs">
      <div className="flex items-center gap-2">
        <Lightbulb className="size-[18px] text-brand-600" aria-hidden />
        <h2 id="insights-h" className="text-base font-semibold text-ink">Key insights</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {insights.map((it) => {
          const a = it.actions[0]
          return (
            <article key={it.title} className="flex flex-col gap-2 rounded-lg bg-brand-50 px-4 py-3.5">
              <h3 className="text-sm leading-[1.45] font-medium text-ink">{it.title}</h3>
              <p className="text-sm leading-[1.45] text-ink-2">{it.body}</p>
              {a &&
                (a.href ? (
                  <a href={a.href} className="mt-auto inline-flex items-center gap-1 self-start text-sm font-medium text-brand-600 hover:underline">
                    {a.label} <ArrowRight className="size-3.5" />
                  </a>
                ) : (
                  <button onClick={a.onClick} className="mt-auto inline-flex items-center gap-1 self-start text-sm font-medium text-brand-600 hover:underline">
                    {a.label} <ArrowRight className="size-3.5" />
                  </button>
                ))}
            </article>
          )
        })}
      </div>
    </section>
  )
}

