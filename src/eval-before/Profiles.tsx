import { useState } from 'react'
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Check, ChevronRight, Info, LayoutGrid, List, Loader2, Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import { useApp } from '../state'
import { Badge, Button, Modal, Tip, clsx } from '../components/ui'
import { FILTERS, NO_RING, SOURCE_TEXT, StatusTag, type Filter, type Status } from './Objectives'

/*
 * Customer profiles tab, built the same way as Objectives: search, filters, table or cards,
 * rows that open to show who the person is, how they act and how they write.
 * Names and numbers come from prod (Evaluation → Topics → Customer profiles).
 */

type Source = 'Intended' | 'Observed' | 'Hybrid'
// evidence = real customer messages that show this behavior or style (none when it only comes from the brief)
type Option = { label: string; about: string; evidence?: string[] }
// measured = how real people in this group write (only when seen in real chats)
// evidence = why Tars made this profile: lines from the brief (intended) or a real conversation (observed / hybrid)
// lang = language in plain words (prod shows 'und' when it can't tell, shown here as Unknown); note = prod's technical coverage line
type Measured = { convs: number; msgs: number; words: number; short: number; questions: number; lang: string; note?: string }
type Evidence = { kind: 'brief'; title: string; text: string } | { kind: 'chat'; quote: string; chat: { from: 'customer' | 'ai'; text: string }[] }
type Profile = { id: string; name: string; about: string; source: Source; status: Status; behaviors: Option[]; styles: Option[]; measured?: Measured; evidence?: Evidence[] }

const NEUTRAL: Option = { label: 'Neutral interaction', about: 'Makes the request and answers relevant questions.' }
const PLAIN: Option = { label: 'Plain language', about: 'Uses clear, ordinary wording.' }
const INFORMAL: Option = { label: 'Informal wording', about: 'Short messages, abbreviations, not always full sentences.', evidence: ['ok and do u take aetna', 'how much 4 a session', 'wat ages do u see'] }

