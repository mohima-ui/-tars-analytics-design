import { useEffect, useRef, useState } from 'react'
import { Tooltip } from 'radix-ui'
import { CheckCircle2 } from 'lucide-react'
import { AppState, useApp } from './state'
import { clsx } from './components/ui'
import { Sidebar } from './sections/Header'
import { Dashboard } from './Dashboard'

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
  return <div className={clsx('flex min-h-0 flex-1 flex-col transition-opacity', busy && 'opacity-50')}>{children}</div>
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
    <div className={collapsed ? 'transition-[padding] duration-200 md:pl-16' : 'transition-[padding] duration-200 md:pl-[208px]'}>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      {/* One screen: the page never scrolls on desktop; long tables scroll inside their panel. */}
      <main className="flex min-h-screen flex-col px-4 py-4 md:px-6 xl:h-dvh xl:min-h-[680px]">
        <Refetch>
          <Dashboard />
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
