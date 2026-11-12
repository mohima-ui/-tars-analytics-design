import { useId, useMemo, useState, type ReactNode } from 'react'
import { Bot, ChevronDown, FileText, Link2, Mail, MessageCircleQuestion, Sheet as SheetIcon, Target, Timer } from 'lucide-react'
import { MONTHS, REPLY, SOURCES, TOPICS, TOTALS as T, UNCLASSIFIED, WEEKS, fmt, type Topic } from './data'
import { useApp } from './state'
import { clsx, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Tip } from './components/ui'
import { DateRangePicker, ScheduleDialog } from './sections/Header'
import { ManageTopics, TopicSheet } from './sections/Topics'
import { DAYS7, FilterSelect, HEAT_COLORS, Seg, TIMEZONES, TimezoneSelect, changeText, hourLabel, pct, spread } from './Overview'

/* ------------------------------------------------------------------ */
/* v3: the whole of Analytics on one screen, no page scroll.           */
/* Row 1: funnel · trend · key metrics. Row 2: breakdown table · busy hours. */
/* ------------------------------------------------------------------ */

function Panel({ title, actions, children, className }: { title: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('flex min-h-0 min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-xs', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  )
}

function Change({ cur, prev, neutral }: { cur: number; prev: number; neutral?: boolean }) {
  if (!prev) return <span className="text-ink-3">New</span>
  const up = cur >= prev
  return (
    <span className={clsx('font-medium tnum', neutral ? 'text-ink-2' : up ? 'text-success-700' : 'text-danger-700')}>
      {up ? '↑' : '↓'} {changeText(cur, prev).replace(/^[+−]/, '').replace(/\(([+−])/, '(')}
    </span>
  )
}

/* ---------- Header: title, filters and report actions on one line ---------- */

function TopBar({ tz, setTz }: { tz: string; setTz: (t: string) => void }) {
  const { bot, setBot, channel, setChannel, mode, setMode, toast } = useApp()
  const [schedule, setSchedule] = useState(false)
  return (
    <header className="flex flex-wrap items-center gap-2">
      <h1 className="mr-2 text-lg font-semibold tracking-tight text-ink">Analytics</h1>
      <DateRangePicker className="h-10" />
      <FilterSelect label="All deployments" icon={Bot} value={bot} options={['Brightline Prod', 'Brightline Staging']} onChange={setBot} />
      <FilterSelect label="Channel" value={channel} options={['All channels', 'Web', 'WhatsApp', 'SMS', 'Voice', 'Email']} onChange={setChannel} />
      <TimezoneSelect value={tz} onChange={setTz} />
      <div className="flex-1" />
      <Seg label="Data" value={mode} onChange={setMode} options={[{ value: 'live', label: 'Live' }, { value: 'test', label: 'Test' }]} />
      <button onClick={() => setSchedule(true)} className="flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-sm font-medium hover:bg-subtle">
        <Mail className="size-4 text-ink-2" /> Email report
      </button>
      <Menu>
        <MenuTrigger asChild>
          <button className="flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-sm font-medium text-white hover:bg-brand-700">
            Export report <ChevronDown className="size-4" />
          </button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={() => toast('Preparing PDF…')}><FileText className="size-4 text-ink-2" /> Download PDF</MenuItem>
          <MenuItem onSelect={() => toast('Downloading CSV…')}><SheetIcon className="size-4 text-ink-2" /> Download CSV</MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => toast('Link copied')}><Link2 className="size-4 text-ink-2" /> Copy link</MenuItem>
        </MenuContent>
      </Menu>
      <ScheduleDialog open={schedule} onOpenChange={setSchedule} />
    </header>
  )
}

/* ---------- Funnel: flowing band that fills its panel ---------- */

function bandPath(halves: number[], w: number, mid: number) {
  const cw = w / halves.length
  const cx = (i: number) => cw * i + cw / 2
  let d = `M 0 ${mid - halves[0]} L ${cx(0)} ${mid - halves[0]}`
  for (let i = 1; i < halves.length; i++) {
    d += ` C ${cx(i - 1) + cw / 2} ${mid - halves[i - 1]} ${cx(i) - cw / 2} ${mid - halves[i]} ${cx(i)} ${mid - halves[i]}`
  }
  const n = halves.length - 1
  d += ` L ${w} ${mid - halves[n]} L ${w} ${mid + halves[n]} L ${cx(n)} ${mid + halves[n]}`
  for (let i = n - 1; i >= 0; i--) {
    d += ` C ${cx(i + 1) - cw / 2} ${mid + halves[i + 1]} ${cx(i) + cw / 2} ${mid + halves[i]} ${cx(i)} ${mid + halves[i]}`
  }
  return d + ` L 0 ${mid + halves[0]} Z`
}

function FunnelPanel() {
  const { s } = useApp()
  const gid = useId().replace(/:/g, '')
  const fromLauncher = s(T.launcherConversations)
  const stages = [
    { key: 'imp', label: 'Impressions', v: s(T.impressions), kept: '', lost: 'times the launcher was shown' },
    { key: 'opens', label: 'Opens', v: s(T.opens), kept: 'opened', lost: `${fmt(s(T.impressions) - s(T.opens))} didn’t open` },
    { key: 'conv', label: 'Conversations', v: s(T.conversations), kept: 'chatted', lost: `${fmt(s(T.opens) - fromLauncher)} didn’t chat` },
    { key: 'out', label: 'Outcomes', v: s(T.outcomes), kept: 'reached one', lost: `${fmt(s(T.conversations) - s(T.outcomes))} didn’t reach one` },
  ]
  const W = 1000, H = 200, mid = H / 2, maxHalf = 88
  const top = Math.max(stages[0].v, 1)
  const half = (v: number) => Math.max(6, (v / top) * maxHalf)
  const kept = stages.map((x) => half(x.v))
  const halo = stages.map((x, i) => half(i ? stages[i - 1].v : x.v) + 6)
  const cols = { gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }
  return (
    <Panel title="Funnel" actions={<span className="text-xs text-ink-3">{pct(s(T.outcomes) / Math.max(s(T.conversations), 1))} of conversations reached an outcome</span>}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="grid" style={cols}>
          {stages.map((x, i) => (
            <div key={x.key} className={clsx('pb-2 text-center text-xs font-medium text-ink-2', i > 0 && 'border-l border-line')}>{x.label}</div>
          ))}
        </div>
        <div className="relative min-h-[90px] flex-1">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
            <defs>
              <linearGradient id={`${gid}-g`} x1="0" x2="1">
                <stop offset="0" stopColor="var(--color-brand-600)" />
                <stop offset="1" stopColor="var(--color-brand-300)" />
              </linearGradient>
              <clipPath id={`${gid}-c`}>
                <rect x={(W / 4) * 3} y="0" width={W / 4} height={H} />
              </clipPath>
            </defs>
            <path d={bandPath(halo, W, mid)} fill="var(--color-brand-200)" opacity="0.35" />
            <path d={bandPath(kept, W, mid)} fill={`url(#${gid}-g)`} />
            <path d={bandPath(kept, W, mid)} fill="var(--color-success-700)" opacity="0.9" clipPath={`url(#${gid}-c)`} />
          </svg>
          <div className="absolute inset-0 grid" style={cols}>
            {stages.map((x, i) => {
              const prev = stages[i - 1]
              return (
                <Tip key={x.key} content={<span><b className="tnum">{fmt(x.v)}</b> {x.label.toLowerCase()}{prev && <> · {pct(x.v / Math.max(prev.v, 1))} of {fmt(prev.v)}</>}</span>}>
                  <div tabIndex={0} className={clsx('flex flex-col items-center justify-center text-white', i > 0 && 'border-l border-line/60')}>
                    <span className="text-base font-semibold tnum drop-shadow-sm">{prev ? pct(x.v / Math.max(prev.v, 1)) : '100%'}</span>
                    {x.kept && <span className="text-[11px] text-white/85">{x.kept}</span>}
                  </div>
                </Tip>
              )
            })}
          </div>
        </div>
        <div className="grid" style={cols}>
          {stages.map((x, i) => (
            <div key={x.key} className={clsx('pt-2 text-center', i > 0 && 'border-l border-line')}>
              <div className={clsx('text-lg font-semibold tnum', x.key === 'out' ? 'text-success-700' : 'text-brand-600')}>{fmt(x.v)}</div>
              <div className="truncate px-1 text-[11px] text-ink-3">{i ? `↓ ${x.lost}` : x.lost}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

/* ---------- Conversations and outcomes over time ---------- */

function TrendPanel() {
  const [grain, setGrain] = useState<'week' | 'month'>('week')
  const data = grain === 'week' ? WEEKS : MONTHS
  const max = Math.max(...data.map((d) => d.conversations), 1)
  return (
    <Panel
      title="Conversations and outcomes"
      actions={<Seg size="sm" label="Group by" value={grain} onChange={setGrain} options={[{ value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]} />}
    >
      <div className="flex min-h-0 flex-1 items-end gap-2 border-b border-line">
        {data.map((d) => (
          <Tip
            key={d.label}
            content={
              <span>
                {grain === 'week' ? 'Week of ' : ''}{d.label}{d.partial ? ' · partial' : ''}<br />
                <b className="tnum">{fmt(d.conversations)}</b> conversations · <b className="tnum">{fmt(d.outcomes)}</b> outcomes
              </span>
            }
          >
            <div tabIndex={0} className="flex h-full flex-1 items-end justify-center gap-1 rounded-t-md hover:bg-brand-50" style={{ opacity: d.partial ? 0.45 : 1 }}>
              {[
                { v: d.conversations, cls: 'bg-brand-600' },
                { v: d.outcomes, cls: 'bg-viz-2' },
              ].map((b, j) => (
                <div key={j} className="flex h-full w-[38%] max-w-6 flex-col justify-end">
                  <span className="mb-1 text-center text-[10px] text-ink-2 tnum">{b.v}</span>
                  <div className={clsx('w-full rounded-t-sm', b.cls)} style={{ height: `${Math.max(2, (b.v / max) * 82)}%` }} />
                </div>
              ))}
            </div>
          </Tip>
        ))}
      </div>
      <div className="flex gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center text-[11px] text-ink-2">{d.label}</div>
        ))}
      </div>
      <div className="flex justify-center gap-4 text-[11px] text-ink-2">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-xs bg-brand-600" />Conversations</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-xs bg-viz-2" />Outcomes</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-xs bg-brand-600 opacity-45" />Partial</span>
      </div>
    </Panel>
  )
}

/* ---------- Key metrics: four filled tiles ---------- */

function Metrics({ onUnmatched }: { onUnmatched: () => void }) {
  const { s } = useApp()
  const conv = s(T.conversations)
  const tiles = [
    { icon: Target, label: 'AI Agent outcomes', value: fmt(s(T.outcomes)), pill: <Change cur={s(T.outcomes)} prev={s(T.outcomesPrev)} neutral />, sub: `${pct(s(T.outcomes) / Math.max(conv, 1))} of conversations`, bg: 'bg-gradient-to-br from-success-700 to-success-600' },
    { icon: Timer, label: 'AI reply time', value: `${REPLY.median}s`, sub: `Median · slowest 10% over ${REPLY.p90}s`, bg: 'bg-gradient-to-br from-brand-700 to-brand-600' },
    { icon: Bot, label: 'Handled by AI alone', value: pct(s(T.aiAlone) / Math.max(conv, 1)), sub: `${fmt(s(T.aiAlone))} of ${fmt(conv)} conversations`, bg: 'bg-gradient-to-br from-brand-600 to-brand-500' },
    { icon: MessageCircleQuestion, label: 'Don’t fit a topic', value: pct(s(UNCLASSIFIED.count) / Math.max(conv, 1)), sub: `${fmt(s(UNCLASSIFIED.count))} conversations · review`, bg: 'bg-gradient-to-br from-brand-500 to-brand-400', onClick: onUnmatched },
  ]
  return (
    <section aria-label="Key metrics" className="flex min-h-0 flex-col gap-3">
      <h2 className="text-base font-semibold text-ink">Key metrics</h2>
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
        {tiles.map((t) => {
          const Inner = (
            <>
              <span className="grid size-8 place-items-center rounded-lg bg-white/20">
                <t.icon className="size-4" aria-hidden />
              </span>
              <span className="mt-auto flex flex-wrap items-baseline gap-x-2">
                <span className="text-xl font-semibold tracking-tight tnum">{t.value}</span>
                {t.pill && <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[11px]">{t.pill}</span>}
              </span>
              <span className="text-xs font-medium">{t.label}</span>
              <span className="truncate text-[11px] text-white/80">{t.sub}</span>
            </>
          )
          const cls = clsx('flex min-h-0 flex-col gap-0.5 overflow-hidden rounded-xl p-3.5 text-left text-white shadow-xs', t.bg)
          return t.onClick ? (
            <button key={t.label} onClick={t.onClick} className={clsx(cls, 'hover:brightness-110')}>{Inner}</button>
          ) : (
            <div key={t.label} className={cls}>{Inner}</div>
          )
        })}
      </div>
    </section>
  )
}

/* ---------- Breakdown: topics, pages, referrers in one table with a total row ---------- */

type Tab = 'Topics' | 'Pages' | 'Referrers'

function Breakdown({ topics, onOpenTopic }: { topics: Topic[]; onOpenTopic: (id: string) => void }) {
  const { s, mode } = useApp()
  const [tab, setTab] = useState<Tab>('Topics')
  const conv = s(T.conversations)
  const th = 'sticky top-0 z-10 bg-surface py-2 text-xs font-medium text-ink-3'
  const totalRow = 'sticky bottom-0 bg-brand-600 text-white [&>td]:py-2.5 [&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg'
  const active = topics.filter((t) => !t.archived).sort((a, b) => b.count - a.count)
  const un = s(UNCLASSIFIED.count)
  const maxTopic = Math.max(...active.map((t) => s(t.count)), 1)
  // Pages lists the top 8, so its total is the whole site. Referrers covers all launcher traffic, so it sums.
  const totals =
    tab === 'Referrers'
      ? SOURCES.Referrers.reduce((a, r) => ({ c: a.c + s(r.conversations), o: a.o + s(r.outcomes) }), { c: 0, o: 0 })
      : { c: conv, o: s(T.outcomes) }

  return (
    <Panel
      title="Breakdown"
      actions={<Seg size="sm" label="Breakdown" value={tab} onChange={setTab} options={(['Topics', 'Pages', 'Referrers'] as Tab[]).map((v) => ({ value: v, label: v }))} />}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'Topics' ? (
          mode === 'test' ? (
            <p className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-ink-2">Topics use Live conversations only. Switch Data to Live.</p>
          ) : (
            <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left">
                  <th className={th}>Topic</th>
                  <th className={clsx(th, 'w-[30%]')}>Share of conversations</th>
                  <th className={clsx(th, 'text-right')}>Count</th>
                  <th className={clsx(th, 'text-right')}>Change</th>
                  <th className={clsx(th, 'pr-3 text-right')}>Outcome rate</th>
                </tr>
              </thead>
              <tbody>
                {active.map((t) => (
                  <tr key={t.id} onClick={() => onOpenTopic(t.id)} className="group cursor-pointer hover:bg-subtle [&>td]:border-b [&>td]:border-n-100 [&>td]:py-2">
                    <td className="pr-3 font-medium text-ink group-hover:text-brand-600">{t.name}</td>
                    <td className="pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-brand-400" style={{ width: `${(s(t.count) / maxTopic) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs text-ink-2 tnum">{pct(s(t.count) / Math.max(conv, 1))}</span>
                      </div>
                    </td>
                    <td className="text-right font-medium tnum">{s(t.count)}</td>
                    <td className="text-right text-xs"><Change cur={s(t.count)} prev={s(t.prev)} neutral /></td>
                    <td className="pr-3 text-right tnum">{pct(t.outcomeRate)}</td>
                  </tr>
                ))}
                <tr onClick={() => onOpenTopic('unclassified')} className="cursor-pointer bg-warning-50 hover:brightness-[0.98] [&>td]:py-2">
                  <td className="pr-3 pl-2 font-medium text-warning-700">Don’t fit a topic</td>
                  <td className="pr-3 text-right text-xs text-warning-700 tnum">{pct(un / Math.max(conv, 1))}</td>
                  <td className="text-right font-medium tnum">{un}</td>
                  <td className="text-right text-xs"><Change cur={un} prev={s(UNCLASSIFIED.prev)} neutral /></td>
                  <td className="pr-3 text-right tnum">{pct(UNCLASSIFIED.outcomeRate)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className={totalRow}>
                  <td className="pl-3 font-semibold">Total</td>
                  <td className="pr-3 text-right text-xs">100%</td>
                  <td className="text-right font-semibold tnum">{fmt(conv)}</td>
                  <td className="text-right text-xs">{changeText(conv, s(T.conversationsPrev))}</td>
                  <td className="pr-3 text-right font-semibold tnum">{pct(s(T.outcomes) / Math.max(conv, 1))}</td>
                </tr>
              </tfoot>
            </table>
          )
        ) : (
          <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left">
                <th className={th}>{tab === 'Pages' ? 'Page' : 'Referrer'}</th>
                <th className={clsx(th, 'text-right')}>Impressions</th>
                <th className={clsx(th, 'text-right')}>Conversations</th>
                <th className={clsx(th, 'text-right')}>Outcomes</th>
                <th className={clsx(th, 'pr-3 text-right')}>Outcome rate</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES[tab].map((r) => {
                const c = s(r.conversations), o = s(r.outcomes)
                return (
                  <tr key={r.name} className="hover:bg-subtle [&>td]:border-b [&>td]:border-n-100 [&>td]:py-2">
                    <td className={clsx('pr-3 text-ink', r.name.startsWith('/') && 'font-mono text-xs')}>{r.name}</td>
                    <td className="text-right text-ink-2 tnum">{r.impressions === null ? '—' : fmt(s(r.impressions))}</td>
                    <td className="text-right font-medium tnum">{c}</td>
                    <td className="text-right tnum">{o}</td>
                    <td className="pr-3 text-right tnum">
                      {c ? pct(o / c) : '—'}
                      {c < 10 && <span className="ml-1.5 rounded bg-warning-50 px-1 py-0.5 text-[10px] text-warning-700">Few chats</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className={totalRow}>
                <td className="pl-3 font-semibold">{tab === 'Pages' ? 'All pages' : 'All referrers'}</td>
                <td className="text-right font-semibold tnum">{fmt(s(T.impressions))}</td>
                <td className="text-right font-semibold tnum">{fmt(totals.c)}</td>
                <td className="text-right font-semibold tnum">{fmt(totals.o)}</td>
                <td className="pr-3 text-right font-semibold tnum">{pct(totals.o / Math.max(totals.c, 1))}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </Panel>
  )
}

/* ---------- Busy hours ---------- */

function BusyHours({ tz }: { tz: string }) {
  const { s } = useApp()
  const [metric, setMetric] = useState<'imp' | 'conv' | 'out'>('conv')
  const grid = useMemo(
    () => (metric === 'imp' ? spread(s(T.impressions), 7) : metric === 'conv' ? spread(s(T.conversations), 8) : spread(s(T.outcomes), 9)),
    [metric, s],
  )
  const max = Math.max(...grid.flat(), 1)
  let peak = { d: 0, h: 0, v: -1 }
  grid.forEach((row, d) => row.forEach((v, h) => { if (v > peak.v) peak = { d, h, v } }))
  const level = (v: number) => (v === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((v / max) * 4))))
  const unit = metric === 'imp' ? 'impressions' : metric === 'conv' ? 'conversations' : 'outcomes'
  return (
    <Panel
      title={<>Busy hours <span className="font-normal text-ink-3">· busiest {DAYS7[peak.d]} {hourLabel(peak.h)}</span></>}
      actions={<Seg size="sm" label="Heatmap metric" value={metric} onChange={setMetric} options={[{ value: 'imp', label: 'Impressions' }, { value: 'conv', label: 'Conversations' }, { value: 'out', label: 'Outcomes' }]} />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-[3px]">
        {grid.map((row, d) => (
          <div key={d} className="flex min-h-0 flex-1 items-stretch gap-[3px]">
            <div className="flex w-8 flex-none items-center text-[11px] text-ink-2">{DAYS7[d]}</div>
            {row.map((v, h) => (
              <Tip key={h} content={<span><b className="tnum">{v}</b> {unit} · {DAYS7[d]} {hourLabel(h)}</span>}>
                <div tabIndex={0} aria-label={`${DAYS7[d]} ${hourLabel(h)}: ${v} ${unit}`} className="min-h-2 flex-1 rounded-[3px]" style={{ background: HEAT_COLORS[level(v)] }} />
              </Tip>
            ))}
          </div>
        ))}
        <div className="flex gap-[3px] pl-[35px] text-[10px] text-ink-3">
          {['12am', '6am', '12pm', '6pm'].map((l) => <div key={l} className="flex-[6]">{l}</div>)}
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-ink-3">
        <span>Times in {tz}</span>
        <span className="flex items-center gap-1">Fewer {HEAT_COLORS.map((c) => <span key={c} className="size-2.5 rounded-[2px]" style={{ background: c }} />)} More</span>
      </div>
    </Panel>
  )
}

/* ---------- Page ---------- */

export function Dashboard() {
  const { openTopic, setOpenTopic, role, s } = useApp()
  const [tz, setTz] = useState(TIMEZONES[0])
  const [topics, setTopics] = useState<Topic[]>(TOPICS)
  const [manage, setManage] = useState(false)
  const selected = topics.find((t) => t.id === openTopic) ?? null
  const total = topics.filter((t) => !t.archived).reduce((a, t) => a + s(t.count), 0) + s(UNCLASSIFIED.count)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <TopBar tz={tz} setTz={setTz} />
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3.4fr)]">
          <FunnelPanel />
          <TrendPanel />
          <Metrics onUnmatched={() => setOpenTopic('unclassified')} />
        </div>
        <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Breakdown topics={topics} onOpenTopic={setOpenTopic} />
          <BusyHours tz={tz} />
        </div>
      </div>

      <TopicSheet
        topic={selected}
        unclassified={openTopic === 'unclassified'}
        unclassifiedCount={s(UNCLASSIFIED.count)}
        total={total}
        open={!!openTopic}
        onOpenChange={(o) => !o && setOpenTopic(null)}
        onManage={role === 'admin' ? () => { setOpenTopic(null); setManage(true) } : undefined}
      />
      <ManageTopics open={manage} onOpenChange={setManage} topics={topics} setTopics={setTopics} />
    </div>
  )
}
