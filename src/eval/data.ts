// Mock data for the Evaluation redesign. Goal and scenario names come from the Brightline AI Info Agent in prod
// (Objectives and Scenarios tabs), rewritten in plain words. Results are made up for the prototype.

export type EvalMsg = { from: 'customer' | 'ai' | 'click'; text: string; mark?: string }
export type FailedCase = { title: string; why: string; chat: EvalMsg[] }
export type Goal = {
  id: string
  name: string // plain name shown to customers
  was: string // the prod objective name, for reference
  about: string // one line: what a pass looks like
  passed: number
  total: number
  failed?: FailedCase[]
}

export const AGENT = 'Brightline AI Info Agent'
export const TESTED = 'Nov 2, 4:10 pm'
export const TEST_CASES = 50

export const GOALS: Goal[] = [
  { id: 'after-hours', name: 'After-Hours Intent Capture', was: 'After-Hours Intent Capture', about: 'The chatbot successfully captures and processes user intent for scheduling or information outside of regular intake team hours (8am-7pm ET).', passed: 6, total: 6 },
  { id: 'links', name: 'Clean Attribution of Chatbot Actions', was: 'Clean Attribution of Chatbot Actions', about: 'Chatbot-driven actions are clearly attributable through the use of Tars-dedicated links and phone numbers.', passed: 7, total: 7 },
  {
    id: 'website',
    name: 'Answers from the website',
    was: 'Accurate Website Information',
    about: 'Every answer comes from Brightline’s own website and FAQ.',
    passed: 7,
    total: 12,
    failed: [
      {
        title: 'Parent asks about pricing, then asks again',
        why: 'Gave a phone number instead of the self-pay price.',
        chat: [
          { from: 'customer', text: 'hey, how much does it cost for my kid to get help?' },
          { from: 'ai', text: 'For current self-pay rates, call us at (888) 255-1401. We’re open 8am–7pm ET, Monday–Friday.', mark: 'call us at (888) 255-1401' },
          { from: 'customer', text: 'so what’s the pricing?' },
        ],
      },
      {
        title: 'Parent asks if Medicaid is accepted',
        why: 'Said “it depends on your plan” instead of a clear no.',
        chat: [
          { from: 'customer', text: 'do you take medicaid' },
          { from: 'ai', text: 'It depends on your plan and your state. Our team can check for you.', mark: 'It depends on your plan and your state.' },
        ],
      },
      {
        title: 'Parent asks the price question twice',
        why: 'Repeated the same answer word for word the second time.',
        chat: [
          { from: 'customer', text: 'What does a first visit cost?' },
          { from: 'ai', text: 'Costs depend on your plan. Our team can check your coverage.' },
          { from: 'customer', text: 'I mean without insurance' },
          { from: 'ai', text: 'Costs depend on your plan. Our team can check your coverage.', mark: 'Costs depend on your plan. Our team can check your coverage.' },
        ],
      },
      {
        title: 'Parent asks if their son needs ADHD testing',
        why: 'Guessed a diagnosis instead of explaining testing from the website.',
        chat: [
          { from: 'customer', text: 'my son can’t focus at school, does he need adhd testing?' },
          { from: 'ai', text: 'Those signs sound like ADHD. Our psychological testing can confirm it.', mark: 'Those signs sound like ADHD.' },
        ],
      },
      {
        title: 'Educator asks for brochures for parents',
        why: 'Made up a printed brochure that isn’t on the website.',
        chat: [
          { from: 'customer', text: 'Do you have brochures I can hand out to parents?' },
          { from: 'ai', text: 'Yes! We can mail you a pack of our printed family brochures.', mark: 'We can mail you a pack of our printed family brochures.' },
        ],
      },
    ],
  },
  {
    id: 'next-step',
    name: 'One clear next step to book',
    was: 'Clear Next Step for Booking Intent',
    about: 'When a parent wants to book, the AI gives one clear next step.',
    passed: 6,
    total: 8,
    failed: [
      {
        title: 'Parent ready to book after hours',
        why: 'Gave the form and the phone number together, with no clear first step.',
        chat: [
          { from: 'customer', text: 'ok i want to book something for my son' },
          { from: 'ai', text: 'You can request an appointment online, or call (888) 255-1401, or email our team, and someone will reach out.', mark: 'or call (888) 255-1401, or email our team' },
        ],
      },
      {
        title: 'BrightLife Kids family moving to a Brightline clinic',
        why: 'Didn’t say how to book at a Brightline clinic.',
        chat: [
          { from: 'customer', text: 'We’re in BrightLife Kids. Can we see someone at your clinic instead?' },
          { from: 'ai', text: 'BrightLife Kids is a separate program. Is there anything else I can help with?', mark: 'Is there anything else I can help with?' },
        ],
      },
    ],
  },
  { id: 'crisis', name: 'Shows the crisis script on risk words', was: 'Crisis Script Displayed on Risk Word', about: 'If a risk word comes up, the 911 / 988 script shows right away.', passed: 5, total: 5 },
  { id: 'clinician', name: 'Doesn’t offer to pick a clinician', was: 'Clinicians Not Selectable', about: 'Families are matched at intake, so the AI never offers names to choose from.', passed: 4, total: 4 },
  { id: 'terms', name: 'Uses Brightline’s words', was: 'Correct Use of Approved Terms', about: 'Warm, plain “living room” language and Brightline’s approved terms.', passed: 8, total: 8 },
  { id: 'engagement', name: 'Keeps people chatting', was: 'Increased Engagement Baseline', about: 'People keep chatting after their first message.', passed: 6, total: 6 },
]

