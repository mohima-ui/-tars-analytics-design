import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Bot, Clock, Megaphone, Star, Table2, BarChart3, UserRound, ShieldCheck } from 'lucide-react'
import { DAYS, FIELDS, GLOSSARY, HEAT, MONTHS, REPLY, SOURCES, WEEKS, fmt, pct, changePct, type SourceRow } from '../data'
import { useApp } from '../state'
import { Badge, Button, Card, clsx, Delta, Meter, Segmented, Term, Tip } from '../components/ui'
import { ColumnChart, Heatmap, Legend, Sparkline } from '../components/charts'

/* ---------------- Trends ---------------- */
export function TrendsSection() {
  const [grain, setGrain] = useState<'week' | 'month'>('week')
  const [metric, setMetric] = useState<'conv' | 'imp'>('conv')
  const [table, setTable] = useState(false)
  const data = grain === 'week' ? WEEKS : MONTHS
  const series =
    metric === 'conv'
      ? [
          { key: 'conversations' as const, label: 'Conversations', color: 'var(--color-viz-1)' },
          { key: 'outcomes' as const, label: 'Outcomes', color: 'var(--color-viz-2)' },
        ]
      : [{ key: 'impressions' as const, label: 'Launcher impressions', color: 'var(--color-viz-1)' }]

  return (
    <Card
      id="trends"
      title="Trends over time"
      description={grain === 'week' ? 'Weekly totals for weeks that overlap the selected period.' : 'Monthly totals for the last 4 months.'}
      actions={
        <>
          <Segmented size="sm" label="Metric" value={metric} onChange={setMetric} options={[{ value: 'conv', label: 'Conversations & outcomes' }, { value: 'imp', label: 'Launcher impressions' }]} />
          <Segmented size="sm" label="Group by" value={grain} onChange={setGrain} options={[{ value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]} />
          <Tip content={table ? 'Show chart' : 'Show as table'}>
            <Button size="sm" variant="ghost" className="size-8 px-0" onClick={() => setTable((t) => !t)} aria-label={table ? 'Show chart' : 'Show as table'}>
              {table ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
            </Button>
          </Tip>
        </>
      }
    >
      {table ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-3">
                <th className="py-2.5 font-medium">{grain === 'week' ? 'Week of' : 'Month'}</th>
                <th className="py-2.5 text-right font-medium">Launcher impressions</th>
                <th className="py-2.5 text-right font-medium">Conversations</th>
                <th className="py-2.5 text-right font-medium">Outcomes</th>
                <th className="py-2.5 text-right font-medium">Outcome rate</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d, i, arr) => {
                const prev = arr[i + 1]
                const cell = (k: 'impressions' | 'conversations' | 'outcomes') => (
                  <td className="py-3 text-right tnum">
                    <span className="font-medium text-ink">{fmt(d[k])}</span>
                    {prev && !d.partial && prev[k] > 0 && (
                      <span className="ml-2 inline-block w-14 text-left">
                        <Delta value={changePct(d[k], prev[k])} size="xs" />
                      </span>
                    )}
                    {(d.partial || !prev || !prev[k]) && <span className="ml-2 inline-block w-14" />}
                  </td>
                )
                return (
                  <tr key={d.label} className="border-b border-line last:border-0">
                    <td className="py-3 text-ink">
                      {d.label} {d.partial && <Badge className="ml-1">So far</Badge>}
                    </td>
                    {cell('impressions')}
                    {cell('conversations')}
                    {cell('outcomes')}
                    <td className="py-3 text-right text-ink-2 tnum">{d.conversations ? pct(d.outcomes / d.conversations) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <ColumnChart data={data} series={series} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Legend items={[...series.map((s) => ({ label: s.label, color: s.color })), { label: `Current ${grain}, not finished yet`, color: 'var(--color-n-500)', hatch: true }]} />
            <span className="text-xs text-ink-3">Hover a {grain} for exact numbers</span>
          </div>
        </>
      )}
    </Card>
  )
}

/* ---------------- AI performance ---------------- */
export function QualitySection() {
  const { s, toast } = useApp()
  const total = s(214)
  return (
    <div id="quality" className="grid gap-4 lg:grid-cols-2">
      <Card title="Who handled conversations" description="Conversations the AI resolved alone vs. ones a person joined.">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight">100%</span>
          <span className="text-sm text-ink-2">handled by the AI alone</span>
        </div>
        <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
          <div className="h-full bg-viz-1" style={{ width: '100%' }} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-line p-3">
            <Bot className="size-4 text-brand-600" />
            <div>
              <dt className="text-xs text-ink-3">AI only</dt>
              <dd className="text-sm font-semibold tnum">{fmt(total)}</dd>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border border-line p-3">
            <UserRound className="size-4 text-ink-3" />
            <div>
              <dt className="text-xs text-ink-3">A person joined</dt>
              <dd className="text-sm font-semibold tnum">0</dd>
            </div>
          </div>
        </dl>
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-subtle p-3 text-sm">
          <UserRound className="mt-0.5 size-4 shrink-0 text-ink-3" />
          <div className="text-ink-2">
            <b className="font-medium text-ink">Human handoff is off.</b> Let the AI pass tricky conversations to your team. Their pickup time will show
            here.
            <div className="mt-2">
              <Button size="sm" onClick={() => toast('Opens Agent → Handoff settings')}>Set up handoff</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card title="AI reply speed" description="How long visitors waited for each AI reply.">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight">{REPLY.median}s</span>
              <span className="text-sm text-ink-2">
                <Term def={GLOSSARY.medianReply}>typical reply</Term>
              </span>
            </div>
            <div className="mt-2 text-xs text-ink-3">
              <Delta value={-0.08} goodWhenUp={false} size="xs" /> faster than prev. period
            </div>
          </div>
          <div className="text-right">
            <Sparkline data={REPLY.daily} width={160} height={40} label="Typical reply time by day" />
            <div className="text-2xs text-ink-3">by day</div>
          </div>
        </div>
        <div className="mt-5">
          <div className="relative h-2.5 rounded-full bg-brand-50">
            <div className="absolute inset-y-0 left-0 rounded-full bg-brand-200" style={{ width: `${(REPLY.p90 / 30) * 100}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-brand-600" style={{ width: `${(REPLY.median / 30) * 100}%` }} />
            <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-n-900" style={{ left: `${(REPLY.max / 30) * 100}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-2xs text-ink-3 tnum">
            <span>0s</span>
            <span>10s</span>
            <span>20s</span>
            <span>30s</span>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-ink-3"><span className="size-2 rounded-sm bg-brand-600" />Typical (median)</dt>
            <dd className="font-semibold tnum">{REPLY.median}s</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-ink-3">
              <span className="size-2 rounded-sm bg-brand-200" />
              <Term def={GLOSSARY.p90Reply}>9 in 10 within</Term>
            </dt>
            <dd className="font-semibold tnum">{REPLY.p90}s</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-ink-3"><span className="h-2 w-0.5 bg-n-900" />Slowest</dt>
            <dd className="font-semibold tnum">{REPLY.max}s</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}

/* ---------------- Traffic ---------------- */
type SKey = 'impressions' | 'conversations' | 'convRate' | 'outcomes' | 'outRate'

export function TrafficSection() {
  const { s, toast } = useApp()
  const [tab, setTab] = useState<keyof typeof SOURCES>('Pages')
  const [sort, setSort] = useState<{ k: SKey; dir: 1 | -1 }>({ k: 'conversations', dir: -1 })
  const [heatMetric, setHeatMetric] = useState<'conv' | 'imp'>('conv')
  const [hourly, setHourly] = useState(false)

  const val = (r: SourceRow, k: SKey) =>
    k === 'impressions' ? r.impressions ?? -1
    : k === 'conversations' ? r.conversations
    : k === 'outcomes' ? r.outcomes
    : k === 'convRate' ? (r.impressions ? r.conversations / r.impressions : -1)
    : r.conversations ? r.outcomes / r.conversations : 0
  const rows = useMemo(() => [...SOURCES[tab]].sort((a, b) => (val(a, sort.k) - val(b, sort.k)) * sort.dir), [tab, sort])

  const grid = useMemo(() => {
    const g = heatMetric === 'imp' ? HEAT.map((r) => r.map((v) => v * 2 + (v ? 1 : 0))) : HEAT
    if (hourly) return g
    return g.map((r) => Array.from({ length: 8 }, (_, i) => r[i * 3] + r[i * 3 + 1] + r[i * 3 + 2]))
  }, [heatMetric, hourly])
  const blockLabels = ['12–3a', '3–6a', '6–9a', '9–12p', '12–3p', '3–6p', '6–9p', '9–12a']
  const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`

  const th = (label: React.ReactNode, k: SKey) => {
    const on = sort.k === k
    return (
      <th className="py-2.5 pl-4 text-right font-medium" aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button onClick={() => setSort({ k, dir: on ? (sort.dir === 1 ? -1 : 1) : -1 })} className={clsx('inline-flex items-center gap-1 hover:text-ink', on && 'text-ink')}>
          {on && (sort.dir === -1 ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
          {label}
        </button>
      </th>
    )
  }

  return (
    <div id="traffic" className="space-y-4">
      <Card
        title="Where conversations come from"
        description="Which pages, sites and referrers lead to conversations and outcomes."
        actions={
          <Segmented
            size="sm"
            label="Source type"
            value={tab}
            onChange={setTab}
            options={(Object.keys(SOURCES) as (keyof typeof SOURCES)[]).map((k) => ({ value: k, label: k }))}
          />
        }
      >
        {rows.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong py-10 text-center">
            <Megaphone className="size-5 text-ink-3" />
            <p className="mt-2 text-sm font-medium text-ink">No campaign traffic in this period</p>
            <p className="mt-1 max-w-sm text-sm text-ink-2">Add UTM tags to your links to see which campaigns bring in conversations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-3">
                  <th className="py-2.5 font-medium">{tab.replace(/s$/, '')}</th>
                  {th(<Term def={GLOSSARY.impressions}>Launcher impressions</Term>, 'impressions')}
                  {th('Conversations', 'conversations')}
                  {th(<Term def="Conversations ÷ launcher impressions. How often seeing the launcher led to a chat.">Chat rate</Term>, 'convRate')}
                  {th('Outcomes', 'outcomes')}
                  {th(<Term def={GLOSSARY.outcomeRate}>Outcome rate</Term>, 'outRate')}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const imp = r.impressions === null ? null : s(r.impressions)
                  const conv = s(r.conversations)
                  const out = s(r.outcomes)
                  const cr = imp ? conv / imp : null
                  const or = conv ? out / conv : null
                  const low = conv < 10
                  return (
                    <tr key={r.name} className="border-b border-line last:border-0 hover:bg-subtle">
                      <td className="py-3 pr-4">
                        <span className={clsx('text-ink', r.name.startsWith('/') && 'font-mono text-sm')}>{r.name}</span>
                        {r.hint && <span className="ml-2 text-xs text-ink-3">{r.hint}</span>}
                      </td>
                      <td className="py-3 pl-4 text-right text-ink-2 tnum">{imp === null ? <Tip content="Not shown in the launcher, so there’s no impression."><span>n/a</span></Tip> : fmt(imp)}</td>
                      <td className="py-3 pl-4 text-right font-medium text-ink tnum">{fmt(conv)}</td>
                      <td className="py-3 pl-4">
                        <div className="flex items-center justify-end gap-2">
                          {cr !== null && <Meter value={cr} className="w-16" />}
                          <span className={clsx('w-10 text-right tnum', cr !== null && cr < 0.2 ? 'font-medium text-danger-700' : 'text-ink-2')}>
                            {cr === null ? '—' : pct(cr)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pl-4 text-right text-ink-2 tnum">{fmt(out)}</td>
                      <td className="py-3 pl-4 text-right tnum">
                        {or === null ? '—' : low ? (
                          <Tip content={`Only ${conv} conversations, so this rate isn’t reliable yet.`}>
                            <span className="text-ink-3">{pct(or)}<span className="ml-1 text-2xs">low vol.</span></span>
                          </Tip>
                        ) : (
                          <span className="text-ink-2">{pct(or)}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Bots and crawlers are excluded.
            <button className="font-medium text-brand-600 hover:underline" onClick={() => toast('Shows the 37 bot visits that were filtered out')}>
              View excluded
            </button>
          </span>
          {tab === 'Pages' && <span>/start/back-to-school/ gets the most impressions but has the lowest chat rate (14%).</span>}
        </div>
      </Card>

      <Card
        title="When visitors are most active"
        description="Use this to plan when your team should be online for handoffs."
        actions={
          <>
            <Segmented size="sm" label="Heatmap metric" value={heatMetric} onChange={setHeatMetric} options={[{ value: 'conv', label: 'Conversations' }, { value: 'imp', label: 'Launcher impressions' }]} />
            <Segmented size="sm" label="Time grouping" value={hourly ? 'h' : 'b'} onChange={(v) => setHourly(v === 'h')} options={[{ value: 'b', label: '3-hour blocks' }, { value: 'h', label: 'Hourly' }]} />
          </>
        }
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-brand-50 p-3">
            <div className="text-xs text-brand-700">Busiest time</div>
            <div className="mt-0.5 text-sm font-semibold text-ink">Saturdays, 12 – 3 pm</div>
          </div>
          <div className="rounded-lg bg-subtle p-3">
            <div className="text-xs text-ink-3">Busiest day</div>
            <div className="mt-0.5 text-sm font-semibold text-ink">Saturday · 22% of conversations</div>
          </div>
          <div className="rounded-lg bg-subtle p-3">
            <div className="text-xs text-ink-3">Evenings (6 pm – 12 am)</div>
            <div className="mt-0.5 text-sm font-semibold text-ink">38% of conversations</div>
          </div>
        </div>
        <Heatmap
          grid={grid}
          rows={DAYS}
          cols={hourly ? Array.from({ length: 24 }, (_, h) => (h % 3 === 0 ? hourLabel(h) : '')) : blockLabels}
          colLabel={(i) => (hourly ? `${hourLabel(i)}m` : blockLabels[i])}
          valueLabel={heatMetric === 'conv' ? 'conversations' : 'impressions'}
        />
        <p className="mt-2 text-xs text-ink-3">Times in Asia/Kolkata. Each cell totals the selected period.</p>
      </Card>
    </div>
  )
}

/* ---------------- Data captured ---------------- */
export function DataCaptureSection() {
  const { s } = useApp()
  return (
    <Card
      id="data-capture"
      title="Information collected"
      description="Answers the AI collected from visitors for each field."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              <th className="py-2.5 font-medium">Field</th>
              <th className="py-2.5 text-right font-medium">Asked</th>
              <th className="py-2.5 text-right font-medium">Answered</th>
              <th className="py-2.5 pl-6 font-medium">Answer rate</th>
            </tr>
          </thead>
          <tbody>
            {FIELDS.map((f) => {
              const asked = f.asked === null ? null : s(f.asked)
              const ans = s(f.answered)
              const rate = asked ? ans / asked : null
              return (
                <tr key={f.key} className="border-b border-line last:border-0">
                  <td className="py-3">
                    <div className="font-medium text-ink">{f.name}</div>
                    <div className="font-mono text-2xs text-ink-3">{f.key}</div>
                  </td>
                  <td className="py-3 text-right text-ink-2 tnum">
                    {asked === null ? <Tip content="Shown as an optional button, so visitors aren’t asked directly."><span className="text-ink-3">Optional</span></Tip> : fmt(asked)}
                  </td>
                  <td className="py-3 text-right font-medium text-ink tnum">{fmt(ans)}</td>
                  <td className="py-3 pl-6">
                    {rate === null ? (
                      <span className="text-xs text-ink-3">Not applicable for optional fields</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Meter value={rate} className="w-40" />
                        <span className="text-ink-2 tnum">{pct(rate, 1)}</span>
                        <span className="text-xs text-ink-3">{fmt(asked! - ans)} skipped</span>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ---------------- Not set up yet ---------------- */
export function NotSetUp() {
  const { toast } = useApp()
  const items = [
    { icon: Star, title: 'Customer satisfaction (CSAT)', text: 'Ask visitors to rate the chat when it ends. Ratings and comments appear here.', cta: 'Set up a survey' },
    { icon: Megaphone, title: 'Campaigns', text: 'Send WhatsApp or SMS campaigns and track delivered, replied and outcome rates here.', cta: 'Create a campaign' },
    { icon: Clock, title: 'Human pickup time', text: 'Once handoff is on, see how fast your team picks up conversations from the AI.', cta: 'Set up handoff' },
  ]
  return (
    <section aria-labelledby="unlock-h" className="rounded-xl border border-dashed border-line-strong bg-surface/60 p-5">
      <h3 id="unlock-h" className="text-sm font-semibold text-ink">Get more from this page</h3>
      <p className="mt-0.5 text-sm text-ink-3">These reports fill in once the feature is set up.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {items.map((it) => (
          <div key={it.title} className="flex flex-col rounded-lg border border-line bg-surface p-4">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-100 text-brand-600">
              <it.icon className="size-4" />
            </span>
            <div className="mt-3 text-sm font-medium text-ink">{it.title}</div>
            <p className="mt-1 flex-1 text-sm text-ink-2">{it.text}</p>
            <Button size="sm" className="mt-3 self-start" onClick={() => toast(`Opens: ${it.cta}`)}>
              {it.cta}
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
