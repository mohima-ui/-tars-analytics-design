import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Bot, Check, MoreHorizontal, Pencil, Search, Target, Trash2, ChevronDown, FileText, Link2, Mail, Plus, Sheet as SheetIcon, FlaskConical, NotebookPen } from 'lucide-react'
import { ENTRY_CHOICES, FIELDS, MONTHS, REPLY, SOURCES, TOPICS, TOTALS as T, UNCLASSIFIED, WEEKS, fmt, mulberry32, type SourceRow, type Topic, type Week } from './data'
import { useApp } from './state'
import { Badge, Button, clsx, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Modal, Pop, PopContent, PopTrigger, Sheet, Tip } from './components/ui'
import { DateRangePicker, ScheduleDialog } from './sections/Header'
import { ManageTopics, TopicSheet } from './sections/Topics'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const pct = (n: number) => `${Math.round(n * 100)}%`

/** Change text. Under 50 we show the real count next to the %: "+15 (+264%)". */
export function changeText(cur: number, prev: number, forcePctOnly = false) {
  if (!prev) return cur ? `+${cur} (new)` : '—'
  const d = cur - prev
  const p = d / prev
  const pctStr = `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p * 100) < 10 ? Math.abs(p * 100).toFixed(1) : Math.round(Math.abs(p * 100))}%`
  if (cur < 50 && !forcePctOnly) return `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)} (${pctStr})`
  return pctStr
}

