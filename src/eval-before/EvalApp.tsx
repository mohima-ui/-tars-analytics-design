import { useEffect, useState } from 'react'
import { Tooltip } from 'radix-ui'
import {
  Activity, AlertTriangle, ArrowLeft, BarChart3, BookOpen, Bot, CheckCircle2, ChevronLeft, ChevronRight, FlaskConical, LayoutGrid,
  Loader2, Megaphone, MessagesSquare, Palette, PanelLeft, Play, Settings, Share2, Users, Wrench, XCircle,
} from 'lucide-react'
import { AppState, useApp } from '../state'
import { Badge, Button, Tip, clsx } from '../components/ui'
import { ObjectivesTab } from './Objectives'
import { ProfilesTab } from './Profiles'
import { ScenariosTab } from './Scenarios'
import { AGENT, GOALS, REVIEW, TESTED, TEST_CASES, type EvalMsg, type Goal } from './data'

/*
 * Evaluation = "test before going live". Tabs follow the user's journey:
 * set the rules (Objectives) → who to test with (Customer profiles) → test cases (Scenarios) → run them (Simulations)
 * → review real chats (Analysis) → automatic checks (Evaluators). Names are kept as in prod for now.
 */

function Toast() {
  const { toastMsg } = useApp()
  if (!toastMsg) return null
  return (
    <div role="status" className="anim-fade fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-lg bg-n-900 px-4 py-3 text-sm text-white shadow-xl">
      <CheckCircle2 className="size-4 text-success-600" /> {toastMsg}
    </div>
  )
}

const pctOf = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

/** Ready / Almost ready / Not ready, from the share of goal checks that passed. */
function readiness(score: number, failing: number) {
  if (failing === 0 && score >= 95) return { label: 'Ready to go live', tone: 'success' as const }
  if (score >= 80) return { label: 'Almost ready', tone: 'warning' as const }
  return { label: 'Not ready yet', tone: 'danger' as const }
}

/* ---------------- The answer ---------------- */
function Result({ running, tested, changed, onRun }: { running: boolean; tested: string; changed: boolean; onRun: () => void }) {
  const passed = GOALS.reduce((t, g) => t + g.passed, 0)
  const total = GOALS.reduce((t, g) => t + g.total, 0)
  const score = pctOf(passed, total)
  const failing = GOALS.filter((g) => g.passed < g.total).length
  const r = readiness(score, failing)
  return (
    <section className="rounded-xl border border-line bg-surface p-6 shadow-xs">
      {/* Prod names: objectives and simulations */}
      {running ? (
        <div className="flex items-center gap-3 py-6 text-sm text-ink-2">
          <Loader2 className="size-5 animate-spin text-brand-600" />
          Running {TEST_CASES} scenarios against your agent…
        </div>
      ) : (
        <>
          {/* Score on the left, what it means in the middle, when it was tested on the right */}
          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)_auto]">
            <div>
              <p className="text-sm text-ink-3">Is the agent ready to go live?</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-semibold tracking-tight text-ink tnum">{score}%</span>
                <Badge tone={r.tone}>{r.label}</Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-n-100">
                <div className="h-full rounded-full bg-brand-400" style={{ width: `${score}%` }} />
              </div>
            </div>
            <p className="text-sm text-ink-2 md:border-l md:border-line md:pl-6">
              <b className="font-semibold text-ink">{GOALS.length - failing} of {GOALS.length}</b> objectives passed.{' '}
              {failing > 0 && <><b className="font-semibold text-danger-700">{failing}</b> need work before going live.</>}
            </p>
            <p className="text-xs text-ink-3 tnum md:text-right">Tested {tested}<br className="hidden md:inline" /><span className="md:hidden"> · </span>{TEST_CASES} scenarios</p>
          </div>
        </>
      )}

      {/* The agent was edited after the last test, so the result may be out of date */}
      {!running && changed && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-50 px-3 py-2.5 text-sm text-warning-700">
          <span className="flex items-center gap-2"><AlertTriangle className="size-4 shrink-0" /> You changed the agent after this test.</span>
          <button onClick={onRun} className="font-medium hover:underline">Test again</button>
        </div>
      )}
    </section>
  )
}

