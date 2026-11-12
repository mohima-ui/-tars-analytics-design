// Sample data for the prototype. Base numbers come from the Brightline Prod
// screenshots (28-day view); other periods are scaled so the UI responds to filters.

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

function mulberry32(seed: number) {
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

export const GLOSSARY = {
  impressions: 'Times the chat launcher was shown to a visitor’s site.',
  opens: 'Times a visitor opened the chat launcher.',
  conversations: 'Chats where the visitor sent a message or picked an option. Opening the launcher alone does not count.',
  outcomes: 'Conversations that reached one of your goals. Edit goals to track bookings, leads and more.',
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
    value: 514,
    prev: 452,
    sub: () => '',
    spark: series(11, 28, 18, 18),
  },
  {
    key: 'opens',
    label: 'Launcher opens',
    value: 385,
    prev: 355,
    sub: () => '75% opened it',
    spark: series(12, 28, 14, 14),
  },
  {
    key: 'conversations',
    label: 'Conversations',
    value: 214,
    prev: 370,
    sub: () => '56% started chatting',
    spark: series(13, 28, 8, 9),
  },
  {
    key: 'outcomes',
    label: 'Outcomes reached',
    value: 175,
    prev: 93,
    sub: () => '81.8% of conversations',
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
  change?: number // prod's own change, when we have it
}

// Same topics and numbers as prod (Brightline Org, Last 28 days). `change` is prod's own % so it matches exactly.
export const TOPICS: Topic[] = [
  {
    id: 'insurance',
    name: 'Insurance and pricing',
    description: 'Accepted insurance plans, session costs and out-of-pocket pricing.',
    count: 148,
    prev: 156,
    change: -0.05,
    outcomeRate: 0.58,
    examples: ['Do you take Aetna?', 'How much is a session without insurance?', 'Is the first visit covered?'],
  },
  {
    id: 'care',
    name: 'Care process',
    description: 'How therapy and care work, session length and who the child will see.',
    count: 64,
    prev: 46,
    change: 0.4,
    outcomeRate: 0.9,
    examples: ['How does care work?', 'How long is each session?', 'Will my child see the same therapist?'],
  },
  {
    id: 'getting-started',
    name: 'Getting started',
    description: 'First steps, sign-up and intake.',
    count: 59,
    prev: 37,
    change: 0.61,
    outcomeRate: 0.94,
    examples: ['How do I get started?', 'What do I need for the intake?', 'Can I sign up online?'],
  },
  {
    id: 'availability',
    name: 'Service availability',
    description: 'Whether a service is offered in the visitor’s state or for their need.',
    count: 32,
    prev: 40,
    change: -0.2,
    outcomeRate: 0.62,
    examples: ['Do you offer ADHD testing?', 'Are you available in New Jersey?', 'Do you treat anxiety in teens?'],
  },
  {
    id: 'care-seeking',
    name: 'Care seeking requests',
    description: 'Parents looking for care for their child right now.',
    count: 26,
    prev: 20,
    change: 0.29,
    outcomeRate: 0.8,
    examples: ['I need help for my son', 'Can someone see my daughter this week?'],
  },
  {
    id: 'age',
    name: 'Age eligibility',
    description: 'Which ages are supported.',
    count: 18,
    prev: 15,
    change: 0.23,
    outcomeRate: 0.71,
    examples: ['Do you see 4 year olds?', 'Is there an age limit?'],
  },
  {
    id: 'condition',
    name: 'Condition treatment',
    description: 'Whether a specific condition is treated.',
    count: 16,
    prev: 7,
    change: 1.19,
    outcomeRate: 0.85,
    examples: ['Do you treat OCD?', 'Can you help with autism?'],
  },
  {
    id: 'testing',
    name: 'Assessment and testing',
    description: 'Evaluations, testing and assessments.',
    count: 14,
    prev: 16,
    change: -0.15,
    outcomeRate: 0.8,
    examples: ['Do you do ADHD testing?', 'How long does an assessment take?'],
  },
  {
    id: 'scheduling',
    name: 'Appointment scheduling requests',
    description: 'Booking, rescheduling and cancelling appointments.',
    count: 8,
    prev: 7,
    change: 0.09,
    outcomeRate: 0.33,
    examples: ['Can I move my appointment?', 'How do I book a session?'],
  },
  {
    id: 'location',
    name: 'Clinic location',
    description: 'In-person clinic addresses and directions.',
    count: 8,
    prev: 20,
    change: -0.6,
    outcomeRate: 0.83,
    examples: ['Where is the Brooklyn clinic?', 'Do you have a location in Albany?'],
  },
  {
    id: 'psych-eval',
    name: 'Psychiatric evaluation requests',
    description: 'Requests for a psychiatric evaluation.',
    count: 5,
    prev: 7,
    change: -0.32,
    outcomeRate: 0.8,
    examples: ['Can my child get a psychiatric evaluation?'],
  },
  {
    id: 'clinical-guidance',
    name: 'Clinical guidance requests',
    description: 'Asking for advice about symptoms or care.',
    count: 4,
    prev: 2,
    change: 1.19,
    outcomeRate: 0.75,
    examples: ['Is this normal for a 6 year old?'],
  },
  {
    id: 'account-access',
    name: 'Online account access issues',
    description: 'Trouble logging in to the parent account.',
    count: 4,
    prev: 2,
    change: 1.19,
    outcomeRate: 0.5,
    examples: ['I can’t log in to my account'],
  },
  {
    id: 'provider-directory',
    name: 'Provider directory',
    description: 'Finding a specific provider.',
    count: 4,
    prev: 4,
    change: 0.09,
    outcomeRate: 0.75,
    examples: ['Is Dr. Patel still with you?'],
  },
  {
    id: 'complaints',
    name: 'Service complaints',
    description: 'Unhappy with a past experience.',
    count: 2,
    prev: 0,
    isNew: true,
    outcomeRate: 0.5,
    examples: ['Nobody called me back'],
  },
  {
    id: 'appt-availability',
    name: 'Appointment availability',
    description: 'When the next open slot is.',
    count: 1,
    prev: 2,
    change: -0.45,
    outcomeRate: 1,
    examples: ['When is your next opening?'],
  },
  {
    id: 'appt-form-link',
    name: 'Appointment form link issues',
    description: 'The booking form link doesn’t work.',
    count: 1,
    prev: 2,
    change: -0.45,
    outcomeRate: 1,
    examples: ['The form link is broken'],
  },
  {
    id: 'appt-policy',
    name: 'Appointment policy',
    description: 'Late, missed and cancellation policy.',
    count: 1,
    prev: 0,
    isNew: true,
    outcomeRate: 1,
    examples: ['What if we miss a session?'],
  },
  {
    id: 'careers',
    name: 'Careers',
    description: 'Jobs and hiring.',
    count: 1,
    prev: 2,
    change: -0.45,
    outcomeRate: 1,
    examples: ['Are you hiring therapists?'],
  },
  {
    id: 'chat-deletion',
    name: 'Chat deletion requests',
    description: 'Asking to delete their chat.',
    count: 1,
    prev: 0,
    isNew: true,
    outcomeRate: 1,
    examples: ['Please delete this chat'],
  },
  {
    id: 'crisis',
    name: 'Crisis support requests',
    description: 'Someone in crisis needs urgent help.',
    count: 1,
    prev: 0,
    isNew: true,
    outcomeRate: 1,
    examples: ['My child is in crisis'],
  },
  {
    id: 'external-referral',
    name: 'External referral requests',
    description: 'Asking to be referred somewhere else.',
    count: 1,
    prev: 0,
    isNew: true,
    outcomeRate: 1,
    examples: ['Can you refer us to someone local?'],
  },
  {
    id: 'cancellation',
    name: 'Service cancellation requests',
    description: 'Stopping care.',
    count: 1,
    prev: 0,
    isNew: true,
    outcomeRate: 1,
    examples: ['How do I cancel care?'],
  },
  { id: 'ai-technology-questions', name: 'AI technology', description: 'No conversations in this period.', count: 0, prev: 2, change: -1, outcomeRate: 0, examples: [] },
  { id: 'appointment-form-entry-issues', name: 'Appointment form entry issues', description: 'No conversations in this period.', count: 0, prev: 2, change: -1, outcomeRate: 0, examples: [] },
  { id: 'appointment-status-questions', name: 'Appointment status', description: 'No conversations in this period.', count: 0, prev: 2, change: -1, outcomeRate: 0, examples: [] },
  { id: 'cleaning-estimate-requests', name: 'Cleaning estimate requests', description: 'No conversations in this period.', count: 0, prev: 2, change: -1, outcomeRate: 0, examples: [] },
  { id: 'communication-unsubscribe-requests', name: 'Communication unsubscribe requests', description: 'No conversations in this period.', count: 0, prev: 2, change: -1, outcomeRate: 0, examples: [] },
  { id: 'non-english-support-requests', name: 'Non-English support requests', description: 'No conversations in this period.', count: 0, prev: 2, change: -1, outcomeRate: 0, examples: [] },
  { id: 'program-information-requests', name: 'Program information requests', description: 'No conversations in this period.', count: 0, prev: 2, change: -1, outcomeRate: 0, examples: [] },
  { id: 'referral-process-questions', name: 'Referral process', description: 'No conversations in this period.', count: 0, prev: 2, change: -1, outcomeRate: 0, examples: [] },
  { id: 'school-referral-account-requests', name: 'School referral account requests', description: 'No conversations in this period.', count: 0, prev: 2, change: -1, outcomeRate: 0, examples: [] },
  { id: 'spanish-language-support-requests', name: 'Spanish-language support requests', description: 'No conversations in this period.', count: 0, prev: 2, change: -1, outcomeRate: 0, examples: [] },
  { id: 'support-contact-requests', name: 'Support contact requests', description: 'No conversations in this period.', count: 0, prev: 2, change: -1, outcomeRate: 0, examples: [] },
]

export const UNCLASSIFIED = { count: 52, prev: 55, change: -0.05, outcomeRate: 0.86 }

export const TOPIC_WEEKLY: Record<string, number[]> = Object.fromEntries(
  TOPICS.map((t, i) => [t.id, series(40 + i, 6, t.count / 4, Math.max(2, t.count / 3))]),
)

/* ---------- Topic detail (what opens when you click a topic) ---------- */
export type ChatMsg = { from: 'customer' | 'ai' | 'click'; text: string; mark?: string }
export type EvidenceChat = { when: string; msgs: ChatMsg[] }
export type TopicDetail = {
  kept: number // share of chats that kept going after the first message
  median?: number // typical number of customer messages in a chat
  prev?: { kept: number; answered: number; ai: number } // same numbers for the period before
  answered: number // share of questions that got an answer
  fully?: number // part of `answered` that was fully answered; the rest was partly answered
  human: number // share of chats a human agent joined
  // why + missed: why some didn't get an answer, and those conversations as proof
  asks: { q: string; share: number; answered: number; isNew?: boolean; why?: string; missed?: EvidenceChat[]; answer?: string; sub?: string }[] // sub: the sub-topic this question belongs to
  // goal: what a good answer should do (the rule it broke) · fix: suggested change · confirmed: a person checked it
  issues: {
    title: string; hint: string; share: number; chats: EvidenceChat[]; goal?: string; fix?: string; confirmed?: boolean
    asks?: string[] // the questions this problem shows up in (links What's happening to What they ask)
    tracking?: { fixed: string; before: number; now: number } // after a fix: conversations with this problem before vs at the latest weekly check
  }[]
  findings: { text: string; share: number; isNew?: boolean; rising?: boolean; chats: EvidenceChat[] }[] // shown as "<text> came up in 16 conversations"
  // Customer profiles (moved in from Evaluation): who is chatting in this topic. Only profiles seen in real conversations ("observed");
  // profiles Evaluation made up for testing ("intended", e.g. BrightLife Kids family) stay in Evaluation. answered = share answered; top = what they ask most
  profiles?: { name: string; share: number; answered: number; top: string }[]
  sources: { name: string; share: number; answered?: number }[] // answered: share of this page's conversations that got an answer (defaults to the topic's)
  // For "What's happening". Rates and findings come from a weekly sample, not every conversation.
  sample?: number // how many conversations were checked
  risks?: { title: string; hint: string; share: number; chats: EvidenceChat[] }[] // the AI said something it shouldn't
  working?: { title: string; hint: string; share?: number; chats?: EvidenceChat[] }[] // what's going well (share + chats: how often, and proof)
  sentiment?: { happy: number; neutral: number; frustrated: number } // how people felt
  // Journeys into other topics: in the same conversation, after this topic's question, people asked something from another topic.
  // hint = the journey; fix = what to do about it; n = of the sample
  alsoAsked?: { id: string; n: number; hint?: string; fix?: string; chats?: EvidenceChat[] }[]
  order?: string[] // findings to show first, by name (e.g. the ones prod shows today)
}

/** When the weekly sample was last checked. */
export const SAMPLE_CHECKED = 'Oct 25'


const DETAILS: Record<string, TopicDetail> = {
  insurance: {
    kept: 0.74,
    prev: { kept: 0.68, answered: 0.95, ai: 0.96 },
    answered: 0.92,
    fully: 0.6,
    human: 0,
    asks: [
      // Prod numbers for this topic (148 conversations): share = conversations / 148, so the counts match prod
      { q: 'What does care cost?', share: 1.3378, answered: 0.71, answer: 'With insurance, most families pay about $46 per therapy session after their deductible. Without insurance, a session is $180.', why: 'The AI didn’t give current self-pay rates.', missed: [{ when: 'Sep 17, 11:05 am', msgs: [{ from: 'customer', text: 'We don’t have insurance right now. How much would a session cost?' }, { from: 'ai', text: 'For current self-pay rates, call us at [(888) 255-1401](tel:+18882551401).', mark: 'For current self-pay rates, call us' }] }] },
      { q: 'Check insurance coverage', share: 1.2973, answered: 0.86, answer: 'You’re in network with Cigna. Our team can confirm your exact coverage within one business day.', why: 'Asked about a plan the AI has no details for.', missed: [{ when: 'Sep 21, 5:30 pm', msgs: [{ from: 'customer', text: 'Does my Oscar plan cover therapy?' }, { from: 'ai', text: 'I don’t have details on Oscar plans. Our team can check for you.', mark: 'I don’t have details on Oscar plans' }] }] },
      { q: 'Which plans are accepted here?', share: 1.1757, answered: 1, answer: 'We accept Aetna, Anthem, Cigna, Optum and Carelon, depending on your state.' },
      { q: 'Is this insurance accepted?', share: 0.2162, answered: 1, answer: 'Yes, we’re in network with Northwell Direct.' },
      { q: 'Is Medicaid accepted?', share: 0.1014, answered: 1, answer: 'We don’t accept Medicaid, Medicare, or most government-sponsored plans.' },
    ],
    issues: [
      {
        title: 'Answers are too long',
        asks: ['What does care cost?'],
        tracking: { fixed: 'Oct 18', before: 6, now: 2 },
        goal: 'Keep answers short and clear',
        fix: 'Give the price first, then the details.',
        confirmed: true,
        hint: 'Replies about cost run 8–10 lines, and people leave before they reach the price.',
        share: 0.25,
        chats: [
          {
            when: 'Sep 22, 4:12 pm',
            msgs: [
              { from: 'customer', text: 'How much is a session without insurance?' },
              { from: 'ai', text: 'Great question! Our pricing depends on a few things, like the type of care, how often you meet, and whether your plan covers part of it. Many families use insurance, and we are in network with Aetna, Anthem, Cigna and Optum. If you would rather pay yourself, our team can walk you through the options, including payment plans. The best next step is a free eligibility check, where our team looks at your details and gets back to you within one business day.' },
              { from: 'customer', text: 'ok but just the price please', mark: 'just the price please' },
            ],
          },
          {
            when: 'Sep 20, 9:30 am',
            msgs: [
              { from: 'click', text: 'Insurance & pricing' },
              { from: 'customer', text: 'What does a first visit cost?' },
              { from: 'ai', text: 'Thanks for asking! The first visit is an intake session where a care coordinator gets to know your family, your goals and your child’s needs. After that, we match you with a clinician. Costs vary based on your plan, your deductible and your copay, so the most accurate way to know is to share your insurance details with our team.' },
              { from: 'customer', text: 'too much text, nvm', mark: 'too much text' },
            ],
          },
        ],
      },
      {
        title: 'Didn’t give current self-pay rates',
        asks: ['What does care cost?', 'Check insurance coverage'],
        goal: 'Give a price when asked',
        fix: 'Add your current self-pay rates to Knowledge.',
        hint: 'When people asked about insurance coverage, the answer didn’t give current self-pay rates.',
        share: 0.2,
        chats: [
          {
            when: 'Sep 21, 1:15 pm',
            msgs: [
              { from: 'click', text: 'Insurance & pricing' },
              { from: 'ai', text: 'Let me check our current insurance details. I need to correct that. The self-pay amounts and cancellation fees in the sections above didn’t come from our current information, so please don’t rely on them. The insurance details and the HSA/FSA and superbill details are accurate. For self-pay, you pay after your first appointment. We send a secure link to set up a credit card, and we accept HSA and FSA cards. For current self-pay rates or cancellation terms, call us at [(888) 255-1401](tel:+18882551401). We’re open 8am–7pm ET, Monday–Friday. You can also [request an appointment](https://www.brightline.com/care/appointment-from-chatbot/) online, and our team will check your eligibility.', mark: 'For current self-pay rates or cancellation terms, call us' },
            ],
          },
          {
            when: 'Sep 19, 3:40 pm',
            msgs: [
              { from: 'click', text: 'Insurance & pricing' },
              { from: 'ai', text: 'Let me check our current insurance and pricing details. I need to correct something. The dollar amounts and the claim timing in that card didn’t come from our current information, so please don’t rely on them. I’m sorry about that. What I can confirm is this: After your first appointment, we send you a secure link to set up payment. We accept all major credit cards, plus HSA and FSA cards. Once your insurance processes a claim, usually within 45 to 60 days, we tell you if there’s a balance left. All of our services are HSA and FSA eligible. We can give you superbills when you ask, or send them monthly. For current self-pay rates and our cancellation policy, call us at [(888) 255-1401](tel:+18882551401). We’re open 8am–7pm ET, Monday–Friday. You can also [request an appointment](https://www.brightline.com/care/appointment-from-chatbot/) online, and we’ll check your eligibility.', mark: 'For current self-pay rates and our cancellation policy, call us' },
            ],
          },
          {
            when: 'Sep 17, 11:05 am',
            msgs: [
              { from: 'click', text: 'Insurance & pricing' },
              { from: 'customer', text: 'We don’t have insurance right now. How much would a session cost?' },
              { from: 'ai', text: 'Thanks for asking. Many families pay for care themselves, and we can help with that. You pay after your first appointment, and we accept all major credit cards plus HSA and FSA cards. We can also give you superbills if you want to send them to an insurance plan later. For current self-pay rates, call us at [(888) 255-1401](tel:+18882551401). We’re open 8am–7pm ET, Monday–Friday. You can also [request an appointment](https://www.brightline.com/care/appointment-from-chatbot/) online, and our team will reach out.', mark: 'For current self-pay rates, call us' },
            ],
          },
        ],
      },
    ],
    findings: [],
    sources: [
      { name: '/start/brightline/', share: 0.42, answered: 0.96 },
      { name: '/', share: 0.33, answered: 0.92 },
      { name: '/start/back-to-school/', share: 0.15, answered: 0.8 },
    ],
  },
  availability: {
    kept: 0.7,
    prev: { kept: 0.72, answered: 0.7, ai: 0.9 },
    answered: 0.81,
    fully: 0.55,
    human: 0.05,
    asks: [
      { q: 'Do you offer ADHD testing?', sub: 'Services', share: 0.45, answered: 0.95 },
      { q: 'Are you available in my state?', sub: 'Locations', share: 0.38, answered: 0.6, why: 'The AI doesn’t know which states are covered.', missed: [{ when: 'Sep 22, 10:05 am', msgs: [{ from: 'customer', text: 'Are you available in Pennsylvania?' }, { from: 'ai', text: 'I’m not sure if we offer care in Pennsylvania. Please contact our team.', mark: 'I’m not sure' }] }] },
      { q: 'Do you treat anxiety in teens?', sub: 'Services', share: 0.2, answered: 1 },
      { q: 'Do you have a clinic in New Jersey?', sub: 'Locations', share: 0.14, answered: 0.4, isNew: true, why: 'New Jersey isn’t in the AI’s list of locations.', missed: [{ when: 'Sep 22, 10:05 am', msgs: [{ from: 'customer', text: 'Do you have a clinic in New Jersey?' }, { from: 'ai', text: 'I’m not sure if we have a clinic in New Jersey.', mark: 'I’m not sure' }] }] },
    ],
    issues: [
      {
        title: 'Not sure which states are covered',
        asks: ['Are you available in my state?', 'Do you have a clinic in New Jersey?'],
        goal: 'Answer which states you cover',
        fix: 'Add the list of states you cover to Knowledge.',
        hint: 'The AI says “I’m not sure” when asked about a state.',
        share: 0.24,
        chats: [
          {
            when: 'Sep 22, 10:05 am',
            msgs: [
              { from: 'customer', text: 'Are you available in New Jersey?' },
              { from: 'ai', text: 'I’m not sure if we offer care in New Jersey. Please contact our team.', mark: 'I’m not sure' },
            ],
          },
        ],
      },
    ],
    findings: [
      {
        text: 'New Jersey',
        share: 0.14,
        isNew: true,
        chats: [
          {
            when: 'Sep 22, 10:05 am',
            msgs: [{ from: 'customer', text: 'Do you have a clinic in New Jersey?', mark: 'New Jersey' }],
          },
        ],
      },
    ],
    sources: [
      { name: '/what-we-treat/', share: 0.4 },
      { name: '/', share: 0.35 },
      { name: '/start/brightline/', share: 0.15 },
    ],
  },
  scheduling: {
    kept: 0.6,
    prev: { kept: 0.55, answered: 0.6, ai: 0.75 },
    answered: 0.5,
    fully: 0.3,
    human: 0.33,
    asks: [
      { q: 'Can I move my appointment?', sub: 'Rescheduling', share: 0.6, answered: 0.2, why: 'The AI can’t change appointments in chat.', missed: [{ when: 'Sep 21, 9:12 am', msgs: [{ from: 'customer', text: 'Can I move my appointment to Friday?' }, { from: 'ai', text: 'I can’t change appointments here. Please call our team.', mark: 'I can’t change appointments here' }] }] },
      { q: 'How do I book a session?', sub: 'Booking', share: 0.4, answered: 1 },
    ],
    issues: [
      {
        title: 'Can’t move an appointment in chat',
        asks: ['Can I move my appointment?'],
        goal: 'Help people change appointments',
        fix: 'Connect your booking tool so the AI can move appointments.',
        confirmed: true,
        hint: 'The AI can only share a phone number, so people leave.',
        share: 0.6,
        chats: [
          {
            when: 'Sep 21, 9:12 am',
            msgs: [
              { from: 'customer', text: 'Can I move my appointment to Friday?' },
              { from: 'ai', text: 'I can’t change appointments here. Please call [(888) 255-7040](tel:8882557040).', mark: 'I can’t change appointments here' },
            ],
          },
        ],
      },
    ],
    findings: [],
    sources: [
      { name: '/start/request-appointment/', share: 0.6 },
      { name: '/', share: 0.4 },
    ],
  },
}

// Richer "What's happening" for the hand-written topics.
Object.assign(DETAILS.insurance, {
  sample: 15,
  sentiment: { happy: 0.56, neutral: 0.32, frustrated: 0.12 },
  working: [
    {
      title: 'Price answers lead to bookings',
      hint: 'People who got a clear price usually went on to book a session.',
      share: 0.47,
      chats: [
        {
          when: 'Sep 22, 11:03 am',
          msgs: [
            { from: 'customer', text: 'How much is a session with insurance?' },
            { from: 'ai', text: 'With insurance, most families pay about $46 a session after their deductible.', mark: 'about $46 a session' },
            { from: 'click', text: 'Book a session' },
          ],
        },
        {
          when: 'Sep 20, 4:26 pm',
          msgs: [
            { from: 'customer', text: 'What does it cost if I pay myself?' },
            { from: 'ai', text: 'A session is $180 if you pay yourself. Want me to find a time?', mark: '$180' },
            { from: 'customer', text: 'yes please, next week' },
          ],
        },
      ],
    },
  ],
  alsoAsked: [
    { id: 'location', n: 2, hint: 'After asking about price, 2 of 15 also asked where the clinic is.', fix: 'Mention the nearest clinic in price answers.', chats: [
        { when: 'Sep 22, 11:40 am', msgs: [
          { from: 'customer', text: 'I have Northwell direct insurance' },
          { from: 'ai', text: 'Let me check our Northwell Direct details. Good news: we’re in network with Northwell Direct. If you share your plan details with our team, we can tell you which of our clinicians are covered. Families with in-network coverage have paid these averages per visit after meeting their deductible. Therapy averages $33 a session. Psychiatry averages $38. Psychological testing averages $42. Every plan is different, so treat these as estimates. For your exact copay or deductible, call the number on the back of your insurance card. When you’re ready, you can [request an appointment](https://www.brightline.com/care/appointment-from-chatbot/) or call us at [(888) 255-1401](tel:+18882551401). We’re open 8am–7pm ET, Monday–Friday.' },
          { from: 'customer', text: 'I live In merrick', mark: 'I live In merrick' },
          { from: 'ai', text: 'Let me look up our clinics near Merrick. Our Long Island clinic is the one closest to you.' },
          { from: 'click', text: 'View clinic page — Lake Success' },
          { from: 'ai', text: 'Here’s [our Lake Success clinic page](https://www.brightline.com/locations/new-york/lake-success/).' },
        ] },
        { when: 'Sep 20, 10:05 am', msgs: [
          { from: 'click', text: 'Insurance & pricing' },
          { from: 'ai', text: 'Let me pull up our current insurance details. We work with many commercial plans, like Aetna, Anthem, Cigna, Optum, and Carelon, depending on your state. We don’t accept Medicaid, Medicare, or most government-sponsored plans. We can’t quote your exact out-of-pocket cost, but we can run an eligibility check for you. Please treat the claim timing, in-network details, and cancellation notice window in the sections above as general. Our team can confirm the specifics for your plan. When you’re ready, you can [request an appointment](https://www.brightline.com/care/appointment-from-chatbot/). You can also call us at [(888) 255-1401](tel:+18882551401), open 8am–7pm ET, Monday–Friday. It’s Saturday, so a call now would reach voicemail. Requesting online is faster.' },
          { from: 'customer', text: 'what is the location', mark: 'what is the location' },
          { from: 'ai', text: 'Let me pull up our clin. We offer care online in NY, NJ, CT, MA, and WA, and in person at our New York clinics. You can see every clinic on [our locations](https://www.brightline.com/locations/) page. Want help finding the right fit? You can [request an appointment](https://www.brightline.com/care/appointment-from-chatbot/). Since it’s Saturday, a call now would reach voicemail. Requesting online is faster. Our phone line, [(888) 255-1401](tel:+18882551401), is open 8am–7pm ET, Monday–Friday.' },
          { from: 'customer', text: 'what is the closest one to Great Neck, NY' },
          { from: 'ai', text: 'Let me check our clinics near Great Neck. This is our Long Island clinic, and it’s the one that fits your area.' },
        ] },
      ] },
    { id: 'getting-started', n: 2, hint: 'After hearing the price, 2 of 15 asked how to get started.', fix: 'End price answers with a link to book.', chats: [
        { when: 'Sep 21, 9:15 am', msgs: [
          { from: 'click', text: 'Insurance & pricing' },
          { from: 'customer', text: 'Is the first visit covered by insurance?' },
          { from: 'ai', text: 'Most plans cover the first visit. Our team checks your coverage before you book.' },
          { from: 'customer', text: 'How do I book a first session?', mark: 'How do I book a first session?' },
        ] },
        { when: 'Sep 19, 7:50 pm', msgs: [
          { from: 'customer', text: 'What does care cost with Cigna?' },
          { from: 'ai', text: 'We’re in network with Cigna, so you usually pay your normal copay.' },
          { from: 'customer', text: 'Ok, what do I do to get started?', mark: 'what do I do to get started?' },
        ] },
      ] },
  ],
  order: ['Price answers lead to bookings', 'Didn’t give current self-pay rates', 'Clinic location', 'Getting started'],
} satisfies Partial<TopicDetail>)
Object.assign(DETAILS.availability, {
  sample: 15,
  sentiment: { happy: 0.5, neutral: 0.32, frustrated: 0.18 },
  working: [{ title: 'ADHD testing answers are clear', hint: '95% of ADHD testing questions got a full answer.' }],
  alsoAsked: [
    { id: 'location', n: 3, hint: 'After asking if a service is offered, 3 of 15 also asked where the clinic is.', fix: 'Add clinic locations to service answers.', chats: [
        { when: 'Sep 22, 10:20 am', msgs: [
          { from: 'customer', text: 'Do you offer ADHD testing?' },
          { from: 'ai', text: 'Yes, we offer ADHD testing for children and teens.' },
          { from: 'customer', text: 'Is there a clinic in Dallas?', mark: 'Is there a clinic in Dallas?' },
        ] },
        { when: 'Sep 20, 2:45 pm', msgs: [
          { from: 'customer', text: 'Do you treat anxiety in teens?' },
          { from: 'ai', text: 'Yes, we treat anxiety in children and teens.' },
          { from: 'customer', text: 'Where are you located?', mark: 'Where are you located?' },
        ] },
        { when: 'Sep 17, 6:10 pm', msgs: [
          { from: 'customer', text: 'Do you do therapy for kids?' },
          { from: 'ai', text: 'Yes, we offer therapy for children ages 4 and up.' },
          { from: 'customer', text: 'Which clinic is closest to me?', mark: 'Which clinic is closest to me?' },
        ] },
      ] },
    { id: 'insurance', n: 2, hint: 'After asking about services, 2 of 15 asked if their insurance is accepted.', fix: 'Add accepted plans to service answers.', chats: [
        { when: 'Sep 21, 12:30 pm', msgs: [
          { from: 'customer', text: 'Do you offer ADHD testing?' },
          { from: 'ai', text: 'Yes, we offer ADHD testing for children and teens.' },
          { from: 'customer', text: 'Do you take Blue Cross?', mark: 'Do you take Blue Cross?' },
        ] },
        { when: 'Sep 18, 4:00 pm', msgs: [
          { from: 'customer', text: 'Do you treat anxiety in teens?' },
          { from: 'ai', text: 'Yes, we treat anxiety in children and teens.' },
          { from: 'customer', text: 'Is it covered by insurance?', mark: 'Is it covered by insurance?' },
        ] },
      ] },
  ],
} satisfies Partial<TopicDetail>)
Object.assign(DETAILS.scheduling, {
  sample: 15,
  sentiment: { happy: 0.3, neutral: 0.3, frustrated: 0.4 },
  alsoAsked: [{ id: 'getting-started', n: 2, hint: 'Some people trying to book hadn’t signed up yet, so 2 of 15 asked how to get started.', fix: 'Add a sign-up link to booking answers.', chats: [
        { when: 'Sep 22, 3:30 pm', msgs: [
          { from: 'customer', text: 'Can I book an appointment for next week?' },
          { from: 'ai', text: 'Sure. Are you already a Brightline member?' },
          { from: 'customer', text: 'No, how do I sign up?', mark: 'how do I sign up?' },
        ] },
        { when: 'Sep 19, 10:10 am', msgs: [
          { from: 'customer', text: 'I want to schedule a first visit' },
          { from: 'ai', text: 'Happy to help. First, let’s set up your account.' },
          { from: 'customer', text: 'What do I need to get started?', mark: 'What do I need to get started?' },
        ] },
      ] }],
} satisfies Partial<TopicDetail>)

/** Detail for a topic. Topics without hand-written detail get a simple one built from their examples. */
// Profiles shared by topics without hand-written ones (names from the Evaluation tab in prod)
// The first three come from Evaluation's observed profiles; the rest are mock groups that show up in real chats
const DEFAULT_PROFILES = [
  { name: 'Parent seeking care for a minor', share: 0.6, answered: 0.92, top: 'What does care look like?' },
  { name: 'Family member of a patient', share: 0.13, answered: 0.95, top: 'How do I reach my child’s clinician?' },
  { name: 'Educator or school staff', share: 0.1, answered: 0.9, top: 'Do you work with schools?' },
  { name: 'Adult seeking care for themselves', share: 0.08, answered: 0.7, top: 'Do you treat adults?' },
  { name: 'Doctor or therapist referring a child', share: 0.05, answered: 0.85, top: 'How do I refer a patient?' },
  { name: 'Teen asking for themselves', share: 0.04, answered: 0.8, top: 'Can I talk to someone without my parents?' },
]
DETAILS.insurance.profiles = [
  { name: 'Parent seeking care for a minor', share: 0.58, answered: 0.82, top: 'What does care cost?' },
  { name: 'Family member of a patient', share: 0.14, answered: 0.9, top: 'Check insurance coverage' },
  { name: 'Educator or school staff', share: 0.09, answered: 0.96, top: 'Which plans are accepted here?' },
  { name: 'Adult seeking care for themselves', share: 0.08, answered: 0.6, top: 'Does my insurance cover adult therapy?' },
  { name: 'Doctor or therapist referring a child', share: 0.06, answered: 0.85, top: 'Which plans do you take for referrals?' },
  { name: 'Teen asking for themselves', share: 0.05, answered: 0.75, top: 'Is it free for students?' },
]

export function topicDetail(t: Topic): TopicDetail {
  if (DETAILS[t.id]) return { ...DETAILS[t.id], profiles: DETAILS[t.id].profiles ?? DEFAULT_PROFILES }
  const shares = [0.5, 0.3, 0.2]
  return {
    kept: 0.8,
    prev: { kept: 0.76, answered: 0.9, ai: 1 },
    answered: 0.93,
    human: 0,
    asks: t.examples.filter((q) => q !== '—').map((q, i) => ({ q, share: shares[i] ?? 0.1, answered: [0.95, 0.9, 0.85][i] ?? 0.9 })),
    issues: [],
    findings: [],
    sample: 15,
    sentiment: { happy: 0.62, neutral: 0.3, frustrated: 0.08 },
    working: [{ title: 'Questions here are answered well', hint: 'Most people got a full answer, and few left early.' }],
    profiles: DEFAULT_PROFILES,
    sources: [
      { name: '/', share: 0.45 },
      { name: '/start/brightline/', share: 0.3 },
      { name: '/what-we-treat/', share: 0.1 },
    ],
  }
}

export const SAMPLE_CONVERSATIONS = [
  { who: 'Visitor 4F2A', first: 'Do you take Aetna for teens?', when: 'Sep 22, 4:12 pm', channel: 'Web', outcome: true, msgs: 9 },
  { who: 'Visitor 91C0', first: 'How much is a session without insurance?', when: 'Sep 22, 11:03 am', channel: 'Web', outcome: false, msgs: 4 },
  { who: 'Sarah M.', first: 'Is the first assessment covered by my plan?', when: 'Sep 21, 7:48 pm', channel: 'WhatsApp', outcome: true, msgs: 12 },
  { who: 'Visitor 22BD', first: 'Do you take my insurance plan?', when: 'Sep 21, 1:15 pm', channel: 'Web', outcome: false, msgs: 3 },
  { who: 'Visitor 7E19', first: 'What does a session cost?', when: 'Sep 20, 9:30 am', channel: 'Web', outcome: true, msgs: 7 },
  { who: 'James K.', first: 'Is there a sliding scale?', when: 'Sep 19, 6:02 pm', channel: 'Web', outcome: true, msgs: 6 },
]

export const FUNNEL = [
  { key: 'impressions', label: 'Launcher shown', value: 514 },
  { key: 'opens', label: 'Launcher opened', value: 385 },
  { key: 'conversations', label: 'Conversation started', value: 214, note: 'Includes 14 started from a direct link, without the launcher' },
  { key: 'outcomes', label: 'Outcome reached', value: 175 },
]

// The opening question: every conversation starts with it. People tap a button or type their own message.
// Like production, each choice is its own branch; `reached` is how many of that branch reached an outcome (sample).
export const ENTRY_CHOICES = {
  field: 'Opening question',
  builderName: 'Top Button',
  total: 214,
  reached: 175,
  outcomeName: 'AI Agent',
  choices: [
    { label: 'Insurance & pricing', value: 67, reached: 50 },
    { label: 'How does care work?', value: 35, reached: 31 },
    { label: 'How do I get started?', value: 29, reached: 27 },
    { label: 'Something else', value: 24, reached: 15 },
    { label: 'Typed their own', value: 59, reached: 52, manual: true },
  ],
}

export type Week = { label: string; impressions: number; conversations: number; outcomes: number; partial?: boolean; marker?: string }

export const WEEKS: Week[] = [
  { label: 'Aug 24', impressions: 126, conversations: 28, outcomes: 6 },
  { label: 'Aug 31', impressions: 105, conversations: 53, outcomes: 47, marker: 'Outcome tracking started' },
  { label: 'Sep 7', impressions: 115, conversations: 55, outcomes: 53 },
  { label: 'Sep 14', impressions: 124, conversations: 50, outcomes: 50 },
  { label: 'Sep 21', impressions: 60, conversations: 28, outcomes: 19, partial: true },
]

// 13 weeks for "Last 90 days": 8 earlier weeks (before outcome tracking), then the same weeks as WEEKS.
export const WEEKS_90: Week[] = [
  { label: 'Jun 29', impressions: 118, conversations: 41, outcomes: 0 },
  { label: 'Jul 6', impressions: 124, conversations: 45, outcomes: 0 },
  { label: 'Jul 13', impressions: 131, conversations: 47, outcomes: 0 },
  { label: 'Jul 20', impressions: 109, conversations: 38, outcomes: 0 },
  { label: 'Jul 27', impressions: 116, conversations: 42, outcomes: 0 },
  { label: 'Aug 3', impressions: 127, conversations: 46, outcomes: 0 },
  { label: 'Aug 10', impressions: 121, conversations: 44, outcomes: 0 },
  { label: 'Aug 17', impressions: 112, conversations: 39, outcomes: 0 },
  ...WEEKS,
]

/** Adds weeks up into months (by the month each week starts in), so weekly and monthly always agree. */
export function toMonths(weeks: Week[]): Week[] {
  const by: Record<string, Week> = {}
  for (const w of weeks) {
    const m = w.label.split(' ')[0]
    const cur = (by[m] ??= { label: m, impressions: 0, conversations: 0, outcomes: 0 })
    cur.impressions += w.impressions
    cur.conversations += w.conversations
    cur.outcomes += w.outcomes
    if (w.partial) cur.partial = true
    if (w.marker) cur.marker = w.marker
  }
  return Object.values(by)
}

export const MONTHS: Week[] = [
  { label: 'Jun', impressions: 1720, conversations: 318, outcomes: 0 },
  { label: 'Jul', impressions: 1912, conversations: 366, outcomes: 0 },
  { label: 'Aug', impressions: 1604, conversations: 318, outcomes: 61, marker: 'Outcome tracking started' },
  { label: 'Sep', impressions: 412, conversations: 176, outcomes: 151, partial: true },
]

export type SourceRow = { name: string; hint?: string; impressions: number | null; conversations: number; outcomes: number }

/** Visits from programs, not people (search crawlers, uptime checkers, AI and spam bots). Kept out of Sources. */
export const BOTS = [
  { name: 'Googlebot', kind: 'Search crawler', visits: 58 },
  { name: 'Bingbot', kind: 'Search crawler', visits: 27 },
  { name: 'GPTBot', kind: 'AI crawler', visits: 21 },
  { name: 'UptimeRobot', kind: 'Uptime checker', visits: 16 },
  { name: 'Unknown bots', kind: 'Other', visits: 10 },
]

export const SOURCES: Record<string, SourceRow[]> = {
  Pages: [
    { name: '/', hint: 'Home page', impressions: 81, conversations: 65, outcomes: 63 },
    { name: '/start/brightline/', impressions: 111, conversations: 54, outcomes: 35 },
    { name: '/start/back-to-school/', impressions: 182, conversations: 25, outcomes: 19 },
    { name: '/chat/brightline', impressions: 18, conversations: 14, outcomes: 14 },
    { name: '/start/albany/', impressions: 14, conversations: 9, outcomes: 9 },
    { name: '/what-we-treat/', impressions: 6, conversations: 5, outcomes: 5 },
    { name: '/start/brooklyn/', impressions: 4, conversations: 4, outcomes: 2 },
    { name: '/start/request-appointment/', impressions: 7, conversations: 4, outcomes: 2 },
  ],
  Sites: [
    { name: 'hellobrightline.com', impressions: 394, conversations: 171, outcomes: 140 },
    { name: 'care.hellobrightline.com', impressions: 102, conversations: 29, outcomes: 21 },
    { name: 'chat.hellotars.com', impressions: 18, conversations: 14, outcomes: 14 },
  ],
  Referrers: [
    { name: 'Google', impressions: 238, conversations: 96, outcomes: 81 },
    { name: 'No referrer', hint: 'Typed URL, bookmark or app', impressions: 171, conversations: 72, outcomes: 60 },
    { name: 'Instagram', impressions: 62, conversations: 22, outcomes: 17 },
    { name: 'Facebook', impressions: 31, conversations: 18, outcomes: 13 },
    { name: 'Bing', impressions: 12, conversations: 6, outcomes: 4 },
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

// What people picked for each question in the chat, in the order the chat asks them.
// `builderName` is the field name in the bot builder, shown only in a tooltip.
// Opening question choices are from production; the later question is sample data.
export const FIELDS = [
  {
    name: 'Opening question',
    builderName: 'Top Button',
    question: 'What would you like to know?',
    when: 'Buttons shown when the chat opens',
    asked: null as number | null,
    answered: 36,
    choices: ENTRY_CHOICES.choices,
  },
  {
    name: 'Next step question',
    builderName: 'Button',
    question: 'What would you like to do next?',
    when: 'Asked later in the chat',
    asked: 178 as number | null,
    answered: 176,
    choices: [
      { label: 'Talk to someone', value: 74 },
      { label: 'Check my coverage', value: 52 },
      { label: 'Find a location', value: 31 },
      { label: 'Manual input', value: 19, manual: true },
    ],
  },
]

// Details people shared in the chat (sample data). `top` is the most common answer, for fields with set options.
export const CAPTURED = {
  conversations: 214,
  anyDetail: 131,
  fields: [
    { name: 'Name', value: 128 },
    { name: 'Email', value: 96 },
    { name: 'Zip code', value: 88, top: '94110' },
    { name: 'Phone', value: 71 },
    { name: 'Insurance', value: 64, top: 'Aetna' },
    { name: 'Child’s age', value: 52, top: '6–10 years' },
  ] as { name: string; value: number; top?: string }[],
}

// Where people are (sample data). Adds up to the page totals: 514 impressions, 214 conversations, 175 outcomes.
export const COUNTRIES = [
  { name: 'United States', flag: '🇺🇸', impressions: 352, conversations: 148, outcomes: 124 },
  { name: 'India', flag: '🇮🇳', impressions: 74, conversations: 31, outcomes: 25 },
  { name: 'Canada', flag: '🇨🇦', impressions: 41, conversations: 16, outcomes: 12 },
  { name: 'United Kingdom', flag: '🇬🇧', impressions: 27, conversations: 11, outcomes: 8 },
  { name: 'Australia', flag: '🇦🇺', impressions: 12, conversations: 5, outcomes: 4 },
  { name: 'Other', flag: '🌐', impressions: 8, conversations: 3, outcomes: 2 },
]

export const REPLY = {
  median: 12.2,
  p90: 20.2,
  max: 23.9,
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
