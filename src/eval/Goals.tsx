import { useState } from 'react'
import { Archive, ArchiveRestore, BarChart3, Check, ChevronRight, Pencil, Plus, Sparkles, X } from 'lucide-react'
import { useApp } from '../state'
import { Badge, Button, Modal, Tip, clsx } from '../components/ui'
import { GOALS } from './data'
import { Filters, Generating, Intro, LayoutToggle, NO_RING, SearchBox, field, iconBtn, useBadge, type Layout } from './shared'

/*
 * Goals (prod: Objectives). What a good conversation must do; every scenario is graded against them.
 * Columns as in prod: Objective | Source | Status. New ones arrive as "Pending review" (light purple, at the top)
 * with Approve / Reject; goals are the one list where Tars asks first, because a wrong goal makes the score wrong.
 */

type Status = 'Approved' | 'Pending review' | 'Archived'
type From = 'Agent context' | 'Real chats' | 'Both' | 'Problem in Analytics'
type Source = 'Intended' | 'Observed' | 'Hybrid'
type Goal = { id: string; name: string; about: string; from: From; status: Status; passed?: number; total?: number; problem?: { name: string; topic: string; seen: string } }

const FROM_TEXT: Record<From, string> = {
  'Agent context': 'From your agent context',
  'Real chats': 'From real chats',
  Both: 'From your agent context and real chats',
  'Problem in Analytics': 'From a problem you confirmed in Analytics',
}
const FROM: Record<string, From> = { website: 'Both', terms: 'Both' }

const START: Goal[] = [
  // Came from Analytics: the user said Yes to a problem, so Tars suggests a goal to test it before going live
  {
    id: 'price', name: 'Gives a price when asked', about: 'When a parent asks what care costs, the agent gives the current self-pay price.', from: 'Problem in Analytics', status: 'Pending review',
    problem: { name: 'Doesn’t give current self-pay rates', topic: 'Insurance and pricing', seen: '3 of 15 chats this week' },
  },
  ...GOALS.map((g) => ({
    id: g.id, name: g.name, about: g.about,
    from: FROM[g.id] ?? ('Agent context' as From), status: 'Approved' as Status, passed: g.passed, total: g.total,
  })),
]
// What "Generate goals" suggests (prod's pending objectives, in plain words)
const GENERATED: Goal[] = [
  { id: 'g-online', name: 'Mentions online care with clinic locations', about: 'When a parent asks where clinics are, the agent also says care is available online.', from: 'Both', status: 'Pending review' },
  { id: 'g-phone', name: 'Sends current patients to the member phone line', about: 'When a parent wants to reschedule or reach their clinician, the agent gives the member phone number.', from: 'Both', status: 'Pending review' },
  { id: 'g-scope', name: 'Kindly redirects adults', about: 'When an adult asks about care for themselves, the agent explains Brightline serves ages 0–18 and points them elsewhere.', from: 'Agent context', status: 'Pending review' },
  { id: 'g-testing', name: 'Doesn’t suggest a diagnosis', about: 'When a parent asks about testing, the agent explains the process without suggesting a diagnosis.', from: 'Both', status: 'Pending review' },
]

const FILTERS = ['All', 'Pending review', 'Approved', 'Archived'] as const
// Prod's source words; plain meaning on hover. A goal from an Analytics problem comes from real chats, so it's Observed.
const SOURCE: Record<From, Source> = { 'Agent context': 'Intended', 'Real chats': 'Observed', Both: 'Hybrid', 'Problem in Analytics': 'Observed' }
type Filter = (typeof FILTERS)[number]
const COLS = 'grid grid-cols-[minmax(0,1fr)_110px_120px_72px] items-center gap-3'

function SourceChip({ g }: { g: Goal }) {
  return <Tip content={FROM_TEXT[g.from]}><span className="inline-flex cursor-default"><Badge>{SOURCE[g.from]}</Badge></span></Tip>
}
function StatusTag({ s }: { s: Status }) {
  if (s === 'Approved') return <Badge tone="success">Approved</Badge>
  if (s === 'Pending review') return <Badge tone="warning">Pending review</Badge>
  return <Badge>Archived</Badge>
}
function Name({ g }: { g: Goal }) {
  return <span className={clsx('min-w-0 truncate text-sm', g.status === 'Archived' ? 'text-ink-3' : 'text-ink')}>{g.name}</span>
}

