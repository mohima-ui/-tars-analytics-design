import { useState } from 'react'
import { NotebookPen } from 'lucide-react'
import { useApp, type TopicsState } from '../state'
import { Badge, Button, Segmented, Sheet } from '../components/ui'

const P = {
  2: 'P2 · Show signal, hide noise',
  3: 'P3 · Trust through transparency',
  4: 'P4 · Progressive disclosure',
  5: 'P5 · Built for the loop',
} as const

const NOTES: { area: string; items: { before: string; after: string; p: (keyof typeof P)[] }[] }[] = [
  {
    area: 'Page structure',
    items: [
      { before: '12 equal-weight cards in one long scroll, no hierarchy.', after: 'Summary → insights → Topics → funnel → trends → AI performance → traffic → data. A sticky section nav shows where you are.', p: [2] },
      { before: 'Filter bar showed “28d” but no actual dates; timezone was a top-level filter; unexplained palette icon.', after: 'Real date range and comparison period in the header. Timezone moved into the date picker. Customize is labelled.', p: [3, 4] },
      { before: 'No way to share or export a report.', after: 'Email report (weekly or monthly), Export to PDF/CSV, and Copy link with filters kept.', p: [5] },
      { before: 'Test data looked the same as Live.', after: 'A clear amber banner and a one-click way back to Live.', p: [5] },
    ],
  },
  {
    area: 'Summary',
    items: [
      { before: '5 KPIs in a 4-column grid left “AI Agent” stranded; it duplicated “Outcome” (both 175).', after: '4 KPIs in one row. Outcomes counts every goal you track.', p: [2] },
      { before: '“Visits”, “Impressions” and “Launcher impressions” for the same thing.', after: 'One name, “Launcher impressions”, everywhere, with a definition on hover.', p: [3, 4] },
      { before: 'Captions switched between “previous period” and “% of X”.', after: 'Every tile: value, change vs a named period, and one conversion ratio.', p: [2] },
      { before: 'Biggest story (−72% impressions) was small red text.', after: 'AI insights at the top, each linking to the place that explains or fixes it.', p: [2, 5] },
    ],
  },
  {
    area: 'Topics',
    items: [
      { before: '“Unknown” was the first row at 50%.', after: 'Shown as “No matching topic”, pinned below the topics, with a coverage meter and a “Find missing topics” action.', p: [2, 3] },
      { before: 'Volume only, so there was no way to tell which topics need work.', after: 'An outcome rate per topic flags those below 65% and links to Knowledge and the agent config.', p: [5] },
      { before: 'Green/red % changes on tiny counts (3 conv., −74%).', after: 'Neutral absolute changes (+7), the % shown small, and “low volume” under 10 conversations.', p: [3] },
      { before: 'Scroll inside the card; long names ending in “questions”.', after: 'Top 6 + “Show all”, shorter names, a 6-week trend per topic, and sortable columns.', p: [2] },
      { before: 'Topic click went straight to a raw list.', after: 'A side panel with key stats, example questions, recent conversations and next actions.', p: [4, 5] },
      { before: 'Manage actions had no preview.', after: 'Each action says what it will do (“reclassifies 85 conversations”, “no AI call”), checks for duplicate names, and archived topics can be restored.', p: [3] },
    ],
  },
  {
    area: 'Funnel',
    items: [
      { before: 'A Sankey with overlapping labels, near-invisible green flows, and numbers that didn’t add up (385 opens → 214 + 197).', after: 'A step funnel showing % continued and dropped off at each step, the biggest drop flagged, and the 14 direct-link conversations explained.', p: [2, 3] },
      { before: 'The funnel ended at “AI Agent 8” while the KPI said 175.', after: 'Button-path detail moved to an opt-in “First choices” panel, labelled as covering only button users.', p: [3, 4] },
    ],
  },
  {
    area: 'Trends, AI performance, traffic',
    items: [
      { before: 'Two charts plus a table showing the same weekly numbers; the partial week looked like a drop.', after: 'One chart with a metric switch and a table toggle; the partial week is hatched and labelled “so far”.', p: [2, 3] },
      { before: '“Slow 20.2s / Slowest 23.9s” unexplained; the range bar had no legend.', after: '“Typical”, “9 in 10 within” and “Slowest”, with a keyed scale and change vs last period.', p: [4] },
      { before: 'A large “Handled by 100%” card and a separate blurred human-pickup card.', after: 'Combined into one card with a handoff setup prompt.', p: [2, 5] },
      { before: 'Unlabelled bars in Sources; 100% from 14 conversations looked as solid as 97% from 65.', after: 'A labelled “Chat rate” column, sortable headers, low-volume flags, and bots excluded by default.', p: [3] },
      { before: '168 noisy heatmap cells; the insight (“Busiest: Saturday 1pm”) was in tiny text.', after: 'Summary chips first, 3-hour blocks by default (hourly optional), and an empty-vs-low legend.', p: [2] },
    ],
  },
  {
    area: 'Empty states',
    items: [
      { before: 'CSAT, Campaigns and Human pickup showed blurred fake numbers (4.6, 62 ratings) that could be mistaken for real data.', after: 'One compact “Get more from this page” strip that explains each report and links to setting it up.', p: [2, 4] },
    ],
  },
]

export function DesignNotes() {
  const [open, setOpen] = useState(false)
  const { topicsState, setTopicsState, role, setRole } = useApp()
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-5 z-40 inline-flex items-center gap-2 rounded-full bg-n-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl hover:bg-n-700"
      >
        <NotebookPen className="size-4" /> Design notes
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Design notes" description="What changed from the current Analytics page, and why. Tags refer to the TARS design principles." width="max-w-2xl">
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <h4 className="text-sm font-semibold text-ink">Preview states</h4>
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1.5 text-xs text-ink-3">Topics card</div>
              <Segmented<TopicsState>
                size="sm"
                label="Topics state"
                value={topicsState}
                onChange={setTopicsState}
                options={[
                  { value: 'ready', label: 'Ready' },
                  { value: 'partial', label: 'Partly classified' },
                  { value: 'classifying', label: 'First run' },
                  { value: 'lowData', label: 'Not enough data' },
                  { value: 'upgrade', label: 'Free plan' },
                ]}
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs text-ink-3">Viewer role</div>
              <Segmented size="sm" label="Role" value={role} onChange={setRole} options={[{ value: 'admin', label: 'Admin' }, { value: 'member', label: 'Member (no Manage topics)' }]} />
            </div>
            <p className="text-xs text-ink-3">Switch Live / Test in the filter bar to see the Test state.</p>
          </div>
          <Button size="sm" className="mt-3" onClick={() => { setOpen(false); setTimeout(() => { const el = document.getElementById('topics'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' }) }, 250) }}>
            Jump to Topics
          </Button>
        </div>

        <div className="mt-6 space-y-7">
          {NOTES.map((g) => (
            <section key={g.area}>
              <h4 className="text-sm font-semibold text-ink">{g.area}</h4>
              <ul className="mt-3 space-y-3">
                {g.items.map((it) => (
                  <li key={it.after} className="rounded-lg border border-line p-3 text-sm">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <div className="text-2xs font-medium tracking-wide text-ink-3 uppercase">Before</div>
                        <p className="mt-0.5 text-ink-2">{it.before}</p>
                      </div>
                      <div>
                        <div className="text-2xs font-medium tracking-wide text-brand-600 uppercase">Now</div>
                        <p className="mt-0.5 text-ink">{it.after}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {it.p.map((k) => (
                        <Badge key={k} tone="brand">{P[k]}</Badge>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Sheet>
    </>
  )
}
