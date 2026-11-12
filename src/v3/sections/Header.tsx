import { useEffect, useState } from 'react'
import {
  BarChart3, Bot, BookOpen, CalendarDays, Check, ChevronDown, Download, FlaskConical, Mail, Megaphone,
  MessagesSquare, Settings2, Users, Wrench, FileText, Sheet as SheetIcon, Link2, PanelLeft, ChevronsUpDown,
} from 'lucide-react'
import { PERIODS, type Period } from '../data'
import { useApp } from '../state'
import {
  Button, clsx, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Modal, Pop, PopClose, PopContent,
  PopTrigger, Segmented, Tip,
} from '../components/ui'

function TarsLogo() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-600">
      <svg viewBox="0 0 20 20" className="size-[18px]" aria-hidden>
        <rect x="4" y="4.5" width="12" height="2.4" rx="1.2" fill="white" />
        <rect x="4" y="8.8" width="8" height="2.4" rx="1.2" fill="white" />
        <rect x="13" y="8.8" width="3" height="2.4" rx="1.2" fill="#4ade80" />
        <rect x="4" y="13.1" width="10" height="2.4" rx="1.2" fill="white" />
      </svg>
    </span>
  )
}

const NAV = [
  {
    group: 'Engagement',
    items: [
      { icon: MessagesSquare, label: 'Conversations' },
      { icon: Megaphone, label: 'Campaigns' },
      { icon: Users, label: 'Users' },
    ],
  },
  {
    group: 'AI resources',
    items: [
      { icon: Bot, label: 'AI Agents' },
      { icon: BookOpen, label: 'Knowledge' },
      { icon: Wrench, label: 'Tools' },
    ],
  },
  {
    group: 'Insights',
    items: [{ icon: BarChart3, label: 'Analytics', active: true }],
  },
]

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <nav
      aria-label="Main"
      className={clsx(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-surface transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-[208px]',
      )}
    >
      {/* Org switcher */}
      <div className="border-b border-line px-2 py-4">
        <button
          className={clsx(
            'flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-muted',
            collapsed && 'justify-center',
          )}
          aria-label="Switch organization"
        >
          <TarsLogo />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">Mohima’s Organization</span>
              <ChevronsUpDown className="size-4 shrink-0 text-ink-3" />
            </>
          )}
        </button>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {NAV.map((g, gi) => (
          <div key={g.group} className={clsx(gi > 0 && 'mt-2 border-t border-line pt-2')}>
            {!collapsed && (
              <div className="px-2 pt-3 pb-1.5 text-2xs font-semibold tracking-wide text-ink-3 uppercase">{g.group}</div>
            )}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const link = (
                  <a
                    href="#"
                    aria-label={collapsed ? it.label : undefined}
                    aria-current={'active' in it && it.active ? 'page' : undefined}
                    className={clsx(
                      'flex h-8 items-center gap-2.5 rounded-md py-1.5 text-sm transition-colors',
                      collapsed ? 'justify-center' : 'px-2',
                      'active' in it && it.active
                        ? 'bg-brand-100 font-medium text-brand-600'
                        : 'text-ink-2 hover:bg-muted hover:text-ink',
                    )}
                  >
                    <it.icon className="size-[18px] shrink-0" />
                    {!collapsed && it.label}
                  </a>
                )
                return (
                  <li key={it.label}>
                    {collapsed ? (
                      <Tip content={it.label} side="right">
                        {link}
                      </Tip>
                    ) : (
                      link
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Account + collapse */}
      <div className={clsx('flex items-center border-t border-line px-3 py-3', collapsed ? 'flex-col gap-3' : 'justify-between')}>
        <button className="grid size-9 place-items-center rounded-lg bg-[#3b8f9b] text-sm font-semibold text-white" aria-label="Account">
          M
        </button>
        <Tip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
          <button
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-muted hover:text-ink"
          >
            <PanelLeft className="size-[18px]" />
          </button>
        </Tip>
      </div>
    </nav>
  )
}

export const SECTIONS = [
  { id: 'summary', label: 'Summary' },
  { id: 'topics', label: 'Topics' },
  { id: 'funnel', label: 'Funnel' },
  { id: 'trends', label: 'Trends' },
  { id: 'quality', label: 'AI performance' },
  { id: 'traffic', label: 'Traffic' },
  { id: 'data-capture', label: 'Data captured' },
]

function useScrollSpy() {
  const [active, setActive] = useState('summary')
  useEffect(() => {
    const onScroll = () => {
      let cur = SECTIONS[0].id
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top < 260) cur = s.id
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = SECTIONS[SECTIONS.length - 1].id
      setActive(cur)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return active
}

export function DateRangePicker({ className }: { className?: string } = {}) {
  const { period, setPeriod } = useApp()
  return (
    <Pop>
      <PopTrigger asChild>
        <Button aria-label="Date range" className={className}>
          <CalendarDays className="size-4 text-ink-3" />
          {PERIODS[period].label}
          <ChevronDown className="size-4 text-ink-3" />
        </Button>
      </PopTrigger>
      <PopContent className="w-64">
        {(Object.keys(PERIODS) as Period[]).map((p) => (
          <PopClose asChild key={p}>
            <button
              onClick={() => setPeriod(p)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="w-4">{period === p && <Check className="size-4 stroke-[3] text-brand-600" />}</span>
              <span className="flex-1">{PERIODS[p].label}</span>
              <span className="text-xs text-ink-3">{PERIODS[p].range.replace(', 2026', '')}</span>
            </button>
          </PopClose>
        ))}
        <div className="my-1 h-px bg-line" />
        <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted">
          <span className="w-4" />
          Custom range…
        </button>
      </PopContent>
    </Pop>
  )
}

function SelectMenu({ value, options, onChange, label, icon: Icon }: { value: string; options: string[]; onChange: (v: string) => void; label: string; icon?: typeof Bot }) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button aria-label={label}>
          {Icon && <Icon className="size-4 text-ink-3" />}
          {value}
          <ChevronDown className="size-4 text-ink-3" />
        </Button>
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

export function ScheduleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useApp()
  const [freq, setFreq] = useState<'weekly' | 'monthly'>('weekly')
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Email this report"
      description="Send a summary of this page to your team on a schedule. It uses the filters you have selected."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              onOpenChange(false)
              toast(`Report scheduled ${freq === 'weekly' ? 'every Monday at 9:00 am' : 'on the 1st of each month'}`)
            }}
          >
            Schedule report
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink">Send to</span>
          <input
            defaultValue="mohima@hellotars.com, vinit@hellotars.com"
            className="mt-1.5 h-9 w-full rounded-lg border border-line-strong px-3 text-sm outline-none focus:border-brand-600 focus:shadow-[0_0_0_3px_#632e9a38]"
          />
        </label>
        <div>
          <span className="text-sm font-medium text-ink">How often</span>
          <div className="mt-1.5">
            <Segmented
              label="Frequency"
              value={freq}
              onChange={setFreq}
              options={[
                { value: 'weekly', label: 'Weekly, Mondays' },
                { value: 'monthly', label: 'Monthly, on the 1st' },
              ]}
            />
          </div>
        </div>
        <div className="rounded-lg bg-subtle p-3 text-sm text-ink-2">
          Includes: summary numbers, top insights, topics and the funnel. Recipients without a TARS login get a PDF.
        </div>
      </div>
    </Modal>
  )
}

export function PageHeader() {
  const { period, bot, setBot, channel, setChannel, mode, setMode, toast } = useApp()
  const active = useScrollSpy()
  const [scheduleOpen, setScheduleOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-3">
            <span className="font-medium text-ink-2">{PERIODS[period].range}</span> · compared with {PERIODS[period].compare}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setScheduleOpen(true)}>
            <Mail className="size-4" /> Email report
          </Button>
          <Menu>
            <MenuTrigger asChild>
              <Button>
                <Download className="size-4" /> Export <ChevronDown className="size-4 text-ink-3" />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => toast('Preparing PDF of this page…')}>
                <FileText className="size-4 text-ink-3" /> Download PDF
              </MenuItem>
              <MenuItem onSelect={() => toast('Downloading CSV (all sections)…')}>
                <SheetIcon className="size-4 text-ink-3" /> Download CSV
              </MenuItem>
              <MenuSeparator />
              <MenuItem onSelect={() => toast('Link copied. It keeps your current filters.')}>
                <Link2 className="size-4 text-ink-3" /> Copy link to this view
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>

      {/* Sticky filter row + section nav: one row of filters scopes everything below */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-line bg-canvas px-4 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-2 py-3">
          <DateRangePicker />
          <SelectMenu label="Chatbot" icon={Bot} value={bot} options={['Brightline Prod', 'Brightline Staging', 'All chatbots']} onChange={setBot} />
          <SelectMenu label="Channel" value={channel} options={['All channels', 'Web', 'WhatsApp']} onChange={setChannel} />
          <div className="ml-auto flex items-center gap-2">
            <Segmented
              label="Data source"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'live', label: <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-success-600" />Live</span> },
                { value: 'test', label: <span className="inline-flex items-center gap-1.5"><FlaskConical className="size-3.5" />Test</span> },
              ]}
            />
            <Tip content="Customize this page: add, hide or reorder charts">
              <Button variant="ghost" className="size-9 px-0" aria-label="Customize page">
                <Settings2 className="size-4" />
              </Button>
            </Tip>
          </div>
        </div>
        <div className="-mb-px flex gap-1 overflow-x-auto" role="tablist" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              role="tab"
              aria-selected={active === s.id}
              className={clsx(
                'border-b-2 px-3 pb-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                active === s.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-3 hover:text-ink',
              )}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {mode === 'test' && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-warning-600/30 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          <FlaskConical className="size-4 shrink-0" />
          <span>
            <b className="font-semibold">You’re viewing Test data.</b> These are conversations from the test runner and preview links. They don’t count
            toward your Live numbers.
          </span>
          <Button size="sm" className="ml-auto" onClick={() => setMode('live')}>
            Switch to Live
          </Button>
        </div>
      )}

      <ScheduleDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </>
  )
}
