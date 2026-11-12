import { useId, useMemo, useState } from 'react'
import { ArrowLeftRight, ArrowUpDown, Plus, X } from 'lucide-react'
import { ENTRY_CHOICES, FUNNEL, GLOSSARY, SOURCES, fmt, pct } from '../data'
import { useApp } from '../state'
import { Button, Card, InfoTip, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Term, Tip, clsx } from '../components/ui'

const DEFS: Record<string, string> = {
  impressions: GLOSSARY.impressions,
  opens: GLOSSARY.opens,
  conversations: GLOSSARY.conversations,
  outcomes: GLOSSARY.outcomes,
  step: 'A question in the chat. Once added, the funnel only follows the people who answered it.',
}
const SHORT: Record<string, string> = { impressions: 'Impressions', opens: 'Opens', conversations: 'Conversations', outcomes: 'Outcomes' }
const LOST: Record<string, string> = {
  step: 'didn’t answer it',
  opens: 'didn’t open it',
  conversations: 'didn’t start a chat',
  outcomes: 'didn’t reach an outcome',
}
const KEPT: Record<string, string> = {
  step: 'answered it',
  opens: 'opened',
  conversations: 'started chatting',
  outcomes: 'reached an outcome',
}

type Narrow = { kind: 'Page' | 'Referrer'; name: string } | null

/** Smooth band through each column's centre: flat at the column, S-curves in between. */
function bandPath(halves: number[], w: number, mid: number) {
  const cw = w / halves.length
  const cx = (i: number) => cw * i + cw / 2
  let top = `M 0 ${mid - halves[0]} L ${cx(0)} ${mid - halves[0]}`
  for (let i = 1; i < halves.length; i++) {
    const x0 = cx(i - 1), x1 = cx(i)
    top += ` C ${x0 + cw / 2} ${mid - halves[i - 1]} ${x1 - cw / 2} ${mid - halves[i]} ${x1} ${mid - halves[i]}`
  }
  top += ` L ${w} ${mid - halves[halves.length - 1]}`
  let bottom = ` L ${w} ${mid + halves[halves.length - 1]} L ${cx(halves.length - 1)} ${mid + halves[halves.length - 1]}`
  for (let i = halves.length - 2; i >= 0; i--) {
    const x0 = cx(i + 1), x1 = cx(i)
    bottom += ` C ${x0 - cw / 2} ${mid + halves[i + 1]} ${x1 + cw / 2} ${mid + halves[i]} ${x1} ${mid + halves[i]}`
  }
  bottom += ` L 0 ${mid + halves[0]} Z`
  return top + bottom
}

/** Smooth vertical band through each row's centre: flat across the row, S-curves in between. */
function bandPathV(halves: number[], h: number, mid: number) {
  const rh = h / halves.length
  const cy = (i: number) => rh * i + rh / 2
  const n = halves.length
  let right = `M ${mid + halves[0]} 0 L ${mid + halves[0]} ${cy(0)}`
  for (let i = 1; i < n; i++) {
    const y0 = cy(i - 1), y1 = cy(i)
    right += ` C ${mid + halves[i - 1]} ${y0 + rh / 2} ${mid + halves[i]} ${y1 - rh / 2} ${mid + halves[i]} ${y1}`
  }
  right += ` L ${mid + halves[n - 1]} ${h}`
  let left = ` L ${mid - halves[n - 1]} ${h} L ${mid - halves[n - 1]} ${cy(n - 1)}`
  for (let i = n - 2; i >= 0; i--) {
    const y0 = cy(i + 1), y1 = cy(i)
    left += ` C ${mid - halves[i + 1]} ${y0 - rh / 2} ${mid - halves[i]} ${y1 + rh / 2} ${mid - halves[i]} ${y1}`
  }
  left += ` L ${mid - halves[0]} 0 Z`
  return right + left
}