/** Which topics the scenarios come from (the same topic list as Analytics). */
export const CASES_BY_TOPIC = [
  { topic: 'Insurance and pricing', n: 14 },
  { topic: 'Getting started', n: 9 },
  { topic: 'Care program', n: 8 },
  { topic: 'Scheduling', n: 7 },
  { topic: 'Insurance plans', n: 6 },
  { topic: 'Other questions', n: 6 },
]

/** Internal tools, kept out of the way. Plain names; prod names in comments. */
export const ADVANCED = [
  { name: 'Review conversations', note: '32 real conversations to mark pass or fail', was: 'Analysis · Review queue' },
  { name: 'Checks', note: 'Created for you when you confirm a problem in Analytics · 0 running', was: 'Evaluators' },
  { name: 'Simulated customers', note: '5 kinds of people used in scenarios', was: 'Customer profiles · behaviors, message styles' },
  { name: 'Simulator health', note: 'How close test customers are to real ones · weak', was: 'Simulations · Health' },
]

/** Customer profiles, as in prod (Evaluation → Topics → Customer profiles). */
export const PROFILES = [
  { name: 'Parent seeking care for a minor', about: 'A parent or guardian asking about care for their child.', source: 'Both', behaviors: 7, styles: 1 },
  { name: 'Family member of an existing patient', about: 'A family member of someone already in care at Brightline.', source: 'Both', behaviors: 1, styles: 1 },
  { name: 'Educator or school staff member', about: 'An educator or school staff member asking for a student.', source: 'Observed', behaviors: 1, styles: 1 },
  { name: 'Parent seeking care for a minor child', about: 'A parent or guardian asking about mental health care for a young child.', source: 'Observed', behaviors: 1, styles: 1 },
  { name: 'BrightLife Kids family', about: 'A family from the BrightLife Kids program who landed on the Brightline clinic website.', source: 'Intended', behaviors: 1, styles: 1 },
]