/** Where a goal from Analytics came from: the problem, its topic and how often it happens. */
function FromProblem({ g }: { g: Goal }) {
  const { toast } = useApp()
  if (!g.problem) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-50 px-3 py-2.5 text-sm">
      <span className="text-ink-2"><BarChart3 className="mr-1.5 inline size-4 text-brand-600" />Problem in <b className="font-medium text-ink">{g.problem.topic}</b>: “{g.problem.name}” · {g.problem.seen}</span>
      <button onClick={() => toast(`Opens ${g.problem!.topic} in Analytics`)} className="text-xs font-medium text-brand-600 hover:underline">See in Analytics</button>
    </div>
  )
}

function Actions({ g, hide, onEdit, onStatus, onDismiss }: { g: Goal; hide?: boolean; onEdit: () => void; onStatus: (id: string, s: Status) => void; onDismiss: (id: string) => void }) {
  if (g.status === 'Pending review') {
    return (
      <>
        <Tip content="Approve"><button onClick={() => onStatus(g.id, 'Approved')} aria-label={`Approve ${g.name}`} className={clsx(iconBtn, 'hover:bg-success-50 hover:text-success-700')}><Check className="size-4" /></button></Tip>
        <Tip content="Reject"><button onClick={() => onDismiss(g.id)} aria-label={`Reject ${g.name}`} className={clsx(iconBtn, 'hover:bg-danger-50 hover:text-danger-700')}><X className="size-4" /></button></Tip>
      </>
    )
  }
  if (hide) return null
  return (
    <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      {g.status === 'Archived' ? (
        <Tip content="Restore"><button onClick={() => onStatus(g.id, 'Approved')} aria-label={`Restore ${g.name}`} className={clsx(iconBtn, 'hover:bg-muted hover:text-ink')}><ArchiveRestore className="size-4" /></button></Tip>
      ) : (
        <>
          <Tip content="Edit"><button onClick={onEdit} aria-label={`Edit ${g.name}`} className={clsx(iconBtn, 'hover:bg-muted hover:text-ink')}><Pencil className="size-4" /></button></Tip>
          <Tip content="Archive"><button onClick={() => onStatus(g.id, 'Archived')} aria-label={`Archive ${g.name}`} className={clsx(iconBtn, 'hover:bg-muted hover:text-ink')}><Archive className="size-4" /></button></Tip>
        </>
      )}
    </span>
  )
}

/** Add or edit a goal: name, one sentence, and whether it must pass. */
function GoalModal({ goal, open, onClose, onSave }: { goal: Goal | null; open: boolean; onClose: () => void; onSave: (name: string, about: string) => void }) {
  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const [last, setLast] = useState<Goal | null | undefined>(undefined)
  const [wasOpen, setWasOpen] = useState(false)
  // Fill the fields each time it opens
  if (open && (!wasOpen || goal !== last)) { setWasOpen(true); setLast(goal); setName(goal?.name ?? ''); setAbout(goal?.about ?? '') }
  if (!open && wasOpen) setWasOpen(false)
  const submit = () => { if (name.trim()) onSave(name.trim(), about.trim()) }
  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={goal ? 'Edit objective' : 'Add objective'}
      description="Something a good conversation must do. Every scenario is graded against it."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={submit}>{goal ? 'Save objective' : 'Add objective'}</Button></>}
    >
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
        <div>
          <label htmlFor="goal-name" className="block text-sm font-medium text-ink">Name</label>
          <input style={NO_RING} id="goal-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gives a price when asked" className={clsx('mt-1.5 placeholder:text-ink-3', field)} />
        </div>
        <div>
          <label htmlFor="goal-about" className="block text-sm font-medium text-ink">What a pass looks like</label>
          <textarea style={NO_RING} id="goal-about" value={about} onChange={(e) => setAbout(e.target.value)} rows={3} placeholder="When … the agent …" className={clsx('mt-1.5 placeholder:text-ink-3', field)} />
        </div>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  )
}

// The brief from prod (Evaluation Brief), which now lives in the agent context. Generate reads it.
const BRIEF_AGENT = `Answer each parent's question accurately from Brightline's own website and FAQ content, in Brightline's warm, plain "living room language" voice.
Screen every message against Brightline's safety-risk word list. If a risk word is detected, show Brightline's crisis script (911 / 988) immediately.
When a parent shows intent to book, give one clear next step: the Tars-dedicated appointment request form or the Tars-dedicated member engagement phone number.
Let parents who are just gathering information get their answers without pressure.`
const BRIEF_BUSINESS = `Brightline is a pediatric and family mental health company offering therapy, psychiatric services, and psychological testing for kids, teens, and families.

The business wants the chatbot to lift engagement, capture after-hours intent, start more scheduling actions from the site, and take routine questions off the intake team.`

