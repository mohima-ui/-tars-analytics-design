// Mock data for the Evaluation redesign. Goal and test case names come from the Brightline AI Info Agent in prod
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
  {
    id: 'website',
    name: 'Answers from the website',
    was: 'Accurate Website Information',
    about: 'Every answer comes from Brightline’s own website and FAQ.',
    passed: 9,
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
  { id: 'after-hours', name: 'Captures after-hours requests', was: 'After-Hours Intent Capture', about: 'Requests made at night or on weekends aren’t lost.', passed: 6, total: 6 },
  { id: 'links', name: 'Uses the Tars links and phone number', was: 'Clean Attribution of Chatbot Actions', about: 'Booking goes through the Tars form and number, so it can be counted.', passed: 7, total: 7 },
  { id: 'clinician', name: 'Doesn’t offer to pick a clinician', was: 'Clinicians Not Selectable', about: 'Families are matched at intake, so the AI never offers names to choose from.', passed: 4, total: 4 },
  { id: 'terms', name: 'Uses Brightline’s words', was: 'Correct Use of Approved Terms', about: 'Warm, plain “living room” language and Brightline’s approved terms.', passed: 8, total: 8 },
  { id: 'engagement', name: 'Keeps people chatting', was: 'Increased Engagement Baseline', about: 'People keep chatting after their first message.', passed: 6, total: 6 },
]

/** Which topics the test cases come from (the same topic list as Analytics). */
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
  { name: 'Simulated customers', note: '5 kinds of people used in test cases', was: 'Customer profiles · behaviors, message styles' },
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
