// Sample data for the prototype (28-day view, Aug 26 – Sep 22, 2026). Every
// number reconciles: weeks, sources, topics and the heatmap all add up to TOTALS.
// Other periods are scaled so the UI responds to filters.

export type Period = '24h' | '7d' | '28d' | '90d'

export const PERIODS: Record<
  Period,
  { label: string; short: string; range: string; compare: string; scale: number; days: number }
> = {
  '24h': { label: 'Last 24 hours', short: '24h', range: 'Sep 22, 2026', compare: 'Sep 21', scale: 0.04, days: 1 },
  '7d': { label: 'Last 7 days', short: '7d', range: 'Sep 16 – Sep 22, 2026', compare: 'Sep 9 – Sep 15', scale: 0.26, days: 7 },
  '28d': { label: 'Last 28 days', short: '28d', range: 'Aug 26 – Sep 22, 2026', compare: 'Jul 29 – Aug 25', scale: 1, days: 28 },
  '90d': { label: 'Last 90 days', short: '90d', range: 'Jun 25 – Sep 22, 2026', compare: 'Mar 27 – Jun 24', scale: 3.2, days: 90 },
}

export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function series(seed: number, n: number, base: number, spread: number) {
  const r = mulberry32(seed)
  return Array.from({ length: n }, (_, i) => Math.max(0, Math.round(base + (r() - 0.5) * spread + Math.sin(i / 2.3) * spread * 0.25)))
}

/** Page totals for the 28-day period, and the 28 days before. */
export const TOTALS = {
  impressions: 2480,
  impressionsPrev: 2760,
  opens: 640,
  opensPrev: 610,
  conversations: 412, // 388 from the launcher + 24 from direct links
  conversationsPrev: 380,
  launcherConversations: 388,
  directConversations: 24,
  outcomes: 268,
  outcomesPrev: 205,
  aiAlone: 398, // the other 14 were handed to a person
  handoffs: 14,
  humanPickupMedian: '2m 10s',
}

export const GLOSSARY = {
  impressions: 'Times the chat launcher was shown to a visitor on your site. (Previously shown as "Visits".)',
  opens: 'Times a visitor opened the chat launcher.',
  conversations: 'Chats where the visitor sent a message or picked an option. Opening the launcher alone does not count.',
  outcomes: 'Conversations that reached one of your outcomes. Set outcomes in Edit outcomes, e.g. reaching a step or capturing a field.',
  outcomeRate: 'Share of conversations that reached a goal.',
  unclassified: 'Conversations that did not match any topic. A high share usually means a topic is missing.',
  medianReply: 'Half of all AI replies arrived faster than this.',
  p90Reply: '90% of AI replies arrived faster than this. Only 1 in 10 was slower.',
}

export type Kpi = {
  key: 'impressions' | 'opens' | 'conversations' | 'outcomes'
  label: string
  value: number
  prev: number
  sub: (scale: number) => string
  spark: number[]
}

export const KPIS: Kpi[] = [
  {
    key: 'impressions',
    label: 'Launcher impressions',
    value: 2480,
    prev: 2760,
    sub: () => '',
    spark: series(11, 28, 18, 18),
  },
  {
    key: 'opens',
    label: 'Launcher opens',
    value: 640,
    prev: 610,
    sub: () => '25.8% of impressions',
    spark: series(12, 28, 14, 14),
  },
  {
    key: 'conversations',
    label: 'Conversations',
    value: 412,
    prev: 380,
    sub: () => '60.6% of opens',
    spark: series(13, 28, 8, 9),
  },
  {
    key: 'outcomes',
    label: 'Outcomes reached',
    value: 268,
    prev: 205,
    sub: () => '65.0% of conversations',
    spark: series(14, 28, 6, 8),
  },
]

export type Topic = {
  id: string
  name: string
  description: string
  count: number
  prev: number
  outcomeRate: number
  isNew?: boolean
  archived?: boolean
  examples: string[]
}