/** Generate goals: show what Tars will read (the agent context), so it can be checked first. */
function BriefModal({ open, onClose, onGenerate }: { open: boolean; onClose: () => void; onGenerate: () => void }) {
  const [agent, setAgent] = useState(BRIEF_AGENT)
  const [business, setBusiness] = useState(BRIEF_BUSINESS)
  const [useChats, setUseChats] = useState(true)
  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width="max-w-2xl"
      title="Generate objectives"
      description="Tars reads your agent context and real chats, then suggests objectives for you to review."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={onGenerate}><Sparkles className="size-4" /> Generate objectives</Button></>}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="brief-agent" className="block text-sm font-medium text-ink">What the agent must do</label>
          <textarea style={NO_RING} id="brief-agent" value={agent} onChange={(e) => setAgent(e.target.value)} rows={5} className={clsx('mt-1.5', field)} />
        </div>
        <div>
          <label htmlFor="brief-business" className="block text-sm font-medium text-ink">What the business wants</label>
          <textarea style={NO_RING} id="brief-business" value={business} onChange={(e) => setBusiness(e.target.value)} rows={4} className={clsx('mt-1.5', field)} />
        </div>
        <label htmlFor="brief-chats" className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3">
          <input id="brief-chats" type="checkbox" checked={useChats} onChange={(e) => setUseChats(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand-600)]" />
          <span><span className="block text-sm text-ink">Also learn from real chats</span><span className="text-xs text-ink-3">513 chats from the last 30 days</span></span>
        </label>
        <p className="text-xs text-ink-3">This is your agent context. Changes are saved to Configure.</p>
      </div>
    </Modal>
  )
}

