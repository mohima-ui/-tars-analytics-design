import { useState } from 'react'
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Eye, FlaskConical, Info, Play, Settings, ThumbsDown, ThumbsUp, Wrench, XCircle } from 'lucide-react'
import { useApp } from '../state'
import { Badge, Button, Tip, clsx } from '../components/ui'
import { GOALS, KB_GAPS, MUST_PASS, RUN, RUNS, SINCE_LAST, TEST_CASES, type FailedCase, type Goal } from './data'
import { Chat, Intro, plural, useBadge } from './shared'
import { useBus } from './ctx'

/*
 * Results (prod: Simulations + Analysis, merged). The score sits in the header above every tab,
 * so this tab answers the next questions, in order:
 *   1. What changed since the last run?   2. Which goals failed, and why?
 *   3. Is anything missing from Knowledge? 4. Did Tars grade the failed chats right?
 * Real chats are labelled in Analytics now; here people only check test chats, and only the ones that failed.
 */

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
const must = (id: string) => MUST_PASS.includes(id)

function Card({ title, sub, action, children, className }: { title: string; sub?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx('rounded-xl border border-line bg-surface', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-xs text-ink-3">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/* ---------- 1. Since the last run ---------- */
function SinceLast() {
  const [open, setOpen] = useState(false)
  const [now, before] = RUNS
  const added = now.cases - before.cases
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="text-sm text-ink-2">
          Since the last run on <span className="text-ink">{before.when.split(',')[0]}</span>:{' '}
          <b className="font-semibold text-ink tnum">{pct(before.passed, before.cases)}%</b> <ArrowRight className="inline size-3.5 text-ink-3" /> <b className="font-semibold text-ink tnum">{pct(now.passed, now.cases)}%</b>
        </p>
        <span className="flex flex-wrap gap-2 text-xs">
          <Badge tone="success">{SINCE_LAST.fixed.length} fixed</Badge>
          <Badge tone="danger">{SINCE_LAST.broke.length} broke</Badge>
          <Badge>{added} new scenarios</Badge>
        </span>
        <span className="text-xs text-ink-3">You changed: {now.change}</span>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
          <ChevronRight className={clsx('size-3.5 transition-transform', open && 'rotate-90')} /> {open ? 'Hide' : 'See what changed'}
        </button>
      </div>
      {open && (
        <div className="anim-fade mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-success-700">Fixed: failed before, pass now</p>
            <ul className="mt-1.5 space-y-1 text-sm text-ink-2">{SINCE_LAST.fixed.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success-600" />{x}</li>)}</ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-danger-700">Broke: passed before, fail now</p>
            <ul className="mt-1.5 space-y-1 text-sm text-ink-2">{SINCE_LAST.broke.map((x) => <li key={x} className="flex gap-2"><XCircle className="mt-0.5 size-3.5 shrink-0 text-danger-600" />{x}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- 2. Goals ---------- */
function FailedCaseRow({ c }: { c: FailedCase }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-lg border border-line p-3">
      <p className="text-sm text-ink">{c.title}</p>
      <p className="mt-0.5 text-xs text-danger-700">{c.why}</p>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
        <ChevronRight className={clsx('size-3.5 transition-transform', open && 'rotate-90')} /> {open ? 'Hide chat' : 'See chat'}
      </button>
      {open && <div className="mt-2"><Chat msgs={c.chat} /></div>}
    </li>
  )
}

/** What to change for a failing goal, in one sentence, with the place to do it. */
const FIX: Record<string, { text: string; where: 'Knowledge' | 'Configure' }> = {
  website: { text: 'Add the missing answers to Knowledge: the self-pay price, Medicaid, and how testing works. Tell the agent not to guess.', where: 'Knowledge' },
  'next-step': { text: 'Tell the agent to offer the appointment form first, and the phone number only if they ask.', where: 'Configure' },
}

/** After a fix, keep watching for the same problem with real customers: drafts a check from this goal. */
function WatchButton({ g }: { g: Goal }) {
  const { addCheck, goTo } = useBus()
  const { toast } = useApp()
  const [made, setMade] = useState(false)
  if (made) return <Button size="sm" variant="ghost" onClick={() => goTo('Checks')}><Check className="size-3.5" /> Draft check made · Open</Button>
  return (
    <Tip content="Drafts a check that flags this in real chats after you go live. You turn it on in Checks.">
      <Button size="sm" variant="ghost" onClick={() => {
        addCheck({ id: `w-${g.id}`, name: g.name, about: `Flags real chats where this doesn’t happen: ${g.about}`, status: 'Draft', from: `Made from the objective “${g.name}” in your test`, tried: { chats: 20, agree: 18 }, how: 'AI check' })
        setMade(true); toast('Draft check made. Turn it on in Checks.')
      }}><Eye className="size-3.5" /> Watch in live chats</Button>
    </Tip>
  )
}

function GoalRow({ g }: { g: Goal }) {
  const ok = g.passed === g.total
  const [open, setOpen] = useState(false)
  const { toast } = useApp()
  const fix = FIX[g.id]
  return (
    <li className="border-b border-line last:border-0">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className={clsx('group flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-subtle', open && 'bg-subtle')}>
        {ok ? <CheckCircle2 className="size-4 shrink-0 text-success-600" /> : <XCircle className="size-4 shrink-0 text-danger-600" />}
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-ink">{g.name}{must(g.id) && !ok && <Badge tone="danger">Blocks going live</Badge>}</span>
        {/* Bar + count: how much of this goal passed */}
        <span className="hidden w-24 sm:block"><span className="block h-1.5 overflow-hidden rounded-full bg-n-100"><span className={clsx('block h-full rounded-full', ok ? 'bg-success-600' : 'bg-danger-600')} style={{ width: `${pct(g.passed, g.total)}%` }} /></span></span>
        <span className="w-[86px] shrink-0 text-right text-xs text-ink-3 tnum"><b className={clsx('text-sm font-medium', ok ? 'text-ink' : 'text-danger-700')}>{g.passed}</b> of {g.total}</span>
        <ChevronRight className={clsx('size-4 shrink-0 text-ink-3 transition-transform group-hover:text-ink', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="anim-fade space-y-3 px-4 pt-1 pb-4 pl-11">
          <p className="text-sm text-ink-2">{g.about}</p>
          {!ok && fix && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700"><Wrench className="size-3.5" /> How to fix</p>
              <p className="mt-1 text-sm text-ink">{fix.text}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={() => toast(`Opens ${fix.where}`)}>{fix.where === 'Knowledge' ? <BookOpen className="size-3.5" /> : <Settings className="size-3.5" />} Open {fix.where}</Button>
                <WatchButton g={g} />
              </div>
            </div>
          )}
          {g.failed?.length ? (
            <>
              <p className="text-xs font-medium text-ink-3">{plural(g.failed.length, 'scenario', 'scenarios')} failed</p>
              <ul className="space-y-2">{g.failed.map((c) => <FailedCaseRow key={c.title} c={c} />)}</ul>
            </>
          ) : <p className="text-xs text-success-700">Every scenario passed.</p>}
        </div>
      )}
    </li>
  )
}

/* ---------- 3. Knowledge ---------- */
function Knowledge() {
  const { toast } = useApp()
  const [added, setAdded] = useState<string[]>([])
  return (
    <Card
      title="Missing from Knowledge"
      sub={<span className="inline-flex items-center gap-1">{plural(KB_GAPS.length, 'question', 'questions')} the agent looked up but couldn’t answer
        <Tip content="Tars compares what the agent asked Knowledge with the answer it got. If the question was right but the answer was missing, the information probably isn’t in Knowledge."><button aria-label="How Tars knows" className="text-ink-3 hover:text-ink"><Info className="size-3.5" /></button></Tip>
      </span>}
    >
      <ul>
        {KB_GAPS.map((k) => (
          <li key={k.q} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-0">
            <BookOpen className="mt-0.5 size-4 shrink-0 text-warning-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{k.q}</p>
              <p className="text-xs text-ink-3">{k.topic} · {plural(k.cases, 'scenario', 'scenarios')}</p>
            </div>
            {added.includes(k.q)
              ? <span className="inline-flex items-center gap-1 text-xs font-medium text-success-700"><Check className="size-3.5" /> Added</span>
              : <Button size="sm" onClick={() => { setAdded((a) => [...a, k.q]); toast('Opens Knowledge with this question filled in') }}>Add answer</Button>}
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ---------- Run history ---------- */
function History() {
  return (
    <Card title="Test runs" sub="Each run, and what you changed before it">
      <ul>
        {RUNS.map((r, i) => {
          const s = pct(r.passed, r.cases)
          return (
            <li key={r.when} className="border-b border-line px-4 py-3 last:border-0">
              <div className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-sm font-semibold text-ink tnum">{s}%</span>
                <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-n-100"><span className="block h-full rounded-full bg-brand-400" style={{ width: `${s}%` }} /></span>
                <span className="shrink-0 text-xs text-ink-3 tnum">{r.when}</span>
              </div>
              <p className="mt-1 pl-[52px] text-xs text-ink-3">{i === 0 && <b className="font-medium text-ink-2">Latest · </b>}{r.change}</p>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* ---------- 4. Check Tars's grading ---------- */
type Verdict = 'agree' | 'disagree'
function GradingRow({ c, goal, v, onVerdict }: { c: FailedCase; goal: string; v?: Verdict; onVerdict: (v: Verdict) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <li className={clsx('border-b border-line px-4 py-3 last:border-0', v && 'bg-subtle/60')}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink">{c.title}</p>
          <p className="mt-0.5 text-xs text-ink-3">Tars says it failed <b className="font-medium text-ink-2">{goal}</b>: {c.why}</p>
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
            <ChevronRight className={clsx('size-3.5 transition-transform', open && 'rotate-90')} /> {open ? 'Hide chat' : 'Read chat'}
          </button>
        </div>
        {v ? (
          <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', v === 'agree' ? 'text-ink-2' : 'text-brand-700')}>
            {v === 'agree' ? <><ThumbsUp className="size-3.5" /> You agree it failed</> : <><ThumbsDown className="size-3.5" /> You say it passed</>}
            <button onClick={() => onVerdict(v)} className="ml-1 font-normal text-ink-3 hover:text-ink hover:underline">Undo</button>
          </span>
        ) : (
          <span className="flex gap-2">
            <Button size="sm" onClick={() => onVerdict('agree')}><ThumbsUp className="size-3.5" /> Yes, it failed</Button>
            <Button size="sm" variant="ghost" onClick={() => onVerdict('disagree')}><ThumbsDown className="size-3.5" /> No, it’s fine</Button>
          </span>
        )}
      </div>
      {open && <div className="anim-fade mt-3"><Chat msgs={c.chat} /></div>}
    </li>
  )
}

function Grading({ onBadge }: { onBadge?: (n: number) => void }) {
  const { toast } = useApp()
  const failed = GOALS.flatMap((g) => (g.failed ?? []).map((c) => ({ c, goal: g.name })))
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({})
  const done = Object.keys(verdicts).length
  useBadge(failed.length - done, onBadge)
  const set = (title: string, v: Verdict) => setVerdicts((m) => {
    const n = { ...m }
    if (n[title] === v) delete n[title] // clicking the same answer again (Undo) clears it
    else { n[title] = v; if (v === 'disagree') toast('Got it. Tars will learn from this and re-grade it.') }
    return n
  })
  return (
    <Card
      title="Did Tars grade these right?"
      sub="Only the test chats that failed. Your answers make the grading more accurate."
      action={<span className="text-xs text-ink-3 tnum"><b className="font-semibold text-ink">{done}</b> of {failed.length} checked</span>}
    >
      <ul>{failed.map(({ c, goal }) => <GradingRow key={c.title} c={c} goal={goal} v={verdicts[c.title]} onVerdict={(v) => set(c.title, v)} />)}</ul>
    </Card>
  )
}

/* ---------- Running ---------- */
function Running() {
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <p className="flex items-center gap-2 text-sm text-ink-2"><span className="size-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" /> Playing {TEST_CASES} scenarios against your agent. This takes about a minute.</p>
      <ul aria-hidden className="mt-4 space-y-3">
        {[80, 64, 72, 56].map((w) => <li key={w} className="h-3 animate-pulse rounded bg-n-100" style={{ width: `${w}%` }} />)}
      </ul>
    </div>
  )
}

/** Before the first test: nothing to show yet, one clear action. */
function NotYet({ onRun }: { onRun: () => void }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><FlaskConical className="size-5" /></span>
      <p className="mt-3 text-sm font-medium text-ink">No test yet</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">Run your first test to see which objectives pass, what’s missing from Knowledge, and whether the agent is ready to go live.</p>
      <Button className="mt-4" variant="primary" onClick={onRun}><Play className="size-4" /> Run first test</Button>
    </div>
  )
}

export function ResultsTab({ running, onRun, onBadge, first }: { running: boolean; onRun: () => void; onBadge?: (n: number) => void; first?: boolean }) {
  const { hasRun } = useBus()
  const sorted = [...GOALS].sort((a, b) => Number(must(b.id) && b.passed < b.total) - Number(must(a.id) && a.passed < a.total) || a.passed / a.total - b.passed / b.total)
  const failing = GOALS.filter((g) => g.passed < g.total).length
  return (
    <>
      <Intro
        text="Tars plays every scenario against your agent and grades it on your objectives. Start with what failed."
        sub={hasRun ? <><b className="font-semibold text-ink">{RUN.passed} of {RUN.cases}</b> scenarios passed · {failing} of {GOALS.length} objectives need work</> : undefined}
        actions={<Button size="sm" variant="primary" onClick={onRun} disabled={running}><Play className="size-3.5" /> {running ? 'Testing…' : 'Run test'}</Button>}
      />
      {running ? <div className="mt-4"><Running /></div> : !hasRun ? <NotYet onRun={onRun} /> : (
        <div className="mt-4 space-y-4">
          {first
            ? <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-2">This was your first test. After your next one, you’ll see what got fixed and what broke.</p>
            : <SinceLast />}
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card title="Objectives" sub="Objectives that block going live come first">
              <ul>{sorted.map((g) => <GoalRow key={g.id} g={g} />)}</ul>
            </Card>
            <div className="space-y-4">
              <Knowledge />
              <History />
            </div>
          </div>
          <Grading onBadge={onBadge} />
          <p className="flex items-center gap-1.5 text-xs text-ink-3">
            Simulated customers are close to real ones
            <Tip content="Simulator health: how much the test customers write like real customers in this agent’s chats (message length, questions, wording)."><button aria-label="About simulated customers" className="hover:text-ink"><Info className="size-3.5" /></button></Tip>
          </p>
        </div>
      )}
    </>
  )
}