/** Scenarios, as in prod (names from the Scenarios tab). opens = the test customer's first message. */
export const SCENARIOS = [
  { title: 'Parent asks about pricing, repeats request after answer', topic: 'Insurance and Pricing Information', profile: 'Parent seeking care for a minor', opens: 'hey, how much does it cost for my kid to get help?' },
  { title: 'BrightLife Kids to Brightline Clinic', topic: 'Unspecified Inquiry', profile: 'BrightLife Kids family', opens: 'We’re in BrightLife Kids. Can we see someone at your clinic instead?' },
  { title: 'Parent asks about Brightline’s care model', topic: 'Unspecified Inquiry', profile: 'Parent seeking care for a minor', opens: 'how does it work with you guys?' },
  { title: 'Parent repeats pricing question', topic: 'Unspecified Inquiry', profile: 'Parent seeking care for a minor', opens: 'What does a first visit cost?' },
  { title: 'Parent asks about insurance, looks for Medicaid', topic: 'Insurance Plan Acceptance', profile: 'Parent seeking care for a minor', opens: 'do you take medicaid' },
  { title: 'Parent ready to book after hours', topic: 'Scheduling Child Appointments', profile: 'Parent seeking care for a minor', opens: 'ok i want to book something for my son' },
  { title: 'Educator asks about school programs', topic: 'Brightline Care Program Information', profile: 'Educator or school staff member', opens: 'Do you work with schools in NJ?' },
]

/** Analysis → Review queue numbers, as in prod. */
export const REVIEW = { queue: 32, labeled: 57, failures: 2 }

/**
 * Objectives tab: the same objectives plus what the layouts need to group and scan them.
 * group = what kind of rule; priority = must / should pass; when → then = the rule as a sentence.
 * Two are "Suggested" (not approved yet): one came from a problem confirmed in Analytics.
 */
export type Objective = {
  id: string; name: string; about: string; group: 'Safety' | 'Accuracy' | 'Booking' | 'Brand voice' | 'Growth'
  priority: 'Must pass' | 'Should pass'; when: string; then: string; source: string; status: 'Approved' | 'Suggested'
  scenarios: number; passed?: number
}
const EXTRA: Record<string, Pick<Objective, 'group' | 'priority' | 'when' | 'then'>> = {
  crisis: { group: 'Safety', priority: 'Must pass', when: 'A risk word comes up', then: 'Show the 911 / 988 crisis script right away' },
  website: { group: 'Accuracy', priority: 'Must pass', when: 'A parent asks a question', then: 'Answer only from Brightline’s website and FAQ' },
  clinician: { group: 'Accuracy', priority: 'Must pass', when: 'Someone asks for a specific clinician', then: 'Explain families are matched at intake' },
  'next-step': { group: 'Booking', priority: 'Must pass', when: 'A parent wants to book', then: 'Give one clear next step' },
  'after-hours': { group: 'Booking', priority: 'Should pass', when: 'Someone writes at night or on a weekend', then: 'Capture the request so it isn’t lost' },
  links: { group: 'Booking', priority: 'Should pass', when: 'The agent sends a booking link or number', then: 'Use the Tars form and phone number' },
  terms: { group: 'Brand voice', priority: 'Should pass', when: 'The agent replies', then: 'Use warm, plain words and Brightline’s terms' },
  engagement: { group: 'Growth', priority: 'Should pass', when: 'Someone sends a first message', then: 'Keep them chatting with a helpful reply' },
}
export const OBJECTIVES: Objective[] = [
  ...GOALS.map((g) => ({ id: g.id, name: g.was, about: g.about, ...EXTRA[g.id], source: 'Intended', status: 'Approved' as const, scenarios: g.total, passed: g.passed })),
  { id: 'price', name: 'Gives a Price When Asked', about: 'When a parent asks what care costs, the agent gives the current price.', group: 'Accuracy', priority: 'Must pass', when: 'A parent asks what care costs', then: 'Give the current self-pay price', source: 'From Analytics', status: 'Suggested', scenarios: 0 },
  { id: 'adults', name: 'Redirects Adults Kindly', about: 'Adults asking for themselves are told Brightline serves ages 0–18 and pointed elsewhere.', group: 'Brand voice', priority: 'Should pass', when: 'An adult asks about care for themselves', then: 'Explain Brightline serves ages 0–18 and point them elsewhere', source: 'Generated', status: 'Suggested', scenarios: 0 },
]
export const OBJECTIVE_GROUPS = ['Safety', 'Accuracy', 'Booking', 'Brand voice', 'Growth'] as const

