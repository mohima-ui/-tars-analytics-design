import { useEffect, useState } from 'react'
import { BarChart3, Check, ClipboardCheck, FlaskConical, Play, Sparkles, Target, Users } from 'lucide-react'
import { Button, clsx } from '../components/ui'

/*
 * First time in Evaluate: nothing to fill in. One button, and Tars reads the agent context and real chats,
 * then writes goals, customers and scenarios. The user's first job is to check the goals (they set the score),
 * then run the first test. Nothing goes live from here.
 */

const STEPS = [
  { doing: 'Reading your agent context', done: 'Read your agent context', note: 'Instructions, policies and business goals' },
  { doing: 'Reading real chats', done: 'Read 513 real chats', note: 'So the tests match what people really ask' },
  { doing: 'Writing objectives', done: '9 objectives', note: 'What a good conversation must do' },
  { doing: 'Finding customer profiles', done: '5 customer profiles', note: '4 seen in real chats, 1 from your context' },
  { doing: 'Writing scenarios', done: '11 scenarios', note: 'Across 7 topics, including 1 nobody has asked yet' },
]
const HOW = [
  { icon: Target, title: 'Objectives', text: 'What a good conversation must do' },
  { icon: Users, title: 'Customer profiles', text: 'Sample end users to test with' },
  { icon: ClipboardCheck, title: 'Scenarios', text: 'What they ask, and what should happen' },
  { icon: Play, title: 'Run test', text: 'One answer: ready to go live or not' },
]

export function Setup({ onDone, onSkip }: { onDone: (next: 'goals' | 'run') => void; onSkip: () => void }) {
  const [step, setStep] = useState(-1) // -1 = not started; STEPS.length = finished
  useEffect(() => {
    if (step < 0 || step >= STEPS.length) return
    const id = setTimeout(() => setStep((s) => s + 1), 900)
    return () => clearTimeout(id)
  }, [step])
  const finished = step >= STEPS.length

  return (
    <div className="mx-auto max-w-[720px] py-6">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><FlaskConical className="size-5" /></span>
        <h2 className="mt-4 text-xl font-semibold text-ink">Test your agent before it goes live</h2>
        <p className="mt-1.5 max-w-[560px] text-sm text-ink-2">Tars chats with your agent like a real customer would, and grades every reply. You don’t need to write anything to start.</p>

        {step < 0 ? (
          <>
            <ol className="mt-6 grid gap-3 sm:grid-cols-4">
              {HOW.map((h, i) => (
                <li key={h.title} className="rounded-xl border border-line p-3">
                  <span className="flex items-center gap-2 text-xs text-ink-3 tnum"><span className="grid size-5 place-items-center rounded-full bg-brand-50 text-2xs font-semibold text-brand-700">{i + 1}</span><h.icon className="size-3.5" /></span>
                  <p className="mt-2 text-sm font-medium text-ink">{h.title}</p>
                  <p className="mt-0.5 text-xs text-ink-3">{h.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => setStep(0)}><Sparkles className="size-4" /> Set up testing for me</Button>
              <span className="text-xs text-ink-3">Takes about a minute. Nothing goes live.</span>
            </div>
          </>
        ) : (
          <>
            <ul className="mt-6 space-y-3" aria-live="polite">
              {STEPS.map((s, i) => {
                const state = i < step ? 'done' : i === step ? 'doing' : 'todo'
                return (
                  <li key={s.doing} className={clsx('flex items-start gap-3', state === 'todo' && 'opacity-40')}>
                    <span className={clsx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', state === 'done' ? 'bg-success-600 text-white' : 'bg-n-100')}>
                      {state === 'done' ? <Check className="size-3" /> : state === 'doing' ? <span className="size-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" /> : null}
                    </span>
                    <span>
                      <span className={clsx('block text-sm', state === 'done' ? 'font-medium text-ink' : 'text-ink-2')}>{state === 'done' ? s.done : `${s.doing}…`}</span>
                      {state === 'done' && <span className="text-xs text-ink-3">{s.note}</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
            {finished && (
              <div className="anim-fade mt-6 rounded-xl bg-brand-50 p-4">
                <p className="text-sm font-medium text-ink">Ready. One thing to do first: review your objectives.</p>
                <p className="mt-0.5 text-sm text-ink-2">Every test is graded against them, so a wrong objective gives a wrong score. Customer profiles and scenarios are ready to use; you can change them any time.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => onDone('goals')}>Review objectives</Button>
                  <Button onClick={() => onDone('run')}><Play className="size-4" /> Run first test now</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1"><BarChart3 className="size-3.5" /> How the agent does with real customers is in Analytics.</span>
        <button onClick={onSkip} className="font-medium text-brand-600 hover:underline">Demo: skip to an agent that’s been tested</button>
      </p>
    </div>
  )
}