// Topics + unclassified = all 412 conversations (348 + 64). Previous: 323 + 57 = 380.
// Outcome rates are exact so topic outcomes add up to 268.
export const TOPICS: Topic[] = [
  {
    id: 'insurance',
    name: 'Insurance and pricing',
    description: 'Accepted insurance plans, session costs and out-of-pocket pricing.',
    count: 92,
    prev: 70,
    outcomeRate: 53 / 92,
    examples: ['Do you take Aetna?', 'How much is a session without insurance?', 'Is the first visit covered?'],
  },
  {
    id: 'getting-started',
    name: 'Getting started',
    description: 'First steps, sign-up and intake.',
    count: 74,
    prev: 81,
    outcomeRate: 61 / 74,
    examples: ['How do I get started?', 'What do I need for the intake?', 'Can I sign up online?'],
  },
  {
    id: 'care',
    name: 'Care process',
    description: 'How therapy and care work, session length and who the child will see.',
    count: 61,
    prev: 66,
    outcomeRate: 49 / 61,
    examples: ['How does care work?', 'How long is each session?', 'Will my child see the same therapist?'],
  },
  {
    id: 'availability',
    name: 'Service availability',
    description: 'Whether a service is offered in the visitor’s state or for their need.',
    count: 48,
    prev: 22,
    outcomeRate: 30 / 48,
    examples: ['Do you offer ADHD testing?', 'Are you available in New Jersey?', 'Do you treat anxiety in teens?'],
  },
  {
    id: 'scheduling',
    name: 'Appointment scheduling',
    description: 'Booking, rescheduling and cancelling appointments.',
    count: 34,
    prev: 38,
    outcomeRate: 17 / 34,
    examples: ['Can I move my appointment?', 'How do I book a session?'],
  },
  {
    id: 'location',
    name: 'Clinic location',
    description: 'In-person clinic addresses and directions.',
    count: 22,
    prev: 27,
    outcomeRate: 17 / 22,
    examples: ['Where is the Brooklyn clinic?', 'Do you have a location in Albany?'],
  },
  {
    id: 'age',
    name: 'Age eligibility',
    description: 'Which ages are supported.',
    count: 17,
    prev: 19,
    outcomeRate: 12 / 17,
    examples: ['Do you see 4 year olds?', 'Is there an age limit?'],
  },
]

export const UNCLASSIFIED = { count: 64, prev: 57, outcomeRate: 29 / 64 }

export const TOPIC_WEEKLY: Record<string, number[]> = Object.fromEntries(
  TOPICS.map((t, i) => [t.id, series(40 + i, 6, t.count / 4, Math.max(2, t.count / 3))]),
)

export const SAMPLE_CONVERSATIONS = [
  { who: 'Visitor 4F2A', first: 'Do you take Aetna for teens?', when: 'Sep 22, 4:12 pm', channel: 'Web', outcome: true, msgs: 9 },
  { who: 'Visitor 91C0', first: 'How much is a session without insurance?', when: 'Sep 22, 11:03 am', channel: 'Web', outcome: false, msgs: 4 },
  { who: 'Sarah M.', first: 'Is the first assessment covered by my plan?', when: 'Sep 21, 7:48 pm', channel: 'WhatsApp', outcome: true, msgs: 12 },
  { who: 'Visitor 22BD', first: 'Do you accept Medicaid in NY?', when: 'Sep 21, 1:15 pm', channel: 'Web', outcome: false, msgs: 3 },
  { who: 'Visitor 7E19', first: 'What does a session cost?', when: 'Sep 20, 9:30 am', channel: 'Web', outcome: true, msgs: 7 },
  { who: 'James K.', first: 'Is there a sliding scale?', when: 'Sep 19, 6:02 pm', channel: 'Web', outcome: true, msgs: 6 },
]

export const FUNNEL = [
  { key: 'impressions', label: 'Launcher shown', value: 2480 },
  { key: 'opens', label: 'Launcher opened', value: 640 },
  { key: 'conversations', label: 'Conversation started', value: 412, note: 'Includes 24 started from a direct link, without the launcher' },
  { key: 'outcomes', label: 'Outcome reached', value: 268 },
]

// Everyone who answered “Top Button” (see FIELDS). Choices add up to total.
export const ENTRY_CHOICES = {
  field: 'Top Button',
  total: 180,
  reached: 121,
  choices: [
    { label: 'Typed their own question', value: 62 },
    { label: 'How does care work?', value: 41 },
    { label: 'Insurance & pricing', value: 36 },
    { label: 'How do I get started?', value: 25 },
    { label: 'Something else', value: 16 },
  ],
}

export type Week = { label: string; impressions: number; conversations: number; outcomes: number; partial?: boolean; marker?: string }

