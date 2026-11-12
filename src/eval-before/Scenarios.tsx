import { useState } from 'react'
import {
  Archive, ArchiveRestore, Check, CheckCircle2, ChevronRight, LayoutGrid, List, Loader2, PenLine, Pencil, Search, Sparkles, X, XCircle,
} from 'lucide-react'
import { useApp } from '../state'
import { Badge, Button, Modal, Tip, clsx } from '../components/ui'
import { FILTERS, NO_RING, StatusTag, type Filter, type Status } from './Objectives'
import { PROFILE_NAMES, SCENARIOS_APPROVED, SCENARIOS_FOUND, TOPICS, type Msg, type Scenario } from './scenarioData'

/*
 * Scenarios tab, built like Objectives and Customer profiles: search, filters, table or cards, approve / reject.
 * Each scenario also shows its last simulation result, so the list answers "which test cases fail?".
 * The detail keeps everything prod has, grouped into four plain sections.
 */

const COLS = 'grid grid-cols-[minmax(0,1fr)_110px_120px_72px] items-center gap-3'
const iconBtn = 'grid size-8 place-items-center rounded-lg text-ink-3'
const field = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none'
const lines = (x: string) => x.split('\n').map((l) => l.trim()).filter(Boolean)

/** Last simulation result: passed, failed, or not run yet (new ones). */
function LastRun({ sc }: { sc: Scenario }) {
  if (!sc.last) return <span className="text-xs text-ink-3">Not run yet</span>
  return sc.last.result === 'Passed'
    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-success-700"><CheckCircle2 className="size-3.5" /> Passed</span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium text-danger-700"><XCircle className="size-3.5" /> Failed</span>
}

function Meta({ sc }: { sc: Scenario }) {
  return <span className="block truncate text-xs text-ink-3">{sc.topic} · {sc.profile}</span>
}

function Actions({ sc, hide, onOpen, onStatus, onReject }: { sc: Scenario; hide?: boolean; onOpen: () => void; onStatus: (id: string, s: Status) => void; onReject: (id: string) => void }) {
  if (sc.status === 'Pending review') {
    return (
      <>
        <Tip content="Approve"><button onClick={() => onStatus(sc.id, 'Approved')} aria-label={`Approve ${sc.title}`} className={clsx(iconBtn, 'hover:bg-success-50 hover:text-success-700')}><Check className="size-4" /></button></Tip>
        <Tip content="Reject"><button onClick={() => onReject(sc.id)} aria-label={`Reject ${sc.title}`} className={clsx(iconBtn, 'hover:bg-danger-50 hover:text-danger-700')}><X className="size-4" /></button></Tip>
      </>
    )
  }
  if (hide) return null
  return (
    <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      {sc.status === 'Archived' ? (
        <Tip content="Restore"><button onClick={() => onStatus(sc.id, 'Approved')} aria-label={`Restore ${sc.title}`} className={clsx(iconBtn, 'hover:bg-muted hover:text-ink')}><ArchiveRestore className="size-4" /></button></Tip>
      ) : (
        <>
          <Tip content="Edit"><button onClick={onOpen} aria-label={`Edit ${sc.title}`} className={clsx(iconBtn, 'hover:bg-muted hover:text-ink')}><Pencil className="size-4" /></button></Tip>
          <Tip content="Archive"><button onClick={() => onStatus(sc.id, 'Archived')} aria-label={`Archive ${sc.title}`} className={clsx(iconBtn, 'hover:bg-muted hover:text-ink')}><Archive className="size-4" /></button></Tip>
        </>
      )}
    </span>
  )
}