function Row({ g, open, onToggle, onEdit, onStatus, onDismiss }: { g: Goal; open: boolean; onToggle: () => void; onEdit: (g: Goal) => void; onStatus: (id: string, s: Status) => void; onDismiss: (id: string) => void }) {
  const sug = g.status === 'Pending review'
  return (
    <li className="border-b border-line last:border-0">
      <div className={clsx(COLS, 'group py-2.5 pr-10 pl-4 hover:bg-subtle', open && 'bg-subtle')}>
        <button onClick={onToggle} aria-expanded={open} className="flex min-w-0 items-center gap-3 text-left">
          <ChevronRight className={clsx('size-4 shrink-0 text-ink-3 transition-transform', open && 'rotate-90')} />
          <Name g={g} />
        </button>
        <span><SourceChip g={g} /></span>
        <span className="text-center"><StatusTag s={g.status} /></span>
        <span className="-my-1.5 flex justify-end gap-1"><Actions g={g} hide={open} onEdit={() => onEdit(g)} onStatus={onStatus} onDismiss={onDismiss} /></span>
      </div>
      {open && (
        <div className="anim-fade space-y-3 px-4 pt-2 pb-4 pl-11">
          <p className="max-w-[720px] text-sm text-ink-2">{g.about}</p>
          <FromProblem g={g} />
          <div className="flex flex-wrap gap-2">
            {sug ? (
              <><Button size="sm" variant="primary" onClick={() => onStatus(g.id, 'Approved')}><Check className="size-3.5" /> Approve</Button><Button size="sm" onClick={() => onEdit(g)}><Pencil className="size-3.5" /> Edit first</Button><Button size="sm" variant="ghost" onClick={() => onDismiss(g.id)}>Reject</Button></>
            ) : g.status === 'Archived' ? (
              <Button size="sm" onClick={() => onStatus(g.id, 'Approved')}><ArchiveRestore className="size-3.5" /> Restore</Button>
            ) : (
              <><Button size="sm" onClick={() => onEdit(g)}><Pencil className="size-3.5" /> Edit</Button><Button size="sm" variant="ghost" onClick={() => onStatus(g.id, 'Archived')}><Archive className="size-3.5" /> Archive</Button></>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

function GoalCard({ g, onEdit, onStatus, onDismiss }: { g: Goal; onEdit: (g: Goal) => void; onStatus: (id: string, s: Status) => void; onDismiss: (id: string) => void }) {
  return (
    <div className="group flex flex-col rounded-xl border border-line bg-surface p-4 hover:shadow-md">
      <Name g={g} />
      <p className="mt-2 line-clamp-3 text-sm text-ink-2">{g.about}</p>
      <div className="mt-auto flex items-center gap-2 pt-4">
        <SourceChip g={g} />
        <StatusTag s={g.status} />
        <span className="-my-1.5 ml-auto flex gap-1"><Actions g={g} onEdit={() => onEdit(g)} onStatus={onStatus} onDismiss={onDismiss} /></span>
      </div>
    </div>
  )
}

export function GoalsTab({ onBadge }: { onBadge?: (n: number) => void }) {
  const { toast } = useApp()
  const [list, setList] = useState(START)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [open, setOpen] = useState<string | null>(null)
  const [layout, setLayout] = useState<Layout>('Table')
  const [editing, setEditing] = useState<Goal | null>(null)
  const [adding, setAdding] = useState(false)
  const [briefOpen, setBriefOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  const setStatus = (id: string, s: Status) => {
    setList((l) => l.map((g) => (g.id === id ? { ...g, status: s } : g)))
    toast(s === 'Archived' ? 'Objective archived' : s === 'Approved' ? 'Objective approved. It counts from the next test run.' : 'Saved')
  }
  const dismiss = (id: string) => { setList((l) => l.filter((g) => g.id !== id)); toast('Objective rejected') }
  const useAll = () => { setList((l) => l.map((g) => (g.status === 'Pending review' ? { ...g, status: 'Approved' } : g))); toast('Objectives approved. They count from the next test run.') }
  const save = (name: string, about: string) => {
    if (editing) setList((l) => l.map((g) => (g.id === editing.id ? { ...g, name, about } : g)))
    else setList((l) => [...l, { id: `new-${Date.now()}`, name, about, from: 'Agent context', status: 'Approved' }])
    toast(editing ? 'Objective saved' : 'Objective added')
    setEditing(null); setAdding(false)
  }
  const generate = () => {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      setList((l) => {
        const fresh = GENERATED.filter((g) => !l.some((x) => x.id === g.id))
        toast(fresh.length ? `${fresh.length} new objectives to review` : 'No new objectives. Everything is up to date.')
        return [...fresh, ...l]
      })
      setFilter('All')
    }, 2000)
  }

  const count = (f: Filter) => (f === 'All' ? list.filter((g) => g.status !== 'Archived').length : list.filter((g) => g.status === f).length)
  const rank = (g: Goal) => (g.status === 'Pending review' ? 0 : g.status === 'Approved' ? 1 : 2)
  const shown = list
    .filter((g) => (filter === 'All' ? g.status !== 'Archived' : g.status === filter) && `${g.name} ${g.about}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => rank(a) - rank(b))
  const suggested = count('Pending review')
  useBadge(suggested, onBadge)

  return (
    <>
      <Intro
        text="What a good conversation must do. Every scenario is graded against them."
        sub={<><b className="font-semibold text-ink">{count('Approved')} objectives</b>{suggested > 0 && <> · <b className="font-semibold text-brand-700">{suggested} suggested</b> for you to review</>}</>}
        actions={<>
          <Button size="sm" onClick={() => setBriefOpen(true)} disabled={generating}><Sparkles className="size-3.5" /> {generating ? 'Generating…' : 'Generate objectives'}</Button>
          <Button size="sm" variant="primary" onClick={() => setAdding(true)}><Plus className="size-3.5" /> Add objective</Button>
        </>}
      />
      <GoalModal goal={editing} open={adding || !!editing} onClose={() => { setEditing(null); setAdding(false) }} onSave={save} />
      <BriefModal open={briefOpen} onClose={() => setBriefOpen(false)} onGenerate={() => { setBriefOpen(false); generate() }} />

      <div className="mt-4 rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <SearchBox id="goal-search" value={q} onChange={setQ} placeholder="Search objectives" />
          <Filters label="Filter objectives" items={FILTERS} value={filter} onChange={setFilter} count={count} />
          <LayoutToggle value={layout} onChange={setLayout} />
          {suggested > 1 && <Button size="sm" className="ml-auto" onClick={useAll}><Check className="size-3.5" /> Approve all {suggested}</Button>}
        </div>
        {generating && <Generating text="Reading your agent context and real chats…" />}
        {shown.length === 0 && !generating && <p className="px-4 py-8 text-center text-sm text-ink-3">{q ? `No objectives match “${q}”.` : `No ${filter.toLowerCase()} objectives.`}</p>}
        {layout === 'Cards' ? (
          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((g) => <GoalCard key={g.id} g={g} onEdit={setEditing} onStatus={setStatus} onDismiss={dismiss} />)}
          </div>
        ) : (
          <>
            <div className={clsx(COLS, 'border-b border-line py-2 pr-10 pl-4 text-xs font-medium text-ink-3')}>
              <span className="pl-7">Objective</span><span>Source</span><span className="text-center">Status</span><span />
            </div>
            <ul>{shown.map((g) => <Row key={g.id} g={g} open={open === g.id} onToggle={() => setOpen(open === g.id ? null : g.id)} onEdit={setEditing} onStatus={setStatus} onDismiss={dismiss} />)}</ul>
          </>
        )}
      </div>
    </>
  )
}