function Chip({ children, dashed, className }: { children: React.ReactNode; dashed?: boolean; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs',
        dashed ? 'border border-dashed border-line-strong text-ink-2 hover:bg-subtle' : 'bg-muted font-medium text-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}



export function FunnelSection() {
  const { s } = useApp()
  const gid = useId().replace(/:/g, '')
  const [narrow, setNarrow] = useState<Narrow>(null)
  const [step, setStep] = useState(false)
  const [horizontal, setHorizontal] = useState(false)

  // Stage numbers, optionally narrowed to one page or referrer.
  const base = useMemo(() => {
    const base = FUNNEL.map((f) => ({ key: f.key, label: f.label, v: s(f.value) }))
    if (!narrow) return base
    const row = SOURCES[narrow.kind === 'Page' ? 'Pages' : 'Referrers'].find((r) => r.name === narrow.name)
    if (!row || row.impressions === null) return base
    const imp = s(row.impressions), conv = s(row.conversations), out = s(row.outcomes)
    const opens = Math.min(imp, Math.max(conv, Math.round(conv * 1.8)))
    return base.map((b) => ({ ...b, v: b.key === 'impressions' ? imp : b.key === 'opens' ? opens : b.key === 'conversations' ? conv : out }))
  }, [narrow, s])

  const conv = base[2].v
  // A step is a stage: it keeps only the people who used it, and the outcome after it counts only them.
  const scale = conv / Math.max(s(FUNNEL[2].value), 1)
  const stages: { key: string; label: string; v: number }[] = base
  // With the step added, Conversations and Outcomes are split by how people started (thin lines, details on hover).
  const slices = step
    ? ENTRY_CHOICES.choices.map((c) => ({ label: c.label, v: Math.round(c.value * scale), reached: Math.round(c.reached * scale), manual: c.manual }))
    : []
  const top = Math.max(stages[0].v, 1)
  // Band geometry (SVG units). Rows stack top to bottom; the band is centred and narrows as people drop off.
  const W = 400, mid = W / 2, maxHalf = 180, ROW = 84
  const H = ROW * stages.length
  const half = (v: number) => Math.max(5, (v / top) * maxHalf)
  const kept = stages.map((st) => half(st.v))
  // Light halo: at each row, the size of the stage before it, so the gap shows who dropped off.
  const halo = stages.map((st, i) => half(i === 0 ? st.v : stages[i - 1].v) + 6)
  // Only very thin parts put their label beside the band; the rest keep it inside and let it wrap.
  const thin = (i: number) => kept[i] < 30
  // Horizontal layout geometry.
  const HW = 1000, HH = 220, hMax = 96
  const hHalf = (v: number) => Math.max(5, (v / top) * hMax)
  const hKept = stages.map((st) => hHalf(st.v))
  const hHalo = stages.map((st, i) => hHalf(i === 0 ? st.v : stages[i - 1].v) + 6)
  const hCols = { gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }

  return (
    <Card
      id="funnel"
      title={
        <span className="inline-flex items-center gap-1.5">
          Funnel <InfoTip label="About the funnel" text="How many people move from seeing the launcher to reaching an outcome." />
        </span>
      }
      actions={
        !step && (
        <Tip content={horizontal ? 'Show vertical funnel' : 'Show horizontal funnel'}>
          <Button
            size="sm"
            variant="ghost"
            className="size-8 px-0"
            onClick={() => setHorizontal((h) => !h)}
            aria-label={horizontal ? 'Show vertical funnel' : 'Show horizontal funnel'}
          >
            {horizontal ? <ArrowUpDown className="size-4" /> : <ArrowLeftRight className="size-4" />}
          </Button>
        </Tip>
        )
      }
    >
      {/* Controls: narrow the top */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-3">Impressions</span>
          {narrow ? (
            <Chip>
              {narrow.kind}: {narrow.name}
              <button aria-label="Clear narrow" onClick={() => setNarrow(null)} className="-mr-1 grid size-4 place-items-center rounded-full text-ink-3 hover:bg-n-200 hover:text-ink">
                <X className="size-3" />
              </button>
            </Chip>
          ) : (
            <Menu>
              <MenuTrigger asChild>
                <button>
                  <Chip dashed>
                    <Plus className="size-3" /> Narrow
                  </Chip>
                </button>
              </MenuTrigger>
              <MenuContent align="start">
                <MenuLabel>Page</MenuLabel>
                {SOURCES.Pages.filter((p) => p.impressions !== null).slice(0, 5).map((p) => (
                  <MenuItem key={p.name} onSelect={() => setNarrow({ kind: 'Page', name: p.name })}>
                    <span className="font-mono text-xs">{p.name}</span>
                  </MenuItem>
                ))}
                <MenuSeparator />
                <MenuLabel>Referrer</MenuLabel>
                {SOURCES.Referrers.map((r) => (
                  <MenuItem key={r.name} onSelect={() => setNarrow({ kind: 'Referrer', name: r.name })}>
                    {r.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-3">Steps</span>
          {step ? (
            <Chip className="pr-1">
              {ENTRY_CHOICES.field}
              <button aria-label={`Remove ${ENTRY_CHOICES.field}`} onClick={() => setStep(false)} className="grid size-4 place-items-center rounded-full text-ink-3 hover:bg-n-200 hover:text-ink">
                <X className="size-3" />
              </button>
            </Chip>
          ) : (
            <Menu>
              <MenuTrigger asChild>
                <button>
                  <Chip dashed>
                    <Plus className="size-3" /> Add step
                  </Chip>
                </button>
              </MenuTrigger>
              <MenuContent align="start">
                <MenuLabel>Questions in the chat</MenuLabel>
                <MenuItem onSelect={() => setStep(true)}>{ENTRY_CHOICES.field}</MenuItem>
              </MenuContent>
            </Menu>
          )}
        </div>
      </div>

{horizontal && !step ? (
        <>
      {/* Horizontal funnel: one column per stage, band flows left to right. */}
      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid" style={hCols}>
            {stages.map((st, i) => (
              <div key={st.key} className={clsx('px-3 pb-3 text-center text-sm font-medium', i > 0 && 'border-l border-line', st.key === 'step' ? 'text-brand-600' : 'text-ink-2')}>
                <Term def={DEFS[st.key]}>{SHORT[st.key] ?? st.label}</Term>
              </div>
            ))}
          </div>
          <div className="relative" style={{ height: HH }}>
            <svg viewBox={`0 0 ${HW} ${HH}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
              <defs>
                <linearGradient id={`${gid}-hg`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="var(--color-brand-600)" />
                  <stop offset="0.72" stopColor="var(--color-brand-400)" />
                  <stop offset="1" stopColor="var(--color-brand-300)" />
                </linearGradient>
                <linearGradient id={`${gid}-ho`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="var(--color-success-600)" />
                  <stop offset="1" stopColor="var(--color-success-600)" stopOpacity="0.75" />
                </linearGradient>
                <clipPath id={`${gid}-hc`}>
                  <rect x={(HW / stages.length) * (stages.length - 1)} y="0" width={HW / stages.length} height={HH} />
                </clipPath>
              </defs>
              <path d={bandPath(hHalo, HW, HH / 2)} fill="var(--color-brand-200)" opacity="0.35" />
              <path d={bandPath(hKept, HW, HH / 2)} fill={`url(#${gid}-hg)`} />
              <path d={bandPath(hKept, HW, HH / 2)} fill={`url(#${gid}-ho)`} clipPath={`url(#${gid}-hc)`} />
            </svg>
            <div className="absolute inset-0 grid" style={hCols}>
              {stages.map((st, i) => {
                const prev = stages[i - 1]
                const rate = prev ? st.v / Math.max(prev.v, 1) : 1
                const hThin = hKept[i] < 22
                return (
                  <Tip
                    key={st.key}
                    content={
                      <span>
                        <b className="tnum">{fmt(st.v)}</b> {i === 0 ? 'impressions' : KEPT[st.key]}
                        {prev && <> · {pct(rate)} of {fmt(prev.v)}</>}
                        {prev && <><br />{fmt(prev.v - st.v)} {LOST[st.key]}</>}
                      </span>
                    }
                  >
                    <div
                      tabIndex={0}
                      className={clsx('flex flex-col items-center justify-center hover:bg-white/5', i > 0 && 'border-l border-line/70', hThin ? 'pt-[88px] text-ink' : 'text-white')}
                      style={{ outline: 'none' }}
                    >
                      <span className={clsx('text-md font-semibold tnum', !hThin && 'drop-shadow-sm')}>{i === 0 ? '100%' : pct(rate)}</span>
                      {i > 0 && <span className={clsx('text-xs', hThin ? 'text-ink-2' : 'text-white/85')}>{KEPT[st.key]}</span>}
                    </div>
                  </Tip>
                )
              })}
            </div>
          </div>
          <div className="grid" style={hCols}>
            {stages.map((st, i) => {
              const prev = stages[i - 1]
              return (
                <div key={st.key} className={clsx('px-3 pt-3 text-center', i > 0 && 'border-l border-line')}>
                  <div className={clsx('text-lg font-semibold tnum', st.key === 'outcomes' ? 'text-success-700' : 'text-brand-600')}>{fmt(st.v)}</div>
                  <div className="mt-0.5 text-xs text-ink-3">{prev ? <>↓ {fmt(Math.max(0, prev.v - st.v))} {LOST[st.key]}</> : 'times the launcher was shown'}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

        </>
      ) : (
        <>
      {/* The funnel: one row per stage, top to bottom, with a flowing band like the horizontal version. */}
      <div className="mt-6 overflow-x-auto">
        <div className="grid min-w-[480px] grid-cols-[120px_minmax(0,1fr)_150px] gap-x-4">
          {/* Stage name + number */}
          <div>
            {stages.map((st, i) => (
              <div key={st.key} className={clsx('flex flex-col justify-center', i > 0 && 'border-t border-line')} style={{ height: ROW }}>
                <span className={clsx('text-sm font-medium', st.key === 'step' ? 'text-brand-600' : 'text-ink-2')}>
                  <Term def={DEFS[st.key]}>{SHORT[st.key] ?? st.label}</Term>
                </span>
                <span className={clsx('text-lg font-semibold tnum', st.key === 'outcomes' ? 'text-success-700' : 'text-brand-600')}>{fmt(st.v)}</span>
                {slices.length > 0 && st.key === 'conversations' && <span className="text-xs text-ink-3">split by {ENTRY_CHOICES.field.toLowerCase()}</span>}
              </div>
            ))}
          </div>

          {/* Band */}
          <div className="relative" style={{ height: H }}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
              <defs>
                <linearGradient id={`${gid}-g`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--color-brand-600)" />
                  <stop offset="0.72" stopColor="var(--color-brand-400)" />
                  <stop offset="1" stopColor="var(--color-brand-300)" />
                </linearGradient>
                <linearGradient id={`${gid}-o`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--color-success-600)" />
                  <stop offset="1" stopColor="var(--color-success-600)" stopOpacity="0.75" />
                </linearGradient>
                <clipPath id={`${gid}-c`}>
                  <rect x="0" y={ROW * (stages.length - 1)} width={W} height={ROW} />
                </clipPath>
              </defs>
              <path d={bandPathV(halo, H, mid)} fill="var(--color-brand-200)" opacity="0.35" />
              <path d={bandPathV(kept, H, mid)} fill={`url(#${gid}-g)`} />
              <path d={bandPathV(kept, H, mid)} fill={`url(#${gid}-o)`} clipPath={`url(#${gid}-c)`} />
              {/* Breaks: straight vertical gaps that split Conversations and Outcomes by how people started */}
              {slices.length > 0 && (
                <>
                  <clipPath id={`${gid}-band`}>
                    <path d={bandPathV(kept, H, mid)} />
                  </clipPath>
                  <g clipPath={`url(#${gid}-band)`}>
                    {(() => {
                      // Only Conversations is split: alternating subtle shades + hair-thin dividers.
                      const h = kept[2]
                      let acc = 0
                      return slices.map((c, j) => {
                        const x0 = mid - h + (acc / conv) * 2 * h
                        acc += c.v
                        const x1 = mid - h + (acc / conv) * 2 * h
                        return (
                          <g key={c.label}>
                            <rect x={x0} y={ROW * 2} width={x1 - x0} height={ROW} fill="white" opacity={j % 2 ? 0.1 : 0} />
                            {j > 0 && <line x1={x0} x2={x0} y1={ROW * 2} y2={ROW * 3} stroke="white" strokeOpacity="0.55" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
                          </g>
                        )
                      })
                    })()}
                  </g>
                </>
              )}
            </svg>
            {/* Hover areas: one per slice, between the breaks */}
            {slices.length > 0 &&
              [2].map((row) => {
                const vals = slices.map((c) => (row === 2 ? c.v : c.reached))
                const sum = Math.max(vals.reduce((a, b) => a + b, 0), 1)
                const h = kept[row]
                let acc = 0
                return slices.map((c, j) => {
                  const x0 = mid - h + (acc / sum) * 2 * h
                  acc += vals[j]
                  const x1 = mid - h + (acc / sum) * 2 * h
                  return (
                    <Tip
                      key={`${row}-${c.label}`}
                      content={
                        <span className="tnum">
                          <b>{c.label}</b>
                          <br />
                          {row === 2
                            ? <>{fmt(c.v)} conversations · {pct(c.v / Math.max(conv, 1))} of all<br />{fmt(c.reached)} reached an outcome ({pct(c.reached / Math.max(c.v, 1))})</>
                            : <>{fmt(c.reached)} of {fmt(c.v)} reached an outcome ({pct(c.reached / Math.max(c.v, 1))})</>}
                        </span>
                      }
                    >
                      <div
                        className="absolute z-10 cursor-default transition-colors hover:bg-white/15"
                        style={{ top: ROW * row + 1, height: ROW - 2, left: `${(x0 / W) * 100}%`, width: `${((x1 - x0) / W) * 100}%` }}
                      />
                    </Tip>
                  )
                })
              })}
            <div className="absolute inset-0 flex flex-col">
              {stages.map((st, i) => {
                const prev = stages[i - 1]
                const rate = prev ? st.v / Math.max(prev.v, 1) : 1
                return (
                  <Tip
                    key={st.key}
                    content={
                      <span>
                        <b className="tnum">{fmt(st.v)}</b> {i === 0 ? 'impressions' : KEPT[st.key]}
                        {prev && <> · {pct(rate)} of {fmt(prev.v)}</>}
                        {prev && <><br />{fmt(prev.v - st.v)} {LOST[st.key]}</>}
                      </span>
                    }
                  >
                    <div tabIndex={0} className={clsx('relative hover:bg-white/5', i > 0 && 'border-t border-line/70')} style={{ height: ROW, outline: 'none' }}>
                      {thin(i) ? (
                        // Thin band: label sits beside it in dark text.
                        <div className="absolute top-1/2 flex -translate-y-1/2 flex-col leading-tight" style={{ left: `calc(50% + ${(kept[i] / W) * 100}% + 10px)` }}>
                          <span className="text-md font-semibold text-ink tnum">{pct(rate)}</span>
                          <span className="text-xs text-ink-2">{KEPT[st.key]}</span>
                        </div>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center text-white">
                          <div className="flex flex-col items-center px-1 text-center leading-tight" style={{ maxWidth: `${((kept[i] * 2) / W) * 100}%` }}>
                            <span className="text-md font-semibold tnum drop-shadow-sm">{i === 0 ? '100%' : pct(rate)}</span>
                            {i > 0 && <span className="mt-0.5 text-xs text-white/85">{KEPT[st.key]}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </Tip>
                )
              })}
            </div>
          </div>

          {/* Drop-off */}
          <div>
            {stages.map((st, i) => {
              const prev = stages[i - 1]
              return (
                <div key={st.key} className={clsx('flex items-center text-xs text-ink-3', i > 0 && 'border-t border-line')} style={{ height: ROW }}>
                  {prev ? <>↓ {fmt(Math.max(0, prev.v - st.v))} {LOST[st.key]}</> : 'times the launcher was shown'}
                </div>
              )
            })}
          </div>
        </div>
      </div>

        </>
      )}

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-ink-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-gradient-to-r from-brand-600 to-brand-400" />People who kept going</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-brand-200/60" />Dropped off</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-success-600" />Outcome</span>
          {step && (
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-2.5 w-4 justify-evenly rounded-sm bg-brand-600"><span className="w-px bg-white/80" /><span className="w-px bg-white/80" /></span>
              Split by {ENTRY_CHOICES.field.toLowerCase()} · hover to see each
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
