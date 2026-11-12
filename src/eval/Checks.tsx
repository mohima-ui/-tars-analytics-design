import { useEffect, useState } from 'react'
import { ArrowRight, BarChart3, Check, ChevronRight, Pencil, Plus, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useApp } from '../state'
import { Badge, Button, Modal, Tip, clsx } from '../components/ui'
import { CHECKS, CHECK_SLOTS, TRIED, type Check as CheckT } from './data'
import { useBus } from './ctx'
import { Intro, NO_RING, field, plural, useBadge } from './shared'

/*
 * Checks (prod: Evaluators). A check reads every real chat and flags one problem, so nobody has to read them all.
 * Most are drafted for you when you say "Yes, this is a real problem" in Analytics.
 * Drafts wait for you because they run on every real chat: Tars first tries it on past chats and shows how often it
 * agreed with you, so turning it on is an easy decision. Results show in Analytics, on the problem it watches.
 */

const COLS = 'grid grid-cols-[minmax(0,1fr)_170px_150px] items-center gap-3'

function StatusChip({ s }: { s: CheckT['status'] }) {
  if (s === 'Draft') return <Badge tone="brand">Draft</Badge>
  if (s === 'On') return <Badge tone="success">On</Badge>
  return <Badge>Off</Badge>
}

/** This week, in one line: found N (was M), or how well a draft agreed on past chats. */
function Result({ c }: { c: CheckT }) {
  if (c.status === 'Draft' && c.tried) return <span className="text-xs text-ink-2 tnum">Agreed with you on <b className="font-semibold text-ink">{c.tried.agree} of {c.tried.chats}</b> past chats</span>
  if (!c.week) return <span className="text-xs text-ink-3">No results yet</span>
  const { found, was } = c.week
  if (found === 0) return <span className="text-xs text-success-700">No problems this week</span>
  return (
    <span className="text-xs text-ink-2 tnum">
      {plural(found, 'chat', 'chats')} flagged this week
      {was != null && was !== found && <span className={clsx('ml-1', found < was ? 'text-success-700' : 'text-danger-700')}>(was {was})</span>}
    </span>
  )
}

