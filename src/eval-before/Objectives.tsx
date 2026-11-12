import { useState } from 'react'
import { Archive, ArchiveRestore, Check, ChevronRight, LayoutGrid, List, Loader2, Pencil, Plus, Search, Sparkles, X } from 'lucide-react'
import { useApp } from '../state'
import { Badge, Button, Modal, Tip, clsx } from '../components/ui'
import { OBJECTIVES } from './data'

/*
 * Objectives tab: search + filter on top, one row per objective with just its name, source and status.
 * Open a row (chevron on the left) to read the full description, then Edit or Archive it.
 * Newly generated objectives ("Pending review", as in prod) sit at the top, highlighted light purple, with approve / reject on the row.
 * Uses only what an objective has in prod: name, description, source, status.
 */

export type Status = 'Approved' | 'Pending review' | 'Archived'
type Obj = { id: string; name: string; about: string; source: 'Intended' | 'Observed' | 'Hybrid'; status: Status }

// Source as in prod: Intended (from the brief), Observed (seen in real conversations), Hybrid (both)
const SOURCE: Record<string, Obj['source']> = { website: 'Hybrid', terms: 'Hybrid' }
const APPROVED: Obj[] = OBJECTIVES.filter((o) => o.status === 'Approved').map((o) => ({
  id: o.id, name: o.name, about: o.about, source: SOURCE[o.id] ?? 'Intended', status: 'Approved',
}))
// What "Generate objectives" proposes: the pending ones from prod's Objectives tab
const GENERATED: Obj[] = [
  { id: 'g-online', name: 'Clinic Information Includes Online Option', about: 'When a parent asks about clinic location, the agent also mentions that care is available online.', source: 'Hybrid', status: 'Pending review' },
  { id: 'g-phone', name: 'Existing Patient Requests Routed to Phone', about: 'When a parent asks to reschedule, check an appointment or reach their clinician, the agent gives the member phone number.', source: 'Hybrid', status: 'Pending review' },
  { id: 'g-scope', name: 'Out-of-Scope Audiences Identified and Redirected', about: 'When an adult asks about care for themselves, the agent explains Brightline serves ages 0–18 and points them elsewhere.', source: 'Intended', status: 'Pending review' },
  { id: 'g-clinician', name: 'Specific Clinician Requests Routed Through Intake', about: 'When a parent requests a particular clinician, the agent explains families are matched through intake.', source: 'Hybrid', status: 'Pending review' },
  { id: 'g-testing', name: 'Testing Explained Without Suggesting a Diagnosis', about: 'When a parent asks about psychological testing, the agent explains the process without suggesting a diagnosis.', source: 'Hybrid', status: 'Pending review' },
  { id: 'g-billing', name: 'Unavailable Billing Details Routed to Intake', about: 'When a parent asks about insurance or billing details the agent doesn’t have, it routes them to the intake team.', source: 'Hybrid', status: 'Pending review' },
]
// Prototype starts with only the approved ones; Generate objectives brings in the new ones to review
const START: Obj[] = APPROVED

// Fields show focus with their own purple border; this stops the site-wide focus outline drawing a second stroke
export const NO_RING = { outline: 'none' }

export const FILTERS = ['All', 'Pending review', 'Approved', 'Archived'] as const
export type Filter = (typeof FILTERS)[number]

// Table columns: objective, source, status, actions. Shared by the header and every row so they line up.
// Objective, source, status (centred), then a fixed actions column so approve / reject always have their own space
const COLS = 'grid grid-cols-[minmax(0,1fr)_110px_120px_72px] items-center gap-3'

export function StatusTag({ s }: { s: Status }) {
  if (s === 'Approved') return <Badge tone="success">Approved</Badge>
  if (s === 'Pending review') return <Badge tone="warning">Pending review</Badge>
  return <Badge>Archived</Badge>
}

// Source in plain words, shown on hover over the Source column (prod: Intended / Observed / Hybrid)
export const SOURCE_TEXT: Record<Obj['source'], string> = {
  Intended: 'From your agent context',
  Observed: 'From real conversations',
  Hybrid: 'From your agent context and real conversations',
}