// Weeks start Monday. Aug 26 is a Wednesday, so the first week has 5 days in range and the last has 2.
// Sums: impressions 2,480 · conversations 412 · outcomes 268.
export const WEEKS: Week[] = [
  { label: 'Aug 24', impressions: 440, conversations: 72, outcomes: 45, partial: true },
  { label: 'Aug 31', impressions: 620, conversations: 104, outcomes: 66 },
  { label: 'Sep 7', impressions: 610, conversations: 101, outcomes: 67 },
  { label: 'Sep 14', impressions: 640, conversations: 106, outcomes: 70 },
  { label: 'Sep 21', impressions: 170, conversations: 29, outcomes: 20, partial: true },
]

// September runs to Sep 22. Aug 26 – Sep 22 = Aug 26–31 (530 / 87 / 55) + Sep 1–22 (1,950 / 325 / 213).
export const MONTHS: Week[] = [
  { label: 'Jun', impressions: 2910, conversations: 362, outcomes: 196 },
  { label: 'Jul', impressions: 3040, conversations: 395, outcomes: 214 },
  { label: 'Aug', impressions: 2850, conversations: 418, outcomes: 262 },
  { label: 'Sep', impressions: 1950, conversations: 325, outcomes: 213, partial: true },
]

export type SourceRow = { name: string; hint?: string; impressions: number | null; conversations: number; outcomes: number }

// Sites cover everything (2,480 / 412 / 268). Referrers cover launcher traffic only
// (2,480 / 388 / 249), since direct links have no referrer. Pages lists the top 8.
export const SOURCES: Record<string, SourceRow[]> = {
  Pages: [
    { name: '/', hint: 'Home page', impressions: 620, conversations: 118, outcomes: 81 },
    { name: '/start/brightline/', impressions: 410, conversations: 86, outcomes: 58 },
    { name: '/start/back-to-school/', impressions: 690, conversations: 41, outcomes: 22 },
    { name: '/start/albany/', impressions: 160, conversations: 34, outcomes: 25 },
    { name: '/what-we-treat/', impressions: 210, conversations: 29, outcomes: 17 },
    { name: 'Direct link', hint: 'Chat opened from a shared link, not a page', impressions: null, conversations: 24, outcomes: 19 },
    { name: '/start/brooklyn/', impressions: 120, conversations: 8, outcomes: 5 },
    { name: '/start/request-appointment/', impressions: 45, conversations: 6, outcomes: 6 },
  ],
  Sites: [
    { name: 'hellobrightline.com', impressions: 2050, conversations: 318, outcomes: 205 },
    { name: 'care.hellobrightline.com', impressions: 430, conversations: 70, outcomes: 44 },
    { name: 'Direct link', hint: 'Chat opened from a shared link, not a page', impressions: null, conversations: 24, outcomes: 19 },
  ],
  Referrers: [
    { name: 'Google', impressions: 1120, conversations: 182, outcomes: 121 },
    { name: 'No referrer', hint: 'Typed URL, bookmark or app', impressions: 760, conversations: 128, outcomes: 85 },
    { name: 'Instagram', impressions: 380, conversations: 38, outcomes: 21 },
    { name: 'Facebook', impressions: 150, conversations: 26, outcomes: 15 },
    { name: 'Bing', impressions: 70, conversations: 14, outcomes: 7 },
  ],
  Campaigns: [],
}

// 7 days × 24 hours, conversations. Peak Saturday 1 pm.
export const HEAT: number[][] = (() => {
  const r = mulberry32(99)
  const grid = Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const evening = h >= 18 && h <= 23 ? 1.4 : 1
      const night = h <= 5 ? 0.9 : 1
      const weekend = d >= 5 ? 1.35 : 1
      return Math.round(r() * 2.2 * evening * night * weekend)
    }),
  )
  grid[5][13] = 7
  grid[5][12] = 4
  grid[5][14] = 4
  grid[1][2] = 4
  grid[2][21] = 5
  grid[6][19] = 4
  return grid
})()

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const FIELDS = [
  { name: 'Button', key: 'button', asked: 236, answered: 229 },
  { name: 'Top Button', key: 'top_button', asked: null as number | null, answered: 180 },
]

export const REPLY = {
  median: 3.8,
  p90: 9.6,
  max: 21.4,
  daily: series(77, 28, 12, 6).map((v) => Math.max(6, v)),
}

export function fmt(n: number) {
  return n.toLocaleString('en-US')
}

export function pct(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`
}

export function scaleN(n: number, s: number) {
  return Math.max(0, Math.round(n * s))
}

export function changePct(cur: number, prev: number) {
  if (!prev) return null
  return (cur - prev) / prev
}
