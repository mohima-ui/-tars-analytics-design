import { useId, useMemo, useState } from 'react'
import { clsx, Tip } from './ui'
import type { Week } from '../data'
import { fmt } from '../data'

/* ---------- Sparkline ---------- */
export function Sparkline({ data, width = 120, height = 32, color = 'var(--color-brand-600)', label }: { data: number[]; width?: number; height?: number; color?: string; label: string }) {
  const id = useId()
  const max = Math.max(...data, 1)
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => [i * step, height - 4 - (v / max) * (height - 8)] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const last = pts[pts.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.14" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} stroke="white" strokeWidth="2" />
    </svg>
  )
}

/* ---------- Grouped column chart with hover ---------- */
type SeriesDef = { key: keyof Week; label: string; color: string }

export function ColumnChart({ data, series, height = 220 }: { data: Week[]; series: SeriesDef[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = useMemo(() => {
    const m = Math.max(...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)), 1)
    const mag = 10 ** Math.floor(Math.log10(m))
    const nice = [1, 2, 4, 5, 8, 10].find((k) => k * mag >= m) ?? 10
    return nice * mag
  }, [data, series])
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max]
  const barW = Math.min(24, 120 / series.length)

  return (
    <div className="relative">
      <div className="flex" style={{ height }}>
        {/* y axis */}
        <div className="relative w-10 shrink-0 text-right text-2xs text-ink-3 tnum">
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
              {t >= 1000 ? `${(t / 1000).toFixed(1)}K` : Math.round(t)}
            </span>
          ))}
        </div>
        {/* plot */}
        <div className="relative flex-1 border-b border-line-strong">
          {ticks.slice(1).map((t) => (
            <div key={t} className="absolute inset-x-0 h-px bg-grid" style={{ top: `${(1 - t / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex">
            {data.map((d, i) => (
              <div
                key={d.label}
                className={clsx('relative flex flex-1 items-end justify-center gap-0.5 rounded-t-md transition-colors', hover === i && 'bg-brand-50')}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${d.label}${d.partial ? ' (so far)' : ''}: ${series.map((s) => `${s.label} ${d[s.key]}`).join(', ')}`}
              >
                {d.marker && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 border-l border-warning-600">
                    <span className={clsx('absolute -top-0.5 rounded bg-warning-50 px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap text-warning-700', i > data.length / 2 ? 'right-1.5' : 'left-1.5')}>
                      {d.marker}
                    </span>
                  </div>
                )}
                {series.map((s) => {
                  const v = Number(d[s.key]) || 0
                  return (
                    <div
                      key={String(s.key)}
                      className={clsx('rounded-t-[4px]', d.partial && 'hatch')}
                      style={{
                        width: `min(${barW}px, ${80 / series.length}%)`,
                        height: `${(v / max) * 100}%`,
                        background: d.partial ? 'transparent' : s.color,
                        color: s.color,
                        boxShadow: d.partial ? `inset 0 0 0 1.5px ${s.color}` : undefined,
                        minHeight: v ? 2 : 0,
                      }}
                    />
                  )
                })}
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg bg-n-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg">
                    <div className="mb-1 text-n-300">
                      {d.label}
                      {d.partial && ' · so far'}
                    </div>
                    {series.map((s) => (
                      <div key={String(s.key)} className="flex items-center gap-2">
                        <span className="h-0.5 w-3 rounded" style={{ background: s.color === 'var(--color-viz-1)' ? '#c9a9ee' : '#7fb3f0' }} />
                        <span className="font-semibold tnum">{fmt(Number(d[s.key]))}</span>
                        <span className="text-n-300">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* x axis */}
      <div className="ml-10 flex pt-2">
        {data.map((d, i) => (
          <div key={d.label} className="min-w-0 flex-1 text-center text-xs whitespace-nowrap text-ink-3">
            {/* When there are many periods, label every other one (always the last) so labels don't overlap. */}
            {data.length <= 8 || (data.length - 1 - i) % 2 === 0 ? d.label : '\u00a0'}
            {d.partial && <span className="block text-2xs text-ink-3">so far</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Line chart with hover (same data and axes as ColumnChart) ---------- */
export function LineChart({ data, series, height = 220, area }: { data: Week[]; series: SeriesDef[]; height?: number; area?: boolean }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = useMemo(() => {
    const m = Math.max(...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)), 1)
    const mag = 10 ** Math.floor(Math.log10(m))
    const nice = [1, 2, 4, 5, 8, 10].find((k) => k * mag >= m) ?? 10
    return nice * mag
  }, [data, series])
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max]
  const n = data.length
  const x = (i: number) => ((i + 0.5) / n) * 100
  const y = (v: number) => (1 - v / max) * 100
  // The unfinished period is drawn dashed; everything before it is solid.
  const lastDone = data.findIndex((d) => d.partial)
  const solidEnd = lastDone === -1 ? n - 1 : lastDone - 1

  return (
    <div className="relative">
      <div className="flex" style={{ height }}>
        <div className="relative w-10 shrink-0 text-right text-2xs text-ink-3 tnum">
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
              {t >= 1000 ? `${(t / 1000).toFixed(1)}K` : Math.round(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1 border-b border-line-strong">
          {ticks.slice(1).map((t) => (
            <div key={t} className="absolute inset-x-0 h-px bg-grid" style={{ top: `${(1 - t / max) * 100}%` }} />
          ))}
          {hover !== null && <div className="pointer-events-none absolute inset-y-0 w-px bg-line-strong" style={{ left: `${x(hover)}%` }} />}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
            {series.map((s) => {
              const pts = data.map((d, i) => `${x(i)},${y(Number(d[s.key]) || 0)}`)
              const solid = pts.slice(0, solidEnd + 1)
              const dashed = solidEnd < n - 1 ? pts.slice(Math.max(0, solidEnd)) : []
              return (
                <g key={String(s.key)}>
                  {area && solid.length > 1 && (
                    <polygon points={`${x(0)},100 ${solid.join(' ')} ${x(solidEnd)},100`} fill={s.color} opacity="0.08" />
                  )}
                  {solid.length > 1 && (
                    <polyline points={solid.join(' ')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  )}
                  {dashed.length > 1 && (
                    <polyline points={dashed.join(' ')} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  )}
                </g>
              )
            })}
          </svg>
          {/* Dots as HTML so they stay round at any width */}
          {series.map((s) =>
            data.map((d, i) => (
              <span
                key={`${String(s.key)}-${i}`}
                className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                style={{ left: `${x(i)}%`, top: `${y(Number(d[s.key]) || 0)}%`, background: d.partial ? 'var(--color-surface)' : s.color, boxShadow: d.partial ? `inset 0 0 0 2px ${s.color}` : undefined, transform: `translate(-50%, -50%) scale(${hover === i ? 1.4 : 1})` }}
              />
            )),
          )}
          {/* Hover columns */}
          <div className="absolute inset-0 flex">
            {data.map((d, i) => (
              <div
                key={d.label}
                className="relative flex-1"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                style={{ outline: 'none' }}
                aria-label={`${d.label}${d.partial ? ' (so far)' : ''}: ${series.map((s) => `${s.label} ${d[s.key]}`).join(', ')}`}
              >
                {d.marker && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 border-l border-warning-600">
                    <span className={clsx('absolute -top-0.5 rounded bg-warning-50 px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap text-warning-700', i > data.length / 2 ? 'right-1.5' : 'left-1.5')}>
                      {d.marker}
                    </span>
                  </div>
                )}
                {hover === i && (
                  <div className="pointer-events-none absolute top-6 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-n-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg">
                    <div className="mb-1 text-n-300">
                      {d.label}
                      {d.partial && ' · so far'}
                    </div>
                    {series.map((s) => (
                      <div key={String(s.key)} className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: s.color }} />
                        <span className="font-semibold tnum">{fmt(Number(d[s.key]))}</span>
                        <span className="text-n-300">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-10 flex pt-2">
        {data.map((d, i) => (
          <div key={d.label} className="min-w-0 flex-1 text-center text-xs whitespace-nowrap text-ink-3">
            {/* When there are many periods, label every other one (always the last) so labels don't overlap. */}
            {data.length <= 8 || (data.length - 1 - i) % 2 === 0 ? d.label : '\u00a0'}
            {d.partial && <span className="block text-2xs text-ink-3">so far</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string; hatch?: boolean; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          {it.dashed ? (
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: it.color }} />
          ) : (
          <span
            className={clsx('size-2.5 rounded-[3px]', it.hatch && 'hatch')}
            style={it.hatch ? { color: it.color, boxShadow: `inset 0 0 0 1px ${it.color}` } : { background: it.color }}
          />
          )}
          {it.label}
        </span>
      ))}
    </div>
  )
}

/* ---------- Heatmap ---------- */
const HEAT_STEPS = ['#f6f0ff', '#d3c2e6', '#a785cc', '#7d45b8', '#4f2480']

export function Heatmap({
  grid,
  rows,
  cols,
  colLabel,
  valueLabel,
}: {
  grid: number[][]
  rows: string[]
  cols: string[]
  colLabel: (i: number) => string
  valueLabel: string
}) {
  const max = Math.max(...grid.flat(), 1)
  const bin = (v: number) => (v === 0 ? -1 : Math.min(HEAT_STEPS.length - 1, Math.floor((v / max) * HEAT_STEPS.length * 0.999)))
  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `40px repeat(${cols.length}, minmax(0, 1fr))` }}>
        {rows.map((r, ri) => (
          <div key={r} className="contents">
            <div className="flex items-center text-xs text-ink-3">{r}</div>
            {grid[ri].map((v, ci) => {
              const b = bin(v)
              return (
                <Tip key={ci} content={<span><b className="tnum">{v}</b> {valueLabel} · {r} {colLabel(ci)}</span>}>
                  <div
                    tabIndex={0}
                    aria-label={`${r} ${colLabel(ci)}: ${v} ${valueLabel}`}
                    className="h-7 rounded-[4px] outline-offset-1 transition-transform hover:scale-110"
                    style={{
                      background: b < 0 ? 'var(--color-n-50)' : HEAT_STEPS[b],
                      boxShadow: b < 0 ? 'inset 0 0 0 1px var(--color-n-100)' : undefined,
                    }}
                  />
                </Tip>
              )
            })}
          </div>
        ))}
        <div />
        {cols.map((c, i) => (
          <div key={i} className="pt-1 text-center text-2xs text-ink-3">
            {c}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-ink-3">
        <span className="mr-1 inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-n-50 ring-1 ring-n-100 ring-inset" /> None
        </span>
        <span>Fewer</span>
        {HEAT_STEPS.map((c) => (
          <span key={c} className="size-3 rounded-[3px]" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