/** On / Off switch for checks that are already on or paused. */
function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange} className={clsx('relative h-5 w-9 shrink-0 rounded-full transition-colors', on ? 'bg-brand-600' : 'bg-n-200')}>
      <span className={clsx('absolute top-0.5 size-4 rounded-full bg-white shadow-xs transition-all', on ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}

/** A few past chats the check was tried on: what it said, and whether a person agreed. */
function Tried() {
  return (
    <div>
      <p className="text-xs font-medium text-ink-3">How it decided on past chats</p>
      <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
        {TRIED.map((t) => (
          <li key={t.text} className="grid gap-2 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_120px_130px] sm:items-center">
            <div className="min-w-0">
              <p className="truncate text-ink">“{t.text}”</p>
              <p className="truncate text-xs text-ink-3">Agent: {t.reply}</p>
            </div>
            <span className={clsx('text-xs font-medium', t.said === 'Flagged' ? 'text-danger-700' : 'text-ink-2')}>{t.said}</span>
            <span className={clsx('inline-flex items-center gap-1 text-xs', t.agree ? 'text-success-700' : 'text-warning-700')}>
              {t.agree ? <><ThumbsUp className="size-3.5" /> You agree</> : <><ThumbsDown className="size-3.5" /> You disagree</>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-3">The one it got wrong mentions a price after the deductible. Edit the check if that should count as giving a price.</p>
    </div>
  )
}

function Row({ c, open, onToggle, onTurnOn, onToggleOn, onEdit }: { c: CheckT; open: boolean; onToggle: () => void; onTurnOn: () => void; onToggleOn: () => void; onEdit: () => void }) {
  const { toast } = useApp()
  const draft = c.status === 'Draft'
  return (
    <li className="border-b border-line last:border-0">
      <div className={clsx(COLS, 'group py-3 pr-4 pl-4', draft ? 'bg-brand-50 hover:bg-brand-100' : 'hover:bg-subtle', open && !draft && 'bg-subtle')}>
        <button onClick={onToggle} aria-expanded={open} className="flex min-w-0 items-center gap-3 text-left">
          <ChevronRight className={clsx('size-4 shrink-0 text-ink-3 transition-transform', open && 'rotate-90')} />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 text-sm text-ink">{c.name} <StatusChip s={c.status} /></span>
            <span className="block truncate text-xs text-ink-3">{c.from}</span>
          </span>
        </button>
        <span><Result c={c} /></span>
        <span className="flex items-center justify-end gap-2">
          {draft
            ? <Button size="sm" variant="primary" onClick={onTurnOn}>Turn on</Button>
            : <Switch on={c.status === 'On'} onChange={onToggleOn} label={`${c.name} on or off`} />}
        </span>
      </div>
      {open && (
        <div className="anim-fade space-y-4 px-4 pt-2 pb-4 pl-11">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className="text-xs font-medium text-ink-3">What it looks for</p>
              <p className="mt-0.5 max-w-[720px] text-sm text-ink">{c.about}</p>
            </div>
            <Tip content={c.how === 'Rule' ? 'Follows a fixed rule. Fast and free.' : 'An AI reads the chat and decides. Costs a little per chat.'}><span className="inline-flex h-fit cursor-default"><Badge>{c.how}</Badge></span></Tip>
          </div>
          {draft && (c.id === 'price' ? <Tried /> : c.tried && <p className="text-sm text-ink-2">Tried on {c.tried.chats} past chats. It agreed with how people labelled them on {c.tried.agree}.</p>)}
          {c.topic && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-subtle px-3 py-2.5 text-sm">
              <span className="text-ink-2"><BarChart3 className="mr-1.5 inline size-4 text-brand-600" />{draft ? 'Once it’s on, results show on the problem in' : 'Results show on the problem in'} <b className="font-medium text-ink">{c.topic}</b></span>
              <button onClick={() => toast(`Opens ${c.topic} in Analytics`)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">See in Analytics <ArrowRight className="size-3.5" /></button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {draft && <Button size="sm" variant="primary" onClick={onTurnOn}><Check className="size-3.5" /> Turn on</Button>}
            <Button size="sm" onClick={onEdit}><Pencil className="size-3.5" /> Edit</Button>
          </div>
        </div>
      )}
    </li>
  )
}

/** New or edit check: one plain sentence. Saving tries it on past chats first and keeps it as a draft. */
function CheckModal({ check, open, onClose, onSave }: { check: CheckT | null; open: boolean; onClose: () => void; onSave: (name: string, about: string) => void }) {
  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) { setWasOpen(true); setName(check?.name ?? ''); setAbout(check?.about ?? '') }
  if (!open && wasOpen) setWasOpen(false)
  const submit = () => { if (name.trim() && about.trim()) onSave(name.trim(), about.trim()) }
  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={check ? 'Edit check' : 'New check'}
      description="Describe one problem in plain words. Tars tries it on past chats before you turn it on."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim() || !about.trim()} onClick={submit}>{check ? 'Save and try again' : 'Save and try on past chats'}</Button></>}
    >
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
        <div>
          <label htmlFor="check-name" className="block text-sm font-medium text-ink">Name</label>
          <input style={NO_RING} id="check-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Doesn’t promise a callback time" className={clsx('mt-1.5 placeholder:text-ink-3', field)} />
        </div>
        <div>
          <label htmlFor="check-about" className="block text-sm font-medium text-ink">Flag a chat when…</label>
          <textarea style={NO_RING} id="check-about" value={about} onChange={(e) => setAbout(e.target.value)} rows={3} placeholder="…the agent promises the team will call back within a set time." className={clsx('mt-1.5 placeholder:text-ink-3', field)} />
        </div>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  )
}

export function ChecksTab({ onBadge }: { onBadge?: (n: number) => void }) {
  const { toast } = useApp()
  const [list, setList] = useState(CHECKS)
  const [open, setOpen] = useState<string | null>('price') // the draft starts open so its evidence is visible
  const [editing, setEditing] = useState<CheckT | null>(null)
  const [adding, setAdding] = useState(false)
  const [trying, setTrying] = useState(false)
  // Drafts created from another tab (e.g. Results → "Watch in live chats") land here, open
  const { incoming } = useBus()
  useEffect(() => {
    const fresh = incoming.filter((c) => !list.some((x) => x.id === c.id))
    if (fresh.length) { setList((l) => [...fresh, ...l]); setOpen(fresh[0].id) }
    // only react to new incoming drafts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming])

  const set = (id: string, status: CheckT['status']) => setList((l) => l.map((c) => (c.id === id ? { ...c, status, ...(status === 'On' && !c.week ? { week: { found: 0 } } : {}) } : c)))
  const turnOn = (c: CheckT) => { set(c.id, 'On'); toast(`“${c.name}” is on. Results show in Analytics.`) }
  const toggle = (c: CheckT) => { set(c.id, c.status === 'On' ? 'Off' : 'On'); toast(c.status === 'On' ? 'Check paused' : 'Check is on') }
  const save = (name: string, about: string) => {
    const id = editing?.id ?? `new-${Date.now()}`
    setEditing(null); setAdding(false); setTrying(true); setOpen(id)
    // Prototype: trying it on past chats takes ~2s
    setTimeout(() => {
      setTrying(false)
      setList((l) => {
        const tried = { chats: 20, agree: 18 }
        if (l.some((c) => c.id === id)) return l.map((c) => (c.id === id ? { ...c, name, about, status: 'Draft', tried, week: undefined } : c))
        return [{ id, name, about, status: 'Draft', from: 'Written by you', tried, how: 'AI check' }, ...l]
      })
      toast('Tried on 20 past chats. Check it, then turn it on.')
    }, 2000)
  }

  const drafts = list.filter((c) => c.status === 'Draft').length
  const on = list.filter((c) => c.status === 'On').length
  const aiOn = list.filter((c) => c.status === 'On' && c.how === 'AI check').length
  useBadge(drafts, onBadge)
  const sorted = [...list].sort((a, b) => Number(b.status === 'Draft') - Number(a.status === 'Draft'))

  return (
    <>
      <Intro
        text="A check reads every real chat and flags one problem, so nobody has to read them all. Most are drafted for you when you confirm a problem in Analytics."
        sub={<><b className="font-semibold text-ink">{on} on</b>{drafts > 0 && <> · <b className="font-semibold text-brand-700">{drafts} waiting for you</b></>} · {aiOn} of {CHECK_SLOTS} AI check slots used</>}
        actions={<Button size="sm" variant="primary" onClick={() => setAdding(true)}><Plus className="size-3.5" /> New check</Button>}
      />
      <CheckModal check={editing} open={adding || !!editing} onClose={() => { setEditing(null); setAdding(false) }} onSave={save} />

      <div className="mt-4 rounded-xl border border-line bg-surface">
        <div className={clsx(COLS, 'border-b border-line py-2 pr-4 pl-4 text-xs font-medium text-ink-3')}>
          <span className="pl-7">Check</span><span>Result</span><span className="text-right">On / off</span>
        </div>
        {trying && (
          <div className="flex items-center gap-2 border-b border-line bg-subtle/60 px-4 py-3 text-xs font-semibold text-ink-2">
            <span className="size-3.5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" /> Trying it on 20 past chats…
          </div>
        )}
        <ul>
          {sorted.map((c) => (
            <Row key={c.id} c={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} onTurnOn={() => turnOn(c)} onToggleOn={() => toggle(c)} onEdit={() => setEditing(c)} />
          ))}
        </ul>
      </div>
      <p className="mt-3 text-xs text-ink-3">Checks only read real chats. To test the agent before going live, use Run test.</p>
    </>
  )
}
