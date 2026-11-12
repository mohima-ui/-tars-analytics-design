import { createContext, useContext, useState, type ReactNode } from 'react'
import { PERIODS, type Period } from './data'

export type TopicsState = 'ready' | 'classifying' | 'partial' | 'lowData' | 'upgrade'
export type Role = 'admin' | 'member'

type Ctx = {
  period: Period
  setPeriod: (p: Period) => void
  bot: string
  setBot: (b: string) => void
  channel: string
  setChannel: (c: string) => void
  mode: 'live' | 'test'
  setMode: (m: 'live' | 'test') => void
  role: Role
  setRole: (r: Role) => void
  topicsState: TopicsState
  setTopicsState: (s: TopicsState) => void
  scale: number
  s: (n: number) => number
  toast: (msg: string) => void
  toastMsg: string | null
  openTopic: string | null
  setOpenTopic: (id: string | null) => void
}

const C = createContext<Ctx | null>(null)

export function AppState({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<Period>('28d')
  const [bot, setBot] = useState('Brightline Prod')
  const [channel, setChannel] = useState('All channels')
  const [mode, setMode] = useState<'live' | 'test'>('live')
  const [role, setRole] = useState<Role>('admin')
  const [topicsState, setTopicsState] = useState<TopicsState>('ready')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [openTopic, setOpenTopic] = useState<string | null>(null)

  const channelScale = channel === 'All channels' ? 1 : channel === 'Web' ? 0.86 : 0.14
  const scale = PERIODS[period].scale * channelScale * (mode === 'test' ? 0.08 : 1)
  const s = (n: number) => Math.max(0, Math.round(n * scale))
  const toast = (msg: string) => {
    setToastMsg(msg)
    window.setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 3200)
  }

  return (
    <C.Provider
      value={{ period, setPeriod, bot, setBot, channel, setChannel, mode, setMode, role, setRole, topicsState, setTopicsState, scale, s, toast, toastMsg, openTopic, setOpenTopic }}
    >
      {children}
    </C.Provider>
  )
}

export function useApp() {
  const c = useContext(C)
  if (!c) throw new Error('useApp outside AppState')
  return c
}
