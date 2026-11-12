import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ArchiveRestore, CalendarClock, CheckCircle2, ArrowDownRight, ArrowUpRight, Minus, ChevronLeft, Archive, ArrowDown, ArrowUp, ChevronRight, CircleHelp, ExternalLink, GitMerge, Lock,
  Info, MoreHorizontal, Pencil, Table2, ArrowRight, X, Plus, Settings2, Split, Sparkles, FlaskConical, Loader2,
} from 'lucide-react'
import { PERIODS, SAMPLE_CHECKED, SAMPLE_CONVERSATIONS, TOPICS, UNCLASSIFIED, changePct, fmt, pct, topicDetail, type EvidenceChat, type Topic, type TopicDetail } from '../data'
import { useApp } from '../state'
import {
  Badge, Button, Card, clsx, SectionHeading, Menu, Term, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Meter, Modal, Sheet, Tip,
} from '../components/ui'

const LOW_VOLUME = 10

type SortKey = 'count' | 'answered' | 'problems' | 'change'

export function TopicsSection() {
  const { s, role, topicsState, mode, setMode, openTopic, setOpenTopic, toast } = useApp()
  const [topics, setTopics] = useState<Topic[]>(TOPICS)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'count', dir: -1 })
  const [tableOpen, setTableOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)

  const active = topics.filter((t) => !t.archived)
  const classified = active.reduce((a, t) => a + s(t.count), 0)
  const unclassified = s(UNCLASSIFIED.count)
  const total = classified + unclassified

  const rows = useMemo(() => {
    const val = (t: Topic) =>
      sort.key === 'count' ? t.count
        : sort.key === 'answered' ? answerRate(t, s(t.count))
        : sort.key === 'problems' ? topicDetail(t).issues.length
        : t.change ?? changePct(t.count, t.prev) ?? 0
    return [...active].sort((a, b) => (val(a) - val(b)) * sort.dir)
  }, [active, sort, s])
  const maxN = Math.max(1, ...active.map((t) => s(t.count)))

  const selected = topics.find((t) => t.id === openTopic) ?? null
  const isUnclassified = openTopic === 'unclassified'

  let body: React.ReactNode
  if (mode === 'test') {
    body = (
      <EmptyBlock
        icon={FlaskConical}
        title="Topics analyze Live conversations only"
        text="Test conversations are short and repetitive, so they would make your topics less accurate."
        action={<Button size="sm" onClick={() => setMode('live')}>Switch to Live</Button>}
      />
    )
  } else if (topicsState === 'lowData') {
    body = (
      <EmptyBlock
        icon={Sparkles}
        title="Topics start after 20 conversations"
        text="TARS needs a few more engaged conversations from the last 90 days to find reliable topics. You don’t need to set anything up."
        extra={
          <div className="mx-auto mt-4 w-64">
            <div className="mb-1.5 flex justify-between text-xs text-ink-3">
              <span>12 of 20 conversations</span>
              <span>60%</span>
            </div>
            <Meter value={0.6} />
          </div>
        }
        action={
          role === 'admin' ? (
            <Button size="sm" onClick={() => toast('Discovery started. Topics may be less accurate with fewer than 20 conversations.')}>
              Discover topics now
            </Button>
          ) : null
        }
      />
    )
  } else if (topicsState === 'classifying') {
    body = (
      <div>
        <div className="flex items-center gap-3 rounded-lg bg-brand-50 p-4">
          <Loader2 className="size-5 shrink-0 animate-spin text-brand-600" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-medium text-ink">Finding your topics…</span>
              <span className="text-ink-2 tnum">Classifying 120 of 400 conversations from the last 90 days</span>
            </div>
            <Meter value={0.3} className="mt-2" />
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-3">This takes a few minutes. You can leave this page, topics appear here when ready.</p>
        <div className="mt-4 space-y-2" aria-hidden>
          {[70, 55, 48, 40, 30].map((w) => (
            <div key={w} className="flex items-center gap-4 py-2">
              <div className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w * 0.4}%` }} />
              <div className="ml-auto h-3 w-10 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  } else {
    const preview = topicsState === 'upgrade'
    const openFromTable = (id: string) => {
      setTableOpen(false)
      setOpenTopic(id)
    }
    const table = (
<div className={clsx('overflow-x-auto', preview && 'pointer-events-none select-none opacity-70')}>
  <table className="w-full min-w-[720px] text-sm">
    <caption className="sr-only">Topics, sorted by {sort.key}</caption>
    <thead>
      <tr className="border-b border-line text-left text-xs text-ink-3">
        <th className="py-2.5 pr-4 font-medium">Topic</th>
        <SortTh label="Conversations" k="count" sort={sort} setSort={setSort} left />
        <SortTh label={<Term def="Share of questions in this topic that got an answer, from the weekly sample.">Got an answer</Term>} k="answered" sort={sort} setSort={setSort} left />
        <SortTh label="Problems" k="problems" sort={sort} setSort={setSort} center />
        <SortTh label="Change" k="change" sort={sort} setSort={setSort} />
        <th className="w-6" />
      </tr>
    </thead>
    <tbody>
      {/* Conversations with no topic sit at the top: they are temporary and the first thing to review. */}
      {!preview && unclassified > 0 && (
        <tr
          tabIndex={0}
          onClick={() => openFromTable('unclassified')}
          onKeyDown={(e) => e.key === 'Enter' && openFromTable('unclassified')}
          className="group cursor-pointer border-b border-line bg-subtle/60 hover:bg-subtle focus-visible:bg-subtle"
        >
          <td className="py-3 pr-4">
            <Tip content="They move into topics at the next weekly check.">
              <span className="cursor-default font-medium text-ink-2">Unknown</span>
            </Tip>
          </td>
          <td className="py-3 pr-4 tnum">
            <span className="font-medium text-ink">{fmt(unclassified)}</span>
            <span className="ml-1.5 text-xs text-ink-3">{total ? pct(unclassified / total) : '—'}</span>
          </td>
          <td className="py-3 pr-4 text-xs text-ink-3">—</td>
          <td className="py-3 pr-4 text-center text-xs text-ink-3">—</td>
          <td className="py-3 pr-4 text-right">
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-danger-700 tnum">
              <ArrowDownRight className="size-3.5" aria-hidden />
              {Math.abs(Math.round(UNCLASSIFIED.change * 100))}%
            </span>
          </td>
          <td className="py-3 text-right">
            <ChevronRight className="ml-auto size-4 text-ink-3 group-hover:text-ink" />
          </td>
        </tr>
      )}
      {rows.map((t) => {
        const n = s(t.count)
        const prev = s(t.prev)
        const low = n < LOW_VOLUME
        const rate = answerRate(t, n)
        const probs = topicDetail(t).issues.length
        return (
          <tr
            key={t.id}
            tabIndex={0}
            onClick={() => openFromTable(t.id)}
            onKeyDown={(e) => e.key === 'Enter' && openFromTable(t.id)}
            className="group cursor-pointer border-b border-line last:border-0 hover:bg-subtle focus-visible:bg-subtle"
          >
            <td className="py-3 pr-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink">{t.name}</span>
                {t.isNew && <Badge tone="brand">New</Badge>}
              </div>
            </td>
            <td className="py-3 pr-4 tnum">
              <div className="flex items-center gap-3">
                <div className="h-2 w-36 shrink-0 overflow-hidden rounded-full bg-n-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${(n / maxN) * 100}%` }} />
                </div>
                <span className="font-medium text-ink">{fmt(n)}</span>
                <span className="-ml-1.5 text-xs text-ink-3">{!total ? '—' : n > 0 && n / total < 0.005 ? '<1%' : pct(n / total)}</span>
              </div>
            </td>
            <td className="py-3 pr-4 tnum">
              {n === 0 ? <span className="text-xs text-ink-3">—</span> : <div className="flex items-center gap-3">
                <div className={clsx('h-2 w-20 shrink-0 overflow-hidden rounded-full', rate < 0.8 ? 'bg-warning-50' : 'bg-n-100')}>
                  <div className={clsx('h-full rounded-full', rate < 0.8 ? 'bg-warning-600' : 'bg-success-600')} style={{ width: `${rate * 100}%` }} />
                </div>
                <span className={clsx('font-medium', rate < 0.8 ? 'text-warning-700' : 'text-ink')}>{pct(rate)}</span>
              </div>}
            </td>
            <td className="py-3 pr-4 text-center">
              {probs > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700 tnum">
                  <AlertTriangle className="size-3" aria-hidden /> {probs}
                </span>
              ) : (
                <span className="text-xs text-ink-3">—</span>
              )}
            </td>
            <td className="py-3 pr-4 text-right">
              {t.isNew ? (
                <span className="text-xs text-ink-3">First seen</span>
              ) : (
                <Tip content={`${fmt(prev)} last period → ${fmt(n)} now${low ? '. Few conversations, so this can swing a lot.' : ''}`}>
                  {/* One number: change in %, whole numbers. Grey when the topic is too small to trust. */}
                  {(() => {
                    const ch = Math.round((t.change ?? changePct(n, prev) ?? 0) * 100)
                    const Icon = ch > 0 ? ArrowUpRight : ch < 0 ? ArrowDownRight : Minus
                    return (
                      <span
                        className={clsx(
                          'inline-flex cursor-default items-center gap-0.5 text-xs font-medium tnum',
                          low || ch === 0 ? 'text-ink-3' : ch > 0 ? 'text-success-700' : 'text-danger-700',
                        )}
                      >
                        <Icon className="size-3.5" aria-hidden />
                        {Math.abs(ch)}%
                      </span>
                    )
                  })()}
                </Tip>
              )}
            </td>
            <td className="py-3 text-right">
              <ChevronRight className="ml-auto size-4 text-ink-3 group-hover:text-ink" />
            </td>
          </tr>
        )
      })}
    </tbody>
  </table>
