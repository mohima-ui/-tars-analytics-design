import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Bot, Clock, Megaphone, MessageSquare, Star, BarChart3, LineChart as LineIcon, Table2, User, UserRound } from 'lucide-react'
import { BOTS, CAPTURED, COUNTRIES, DAYS, GLOSSARY, HEAT, REPLY, SOURCES, WEEKS, WEEKS_90, fmt, toMonths, type Week, pct, type SourceRow } from '../data'
import { useApp } from '../state'
import { Button, Card, clsx, Delta, InfoTip, Meter, Modal, Segmented, Term, Tip } from '../components/ui'
import { ColumnChart, Heatmap, Legend, LineChart, Sparkline } from '../components/charts'

type HeatMetric = 'imp' | 'opens' | 'conv' | 'out'
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HEAT_LABEL: Record<HeatMetric, string> = { imp: 'impressions', opens: 'opens', conv: 'conversations', out: 'outcomes' }

/* ---------------- Trends ---------------- */
/** "↑ 12%" / "↓ 8%" with colour; nothing to compare for the first period or an unfinished one. */
function Change({ cur, prev, partial }: { cur: number; prev?: number; partial?: boolean }) {
  if (partial) return <span className="text-ink-3">so far</span>
  if (prev === undefined || prev === 0) return <span className="text-ink-3">—</span>
  const ch = Math.round(((cur - prev) / prev) * 100)
  if (ch === 0) return <span className="text-ink-3">0%</span>
  return <span className={ch > 0 ? 'text-success-700' : 'text-danger-700'}>{ch > 0 ? '↑' : '↓'} {Math.abs(ch)}%</span>
}