export function Seg<T extends string>({
  value, onChange, options, label, size = 'md',
}: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-0.5 self-start rounded-lg bg-muted p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-md px-3 whitespace-nowrap transition-colors',
            size === 'sm' ? 'h-[30px] px-2.5 text-xs' : 'h-[34px] text-sm',
            value === o.value ? 'bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(20,16,40,0.08)]' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Card layout: every card can move up, move down or be removed ---------- */

type CardId = 'outcomes' | 'insights' | 'funnel' | 'trends' | 'topics' | 'fields' | 'sources' | 'service' | 'timing'
type Group = 'top' | 'performance' | 'questions' | 'sources' | 'service' | 'timing'

const CARD_NAMES: Record<CardId, string> = {
  outcomes: 'Summary',
  insights: 'What changed this period',
  funnel: 'Funnel',
  trends: 'Conversations and outcomes',
  topics: 'Topics',
  fields: 'Fields captured',
  sources: 'Top pages',
  service: 'Replies and handoffs',
  timing: 'Busy hours',
}
const DEFAULT_ORDER: Record<Group, CardId[]> = {
  top: ['insights', 'outcomes'],
  performance: ['funnel', 'trends'],
  questions: ['topics', 'fields'],
  sources: ['sources'],
  service: ['service'],
  timing: ['timing'],
}
const DEFAULT_SECTIONS: Exclude<Group, 'top'>[] = ['performance', 'questions', 'sources', 'service', 'timing']

type Layout = {
  visible: (g: Group) => CardId[]
  sections: Exclude<Group, 'top'>[]
  hidden: CardId[]
  canMove: (id: CardId, dir: -1 | 1) => boolean
  move: (id: CardId, dir: -1 | 1) => void
  remove: (id: CardId) => void
  restore: (ids: CardId[]) => void
}
const LayoutCtx = createContext<Layout | null>(null)

function useLayout(toast: (m: string) => void): Layout {
  const [order, setOrder] = useState(DEFAULT_ORDER)
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [hidden, setHidden] = useState<CardId[]>([])
  const groupOf = (id: CardId) => (Object.keys(order) as Group[]).find((g) => order[g].includes(id))!
  const visible = (g: Group) => order[g].filter((id) => !hidden.includes(id))
  const liveSections = sections.filter((g) => visible(g).length > 0)

  // Within a section a card swaps with its neighbour. A card that is alone in its section moves the whole section.
  const target = (id: CardId, dir: -1 | 1) => {
    const g = groupOf(id)
    const v = visible(g)
    const i = v.indexOf(id)
    if (v[i + dir]) return { kind: 'card' as const, g, other: v[i + dir] }
    if (g !== 'top' && v.length === 1) {
      const j = liveSections.indexOf(g)
      const other = liveSections[j + dir]
      if (other) return { kind: 'section' as const, g, other }
    }
    return null
  }
  return {
    visible,
    sections: liveSections,
    hidden,
    canMove: (id, dir) => target(id, dir) !== null,
    move: (id, dir) => {
      const t = target(id, dir)
      if (!t) return
      if (t.kind === 'card') {
        setOrder((o) => {
          const list = [...o[t.g]]
          const a = list.indexOf(id), b = list.indexOf(t.other)
          ;[list[a], list[b]] = [list[b], list[a]]
          return { ...o, [t.g]: list }
        })
      } else {
        setSections((ss) => {
          const list = [...ss]
          const a = list.indexOf(t.g as Exclude<Group, 'top'>), b = list.indexOf(t.other)
          ;[list[a], list[b]] = [list[b], list[a]]
          return list
        })
      }
    },
    remove: (id) => {
      setHidden((h) => [...h, id])
      toast(`Removed “${CARD_NAMES[id]}”. Add it back from “Add a card”.`)
    },
    restore: (ids) => setHidden((h) => h.filter((x) => !ids.includes(x))),
  }
}

function CardMenu({ id, extra, className }: { id: CardId; extra?: { label: string; icon: typeof Pencil; onSelect: () => void }[]; className?: string }) {
  const l = useContext(LayoutCtx)
  if (!l) return null
  return (
    <Menu>
      <MenuTrigger asChild>
        <button aria-label={`Options for ${CARD_NAMES[id]}`} className={clsx('grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-subtle hover:text-ink', className)}>
          <MoreHorizontal className="size-4" />
        </button>
      </MenuTrigger>
      <MenuContent>
        {extra?.map((x) => (
          <MenuItem key={x.label} onSelect={x.onSelect}>
            <x.icon className="size-4 text-ink-2" /> {x.label}
          </MenuItem>
        ))}
        {extra?.length ? <MenuSeparator /> : null}
        <MenuItem disabled={!l.canMove(id, -1)} onSelect={() => l.move(id, -1)}>
          <ArrowUp className="size-4 text-ink-2" /> Move up
        </MenuItem>
        <MenuItem disabled={!l.canMove(id, 1)} onSelect={() => l.move(id, 1)}>
          <ArrowDown className="size-4 text-ink-2" /> Move down
        </MenuItem>
        <MenuSeparator />
        <MenuItem danger onSelect={() => l.remove(id)}>
          <Trash2 className="size-4" /> Remove
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

function V2Card({
  id, cardId, title, takeaway, actions, children, details, onDetails, className,
}: {
  id?: string
  /** Layout id. Adds the ⋯ menu (Move up, Move down, Remove). */
  cardId?: CardId
  title: ReactNode
  takeaway?: ReactNode
  actions?: ReactNode
  children: ReactNode
  details?: string
  onDetails?: () => void
  className?: string
}) {
  return (
    <div id={id} className={clsx('flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-surface px-6 py-5 shadow-xs', className)}>
      <div className="flex flex-wrap justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-base font-semibold">{title}</h3>
          {takeaway && <p className="mt-1 text-sm text-ink-2">{takeaway}</p>}
        </div>
        {(actions || cardId) && (
          <div className="flex flex-wrap items-start gap-2">
            {actions}
            {cardId && <CardMenu id={cardId} />}
          </div>
        )}
      </div>
      {children}
      {details && (
        <button onClick={onDetails} className="mt-auto self-start text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline">
          {details} →
        </button>
      )}
    </div>
  )
}

function SectionTitle({ id, title, question }: { id: string; title: string; question: string }) {
  return (
    <h2 id={id} className="mt-2 text-lg font-semibold">
      {title} <span className="text-sm font-normal text-ink-2">· {question}</span>
    </h2>
  )
}

function EmptyLine({ title, reason, action, onAction }: { title: string; reason: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line bg-surface px-6 py-3.5 text-sm">
      <span>
        <strong className="font-semibold">{title}</strong> <span className="text-ink-2">· {reason}</span>
      </span>
      <button onClick={onAction} className="font-medium text-brand-600 hover:underline">
        {action} →
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Header + filters                                                    */
/* ------------------------------------------------------------------ */

export const TIMEZONES = [
  'Kolkata (GMT+5:30)', 'UTC (GMT+0:00)', 'London (GMT+1:00)', 'Paris (GMT+2:00)', 'Berlin (GMT+2:00)', 'Dubai (GMT+4:00)',
  'Karachi (GMT+5:00)', 'Kathmandu (GMT+5:45)', 'Dhaka (GMT+6:00)', 'Bangkok (GMT+7:00)', 'Singapore (GMT+8:00)', 'Hong Kong (GMT+8:00)',
  'Tokyo (GMT+9:00)', 'Sydney (GMT+10:00)', 'Auckland (GMT+12:00)', 'São Paulo (GMT−3:00)', 'New York (GMT−4:00)', 'Chicago (GMT−5:00)',
  'Denver (GMT−6:00)', 'Los Angeles (GMT−7:00)', 'Honolulu (GMT−10:00)',
]

export function TimezoneSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase().replace('−', '-')
  const list = TIMEZONES.filter((t) => t.toLowerCase().replace('−', '-').includes(query))
  return (
    <Pop open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ('') }}>
      <PopTrigger asChild>
        <button className="flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm text-ink hover:bg-subtle">
          <span className="text-ink-2">Time zone</span>
          <span className="font-medium">{value}</span>
          <ChevronDown className="size-3.5 text-ink-2" />
        </button>
      </PopTrigger>
      <PopContent className="w-80">
        <div className="px-2.5 pt-2 pb-2">
          <p className="text-sm font-semibold text-ink">Days and hours in</p>
          <p className="mt-0.5 text-xs text-ink-3">Every range, the busy-hours grid and previous-period comparisons follow this timezone.</p>
        </div>
        <div className="relative p-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && list[0]) {
                onChange(list[0])
                setOpen(false)
                setQ('')
              }
            }}
            placeholder="Search time zone"
            aria-label="Search time zone"
            style={{ outline: 'none' }}
            className="h-9 w-full rounded-md border border-line bg-surface pr-3 pl-9 text-sm placeholder:text-ink-3 focus:border-brand-600"
          />
        </div>
        <div role="listbox" aria-label="Time zone" className="max-h-64 overflow-y-auto">
          {list.map((t) => (
            <button
              key={t}
              role="option"
              aria-selected={t === value}
              onClick={() => {
                onChange(t)
                setOpen(false)
                setQ('')
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="w-4">{t === value && <Check className="size-4 stroke-[3] text-brand-600" />}</span>
              {t}
            </button>
          ))}
          {list.length === 0 && <p className="px-2.5 py-3 text-sm text-ink-3">No time zones match “{q}”</p>}
        </div>
      </PopContent>
    </Pop>
  )
}

export function FilterSelect({ label, value, options, onChange, icon: Icon }: { label: string; value: string; options: string[]; onChange: (v: string) => void; icon?: typeof Bot }) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <button aria-label={Icon ? label : undefined} className="flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm text-ink hover:bg-subtle">
          {Icon ? <Icon className="size-4 text-ink-3" aria-hidden /> : <span className="text-ink-2">{label}</span>}
          <span className="font-medium">{value}</span>
          <ChevronDown className="size-3.5 text-ink-2" />
        </button>
      </MenuTrigger>
      <MenuContent align="start">
        <MenuLabel>{label}</MenuLabel>
        {options.map((o) => (
          <MenuItem key={o} onSelect={() => onChange(o)}>
            <span className="w-4">{o === value && <Check className="size-4 stroke-[3] text-brand-600" />}</span>
            {o}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  )
}

function Header({ tz, setTz }: { tz: string; setTz: (t: string) => void }) {
  const { bot, setBot, channel, setChannel, mode, setMode, toast } = useApp()
  const [schedule, setSchedule] = useState(false)
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-lg font-semibold tracking-tight">Analytics</h1>
          <p className="m-0 text-sm text-ink-2">
            Results, trends and opportunities across your deployments
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSchedule(true)}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-subtle"
          >
            <Mail className="size-4 text-ink-2" /> Email report
          </button>
          <Menu>
            <MenuTrigger asChild>
              <button className="flex h-10 items-center gap-1.5 rounded-lg border border-brand-600 bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">
                Export report <ChevronDown className="size-4" />
              </button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => toast('Preparing PDF…')}><FileText className="size-4 text-ink-2" /> Download PDF</MenuItem>
              <MenuItem onSelect={() => toast('Downloading CSV…')}><SheetIcon className="size-4 text-ink-2" /> Download CSV</MenuItem>
              <MenuSeparator />
              <MenuItem onSelect={() => setSchedule(true)}><Mail className="size-4 text-ink-2" /> Email on a schedule…</MenuItem>
              <MenuItem onSelect={() => toast('Link copied')}><Link2 className="size-4 text-ink-2" /> Copy link</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </header>

      <div className="sticky top-0 z-30 -mx-4 border-b border-line bg-canvas px-4 md:-mx-8 md:px-8">
      <div role="toolbar" aria-label="Filters" className="flex flex-wrap items-center gap-2 py-3">
        <DateRangePicker className="h-10" />
        <FilterSelect label="All deployments" icon={Bot} value={bot} options={['Brightline Prod', 'Brightline Staging']} onChange={setBot} />
        <FilterSelect label="Channel" value={channel} options={['All channels', 'Web', 'WhatsApp', 'SMS', 'Voice', 'Email']} onChange={setChannel} />
        <TimezoneSelect value={tz} onChange={setTz} />
        <div className="flex-[1_1_24px]" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-2">Data</span>
          <Seg
            label="Data"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'live', label: 'Live' },
              { value: 'test', label: 'Test' },
            ]}
          />
        </div>
      </div>
      <SectionTabs />
      </div>

      {mode === 'test' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning-600/30 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          <FlaskConical className="size-4 shrink-0" />
          <span>
            <b className="font-semibold">Showing Test data.</b> Test conversations don’t count toward Live numbers. Topics use Live data only.
          </span>
          <button className="ml-auto font-medium text-brand-600 hover:underline" onClick={() => setMode('live')}>
            Switch to Live →
          </button>
        </div>
      )}
      <ScheduleDialog open={schedule} onOpenChange={setSchedule} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* At a glance + insights                                              */
/* ------------------------------------------------------------------ */

export type Outcome = { id: string; name: string; rule: string; count: number | null; prev: number | null }

