import { useCallback, useEffect, useMemo, useState } from 'react'
import { Tooltip } from 'radix-ui'
import {
  Activity, AlertTriangle, ArrowLeft, BarChart3, BookOpen, Bot, CheckCircle2, ChevronDown, ChevronLeft, FlaskConical, Info, LayoutGrid,
  Megaphone, MessagesSquare, Palette, PanelLeft, Play, RotateCcw, Settings, Share2, Users, Wrench,
} from 'lucide-react'
import { AppState, useApp } from '../state'
import { Button, Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger, Tip, clsx } from '../components/ui'
import { GoalsTab } from './Goals'
import { ProfilesTab } from './Profiles'
import { TestCasesTab } from './TestCases'
import { ResultsTab } from './Results'
import { ChecksTab } from './Checks'
import { AGENT, GOALS, MUST_PASS, RUN, TESTED, type Check } from './data'
import { EvalBus, type RunScope } from './ctx'
import { Setup } from './Setup'

/*
 * Evaluate = test the agent before it goes live. Simplified from six tabs to five, in the order people work:
 *   Goals → Customers → Scenarios → Results → Checks
 * Three rules behind it (from the Nov 2 call with Ankit):
 *   1. Real chats live in Analytics; test chats live here. (Labelling real chats and problems moved to Analytics.)
 *   2. Tars does the work, the user checks it: new customers and scenarios are used right away, marked "New".
 *   3. Ask only when the answer changes something: goals (they set the score) and checks (they run on real chats).
 * The readiness answer sits above every tab, so nobody has to hunt for "is it ready?".
 * The previous version is kept at /eval-before for comparison.
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

/* ---------------- The answer: is it ready to go live? ---------------- */
const SCORE = Math.round((RUN.passed / RUN.cases) * 100)
const BLOCKING = GOALS.filter((g) => MUST_PASS.includes(g.id) && g.passed < g.total)
/** Rule to confirm with Ankit: any failing must-pass goal means "not ready", whatever the score. */
function readiness() {
  if (BLOCKING.length) return { label: 'Not ready to go live yet', tone: 'danger' as const }
  if (SCORE >= 90) return { label: 'Ready to go live', tone: 'success' as const }
  return { label: 'Almost ready to go live', tone: 'warning' as const }
}
const TONE = {
  danger: { ring: 'var(--color-danger-600)', text: 'text-danger-700' },
  warning: { ring: 'var(--color-warning-600)', text: 'text-warning-700' },
  success: { ring: 'var(--color-success-600)', text: 'text-success-700' },
}

function Ring({ value, color }: { value: number; color: string }) {
  const r = 22, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 56 56" className="size-14 shrink-0 -rotate-90" aria-hidden>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-n-100)" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />
    </svg>
  )
}

/** Run test, with a menu for a faster run: only what failed, or only what's new. */
function RunButton({ running, label, onRun, hasRun }: { running: boolean; label: string; onRun: (s: RunScope) => void; hasRun: boolean }) {
  return (
    <span className="inline-flex">
      <Button size="sm" variant="primary" className={clsx(hasRun && 'rounded-r-none')} onClick={() => onRun('all')} disabled={running}><Play className="size-3.5" /> {running ? 'Testing…' : label}</Button>
      {hasRun && (
        <Menu>
          <MenuTrigger asChild>
            <Button size="sm" variant="primary" disabled={running} aria-label="More ways to run" className="rounded-l-none border-l border-white/25 px-2"><ChevronDown className="size-3.5" /></Button>
          </MenuTrigger>
          <MenuContent>
            <MenuLabel>What to test</MenuLabel>
            <MenuItem onSelect={() => onRun('all')}>All scenarios <span className="ml-auto pl-4 text-ink-3 tnum">{RUN_SIZE.all}</span></MenuItem>
            <MenuItem onSelect={() => onRun('failed')}>Only the ones that failed <span className="ml-auto pl-4 text-ink-3 tnum">{RUN_SIZE.failed}</span></MenuItem>
            <MenuItem onSelect={() => onRun('new')}>Only new ones <span className="ml-auto pl-4 text-ink-3 tnum">{RUN_SIZE.new}</span></MenuItem>
          </MenuContent>
        </Menu>
      )}
    </span>
  )
}
const RUN_SIZE: Record<RunScope, number> = { all: 52, failed: RUN.cases - RUN.passed, new: 2 }