/** The prod-style summary table, opened from the Trends card. Newest first. */
function TrendsTable({ data, grain }: { data: Week[]; grain: 'week' | 'month' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-ink-3">
            <th className="py-2.5 pr-3 text-left font-medium">{grain === 'week' ? 'Week of' : 'Month'}</th>
            <th className="px-2 py-2.5 text-right font-medium">Visitors</th>
            <th className="px-2 py-2.5 text-right font-medium">Change</th>
            <th className="px-2 py-2.5 text-right font-medium">Conversations</th>
            <th className="px-2 py-2.5 text-right font-medium">Change</th>
            <th className="px-2 py-2.5 text-right font-medium">Outcomes</th>
            <th className="px-2 py-2.5 text-right font-medium">Change</th>
            <th className="py-2.5 pl-2 text-right font-medium">
              <Term def="Outcomes ÷ conversations. How many chats reached your goal.">Outcome rate</Term>
            </th>
          </tr>
        </thead>
        <tbody>
          {data
            .map((d, i) => ({ d, prev: data[i - 1] }))
            .reverse()
            .map(({ d, prev }) => (
              <tr key={d.label} className="border-b border-line last:border-0">
                <td className="py-3 pr-3 whitespace-nowrap text-ink">
                  {d.label}
                  {d.partial && <span className="ml-1.5 text-xs text-ink-3">so far</span>}
                </td>
                <td className="px-2 py-3 text-right font-medium text-ink tnum">{fmt(d.impressions)}</td>
                <td className="px-2 py-3 text-right text-xs font-medium tnum"><Change cur={d.impressions} prev={prev?.impressions} partial={d.partial} /></td>
                <td className="px-2 py-3 text-right font-medium text-ink tnum">{fmt(d.conversations)}</td>
                <td className="px-2 py-3 text-right text-xs font-medium tnum"><Change cur={d.conversations} prev={prev?.conversations} partial={d.partial} /></td>
                <td className="px-2 py-3 text-right font-medium text-ink tnum">{fmt(d.outcomes)}</td>
                <td className="px-2 py-3 text-right text-xs font-medium tnum"><Change cur={d.outcomes} prev={prev?.outcomes} partial={d.partial} /></td>
                <td className="py-3 pl-2 text-right font-medium text-ink tnum">{d.conversations ? pct(d.outcomes / d.conversations) : '—'}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

export function TrendsSection({ tall }: { tall?: boolean }) {
  const [grain, setGrain] = useState<'week' | 'month'>('week')
  const [metric, setMetric] = useState<'conv' | 'imp'>('imp')
  const [kind, setKind] = useState<'line' | 'bar'>('line')
  const [tableOpen, setTableOpen] = useState(false)
  const { period } = useApp()
  // The chart follows the date range. Monthly adds up the same weeks, so the two views always agree.
  // (90 days drops the Jun 29 week from months, since June is mostly outside the range.)
  const g = grain
  const weeks = period === '90d' ? WEEKS_90 : period === '28d' ? WEEKS : WEEKS.slice(-2)
  const data = g === 'month' ? toMonths(period === '90d' ? WEEKS_90.slice(1) : weeks) : weeks
  const series =
    metric === 'conv'
      ? [
          { key: 'conversations' as const, label: 'Conversations', color: 'var(--color-viz-1)' },
          { key: 'outcomes' as const, label: 'Outcomes', color: 'var(--color-success-600)' },
        ]
      : [{ key: 'impressions' as const, label: 'Visitors (launcher shown)', color: 'var(--color-viz-1)' }]

  return (
    <Card
      id="trends"
      title={
        <span className="inline-flex items-center gap-1.5">
          Trends over time
          <InfoTip
            label="About trends"
            text="Shows whether your numbers are going up or down, weekly or monthly."
          />
        </span>
      }
      actions={<Segmented size="sm" label="Group by" value={g} onChange={setGrain} options={[{ value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]} />}
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
        <Segmented size="sm" label="Metric" value={metric} onChange={setMetric} options={[{ value: 'imp', label: <span className="inline-flex items-center gap-1.5"><User className="size-3.5" />Visitors</span> }, { value: 'conv', label: <span className="inline-flex items-center gap-1.5"><MessageSquare className="size-3.5" />Conversations & outcomes</span> }]} />
        <Tip content={kind === 'bar' ? 'Show as lines' : 'Show as bars'}>
          <Button
            size="sm"
            variant="ghost"
            className="size-8 px-0"
            onClick={() => setKind((k) => (k === 'bar' ? 'line' : 'bar'))}
            aria-label={kind === 'bar' ? 'Show as lines' : 'Show as bars'}
          >
            {kind === 'bar' ? <LineIcon className="size-4" /> : <BarChart3 className="size-4" />}
          </Button>
        </Tip>
      </div>
      {kind === 'line' ? (
        <LineChart data={data} series={series} height={tall ? 280 : 180} area={series.length === 1} />
      ) : (
        <ColumnChart data={data} series={series} height={tall ? 280 : 180} />
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Legend items={[...series.map((s) => ({ label: s.label, color: s.color })), { label: `Current ${g}, not finished yet`, color: 'var(--color-n-500)', hatch: kind === 'bar', dashed: kind === 'line' }]} />
        <button type="button" onClick={() => setTableOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline">
          <Table2 className="size-3.5" /> View as table
        </button>
      </div>
      <Modal
        open={tableOpen}
        onOpenChange={setTableOpen}
        width="max-w-4xl"
        title="Trends table"
        description={`Every number ${g === 'week' ? 'week by week' : 'month by month'}, with the change from the ${g} before.`}
      >
        <TrendsTable data={data} grain={g} />
      </Modal>
    </Card>
  )
}

/* ---------------- AI performance ---------------- */
export function QualitySection() {
  const { s } = useApp()
  const total = s(214)
  // A person joined 28 conversations; the AI handled the rest alone.
  const joined = Math.min(total, Math.max(total ? 1 : 0, s(28)))
  const aiOnly = total - joined
  return (
    <div id="quality" className="grid gap-4 lg:grid-cols-2">
      <Card
        title={
          <span className="inline-flex items-center gap-1.5">
            Who handled conversations <InfoTip label="About who handled conversations" text="Conversations the AI resolved alone vs. ones a human agent joined." />
          </span>
        }
      >
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight tnum">{pct(aiOnly / Math.max(total, 1))}</span>
          <span className="text-sm text-ink-2">handled by the AI alone</span>
        </div>
        <div className="mt-4 flex h-1 gap-0.5 overflow-hidden rounded-full">
          <div className="h-full bg-viz-1" style={{ width: `${(aiOnly / Math.max(total, 1)) * 100}%` }} />
          <div className="h-full min-w-1 bg-viz-2" style={{ width: `${(joined / Math.max(total, 1)) * 100}%` }} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-line p-3">
            <Bot className="size-4 text-brand-600" />
            <div>
              <dt className="text-xs text-ink-3">AI only</dt>
              <dd className="text-sm font-semibold tnum">{fmt(aiOnly)}</dd>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border border-line p-3">
            <UserRound className="size-4 text-viz-2" />
            <div>
              <dt className="text-xs text-ink-3">Human agent</dt>
              <dd className="text-sm font-semibold tnum">{fmt(joined)}</dd>
            </div>
          </div>
        </dl>
      </Card>

      <Card
        title={
          <span className="inline-flex items-center gap-1.5">
            AI reply speed <InfoTip label="About ai reply speed" text="How long visitors waited for each AI reply." />
          </span>
        }
      >
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
          <div className="relative h-1 rounded-full bg-brand-50">
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

export function TrafficSection({ aside }: { aside?: React.ReactNode }) {
  const { s } = useApp()
  const [tab, setTab] = useState<keyof typeof SOURCES>('Pages')
  const [sort, setSort] = useState<{ k: SKey; dir: 1 | -1 }>({ k: 'conversations', dir: -1 })
  const [heatMetric, setHeatMetric] = useState<HeatMetric>('imp')
  const [botsOpen, setBotsOpen] = useState(false)
  const botTotal = BOTS.reduce((t, b) => t + s(b.visits), 0)

  const val = (r: SourceRow, k: SKey) =>
    k === 'impressions' ? r.impressions ?? -1
    : k === 'conversations' ? r.conversations
    : k === 'outcomes' ? r.outcomes
    : k === 'convRate' ? (r.impressions ? r.conversations / r.impressions : -1)
    : r.conversations ? r.outcomes / r.conversations : 0
  const rows = useMemo(() => [...SOURCES[tab]].sort((a, b) => (val(a, sort.k) - val(b, sort.k)) * sort.dir), [tab, sort])

  const grid = useMemo(() => {
    // Conversations are the base grid; the other stages are derived so each cell keeps impressions ≥ opens ≥ conversations ≥ outcomes.
    const g = HEAT.map((r) =>
      r.map((v) => {
        const imp = v * 2 + (v ? 1 : 0)
        if (heatMetric === 'imp') return imp
        if (heatMetric === 'opens') return Math.max(v, Math.round(imp * 0.75))
        if (heatMetric === 'out') return Math.round(v * 0.82)
        return v
      }),
    )
    return g
  }, [heatMetric])
  // One box per hour, like production; labels only every 3 hours (12am, 3am … 9pm).
  const hourName = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`
  const blockLabels = Array.from({ length: 24 }, (_, h) => (h % 3 === 0 ? hourName(h) : ''))
  // Hover and the boxes show the full hour, e.g. "12pm–1pm".
  const blockRange = (h: number) => `${hourName(h)}–${hourName((h + 1) % 24)}`

  // Summary boxes, worked out from the grid for the selected metric.
  const gridTotal = grid.flat().reduce((a, v) => a + v, 0) || 1
  let peak = { day: 0, block: 0, v: -1 }
  grid.forEach((r, d) => r.forEach((v, b) => { if (v > peak.v) peak = { day: d, block: b, v } }))
  // Quietest slot: the lowest cell; ties go to the earliest in the week.
  let quiet = { day: 0, block: 0, v: Infinity }
  grid.forEach((r, d) => r.forEach((v, b) => { if (v < quiet.v) quiet = { day: d, block: b, v } }))
  const dayTotals = grid.map((r) => r.reduce((a, v) => a + v, 0))
  const topDay = dayTotals.indexOf(Math.max(...dayTotals))
  const peakDay = { day: topDay, share: dayTotals[topDay] / gridTotal }

  const th = (label: React.ReactNode, k: SKey) => {
    const on = sort.k === k
    return (
      <th className="py-2.5 pl-4 text-center font-medium" aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
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
        title="Sources"
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
                  {th(<Term def="Conversations ÷ launcher impressions. How often seeing the launcher led to a chat.">Chat rate</Term>, 'convRate')}
                  {th(<Term def={GLOSSARY.impressions}>Launcher impressions</Term>, 'impressions')}
                  {th('Conversations', 'conversations')}
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
                        <span className={clsx('text-ink', r.name.startsWith('/') && 'font-mono text-[13px]')}>{r.name}</span>
                      </td>
                      <td className="py-3 pl-4">
                        {/* Bar only; the exact rate shows on hover. */}
                        <div className="flex items-center justify-center">
                          {cr === null ? (
                            <span className="text-ink-3">—</span>
                          ) : (
                            <Tip content={`${pct(cr)} chat rate · ${fmt(conv)} chats from ${fmt(imp!)} impressions`}>
                              <span tabIndex={0} className="block cursor-default py-2" style={{ outline: 'none' }}>
                                <Meter value={cr} className="w-40" />
                              </span>
                            </Tip>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pl-4 text-center font-medium text-ink tnum">{imp === null ? <Tip content="Not shown in the launcher, so there’s no impression."><span>n/a</span></Tip> : fmt(imp)}</td>
                      <td className="py-3 pl-4 text-center font-medium text-ink tnum">{fmt(conv)}</td>
                      <td className="py-3 pl-4 text-center font-medium text-ink tnum">{fmt(out)}</td>
                      <td className="py-3 pl-4 text-center font-medium text-ink tnum">
                        {or === null ? '—' : low ? (
                          <Tip content={`Only ${conv} conversations, so this rate isn’t reliable yet.`}>
                            <span>{pct(or)}<span className="ml-1 text-2xs font-normal text-ink-3">low vol.</span></span>
                          </Tip>
                        ) : (
                          <span>{pct(or)}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Bots and crawlers stay out of the table, but one quiet line says they were left out. */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-xs text-ink-3">
          <Bot className="size-3.5" />
          <span className="tnum"><b className="font-semibold text-ink-2">{fmt(botTotal)} bot and crawler visits</b> left out</span>
          <span>·</span>
          <button onClick={() => setBotsOpen(true)} className="font-medium text-brand-600 hover:underline">View</button>
        </div>
      </Card>

      <Modal open={botsOpen} onOpenChange={setBotsOpen} title="Bots and crawlers" description="Visits from programs, not people, like search engines and uptime checkers. They’re left out of Sources so your numbers show real visitors." width="max-w-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 text-center font-medium">Visits</th>
            </tr>
          </thead>
          <tbody>
            {BOTS.map((b) => (
              <tr key={b.name} className="border-b border-line last:border-0">
                <td className="py-3 pr-4 font-medium text-ink">{b.name}</td>
                <td className="py-3 pr-4 text-ink-2">{b.kind}</td>
                <td className="py-3 text-center font-medium text-ink tnum">{fmt(s(b.visits))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>

      <div className="grid items-stretch gap-4 lg:grid-cols-3">
      <Card
        className="lg:col-span-2"
        title="Busy hours"
        description="When people visit and chat, by day and hour."
        actions={
          <>
            <Segmented size="sm" label="Heatmap metric" value={heatMetric} onChange={setHeatMetric} options={[
                { value: 'imp', label: 'Launcher impressions' },
                { value: 'opens', label: 'Opens' },
                { value: 'conv', label: 'Conversations' },
                { value: 'out', label: 'Outcomes' },
              ]} />
          </>
        }
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-brand-50 p-3">
            <div className="text-xs text-brand-700">Busiest time</div>
            <div className="mt-0.5 text-sm font-semibold text-ink">
              {FULL_DAYS[peak.day]}s, {blockRange(peak.block)}
            </div>
          </div>
          <div className="rounded-lg bg-subtle p-3">
            <div className="text-xs text-ink-3">Busiest day</div>
            <div className="mt-0.5 text-sm font-semibold text-ink">
              {FULL_DAYS[peakDay.day]} · {pct(peakDay.share)} of {HEAT_LABEL[heatMetric]}
            </div>
          </div>
          <div className="rounded-lg bg-subtle p-3">
            <div className="text-xs text-ink-3">Quietest time</div>
            <div className="mt-0.5 text-sm font-semibold text-ink">
              {FULL_DAYS[quiet.day]}s, {blockRange(quiet.block)}
            </div>
          </div>
        </div>
        <Heatmap
          grid={grid}
          rows={DAYS}
          cols={blockLabels}
          colLabel={blockRange}
          valueLabel={HEAT_LABEL[heatMetric]}
        />
      </Card>
      {aside}
      </div>
    </div>
  )
}

/* ---------------- Data captured ---------------- */
export function DataCaptureSection() {
  const { s } = useApp()
  const total = s(CAPTURED.conversations)
  const any = s(CAPTURED.anyDetail)
  const fields = CAPTURED.fields.map((f) => ({ ...f, n: s(f.value) })).sort((a, b) => b.n - a.n)
  const least = fields[fields.length - 1]
  return (
    <Card id="data-capture" title="Fields captured" description="Details people shared in the chat.">
      {/* Headline */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-ink tnum">{pct(any / Math.max(total, 1))}</span>
        <span className="text-sm text-ink-2">of conversations shared at least one detail</span>
      </div>
      <div className="mt-0.5 text-xs text-ink-3 tnum">
        {fmt(any)} of {fmt(total)} conversations
      </div>

      {/* One row per field */}
      <ul className="mt-5 space-y-3.5">
        {fields.map((f) => {
          const rate = f.n / Math.max(total, 1)
          return (
            <li key={f.name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-ink">{f.name}</span>
                <span className="font-medium text-ink tnum">{pct(rate)}</span>
              </div>
              <Meter value={rate} className="mt-1.5 w-full" />
              <div className="mt-1 text-xs text-ink-3 tnum">
                {fmt(f.n)} people{f.top && <> · Most said <span className="text-ink-2">{f.top}</span></>}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Insight */}
      <div className="mt-5 rounded-lg bg-brand-50 p-3 text-xs text-ink-2">
        <b className="font-semibold text-ink">{least.name}</b> is shared the least ({pct(least.n / Math.max(total, 1))}). Asking for it later in the chat may help.
      </div>
    </Card>
  )
}

/* ---------------- Features that fill in once set up ---------------- */
const SETUP: Record<'campaigns' | 'csat' | 'pickup', { icon: typeof Clock; title: string; text: string; cta: string | null }> = {
  campaigns: { icon: Megaphone, title: 'Campaigns', text: 'Send WhatsApp or SMS campaigns and see delivered, replied and outcome rates here.', cta: 'Create a campaign' },
  csat: { icon: Star, title: 'Customer satisfaction (CSAT)', text: 'Ask people to rate the chat when it ends. Ratings and comments show here.', cta: 'Set up a survey' },
  // Handoff is always on; this card is empty only because nothing was handed over this period.
  pickup: { icon: Clock, title: 'Human pickup time', text: 'How fast your team picks up a conversation from the AI. Nothing was handed over this period.', cta: null },
}

/** Where people are, ranked by conversations. */
// One shade per country, darkest for the most conversations; "Other" is grey.
const COUNTRY_COLORS = ['var(--color-brand-700)', 'var(--color-brand-500)', 'var(--color-brand-400)', 'var(--color-brand-300)', 'var(--color-brand-200)', 'var(--color-n-300)']

export function CountriesCard() {
  const { s } = useApp()
  const [hover, setHover] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const rows = COUNTRIES.map((c) => ({ ...c, imp: s(c.impressions), conv: s(c.conversations), out: s(c.outcomes) }))
    .sort((a, b) => (a.name === 'Other' ? 1 : b.name === 'Other' ? -1 : b.conv - a.conv))
    .map((r, i) => ({ ...r, color: r.name === 'Other' ? COUNTRY_COLORS[5] : COUNTRY_COLORS[Math.min(i, 4)] }))
  const total = rows.reduce((a, r) => a + r.conv, 0) || 1

  // Donut arcs (share of conversations), with a small gap between slices.
  const R = 60, r0 = 44, C = 64
  let angle = -Math.PI / 2
  const arcs = rows.map((row) => {
    const sweep = (row.conv / total) * Math.PI * 2
    const a0 = angle + 0.02, a1 = angle + sweep - 0.02
    angle += sweep
    const p = (rad: number, rr: number) => `${C + rr * Math.cos(rad)} ${C + rr * Math.sin(rad)}`
    const large = a1 - a0 > Math.PI ? 1 : 0
    return { row, d: `M ${p(a0, R)} A ${R} ${R} 0 ${large} 1 ${p(a1, R)} L ${p(a1, r0)} A ${r0} ${r0} 0 ${large} 0 ${p(a0, r0)} Z` }
  })
  const focus = rows.find((r) => r.name === hover)

  return (
    <Card title="Countries" description="Where people are, ranked by conversations.">
      <div className="flex justify-center">
        <div className="relative size-40">
          <svg viewBox="0 0 128 128" className="size-full" role="img" aria-label="Share of conversations by country">
            {arcs.map(({ row, d }) => (
              <path
                key={row.name}
                d={d}
                fill={row.color}
                opacity={hover && hover !== row.name ? 0.35 : 1}
                className="cursor-default transition-opacity"
                onPointerEnter={() => setHover(row.name)}
                onPointerLeave={() => setHover(null)}
              />
            ))}
          </svg>
          {/* Centre: total, or the hovered country's share */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-md font-semibold text-ink tnum">{focus ? pct(focus.conv / total) : fmt(total)}</span>
            <span className="max-w-24 truncate text-xs text-ink-3">{focus ? focus.name : 'conversations'}</span>
          </div>
        </div>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-ink-3">
            <th className="py-2 text-left font-medium">Country</th>
            <th className="py-2 text-center font-medium">Conversations</th>
            <th className="py-2 text-right font-medium">
              <Term def={GLOSSARY.outcomeRate}>Outcome rate</Term>
            </th>
          </tr>
        </thead>
        <tbody>
          {(showAll ? rows : rows.slice(0, 4)).map((r) => {
            const rate = r.conv ? r.out / r.conv : null
            const low = r.conv < 10
            return (
              <tr
                key={r.name}
                className={clsx('border-b border-line transition-colors last:border-0', hover === r.name && 'bg-subtle')}
                onPointerEnter={() => setHover(r.name)}
                onPointerLeave={() => setHover(null)}
              >
                <td className="py-2.5 pr-2">
                  <Tip content={`${fmt(r.imp)} launcher impressions · ${fmt(r.out)} outcomes`}>
                    <span className="inline-flex items-center gap-2 text-ink">
                      <span className="size-2.5 shrink-0 rounded-sm" style={{ background: r.color }} />
                      <span className="truncate">{r.name}</span>
                    </span>
                  </Tip>
                </td>
                <td className="py-2.5 text-center font-medium text-ink tnum">{fmt(r.conv)}</td>
                <td className="py-2.5 text-right font-medium tnum">
                  {rate === null ? (
                    '—'
                  ) : low ? (
                    <Term def={`Only ${r.conv} conversations, so this rate isn’t reliable yet.`}>
                      <span className="text-ink-3">{pct(rate)}</span>
                    </Term>
                  ) : (
                    <span className="text-ink">{pct(rate)}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {/* The table shows the top 4; the donut always shows every country. */}
      {rows.length > 4 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-medium text-brand-600 hover:underline">
          {showAll ? 'Show fewer' : `Show all ${rows.length} countries`}
        </button>
      )}
    </Card>
  )
}

/** How fast the team picked up the conversations the AI handed over. */
export function PickupCard() {
  const { s } = useApp()
  const n = Math.max(1, s(28))
  return (
    <Card
        title={
          <span className="inline-flex items-center gap-1.5">
            Human pickup time <InfoTip label="About human pickup time" text="How fast your team picked up a conversation from the AI." />
          </span>
        }
      >
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tnum">1m 40s</span>
        <span className="text-sm text-ink-2">typical wait</span>
      </div>
      <div className="mt-1 text-xs text-ink-3 tnum">
        Based on {fmt(n)} {n === 1 ? 'conversation' : 'conversations'} · slowest 2m 15s
      </div>
    </Card>
  )
}

/** A not-yet-set-up report, shown inside the group it belongs to. */
export function SetupCard({ kind, className }: { kind: keyof typeof SETUP; className?: string }) {
  const { toast } = useApp()
  const it = SETUP[kind]
  return (
    <section className={clsx('flex flex-col rounded-xl border border-dashed border-line-strong bg-surface/60 p-5', className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-brand-100 text-brand-600">
        <it.icon className="size-4" aria-hidden />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-ink">{it.title}</h3>
      <p className="mt-1 flex-1 text-sm text-ink-2">{it.text}</p>
      {it.cta && (
        <Button size="sm" className="mt-4 self-start" onClick={() => toast(`Opens: ${it.cta}`)}>
          {it.cta}
        </Button>
      )}
    </section>
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
