import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppV2 from './v2/App.tsx'
import AppV3 from './v3/App.tsx'
import EvalApp from './eval/EvalApp.tsx'
import EvalBefore from './eval-before/EvalApp.tsx'

// /v2 is a separate copy of the prototype for iterating without touching v1.
// /v3 is a one-screen dashboard built on v2's data.
const path = window.location.pathname.replace(/\/+$/, '')
const isV2 = path === '/v2'
const isV3 = path === '/v3'
// /eval is the Evaluation redesign (test before going live), built with the same components
const isEval = path === '/eval'
// /eval-before keeps the Nov 3 version (6 tabs, approve everything) to compare with the simplified /eval
const isEvalBefore = path === '/eval-before'
if (isEval || isEvalBefore) document.title = 'Evaluation · TARS'
if (isV2 || isV3) {
  document.title = `Analytics · TARS (${isV3 ? 'v3' : 'v2'})`
  document.documentElement.classList.add('v2')
}

createRoot(document.getElementById('root')!).render(<StrictMode>{isEvalBefore ? <EvalBefore /> : isEval ? <EvalApp /> : isV3 ? <AppV3 /> : isV2 ? <AppV2 /> : <App />}</StrictMode>)