const APPROVED: Profile[] = [
  {
    id: 'parent', name: 'Parent seeking care for a minor', about: 'A parent or guardian asking about care for their child.', source: 'Hybrid', status: 'Approved',
    behaviors: [
      NEUTRAL,
      { label: 'Repeats the question', about: 'Asks again if the first answer didn’t help.', evidence: ['so what’s the pricing?', 'I asked how much it costs'] },
      { label: 'Asks several things at once', about: 'Puts insurance, cost and timing in one message.', evidence: ['do you take cigna and how much is it and how soon can we start'] },
      { label: 'Shares little about the child', about: 'Gives only what’s needed, if asked.' },
      { label: 'Leaves if the answer is long', about: 'Stops replying after a long answer.', evidence: ['too much text, nvm'] },
      { label: 'Asks about cost early', about: 'Wants a price before anything else.', evidence: ['hey, how much does it cost for my kid to get help?', 'price for therapy?'] },
      { label: 'Writes after hours', about: 'Chats at night or on weekends.' },
    ],
    styles: [INFORMAL],
    measured: { convs: 86, msgs: 214, words: 7, short: 44, questions: 61, lang: 'English', note: '3 conversations had partial message coverage; 2 had shortened model input. Measurements were computed before shortening.' },
    evidence: [{ kind: 'chat', quote: 'hey, how much does it cost for my kid to get help?', chat: [
      { from: 'customer', text: 'hey, how much does it cost for my kid to get help?' },
      { from: 'ai', text: 'With insurance, most families pay about $46 a session after their deductible.' },
      { from: 'customer', text: 'ok and do u take aetna' },
    ] }],
  },
  { id: 'family', name: 'Family member of an existing patient', about: 'A family member of someone already in care at Brightline.', source: 'Hybrid', status: 'Approved',
    behaviors: [{ ...NEUTRAL, evidence: ['My son already sees Dr. Patel, how do I move his appointment?'] }], styles: [{ ...PLAIN, evidence: ['Hello, my daughter is a current patient and I need to update our insurance.'] }],
    measured: { convs: 21, msgs: 58, words: 14, short: 12, questions: 70, lang: 'English' },
    evidence: [{ kind: 'chat', quote: 'My son already sees Dr. Patel, how do I move his appointment?', chat: [
      { from: 'customer', text: 'My son already sees Dr. Patel, how do I move his appointment?' },
      { from: 'ai', text: 'To change an existing appointment, please call our member team at (888) 255-1401.' },
    ] }] },
  { id: 'educator', name: 'Educator or school staff member', about: 'An educator or school staff member asking on behalf of a student.', source: 'Observed', status: 'Approved',
    behaviors: [{ ...NEUTRAL, evidence: ['Is there a school account to refer students'] }], styles: [{ ...PLAIN, evidence: ['Brochures for parents'] }],
    measured: { convs: 1, msgs: 2, words: 6, short: 50, questions: 0, lang: 'Unknown', note: '0 conversations have partial message coverage; 1 had shortened model input. Message measurements were computed before shortening.' },
    evidence: [{ kind: 'chat', quote: 'Is there a school account to refer students', chat: [
      { from: 'ai', text: 'Hi there! This AI chatbot only provides information about our services and does not provide medical advice.' },
      { from: 'customer', text: 'Brochures for parents' },
      { from: 'customer', text: 'Is there a school account to refer students' },
    ] }] },
  { id: 'parent-child', name: 'Parent seeking care for a minor child', about: 'A parent or guardian asking about mental health care for a young child.', source: 'Observed', status: 'Approved',
    behaviors: [{ ...NEUTRAL, evidence: ['My 6 year old has big meltdowns at school. Can you help?'] }], styles: [{ ...PLAIN, evidence: ['What age do you start seeing children?'] }],
    measured: { convs: 9, msgs: 23, words: 11, short: 22, questions: 65, lang: 'English' },
    evidence: [{ kind: 'chat', quote: 'My 6 year old has big meltdowns at school. Can you help?', chat: [
      { from: 'customer', text: 'My 6 year old has big meltdowns at school. Can you help?' },
      { from: 'ai', text: 'Yes, we work with children from age 0 to 18. Many families start with a therapy assessment.' },
      { from: 'customer', text: 'What age do you start seeing children?' },
    ] }] },
  { id: 'brightlife', name: 'BrightLife Kids family', about: 'A family from the BrightLife Kids program who landed on the Brightline clinic website.', source: 'Intended', status: 'Approved', behaviors: [NEUTRAL], styles: [PLAIN],
    evidence: [
      { kind: 'brief', title: 'Policies', text: 'The chatbot covers the Brightline clinic website (brightline.com) only. BrightLife Kids (brightlife.kids) is a separate program and is not covered.' },
      { kind: 'brief', title: 'Knowledge notes', text: 'The knowledge base does not cover BrightLife Kids.' },
      { kind: 'brief', title: 'Customer journeys', text: 'A BrightLife Kids family asks about that program. The agent explains it’s a separate program and ends with a polite redirect.' },
    ] },
]
// What "Analyze" proposes: new groups seen in real conversations, to review
const FOUND: Profile[] = [
  { id: 'f-doctor', name: 'Doctor or therapist referring a child', about: 'A clinician asking how to refer a child to Brightline.', source: 'Observed', status: 'Pending review',
    behaviors: [{ ...NEUTRAL, evidence: ['I’m a pediatrician. How do I refer a patient to you?'] }], styles: [{ label: 'Professional wording', about: 'Clear, formal messages with clinical terms.', evidence: ['Patient is 11, presenting with anxiety. Do you accept referrals?'] }],
    measured: { convs: 4, msgs: 9, words: 16, short: 0, questions: 78, lang: 'English' },
    evidence: [{ kind: 'chat', quote: 'I’m a pediatrician. How do I refer a patient to you?', chat: [
      { from: 'customer', text: 'I’m a pediatrician. How do I refer a patient to you?' },
      { from: 'ai', text: 'Thanks for reaching out. Families can request an appointment online, and our team will check eligibility.' },
    ] }] },
  { id: 'f-adult', name: 'Adult seeking care for themselves', about: 'An adult asking about care for themselves, outside Brightline’s 0–18 age range.', source: 'Observed', status: 'Pending review',
    behaviors: [{ ...NEUTRAL, evidence: ['do you do therapy for adults'] }, { label: 'Pushes back on a no', about: 'Asks again after being told Brightline serves ages 0–18.', evidence: ['but i really need someone to talk to, can i still book?'] }], styles: [INFORMAL],
    measured: { convs: 6, msgs: 15, words: 8, short: 40, questions: 55, lang: 'English' },
    evidence: [{ kind: 'chat', quote: 'do you do therapy for adults', chat: [
      { from: 'customer', text: 'do you do therapy for adults' },
      { from: 'ai', text: 'Brightline cares for kids and teens ages 0–18, so we can’t help with adult care.' },
      { from: 'customer', text: 'but i really need someone to talk to, can i still book?' },
    ] }] },
]

