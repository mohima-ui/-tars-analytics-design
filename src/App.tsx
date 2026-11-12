import { useEffect, useRef, useState } from 'react'
import { Tooltip } from 'radix-ui'
import { CheckCircle2, Plus, Settings2 } from 'lucide-react'
import { AppState, useApp } from './state'
import { PageHeader, Sidebar } from './sections/Header'
import { Insights, KpiRow } from './sections/Summary'
import { TopicsSection } from './sections/Topics'
import { FunnelSection } from './sections/Funnel'
import { CountriesCard, PickupCard, QualitySection, SetupCard, TrafficSection, TrendsSection } from './sections/Rest'
import { Button, SectionHeading } from './components/ui'

function Toast() {
  const { toastMsg } = useApp()
  if (!toastMsg) return null
  return (
    <div role="status" className="anim-fade fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-lg bg-n-900 px-4 py-3 text-sm text-white shadow-xl">
      <CheckCircle2 className="size-4 text-success-600" /> {toastMsg}
    </div>
  )
}

/** Holds the previous render at reduced opacity briefly when filters change (no skeleton flash). */
function Refetch({ children }: { children: React.ReactNode }) {
  const { period, bot, channel, mode } = useApp()
  const [busy, setBusy] = useState(false)
  const key = `${period}|${bot}|${channel}|${mode}`
  const last = useRef(key)
  useEffect(() => {
    if (last.current === key) return
    last.current = key
    setBusy(true)
    const t = setTimeout(() => setBusy(false), 350)
    return () => clearTimeout(t)
  }, [key])
  return <div className={busy ? 'opacity-50 transition-opacity' : 'transition-opacity'}>{children}</div>
}

function EditSummaryButton() {
  const { toast } = useApp()
  return (
    <Button size="sm" onClick={() => toast('Opens summary settings')}>
      <Settings2 className="size-4" /> Edit summary
    </Button>
  )
}

function AddCardButton({ group }: { group: string }) {
  const { toast } = useApp()
  return (
    <Button size="sm" onClick={() => toast(`Opens the card picker for ${group}`)}>
      <Plus className="size-4" /> Add a card
    </Button>
  )
}

function Page() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === '1'
    } catch {
      return false
    }
  })
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem('sidebar-collapsed', c ? '0' : '1')
      } catch {
        /* storage unavailable */
      }
      return !c
    })
  return (
    <div className={collapsed ? 'min-h-screen transition-[padding] duration-200 md:pl-16' : 'min-h-screen transition-[padding] duration-200 md:pl-[208px]'}>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      {/* Collapsing the sidebar frees 144px (208 → 64); give it to the content instead of more empty margin. */}
      <main className={collapsed ? 'mx-auto max-w-[1384px] px-4 pb-24 md:px-8' : 'mx-auto max-w-[1240px] px-4 pb-24 md:px-8'}>
        <PageHeader />
        <Refetch>
          <div id="summary" className="mt-6 space-y-4">
            <SectionHeading id="summary-h" title="Summary" description="Your main numbers for this period, and what changed." actions={<div className="flex items-center gap-2"><EditSummaryButton /><AddCardButton group="Summary" /></div>} />
            <KpiRow />
            <Insights />
          </div>

          {/* Grouped by the question each part answers. Not-set-up reports sit in the group they belong to. */}
          <div className="mt-6 space-y-4">
            <SectionHeading id="performance-h" title="Overall performance" description="Where people drop off, and how it changes over time." actions={<AddCardButton group="Overall performance" />} />
            {/* Funnel is vertical now, so it fits beside Trends. */}
            <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,60fr)_minmax(0,40fr)]">
              <FunnelSection />
              <TrendsSection tall />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <TopicsSection />
          </div>

          <div className="mt-6 space-y-4">
            <SectionHeading id="traffic-h" title="Traffic" description="Where people come from, and when they’re active." actions={<AddCardButton group="Traffic" />} />
            <TrafficSection aside={<CountriesCard />} />
          </div>

          <div className="mt-6 space-y-4">
            <SectionHeading id="ai-h" title="AI performance" description="How fast the AI replies, and how often a human agent steps in." actions={<AddCardButton group="AI performance" />} />
            <QualitySection />
            <div className="grid gap-4 md:grid-cols-2">
              <PickupCard />
              <SetupCard kind="csat" />
            </div>
          </div>
        </Refetch>
      </main>
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <AppState>
      <Tooltip.Provider>
        <Page />
      </Tooltip.Provider>
    </AppState>
  )
}