// Outcomes are set by the customer in “Edit outcomes”. This sample bot tracks one: AI Agent.
const SAMPLE_OUTCOMES: Outcome[] = [
  { id: 'ai-agent', name: 'AI Agent', rule: 'Reaches the “AI Agent” step', count: T.outcomes, prev: T.outcomesPrev },
]

export function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return null
  const up = cur >= prev
  return (
    <span className={clsx('text-sm font-semibold', up ? 'text-success-700' : 'text-danger-700')}>
      {up ? '↑' : '↓'} {changeText(cur, prev).replace(/^[+−]/, '').replace(/\(([+−])/, '(')}
    </span>
  )
}

/* ---------- Summary tiles ---------- */

function useOutcomeNumbers(outcomes: Outcome[]) {
  const { s } = useApp()
  const conv = s(T.conversations)
  const tracked = outcomes.filter((o) => o.count !== null)
  const total = tracked.reduce((a, o) => a + s(o.count!), 0)
  const totalPrev = tracked.reduce((a, o) => a + s(o.prev ?? 0), 0)
  const ofConv = (n: number) => `${pct(n / Math.max(conv, 1))} of conversations`
  const base = [
    { key: 'imp', label: 'Impressions', n: s(T.impressions), prev: s(T.impressionsPrev), sub: `was ${fmt(s(T.impressionsPrev))}` },
    { key: 'opens', label: 'Opens', n: s(T.opens), prev: s(T.opensPrev), sub: `${pct(s(T.opens) / Math.max(s(T.impressions), 1))} of impressions` },
    { key: 'conv', label: 'Conversations', n: conv, prev: s(T.conversationsPrev), sub: `was ${fmt(s(T.conversationsPrev))}` },
  ]
  // What the outcome side shows: one outcome → just it; several → total first, then each one.
  const outcomeRows = [
    ...(outcomes.length > 1 ? [{ key: 'total', label: 'Total outcomes', n: total as number | null, prev: totalPrev, sub: ofConv(total), isTotal: true }] : []),
    ...outcomes.map((o) => ({
      key: o.id,
      label: o.name,
      n: o.count === null ? null : s(o.count),
      prev: s(o.prev ?? 0),
      sub: o.count === null ? 'Tracking started today' : ofConv(s(o.count)),
      isTotal: false,
    })),
  ]
  return { base, outcomeRows, total, totalPrev, conv }
}

function AddOutcomeTile({ onEdit, className }: { onEdit: () => void; className?: string }) {
  return (
    <button
      onClick={onEdit}
      className={clsx('flex flex-col items-start justify-center gap-1 rounded-xl border border-dashed border-line-strong p-4 text-left hover:bg-surface', className)}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium text-brand-600">
        <Plus className="size-4" /> Add an outcome
      </span>
      <span className="text-xs text-ink-2">See what conversations achieve</span>
    </button>
  )
}