function Row({ o, open, onToggle, onSave, onStatus, onReject }: {
  o: Obj; open: boolean; onToggle: () => void; onSave: (o: Obj) => void; onStatus: (id: string, s: Status) => void; onReject: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(o.name)
  const [about, setAbout] = useState(o.about)
  const startEdit = () => { setName(o.name); setAbout(o.about); setEditing(true) }
  return (
    <li className="border-b border-line last:border-0">
      {/* Closed: chevron + name, source, status, and approve / reject for new ones (light purple) */}
      <div className={clsx(COLS, 'group py-2.5 pr-10 pl-4', o.status === 'Pending review' ? 'bg-brand-50 hover:bg-brand-100' : 'hover:bg-subtle', open && o.status !== 'Pending review' && 'bg-subtle')}>
        <button onClick={onToggle} aria-expanded={open} className="flex min-w-0 items-center gap-3 text-left">
          <ChevronRight className={clsx('size-4 shrink-0 text-ink-3 transition-transform', open && 'rotate-90')} />
          <span className={clsx('min-w-0 truncate text-sm', o.status === 'Archived' ? 'text-ink-3' : 'text-ink')}>{o.name}</span>
        </button>
        {/* Prod's word in the column; hover for what it means in plain words */}
        <span><Tip content={SOURCE_TEXT[o.source]}><span className="inline-flex cursor-default"><Badge>{o.source}</Badge></span></Tip></span>
        <span className="text-center"><StatusTag s={o.status} /></span>
        {/* Actions column: approve / reject for new ones; edit / archive (or restore) on hover for the rest.
            -my-1.5 keeps the 32px buttons from making rows taller, so every row is the same height open or closed. */}
        <span className="-my-1.5 flex justify-end gap-1">
          {/* Hidden while the row is open, since the open row has its own Edit / Archive buttons */}
          {o.status !== 'Pending review' && !open && (
            <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              {o.status === 'Archived' ? (
                <Tip content="Restore">
                  <button onClick={() => onStatus(o.id, 'Approved')} aria-label={`Restore ${o.name}`} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-muted hover:text-ink"><ArchiveRestore className="size-4" /></button>
                </Tip>
              ) : (
                <>
                  <Tip content="Edit">
                    <button onClick={() => { if (!open) onToggle(); startEdit() }} aria-label={`Edit ${o.name}`} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-muted hover:text-ink"><Pencil className="size-4" /></button>
                  </Tip>
                  <Tip content="Archive">
                    <button onClick={() => onStatus(o.id, 'Archived')} aria-label={`Archive ${o.name}`} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-muted hover:text-ink"><Archive className="size-4" /></button>
                  </Tip>
                </>
              )}
            </span>
          )}
          {o.status === 'Pending review' && (
            <>
              <Tip content="Approve">
                <button onClick={() => onStatus(o.id, 'Approved')} aria-label={`Approve ${o.name}`} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-success-50 hover:text-success-700">
                  <Check className="size-4" />
                </button>
              </Tip>
              <Tip content="Reject">
                <button onClick={() => onReject(o.id)} aria-label={`Reject ${o.name}`} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-danger-50 hover:text-danger-700">
                  <X className="size-4" />
                </button>
              </Tip>
            </>
          )}
        </span>
      </div>

      {/* Open: full description, then actions. Edit swaps the text for the two fields. */}
      {open && (
        <div className="anim-fade px-4 pt-2 pb-4 pl-11">
          {editing ? (
            <div className="space-y-3">
              <div>
                <label htmlFor={`name-${o.id}`} className="block text-xs font-medium text-ink-2">Name</label>
                <input style={NO_RING} id={`name-${o.id}`} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none" />
              </div>
              <div>
                <label htmlFor={`about-${o.id}`} className="block text-xs font-medium text-ink-2">Description</label>
                <textarea style={NO_RING} id={`about-${o.id}`} value={about} onChange={(e) => setAbout(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" disabled={!name.trim()} onClick={() => { onSave({ ...o, name: name.trim(), about: about.trim() }); setEditing(false) }}>Save</Button>
                <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="max-w-[720px] text-sm text-ink-2">{o.about}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {o.status !== 'Archived' && <Button size="sm" onClick={startEdit}><Pencil className="size-3.5" /> Edit</Button>}
                {o.status === 'Archived'
                  ? <Button size="sm" onClick={() => onStatus(o.id, 'Approved')}><ArchiveRestore className="size-3.5" /> Restore</Button>
                  : <Button size="sm" variant="ghost" onClick={() => onStatus(o.id, 'Archived')}><Archive className="size-3.5" /> Archive</Button>}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  )
}

/** Card layout: name, description, source and status, with the same actions as the table. Edit happens in the card. */
function ObjCard({ o, onSave, onStatus, onReject }: { o: Obj; onSave: (o: Obj) => void; onStatus: (id: string, s: Status) => void; onReject: (id: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(o.name)
  const [about, setAbout] = useState(o.about)
  const pending = o.status === 'Pending review'
  const iconBtn = 'grid size-8 place-items-center rounded-lg text-ink-3'
  return (
    <div className={clsx('group flex flex-col rounded-xl border p-4', pending ? 'border-brand-200 bg-brand-50' : 'border-line bg-surface hover:shadow-md')}>
      {editing ? (
        <div className="space-y-2">
          <input style={NO_RING} aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink focus:border-brand-400 focus:outline-none" />
          <textarea style={NO_RING} aria-label="Description" value={about} onChange={(e) => setAbout(e.target.value)} rows={3} className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 focus:border-brand-400 focus:outline-none" />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" disabled={!name.trim()} onClick={() => { onSave({ ...o, name: name.trim(), about: about.trim() }); setEditing(false) }}>Save</Button>
            <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <p className={clsx('text-sm font-medium', o.status === 'Archived' ? 'text-ink-3' : 'text-ink')}>{o.name}</p>
          <p className="mt-1 line-clamp-3 text-sm text-ink-2">{o.about}</p>
          <div className="mt-auto flex items-center gap-2 pt-4">
            <Tip content={SOURCE_TEXT[o.source]}><span className="inline-flex cursor-default"><Badge>{o.source}</Badge></span></Tip>
            <StatusTag s={o.status} />
            {/* Same actions as the table: approve / reject for new ones, edit / archive (or restore) on hover */}
            <span className="-my-1.5 ml-auto flex gap-1">
              {pending ? (
                <>
                  <Tip content="Approve"><button onClick={() => onStatus(o.id, 'Approved')} aria-label={`Approve ${o.name}`} className={clsx(iconBtn, 'hover:bg-success-50 hover:text-success-700')}><Check className="size-4" /></button></Tip>
                  <Tip content="Reject"><button onClick={() => onReject(o.id)} aria-label={`Reject ${o.name}`} className={clsx(iconBtn, 'hover:bg-danger-50 hover:text-danger-700')}><X className="size-4" /></button></Tip>
                </>
              ) : (
                <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  {o.status === 'Archived' ? (
                    <Tip content="Restore"><button onClick={() => onStatus(o.id, 'Approved')} aria-label={`Restore ${o.name}`} className={clsx(iconBtn, 'hover:bg-muted hover:text-ink')}><ArchiveRestore className="size-4" /></button></Tip>
                  ) : (
                    <>
                      <Tip content="Edit"><button onClick={() => { setName(o.name); setAbout(o.about); setEditing(true) }} aria-label={`Edit ${o.name}`} className={clsx(iconBtn, 'hover:bg-muted hover:text-ink')}><Pencil className="size-4" /></button></Tip>
                      <Tip content="Archive"><button onClick={() => onStatus(o.id, 'Archived')} aria-label={`Archive ${o.name}`} className={clsx(iconBtn, 'hover:bg-muted hover:text-ink')}><Archive className="size-4" /></button></Tip>
                    </>
                  )}
                </span>
              )}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/** Add objective, as a modal: the same two fields prod asks for. Fields reset each time it opens. */
function AddModal({ open, onAdd, onClose }: { open: boolean; onAdd: (name: string, about: string) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const close = () => { setName(''); setAbout(''); onClose() }
  const submit = () => { if (!name.trim()) return; onAdd(name.trim(), about.trim()); setName(''); setAbout('') }
  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Add objective"
      description="A rule a good conversation must follow. Every scenario is graded against it."
      footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={submit}>Add objective</Button></>}
    >
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
        <div>
          <label htmlFor="new-obj-name" className="block text-sm font-medium text-ink">Name</label>
          <input style={NO_RING} id="new-obj-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gives a price when asked" className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="new-obj-about" className="block text-sm font-medium text-ink">Description</label>
          <textarea style={NO_RING} id="new-obj-about" value={about} onChange={(e) => setAbout(e.target.value)} rows={3} placeholder="What a good conversation does, in one sentence" className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none" />
        </div>
        {/* Enter in the name field adds it */}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  )
}

// The brief from prod (Evaluation Brief), which now lives in the agent context. Generate reads it.
const BRIEF_AGENT = `Answer each parent's question accurately from Brightline's own website and FAQ content, in Brightline's warm, plain "living room language" voice.
Screen every message against Brightline's safety-risk word list. If a risk word is detected, show Brightline's crisis script (911 / 988) immediately.
When a parent shows intent to book, give one clear next step: the Tars-dedicated appointment request form or the Tars-dedicated member engagement phone number.
Let parents who are just gathering information get their answers without pressure.
Politely redirect off-topic or out-of-scope questions back to how Brightline can help.`
const BRIEF_BUSINESS = `Brightline is a pediatric and family mental health company offering therapy, psychiatric services, and psychological testing for kids, teens, and families. It is moving from B2B2C to direct-to-consumer.

The business wants the chatbot to:
Lift engagement above the ~1% landing-page baseline.
Capture after-hours intent that would otherwise be lost overnight or over a weekend.
Start more scheduling actions from the site without adding headcount.
Take routine questions off the intake team.`

/** Generate objectives, step 1: show the brief Tars will read, so it can be checked or edited first. */
function BriefModal({ open, onClose, onGenerate }: { open: boolean; onClose: () => void; onGenerate: () => void }) {
  const [agent, setAgent] = useState(BRIEF_AGENT)
  const [business, setBusiness] = useState(BRIEF_BUSINESS)
  const [useChats, setUseChats] = useState(true)
  const field = 'mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none'
  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width="max-w-2xl"
      title="Generate objectives"
      description="Tars writes objectives from your brief. Check it’s up to date first."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={onGenerate}><Sparkles className="size-4" /> Generate objectives</Button></>}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="brief-agent" className="block text-sm font-medium text-ink">Agent goals</label>
          <p className="text-xs text-ink-3">What the agent must achieve in a conversation.</p>
          <textarea style={NO_RING} id="brief-agent" value={agent} onChange={(e) => setAgent(e.target.value)} rows={6} className={field} />
        </div>
        <div>
          <label htmlFor="brief-business" className="block text-sm font-medium text-ink">Business goals and intents</label>
          <p className="text-xs text-ink-3">What the business wants from these conversations, and why.</p>
          <textarea style={NO_RING} id="brief-business" value={business} onChange={(e) => setBusiness(e.target.value)} rows={6} className={field} />
        </div>
        {/* Real conversations make objectives "Observed" or "Hybrid"; without them everything is "Intended" */}
        <label htmlFor="brief-chats" className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3">
          <input id="brief-chats" type="checkbox" checked={useChats} onChange={(e) => setUseChats(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand-600)]" />
          <span>
            <span className="block text-sm text-ink">Also learn from real conversations</span>
            <span className="text-xs text-ink-3">513 conversations from the last 30 days</span>
          </span>
        </label>
        <p className="text-xs text-ink-3">Changes are saved to the agent context in Configure.</p>
      </div>
    </Modal>
  )
}

export function ObjectivesTab() {
  const { toast } = useApp()
  const [list, setList] = useState(START)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [briefOpen, setBriefOpen] = useState(false)
  const [layout, setLayout] = useState<'Table' | 'Cards'>('Table')

  const save = (o: Obj) => { setList((l) => l.map((x) => (x.id === o.id ? o : x))); toast('Objective saved') }
  const setStatus = (id: string, s: Status) => {
    setList((l) => l.map((o) => (o.id === id ? { ...o, status: s } : o)))
    toast(s === 'Archived' ? 'Objective archived' : s === 'Approved' ? 'Objective approved' : 'Saved')
  }
  const approveAll = () => { setList((l) => l.map((o) => (o.status === 'Pending review' ? { ...o, status: 'Approved' } : o))); toast('All new objectives approved') }
  // Reject: a generated objective that's wrong is removed
  const reject = (id: string) => { setList((l) => l.filter((o) => o.id !== id)); toast('Objective rejected') }
  // Generate: ~2s, then any proposed objectives not already in the list come back as Pending review, at the top
  const [generating, setGenerating] = useState(false)
  const generate = () => {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      setList((l) => {
        const fresh = GENERATED.filter((g) => !l.some((o) => o.id === g.id))
        toast(fresh.length ? `${fresh.length} new objectives to review` : 'No new objectives. Everything is up to date.')
        return [...fresh, ...l]
      })
      setFilter('All')
    }, 2000)
  }
  const add = (name: string, about: string) => {
    setList((l) => [...l, { id: `new-${l.length}`, name, about, source: 'Intended', status: 'Approved' }])
    setAdding(false)
    toast('Objective added')
  }

  // "All" leaves archived ones out; they have their own filter
  const count = (f: Filter) => (f === 'All' ? list.filter((o) => o.status !== 'Archived').length : list.filter((o) => o.status === f).length)
  const rank = (o: Obj) => (o.status === 'Pending review' ? 0 : o.status === 'Approved' ? 1 : 2) // pending first
  const shown = list
    .filter((o) => (filter === 'All' ? o.status !== 'Archived' : o.status === filter) && `${o.name} ${o.about}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => rank(a) - rank(b))

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-[640px] text-sm text-ink-2">Objectives are the rules a good conversation must follow. Every scenario is graded against them.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setBriefOpen(true)} disabled={generating}>{generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} {generating ? 'Generating…' : 'Generate objectives'}</Button>
          <Button size="sm" variant="primary" onClick={() => setAdding(true)}><Plus className="size-3.5" /> Add objective</Button>
        </div>
      </div>
      <AddModal open={adding} onAdd={add} onClose={() => setAdding(false)} />
      <BriefModal open={briefOpen} onClose={() => setBriefOpen(false)} onGenerate={() => { setBriefOpen(false); generate() }} />

      <div className="mt-4 rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line px-3 py-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            <Search className="size-4 text-ink-3" />
            <input style={NO_RING} id="obj-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search objectives" className="w-full bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none" />
          </label>
          {/* Segmented control, same style as the Launcher / Messenger switch in Design */}
          <div className="flex rounded-lg bg-brand-50 p-1 text-sm" role="tablist" aria-label="Filter objectives">
            {FILTERS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={clsx('rounded-md px-3 py-1.5 whitespace-nowrap transition-colors', filter === f ? 'bg-surface font-medium text-brand-700 shadow-xs' : 'text-ink-2 hover:text-ink')}
              >
                {f} <span className={clsx('tnum', filter === f ? 'text-brand-600' : 'text-ink-3')}>{count(f)}</span>
              </button>
            ))}
          </div>
          {/* Layout: table (default) or cards */}
          <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Layout">
            {([['Table', List], ['Cards', LayoutGrid]] as const).map(([k, Icon]) => (
              <Tip key={k} content={k}>
                <button onClick={() => setLayout(k)} aria-label={`${k} layout`} aria-pressed={layout === k} className={clsx('grid size-7 place-items-center rounded-md', layout === k ? 'bg-brand-50 text-brand-700' : 'text-ink-3 hover:text-ink')}>
                  <Icon className="size-4" />
                </button>
              </Tip>
            ))}
          </div>
          {/* Approve all sits at the far right, after the filters, only while there are new ones */}
          {count('Pending review') > 0 && (
            <Button size="sm" variant="primary" className="ml-auto" onClick={approveAll}><Check className="size-3.5" /> Approve all {count('Pending review')}</Button>
          )}
        </div>
        {shown.length === 0 && !generating && (
          <p className="px-4 py-8 text-center text-sm text-ink-3">{q ? `No objectives match “${q}”.` : `No ${filter.toLowerCase()} objectives.`}</p>
        )}
        {/* While generating: a placeholder section where the new objectives will land */}
        {generating && (
          <div className="border-b border-line">
            <div className="flex items-center gap-2 bg-subtle/60 px-4 py-2 text-xs font-semibold text-ink-2">
              <Loader2 className="size-3.5 animate-spin text-brand-600" /> Finding new objectives from your agent context and conversations…
            </div>
            <ul aria-hidden>
              {[72, 58, 64].map((w) => (
                <li key={w} className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-0">
                  <span className="size-4 rounded bg-n-100" />
                  <span className="h-3 animate-pulse rounded bg-n-100" style={{ width: `${w}%` }} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {layout === 'Cards' ? (
          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((o) => <ObjCard key={o.id} o={o} onSave={save} onStatus={setStatus} onReject={reject} />)}
          </div>
        ) : (<>
        {/* Column headings, like prod's table */}
        <div className={clsx(COLS, 'border-b border-line py-2 pr-10 pl-4 text-xs font-medium text-ink-3')}>
          <span className="pl-7">Objective</span>
          <span>Source</span>
          <span className="text-center">Status</span>
          <span />
        </div>
        {/* One flat list. New ones to review sit at the top, highlighted in light purple. */}
        <ul>
          {shown.map((o) => (
            <Row key={o.id} o={o} open={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)} onSave={save} onStatus={setStatus} onReject={reject} />
          ))}
        </ul>
        </>)}
      </div>
    </>
  )
}
