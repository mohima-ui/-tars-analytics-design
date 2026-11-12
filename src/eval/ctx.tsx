import { createContext, useContext } from 'react'
import type { Check } from './data'

/*
 * What the Evaluate tabs share, so one step can hand off to the next:
 * hasRun: whether this agent has been tested yet (first-time setup starts with no results)
 * goTo: switch tab, e.g. Results → Checks after "Watch in live chats"
 * addCheck / incoming: a draft check created from another tab shows up in Checks
 * run: start a test run (all, only failed, only new, or a number of scenarios)
 */
export type RunScope = 'all' | 'failed' | 'new'
export type Bus = {
  hasRun: boolean
  goTo: (tab: 'Objectives' | 'Customer profiles' | 'Scenarios' | 'Results' | 'Checks') => void
  addCheck: (c: Check) => void
  incoming: Check[]
  run: (scope: RunScope) => void
}
export const EvalBus = createContext<Bus>({ hasRun: true, goTo: () => {}, addCheck: () => {}, incoming: [], run: () => {} })
export const useBus = () => useContext(EvalBus)