/* ---------------- Goals ---------------- */
function Chat({ msgs }: { msgs: EvalMsg[] }) {
  const marked = (m: EvalMsg) => {
    if (!m.mark) return m.text
    const at = m.text.indexOf(m.mark)
    if (at < 0) return m.text
    return <>{m.text.slice(0, at)}<mark className="rounded-sm bg-warning-600/20 px-0.5 text-ink">{m.mark}</mark>{m.text.slice(at + m.mark.length)}</>
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

function FailedCaseRow({ c }: { c: NonNullable<Goal['failed']>[number] }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-lg border border-line p-3">
      <p className="text-sm text-ink">{c.title}</p>
      <p className="mt-0.5 text-xs text-danger-700">{c.why}</p>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
        <ChevronRight className={clsx('size-3.5 transition-transform', open && 'rotate-90')} />
        {open ? 'Hide conversation' : 'See conversation'}
      </button>
      {open && <div className="mt-2"><Chat msgs={c.chat} /></div>}
    </li>
  )
}

function GoalRow({ g }: { g: Goal }) {
  const ok = g.passed === g.total
  const [open, setOpen] = useState(false)
  return (
    <li className="border-b border-line last:border-0">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className={clsx('group flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-subtle', open && 'bg-subtle')}>
        {ok ? <CheckCircle2 className="size-4 shrink-0 text-success-600" /> : <XCircle className="size-4 shrink-0 text-danger-600" />}
        <span className="min-w-0 flex-1 text-sm text-ink">{g.was}</span>
        <span className="shrink-0 text-xs text-ink-3 tnum"><b className={clsx('text-sm font-medium', ok ? 'text-ink' : 'text-danger-700')}>{g.passed}</b> of {g.total} passed</span>
        <ChevronRight className={clsx('size-4 shrink-0 text-ink-3 transition-transform group-hover:text-ink', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="anim-fade space-y-3 px-4 pt-1 pb-4 pl-11">
          <p className="text-sm text-ink-2">{g.about}</p>
          {g.failed && g.failed.length > 0 ? (
            <>
              <p className="text-xs font-medium text-ink-3">{g.failed.length} {g.failed.length === 1 ? 'scenario' : 'scenarios'} failed</p>
              <ul className="space-y-2">{g.failed.map((c) => <FailedCaseRow key={c.title} c={c} />)}</ul>
            </>
          ) : (
            <p className="text-xs text-success-700">Every scenario passed.</p>
          )}
        </div>
      )}
    </li>
  )
}

/* ---------------- Tab contents ---------------- */
const TABS = ['Objectives', 'Customer profiles', 'Scenarios', 'Simulations', 'Analysis', 'Evaluators'] as const
type Tab = (typeof TABS)[number]

/** Shared tab intro: one line of what this step is, and its actions. */
function TabIntro({ text, actions }: { text: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <p className="max-w-[640px] text-sm text-ink-2">{text}</p>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}


function SimulationsTab({ running, tested, changed, onRun }: { running: boolean; tested: string; changed: boolean; onRun: () => void }) {
  // Objectives that need work come first
  const sorted = [...GOALS].sort((a, b) => a.passed / a.total - b.passed / b.total)
  return (
    <>
      <TabIntro
        text="Simulations play every scenario against your real agent. The result tells you if it’s ready to go live."
        actions={
          <Button size="sm" variant="primary" onClick={onRun} disabled={running}>
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} {running ? 'Running…' : 'Run simulation'}
          </Button>
        }
      />
      <div className="mt-4"><Result running={running} tested={tested} changed={changed} onRun={onRun} /></div>
      <h2 className="mt-6 text-base font-semibold text-ink">Results by objective</h2>
      <ul className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
        {sorted.map((g) => <GoalRow key={g.id} g={g} />)}
      </ul>
    </>
  )
}

function AnalysisTab() {
  const { toast } = useApp()
  return (
    <>
      <TabIntro
        text="Review real conversations and mark each one pass or fail. Your labels teach the evaluators what a failure looks like."
        actions={<Button size="sm" variant="primary" onClick={() => toast('Opens the review queue')}>Start reviewing</Button>}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { k: 'Review queue', v: REVIEW.queue, sub: 'conversations to review' },
          { k: 'Labeled so far', v: REVIEW.labeled, sub: 'conversations' },
          { k: 'Failures found', v: REVIEW.failures, sub: `${pctOf(REVIEW.failures, REVIEW.labeled)}% of labeled` },
        ].map((x) => (
          <div key={x.k} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-xs text-ink-3">{x.k}</p>
            <p className="mt-2 text-md font-semibold text-ink tnum">{x.v}</p>
            <p className="mt-1 text-xs text-ink-2">{x.sub}</p>
          </div>
        ))}
      </div>
      {/* Failure modes and Diagnostics moved to Analytics (Oct 16 call) */}
      <p className="mt-4 text-xs text-ink-3">Failure modes and Diagnostics now show in Analytics, inside each topic’s “What’s happening”.</p>
    </>
  )
}