// Table columns: profile, source, status (centred), actions
const COLS = 'grid grid-cols-[minmax(0,1fr)_110px_120px_72px] items-center gap-3'
const iconBtn = 'grid size-8 place-items-center rounded-lg text-ink-3'
const field = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none'
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function SourceChip({ s }: { s: Source }) {
  return <Tip content={SOURCE_TEXT[s]}><span className="inline-flex cursor-default"><Badge>{s}</Badge></span></Tip>
}

/** Behaviors and message styles: how the simulated customer acts and writes. Used in the open row and in cards. */
function Options({ p }: { p: Profile }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {([['Behaviors', p.behaviors], ['Message styles', p.styles]] as const).map(([k, list]) => (
        <div key={k}>
          <p className="text-xs font-medium text-ink-3">{k} <span className="font-normal tnum">{list.length}</span></p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {list.map((x) => (
              <li key={x.label}><Tip content={x.about}><span className="inline-flex cursor-default rounded-md border border-line bg-surface px-2 py-0.5 text-xs text-ink-2">{x.label}</span></Tip></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Approve / reject for new ones; edit / archive (or restore) on hover for the rest. */
function Actions({ p, hide, onEdit, onStatus, onReject }: { p: Profile; hide?: boolean; onEdit: () => void; onStatus: (id: string, s: Status) => void; onReject: (id: string) => void }) {
  if (p.status === 'Pending review') {
    return (
      <>
        <Tip content="Approve"><button onClick={() => onStatus(p.id, 'Approved')} aria-label={`Approve ${p.name}`} className={clsx(iconBtn, 'hover:bg-success-50 hover:text-success-700')}><Check className="size-4" /></button></Tip>
        <Tip content="Reject"><button onClick={() => onReject(p.id)} aria-label={`Reject ${p.name}`} className={clsx(iconBtn, 'hover:bg-danger-50 hover:text-danger-700')}><X className="size-4" /></button></Tip>
      </>
    )
  }
  if (hide) return null
  return (
    <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      {p.status === 'Archived' ? (
        <Tip content="Restore"><button onClick={() => onStatus(p.id, 'Approved')} aria-label={`Restore ${p.name}`} className={clsx(iconBtn, 'hover:bg-muted hover:text-ink')}><ArchiveRestore className="size-4" /></button></Tip>
      ) : (
        <>
          <Tip content="Edit"><button onClick={onEdit} aria-label={`Edit ${p.name}`} className={clsx(iconBtn, 'hover:bg-muted hover:text-ink')}><Pencil className="size-4" /></button></Tip>
          <Tip content="Archive"><button onClick={() => onStatus(p.id, 'Archived')} aria-label={`Archive ${p.name}`} className={clsx(iconBtn, 'hover:bg-muted hover:text-ink')}><Archive className="size-4" /></button></Tip>
        </>
      )}
    </span>
  )
}

/** One editable list (behaviors or message styles): label + description, reorder, remove, add. The first one is the default. */
function OptionList({ title, items, onChange, idp, source }: { title: string; items: Option[]; onChange: (x: Option[]) => void; idp: string; source: Source }) {
  const move = (i: number, d: number) => { const n = [...items]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n) }
  const set = (i: number, k: keyof Option, v: string) => onChange(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const small = 'grid size-7 place-items-center rounded-md text-ink-3 hover:bg-muted hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent'
  const [ev, setEv] = useState<number | null>(null)
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-xs text-ink-3">The first one is used by default. Use the arrows to change it.</p>
        </div>
        <Button size="sm" onClick={() => onChange([...items, { label: '', about: '' }])}><Plus className="size-3.5" /> Add</Button>
      </div>
      <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
        {items.map((x, i) => (
          <li key={i} className="grid items-start gap-2 p-3 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)_auto]">
            <div className="flex items-center gap-2">
              <input style={NO_RING} aria-label={`${title} ${i + 1} label`} id={`${idp}-l-${i}`} value={x.label} onChange={(e) => set(i, 'label', e.target.value)} placeholder="Label" className={clsx('py-1.5', field)} />
            </div>
            <input style={NO_RING} aria-label={`${title} ${i + 1} description`} id={`${idp}-d-${i}`} value={x.about} onChange={(e) => set(i, 'about', e.target.value)} placeholder="What they do" className={clsx('py-1.5', field)} />
            <div className="flex items-center gap-0.5">
              {i === 0 && <span className="mr-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-2xs font-medium text-brand-700">Default</span>}
              {/* Evidence: the real messages behind this option */}
              <button onClick={() => setEv(ev === i ? null : i)} aria-expanded={ev === i} className={clsx('mr-1 rounded-md px-1.5 py-1 text-xs font-medium', ev === i ? 'bg-brand-50 text-brand-700' : 'text-brand-600 hover:bg-brand-50')}>
                Evidence{x.evidence?.length ? <span className="ml-0.5 tnum">{x.evidence.length}</span> : null}
              </button>
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className={small}><ArrowUp className="size-3.5" /></button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" className={small}><ArrowDown className="size-3.5" /></button>
              <Tip content={items.length === 1 ? 'At least one is needed' : 'Remove'}>
                <button onClick={() => onChange(items.filter((_, j) => j !== i))} disabled={items.length === 1} aria-label="Remove" className={clsx(small, 'hover:text-danger-700')}><Trash2 className="size-3.5" /></button>
              </Tip>
            </div>
            {ev === i && (
              <div className="anim-fade sm:col-span-3">
                {x.evidence?.length ? (
                  <ul className="space-y-1.5 rounded-lg bg-subtle p-3">
                    <li className="text-xs text-ink-3">Real messages that show this</li>
                    {x.evidence.map((q) => <li key={q} className="border-l-2 border-brand-300 pl-3 text-sm text-ink">“{q}”</li>)}
                  </ul>
                ) : (
                  <p className="rounded-lg bg-subtle p-3 text-sm text-ink-2">{source === 'Intended' ? 'No real messages yet. This comes from your agent context.' : 'No messages linked to this one yet. Added or changed by hand.'}</p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** How real people in this group write, in plain sentences (prod: "Measured communication patterns"). */
function MeasuredBox({ m }: { m?: Measured }) {
  if (!m) return <p className="rounded-lg bg-subtle p-3 text-sm text-ink-2">No real conversations yet. This profile comes from your agent context.</p>
  return (
    <div className="rounded-lg bg-subtle p-3">
      <p className="flex items-center gap-1.5 text-xs text-ink-3 tnum">
        From {count(m.convs, 'conversation', 'conversations')} · {count(m.msgs, 'message', 'messages')}
        {/* Prod's technical coverage line, kept for the Tars team behind the (i) */}
        {m.note && <Tip content={m.note}><button aria-label="About these numbers" className="hover:text-ink"><Info className="size-3.5" /></button></Tip>}
      </p>
      <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-4">
        <li><b className="block text-md font-semibold text-ink tnum">{m.words} words</b><span className="text-xs text-ink-2">in a usual message</span></li>
        <li><b className="block text-md font-semibold text-ink tnum">{m.short}%</b><span className="text-xs text-ink-2">use 5 words or fewer</span></li>
        <li><b className="block text-md font-semibold text-ink tnum">{m.questions}%</b><span className="text-xs text-ink-2">ask a question</span></li>
        <li><b className="block text-md font-semibold text-ink">{m.lang}</b><span className="text-xs text-ink-2">language</span></li>
      </ul>
    </div>
  )
}

/** Why Tars made this profile. Collapsed by default: brief lines are long, conversations are proof for anyone who wants it. */
function EvidenceBox({ ev }: { ev?: Evidence[] }) {
  const [open, setOpen] = useState(false)
  const [chat, setChat] = useState<number | null>(null)
  if (!ev?.length) return null
  return (
    <section>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 text-sm font-semibold text-ink">
        <ChevronRight className={clsx('size-4 text-ink-3 transition-transform', open && 'rotate-90')} /> Why Tars made this profile
        <span className="font-normal text-ink-3">{ev[0].kind === 'brief' ? `· ${ev.length} lines from your agent context` : '· from a real conversation'}</span>
      </button>
      {open && (
        <ul className="anim-fade mt-3 space-y-2">
          {ev.map((e, i) => (
            <li key={i} className="rounded-lg border border-line p-3">
              {e.kind === 'brief' ? (
                <>
                  <p className="text-xs font-medium text-ink-3">Agent context · {e.title}</p>
                  <p className="mt-1 border-l-2 border-line pl-3 text-sm text-ink-2">{e.text}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-ink-3">Real conversation</p>
                  <p className="mt-1 border-l-2 border-brand-300 pl-3 text-sm text-ink">“{e.quote}”</p>
                  <button onClick={() => setChat(chat === i ? null : i)} className="mt-2 text-xs font-medium text-brand-600 hover:underline">{chat === i ? 'Hide conversation' : 'See conversation'}</button>
                  {chat === i && (
                    <div className="mt-2 space-y-2 rounded-lg bg-subtle p-3">
                      {e.chat.map((m, j) => (
                        <div key={j} className={clsx('flex', m.from === 'ai' ? 'justify-start' : 'justify-end')}>
                          <span className={clsx('max-w-[85%] rounded-lg px-3 py-2 text-sm', m.from === 'ai' ? 'border border-line bg-surface text-ink-2' : 'bg-brand-600 text-white', m.text === e.quote && 'ring-2 ring-warning-600/40')}>{m.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Edit profile, as a modal: who they are, how they act, how they write, and why Tars made it. */
function EditModal({ p, onClose, onSave, onArchive }: { p: Profile | null; onClose: () => void; onSave: (p: Profile) => void; onArchive: (id: string) => void }) {
  const [draft, setDraft] = useState<Profile | null>(p)
  const [last, setLast] = useState<Profile | null>(p)
  if (p !== last) { setLast(p); setDraft(p) } // a new profile was opened
  if (!p || !draft) return null
  const ok = draft.name.trim() && draft.behaviors.every((x) => x.label.trim()) && draft.styles.every((x) => x.label.trim())
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      width="max-w-3xl"
      title={<span className="flex flex-wrap items-center gap-2">{p.name} <SourceChip s={p.source} /> <StatusTag s={p.status} /></span>}
      description="Who they are, how they act and how they write. Scenarios use this to act like real people."
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => { onArchive(p.id); onClose() }}><Archive className="size-4" /> Archive</Button>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={!ok} onClick={() => { onSave(draft); onClose() }}>Save profile</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4">
          <div>
            <label htmlFor="ed-name" className="block text-sm font-medium text-ink">Profile name</label>
            <input style={NO_RING} id="ed-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={clsx('mt-1.5', field)} />
          </div>
          <div>
            <label htmlFor="ed-about" className="block text-sm font-medium text-ink">Identity</label>
            <textarea style={NO_RING} id="ed-about" value={draft.about} onChange={(e) => setDraft({ ...draft, about: e.target.value })} rows={2} className={clsx('mt-1.5', field)} />
          </div>
        </div>
        <OptionList title="Behaviors" idp="beh" source={p.source} items={draft.behaviors} onChange={(x) => setDraft({ ...draft, behaviors: x })} />
        <OptionList title="Message styles" idp="sty" source={p.source} items={draft.styles} onChange={(x) => setDraft({ ...draft, styles: x })} />
        <section>
          <h3 className="text-sm font-semibold text-ink">How they really write</h3>
          <div className="mt-2"><MeasuredBox m={p.measured} /></div>
        </section>
        <EvidenceBox ev={p.evidence} />
      </div>
    </Modal>
  )
}

function Row({ p, open, onToggle, onEdit, onStatus, onReject }: { p: Profile; open: boolean; onToggle: () => void; onEdit: (p: Profile) => void; onStatus: (id: string, s: Status) => void; onReject: (id: string) => void }) {
  const pending = p.status === 'Pending review'
  return (
    <li className="border-b border-line last:border-0">
      <div className={clsx(COLS, 'group py-2.5 pr-10 pl-4', pending ? 'bg-brand-50 hover:bg-brand-100' : 'hover:bg-subtle', open && !pending && 'bg-subtle')}>
        <button onClick={onToggle} aria-expanded={open} className="flex min-w-0 items-center gap-3 text-left">
          <ChevronRight className={clsx('size-4 shrink-0 text-ink-3 transition-transform', open && 'rotate-90')} />
          <span className={clsx('min-w-0 truncate text-sm', p.status === 'Archived' ? 'text-ink-3' : 'text-ink')}>{p.name}</span>
        </button>
        <span><SourceChip s={p.source} /></span>
        <span className="text-center"><StatusTag s={p.status} /></span>
        <span className="-my-1.5 flex justify-end gap-1">
          <Actions p={p} hide={open} onEdit={() => onEdit(p)} onStatus={onStatus} onReject={onReject} />
        </span>
      </div>
      {open && (
        <div className="anim-fade space-y-4 px-4 pt-2 pb-4 pl-11">
          {(
            <>
              <p className="max-w-[720px] text-sm text-ink-2">{p.about}</p>
              {/* Proof at a glance: how many real chats, and one real message (or that it comes from the agent context) */}
              {p.measured ? (
                <p className="text-xs text-ink-3 tnum">
                  Seen in <b className="font-semibold text-ink">{count(p.measured.convs, 'real conversation', 'real conversations')}</b>
                  {p.evidence?.[0]?.kind === 'chat' && <> · e.g. <span className="text-ink-2">“{p.evidence[0].quote}”</span></>}
                </p>
              ) : (
                <p className="text-xs text-ink-3">Not seen in real conversations yet · comes from your agent context</p>
              )}
              <Options p={p} />
              {p.status !== 'Pending review' && (
                <div className="flex flex-wrap gap-2">
                  {p.status !== 'Archived' && <Button size="sm" onClick={() => onEdit(p)}><Pencil className="size-3.5" /> Edit</Button>}
                  {p.status === 'Archived'
                    ? <Button size="sm" onClick={() => onStatus(p.id, 'Approved')}><ArchiveRestore className="size-3.5" /> Restore</Button>
                    : <Button size="sm" variant="ghost" onClick={() => onStatus(p.id, 'Archived')}><Archive className="size-3.5" /> Archive</Button>}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </li>
  )
}

function ProfileCard({ p, onEdit, onStatus, onReject }: { p: Profile; onEdit: (p: Profile) => void; onStatus: (id: string, s: Status) => void; onReject: (id: string) => void }) {
  const pending = p.status === 'Pending review'
  return (
    <div className={clsx('group flex flex-col rounded-xl border p-4', pending ? 'border-brand-200 bg-brand-50' : 'border-line bg-surface hover:shadow-md')}>
      {(
        <>
          <p className={clsx('text-sm font-medium', p.status === 'Archived' ? 'text-ink-3' : 'text-ink')}>{p.name}</p>
          <p className="mt-1 line-clamp-2 text-sm text-ink-2">{p.about}</p>
          <p className="mt-2 text-xs text-ink-3 tnum">{count(p.behaviors.length, 'behavior', 'behaviors')} · {count(p.styles.length, 'message style', 'message styles')}</p>
          <div className="mt-auto flex items-center gap-2 pt-4">
            <SourceChip s={p.source} />
            <StatusTag s={p.status} />
            <span className="-my-1.5 ml-auto flex gap-1">
              <Actions p={p} onEdit={() => onEdit(p)} onStatus={onStatus} onReject={onReject} />
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/** Add profile, as a modal: name and identity. Behaviors and message styles start as the neutral defaults. */
function AddModal({ open, onAdd, onClose }: { open: boolean; onAdd: (name: string, about: string) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const close = () => { setName(''); setAbout(''); onClose() }
  const submit = () => { if (!name.trim()) return; onAdd(name.trim(), about.trim()); setName(''); setAbout('') }
  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Add profile"
      description="A kind of person who chats with the agent. Scenarios use it to act like real people."
      footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={submit}>Add profile</Button></>}
    >
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
        <div>
          <label htmlFor="new-p-name" className="block text-sm font-medium text-ink">Profile name</label>
          <input style={NO_RING} id="new-p-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grandparent asking for a grandchild" className={clsx('mt-1.5 placeholder:text-ink-3', field)} />
        </div>
        <div>
          <label htmlFor="new-p-about" className="block text-sm font-medium text-ink">Identity</label>
          <textarea style={NO_RING} id="new-p-about" value={about} onChange={(e) => setAbout(e.target.value)} rows={3} placeholder="Who they are, in one sentence" className={clsx('mt-1.5 placeholder:text-ink-3', field)} />
        </div>
        <p className="text-xs text-ink-3">Starts with a neutral behavior and plain language. You can change them after.</p>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  )
}

export function ProfilesTab() {
  const { toast } = useApp()
  const [list, setList] = useState(APPROVED)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [open, setOpen] = useState<string | null>(null)
  const [layout, setLayout] = useState<'Table' | 'Cards'>('Table')
  const [adding, setAdding] = useState(false)
  const [editingP, setEditingP] = useState<Profile | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [checked, setChecked] = useState('Nov 2')

  const save = (p: Profile) => { setList((l) => l.map((x) => (x.id === p.id ? p : x))); toast('Profile saved') }
  const setStatus = (id: string, s: Status) => {
    setList((l) => l.map((p) => (p.id === id ? { ...p, status: s } : p)))
    toast(s === 'Archived' ? 'Profile archived' : 'Profile approved')
  }
  const reject = (id: string) => { setList((l) => l.filter((p) => p.id !== id)); toast('Profile rejected') }
  const approveAll = () => { setList((l) => l.map((p) => (p.status === 'Pending review' ? { ...p, status: 'Approved' } : p))); toast('All new profiles approved') }
  const add = (name: string, about: string) => {
    setList((l) => [...l, { id: `new-${l.length}`, name, about, source: 'Intended', status: 'Approved', behaviors: [NEUTRAL], styles: [PLAIN] }])
    setAdding(false)
    toast('Profile added')
  }
  // Analyze: ~2s, then new groups found in real conversations come in as Pending review, at the top
  const analyze = () => {
    setAnalyzing(true)
    setTimeout(() => {
      setAnalyzing(false)
      setChecked('just now')
      setList((l) => {
        const fresh = FOUND.filter((f) => !l.some((p) => p.id === f.id))
        toast(fresh.length ? `${fresh.length} new profiles to review` : 'No new profiles. Everything is up to date.')
        return [...fresh, ...l]
      })
      setFilter('All')
    }, 2000)
  }

  const counts = (f: Filter) => (f === 'All' ? list.filter((p) => p.status !== 'Archived').length : list.filter((p) => p.status === f).length)
  const rank = (p: Profile) => (p.status === 'Pending review' ? 0 : p.status === 'Approved' ? 1 : 2)
  const shown = list
    .filter((p) => (filter === 'All' ? p.status !== 'Archived' : p.status === filter) && `${p.name} ${p.about}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => rank(a) - rank(b))
  const pending = counts('Pending review')

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[640px]">
          <p className="text-sm text-ink-2">Customer profiles describe who chats with the agent and how they write. Scenarios use them to act like real people.</p>
          {/* Prod's run log in one plain line; the full log is behind the (i) for the Tars team */}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-3 tnum">
            Found <b className="font-semibold text-ink">{counts('All')} profiles</b> from <b className="font-semibold text-ink">111 conversations</b> · last checked {checked}
            <Tip content={<span className="tnum">111 conversations · 80 observations · 59 initial clusters · 36 reviewed groups · 7 proposals · 62 cached vectors, 18 new · 4 model calls</span>}>
              <button aria-label="How profiles were found" className="text-ink-3 hover:text-ink"><Info className="size-3.5" /></button>
            </Tip>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={analyze} disabled={analyzing}>{analyzing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} {analyzing ? 'Analyzing…' : 'Analyze'}</Button>
          <Button size="sm" variant="primary" onClick={() => setAdding(true)}><Plus className="size-3.5" /> Add profile</Button>
        </div>
      </div>
      <AddModal open={adding} onAdd={add} onClose={() => setAdding(false)} />
      <EditModal p={editingP} onClose={() => setEditingP(null)} onSave={save} onArchive={(id) => setStatus(id, 'Archived')} />

      <div className="mt-4 rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line px-3 py-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            <Search className="size-4 text-ink-3" />
            <input style={NO_RING} id="profile-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search profiles" className="w-full bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none" />
          </label>
          <div className="flex rounded-lg bg-brand-50 p-1 text-sm" role="tablist" aria-label="Filter profiles">
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

        {analyzing && (
          <div className="border-b border-line">
            <div className="flex items-center gap-2 bg-subtle/60 px-4 py-2 text-xs font-semibold text-ink-2">
              <Loader2 className="size-3.5 animate-spin text-brand-600" /> Looking for new kinds of people in real conversations…
            </div>
            <ul aria-hidden>
              {[60, 48].map((w) => (
                <li key={w} className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-0">
                  <span className="size-4 rounded bg-n-100" />
                  <span className="h-3 animate-pulse rounded bg-n-100" style={{ width: `${w}%` }} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {shown.length === 0 && !analyzing && (
          <p className="px-4 py-8 text-center text-sm text-ink-3">{q ? `No profiles match “${q}”.` : `No ${filter.toLowerCase()} profiles.`}</p>
        )}

        {layout === 'Cards' ? (
          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((p) => <ProfileCard key={p.id} p={p} onEdit={setEditingP} onStatus={setStatus} onReject={reject} />)}
          </div>
        ) : (
          <>
            <div className={clsx(COLS, 'border-b border-line py-2 pr-10 pl-4 text-xs font-medium text-ink-3')}>
              <span className="pl-7">Customer profile</span>
              <span>Source</span>
              <span className="text-center">Status</span>
              <span />
            </div>
            <ul>
              {shown.map((p) => (
                <Row key={p.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} onEdit={setEditingP} onStatus={setStatus} onReject={reject} />
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  )
}