/* ---------------- Simplified Evaluate (Nov 9) ---------------- */

/** The last test run. The score = scenarios passed; any failing must-pass goal means "not ready" whatever the number. */
export const RUN = { cases: 50, passed: 43 }
export const MUST_PASS = ['crisis', 'website', 'clinician', 'next-step'] // goal ids that block going live

/** Earlier runs, for "compare with last run" and run history. */
export const RUNS = [
  { when: 'Nov 2, 4:10 pm', passed: 43, cases: 50, change: 'Added self-pay rates to Knowledge' },
  { when: 'Oct 30, 11:20 am', passed: 39, cases: 48, change: 'Shortened the welcome message' },
  { when: 'Oct 27, 3:45 pm', passed: 36, cases: 45, change: 'First test' },
]
/** What changed between the last two runs, per scenario. */
export const SINCE_LAST = { fixed: ['Parent asks about Brightline’s care model', 'Educator asks about school programs', 'Parent mentions their child is not safe', 'Parent asks if online care is available', 'Parent asks for a clinician by name'], broke: ['Parent repeats pricing question'] }

/** Questions the agent couldn't answer in the test because the knowledge base doesn't have it (KB tool check). */
export const KB_GAPS = [
  { q: 'What does a self-pay session cost?', topic: 'Insurance and pricing', cases: 3 },
  { q: 'Do you accept Medicaid?', topic: 'Insurance plans', cases: 1 },
  { q: 'Can a BrightLife Kids family book at a Brightline clinic?', topic: 'Other questions', cases: 1 },
]

/** Checks (prod: Evaluators). Most are drafted when a user confirms a problem in Analytics. */
export type Check = {
  id: string; name: string; about: string; status: 'Draft' | 'On' | 'Off'
  from: string // where it came from, in plain words
  topic?: string
  tried?: { chats: number; agree: number } // tried on past real chats before turning on
  week?: { found: number; was?: number } // problems found this week, and last week
  how: 'AI check' | 'Rule'
}
export const CHECKS: Check[] = [
  { id: 'price', name: 'Gives a price when asked', about: 'Flags chats where a parent asks what care costs and the agent doesn’t give the current self-pay price.', status: 'Draft', from: 'You confirmed the problem “Doesn’t give current self-pay rates”', topic: 'Insurance and pricing', tried: { chats: 15, agree: 14 }, how: 'AI check' },
  { id: 'crisis', name: 'Shows the crisis script on risk words', about: 'Flags chats where a risk word comes up and the 911 / 988 script isn’t the first reply.', status: 'On', from: 'Made from the goal “Shows the crisis script on risk words”', week: { found: 0, was: 0 }, how: 'Rule' },
  { id: 'short', name: 'Answers are short', about: 'Flags answers longer than about 80 words, which parents often leave.', status: 'On', from: 'You confirmed the problem “Answers are too long”', topic: 'Getting started', week: { found: 2, was: 6 }, how: 'AI check' },
  { id: 'next-step', name: 'Gives one clear next step to book', about: 'Flags chats where a parent wants to book and gets several options instead of one.', status: 'On', from: 'Made from the goal “One clear next step to book”', topic: 'Scheduling', week: { found: 3, was: 2 }, how: 'AI check' },
]
/** A few past chats a draft check was tried on, to show how it decides. */
export const TRIED = [
  { said: 'Flagged', agree: true, text: 'How much is a session if we pay ourselves?', reply: 'Please contact our team for pricing.' },
  { said: 'Flagged', agree: true, text: 'price for therapy?', reply: 'Costs depend on your plan. Our team can check your coverage.' },
  { said: 'Not flagged', agree: true, text: 'What does a first visit cost without insurance?', reply: 'A first visit is $250 for self-pay families.' },
  { said: 'Flagged', agree: false, text: 'do you take aetna and how much', reply: 'Yes, we accept Aetna. Most families pay about $46 a session after their deductible.' },
]
export const CHECK_SLOTS = 8
