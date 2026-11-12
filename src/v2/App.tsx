import { useEffect, useRef, useState } from 'react'
import { Tooltip } from 'radix-ui'
import { CheckCircle2 } from 'lucide-react'
import { AppState, useApp } from './state'
import { Sidebar } from './sections/Header'
import { Overview } from './Overview'

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
      <main className="mx-auto max-w-[1240px] px-4 pt-8 pb-24 md:px-8">
        <Refetch>
          <Overview />
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
