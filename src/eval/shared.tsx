import { useEffect } from 'react'
import { LayoutGrid, List, Search } from 'lucide-react'
import { Tip, clsx } from '../components/ui'

/*
 * Pieces every Evaluate list uses, so the five tabs look and behave the same.
 * Rule from the simplified flow: Tars adds things on its own and marks them "New".
 * Only goals (they decide the score) and checks (they run on real chats) wait for the user.
 */

// Fields show focus with their own purple border; this stops the site-wide focus outline drawing a second stroke
export const NO_RING = { outline: 'none' }
export const field = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none'
export const iconBtn = 'grid size-8 place-items-center rounded-lg text-ink-3'
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Small purple "New" chip: Tars added this since you last looked. Goes away once you open it. */
export function NewChip() {
  return <span className="ml-2 inline-flex shrink-0 rounded-full bg-brand-100 px-1.5 py-px align-middle text-2xs font-semibold text-brand-700">New</span>
}

/** Tab intro: one line of what this step is, an optional second line, and the actions on the right. */
export function Intro({ text, sub, actions }: { text: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-[640px]">
        <p className="text-sm text-ink-2">{text}</p>
        {sub && <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-3 tnum">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SearchBox({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line px-3 py-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
      <Search className="size-4 text-ink-3" />
      <input style={NO_RING} id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none" />
    </label>
  )
}

/** Segmented filter with counts (light purple track, white selected pill). */
export function Filters<T extends string>({ label, items, value, onChange, count }: { label: string; items: readonly T[]; value: T; onChange: (v: T) => void; count: (v: T) => number }) {
  return (
    <div className="flex rounded-lg bg-brand-50 p-1 text-sm" role="tablist" aria-label={label}>
      {items.map((f) => (
        <button key={f} role="tab" aria-selected={value === f} onClick={() => onChange(f)} className={clsx('rounded-md px-3 py-1.5 whitespace-nowrap transition-colors', value === f ? 'bg-surface font-medium text-brand-700 shadow-xs' : 'text-ink-2 hover:text-ink')}>
          {f} <span className={clsx('tnum', value === f ? 'text-brand-600' : 'text-ink-3')}>{count(f)}</span>
        </button>
      ))}
    </div>
  )
}

export type Layout = 'Table' | 'Cards'
export function LayoutToggle({ value, onChange }: { value: Layout; onChange: (v: Layout) => void }) {
  return (
    <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Layout">
      {([['Table', List], ['Cards', LayoutGrid]] as const).map(([k, Icon]) => (
        <Tip key={k} content={k}>
          <button onClick={() => onChange(k)} aria-label={`${k} layout`} aria-pressed={value === k} className={clsx('grid size-7 place-items-center rounded-md', value === k ? 'bg-brand-50 text-brand-700' : 'text-ink-3 hover:text-ink')}>
            <Icon className="size-4" />
          </button>
        </Tip>
      ))}
    </div>
  )
}

/** Skeleton rows while Tars is generating, with one line saying what it's doing. */
export function Generating({ text, widths = [66, 52, 58] }: { text: string; widths?: number[] }) {
  return (
    <div className="border-b border-line">
      <div className="flex items-center gap-2 bg-subtle/60 px-4 py-2 text-xs font-semibold text-ink-2">
        <span className="size-3.5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" /> {text}
      </div>
      <ul aria-hidden>
        {widths.map((w) => (
          <li key={w} className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-0">
            <span className="size-4 rounded bg-n-100" />
            <span className="h-3 animate-pulse rounded bg-n-100" style={{ width: `${w}%` }} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Tells the tab bar how many things wait in this tab (the purple count next to its name). */
export function useBadge(n: number, onBadge?: (n: number) => void) {
  useEffect(() => { onBadge?.(n) }, [n, onBadge])
}

/** A real or simulated chat, with the part that went wrong highlighted. */
export type ChatMsg = { from: 'customer' | 'ai' | 'click'; text: string; mark?: string }
export function Chat({ msgs, who = 'Simulated customer' }: { msgs: ChatMsg[]; who?: string }) {
  const marked = (m: ChatMsg) => {
    const at = m.mark ? m.text.indexOf(m.mark) : -1
    if (at < 0) return m.text
    return <>{m.text.slice(0, at)}<mark className="rounded-sm bg-warning-600/20 px-0.5 text-ink">{m.mark}</mark>{m.text.slice(at + m.mark!.length)}</>
  }
  return (
    <div className="space-y-2 rounded-lg bg-subtle p-3">
      {msgs.map((m, i) => (
        <div key={i} className={clsx('flex', m.from === 'ai' ? 'justify-start' : 'justify-end')}>
          <div className={clsx('max-w-[85%] rounded-lg px-3 py-2 text-sm', m.from === 'ai' ? 'rounded-tl-sm border border-line bg-surface text-ink-2' : 'rounded-tr-sm bg-brand-50 text-ink')}>
            <span className="mb-0.5 block text-2xs text-ink-3">{m.from === 'ai' ? 'Agent' : who}</span>
            {marked(m)}
          </div>
        </div>
      ))}
    </div>
  )
}