function Chat({ msgs }: { msgs: Msg[] }) {
  const marked = (m: Msg) => {
    const at = m.mark ? m.text.indexOf(m.mark) : -1
    if (at < 0) return m.text
    return <>{m.text.slice(0, at)}<mark className="rounded-sm bg-warning-600/20 px-0.5 text-ink">{m.mark}</mark>{m.text.slice(at + m.mark!.length)}</>
  }
  return (
    <div className="space-y-2 rounded-lg bg-subtle p-3">
      {msgs.map((m, i) => (
        <div key={i} className={clsx('flex', m.from === 'ai' ? 'justify-start' : 'justify-end')}>
          <div className={clsx('max-w-[85%] rounded-lg px-3 py-2 text-sm', m.from === 'ai' ? 'rounded-tl-sm border border-line bg-surface text-ink-2' : 'rounded-tr-sm bg-brand-50 text-ink')}>
            <span className="mb-0.5 block text-2xs text-ink-3">{m.from === 'ai' ? 'Agent' : 'Simulated customer'}</span>
            {marked(m)}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Detail modal ---------------- */
function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {note && <p className="text-xs text-ink-3">{note}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}
const Label = ({ children }: { children: React.ReactNode }) => <p className="text-xs font-medium text-ink-3">{children}</p>

/** Two lists side by side, green / red label (knows vs doesn't know, required vs forbidden). Editable as one item per line. */
function Pair({ a, b, edit, onA, onB }: { a: [string, string[]]; b: [string, string[]]; edit: boolean; onA: (x: string[]) => void; onB: (x: string[]) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {([[a, onA, 'text-success-700'], [b, onB, 'text-danger-700']] as const).map(([[k, list], set, tone]) => (
        <div key={k} className="rounded-lg bg-subtle p-3">
          <p className={clsx('text-xs font-semibold', tone)}>{k}</p>
          {edit ? (
            <textarea style={NO_RING} aria-label={k} defaultValue={list.join('\n')} onChange={(e) => set(lines(e.target.value))} rows={3} placeholder="One per line" className={clsx('mt-2', field)} />
          ) : list.length ? (
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-ink-2">{list.map((x) => <li key={x}>{x}</li>)}</ul>
          ) : <p className="mt-1.5 text-sm text-ink-3">None</p>}
        </div>
      ))}
    </div>
  )
}

function DetailModal({ sc, onClose, onSave, onStatus }: { sc: Scenario | null; onClose: () => void; onSave: (s: Scenario) => void; onStatus: (id: string, s: Status) => void }) {
  const [edit, setEdit] = useState(false)
  const [d, setD] = useState<Scenario | null>(sc)
  const [last, setLast] = useState<Scenario | null>(sc)
  const [chatOpen, setChatOpen] = useState(false)
  if (sc !== last) { setLast(sc); setD(sc); setEdit(false); setChatOpen(false) }
  if (!sc || !d) return null
  const set = <K extends keyof Scenario>(k: K, v: Scenario[K]) => setD({ ...d, [k]: v })
  const text = (k: 'title' | 'summary' | 'intent' | 'context' | 'opens' | 'approach' | 'satisfied' | 'walksAway' | 'expected', rows = 1) =>
    rows === 1
      ? <input style={NO_RING} aria-label={k} value={d[k]} onChange={(e) => set(k, e.target.value)} className={field} />
      : <textarea style={NO_RING} aria-label={k} value={d[k]} onChange={(e) => set(k, e.target.value)} rows={rows} className={field} />
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      width="max-w-3xl"
      title={edit ? 'Edit scenario' : sc.title}
      description={edit ? undefined : sc.summary}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {sc.status === 'Archived'
            ? <Button variant="ghost" onClick={() => { onStatus(sc.id, 'Approved'); onClose() }}><ArchiveRestore className="size-4" /> Restore</Button>
            : <Button variant="ghost" onClick={() => { onStatus(sc.id, 'Archived'); onClose() }}><Archive className="size-4" /> Archive</Button>}
          <div className="flex gap-2">
            {edit ? (
              <><Button onClick={() => { setD(sc); setEdit(false) }}>Cancel</Button><Button variant="primary" disabled={!d.title.trim() || !d.opens.trim()} onClick={() => { onSave(d); setEdit(false) }}>Save scenario</Button></>
            ) : (
              <><Button onClick={onClose}>Close</Button><Button variant="primary" onClick={() => setEdit(true)}><Pencil className="size-4" /> Edit</Button></>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {edit && (
          <div className="grid gap-3">
            <div><Label>Title</Label><div className="mt-1">{text('title')}</div></div>
            <div><Label>Summary</Label><div className="mt-1">{text('summary', 2)}</div></div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{sc.topic}</Badge><Badge>{sc.profile}</Badge><Badge tone="brand">{sc.source}</Badge><StatusTag s={sc.status} />
        </div>

        {/* Last result first: it's what people open a scenario to find out */}
        {sc.last && !edit && (
          <div className={clsx('rounded-xl p-4', sc.last.result === 'Passed' ? 'bg-success-50' : 'bg-danger-50')}>
            <p className="flex items-center gap-2 text-sm font-semibold"><LastRun sc={sc} /> <span className="font-normal text-ink-3">in the last simulation</span></p>
            {sc.last.why && <p className="mt-1 text-sm text-ink">{sc.last.why}</p>}
            {sc.last.chat && (
              <>
                <button onClick={() => setChatOpen((o) => !o)} className="mt-2 text-xs font-medium text-brand-600 hover:underline">{chatOpen ? 'Hide conversation' : 'See conversation'}</button>
                {chatOpen && <div className="mt-2"><Chat msgs={sc.last.chat} /></div>}
              </>
            )}
          </div>
        )}

        <Section title="The customer" note="Who they are and what they want">
          <div><Label>Wants to</Label>{edit ? <div className="mt-1">{text('intent')}</div> : <p className="mt-0.5 text-sm text-ink">{d.intent}</p>}</div>
          {(d.context || edit) && <div><Label>Background</Label>{edit ? <div className="mt-1">{text('context', 2)}</div> : <p className="mt-0.5 text-sm text-ink-2">{d.context}</p>}</div>}
          <div>
            <Label>Opens with (word for word)</Label>
            {edit ? <div className="mt-1">{text('opens')}</div> : <p className="mt-1 rounded-lg border border-line bg-subtle px-3 py-2 text-sm text-ink italic">“{d.opens}”</p>}
          </div>
          <p className="text-sm text-ink-2"><b className="font-medium text-ink">{d.profile}</b> · {d.speaks}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink-2">
            Gives up after <b className="font-semibold text-ink tnum">{d.patience} turns</b> · gets frustrated by
            {d.frustration.map((f) => <span key={f} className="rounded-md bg-warning-50 px-1.5 py-0.5 text-xs text-warning-700">{f}</span>)}
          </p>
        </Section>

        <Section title="What they know" note="The simulated customer only shares these facts and never makes up the rest.">
          <Pair a={['Knows (may share when asked)', d.knows]} b={['Doesn’t know (must not invent)', d.unknown]} edit={edit} onA={(x) => set('knows', x)} onB={(x) => set('unknown', x)} />
        </Section>

        <Section title="How they act">
          {(d.approach || edit) && <div><Label>Approach</Label>{edit ? <div className="mt-1">{text('approach', 2)}</div> : <p className="mt-0.5 text-sm text-ink">{d.approach}</p>}</div>}
          {(d.rules.length > 0 || edit) && (
            <div>
              <Label>Follow-up rules</Label>
              {edit
                ? <textarea style={NO_RING} aria-label="Follow-up rules" defaultValue={d.rules.join('\n')} onChange={(e) => set('rules', lines(e.target.value))} rows={3} placeholder="One per line" className={clsx('mt-1', field)} />
                : <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-2">{d.rules.map((r) => <li key={r}>{r}</li>)}</ul>}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-subtle p-3"><p className="text-xs font-semibold text-success-700">Satisfied when</p>{edit ? <div className="mt-2">{text('satisfied', 2)}</div> : <p className="mt-1 text-sm text-ink-2">{d.satisfied}</p>}</div>
            <div className="rounded-lg bg-subtle p-3"><p className="text-xs font-semibold text-danger-700">Walks away when</p>{edit ? <div className="mt-2">{text('walksAway', 2)}</div> : <p className="mt-1 text-sm text-ink-2">{d.walksAway}</p>}</div>
          </div>
        </Section>

        <Section title="What the agent should do" note="The simulated customer never sees this. It’s how the conversation is graded.">
          <p className="text-sm text-ink-2">Tests <b className="font-semibold text-ink">{d.tests}</b>{d.testsNote && <span className="text-ink-3"> · {d.testsNote}</span>}</p>
          <Pair a={['Must do', d.required]} b={['Must not do', d.forbidden]} edit={edit} onA={(x) => set('required', x)} onB={(x) => set('forbidden', x)} />
          <div><Label>Expected result</Label>{edit ? <div className="mt-1">{text('expected', 2)}</div> : <p className="mt-0.5 text-sm text-ink">{d.expected}</p>}</div>
        </Section>
      </div>
    </Modal>
  )
}

/* ---------------- Write scenario modal ---------------- */
function WriteModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (s: Scenario) => void }) {
  const blank = { title: '', topic: '', profile: '', intent: '', opens: '', knows: '', unknown: '', satisfied: '', walksAway: '' }
  const [f, setF] = useState(blank)
  const [adv, setAdv] = useState(false)
  const close = () => { setF(blank); setAdv(false); onClose() }
  const ok = f.title.trim() && f.topic && f.profile && f.opens.trim()
  const submit = () => {
    if (!ok) return
    onAdd({
      id: `w-${Date.now()}`, title: f.title.trim(), summary: f.intent.trim(), topic: f.topic, profile: f.profile, source: 'Synthetic', status: 'Pending review',
      tests: 'Accurate Website Information', testsNote: '', intent: f.intent.trim(), context: '', opens: f.opens.trim(), speaks: 'Plain language · English',
      patience: 5, frustration: ['no direct answer'], knows: lines(f.knows), unknown: lines(f.unknown), approach: '', rules: [],
      satisfied: f.satisfied.trim(), walksAway: f.walksAway.trim(), required: [], forbidden: [], expected: '',
    })
    close()
  }
  const sel = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none'
  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Write scenario"
      description="One kind of customer, one goal, and the first message they send."
      footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!ok} onClick={submit}>Save scenario</Button></>}
    >
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
        <div>
          <label htmlFor="w-title" className="block text-sm font-medium text-ink">Title</label>
          <input style={NO_RING} id="w-title" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Parent asks if online care is available" className={clsx('mt-1.5 placeholder:text-ink-3', field)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="w-topic" className="block text-sm font-medium text-ink">Topic</label>
            <select style={NO_RING} id="w-topic" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} className={clsx('mt-1.5', sel)}>
              <option value="">Pick a topic</option>{TOPICS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="w-profile" className="block text-sm font-medium text-ink">Customer profile</label>
            <select style={NO_RING} id="w-profile" value={f.profile} onChange={(e) => setF({ ...f, profile: e.target.value })} className={clsx('mt-1.5', sel)}>
              <option value="">Pick a profile</option>{PROFILE_NAMES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="w-intent" className="block text-sm font-medium text-ink">Goal</label>
          <input style={NO_RING} id="w-intent" value={f.intent} onChange={(e) => setF({ ...f, intent: e.target.value })} placeholder="What the customer is trying to get done" className={clsx('mt-1.5 placeholder:text-ink-3', field)} />
        </div>
        <div>
          <label htmlFor="w-opens" className="block text-sm font-medium text-ink">Opens with</label>
          <textarea style={NO_RING} id="w-opens" value={f.opens} onChange={(e) => setF({ ...f, opens: e.target.value })} rows={2} placeholder="The customer’s exact first message" className={clsx('mt-1.5 placeholder:text-ink-3', field)} />
        </div>
        <button type="button" onClick={() => setAdv((a) => !a)} aria-expanded={adv} className="inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
          <ChevronRight className={clsx('size-4 transition-transform', adv && 'rotate-90')} /> More details <span className="font-normal text-ink-3">(optional)</span>
        </button>
        {adv && (
          <div className="anim-fade grid gap-4 sm:grid-cols-2">
            {([['knows', 'Knows', 'Facts they can share, one per line'], ['unknown', 'Doesn’t know', 'Facts they must not invent, one per line'], ['satisfied', 'Satisfied when', 'When they’d end the chat happy'], ['walksAway', 'Walks away when', 'When they’d give up']] as const).map(([k, l, ph]) => (
              <div key={k}>
                <label htmlFor={`w-${k}`} className="block text-sm font-medium text-ink">{l}</label>
                <textarea style={NO_RING} id={`w-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} rows={2} placeholder={ph} className={clsx('mt-1.5 placeholder:text-ink-3', field)} />
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-ink-3">New scenarios start as Pending review. Nothing runs until you approve it.</p>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  )
}

/* ---------------- List: row and card ---------------- */
function Row({ sc, open, onToggle, onOpen, onStatus, onReject }: { sc: Scenario; open: boolean; onToggle: () => void; onOpen: (s: Scenario) => void; onStatus: (id: string, s: Status) => void; onReject: (id: string) => void }) {
  const pending = sc.status === 'Pending review'
  return (
    <li className="border-b border-line last:border-0">
      <div className={clsx(COLS, 'group py-2.5 pr-10 pl-4', pending ? 'bg-brand-50 hover:bg-brand-100' : 'hover:bg-subtle', open && !pending && 'bg-subtle')}>
        <button onClick={onToggle} aria-expanded={open} className="flex min-w-0 items-center gap-3 text-left">
          <ChevronRight className={clsx('size-4 shrink-0 text-ink-3 transition-transform', open && 'rotate-90')} />
          <span className="min-w-0">
            <span className={clsx('block truncate text-sm', sc.status === 'Archived' ? 'text-ink-3' : 'text-ink')}>{sc.title}</span>
            <Meta sc={sc} />
          </span>
        </button>
        <span><LastRun sc={sc} /></span>
        <span className="text-center"><StatusTag s={sc.status} /></span>
        <span className="-my-1.5 flex justify-end gap-1"><Actions sc={sc} hide={open} onOpen={() => onOpen(sc)} onStatus={onStatus} onReject={onReject} /></span>
      </div>
      {open && (
        <div className="anim-fade space-y-3 px-4 pt-2 pb-4 pl-11">
          <p className="max-w-[720px] text-sm text-ink-2">{sc.summary}</p>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><Label>Opens with</Label><p className="mt-0.5 text-ink italic">“{sc.opens}”</p></div>
            <div><Label>Tests</Label><p className="mt-0.5 text-ink">{sc.tests}</p></div>
          </div>
          {sc.last?.why && <p className="text-sm text-danger-700">Last run: {sc.last.why}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onOpen(sc)}>View details</Button>
            {sc.status === 'Archived'
              ? <Button size="sm" onClick={() => onStatus(sc.id, 'Approved')}><ArchiveRestore className="size-3.5" /> Restore</Button>
              : sc.status === 'Approved' && <Button size="sm" variant="ghost" onClick={() => onStatus(sc.id, 'Archived')}><Archive className="size-3.5" /> Archive</Button>}
          </div>
        </div>
      )}
    </li>
  )
}

function ScenarioCard({ sc, onOpen, onStatus, onReject }: { sc: Scenario; onOpen: (s: Scenario) => void; onStatus: (id: string, s: Status) => void; onReject: (id: string) => void }) {
  const pending = sc.status === 'Pending review'
  return (
    <div className={clsx('group flex cursor-pointer flex-col rounded-xl border p-4', pending ? 'border-brand-200 bg-brand-50' : 'border-line bg-surface hover:shadow-md')} onClick={() => onOpen(sc)}>
      <p className={clsx('text-sm font-medium', sc.status === 'Archived' ? 'text-ink-3' : 'text-ink')}>{sc.title}</p>
      <Meta sc={sc} />
      <p className="mt-2 line-clamp-2 text-sm text-ink-2 italic">“{sc.opens}”</p>
      <div className="mt-auto flex items-center gap-2 pt-4" onClick={(e) => e.stopPropagation()}>
        <LastRun sc={sc} />
        <StatusTag s={sc.status} />
        <span className="-my-1.5 ml-auto flex gap-1"><Actions sc={sc} onOpen={() => onOpen(sc)} onStatus={onStatus} onReject={onReject} /></span>
      </div>
    </div>
  )
}

/* ---------------- Tab ---------------- */
export function ScenariosTab() {
  const { toast } = useApp()
  const [list, setList] = useState(SCENARIOS_APPROVED)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [open, setOpen] = useState<string | null>(null)
  const [layout, setLayout] = useState<'Table' | 'Cards'>('Table')
  const [detail, setDetail] = useState<Scenario | null>(null)
  const [writing, setWriting] = useState(false)
  const [generating, setGenerating] = useState(false)

  const setStatus = (id: string, s: Status) => {
    setList((l) => l.map((x) => (x.id === id ? { ...x, status: s } : x)))
    toast(s === 'Archived' ? 'Scenario archived' : 'Scenario approved')
  }
  const reject = (id: string) => { setList((l) => l.filter((x) => x.id !== id)); toast('Scenario rejected') }
  const save = (sc: Scenario) => { setList((l) => l.map((x) => (x.id === sc.id ? sc : x))); setDetail(sc); toast('Scenario saved') }
  const add = (sc: Scenario) => { setList((l) => [sc, ...l]); setFilter('All'); toast('Scenario added for review') }
  const approveAll = () => { setList((l) => l.map((x) => (x.status === 'Pending review' ? { ...x, status: 'Approved' } : x))); toast('All new scenarios approved') }
  const generate = () => {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      setList((l) => {
        const fresh = SCENARIOS_FOUND.filter((f) => !l.some((x) => x.id === f.id))
        toast(fresh.length ? `${fresh.length} new scenarios to review` : 'No new scenarios. Everything is up to date.')
        return [...fresh, ...l]
      })
      setFilter('All')
    }, 2000)
  }

  const counts = (f: Filter) => (f === 'All' ? list.filter((x) => x.status !== 'Archived').length : list.filter((x) => x.status === f).length)
  const rank = (x: Scenario) => (x.status === 'Pending review' ? 0 : x.status === 'Approved' ? 1 : 2)
  const shown = list
    .filter((x) => (filter === 'All' ? x.status !== 'Archived' : x.status === filter) && `${x.title} ${x.topic} ${x.profile} ${x.opens}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => rank(a) - rank(b))
  const pending = counts('Pending review')
  const failed = list.filter((x) => x.status === 'Approved' && x.last?.result === 'Failed').length

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[640px]">
          <p className="text-sm text-ink-2">A scenario is one test case: one kind of customer, one goal, and the facts they’re allowed to know.</p>
          {failed > 0 && <p className="mt-2 text-xs text-ink-3"><b className="font-semibold text-danger-700">{failed} failed</b> in the last simulation. Open one to see why.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={generate} disabled={generating}>{generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} {generating ? 'Generating…' : 'Generate scenarios'}</Button>
          <Button size="sm" variant="primary" onClick={() => setWriting(true)}><PenLine className="size-3.5" /> Write scenario</Button>
        </div>
      </div>
      <WriteModal open={writing} onClose={() => setWriting(false)} onAdd={add} />
      <DetailModal sc={detail} onClose={() => setDetail(null)} onSave={save} onStatus={setStatus} />

      <div className="mt-4 rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line px-3 py-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            <Search className="size-4 text-ink-3" />
            <input style={NO_RING} id="scn-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search scenarios, topics or profiles" className="w-full bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none" />
          </label>
          <div className="flex rounded-lg bg-brand-50 p-1 text-sm" role="tablist" aria-label="Filter scenarios">
            {FILTERS.map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={clsx('rounded-md px-3 py-1.5 whitespace-nowrap transition-colors', filter === f ? 'bg-surface font-medium text-brand-700 shadow-xs' : 'text-ink-2 hover:text-ink')}>
                {f} <span className={clsx('tnum', filter === f ? 'text-brand-600' : 'text-ink-3')}>{counts(f)}</span>
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Layout">
            {([['Table', List], ['Cards', LayoutGrid]] as const).map(([k, Icon]) => (
              <Tip key={k} content={k}>
                <button onClick={() => setLayout(k)} aria-label={`${k} layout`} aria-pressed={layout === k} className={clsx('grid size-7 place-items-center rounded-md', layout === k ? 'bg-brand-50 text-brand-700' : 'text-ink-3 hover:text-ink')}>
                  <Icon className="size-4" />
                </button>
              </Tip>
            ))}
          </div>
          {pending > 0 && <Button size="sm" variant="primary" className="ml-auto" onClick={approveAll}><Check className="size-3.5" /> Approve all {pending}</Button>}
        </div>

        {generating && (
          <div className="border-b border-line">
            <div className="flex items-center gap-2 bg-subtle/60 px-4 py-2 text-xs font-semibold text-ink-2">
              <Loader2 className="size-3.5 animate-spin text-brand-600" /> Writing new test cases from your topics, profiles and objectives…
            </div>
            <ul aria-hidden>
              {[66, 52, 58].map((w) => (
                <li key={w} className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-0">
                  <span className="size-4 rounded bg-n-100" />
                  <span className="h-3 animate-pulse rounded bg-n-100" style={{ width: `${w}%` }} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {shown.length === 0 && !generating && (
          <p className="px-4 py-8 text-center text-sm text-ink-3">{q ? `No scenarios match “${q}”.` : `No ${filter.toLowerCase()} scenarios.`}</p>
        )}

        {layout === 'Cards' ? (
          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((sc) => <ScenarioCard key={sc.id} sc={sc} onOpen={setDetail} onStatus={setStatus} onReject={reject} />)}
          </div>
        ) : (
          <>
            <div className={clsx(COLS, 'border-b border-line py-2 pr-10 pl-4 text-xs font-medium text-ink-3')}>
              <span className="pl-7">Scenario</span>
              <span>Last run</span>
              <span className="text-center">Status</span>
              <span />
            </div>
            <ul>
              {shown.map((sc) => (
                <Row key={sc.id} sc={sc} open={open === sc.id} onToggle={() => setOpen(open === sc.id ? null : sc.id)} onOpen={setDetail} onStatus={setStatus} onReject={reject} />
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  )
}