function EvaluatorsTab() {
  const { toast } = useApp()
  return (
    <>
      <TabIntro
        text="Evaluators are automatic checks that watch every conversation for a problem, so no one has to read them all."
        actions={<Button size="sm" variant="primary" onClick={() => toast('Opens New evaluator')}>New evaluator</Button>}
      />
      <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
        <p className="text-sm font-medium text-ink">No evaluators yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">When you confirm a problem in Analytics, an evaluator is created for it here and checks every week whether your fix worked.</p>
        <p className="mt-3 text-xs text-ink-3 tnum">0 of 8 judge slots used</p>
      </div>
    </>
  )
}

/* ---------------- Sidebar (same as prod: icon rail + Build agent menu) ---------------- */
const RAIL = [
  [{ icon: MessagesSquare, label: 'Conversations' }, { icon: Megaphone, label: 'Campaigns' }, { icon: Users, label: 'Users' }],
  [{ icon: Bot, label: 'AI Agents', active: true }, { icon: BookOpen, label: 'Knowledge' }, { icon: Wrench, label: 'Tools' }],
  [{ icon: BarChart3, label: 'Analytics' }],
]
const BUILD = [
  { icon: LayoutGrid, label: 'Make' },
  { icon: Settings, label: 'Configure' },
  { icon: Palette, label: 'Design' },
  { icon: Share2, label: 'Distribute' },
  { icon: Activity, label: 'Activity' },
  { icon: FlaskConical, label: 'Evaluate', active: true },
]

function TarsMark() {
  return (
    <span className="grid size-9 place-items-center rounded-lg bg-[#f6a623]" aria-hidden>
      <svg viewBox="0 0 20 20" className="size-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1="5" y1="15" x2={5 + 11 * Math.cos((-i * 22.5 * Math.PI) / 180)} y2={15 + 11 * Math.sin((-i * 22.5 * Math.PI) / 180)} stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        ))}
      </svg>
    </span>
  )
}

function EvalSidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { toast } = useApp()
  return (
    <>
      {/* Icon rail */}
      <nav aria-label="Main" className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col items-center border-r border-line bg-surface md:flex">
        <div className="flex h-16 w-full items-center justify-center border-b border-line"><TarsMark /></div>
        <div className="flex flex-1 flex-col items-center gap-1 py-3">
          {RAIL.map((g, gi) => (
            <div key={gi} className={clsx('flex flex-col items-center gap-1', gi > 0 && 'mt-2 border-t border-line pt-3')}>
              {g.map((it) => (
                <Tip key={it.label} content={it.label} side="right">
                  <button
                    onClick={() => toast(`Opens ${it.label}`)}
                    aria-label={it.label}
                    aria-current={'active' in it && it.active ? 'page' : undefined}
                    className={clsx('grid size-10 place-items-center rounded-lg', 'active' in it && it.active ? 'bg-brand-100 text-brand-600' : 'text-ink-2 hover:bg-muted hover:text-ink')}
                  >
                    <it.icon className="size-5" />
                  </button>
                </Tip>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-3 border-t border-line py-3">
          <Tip content={open ? 'Hide menu' : 'Show menu'} side="right">
            <button onClick={onToggle} aria-label={open ? 'Hide menu' : 'Show menu'} aria-expanded={open} className="grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-muted hover:text-ink">
              <PanelLeft className="size-5" />
            </button>
          </Tip>
          <span className="grid size-10 place-items-center rounded-lg bg-[#3b8f9b] text-sm font-semibold text-white" aria-label="Account">M</span>
        </div>
      </nav>

      {/* Build agent menu */}
      {open && (
        <nav aria-label="Build agent" className="fixed inset-y-0 left-16 z-30 hidden w-[200px] flex-col border-r border-line bg-surface md:flex">
          <p className="px-5 pt-6 pb-3 text-xs font-semibold tracking-wide text-ink uppercase">Build agent</p>
          <ul className="flex-1 space-y-1 px-3">
            {BUILD.map((it) => (
              <li key={it.label}>
                <button
                  onClick={() => !('active' in it) && toast(`Opens ${it.label}`)}
                  aria-current={'active' in it && it.active ? 'page' : undefined}
                  className={clsx('flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm', 'active' in it && it.active ? 'bg-brand-50 font-medium text-brand-600' : 'text-ink-2 hover:bg-muted hover:text-ink')}
                >
                  <it.icon className="size-[18px] shrink-0" /> {it.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-center border-t border-line py-3">
            <button onClick={onToggle} aria-label="Hide menu" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-muted hover:text-ink">
              <ChevronLeft className="size-4" />
            </button>
          </div>
        </nav>
      )}
    </>
  )
}

/* ---------------- Page ---------------- */
function Page() {
  const { toast } = useApp()
  const [menuOpen, setMenuOpen] = useState(true)
  const [tab, setTab] = useState<Tab>('Objectives')
  const [running, setRunning] = useState(false)
  const [tested, setTested] = useState(TESTED)
  const [changed, setChanged] = useState(true) // prod shows "config drifted" on the last suite
  // Prototype: a test run takes ~4 seconds, then the result is fresh
  useEffect(() => {
    if (!running) return
    const id = setTimeout(() => { setRunning(false); setTested('just now'); setChanged(false); toast('Simulation finished') }, 4000)
    return () => clearTimeout(id)
    // toast is a new function each render; only the running flag should restart the timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])
  const run = () => setRunning(true)

  return (
    <div className={clsx('min-h-screen', menuOpen ? 'md:pl-[264px]' : 'md:pl-16')}>
      <EvalSidebar open={menuOpen} onToggle={() => setMenuOpen((o) => !o)} />
      {/* Top bar, as in prod: back, agent name, page name */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface px-4 md:px-6" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => toast('Back to the agent')} aria-label="Back to the agent" className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-subtle">
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-ink">{AGENT}</h1>
            <p className="text-xs text-ink-3">Evaluate</p>
          </div>
        </div>
        <Button size="sm" onClick={() => toast('Resets the test data')}>Reset data</Button>
      </header>
      {/* Tabs in the order a user works through them */}
      <div className="sticky top-16 z-10 border-b border-line bg-surface px-4 md:px-6">
        <div className="-mb-px flex gap-1 overflow-x-auto pt-6" role="tablist" aria-label="Evaluate steps">
          {TABS.map((x) => (
            <button
              key={x}
              role="tab"
              aria-selected={tab === x}
              onClick={() => setTab(x)}
              className={clsx('border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap transition-colors', tab === x ? 'border-brand-600 font-semibold text-brand-600' : 'border-transparent font-normal text-ink-3 hover:text-ink')}
            >
              {x}
            </button>
          ))}
        </div>
      </div>
      <main className="px-4 pt-6 pb-24 md:px-6">
        {tab === 'Objectives' && <ObjectivesTab />}
        {tab === 'Customer profiles' && <ProfilesTab />}
        {tab === 'Scenarios' && <ScenariosTab />}
        {tab === 'Simulations' && <SimulationsTab running={running} tested={tested} changed={changed} onRun={run} />}
        {tab === 'Analysis' && <AnalysisTab />}
        {tab === 'Evaluators' && <EvaluatorsTab />}
      </main>
      <Toast />
    </div>
  )
}

export default function EvalApp() {
  return (
    <AppState>
      <Tooltip.Provider>
        <Page />
      </Tooltip.Provider>
    </AppState>
  )
}