</div>
    )
    body = (
      <div>
        {preview ? (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4">
            <Lock className="size-5 shrink-0 text-brand-600" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-medium text-ink">See what your customers talk about</div>
              <div className="text-ink-2">Topics is on paid plans. Below is an example from a sample clinic, not your data.</div>
            </div>
            <Button variant="primary" size="sm" onClick={() => toast('Opens plans & billing')}>Upgrade plan</Button>
          </div>
        ) : (
          <Coverage partial={topicsState === 'partial'}
          />
        )}

        {preview ? (
          table
        ) : (
          <>
            <TopicMap topics={active} unclassified={unclassified} total={total} onOpen={(id) => (id === 'more' ? setTableOpen(true) : setOpenTopic(id))} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <Legend
                items={[
                  <><span className="size-2.5 rounded-sm bg-brand-100" />Bigger box = more conversations</>,
                  <><span className="size-2.5 rounded-sm bg-warning-600/30" />Under 80% got an answer</>,
                ]}
              />
              <div className="flex items-center gap-3">
                {active.some((t) => s(t.count) === 0) && (
                  <span className="text-xs text-ink-3 tnum">{active.filter((t) => s(t.count) === 0).length} topics had no conversations</span>
                )}
                <button type="button" onClick={() => setTableOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline">
                  <Table2 className="size-3.5" /> View as table
                </button>
              </div>
            </div>
            <Modal
              open={tableOpen}
              onOpenChange={setTableOpen}
              width="max-w-4xl"
              title="Topics table"
              description="Every topic with its numbers. Click a column to sort, or a row to open the topic."
            >
              {table}
            </Modal>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Heading lives here so Manage topics can sit beside it, like Edit summary. */}
      <SectionHeading
        id="questions-h"
        title="Topics"
        description="What people ask about most. Click a topic to read the conversations."
        actions={
          role === 'admin' && (
            <Button size="sm" onClick={() => setManageOpen(true)}>
              <Settings2 className="size-4" /> Manage topics
            </Button>
          )
        }
      />
      <Card
        id="topics"
        // Title and description live in the group heading above.
      >
        {body}
      </Card>

      <TopicSheet
        topic={selected}
        unclassified={isUnclassified}
        unclassifiedCount={unclassified}
        total={total}
        open={!!openTopic}
        onOpenChange={(o) => !o && setOpenTopic(null)}
        onManage={role === 'admin' ? () => { setOpenTopic(null); setManageOpen(true) } : undefined}
      />
      <ManageTopics open={manageOpen} onOpenChange={setManageOpen} topics={topics} setTopics={setTopics} />
    </>
  )
}

function SortTh({
  label, k, sort, setSort, center, left,
}: { label: React.ReactNode; k: SortKey; sort: { key: SortKey; dir: 1 | -1 }; setSort: (s: { key: SortKey; dir: 1 | -1 }) => void; center?: boolean; left?: boolean }) {
  const on = sort.key === k
  return (
    <th className={clsx('py-2.5 pr-4 font-medium', center ? 'text-center' : left ? 'text-left' : 'text-right')} aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button
        onClick={() => setSort({ key: k, dir: on ? (sort.dir === 1 ? -1 : 1) : -1 })}
        className={clsx('inline-flex items-center gap-1 hover:text-ink', on && 'text-ink')}
      >
        {on && (sort.dir === -1 ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
        {label}
      </button>
    </th>
  )
}

/** Shown only while topics are still being built. */
function Coverage({ partial }: { partial: boolean }) {
  if (!partial) return null
  return (
    <div className="mb-4 space-y-3">
      {partial && (
        <div className="flex items-start gap-2.5 rounded-lg bg-info-50 px-4 py-3 text-sm text-info-700">
          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
          <span>
            <b className="font-semibold">Classified 300 of 400 conversations.</b> Topics may change as more conversations are classified.
          </span>
        </div>
      )}
    </div>
  )
}

function EmptyBlock({
  icon: Icon, title, text, action, extra,
}: { icon: typeof Sparkles; title: string; text: string; action?: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-brand-100 text-brand-600">
        <Icon className="size-5" />
      </span>
      <h4 className="mt-3 text-sm font-semibold text-ink">{title}</h4>
      <p className="mt-1 max-w-md text-sm text-ink-2">{text}</p>
      {extra}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------------- Visual overview of topics ---------------- */
/** Same "Got an answer" as the topic panel, so the map, the chart and the panel agree. */
function answerRate(t: Topic, n: number) {
  const d = topicDetail(t)
  const count = (share: number) => Math.max(1, Math.round(n * share))
  let asked = 0, yes = 0
  d.asks.forEach((a) => {
    const c = count(a.share)
    asked += c
    yes += Math.round(c * a.answered)
  })
  return asked ? yes / asked : d.answered
}

/** Squarified treemap: tiles as close to square as possible, biggest first. Returns boxes in % of the area. */
function treemap<T>(items: { v: number; d: T }[], W = 100, H = 100, keepOrder = false) {
  const out: { x: number; y: number; w: number; h: number; d: T }[] = []
  const total = items.reduce((a, b) => a + b.v, 0) || 1
  let rest = (keepOrder ? [...items] : [...items].sort((a, b) => b.v - a.v)).map((i) => ({ ...i, a: (i.v / total) * W * H }))
  let x = 0, y = 0, w = W, h = H
  const worst = (row: { a: number }[], side: number) => {
    const s = row.reduce((t, r) => t + r.a, 0)
    const mx = Math.max(...row.map((r) => r.a)), mn = Math.min(...row.map((r) => r.a))
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn))
  }
  while (rest.length) {
    const side = Math.min(w, h)
    const row = [rest[0]]
    let i = 1
    while (i < rest.length && worst([...row, rest[i]], side) <= worst(row, side)) row.push(rest[i++])
    rest = rest.slice(i)
    const s = row.reduce((t, r) => t + r.a, 0)
    if (w >= h) {
      const rw = s / h
      let yy = y
      row.forEach((r) => { out.push({ x, y: yy, w: rw, h: r.a / rw, d: r.d }); yy += r.a / rw })
      x += rw; w -= rw
    } else {
      const rh = s / w
      let xx = x
      row.forEach((r) => { out.push({ x: xx, y, w: r.a / rh, h: rh, d: r.d }); xx += r.a / rh })
      y += rh; h -= rh
    }
  }
  return out
}

/** Topic map: tile size = conversations. Orange when fewer than 80% of questions got an answer.
 *  Unknown takes its place by size, like any topic (in grey). Topics under 10 conversations share one tile at the end. */
function TopicMap({ topics, unclassified, total, onOpen }: { topics: Topic[]; unclassified: number; total: number; onOpen: (id: string) => void }) {
  const { s, period } = useApp()
  const ref = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(900)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = 384
  type Tile = { id: string; name: string; n: number; rate: number; kind: 'topic' | 'unknown' | 'more'; ch?: number | null; isNew?: boolean }
  const all: Tile[] = topics
    .map((t) => {
      const n = s(t.count)
      return { id: t.id, name: t.name, n, rate: answerRate(t, n), kind: 'topic' as const, ch: t.change ?? changePct(n, s(t.prev)), isNew: t.isNew }
    })
    .filter((r) => r.n > 0)
  // Rule: 5+ conversations = a box; smaller topics share one tile that opens the table. 0 conversations = left out (noted below).
  const BOX_MIN = 5
  const own: Tile[] = all.filter((r) => r.n >= BOX_MIN)
  if (unclassified > 0) own.push({ id: 'unclassified', name: 'Unknown', n: unclassified, rate: 1, kind: 'unknown', ch: UNCLASSIFIED.change })
  own.sort((a, b) => b.n - a.n)
  const rest = all.filter((r) => r.n < BOX_MIN)
  if (rest.length) own.push({ id: 'more', name: `${rest.length} smaller topics`, n: rest.reduce((a, r) => a + r.n, 0), rate: 1, kind: 'more' })
  // Sizes are softened (power 0.7) so one big topic doesn't squeeze the rest; order and "bigger = more" still hold.
  const tiles = treemap(own.map((r) => ({ v: Math.pow(r.n, 0.7), d: r })), W, H, true)

  const share = (n: number) => (!total ? '—' : n / total < 0.005 ? '<1%' : pct(n / total))
  return (
    <div ref={ref} className="relative h-96 overflow-hidden">
      {tiles.map(({ x, y, w, h, d: r }) => {
        const grey = r.kind !== 'topic'
        const low = !grey && r.rate < 0.8
        const big = w >= 180 && h >= 110
        const fitsName = w >= 76 && h >= 40
        const fitsCount = h >= 58
        const hint = r.kind === 'more' ? 'Each under 5 conversations' : null
        const action = r.kind === 'more' ? 'See all' : null
        return (
          <Tip
            key={r.id}
            content={
              <span className="tnum">
                <b>{r.name}</b>
                <br />
                {fmt(r.n)} conversations ({share(r.n)} of all conversations)
                {r.kind !== 'more' && (r.isNew || r.ch != null) && (
                  <>
                    <br />
                    {r.isNew
                      ? 'New this period'
                      : `${Math.round(r.ch! * 100) > 0 ? 'Up' : Math.round(r.ch! * 100) < 0 ? 'Down' : 'No change,'} ${Math.abs(Math.round(r.ch! * 100))}% vs previous ${PERIODS[period].label.replace('Last ', '')}`}
                  </>
                )}
              </span>
            }
          >
            <button
              onClick={() => onOpen(r.id)}
              aria-label={`${r.name}: ${r.n} conversations`}
              className="group/tile absolute p-0.5 text-left"
              style={{ left: x, top: y, width: w, height: h }}
            >
              <span
                className={clsx(
                  'flex size-full flex-col overflow-hidden rounded-lg transition-colors',
                  big ? 'p-4' : 'p-2.5',
                  r.kind === 'more'
                    ? 'border border-dashed border-line-strong bg-surface group-hover/tile:border-brand-300 group-hover/tile:bg-brand-50/40' // a link to more, not a topic
                    : grey
                      ? 'bg-subtle group-hover/tile:bg-muted'
                      : low ? 'bg-warning-50 group-hover/tile:bg-warning-600/15' : 'bg-brand-50 group-hover/tile:bg-brand-100',
                )}
              >
                {!fitsName && w >= 36 && h >= 30 && <span className="text-xs font-semibold text-ink tnum">{fmt(r.n)}</span>}
                {fitsName && (
                  <>
                    <span
                      className={clsx(
                        h < 70 ? 'line-clamp-1' : 'line-clamp-2',
                        'shrink-0 leading-snug font-medium',
                        big ? 'text-sm' : 'text-xs',
                        grey ? 'text-ink-2' : low ? 'text-warning-700' : 'text-brand-700',
                      )}
                    >
                      {r.name}
                    </span>
                    {fitsCount && r.kind !== 'more' && (
                      <span className="mt-1 flex items-center gap-1.5 tnum">
                        <span className={clsx('font-semibold text-ink', big ? 'text-lg' : 'text-sm')}>{fmt(r.n)}</span>
                        <TileChange ch={r.ch} isNew={r.isNew} note={w >= 240 ? `vs previous ${PERIODS[period].label.replace('Last ', '')}` : undefined} />
                      </span>
                    )}
                    {hint && h >= 100 && <span className="mt-1 line-clamp-2 text-2xs text-ink-3">{hint}</span>}
                    {action && h >= 84 && (
                      <span className="mt-auto pt-2 text-xs font-medium text-brand-600 group-hover/tile:underline">{action} →</span>
                    )}
                  </>
                )}
              </span>
            </button>
          </Tip>
        )
      })}
    </div>
  )
}

/** Change vs the period before, same style as the table: arrow + whole %. Shows on hover. */
function TileChange({ ch, isNew, note }: { ch?: number | null; isNew?: boolean; note?: string }) {
  // Hidden until the tile is hovered or focused, to keep the map calm.
  const hover = 'opacity-0 transition-opacity group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100'
  if (isNew) return <span className={clsx('text-xs font-medium text-brand-700', hover)}>New{note && <span className="ml-1 font-normal text-ink-3">this period</span>}</span>
  if (ch == null) return null
  const v = Math.round(ch * 100)
  const Icon = v > 0 ? ArrowUpRight : v < 0 ? ArrowDownRight : Minus
  return (
    <span className={clsx('inline-flex items-center gap-0.5 text-xs font-medium tnum', v > 0 ? 'text-success-700' : v < 0 ? 'text-danger-700' : 'text-ink-3', hover)}>
      <Icon className="size-3.5" aria-hidden />
      {Math.abs(v)}%
      {note && <span className="ml-1 font-normal whitespace-nowrap text-ink-3">{note}</span>}
    </span>
  )
}

function Legend({ items }: { items: React.ReactNode[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-ink-3">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">{it}</span>
      ))}
    </div>
  )
}

/* ---------------- Topic detail sheet ---------------- */
function TopicSheet({
  topic, unclassified, unclassifiedCount, total, open, onOpenChange, onManage,
}: {
  topic: Topic | null
  unclassified: boolean
  unclassifiedCount: number
  total: number
  open: boolean
  onOpenChange: (o: boolean) => void
  onManage?: () => void
}) {
  const { s, toast, period } = useApp()
  /*
   * Opening a question pushes a second view in from the right, like going one page deeper.
   * Both views sit side by side on a track that slides, so they move together.
   * Back slides it out to the right and returns you to where you were.
   */
  const [ask, setAsk] = useState<AskRow | null>(null) // the question being viewed
  const [shown, setShown] = useState<AskRow | null>(null) // stays rendered while sliding back out
  const [moving, setMoving] = useState(false)
  const [dir, setDir] = useState<'in' | 'back' | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const savedScroll = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const scroller = () => trackRef.current?.closest('.overflow-y-auto') as HTMLElement | null

  useEffect(() => {
    clearTimeout(timer.current)
    setAsk(null)
    setShown(null)
    setMoving(false)
    setDir(null)
  }, [topic?.id, open])
  useEffect(() => () => clearTimeout(timer.current), [])

  const settle = (after?: () => void) => {
    setMoving(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setMoving(false)
      after?.()
    }, 320)
  }
  const openAsk = (a: AskRow) => {
    savedScroll.current = scroller()?.scrollTop ?? 0
    setDir('in')
    setShown(a)
    setAsk(a)
    settle()
    requestAnimationFrame(() => scroller()?.scrollTo({ top: 0, behavior: 'smooth' }))
  }
  const back = () => {
    setDir('back')
    setAsk(null)
    settle(() => setShown(null))
    requestAnimationFrame(() => scroller()?.scrollTo({ top: savedScroll.current, behavior: 'smooth' }))
  }

  if (!topic && !unclassified) return null
  const name = unclassified ? 'Unknown' : topic!.name
  const n = unclassified ? unclassifiedCount : s(topic!.count)
  const count = (share: number, min = 1) => Math.max(min, Math.round(n * share))
  const headAnim = dir === 'in' ? 'anim-push-rtl' : dir === 'back' ? 'anim-push-ltr' : undefined

  const title = ask ? (
    <span key={'t-' + ask.q} className={clsx('block', headAnim)}>
      <button onClick={back} className="mb-4 flex w-fit items-center gap-1 text-xs leading-none font-medium text-brand-600 hover:underline">
        <ChevronLeft className="size-3.5" /> Back
      </button>
      <span className="flex items-center gap-2">
        {ask.q}
        {ask.isNew && <Badge tone="brand">New</Badge>}
      </span>
    </span>
  ) : (
    <span key="t-topic" className={clsx('flex items-center gap-2', headAnim)}>
      {name}
      {topic?.isNew && <Badge tone="brand">New</Badge>}
    </span>
  )
  const description = ask ? (
    <span key={'d-' + ask.q} className={clsx('block tnum', headAnim)}>
      Conversations with this question · {fmt(ask.c)} conversations · {PERIODS[period].label}
    </span>
  ) : (
    <span key="d-topic" className={clsx('block tnum', headAnim)}>
      {fmt(n)} conversations · {total ? pct(n / total) : '—'} of all conversations · {PERIODS[period].label}
    </span>
  )
  const footer = ask ? (
    <Button variant="link" onClick={() => toast('Opens Inbox filtered to this question')}>
      Open all {fmt(ask.c)} in Inbox <ExternalLink className="size-3.5" />
    </Button>
  ) : undefined

  // When a view is fully off screen it collapses, so it doesn't add scroll height or take focus.
  const hideTopic = !!ask && !moving
  const hideAsk = !ask && !moving

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-[600px]"
      title={title}
      description={description}
      footer={footer}
      actions={
        !ask && (
          <>
            <Button size="sm" onClick={() => toast('Opens Inbox filtered to this topic')}>
              View all conversations
            </Button>
          </>
        )
      }
    >
      {unclassified ? (
        <UnclassifiedBody n={n} total={total} onManage={onManage} />
      ) : (
        <div className="-mx-6 overflow-x-hidden">
          <div
            ref={trackRef}
            className="flex w-[200%] items-start transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
            style={{ transform: ask ? 'translateX(-50%)' : 'translateX(0)' }}
          >
            <div className={clsx('w-1/2 px-6', hideTopic && 'invisible h-0 overflow-hidden')} inert={!!ask}>
              <TopicBody topic={topic!} n={n} count={count} onAsk={openAsk} />
            </div>
            <div className={clsx('w-1/2 px-6', hideAsk && 'invisible h-0 overflow-hidden')} inert={!ask}>
              {shown && <AskConversations key={shown.q} ask={shown} />}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function TopicBody({
  topic, n, count, onAsk,
}: { topic: Topic; n: number; count: (share: number, min?: number) => number; onAsk: (a: AskRow) => void }) {
  const d = topicDetail(topic)
  const human = count(d.human, 0)
  // "Got an answer" is counted from the questions below, so the card, the summary and the table always agree.
  const qs = d.asks.map((a) => {
    const c = count(a.share)
    return { c, yes: Math.round(c * a.answered) }
  })
  const asked = qs.reduce((t, q) => t + q.c, 0)
  const answered = asked ? qs.reduce((t, q) => t + q.yes, 0) / asked : d.answered
  const missed = qs.reduce((t, q) => t + q.c - q.yes, 0)
  const [missOpen, setMissOpen] = useState(false)

  return (
    <>
      <SampleNote sample={d.sample} n={n} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Engagement"
          info="People who kept chatting after their first message."
          value={pct(d.kept)}
          details={[`${pct(1 - d.kept)} left after 1 message`]}
        />
        <Stat
          label="Got an answer"
          info="Questions the AI answered, fully or partly."
          value={pct(answered)}
          details={
            missed
              ? [`${pct(missed / asked)} didn’t get an answer`]
              : ['Every question got an answer']
          }
          // Click to see the questions that didn't get an answer
          alertDetail
          onClick={missed ? () => setMissOpen((o) => !o) : undefined}
          open={missOpen}
        />
        <Stat
          label="Handled by AI"
          info="Conversations the AI handled on its own, with no human agent joining."
          value={n ? pct((n - human) / n) : '—'}
          details={[human > 0 ? `Human agent joined ${fmt(human)}` : 'No human agent needed']}
        />
      </div>

      {missOpen && <Unanswered asks={d.asks} count={count} onOpen={onAsk} onClose={() => setMissOpen(false)} />}

      {/* Findings come before the question list: it's the summary, the list is the detail. */}
      <WhatsHappening d={d} />

      {/* Who, then what they ask, then where they came from */}
      {d.profiles && <WhoChats profiles={d.profiles} count={count} />}

      <AsksSection asks={d.asks} count={count} onOpen={onAsk} />

      <Sources sources={d.sources} answered={d.answered} count={count} />
    </>
  )
}

/* ---------------- Where the rates come from ---------------- */
/** Rates and findings come from a weekly sample (each check is an AI call), while counts follow the dates. Said once, in plain words. */
function SampleNote({ sample = 15, n }: { sample?: number; n: number }) {
  const all = sample >= n
  return (
    <div className="group mb-3 flex items-start gap-2 rounded-lg bg-subtle px-3 py-2 text-xs text-ink-2">
      <CalendarClock className="mt-px size-3.5 shrink-0 text-ink-3" />
      <p className="tnum">
        Rates and findings below are from{' '}
        <b className="font-semibold text-ink">{all ? `all ${fmt(n)} conversations` : `${fmt(sample)} sample conversations`}</b>, checked on {SAMPLE_CHECKED}.{' '}
        <Term def="Tars checks a sample of each topic once a week. Conversation counts follow the dates you pick; the rates update at the next weekly check.">
          They update weekly, not with the dates you pick.
        </Term>
      </p>
    </div>
  )
}

/* ---------------- Findings ---------------- */
type HappenKind = 'problem' | 'risk' | 'change' | 'also' | 'working'
type HappenItem = {
  id: string; kind: HappenKind; title: React.ReactNode; plain: string; hint?: string; count?: number; chats?: EvidenceChat[]
  isNew?: boolean; rising?: boolean; asks?: string[]; tracking?: { fixed: string; before: number; now: number }; confirmed?: boolean
  fix?: string // how to fix a problem, shown once the user confirms it
}

/**
 * One line per item; click to open the detail (why, the questions it shows up in, proof, and the confirm step).
 * Problems that were fixed show before → now, so the user sees whether the fix worked.
 */
function WhatsHappening({ d }: { d: TopicDetail }) {
  // Counts are of the weekly sample ("4 of 15 checked"), the same as what Tars actually looked at. No scaling up.
  const sample = d.sample ?? 15
  const inSample = (share: number, min = 1) => Math.min(sample, Math.max(min, Math.round(share * sample)))
  const items: HappenItem[] = [
    ...d.issues.map((it) => ({
      id: 'p' + it.title, kind: 'problem' as const, title: it.title, plain: it.title, hint: it.hint,
      count: it.tracking ? it.tracking.now : inSample(it.share, it.chats.length), chats: it.chats,
      asks: it.asks, tracking: it.tracking, confirmed: it.confirmed, fix: it.fix,
    })),
    ...(d.risks ?? []).map((r) => ({ id: 'r' + r.title, kind: 'risk' as const, title: r.title, plain: r.title, hint: r.hint, count: inSample(r.share, r.chats.length), chats: r.chats })),
    ...d.findings.map((f) => ({
      id: 'c' + f.text, kind: 'change' as const, title: <>More people asking about <b className="font-semibold">{f.text}</b></>, plain: f.text,
      count: inSample(f.share, f.chats.length), chats: f.chats, isNew: f.isNew, rising: f.rising,
    })),
    ...(d.alsoAsked ?? []).flatMap((a) => {
      const t = TOPICS.find((x) => x.id === a.id)
      const name = t ? t.name.charAt(0).toLowerCase() + t.name.slice(1) : ''
      return t
        ? [{
            id: 'a' + a.id, kind: 'also' as const,
            // People asking about this topic also asked about another one (regular weight)
            title: `People also asked about ${name}`,
            plain: t.name, count: a.n, chats: a.chats, fix: a.fix,
            hint: a.hint ?? `After asking about this topic, ${a.n} of ${sample} also asked about ${name}.`,
          }]
        : []
    }),
    ...(d.working ?? []).map((w) => ({
      id: 'w' + w.title, kind: 'working' as const, title: w.title, plain: w.title, hint: w.hint,
      ...(w.share !== undefined ? { count: inSample(w.share, w.chats?.length ?? 1), chats: w.chats } : {}),
    })),
  ]
  // Findings named in d.order come first, in that order; the rest keep their place.
  if (d.order) {
    const rank = (it: HappenItem) => { const i = d.order!.indexOf(it.plain); return i < 0 ? d.order!.length : i }
    items.sort((a, b) => rank(a) - rank(b))
  }

  return (
    <section className="mt-8">
      {/* Colour key sits beside the heading, so it doesn't add a row */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h4 className="text-sm font-semibold text-ink">What’s happening</h4>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
          {(Object.keys(KIND_FILL) as HappenKind[]).filter((k) => items.some((i) => i.kind === k)).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className={clsx('size-2 rounded-sm', KIND_FILL[k].dot)} />{KIND_FILL[k].label}</span>
          ))}
        </div>
      </div>
      <FindingsBars items={items} sample={sample} />
    </section>
  )
}

/** Filled version: the fill colour says what kind of finding it is. */
const KIND_FILL: Record<HappenKind, { fill: string; dot: string; label: string }> = {
  working: { fill: 'bg-success-600/15', dot: 'bg-success-600', label: 'Working well' },
  problem: { fill: 'bg-danger-600/15', dot: 'bg-danger-600', label: 'Problem' },
  risk: { fill: 'bg-warning-600/15', dot: 'bg-warning-600', label: 'Risk' },
  also: { fill: 'bg-brand-200/60', dot: 'bg-brand-400', label: 'Also asked' },
  change: { fill: 'bg-info-600/15', dot: 'bg-info-600', label: 'Change' },
}

/**
 * Each finding is a light track, filled from the left by how many checked conversations had it.
 * The fill colour is its kind; the key beside the heading shows only the kinds in this list. Rows open in place.
 */
function FindingsBars({ items, sample }: { items: HappenItem[]; sample: number }) {
  // Same order as the list; items without a count (working well) go last.
  const counted = items.filter((i) => i.count !== undefined)
  const rest = items.filter((i) => i.count === undefined)
  return (
    <div className="mt-3">
      <ul className="space-y-2">
        {[...counted, ...rest].map((it) => (
          <HappenRow key={it.id} it={it} sample={sample} />
        ))}
      </ul>
    </div>
  )
}

/** Where a fix happens, read from the fix text: Knowledge, Tools, or the agent's instructions. */
const fixPlace = (fix: string) =>
  /Knowledge/.test(fix) ? { label: 'Open Knowledge', place: 'Knowledge' }
  : /tool/i.test(fix) ? { label: 'Open Tools', place: 'Tools' }
  : { label: 'Edit agent', place: 'the agent’s instructions' }

function HappenRow({ it: base, sample }: { it: HappenItem; sample: number }) {
  const { toast } = useApp()
  const [open, setOpen] = useState(false)
  const [answer, setAnswer] = useState<'yes' | 'no' | 'unsure' | null>(base.confirmed ? 'yes' : null)
  // Prototype only: after Yes, pretend the user fixed it and a week passed. ~5s later it happens less (before → now).
  const [sim, setSim] = useState<{ fixed: string; before: number; now: number } | null>(null)
  const simulate = base.kind === 'problem' && !base.tracking && answer === 'yes'
  useEffect(() => {
    if (!simulate) { setSim(null); return }
    const before = base.count ?? 3
    const id = setTimeout(() => setSim({ fixed: 'Oct 18', before, now: 1 }), 5000)
    return () => clearTimeout(id)
  }, [simulate, base.count])
  const it: HappenItem = sim ? { ...base, tracking: sim, count: sim.now } : base
  // Fully fixed (0 now): it's no longer happening, so it leaves What's happening
  if (it.tracking && it.tracking.now === 0) return null
  if (answer === 'no') {
    return (
      <li className="flex items-center justify-between gap-3 rounded-lg bg-subtle px-4 py-2.5 text-xs text-ink-3">
        <span>Marked “{it.plain}” as not a problem</span>
        <button className="font-medium text-brand-600 hover:underline" onClick={() => setAnswer(null)}>Undo</button>
      </li>
    )
  }
  const canOpen = !!(it.hint || it.chats || it.tracking || it.kind === 'problem')
  const v = it.count !== undefined ? it.count / sample : 0
  return (
    <li className={clsx('overflow-hidden rounded-lg', open ? 'border border-line' : '')}>
      <button
        onClick={() => canOpen && setOpen((o) => !o)}
        aria-expanded={canOpen ? open : undefined}
        className={clsx('group relative flex w-full items-center gap-4 bg-subtle px-4 py-3 text-left', canOpen && 'hover:bg-n-100', !open && 'rounded-lg')}
      >
        {/* Closed: fill = how many had it. Open: the kind's colour fills the whole top bar. */}
        {(v > 0 || open) && <span className={clsx('absolute inset-y-0 left-0 transition-[width] duration-300 ease-out motion-reduce:transition-none', KIND_FILL[it.kind].fill)} style={{ width: open ? '100%' : `${v * 100}%` }} aria-hidden />}
        {it.count !== undefined && (
          <span className="relative w-14 shrink-0 text-xs text-ink-3 tnum"><b className="text-sm font-semibold text-ink">{fmt(it.count)}</b> of {fmt(sample)}</span>
        )}
        <span className="relative min-w-0 flex-1 text-sm text-ink">{it.title}</span>
        {!it.tracking && answer === 'yes' && it.kind === 'problem' && <span className="relative shrink-0 text-xs font-medium text-success-700">Checking</span>}
        {answer === 'unsure' && it.kind === 'problem' && <span className="relative shrink-0 text-xs font-medium text-ink-3">Waiting</span>}
        {canOpen && <ChevronRight className={clsx('relative size-4 shrink-0 text-ink-3 transition-transform group-hover:text-ink', open && 'rotate-90')} />}
      </button>
      {/* Evidence keeps the original count; only the row's count moves to "now" */}
      {open && <HappenDetail it={sim ? { ...base, tracking: sim } : base} sample={sample} answer={answer} setAnswer={setAnswer} toast={toast} />}
    </li>
  )
}

type Answer = 'yes' | 'no' | 'unsure' | null
/** What a finding shows when opened: why, evidence, before → now, and the confirm step for problems. */
function HappenDetail({ it, sample, answer, setAnswer, toast }: { it: HappenItem; sample: number; answer: Answer; setAnswer: (a: Answer) => void; toast: (m: string) => void }) {
  return (
    <div className="anim-fade space-y-4 px-4 pt-4 pb-5">
      {it.hint && <p className="text-sm text-ink-2">{it.hint}</p>}

      {/* Evidence first, so people read the conversations before deciding */}
      {it.chats && it.count !== undefined && <Proof chats={it.chats} count={it.count} />}

      {it.tracking && <FixChart t={it.tracking} sample={sample} />}

      {/* Also asked: what to do about it, with a button to the place to do it */}
      {it.kind === 'also' && it.fix && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3">
          <p className="text-sm text-ink"><span className="font-semibold">Try:</span> {it.fix}</p>
          <Button size="sm" variant="primary" onClick={() => toast(`Opens ${fixPlace(it.fix!).place}`)}>{fixPlace(it.fix).label}</Button>
        </div>
      )}

      {/* Problems: the user confirms, and Tars starts checking whether the fix works */}
      {it.kind === 'problem' && !it.tracking && (
        <div>
          {answer === 'yes' ? (
            <div className="space-y-3 rounded-lg border border-line p-3">
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
                <CheckCircle2 className="size-3.5 text-success-700" />
                <span><b className="font-semibold text-success-700">Confirmed.</b> Tars will check new conversations for this every week.</span>
                <button className="font-medium text-brand-600 hover:underline" onClick={() => setAnswer(null)}>Undo</button>
              </p>
              <p className="flex items-center gap-1.5 text-xs text-ink-3">
                <Loader2 className="size-3.5 animate-spin" /> Checking new conversations…
              </p>
              {it.fix && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink"><span className="font-semibold">How to fix:</span> {it.fix}</p>
                  {/* Send them to the place the fix happens */}
                  <Button size="sm" variant="primary" onClick={() => toast(`Opens ${fixPlace(it.fix!).place}`)}>
                    {fixPlace(it.fix).label}
                  </Button>
                </div>
              )}
            </div>
          ) : answer === 'unsure' ? (
            // Uses the weekly check Tars already runs: look again next week, then ask again or hide it
            <div className="rounded-lg border border-line p-3">
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
                <CalendarClock className="size-3.5 text-ink-3" />
                <span><b className="font-semibold text-ink">Tars will look again next week.</b></span>
                <button className="font-medium text-brand-600 hover:underline" onClick={() => setAnswer(null)}>Undo</button>
              </p>
              <p className="mt-1.5 text-xs text-ink-3">If it shows up again, you’ll be asked again with more evidence. If it doesn’t, Tars hides it.</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="mr-1 text-ink-3">Is this a real problem?</span>
              <Button size="sm" className="h-7" onClick={() => setAnswer('yes')}>Yes</Button>
              <Button size="sm" className="h-7" onClick={() => setAnswer('no')}>No</Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setAnswer('unsure')}>Not sure</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** After a fix: is it working? Compares the weekly check before the fix with the latest one. */
function fixState(t: { before: number; now: number }) {
  return t.now === 0 ? 'fixed' : t.now < t.before ? 'better' : 'same'
}
function FixChart({ t, sample }: { t: { fixed: string; before: number; now: number }; sample: number }) {
  const max = sample
  const st = fixState(t)
  // Plain words: when it was fixed, whether it worked, then before vs now
  const rows = [
    { k: 'Before', v: t.before, cls: 'bg-n-300' },
    { k: 'Now', v: t.now, cls: st === 'same' ? 'bg-warning-600' : 'bg-success-600' },
  ]
  return (
    <div className="rounded-lg bg-subtle p-3">
      <p className="text-sm text-ink-2">
        You fixed this on <b className="font-semibold text-ink">{t.fixed}</b>.{' '}
        {st === 'same' ? <span className="text-warning-700">It still happens as often. The fix may need another look.</span> : st === 'fixed' ? 'It doesn’t happen anymore.' : 'It happens less now.'}
      </p>
      <div className="mt-2.5 space-y-1.5">
        {rows.map((r) => (
          <div key={r.k} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 text-xs">
            <span className="text-ink-3">{r.k}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface">
              <span className={clsx('block h-full rounded-full', r.cls)} style={{ width: `${(r.v / max) * 100}%` }} />
            </span>
            <span className="text-ink-3 tnum"><b className="font-semibold text-ink">{fmt(r.v)}</b> of {fmt(sample)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** "See conversations" toggle with the proof conversations underneath. */
function Proof({ chats, count }: { chats: EvidenceChat[]; count: number }) {
  const { toast } = useApp()
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline tnum"
      >
        <ChevronRight className={clsx('size-3.5 transition-transform', open && 'rotate-90')} />
        {open ? 'Hide evidence' : `Evidence from ${count} ${count === 1 ? 'conversation' : 'conversations'}`}
      </button>
      {open && (
        <div className="anim-fade mt-3 space-y-3">
          {chats.map((c, i) => (
            <ChatCard key={c.when + i} chat={c} index={i + 1} of={chats.length} label="Evidence" />
          ))}
          {count > chats.length && (
            <p className="text-xs text-ink-3 tnum">
              Showing {chats.length} of {fmt(count)} conversations ·{' '}
              <button className="font-medium text-brand-600 hover:underline" onClick={() => toast(`Opens Inbox with all ${count} conversations`)}>
                See all {fmt(count)}
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- One-card summary of what to fix ---------------- */
function askRows(asks: TopicDetail['asks'], count: (share: number, min?: number) => number): AskRow[] {
  return asks.map((a) => {
    const c = count(a.share)
    const yes = Math.round(c * a.answered)
    return { ...a, c, no: c - yes, rate: c ? yes / c : 0 }
  })
}

/** Opens from the "Got an answer" card: the questions that didn't get an answer, and the two ways to fix them. */
function Unanswered({
  asks, count, onOpen, onClose,
}: { asks: TopicDetail['asks']; count: (share: number, min?: number) => number; onOpen: (a: AskRow) => void; onClose: () => void }) {
  const { toast } = useApp()
  const rows = askRows(asks, count).filter((r) => r.no > 0).sort((a, b) => b.no - a.no)
  return (
    <div className="anim-fade mt-3 rounded-xl border border-warning-600/40 bg-surface shadow-xs">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <p className="text-sm font-semibold text-ink">Questions that didn’t get an answer</p>
        <button onClick={onClose} aria-label="Close" className="grid size-6 place-items-center rounded-md text-ink-3 hover:bg-subtle hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {rows.map((r) => (
          <li key={r.q}>
            <button onClick={() => onOpen(r)} className="group flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-subtle">
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.q}</span>
              <span className="text-xs text-ink-3 tnum">
                <b className="font-semibold text-warning-700">{fmt(r.no)}</b> of {fmt(r.c)} didn’t get an answer
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-3 group-hover:text-ink" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-1 border-t border-line px-4 py-3">
        <Button size="sm" variant="ghost" className="bg-muted text-ink hover:bg-n-200" onClick={() => toast('Opens the agent’s instructions')}>Edit agent</Button>
        <Button size="sm" variant="primary" onClick={() => toast('Opens Knowledge with these questions ready to answer')}>Improve answers</Button>
      </div>
    </div>
  )
}

/* ---------------- What they ask ---------------- */
type AskRow = TopicDetail['asks'][number] & { c: number; no: number; rate: number }

/** The questions as a plain table (same columns as prod), so What's happening stays the strongest thing on the page. Click a row to see its conversations. */
function AsksSection({
  asks, count, onOpen,
}: { asks: TopicDetail['asks']; count: (share: number, min?: number) => number; onOpen: (a: AskRow) => void }) {
  const rows = askRows(asks, count)
  return (
    <section className="mt-8">
      <h4 className="text-sm font-semibold text-ink">What they ask</h4>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-3">
            <th className="py-2 pr-4 pl-2 font-medium">Question</th>
            <th className="w-28 py-2 pr-4 text-right font-medium">Conversations</th>
            <th className="w-28 py-2 pr-2 text-right font-medium">Got an answer</th>
            <th className="w-6" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.q} tabIndex={0} onClick={() => onOpen(r)} onKeyDown={(e) => e.key === 'Enter' && onOpen(r)} className="group cursor-pointer border-b border-line last:border-0 hover:bg-subtle focus-visible:bg-subtle">
              <td className="py-3 pr-4 pl-2">
                <span className="flex items-center gap-2 text-ink">{r.q}{r.isNew && <Badge tone="brand">New</Badge>}</span>
              </td>
              <td className="py-3 pr-4 text-right font-medium text-ink tnum">{fmt(r.c)}</td>
              {/* Red when some didn't get an answer, the same red as everywhere else */}
              <td className="py-3 pr-2 text-right tnum">
                <span className={clsx('font-medium', r.no > 0 ? 'text-danger-700' : 'text-ink')}>{pct(r.rate)}</span>
              </td>
              <td className="py-3 pr-2"><ChevronRight className="ml-auto size-4 text-ink-3 group-hover:text-ink" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/* ---------------- Who's chatting (customer profiles, moved in from Evaluation) ---------------- */
// Lighter purples fading to gray, so the donut stays calm next to What's happening
const PROFILE_SHADES = [
  'var(--color-brand-500)',
  'var(--color-brand-400)',
  'var(--color-brand-300)',
  'color-mix(in srgb, var(--color-brand-300) 50%, var(--color-brand-200))',
  'var(--color-brand-200)',
  'var(--color-n-300)',
]

/**
 * Who is chatting in this topic: just a donut. Hover (or focus) a slice to see who it is; the middle and the line
 * beside the donut follow the hovered slice.
 */
function WhoChats({ profiles, count }: { profiles: NonNullable<TopicDetail['profiles']>; count: (share: number, min?: number) => number }) {
  const [hover, setHover] = useState(0)
  const rows = profiles.map((p, i) => ({ ...p, c: count(p.share), color: PROFILE_SHADES[i % PROFILE_SHADES.length] }))
  const R = 15.9155
  let off = 25
  const shown = rows[hover] ?? rows[0]
  return (
    <section className="mt-8">
      {/* Hint sits beside the heading, like the colour keys in the other sections */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h4 className="text-sm font-semibold text-ink">Who’s chatting</h4>
        <p className="flex items-center gap-1.5 text-xs text-ink-3"><Info className="size-3.5 shrink-0" aria-hidden />Hover the chart to see each group.</p>
      </div>

        <div className="mt-3 flex items-center gap-6" onMouseLeave={() => setHover(0)}>
          <svg viewBox="0 0 42 42" className="size-32 shrink-0" role="img" aria-label={rows.map((r) => `${r.name} ${pct(r.share)}`).join(', ')}>
            {rows.map((r, i) => {
              const el = (
                <circle
                  key={r.name}
                  cx="21" cy="21" r={R} fill="none" stroke={r.color}
                  strokeWidth={hover === i ? 6.5 : 5}
                  strokeDasharray={`${r.share * 100 - 0.6} ${100 - r.share * 100 + 0.6}`}
                  strokeDashoffset={off}
                  className="cursor-pointer transition-[stroke-width] duration-150 outline-none"
                  tabIndex={0}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                >
                  <title>{`${r.name}: ${pct(r.share)}`}</title>
                </circle>
              )
              off -= r.share * 100
              return el
            })}
            <text x="21" y="22.5" textAnchor="middle" className="pointer-events-none fill-ink text-[7px] font-semibold">{pct(shown.share)}</text>
          </svg>
          {/* The hovered slice, in words, to the right of the donut */}
          <div className="min-w-0">
            {/* The hovered group: name and numbers */}
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: shown.color }} />
              {shown.name}
            </p>
            <p className="mt-1.5 text-xs text-ink-3 tnum">
              <b className="text-sm font-semibold text-ink">{pct(shown.share)}</b> of this topic · <b className="text-sm font-semibold text-ink">{fmt(shown.c)}</b> conversations
            </p>
          </div>
        </div>
    </section>
  )
}

/* ---------------- Where they came from ---------------- */
/** One bar per page: length = conversations, split into answered (purple) and not answered (red). */
function Sources({ sources, answered, count }: { sources: TopicDetail['sources']; answered: number; count: (share: number, min?: number) => number }) {
  const known = sources.reduce((t, x) => t + x.share, 0)
  const parts = [
    ...sources.map((x) => ({ name: x.name === '/' ? 'Home page' : x.name, share: x.share, answered: x.answered ?? answered })),
    ...(known < 0.99 ? [{ name: 'Other pages', share: 1 - known, answered }] : []),
  ].map((x) => {
    const c = count(x.share, 0)
    const no = c - Math.round(c * x.answered)
    return { ...x, c, no }
  })
  const max = Math.max(...parts.map((x) => x.c), 1)
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h4 className="text-sm font-semibold text-ink">Where these conversations came from</h4>
        <div className="flex gap-4 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brand-400" />Answered</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-danger-600" />Not answered</span>
        </div>
      </div>
      <ul className="mt-3 space-y-1">
        {parts.map((x) => (
          // The numbers show on hover (or keyboard focus), so the bars stay clean by default
          <li key={x.name} tabIndex={0} className="group rounded-md px-2 py-2 outline-none hover:bg-subtle focus-visible:bg-subtle">
            <span className="flex items-center gap-2 text-sm">
              <span className={clsx('min-w-0 flex-1 truncate', x.name === 'Other pages' ? 'text-ink-3' : 'text-ink')}>{x.name}</span>
              <span className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                {x.no > 0 && <span className="text-xs text-danger-700 tnum">{fmt(x.no)} not answered</span>}
                <span className="text-xs text-ink-3 tnum"><b className="text-sm font-medium text-ink">{fmt(x.c)}</b> conversations</span>
              </span>
            </span>
            <span className="mt-1.5 flex h-1.5 gap-px overflow-hidden rounded-full" style={{ width: `${(x.c / max) * 100}%` }}>
              <span className="bg-brand-400" style={{ flexGrow: x.c - x.no, flexBasis: 0 }} />
              {x.no > 0 && <span className="bg-danger-600" style={{ flexGrow: x.no, flexBasis: 0 }} />}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------------- One question: its conversations ---------------- */
type AskConv = {
  id: number
  when: string
  channel: string
  answered: boolean
  outcome: 'reached' | 'left' | 'open'
  length: string
  tools: string[]
  customer: number
  ai: number
  human: number
  from: string
  chat: EvidenceChat
}

const TIMES = ['9:56 pm', '1:54 pm', '12:21 pm', '7:21 am', '6:12 pm', '10:40 am', '3:05 pm', '8:18 pm']
const FROM = ['Google · Mobile', 'Direct link · Desktop', 'Google · Desktop', 'Facebook ad · Mobile']

function buildConvs(ask: AskRow): AskConv[] {
  return Array.from({ length: ask.c }, (_, i) => {
    const answered = i >= ask.no // the ones without an answer come first
    const missed = ask.missed?.[i % (ask.missed?.length || 1)]
    const chat: EvidenceChat =
      !answered && missed
        ? missed
        : {
            when: '',
            msgs: [
              { from: 'customer', text: ask.q },
              answered
                ? { from: 'ai', text: ask.answer ?? 'Yes, happy to help. Here’s what you need to know, and our team can share more if you’d like.' }
                : { from: 'ai', text: 'I’m not sure about that. Our team can help.', mark: 'I’m not sure' },
            ],
          }
    const customer = 2 + ((i * 3) % 4)
    return {
      id: i,
      when: `Sep ${22 - Math.floor(i * 0.8)}, ${TIMES[i % TIMES.length]}`,
      channel: i % 4 === 2 ? 'WhatsApp' : 'Web',
      answered,
      outcome: !answered ? 'left' : i % 5 === 4 ? 'open' : 'reached',
      length: `${2 + ((i * 7) % 9)}m ${(i * 13) % 60}s`,
      tools: i % 3 === 0 ? ['Searched your knowledge', 'Showed a card'] : ['Searched your knowledge'],
      customer,
      ai: customer,
      human: 0,
      from: FROM[i % FROM.length],
      chat,
    }
  })
}

// Same badges as production: still going, finished with an outcome, or left without one
const OUTCOME = {
  open: { label: 'Open', cls: 'border border-line-strong bg-surface text-ink-2' },
  reached: { label: 'Outcome reached', cls: 'bg-success-50 text-success-700' },
  left: { label: 'Abandoned', cls: 'bg-warning-50 text-warning-700' },
} as const

function AskConversations({ ask }: { ask: AskRow }) {
  const convs = useMemo(() => buildConvs(ask), [ask])
  const [openId, setOpenId] = useState<number | null>(ask.no > 0 ? 0 : null)
  const [limit, setLimit] = useState(8)
  const list = convs // unanswered ones are already first

  return (
    <>
      {ask.no > 0 && (
        <div className="mb-4 flex gap-3 rounded-lg border border-warning-600/25 bg-warning-50 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-600" />
          <div>
            <p className="font-medium text-ink tnum">{fmt(ask.no)} of {fmt(ask.c)} didn’t get an answer</p>
            <p className="mt-0.5 text-ink-2">{ask.why ?? 'The AI said it wasn’t sure.'}</p>
          </div>
        </div>
      )}

      {/* Scrolls sideways when the panel is narrow */}
      <div className="-mx-6 overflow-x-auto px-6 pb-2">
      <table className="w-full min-w-[800px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-3">
            <th className="py-2.5 pr-8 font-medium whitespace-nowrap">Started</th>
            <th className="py-2.5 pr-8 font-medium">Channel</th>
            <th className="py-2.5 pr-8 font-medium">Outcome</th>
            <th className="py-2.5 pr-8 text-center font-medium">Turns</th>
            <th className="py-2.5 pr-8 text-center font-medium">Length</th>
            <th className="py-2.5 pr-8 text-center font-medium">Tools</th>
            <th className="w-6" />
          </tr>
        </thead>
        <tbody>
          {list.slice(0, limit).map((c) => {
            const isOpen = openId === c.id
            const o = OUTCOME[c.outcome]
            return (
              <Fragment key={c.id}>
                <tr
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : c.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setOpenId(isOpen ? null : c.id)}
                  className={clsx('group cursor-pointer border-b border-line hover:bg-subtle', isOpen && 'bg-subtle')}
                >
                  <td className="py-3.5 pr-8 whitespace-nowrap text-ink tnum">{c.when}</td>
                  <td className="py-3.5 pr-8 text-ink-2">{c.channel}</td>
                  <td className="py-3.5 pr-8">
                    <span className={clsx('inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap', o.cls)}>{o.label}</span>
                  </td>
                  <td className="py-3.5 pr-8 text-center font-medium text-ink tnum">{c.outcome === 'open' ? '—' : c.customer}</td>
                  <td className="py-3.5 pr-8 text-center font-medium whitespace-nowrap text-ink tnum">{c.outcome === 'open' ? '—' : c.length}</td>
                  <td className="py-3.5 pr-8 text-center" onClick={(e) => e.stopPropagation()}>
                    <Tip content={c.tools.join(' · ')}>
                      <span className="cursor-help font-medium text-ink tnum">{c.tools.length}</span>
                    </Tip>
                  </td>
                  <td className="py-3 text-right">
                    <ChevronRight className={clsx('ml-auto size-4 text-ink-3 transition-transform group-hover:text-ink', isOpen && 'rotate-90')} />
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-line bg-subtle">
                    <td colSpan={7} className="px-3 pt-1 pb-4">
                      <div className="anim-fade sticky left-3 w-[568px] max-w-[calc(100vw-72px)] space-y-3">
                        <ChatCard chat={{ ...c.chat, when: c.when }} />
                        <div>
                          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3 tnum">
                            <div><dt className="inline">Messages: </dt><dd className="inline text-ink-2">{c.customer} from customer · {c.ai} from AI · {c.human} from a human agent</dd></div>
                            <div><dt className="inline">Came from: </dt><dd className="inline text-ink-2">{c.from}</dd></div>
                            <div><dt className="inline">Tools: </dt><dd className="inline text-ink-2">{c.tools.join(' · ')}</dd></div>
                          </dl>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      </div>
      {list.length > limit && (
        <button onClick={() => setLimit((l) => l + 8)} className="mt-3 text-sm font-medium text-brand-600 hover:underline tnum">
          Show {Math.min(8, list.length - limit)} more
        </button>
      )}
    </>
  )
}

/** One proof chat. Customer lines are tinted, AI replies stay short until opened, clicks show as chips. */
function ChatCard({ chat, index, of, label = 'Conversation' }: { chat: EvidenceChat; index?: number; of?: number; label?: string }) {
  const { toast } = useApp()
  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 text-xs">
        <span className="text-ink-3 tnum">{index !== undefined ? `${label} ${index} of ${of} · ` : ''}{chat.when}</span>
        <button className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline" onClick={() => toast('Opens this conversation in Inbox')}>
          Open conversation <ExternalLink className="size-3" />
        </button>
      </div>
      <div className="space-y-2 p-3">
        {chat.msgs.map((m, i) =>
          m.from === 'click' ? (
            <div key={i} className="flex justify-end">
              <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2">Clicked: {m.text}</span>
            </div>
          ) : m.from === 'customer' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-brand-50 px-3 py-2 text-sm text-ink">
                <span className="mb-0.5 block text-2xs text-ink-3">Customer</span>
                <ChatText text={m.text} mark={m.mark} />
              </div>
            </div>
          ) : (
            <AiReply key={i} text={m.text} mark={m.mark} />
          ),
        )}
      </div>
    </div>
  )
}

function AiReply({ text, mark }: { text: string; mark?: string }) {
  const long = text.length > 140
  const [more, setMore] = useState(!long || !!mark)
  return (
    <div className="max-w-[85%] rounded-lg rounded-tl-sm border border-line px-3 py-2 text-sm text-ink-2">
      <span className="mb-0.5 block text-2xs text-ink-3">AI reply</span>
      <p className={clsx(!more && 'line-clamp-2')}>
        <ChatText text={text} mark={mark} />
      </p>
      {long && (
        <button className="mt-1 text-xs font-medium text-brand-600 hover:underline" onClick={() => setMore((m) => !m)}>
          {more ? 'Show less' : 'Show full reply'}
        </button>
      )}
    </div>
  )
}

/** Shows [label](url) as a real link and highlights the words that prove the finding. */
function ChatText({ text, mark }: { text: string; mark?: string }) {
  const parts: React.ReactNode[] = []
  const re = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  const pushText = (t: string, key: string) => {
    const at = mark ? t.toLowerCase().indexOf(mark.toLowerCase()) : -1
    if (at < 0) return parts.push(<span key={key}>{t}</span>)
    parts.push(
      <span key={key}>
        {t.slice(0, at)}
        <mark className="rounded-sm bg-warning-600/20 px-0.5 text-ink">{t.slice(at, at + mark!.length)}</mark>
        {t.slice(at + mark!.length)}
      </span>,
    )
  }
  while ((m = re.exec(text))) {
    pushText(text.slice(last, m.index), 't' + last)
    parts.push(
      <a key={'a' + m.index} href={m[2]} onClick={(e) => e.preventDefault()} className="font-medium text-brand-600 underline">
        {m[1]}
      </a>,
    )
    last = m.index + m[0].length
  }
  pushText(text.slice(last), 't' + last)
  return <>{parts}</>
}

function UnclassifiedBody({ n, total, onManage }: { n: number; total: number; onManage?: () => void }) {
  const { toast } = useApp()
  const convs = SAMPLE_CONVERSATIONS.map((c, i) => ({ ...c, first: ['Hi', 'Can I talk to someone?', 'ok thanks', 'My son starts school next week, what should I do', 'Hello??', 'Do you do couples therapy?'][i] }))
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Conversations" value={fmt(n)} />
        <Stat label="Share of all conversations" value={total ? pct(n / total) : '—'} />
      </div>
      <div className="mt-5 rounded-lg border border-line bg-subtle p-4 text-sm text-ink-2">
        <p className="font-medium text-ink">Why conversations end up here</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Greetings or one-word messages with nothing to sort</li>
          <li>Subjects no topic covers yet, like <i>couples therapy</i> or <i>school support</i></li>
        </ul>
        {onManage && (
          <Button size="sm" className="mt-3" onClick={onManage}>
            <Sparkles className="size-4" /> Find missing topics
          </Button>
        )}
      </div>
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink">Recent conversations</h4>
          <span className="text-xs text-ink-3">Showing 6 of {fmt(n)}</span>
        </div>
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
          {convs.map((c) => (
            <li key={c.who + c.when}>
              <button onClick={() => toast(`Opens conversation with ${c.who}`)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-subtle">
                <span className="min-w-0 truncate text-sm text-ink">“{c.first}”</span>
                <span className="shrink-0 text-xs text-ink-3">{c.when}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

/** Same look as the Summary cards: label, big number, then one detail line under a divider. */
function Stat({
  label, value, sub, warn, details, info, onClick, open, alertDetail,
}: { label: string; value: string; sub?: React.ReactNode; warn?: boolean; details?: string[]; info?: string; onClick?: () => void; open?: boolean; alertDetail?: boolean }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-expanded={onClick ? open : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className={clsx(
        'group flex flex-col rounded-xl border p-4 shadow-xs',
        warn ? 'border-warning-600/30 bg-warning-50' : 'border-line bg-surface',
        onClick && 'cursor-pointer transition-shadow hover:shadow-md',
        open && 'ring-2 ring-brand-200',
      )}
    >
      <div className="text-xs text-ink-3">{info ? <Term def={info}>{label}</Term> : label}</div>
      <div className={clsx('mt-3 text-md leading-none font-semibold tracking-tight', warn ? 'text-warning-700' : 'text-ink')}>{value}</div>
      {sub && <div className="mt-0.5">{sub}</div>}
      {details && (
        <ul className={clsx('mt-4 space-y-0.5 border-t pt-3 text-xs text-ink-2 tnum', warn ? 'border-warning-600/20' : 'border-line')}>
          {details.map((x, li) => (
            <li key={x} className="flex items-center gap-1">
              <span>
                {x.split(/(\d+%)/).map((part, i) =>
                  /^\d+%$/.test(part) ? (
                    // alertDetail: the number is a problem (e.g. "8% didn’t get an answer"), so it's orange like every other "didn’t get an answer"
                    <b key={i} className={clsx('font-semibold', alertDetail ? 'text-warning-700' : 'text-ink')}>{part}</b>
                  ) : (
                    part
                  ),
                )}
              </span>
              {/* When the card opens something, the arrow sits at the end of the line and shows on hover */}
              {onClick && li === details.length - 1 && (
                <ArrowRight className={clsx('size-3.5 shrink-0 text-ink-3 transition-all', open ? 'rotate-90 opacity-100' : 'opacity-0 group-hover:opacity-100')} aria-hidden />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ---------------- Manage topics ---------------- */
type Action =
  | { kind: 'rename' | 'archive' | 'split' | 'merge'; topic: Topic }
  | { kind: 'add' }
  | { kind: 'discover' }
  | null

function ManageTopics({
  open, onOpenChange, topics, setTopics,
}: { open: boolean; onOpenChange: (o: boolean) => void; topics: Topic[]; setTopics: (t: Topic[]) => void }) {
  const { toast } = useApp()
  const [action, setAction] = useState<Action>(null)
  const [text, setText] = useState('')
  const [text2, setText2] = useState('')
  const [target, setTarget] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const active = topics.filter((t) => !t.archived)
  const archived = topics.filter((t) => t.archived)

  const start = (a: Action) => {
    setAction(a)
    setText(a && 'topic' in a && a.kind === 'rename' ? a.topic.name : '')
    setText2('')
    setTarget('')
  }
  const done = (msg: string) => {
    setAction(null)
    toast(msg)
  }
  const dupe = (name: string, except?: string) => active.some((t) => t.id !== except && t.name.toLowerCase() === name.trim().toLowerCase())

  let panel: React.ReactNode = null
  if (action) {
    const t = 'topic' in action ? action.topic : null
    const impact = (msg: string, ai = true) => (
      <div className={clsx('mt-4 flex gap-2.5 rounded-lg p-3 text-sm', ai ? 'bg-info-50 text-info-700' : 'bg-subtle text-ink-2')}>
        <CircleHelp className="mt-0.5 size-4 shrink-0" />
        <span>{msg}</span>
      </div>
    )
    const field = (label: string, v: string, set: (v: string) => void, placeholder?: string, error?: string) => (
      <label className="mt-3 block">
        <span className="text-sm font-medium text-ink">{label}</span>
        <input
          autoFocus
          value={v}
          placeholder={placeholder}
          onChange={(e) => set(e.target.value)}
          aria-invalid={!!error}
          className={clsx(
            'mt-1.5 h-9 w-full rounded-lg border px-3 text-sm outline-none focus:shadow-[0_0_0_3px_#632e9a38]',
            error ? 'border-danger-600' : 'border-line-strong focus:border-brand-600',
          )}
        />
        {error && <span className="mt-1 block text-xs text-danger-700">{error}</span>}
      </label>
    )
    const footer = (label: string, onConfirm: () => void, disabled = false, danger = false) => (
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={() => setAction(null)}>Back</Button>
        <Button variant={danger ? 'danger' : 'primary'} disabled={disabled} onClick={onConfirm}>
          {label}
        </Button>
      </div>
    )
    if (action.kind === 'rename' && t) {
      const err = text.trim() && dupe(text, t.id) ? 'Another active topic already has this name.' : undefined
      panel = (
        <>
          <h4 className="font-semibold">Rename “{t.name}”</h4>
          {field('New name', text, setText, undefined, err)}
          {impact('Only the name changes. No conversations are sorted again.', false)}
          {footer('Rename', () => {
            setTopics(topics.map((x) => (x.id === t.id ? { ...x, name: text.trim() } : x)))
            done(`Renamed to “${text.trim()}”`)
          }, !text.trim() || !!err)}
        </>
      )
    } else if (action.kind === 'merge' && t) {
      const into = active.find((x) => x.id === target)
      panel = (
        <>
          <h4 className="font-semibold">Merge “{t.name}” into another topic</h4>
          <div className="mt-3 grid gap-1.5">
            {active.filter((x) => x.id !== t.id).map((x) => (
              <label key={x.id} className={clsx('flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm', target === x.id ? 'border-brand-600 bg-brand-50' : 'border-line hover:bg-subtle')}>
                <input type="radio" name="merge" className="accent-brand-600" checked={target === x.id} onChange={() => setTarget(x.id)} />
                <span className="flex-1">{x.name}</span>
                <span className="text-xs text-ink-3 tnum">{x.count}</span>
              </label>
            ))}
          </div>
          {impact(
            into
              ? `All ${t.count} conversations move to “${into.name}” at once (${into.count} → ${into.count + t.count}). No AI call is made. “${t.name}” is archived.`
              : 'Choose the topic to merge into.',
            false,
          )}
          {footer('Merge topics', () => {
            setTopics(topics.map((x) => (x.id === into!.id ? { ...x, count: x.count + t.count, prev: x.prev + t.prev } : x.id === t.id ? { ...x, archived: true } : x)))
            done(`Merged into “${into!.name}”`)
          }, !into)}
        </>
      )
    } else if (action.kind === 'split' && t) {
      panel = (
        <>
          <h4 className="font-semibold">Split “{t.name}”</h4>
          <p className="mt-1 text-sm text-ink-2">Name the new topics. TARS will sort this topic’s conversations into them.</p>
          {field('New topic 1', text, setText, 'e.g. Insurance coverage')}
          {field('New topic 2', text2, setText2, 'e.g. Self-pay pricing')}
          {impact(`This reclassifies ${t.count + 61} conversations from the last 90 days into the new topics. “${t.name}” is archived. Takes a few minutes.`)}
          {footer('Split and reclassify', () => {
            const half = Math.ceil(t.count / 2)
            setTopics([
              ...topics.map((x) => (x.id === t.id ? { ...x, archived: true } : x)),
              { ...t, id: t.id + '-a', name: text.trim(), count: half, prev: Math.ceil(t.prev / 2), isNew: true },
              { ...t, id: t.id + '-b', name: text2.trim(), count: t.count - half, prev: Math.floor(t.prev / 2), isNew: true },
            ])
            done('Splitting… conversations are being reclassified')
          }, !text.trim() || !text2.trim() || dupe(text) || dupe(text2))}
        </>
      )
    } else if (action.kind === 'archive' && t) {
      panel = (
        <>
          <h4 className="font-semibold">Archive “{t.name}”?</h4>
          {impact('TARS stops using this topic for new conversations. Past counts stay in your reports. You can restore it any time.', false)}
          {footer('Archive topic', () => {
            setTopics(topics.map((x) => (x.id === t.id ? { ...x, archived: true } : x)))
            done(`Archived “${t.name}”`)
          }, false, true)}
        </>
      )
    } else if (action.kind === 'add') {
      const err = text.trim() && dupe(text) ? 'Another active topic already has this name.' : undefined
      panel = (
        <>
          <h4 className="font-semibold">Add a topic</h4>
          {field('Name', text, setText, 'e.g. Couples therapy', err)}
          <label className="mt-3 block">
            <span className="text-sm font-medium text-ink">What belongs here? <span className="font-normal text-ink-3">(optional)</span></span>
            <textarea
              value={text2}
              onChange={(e) => setText2(e.target.value)}
              rows={2}
              placeholder="Questions about therapy for couples or partners"
              className="mt-1.5 w-full rounded-lg border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-600 focus:shadow-[0_0_0_3px_#632e9a38]"
            />
            <span className="text-xs text-ink-3">A short description helps TARS sort conversations more accurately.</span>
          </label>
          {impact('This reclassifies 412 conversations from the last 90 days so they can match the new topic. Takes a few minutes.')}
          {footer('Add and reclassify', () => {
            setTopics([...topics, { id: 'new-' + Date.now(), name: text.trim(), description: text2 || 'Added by an admin.', count: 0, prev: 0, outcomeRate: 0, isNew: true, examples: ['—'] }])
            done(`Added “${text.trim()}”. Reclassifying…`)
          }, !text.trim() || !!err)}
        </>
      )
    } else if (action.kind === 'discover') {
      panel = (
        <>
          <h4 className="font-semibold">Discover topics now</h4>
          <p className="mt-1 text-sm text-ink-2">
            TARS reads conversations from the last 90 days and suggests topics. This normally runs once a week on its own.
          </p>
          {impact('Your current topics stay. You review the suggestions before anything changes.')}
          {footer('Start discovery', () => {
            setAction(null)
            setDiscovering(true)
            // Prototype: finish after a few seconds so the done state can be seen.
            setTimeout(() => {
              setDiscovering(false)
              toast('Done. TARS found 2 new topic ideas for you to review.')
            }, 8000)
          })}
        </>
      )
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setAction(null)
      }}
      title="Manage topics"
      description={`${active.length} of 200 active topics · only admins can make changes`}
      width="max-w-[640px]"
    >
      {panel ? (
        <div className="anim-fade">{panel}</div>
      ) : (
        <>
          {discovering && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-info-50 px-4 py-3 text-sm text-info-700">
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
              <span>
                <b className="font-semibold">Finding new topics… about 5 min left.</b> You can rename topics now. Merge, split and archive open when it’s done.
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" disabled={discovering} onClick={() => start({ kind: 'add' })}>
              <Plus className="size-4" /> Add topic
            </Button>
            <Button size="sm" disabled={discovering} onClick={() => start({ kind: 'discover' })}>
              <Sparkles className="size-4" /> Discover topics now
            </Button>
          </div>
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
            {active.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-ink">
                    {t.name} {t.isNew && <Badge tone="brand">New</Badge>}
                  </div>
                  <div className="truncate text-xs text-ink-3">{t.description}</div>
                </div>
                <span className="text-xs text-ink-3 tnum">{t.count} conv.</span>
                <Menu>
                  <MenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="size-8 px-0" aria-label={`Actions for ${t.name}`}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </MenuTrigger>
                  <MenuContent>
                    <MenuItem onSelect={() => start({ kind: 'rename', topic: t })}><Pencil className="size-4 text-ink-3" /> Rename</MenuItem>
                    <MenuItem disabled={discovering} onSelect={() => start({ kind: 'merge', topic: t })}><GitMerge className="size-4 text-ink-3" /> Merge into…</MenuItem>
                    <MenuItem disabled={discovering} onSelect={() => start({ kind: 'split', topic: t })}><Split className="size-4 text-ink-3" /> Split…</MenuItem>
                    <MenuSeparator />
                    <MenuItem danger disabled={discovering} onSelect={() => start({ kind: 'archive', topic: t })}><Archive className="size-4" /> Archive</MenuItem>
                  </MenuContent>
                </Menu>
              </li>
            ))}
          </ul>
          {archived.length > 0 && (
            <>
              <h4 className="mt-5 mb-2 text-xs font-medium text-ink-3">Archived</h4>
              <ul className="divide-y divide-line rounded-lg border border-line bg-subtle">
                {archived.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-3 py-2.5 text-sm text-ink-2">
                    <span className="flex-1">{t.name}</span>
                    <Tip content="Makes the topic available again. Past conversations aren’t changed.">
                      <Button size="sm" variant="ghost" onClick={() => { setTopics(topics.map((x) => (x.id === t.id ? { ...x, archived: false } : x))); toast(`Restored “${t.name}”`) }}>
                        <ArchiveRestore className="size-4" /> Restore
                      </Button>
                    </Tip>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Sheet>
  )
}