/* Each number is its own small card; outcome tiles carry a green top edge. */
function OutcomesTiles({ outcomes, onEdit }: { outcomes: Outcome[]; onEdit: () => void }) {
  const d = useOutcomeNumbers(outcomes)
  return (
    <V2Card
      cardId="outcomes"
      title="Summary"
      actions={
        <button onClick={onEdit} className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium hover:bg-subtle">
          <Pencil className="size-3.5 text-ink-2" /> Edit outcomes
        </button>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {d.base.map((k) => (
          <div key={k.key} className="flex flex-col gap-1.5 rounded-lg bg-subtle p-4">
            <div className="text-sm text-ink-2">{k.label}</div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-xl font-semibold tracking-tight">{fmt(k.n)}</span>
              <Delta cur={k.n} prev={k.prev} />
            </div>
            <div className="text-xs text-ink-2">{k.sub}</div>
          </div>
        ))}
        {d.outcomeRows.map((o) => (
          <div key={o.key} className="flex flex-col gap-1.5 overflow-hidden rounded-lg border-t-viz-2 bg-subtle p-4" style={{ borderTopWidth: 3 }}>
            <div className="flex items-center gap-1.5 text-sm text-ink-2">
              <Target className="size-3.5 flex-none text-viz-2" aria-hidden />
              <span className="truncate">{o.label}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className={clsx('text-xl font-semibold tracking-tight', o.n === null && 'text-ink-3')}>{o.n === null ? '—' : fmt(o.n)}</span>
              {o.n !== null && <Delta cur={o.n} prev={o.prev} />}
            </div>
            <div className="text-xs text-ink-2">{o.sub}</div>
          </div>
        ))}
        {outcomes.length === 0 && <AddOutcomeTile onEdit={onEdit} />}
      </div>
    </V2Card>
  )
}


const RULE_KINDS = [
  { value: 'step', label: 'Reaches a step', placeholder: 'Step name, e.g. Booking confirmed', text: (t: string) => `Reaches the “${t}” step` },
  { value: 'field', label: 'Captures a field', placeholder: 'Field name, e.g. Email', text: (t: string) => `Captures “${t}”` },
  { value: 'link', label: 'Clicks a link', placeholder: 'Link, e.g. /book', text: (t: string) => `Clicks ${t}` },
] as const

function EditOutcomes({ open, onOpenChange, outcomes, setOutcomes }: { open: boolean; onOpenChange: (o: boolean) => void; outcomes: Outcome[]; setOutcomes: (o: Outcome[]) => void }) {
  const { toast } = useApp()
  const [draft, setDraft] = useState<Outcome[]>(outcomes)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<(typeof RULE_KINDS)[number]['value']>('step')
  const [targetText, setTargetText] = useState('')
  useEffect(() => {
    if (open) {
      setDraft(outcomes)
      setAdding(false)
      setName('')
      setTargetText('')
      setKind('step')
    }
  }, [open, outcomes])
  const k = RULE_KINDS.find((x) => x.value === kind)!
  const swap = (i: number, j: number) => setDraft((d) => {
    const n = [...d]
    ;[n[i], n[j]] = [n[j], n[i]]
    return n
  })
  const add = () => {
    setDraft((d) => [...d, { id: 'o-' + Date.now(), name: name.trim(), rule: k.text(targetText.trim()), count: null, prev: null }])
    setAdding(false)
    setName('')
    setTargetText('')
  }
  const input = 'h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-ink-3 focus:border-brand-600'
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit outcomes"
      description="An outcome is something you want a conversation to achieve. Each one gets its own tile on the Outcomes card."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={draft.some((o) => !o.name.trim())}
            onClick={() => {
              setOutcomes(draft.map((o) => ({ ...o, name: o.name.trim() })))
              onOpenChange(false)
              toast('Outcomes saved')
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {draft.length === 0 && <p className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-ink-2">No outcomes yet. Add one below.</p>}
        {draft.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2 rounded-lg border border-line p-2.5">
            <Target className="size-4 flex-none text-ink-3" aria-hidden />
            <div className="min-w-0 flex-1">
              <input
                aria-label="Outcome name"
                value={o.name}
                onChange={(e) => setDraft((d) => d.map((x) => (x.id === o.id ? { ...x, name: e.target.value } : x)))}
                style={{ outline: 'none' }}
                className="h-8 w-full rounded-md border border-transparent px-2 text-sm font-medium hover:border-line focus:border-brand-600"
              />
              <div className="px-2 text-xs text-ink-2">{o.rule}{o.count === null && ' · new'}</div>
            </div>
            <button aria-label={`Move ${o.name} up`} disabled={i === 0} onClick={() => swap(i, i - 1)} className="grid size-8 place-items-center rounded-md text-ink-2 hover:bg-subtle disabled:opacity-30">
              <ArrowUp className="size-4" />
            </button>
            <button aria-label={`Move ${o.name} down`} disabled={i === draft.length - 1} onClick={() => swap(i, i + 1)} className="grid size-8 place-items-center rounded-md text-ink-2 hover:bg-subtle disabled:opacity-30">
              <ArrowDown className="size-4" />
            </button>
            <button aria-label={`Remove ${o.name}`} onClick={() => setDraft((d) => d.filter((x) => x.id !== o.id))} className="grid size-8 place-items-center rounded-md text-ink-2 hover:bg-danger-50 hover:text-danger-700">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}

        {adding ? (
          <div className="mt-2 flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Name</span>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Booked appointment" style={{ outline: 'none' }} className={input} />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Counts when a conversation…</span>
              <Seg size="sm" label="Outcome rule" value={kind} onChange={setKind} options={RULE_KINDS.map((r) => ({ value: r.value, label: r.label }))} />
              <input aria-label="Rule target" value={targetText} onChange={(e) => setTargetText(e.target.value)} placeholder={k.placeholder} style={{ outline: 'none' }} className={input} />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" variant="primary" disabled={!name.trim() || !targetText.trim()} onClick={add}>
                Add outcome
              </Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="mt-1 flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-sm font-medium text-brand-600 hover:bg-subtle">
            <Plus className="size-4" /> Add outcome
          </button>
        )}
        <p className="text-xs text-ink-2">New outcomes start counting from today. Past conversations aren’t recounted.</p>
      </div>
    </Modal>
  )
}

function Insights({ onOpenTopic }: { onOpenTopic: (id: string) => void }) {
  const { s } = useApp()
  const imp = s(T.impressions), impPrev = s(T.impressionsPrev)
  const out = s(T.outcomes), outPrev = s(T.outcomesPrev)
  const conv = s(T.conversations)
  const un = s(UNCLASSIFIED.count), unPrev = s(UNCLASSIFIED.prev)
  const grew = [...TOPICS].sort((a, b) => b.count - b.prev - (a.count - a.prev))[0]
  const items = [
    {
      title: `Outcomes rose ${pct((out - outPrev) / outPrev)} while impressions fell ${pct((impPrev - imp) / impPrev)}.`,
      body: `${fmt(out)} outcomes vs ${fmt(outPrev)} before, from ${fmt(imp)} impressions vs ${fmt(impPrev)}. Fewer people saw the launcher, but more of them got what they needed.`,
      link: 'See sources',
      href: '#sources',
    },
    {
      title: `${pct(un / conv)} of conversations don’t fit a topic.`,
      body: `${fmt(un)} of ${fmt(conv)} conversations have no topic, up ${fmt(un - unPrev)}. Reviewing them may show new things customers ask about.`,
      link: 'Review topics',
      href: '#questions',
    },
    {
      title: `${grew.name} questions grew the most.`,
      body: `${s(grew.count)} conversations, up ${s(grew.count) - s(grew.prev)} from last period. Make sure the bot answers this well.`,
      link: 'Open topic',
      onClick: () => onOpenTopic(grew.id),
    },
  ]
  return (
    <section id="summary" aria-label="What changed this period">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
        {items.map((i) => (
          <div key={i.title} className="flex flex-col gap-2 rounded-lg bg-brand-50 px-4 py-3.5">
            <div className="text-sm leading-[1.45] font-medium">{i.title}</div>
            <div className="text-sm leading-[1.45] text-ink-2">{i.body}</div>
            {i.href ? (
              <a href={i.href} className="mt-auto text-sm font-medium text-brand-600 hover:underline">
                {i.link} →
              </a>
            ) : (
              <button onClick={i.onClick} className="mt-auto self-start text-sm font-medium text-brand-600 hover:underline">
                {i.link} →
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

/** Same section tabs as v1. Targets are cards/sections on this page; the active tab is whichever target sits highest under the sticky bar. */
const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'topics', label: 'Topics' },
  { id: 'funnel', label: 'Funnel' },
  { id: 'trends', label: 'Trends' },
  { id: 'service', label: 'AI performance' },
  { id: 'sources', label: 'Traffic' },
  { id: 'data-capture', label: 'Data captured' },
]

function useScrollSpy() {
  const [active, setActive] = useState('summary')
  useEffect(() => {
    const onScroll = () => {
      let cur = TABS[0].id
      let best = -Infinity
      for (const t of TABS) {
        const top = document.getElementById(t.id)?.getBoundingClientRect().top
        if (top !== undefined && top < 200 && top > best) {
          best = top
          cur = t.id
        }
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = TABS[TABS.length - 1].id
      setActive(cur)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return active
}

function SectionTabs() {
  const active = useScrollSpy()
  return (
    <div className="-mb-px mt-4 flex gap-1 overflow-x-auto" role="tablist" aria-label="Sections">
      {TABS.map((t) => (
        <a
          key={t.id}
          href={`#${t.id}`}
          role="tab"
          aria-selected={active === t.id}
          className={clsx(
            'border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap transition-colors',
            active === t.id ? 'border-brand-600 font-semibold text-brand-600' : 'border-transparent font-normal text-ink-3 hover:text-ink',
          )}
        >
          {t.label}
        </a>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Performance                                                         */
/* ------------------------------------------------------------------ */

function Funnel() {
  const { s, toast } = useApp()
  const [view, setView] = useState<'steps' | 'paths'>('steps')
  const imp = s(T.impressions), opens = s(T.opens), conv = s(T.conversations), out = s(T.outcomes)
  const fromLauncher = s(T.launcherConversations), direct = conv - fromLauncher
  const rows = [
    { label: 'Impressions', n: imp, share: '', drop: '' },
    { label: 'Opens', n: opens, share: `${pct(opens / Math.max(imp, 1))} of impressions`, drop: `${fmt(imp - opens)} saw the launcher but didn’t open it` },
    {
      label: 'Conversations',
      n: conv,
      share: `${pct(fromLauncher / Math.max(opens, 1))} of opens`,
      drop: `${fmt(opens - fromLauncher)} opened but didn’t send a message${direct ? ` · ${fmt(direct)} more started from a direct link` : ''}`,
    },
    { label: 'Outcomes', n: out, share: `${pct(out / Math.max(conv, 1))} of conversations`, drop: `${fmt(conv - out)} chatted but didn’t reach an outcome` },
  ]
  const max = Math.max(imp, 1)
  return (
    <V2Card
      id="funnel"
      cardId="funnel"
      className="flex-[1_1_520px]"
      title="Funnel"
      takeaway={`${pct(out / Math.max(conv, 1))} of conversations reached an outcome. Most people are lost before they open the launcher.`}
      actions={
        <Seg size="sm" label="Funnel view" value={view} onChange={setView} options={[{ value: 'steps', label: 'Steps' }, { value: 'paths', label: 'Paths' }]} />
      }
      details="See funnel details"
      onDetails={() => toast('Opens the full funnel report')}
    >
      {view === 'steps' ? (
        <div className="flex flex-col gap-1">
          {rows.map((r, i) => (
            <div key={r.label} className="flex flex-col gap-1">
              {r.drop && <div className="py-0.5 pl-[140px] text-xs text-warning-700 max-sm:pl-0">↓ {r.drop}</div>}
              <div className="flex items-center gap-3">
                <div className="w-32 flex-none text-sm font-medium">{r.label}</div>
                <div className="h-8 flex-1 overflow-hidden rounded-md bg-muted">
                  <Tip content={`${fmt(r.n)} ${r.label.toLowerCase()}${r.share ? ` · ${r.share}` : ''}`}>
                    <div
                      tabIndex={0}
                      className="h-full rounded-md transition-[width] duration-500"
                      style={{ width: `${((r.n / max) * 100).toFixed(1)}%`, background: i === 3 ? 'var(--color-viz-2)' : 'var(--color-brand-600)' }}
                    />
                  </Tip>
                </div>
                <div className="w-[150px] flex-none text-right">
                  <span className="text-base font-semibold">{fmt(r.n)}</span> <span className="text-xs text-ink-2">{r.share}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">
            First choice people made in the “{ENTRY_CHOICES.field}” question. {s(ENTRY_CHOICES.total)} people used it; {s(ENTRY_CHOICES.reached)} of them (
            {pct(ENTRY_CHOICES.reached / ENTRY_CHOICES.total)}) reached an outcome.
          </p>
          {ENTRY_CHOICES.choices.map((c) => (
            <div key={c.label} className="flex items-center gap-3">
              <div className="w-48 flex-none truncate text-sm font-medium">{c.label}</div>
              <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                <div className="h-full rounded-md bg-brand-400" style={{ width: `${(c.value / Math.max(...ENTRY_CHOICES.choices.map((x) => x.value))) * 100}%` }} />
              </div>
              <div className="w-24 flex-none text-right text-sm">
                <span className="font-semibold">{s(c.value)}</span> <span className="text-xs text-ink-2">{pct(c.value / ENTRY_CHOICES.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </V2Card>
  )
}


function WeeklyChart() {
  const { toast } = useApp()
  const [grain, setGrain] = useState<'week' | 'month'>('week')
  const [hover, setHover] = useState<number | null>(null)
  const data = grain === 'week' ? WEEKS : MONTHS
  const max = Math.max(...data.map((d) => Math.max(d.conversations, d.outcomes)), 1)
  const note = (d: Week, i: number) => (d.partial ? (i === data.length - 1 ? 'so far' : 'partial') : '')
  return (
    <V2Card
      id="trends"
      cardId="trends"
      className="flex-[1_1_420px]"
      title="Conversations and outcomes"
      takeaway={grain === 'week' ? 'Steady at about 100 conversations a week. Lighter bars are partial weeks.' : 'Conversations and outcomes have grown each month since June. September is partial.'}
      actions={<Seg size="sm" label="Group by" value={grain} onChange={setGrain} options={[{ value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]} />}
      details="See conversation details"
      onDetails={() => toast('Opens the conversations report')}
    >
      <div className="flex gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-xs bg-brand-600" />Conversations</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-xs bg-viz-2" />Outcomes</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-xs bg-brand-600 opacity-40" />Partial</span>
      </div>
      <div>
        <div className="grid h-[190px] items-end gap-2 border-b border-line" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          {data.map((d, i) => (
            <div
              key={d.label}
              tabIndex={0}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${d.label}${note(d, i) ? ` (${note(d, i)})` : ''}: ${d.conversations} conversations, ${d.outcomes} outcomes`}
              className={clsx('relative flex h-full flex-col items-center justify-end gap-1.5 rounded-t-md', hover === i && 'bg-brand-50')}
            >
              <div className="flex gap-1 text-xs text-ink-2 tnum">
                <span>{fmt(d.conversations)}</span>
                <span>/</span>
                <span>{fmt(d.outcomes)}</span>
              </div>
              <div className="flex w-full items-end justify-center gap-1" style={{ opacity: d.partial ? 0.4 : 1 }}>
                <div className="w-[22px] rounded-t bg-brand-600" style={{ height: Math.round((d.conversations / max) * 140) }} />
                <div className="w-[22px] rounded-t bg-viz-2" style={{ height: Math.max(d.outcomes ? 2 : 0, Math.round((d.outcomes / max) * 140)) }} />
              </div>
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 rounded-lg bg-n-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg">
                  <div className="mb-1 text-n-300">{grain === 'week' ? 'Week of ' : ''}{d.label}{note(d, i) && ` · ${note(d, i)}`}</div>
                  <div><b className="tnum">{fmt(d.conversations)}</b> <span className="text-n-300">conversations</span></div>
                  <div><b className="tnum">{fmt(d.outcomes)}</b> <span className="text-n-300">outcomes ({d.conversations ? pct(d.outcomes / d.conversations) : '—'})</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          {data.map((d, i) => (
            <div key={d.label} className="text-center text-xs leading-[1.3] text-ink-2">
              {d.label}
              <br />
              <span className="text-warning-700">{note(d, i)}</span>
            </div>
          ))}
        </div>
      </div>
    </V2Card>
  )
}

/* ------------------------------------------------------------------ */
/* Customer questions                                                  */
/* ------------------------------------------------------------------ */

function TopicsCard({ topics, onOpen, onManage, onDiscover }: { topics: Topic[]; onOpen: (id: string) => void; onManage: () => void; onDiscover: () => void }) {
  const { s, role, mode, toast } = useApp()
  const active = topics.filter((t) => !t.archived)
  const sorted = [...active].sort((a, b) => b.count - a.count)
  const un = s(UNCLASSIFIED.count)
  const total = active.reduce((a, t) => a + s(t.count), 0) + un
  const maxCount = Math.max(...sorted.map((t) => s(t.count)), 1)
  const top = sorted[0]
  const grew = [...active].sort((a, b) => b.count - b.prev - (a.count - a.prev))[0]

  if (mode === 'test') {
    return (
      <V2Card id="topics" cardId="topics" className="flex-[2_1_560px]" title="Topics" takeaway="Topic analysis uses Live conversations only.">
        <EmptyLine title="Topics" reason="Switch to Live data to see what customers ask about" action="Show Live data" onAction={() => toast('Switch Data to Live in the filter bar')} />
      </V2Card>
    )
  }

  return (
    <V2Card
      id="topics"
      cardId="topics"
      className="flex-[2_1_560px]"
      title="Topics"
      takeaway={`${top.name} is the top topic. ${grew.name} grew the most (${s(grew.count) - s(grew.prev) > 0 ? '+' : ''}${s(grew.count) - s(grew.prev)}).`}
      actions={
        role === 'admin' ? (
          <button onClick={onManage} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm font-medium hover:bg-subtle">
            Manage topics
          </button>
        ) : undefined
      }
      details="See all topics"
      onDetails={onManage}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-ink-2">
              <th scope="col" className="border-b border-line py-2 font-medium">Topic</th>
              <th scope="col" className="w-[34%] border-b border-line py-2 font-medium">Share of sorted conversations</th>
              <th scope="col" className="w-[70px] border-b border-line py-2 text-right font-medium">Count</th>
              <th scope="col" className="w-[130px] border-b border-line py-2 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const n = s(t.count)
              const prev = s(t.prev)
              const d = n - prev
              const pctStr = changeText(n, prev, true)
              return (
                <tr key={t.id} className="group cursor-pointer hover:bg-subtle" onClick={() => onOpen(t.id)}>
                  <td className="border-b border-n-100 py-2.5 pr-3">
                    <button className="text-left font-medium text-ink group-hover:text-brand-600 group-hover:underline" onClick={(e) => { e.stopPropagation(); onOpen(t.id) }}>
                      {t.name}
                    </button>
                    {t.isNew && <Badge tone="brand" className="ml-2">New</Badge>}
                  </td>
                  <td className="border-b border-n-100 py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                        <div className="h-full rounded bg-brand-400" style={{ width: `${Math.round((n / maxCount) * 100)}%` }} />
                      </div>
                      <span className="w-[34px] text-right text-ink-2 tnum">{total ? pct(n / total) : '—'}</span>
                    </div>
                  </td>
                  <td className="border-b border-n-100 py-2.5 text-right font-medium tnum">{n}</td>
                  <td className="border-b border-n-100 py-2.5 text-right text-ink-2 tnum">
                    {t.isNew || !prev ? 'New' : n < 50 ? `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)} (${pctStr})` : pctStr}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-600/30 bg-warning-50 px-4 py-3.5">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-semibold">
            {un} conversations ({total ? pct(un / total) : '—'}) don’t fit any topic yet
          </div>
          <div className="text-sm text-warning-700">
            Up {un - s(UNCLASSIFIED.prev)} from last period. Reviewing them can show new topics customers ask about.
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onOpen('unclassified')} className="px-3 py-2 text-sm font-medium text-brand-600 hover:underline">
            Review conversations
          </button>
          {role === 'admin' && (
            <button onClick={onDiscover} className="h-[38px] rounded-lg border border-brand-600 bg-brand-600 px-3.5 text-sm font-medium text-white hover:bg-brand-700">
              Discover topics
            </button>
          )}
        </div>
      </div>
    </V2Card>
  )
}

function FieldsCard() {
  const { s, toast } = useApp()
  return (
    <V2Card id="data-capture" cardId="fields" className="flex-[1_1_300px]" title="Fields captured" takeaway="Almost everyone answers when asked." details="See all fields" onDetails={() => toast('Opens the fields report')}>
      <div className="flex flex-col gap-4">
        {FIELDS.map((f) => {
          const asked = f.asked === null ? null : s(f.asked)
          const ans = s(f.answered)
          return (
            <div key={f.key} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{f.name}</span>
                <span>
                  <strong>{ans}</strong> <span className="text-ink-2">{asked === null ? 'answered' : `of ${asked} answered`}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-muted">
                {asked !== null && <div className="h-full bg-brand-600" style={{ width: `${(ans / Math.max(asked, 1)) * 100}%` }} />}
              </div>
              <div className="text-xs text-ink-2">{asked === null ? 'Times asked isn’t tracked for this field' : `${pct(ans / Math.max(asked, 1))} answer rate`}</div>
            </div>
          )
        })}
      </div>
    </V2Card>
  )
}

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

type SrcSort = 'imp' | 'conv' | 'out' | 'rate'

const SRC_COPY: Record<string, { title: string; col: string; takeaway: string; all: string }> = {
  Pages: { title: 'Top pages', col: 'Page', takeaway: 'The home page brings the most conversations. /start/back-to-school gets the most views but few chats.', all: 'See all pages' },
  Sites: { title: 'Top sites', col: 'Site', takeaway: 'Most conversations (77%) come from hellobrightline.com.', all: 'See all sites' },
  Referrers: { title: 'Top referrers', col: 'Referrer', takeaway: 'Google sends the most visitors. Instagram visitors chat less often.', all: 'See all referrers' },
  Campaigns: { title: 'Campaigns', col: 'Campaign', takeaway: 'No campaign traffic in this period.', all: 'See all campaigns' },
}

function SourcesCard() {
  const { s, toast } = useApp()
  const [tab, setTab] = useState<keyof typeof SOURCES>('Pages')
  const [sort, setSort] = useState<{ k: SrcSort; dir: 1 | -1 }>({ k: 'conv', dir: -1 })
  const copy = SRC_COPY[tab]
  const val = (r: SourceRow, k: SrcSort) =>
    k === 'imp' ? r.impressions ?? -1 : k === 'conv' ? r.conversations : k === 'out' ? r.outcomes : r.conversations ? r.outcomes / r.conversations : 0
  const rows = useMemo(() => [...SOURCES[tab]].sort((a, b) => (val(a, sort.k) - val(b, sort.k)) * sort.dir), [tab, sort])
  const maxConv = Math.max(...rows.map((r) => r.conversations), 1)

  const th = (label: string, k: SrcSort, cls: string) => {
    const on = sort.k === k
    return (
      <th scope="col" className={clsx('border-b border-line py-2 font-medium', cls)} aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button onClick={() => setSort({ k, dir: on ? (sort.dir === 1 ? -1 : 1) : -1 })} className={clsx('inline-flex items-center gap-1 hover:text-ink', on && 'text-ink')}>
          {label}
          {on && (sort.dir === -1 ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
        </button>
      </th>
    )
  }

  return (
    <V2Card
      cardId="sources"
      className="w-full"
      title={copy.title}
      takeaway={copy.takeaway}
      actions={
        <Seg
          size="sm"
          label="Source type"
          value={tab}
          onChange={setTab}
          options={(Object.keys(SOURCES) as (keyof typeof SOURCES)[]).map((k) => ({ value: k, label: k }))}
        />
      }
    >
      {rows.length === 0 ? (
        <EmptyLine title="Campaigns" reason="No campaign links were used in this period" action="Learn about UTM links" onAction={() => toast('Opens help: tracking campaigns with UTM links')} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-ink-2">
                  <th scope="col" className="border-b border-line py-2 font-medium">{copy.col}</th>
                  {th('Impressions', 'imp', 'w-[110px] text-right')}
                  {th('Conversations', 'conv', 'w-[30%] pl-6')}
                  {th('Outcomes', 'out', 'w-[90px] text-right')}
                  {th('Outcome rate', 'rate', 'w-[150px] text-right')}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const conv = s(r.conversations)
                  const out = s(r.outcomes)
                  const small = conv < 10
                  return (
                    <tr key={r.name} className="hover:bg-subtle">
                      <td className={clsx('border-b border-n-100 py-2.5 pr-3', r.name.startsWith('/') && 'font-mono text-xs')}>
                        {r.name}
                        {r.hint && (
                          <Tip content={r.hint}>
                            <span tabIndex={0} className="ml-1.5 cursor-help font-sans text-xs text-ink-2 underline decoration-dotted underline-offset-2">?</span>
                          </Tip>
                        )}
                      </td>
                      <td className="border-b border-n-100 py-2.5 text-right text-ink-2 tnum">{r.impressions === null ? '—' : fmt(s(r.impressions))}</td>
                      <td className="border-b border-n-100 py-2.5 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="w-6 text-right font-medium tnum">{conv}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                            <div className="h-full rounded bg-brand-600" style={{ width: `${Math.round((r.conversations / maxConv) * 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-n-100 py-2.5 text-right tnum">{out}</td>
                      <td className="border-b border-n-100 py-2.5 text-right tnum">
                        <span className={small ? 'text-ink-3' : 'font-medium'}>{conv ? pct(out / conv) : '—'}</span>
                        {small && (
                          <Tip content={`Only ${conv} conversations, so this rate can swing a lot.`}>
                            <span className="ml-1 rounded bg-warning-50 px-1.5 py-0.5 text-xs text-warning-700">Few chats</span>
                          </Tip>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <button onClick={() => toast(`Opens: ${copy.all}`)} className="font-medium text-brand-600 hover:underline">
              {copy.all} →
            </button>
            <span className="text-ink-2">Outcome rate = outcomes ÷ conversations</span>
          </div>
        </>
      )}
    </V2Card>
  )
}

/* ------------------------------------------------------------------ */
/* Service quality                                                     */
/* ------------------------------------------------------------------ */

function ServiceCard() {
  const { s, toast } = useApp()
  const conv = s(T.conversations)
  const alone = s(T.aiAlone)
  const handoffs = conv - alone
  return (
    <V2Card
      cardId="service"
      className="w-full"
      title="Replies and handoffs"
      takeaway={`The AI handled ${pct(alone / Math.max(conv, 1))} of conversations on its own. ${fmt(handoffs)} were handed to a person.`}
      details="See service details"
      onDetails={() => toast('Opens the service quality report')}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <div className="flex flex-col gap-1.5 rounded-lg bg-subtle p-4">
          <div className="text-sm text-ink-2">AI reply time (median)</div>
          <div className="text-lg font-semibold">{REPLY.median}s</div>
          <div className="text-xs text-ink-2">
            Slowest 10%: over {REPLY.p90}s · Slowest: {REPLY.max}s
          </div>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg bg-subtle p-4">
          <div className="text-sm text-ink-2">Handled by AI alone</div>
          <div className="text-lg font-semibold">{pct(alone / Math.max(conv, 1))}</div>
          <div className="text-xs text-ink-2">
            {fmt(alone)} of {fmt(conv)} conversations
          </div>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg bg-subtle p-4">
          <div className="text-sm text-ink-2">Human pickup time (median)</div>
          <div className="text-lg font-semibold">{T.humanPickupMedian}</div>
          <div className="text-xs text-ink-2">Across {fmt(handoffs)} handoffs to a person</div>
        </div>
      </div>
    </V2Card>
  )
}

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

export const DAYS7 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// Share of activity by hour (parents chat at lunch and in the evening) and by weekday.
const HOUR_W = [2, 1, 1, 0.5, 0.5, 1, 2, 4, 6, 8, 9, 10, 12, 12, 10, 9, 9, 10, 13, 16, 18, 16, 11, 5]
const DAY_W = [1, 1.1, 1.05, 1, 0.85, 0.7, 0.9]

/** Splits `total` across the 7×24 grid in proportion to the weights, so cells add up exactly. */
export function spread(total: number, seed: number) {
  const r = mulberry32(seed)
  const w = DAY_W.map((d) => HOUR_W.map((h) => d * h * (0.75 + r() * 0.5)))
  const sum = w.flat().reduce((a, b) => a + b, 0)
  const raw = w.map((row) => row.map((x) => (x / sum) * total))
  const cells = raw.map((row) => row.map(Math.floor))
  let left = total - cells.flat().reduce((a, b) => a + b, 0)
  const order = raw.flatMap((row, d) => row.map((x, h) => ({ d, h, rem: x - Math.floor(x) }))).sort((a, b) => b.rem - a.rem)
  for (const c of order) {
    if (left-- <= 0) break
    cells[c.d][c.h]++
  }
  return cells
}
export const HEAT_COLORS = ['#f6f0ff', '#d3c2e6', '#a785cc', '#7d45b8', '#4f2480']

export function hourLabel(h: number) {
  return `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`
}

function TimingCard({ tz }: { tz: string }) {
  const { s, toast } = useApp()
  const [metric, setMetric] = useState<'imp' | 'conv' | 'out'>('imp')
  // Cells add up to the page totals for the chosen metric.
  const grid = useMemo(
    () => (metric === 'imp' ? spread(s(T.impressions), 7) : metric === 'conv' ? spread(s(T.conversations), 8) : spread(s(T.outcomes), 9)),
    [metric, s],
  )
  const max = Math.max(...grid.flat(), 1)
  let peak = { d: 0, h: 0, v: -1 }
  grid.forEach((row, d) => row.forEach((v, h) => { if (v > peak.v) peak = { d, h, v } }))
  const level = (v: number) => (v === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((v / max) * 4))))
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const unit = metric === 'imp' ? 'impressions' : metric === 'conv' ? 'conversations' : 'outcomes'

  return (
    <V2Card
      cardId="timing"
      className="w-full"
      title={`Busiest: ${dayNames[peak.d]} at ${hourLabel(peak.h)}`}
      takeaway={`Weekday evenings, 7–10pm, are busiest. Saturdays are quietest. Times in ${tz}.`}
      actions={
        <Seg
          size="sm"
          label="Heatmap metric"
          value={metric}
          onChange={setMetric}
          options={[{ value: 'imp', label: 'Impressions' }, { value: 'conv', label: 'Conversations' }, { value: 'out', label: 'Outcomes' }]}
        />
      }
      details="See timing details"
      onDetails={() => toast('Opens the timing report')}
    >
      <div className="overflow-x-auto">
        <div className="flex min-w-[680px] flex-col gap-1">
          {grid.map((row, d) => (
            <div key={d} className="flex items-center gap-1">
              <div className="w-9 flex-none text-xs text-ink-2">{DAYS7[d]}</div>
              {row.map((v, h) => (
                <Tip key={h} content={<span><b className="tnum">{v}</b> {unit} · {dayNames[d]} {hourLabel(h)}–{hourLabel((h + 1) % 24)}</span>}>
                  <div
                    tabIndex={0}
                    aria-label={`${dayNames[d]} ${hourLabel(h)}: ${v} ${unit}`}
                    className="h-[22px] flex-1 rounded-sm transition-transform hover:scale-110"
                    style={{ background: HEAT_COLORS[level(v)] }}
                  />
                </Tip>
              ))}
            </div>
          ))}
          <div className="flex gap-1 pl-10 text-xs text-ink-2">
            <div className="flex-[6]">12am</div>
            <div className="flex-[6]">6am</div>
            <div className="flex-[6]">12pm</div>
            <div className="flex-[6]">6pm</div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 self-end text-xs text-ink-2">
        Fewer
        {HEAT_COLORS.map((c) => (
          <span key={c} className="size-3.5 rounded-sm" style={{ background: c }} />
        ))}
        More
      </div>
    </V2Card>
  )
}

/* ------------------------------------------------------------------ */
/* Add a card + notes                                                  */
/* ------------------------------------------------------------------ */

const CARD_OPTIONS = [
  { name: 'Outcomes by goal', desc: 'Split outcomes by each goal you track.' },
  { name: 'Channels', desc: 'Compare web and WhatsApp side by side.' },
  { name: 'Handoff reasons', desc: 'Why the AI passed conversations to a person.' },
  { name: 'Topic trend', desc: 'One topic’s weekly volume and outcome rate.' },
  { name: 'Countries', desc: 'Where visitors are located.' },
]

function AddCard() {
  const { toast } = useApp()
  const layout = useContext(LayoutCtx)!
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const options = [
    ...layout.hidden.map((id) => ({ key: 'r:' + id, name: CARD_NAMES[id], desc: 'You removed this card. Add it back to its place.' })),
    ...CARD_OPTIONS.map((c) => ({ key: c.name, ...c })),
  ]
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-sm font-medium text-brand-600 hover:bg-surface"
      >
        <Plus className="size-4" /> Add a card
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Add a card"
        description="New cards appear at the end of this page. Use a card’s ⋯ menu to move it."
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!picked.length}
              onClick={() => {
                layout.restore(picked.filter((p) => p.startsWith('r:')).map((p) => p.slice(2) as CardId))
                setOpen(false)
                toast(`Added ${picked.length} card${picked.length > 1 ? 's' : ''}`)
                setPicked([])
              }}
            >
              Add {picked.length || ''} card{picked.length === 1 ? '' : 's'}
            </Button>
          </>
        }
      >
        <div className="grid gap-2">
          {options.map((c) => {
            const on = picked.includes(c.key)
            return (
              <label key={c.key} className={clsx('flex cursor-pointer items-start gap-3 rounded-lg border p-3', on ? 'border-brand-600 bg-brand-50' : 'border-line hover:bg-subtle')}>
                <input
                  type="checkbox"
                  className="mt-1 accent-brand-600"
                  checked={on}
                  onChange={() => setPicked((p) => (on ? p.filter((x) => x !== c.key) : [...p, c.key]))}
                />
                <span>
                  <span className="block text-sm font-medium">{c.name}</span>
                  <span className="block text-sm text-ink-2">{c.desc}</span>
                </span>
              </label>
            )
          })}
        </div>
      </Modal>
    </>
  )
}

function NotesButton() {
  const [open, setOpen] = useState(false)
  const rules = [
    'Every card: title, one-line plain-English takeaway, the chart or table, then a “See details” link.',
    'One name per metric: Impressions, Opens, Conversations, Outcomes.',
    'Every % says what it is out of, e.g. “56% of opens”.',
    'Counts under 50 show the real change next to the %: “+26 (+118%)”.',
    'Red and green only where up is clearly good or bad. Topic volume changes use neutral grey.',
    'Empty cards collapse to one dashed line with a reason and an action, instead of blurred fake data.',
    'Outcomes card: one tile per outcome set in Edit outcomes. With one outcome, its tile is named after it (no duplicate “Outcomes reached”). With 2+, a Total tile comes first.',
    'Every card has a ⋯ menu: Move up, Move down, Remove. Removed cards come back from “Add a card”.',
  ]
  const questions = [
    'Conversations started from a direct link skip the launcher. The funnel shows them as a separate note. Is that how the backend counts them?',
    'What exactly are “Slow” and “Slowest” in reply time? The design assumes Slow = slowest 10%.',
  ]
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-5 z-40 inline-flex items-center gap-2 rounded-full bg-n-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl hover:bg-n-700"
      >
        <NotebookPen className="size-4" /> Design notes
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="v2 design notes" description="Owner: Mohima (design). v1 design, not final. Sample data: Brightline Prod, last 28 days.">
        <h4 className="text-sm font-semibold">Rules for every card</h4>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-2">
          {rules.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <h4 className="mt-6 text-sm font-semibold">Open questions for engineering</h4>
        <ul className="mt-2 space-y-2">
          {questions.map((q) => (
            <li key={q} className="rounded-lg border border-warning-600/30 bg-warning-50 p-3 text-sm text-warning-700">{q}</li>
          ))}
        </ul>
      </Sheet>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function Overview() {
  const { openTopic, setOpenTopic, role, toast, s } = useApp()
  const [tz, setTz] = useState(TIMEZONES[0])
  const [topics, setTopics] = useState<Topic[]>(TOPICS)
  const [manage, setManage] = useState<{ open: boolean; startWith?: 'discover' }>({ open: false })
  const [outcomes, setOutcomes] = useState<Outcome[]>(SAMPLE_OUTCOMES)
  const [editOutcomes, setEditOutcomes] = useState(false)
  const layout = useLayout(toast)

  const selected = topics.find((t) => t.id === openTopic) ?? null
  const active = topics.filter((t) => !t.archived)
  const total = active.reduce((a, t) => a + s(t.count), 0) + s(UNCLASSIFIED.count)

  const SECTION_META: Record<Exclude<Group, 'top'>, { title: string; question: string; extra?: ReactNode }> = {
    performance: { title: 'Performance', question: 'Is the bot working?' },
    questions: { title: 'Customer questions', question: 'What are customers asking?' },
    sources: {
      title: 'Sources',
      question: 'Where do customers come from?',
      extra: <EmptyLine title="Campaigns" reason="No campaigns sent in this period" action="Create a campaign" onAction={() => toast('Opens Campaigns → New campaign')} />,
    },
    service: {
      title: 'Service quality',
      question: 'How well are customers served?',
      extra: <EmptyLine title="CSAT" reason="No ratings in this period. Ratings show once customers answer a survey." action="Set up a survey" onAction={() => toast('Opens CSAT survey setup')} />,
    },
    timing: { title: 'Timing', question: 'When do customers come?' },
  }
  const cards: Record<CardId, ReactNode> = {
    outcomes: <OutcomesTiles key="outcomes" outcomes={outcomes} onEdit={() => setEditOutcomes(true)} />,
    insights: <Insights key="insights" onOpenTopic={setOpenTopic} />,
    funnel: <Funnel key="funnel" />,
    trends: <WeeklyChart key="trends" />,
    topics: (
      <TopicsCard
        key="topics"
        topics={topics}
        onOpen={setOpenTopic}
        onManage={() => setManage({ open: true })}
        onDiscover={() => setManage({ open: true, startWith: 'discover' })}
      />
    ),
    fields: <FieldsCard key="fields" />,
    sources: <SourcesCard key="sources" />,
    service: <ServiceCard key="service" />,
    timing: <TimingCard key="timing" tz={tz} />,
  }

  return (
    <LayoutCtx.Provider value={layout}>
    <div className="flex flex-col gap-6">
      <Header tz={tz} setTz={setTz} />
      {layout.visible('top').map((id) => cards[id])}

      {layout.sections.map((g) => (
        <section key={g} id={g} aria-labelledby={`${g}-h`} className="flex scroll-mt-6 flex-col gap-3">
          <SectionTitle id={`${g}-h`} title={SECTION_META[g].title} question={SECTION_META[g].question} />
          <div className="flex flex-wrap gap-3">{layout.visible(g).map((id) => cards[id])}</div>
          {SECTION_META[g].extra}
        </section>
      ))}

      <AddCard />
      <NotesButton />

      <TopicSheet
        topic={selected}
        unclassified={openTopic === 'unclassified'}
        unclassifiedCount={s(UNCLASSIFIED.count)}
        total={total}
        open={!!openTopic}
        onOpenChange={(o) => !o && setOpenTopic(null)}
        onManage={role === 'admin' ? () => { setOpenTopic(null); setManage({ open: true }) } : undefined}
      />
      <ManageTopics
        open={manage.open}
        onOpenChange={(o) => setManage((m) => ({ ...m, open: o }))}
        topics={topics}
        setTopics={setTopics}
        startWith={manage.startWith}
      />
      <EditOutcomes open={editOutcomes} onOpenChange={setEditOutcomes} outcomes={outcomes} setOutcomes={setOutcomes} />
    </div>
    </LayoutCtx.Provider>
  )
}
