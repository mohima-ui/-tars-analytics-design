import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArchiveRestore, Archive, ArrowDown, ArrowUp, ChevronRight, CircleHelp, ExternalLink, GitMerge, Lock,
  MoreHorizontal, Pencil, Plus, Search, Settings2, Split, Sparkles, FlaskConical, Loader2,
} from 'lucide-react'
import { GLOSSARY, SAMPLE_CONVERSATIONS, TOPICS, TOPIC_WEEKLY, UNCLASSIFIED, changePct, fmt, pct, type Topic } from '../data'
import { useApp } from '../state'
import {
  Badge, Button, Card, clsx, Delta, InfoTip, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Meter, Modal, Sheet, Term, Tip,
} from '../components/ui'
import { Sparkline } from '../components/charts'

const LOW_VOLUME = 10
const ATTENTION = 0.65

type SortKey = 'count' | 'outcomeRate' | 'change'

export function TopicsSection() {
  const { s, role, topicsState, mode, setMode, openTopic, setOpenTopic, toast } = useApp()
  const [topics, setTopics] = useState<Topic[]>(TOPICS)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'count', dir: -1 })
  const [expanded, setExpanded] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)

  const active = topics.filter((t) => !t.archived)
  const classified = active.reduce((a, t) => a + s(t.count), 0)
  const unclassified = s(UNCLASSIFIED.count)
  const total = classified + unclassified
  const coverage = total ? classified / total : 0

  const rows = useMemo(() => {
    const val = (t: Topic) =>
      sort.key === 'count' ? t.count : sort.key === 'outcomeRate' ? t.outcomeRate : t.count - t.prev
    return [...active].sort((a, b) => (val(a) - val(b)) * sort.dir)
  }, [active, sort])
  const visible = expanded ? rows : rows.slice(0, 6)

  const selected = topics.find((t) => t.id === openTopic) ?? null
  const isUnclassified = openTopic === 'unclassified'

  const header = (
    <>
      {role === 'admin' && topicsState !== 'upgrade' && mode === 'live' && (
        <Button size="sm" onClick={() => setManageOpen(true)}>
          <Settings2 className="size-4" /> Manage topics
        </Button>
      )}
    </>
  )

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
          <Coverage
            classified={classified}
            total={total}
            coverage={coverage}
            partial={topicsState === 'partial'}
            onReview={() => setOpenTopic('unclassified')}
            onDiscover={role === 'admin' ? () => setManageOpen(true) : undefined}
          />
        )}

        <div className={clsx('overflow-x-auto', preview && 'pointer-events-none select-none opacity-70')}>
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">Topics, sorted by {sort.key}</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-3">
                <th className="py-2.5 pr-4 font-medium">Topic</th>
                <SortTh label="Conversations" k="count" sort={sort} setSort={setSort} />
                <th className="w-40 py-2.5 pr-4 font-medium">Share</th>
                <SortTh
                  label={<Term def="Share of conversations in this topic that reached your goal.">Outcome rate</Term>}
                  k="outcomeRate"
                  sort={sort}
                  setSort={setSort}
                />
                <SortTh label="Change" k="change" sort={sort} setSort={setSort} />
                <th className="py-2.5 pr-2 text-right font-medium">Last 6 weeks</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const n = s(t.count)
                const prev = s(t.prev)
                const low = n < LOW_VOLUME
                const needs = t.outcomeRate < ATTENTION && !low
                return (
                  <tr
                    key={t.id}
                    tabIndex={0}
                    onClick={() => setOpenTopic(t.id)}
                    onKeyDown={(e) => e.key === 'Enter' && setOpenTopic(t.id)}
                    className="group cursor-pointer border-b border-line last:border-0 hover:bg-subtle focus-visible:bg-subtle"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{t.name}</span>
                        {t.isNew && <Badge tone="brand">New</Badge>}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-ink tnum">{fmt(n)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Meter value={total ? n / total / 0.15 : 0} className="w-20" />
                        <span className="w-10 text-right text-ink-2 tnum">{total ? pct(n / total) : '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-2">
                        {needs && (
                          <Tip content="Below 65%. Many of these conversations end without reaching your goal.">
                            <AlertTriangle className="size-4 text-warning-600" aria-label="Needs attention" />
                          </Tip>
                        )}
                        <span className={clsx('tnum', needs ? 'font-medium text-warning-700' : 'text-ink-2')}>
                          {low ? <span className="text-ink-3">{pct(t.outcomeRate)}</span> : pct(t.outcomeRate)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {t.isNew ? (
                        <span className="text-xs text-ink-3">First seen</span>
                      ) : (
                        <Tip content={`${fmt(prev)} last period → ${fmt(n)} now${low ? '. Low volume, so changes can swing a lot.' : ''}`}>
                          <span className="inline-flex flex-col items-end">
                            <Delta value={changePct(n, prev)} abs={n - prev} neutral size="xs" />
                            <span className="text-2xs text-ink-3 tnum">
                              {low ? 'low volume' : `${(changePct(n, prev) ?? 0) > 0 ? '+' : ''}${Math.round((changePct(n, prev) ?? 0) * 100)}%`}
                            </span>
                          </span>
                        </Tip>
                      )}
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex justify-end">
                        <Sparkline data={TOPIC_WEEKLY[t.id] ?? [0, 0, 0, 0, 1, 3]} width={72} height={24} color="var(--color-n-400)" label={`${t.name} weekly`} />
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <ChevronRight className="ml-auto size-4 text-ink-3 group-hover:text-ink" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tbody>
              <tr
                tabIndex={0}
                onClick={() => !preview && setOpenTopic('unclassified')}
                onKeyDown={(e) => e.key === 'Enter' && setOpenTopic('unclassified')}
                className="group cursor-pointer border-t-2 border-line bg-subtle/60 hover:bg-subtle"
              >
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-1.5 text-ink-2">
                    <CircleHelp className="size-4 text-ink-3" />
                    <Term def={GLOSSARY.unclassified}>No matching topic</Term>
                  </span>
                </td>
                <td className="py-3 pr-4 text-right text-ink-2 tnum">{fmt(unclassified)}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <Meter value={total ? unclassified / total : 0} tone="muted" className="w-20" />
                    <span className="w-10 text-right text-ink-3 tnum">{total ? pct(unclassified / total) : '—'}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-right text-ink-3 tnum">{pct(UNCLASSIFIED.outcomeRate)}</td>
                <td className="py-3 pr-4 text-right">
                  <Delta value={changePct(unclassified, s(UNCLASSIFIED.prev))} abs={unclassified - s(UNCLASSIFIED.prev)} neutral size="xs" />
                </td>
                <td className="py-3 pr-2 text-right">
                  <span className="text-sm font-medium text-brand-600 group-hover:underline">Review</span>
                </td>
                <td className="py-3 text-right">
                  <ChevronRight className="ml-auto size-4 text-ink-3" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {rows.length > 6 && !preview && (
          <button onClick={() => setExpanded((e) => !e)} className="mt-3 text-sm font-medium text-brand-600 hover:underline">
            {expanded ? 'Show fewer' : `Show all ${rows.length} topics`}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <Card
        id="topics"
        title="What customers are talking about"
        description="TARS groups Live conversations into topics automatically. Click a topic to read its conversations."
        actions={header}
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
  label, k, sort, setSort,
}: { label: React.ReactNode; k: SortKey; sort: { key: SortKey; dir: 1 | -1 }; setSort: (s: { key: SortKey; dir: 1 | -1 }) => void }) {
  const on = sort.key === k
  return (
    <th className="py-2.5 pr-4 text-right font-medium" aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
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

function Coverage({
  classified, total, coverage, partial, onReview, onDiscover,
}: { classified: number; total: number; coverage: number; partial: boolean; onReview: () => void; onDiscover?: () => void }) {
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
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-line px-4 py-3">
        <div className="min-w-56 flex-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-ink-2">
              <b className="font-semibold text-ink tnum">{pct(coverage)}</b> of conversations matched a topic
            </span>
            <span className="text-xs text-ink-3 tnum">
              {fmt(classified)} of {fmt(total)}
            </span>
          </div>
          <Meter value={coverage} className="mt-2" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
          <span>14 newer conversations get sorted tonight</span>
          <InfoTip label="Topic updates" text="New conversations are sorted once a day. TARS looks for new topics once a week." />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onReview}>
            <Search className="size-4" /> Review unmatched
          </Button>
          {onDiscover && coverage < 0.7 && (
            <Button size="sm" onClick={onDiscover}>
              <Sparkles className="size-4" /> Find missing topics
            </Button>
          )}
        </div>
      </div>
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

/* ---------------- Topic detail sheet ---------------- */
export function TopicSheet({
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
  const { s, toast } = useApp()
  if (!topic && !unclassified) return null
  const name = unclassified ? 'No matching topic' : topic!.name
  const n = unclassified ? unclassifiedCount : s(topic!.count)
  const prev = unclassified ? s(UNCLASSIFIED.prev) : s(topic!.prev)
  const rate = unclassified ? UNCLASSIFIED.outcomeRate : topic!.outcomeRate
  const needs = rate < ATTENTION
  const convs = unclassified
    ? SAMPLE_CONVERSATIONS.map((c, i) => ({ ...c, first: ['Hi', 'Can I talk to someone?', 'ok thanks', 'My son starts school next week, what should I do', 'Hello??', 'Do you do couples therapy?'][i] }))
    : SAMPLE_CONVERSATIONS.map((c, i) => ({ ...c, first: topic!.examples[i % topic!.examples.length] }))

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          {name}
          {topic?.isNew && <Badge tone="brand">New</Badge>}
        </span>
      }
      description={unclassified ? GLOSSARY.unclassified : topic!.description}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="link" onClick={() => toast('Opens Inbox filtered to this topic')}>
            Open all {fmt(n)} in Inbox <ExternalLink className="size-3.5" />
          </Button>
          {onManage && (
            <Button size="sm" onClick={onManage}>
              <Settings2 className="size-4" /> Manage topics
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Conversations" value={fmt(n)} sub={<Delta value={changePct(n, prev)} abs={n - prev} neutral size="xs" />} />
        <Stat label="Share" value={total ? pct(n / total) : '—'} sub={<span className="text-xs text-ink-3">of {fmt(total)}</span>} />
        <Stat
          label="Outcome rate"
          value={pct(rate)}
          sub={<span className="text-xs text-ink-3">site avg 82%</span>}
          warn={needs && !unclassified}
        />
      </div>

      {unclassified ? (
        <div className="mt-5 rounded-lg border border-line bg-subtle p-4 text-sm text-ink-2">
          <p className="font-medium text-ink">Why conversations end up here</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Greetings or one-word messages with nothing to classify</li>
            <li>Subjects that no topic covers yet, like <i>couples therapy</i> or <i>school support</i></li>
          </ul>
          {onManage && (
            <Button size="sm" className="mt-3" onClick={onManage}>
              <Sparkles className="size-4" /> Find missing topics
            </Button>
          )}
        </div>
      ) : (
        needs && (
          <div className="mt-5 flex gap-3 rounded-lg border border-warning-600/30 bg-warning-50 p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-600" />
            <div>
              <p className="font-medium text-warning-700">{pct(1 - rate)} of these conversations didn’t reach your goal</p>
              <p className="mt-1 text-ink-2">Visitors often leave after the AI says it isn’t sure. Adding these answers to Knowledge usually helps.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="primary" onClick={() => toast('Opens Knowledge with suggested gaps for this topic')}>
                  Improve answers
                </Button>
                <Button size="sm" onClick={() => toast('Opens the agent’s instructions')}>Edit agent</Button>
              </div>
            </div>
          </div>
        )
      )}

      {!unclassified && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-ink">What people ask</h4>
          <ul className="mt-2 space-y-2">
            {topic!.examples.map((q) => (
              <li key={q} className="rounded-lg bg-subtle px-3 py-2 text-sm text-ink-2">“{q}”</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink">Recent conversations</h4>
          <span className="text-xs text-ink-3">Showing 6 of {fmt(n)}</span>
        </div>
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
          {convs.map((c) => (
            <li key={c.who + c.when}>
              <button
                onClick={() => toast(`Opens conversation with ${c.who}`)}
                className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-subtle"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  {c.who.startsWith('Visitor') ? c.who.slice(-2) : c.who[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-ink">{c.who}</span>
                    <span className="shrink-0 text-xs text-ink-3">{c.when}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-ink-2">{c.first}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <Badge tone={c.outcome ? 'success' : 'neutral'}>{c.outcome ? 'Outcome reached' : 'No outcome'}</Badge>
                    <span className="text-xs text-ink-3">
                      {c.channel} · {c.msgs} messages
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  )
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: React.ReactNode; warn?: boolean }) {
  return (
    <div className={clsx('rounded-lg border p-3', warn ? 'border-warning-600/30 bg-warning-50' : 'border-line')}>
      <div className="text-xs text-ink-3">{label}</div>
      <div className={clsx('mt-1 text-lg font-semibold tracking-tight', warn ? 'text-warning-700' : 'text-ink')}>{value}</div>
      {sub && <div className="mt-0.5">{sub}</div>}
    </div>
  )
}

/* ---------------- Manage topics ---------------- */
type Action =
  | { kind: 'rename' | 'archive' | 'split' | 'merge'; topic: Topic }
  | { kind: 'add' }
  | { kind: 'discover' }
  | null

export function ManageTopics({
  open, onOpenChange, topics, setTopics, startWith,
}: { open: boolean; onOpenChange: (o: boolean) => void; topics: Topic[]; setTopics: (t: Topic[]) => void; startWith?: 'discover' | 'add' }) {
  const { toast } = useApp()
  const [action, setAction] = useState<Action>(null)
  useEffect(() => {
    if (open && startWith) setAction({ kind: startWith })
  }, [open, startWith])
  const [text, setText] = useState('')
  const [text2, setText2] = useState('')
  const [target, setTarget] = useState('')
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
          {impact(`This reclassifies ${fmt(Math.round(t.count * 3.2))} conversations from the last 90 days into the new topics. “${t.name}” is archived. Takes a few minutes.`)}
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
          {impact('This reclassifies 1,318 conversations from the last 90 days so they can match the new topic. Takes a few minutes.')}
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
          {footer('Start discovery', () => done('Discovery started. We’ll show suggestions here when ready.'))}
        </>
      )
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setAction(null)
      }}
      title="Manage topics"
      description={`${active.length} of 200 active topics · only admins can make changes`}
      width="max-w-2xl"
    >
      {panel ? (
        <div className="anim-fade">{panel}</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => start({ kind: 'add' })}>
              <Plus className="size-4" /> Add topic
            </Button>
            <Button size="sm" onClick={() => start({ kind: 'discover' })}>
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
                    <MenuItem onSelect={() => start({ kind: 'merge', topic: t })}><GitMerge className="size-4 text-ink-3" /> Merge into…</MenuItem>
                    <MenuItem onSelect={() => start({ kind: 'split', topic: t })}><Split className="size-4 text-ink-3" /> Split…</MenuItem>
                    <MenuSeparator />
                    <MenuItem danger onSelect={() => start({ kind: 'archive', topic: t })}><Archive className="size-4" /> Archive</MenuItem>
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
    </Modal>
  )
}