function ReadyBar({ running, runN, hasRun, tested, changed, onRun }: { running: boolean; runN: number; hasRun: boolean; tested: string; changed: boolean; onRun: (s: RunScope) => void }) {
  const r = readiness()
  const [done, setDone] = useState(0)
  // While testing, count up through the scenarios so the wait feels alive
  useEffect(() => {
    if (!running) { setDone(0); return }
    const id = setInterval(() => setDone((d) => Math.min(runN, d + Math.max(1, Math.round(runN / 16)))), 220)
    return () => clearInterval(id)
  }, [running, runN])
  return (
    <section aria-label="Is the agent ready to go live?" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-xs">
      {running ? (
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center"><span className="size-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink">Testing your agent…</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="block h-1.5 max-w-[320px] flex-1 overflow-hidden rounded-full bg-n-100"><span className="block h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(done / runN) * 100}%` }} /></span>
              <span className="text-xs text-ink-3 tnum">{done} of {runN} {runN === 1 ? 'scenario' : 'scenarios'}</span>
            </div>
          </div>
        </div>
      ) : !hasRun ? (
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="relative grid place-items-center"><Ring value={0} color="var(--color-n-200)" /><span className="absolute text-sm font-semibold text-ink-3">–</span></span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink">Not tested yet</p>
            <p className="mt-0.5 text-sm text-ink-2">Run your first test to find out if the agent is ready to go live.</p>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="relative grid place-items-center">
            <Ring value={SCORE} color={TONE[r.tone].ring} />
            <span className="absolute text-sm font-semibold text-ink tnum">{SCORE}%</span>
          </span>
          <div className="min-w-0">
            <p className={clsx('flex items-center gap-1.5 text-base font-semibold', TONE[r.tone].text)}>
              {r.label}
              <Tip content={<span className="block max-w-[260px]">The score is the share of scenarios that passed. If any must-pass objective fails, the agent isn’t ready, whatever the score.</span>}>
                <button aria-label="How this is worked out" className="text-ink-3 hover:text-ink"><Info className="size-3.5" /></button>
              </Tip>
            </p>
            <p className="mt-0.5 text-sm text-ink-2 tnum">
              <b className="font-medium text-ink">{RUN.passed} of {RUN.cases}</b> scenarios passed
              <span className="text-ink-3"> · Tested {tested}</span>
            </p>
            {changed && (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-warning-700"><AlertTriangle className="size-3.5" /> You changed the agent after this test, so results may be out of date</p>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <RunButton running={running} hasRun={hasRun} onRun={onRun} label={!hasRun ? 'Run first test' : changed ? 'Test again' : 'Run test'} />
      </div>
    </section>
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
const TABS = ['Objectives', 'Customer profiles', 'Scenarios', 'Results', 'Checks'] as const
type Tab = (typeof TABS)[number]
// What the count next to each tab means, for the tooltip
const BADGE_TIP: Record<Tab, (n: number) => string> = {
  Objectives: (n) => `${n} ${n === 1 ? 'objective' : 'objectives'} to review`,
  'Customer profiles': (n) => `${n} new since you last looked`,
  'Scenarios': (n) => `${n} new since the last run`,
  Results: (n) => `${n} failed test ${n === 1 ? 'chat' : 'chats'} to check`,
  Checks: (n) => `${n} ${n === 1 ? 'draft' : 'drafts'} waiting for you`,
}

function Page() {
  const { toast } = useApp()
  const [menuOpen, setMenuOpen] = useState(true)
  const [tab, setTab] = useState<Tab>('Objectives')
  const [running, setRunning] = useState(false)
  const [tested, setTested] = useState(TESTED)
  const [changed, setChanged] = useState(true) // prod shows "config drifted" on the last suite
  // Demo opens on an agent that's been tested before (and changed since). First-time setup is behind the ↺ button.
  const [setup, setSetup] = useState(false)
  const [hasRun, setHasRun] = useState(true)
  const [first, setFirst] = useState(false) // the run that just finished was the first one
  const [runN, setRunN] = useState(RUN_SIZE.all)
  const [incoming, setIncoming] = useState<Check[]>([])
  const [badges, setBadges] = useState<Partial<Record<Tab, number>>>({})
  const badge = useCallback((t: Tab) => (n: number) => setBadges((b) => (b[t] === n ? b : { ...b, [t]: n })), [])
  // Stable callbacks per tab, so each tab's effect only fires when its count changes
  const [onBadge] = useState(() => Object.fromEntries(TABS.map((t) => [t, badge(t)])) as Record<Tab, (n: number) => void>)

  // Prototype: a test run takes ~4 seconds, then the result is fresh
  useEffect(() => {
    if (!running) return
    const id = setTimeout(() => {
      setRunning(false); setTested('just now'); setChanged(false)
      if (!hasRun) { setFirst(true); setHasRun(true) } else setFirst(false)
      toast('Test finished. Results are up to date.')
    }, 4000)
    return () => clearTimeout(id)
    // toast is a new function each render; only the running flag should restart the timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])
  const run = useCallback((scope: RunScope) => { setRunN(hasRun ? RUN_SIZE[scope] : RUN.cases); setRunning(true); setTab('Results') }, [hasRun])
  const bus = useMemo(() => ({ hasRun, goTo: setTab, run, incoming, addCheck: (c: Check) => setIncoming((l) => (l.some((x) => x.id === c.id) ? l : [...l, c])) }), [hasRun, run, incoming])

  return (
    <div className={clsx('min-h-screen', menuOpen ? 'md:pl-[264px]' : 'md:pl-16')}>
      <EvalSidebar open={menuOpen} onToggle={() => setMenuOpen((o) => !o)} />
      {/* Top bar, as in prod: back, agent name, page name */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas px-4 md:px-6" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => toast('Back to the agent')} aria-label="Back to the agent" className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-subtle">
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-ink">{AGENT}</h1>
            <p className="flex items-center gap-1 text-xs text-ink-3">
              Evaluate · test before going live
              <Tip content={<span className="block max-w-[280px]">Evaluate tests your agent with simulated customers before it goes live. How it’s doing with real customers is in Analytics.</span>}>
                <button aria-label="About Evaluate" className="hover:text-ink"><Info className="size-3" /></button>
              </Tip>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Tip content="Demo: show first-time setup"><Button size="sm" variant="ghost" aria-label="Show first-time setup" onClick={() => { setSetup(true); setHasRun(false); setChanged(false); setFirst(false); setTab('Objectives') }}><RotateCcw className="size-4" /></Button></Tip>
        </div>
      </header>

      {setup && (
        <main className="px-4 pb-24 md:px-6">
          <Setup
            onDone={(next) => { setSetup(false); if (next === 'run') run('all'); else setTab('Objectives') }}
            onSkip={() => { setSetup(false); setHasRun(true); setChanged(true) }}
          />
        </main>
      )}
      <EvalBus.Provider value={bus}>
      <div hidden={setup}>
      <div className="px-4 pt-5 md:px-6">
        <ReadyBar running={running} runN={runN} hasRun={hasRun} tested={tested} changed={changed} onRun={run} />
      </div>

      {/* Tabs in the order a user works through them; the count says where something waits */}
      <div className="sticky top-16 z-10 border-b border-line bg-canvas px-4 md:px-6">
        <div className="-mb-px flex gap-1 overflow-x-auto pt-4" role="tablist" aria-label="Evaluate steps">
          {TABS.map((x) => {
            const n = badges[x] ?? 0
            return (
              <button
                key={x}
                role="tab"
                id={`tab-${x}`}
                aria-selected={tab === x}
                aria-controls={`panel-${x}`}
                onClick={() => setTab(x)}
                className={clsx('flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap transition-colors', tab === x ? 'border-brand-600 font-semibold text-brand-600' : 'border-transparent font-normal text-ink-3 hover:text-ink')}
              >
                {x}
                {n > 0 && (
                  <Tip content={BADGE_TIP[x](n)}>
                    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-100 px-1 text-2xs font-semibold text-brand-700 tnum">{n}</span>
                  </Tip>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Every tab stays mounted (hidden when not shown), so work isn't lost when switching tabs */}
      <main className="px-4 pt-6 pb-24 md:px-6">
        <div role="tabpanel" id="panel-Objectives" aria-labelledby="tab-Objectives" hidden={tab !== 'Objectives'}><GoalsTab onBadge={onBadge.Objectives} /></div>
        <div role="tabpanel" id="panel-Customer profiles" aria-labelledby="tab-Customer profiles" hidden={tab !== 'Customer profiles'}><ProfilesTab onBadge={onBadge['Customer profiles']} /></div>
        <div role="tabpanel" id="panel-Scenarios" aria-labelledby="tab-Scenarios" hidden={tab !== 'Scenarios'}><TestCasesTab onBadge={onBadge['Scenarios']} /></div>
        <div role="tabpanel" id="panel-Results" aria-labelledby="tab-Results" hidden={tab !== 'Results'}><ResultsTab running={running} onRun={() => run('all')} onBadge={onBadge.Results} first={first} /></div>
        <div role="tabpanel" id="panel-Checks" aria-labelledby="tab-Checks" hidden={tab !== 'Checks'}><ChecksTab onBadge={onBadge.Checks} /></div>
      </main>
      </div>
      </EvalBus.Provider>
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
