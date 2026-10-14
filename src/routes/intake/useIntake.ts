import { useEffect, useReducer } from 'react'
import {
  ARRIVAL_MS,
  INITIAL_RULES,
  ROUTE_STAGE,
  STAGE_MS,
  TASKS,
  intakeRef,
  outcomeLabel,
  refOf,
  route,
  sourceOf,
  type DestinationId,
  type Outcome,
  type Rule,
  type SourceId,
  type Task,
} from './data'
import {
  ageDetail,
  ageOf,
  claimsDetail,
  confidenceOf,
  deviationDetail,
  extractDetail,
  matchDetail,
  metricDetail,
  msFor,
  policyDetail,
  readsFor,
  type Detail,
  type RuleEval,
} from './decisionLog'

export type ItemState = 'Processing' | 'Held' | 'Failed' | 'Queued' | 'Rejected' | 'Reached' | 'Kept with a person'

/** A context-layer call, named as the Harness bindings name it. */
export type Call = { layer: string; tool?: string }

export type TrailStep = {
  stage: number
  at: number
  text: string
  call?: Call
  kind: 'info' | 'block' | 'error' | 'person'
  /** How long the call took. */
  ms?: number
  detail?: Detail
  /** The Route step: every rule, with what it read. */
  evals?: RuleEval[]
  /** The step that decided the outcome, or failed it: open by default. */
  deciding?: boolean
}

export type Item = {
  task: Task
  ref: string
  arrivedAt: number
  state: ItemState
  /** The stage the task is in, or stopped at. */
  stage: number
  retried: boolean
  rule?: Rule
  destination?: DestinationId
  decidedAt?: number
  trail: TrailStep[]
}

type State = { next: number; items: Item[]; paused: SourceId[]; rules: Rule[] }

type Action =
  | { type: 'arrive'; at: number }
  | { type: 'tick'; at: number }
  | { type: 'toggleSource'; id: SourceId }
  | { type: 'hold' | 'release' | 'retry'; id: string; at: number }
  | { type: 'reroute'; id: string; to: DestinationId; at: number }
  | { type: 'setRule'; id: number; patch: { enabled?: boolean; to?: Outcome } }

const INTEL = 'intelligence-mcp'
const RECORDS = 'core-records-mcp'
const DOCS = 'documents-mcp'
const SEMANTIC = 'semantic-engine-mcp'
const RULES = 'rules engine'

const HAS_PREVIOUS = ['Renewal', 'Roll Over', 'Portability']

/**
 * What a stage does to a task: its log steps, and whether it errors. The
 * failing call is the last step, so a retry re-runs the stage from the top.
 */
function runStage(item: Item, s: number, at: number): { lines: TrailStep[]; failed: boolean } {
  const t = item.task
  const f = t.fails
  const fails = !!f && f.stage === s && !(item.retried && f.retrySucceeds)
  const step = (text: string, extra: Partial<TrailStep> = {}): TrailStep => ({ stage: s, at, text, kind: 'info', ...extra })
  const call = (layer: string, tool: string, salt: number) => ({ call: { layer, tool }, ms: msFor(t, salt + s * 10) })
  const err = (text: string, c: Partial<TrailStep>, detail: Detail): TrailStep => step(text, { ...c, kind: 'error', detail, deciding: true })

  switch (s) {
    case 0:
      return { lines: [step(`Received from ${sourceOf(t.source).label} · ${t.sourceRef}`)], failed: false }
    case 1: {
      const c = call(INTEL, 'extract_fields', 1)
      if (fails) return { lines: [err(f!.message, c, extractDetail(t, f!.message))], failed: true }
      const conf = confidenceOf(t)
      return {
        lines: [step(conf < 80 ? `Extraction confidence ${conf}%` : 'Proposal fields extracted', { ...c, kind: conf < 80 ? 'block' : 'info', detail: extractDetail(t) })],
        failed: false,
      }
    }
    case 2:
      return { lines: [step(`${t.case.plan} · ${t.case.businessType} · ${t.case.segment === 'group' ? 'Group' : 'Retail'}`)], failed: false }
    case 3: {
      const dup = t.facts.duplicateOf
      const out: TrailStep[] = [
        step(dup ? `Matches ${refOf(dup)}` : 'No duplicate found', { ...call(INTEL, 'match_contact', 2), kind: dup ? 'block' : 'info', detail: matchDetail(t) }),
      ]
      if (HAS_PREVIOUS.includes(t.case.businessType)) {
        const pc = call(RECORDS, 'get_policy', 3)
        if (fails && f!.message.includes('lookup')) return { lines: [...out, err(f!.message, pc, policyDetail(t, f!.message))], failed: true }
        out.push(step('Previous policy found', { ...pc, detail: policyDetail(t) }))
        const cc = call(RECORDS, 'get_claim_history', 4)
        if (fails) return { lines: [...out, err(f!.message, cc, claimsDetail(t, f!.message))], failed: true }
        out.push(step('Claims history read', { ...cc, detail: claimsDetail(t) }))
      }
      const age = ageOf(t)
      if (age !== undefined && age > 65) {
        out.push(step(`Proposer age ${age}, above the entry-age limit`, { ...call(DOCS, 'search_documents', 5), kind: 'block', detail: ageDetail(t) }))
      }
      if (t.case.segment === 'group') out.push(step('Sum insured per employee resolved', { ...call(SEMANTIC, 'query_metric', 6), detail: metricDetail(t) }))
      out.push(
        step(t.facts.deviation ? 'Rules engine flags a deviation' : 'No deviations', {
          call: { layer: RULES, tool: 'check_deviations' },
          ms: msFor(t, 7),
          kind: t.facts.deviation ? 'block' : 'info',
          detail: deviationDetail(t),
        }),
      )
      return { lines: out, failed: false }
    }
  }
  return { lines: [], failed: false }
}

const STATE_FOR: Record<Outcome, ItemState> = {
  autonomous: 'Reached',
  hybrid: 'Kept with a person',
  manual: 'Kept with a person',
  hold: 'Held',
  reject: 'Rejected',
}

/** Decide the task against the rules, and keep what each rule read: the rules may change later. */
function decide(item: Item, rules: Rule[], at: number, skipHolds = false): Item {
  const t = item.task
  const rule = route(rules, t.facts, skipHolds)
  const hit = rules.indexOf(rule)
  const evals: RuleEval[] = rules.map((r, i) => ({
    rule: r,
    reads: readsFor(r, t),
    result: !r.enabled
      ? 'off'
      : i === hit
        ? 'yes'
        : i > hit
          ? 'not evaluated'
          : skipHolds && r.to === 'hold' && r.test(t.facts)
            ? 'skipped on release'
            : 'no',
  }))
  const state = STATE_FOR[rule.to]
  const step: TrailStep = {
    stage: ROUTE_STAGE,
    at,
    text: `Rule ${rule.id} matched, so ${outcomeLabel(rule.to)}`,
    call: { layer: RULES, tool: 'route' },
    ms: 4,
    kind: state === 'Reached' || state === 'Kept with a person' ? 'info' : 'block',
    evals,
    deciding: true,
  }
  return {
    ...item,
    state,
    stage: ROUTE_STAGE,
    rule,
    destination: rule.to === 'hold' || rule.to === 'reject' ? undefined : rule.to,
    decidedAt: state === 'Held' ? undefined : at,
    // Only the latest decision opens by default.
    trail: [...item.trail.map((x) => (x.deciding ? { ...x, deciding: false } : x)), step],
  }
}

function advance(item: Item, rules: Rule[], at: number): Item {
  if (item.state !== 'Processing') return item
  if (item.stage === ROUTE_STAGE) return decide(item, rules, at)
  const { lines, failed } = runStage(item, item.stage, at)
  const trail = [...item.trail, ...lines]
  return failed ? { ...item, state: 'Failed', trail } : { ...item, stage: item.stage + 1, trail }
}

const person = (it: Item, text: string, at: number): TrailStep[] => [...it.trail, { stage: it.stage, at, text, kind: 'person' }]

/* Pure: times come in on the action, so StrictMode's double run of a reducer
 * cannot drift the clock or skip a task. */
function reducer(s: State, a: Action): State {
  const patch = (id: string, fn: (it: Item) => Item) => ({ ...s, items: s.items.map((it) => (it.task.id === id ? fn(it) : it)) })

  switch (a.type) {
    case 'arrive': {
      const task = TASKS[s.next]
      if (!task) return s
      const queued = s.paused.includes(task.source)
      const item: Item = {
        task,
        ref: intakeRef(s.next),
        arrivedAt: a.at,
        state: queued ? 'Queued' : 'Processing',
        stage: 0,
        retried: false,
        trail: [],
      }
      return { ...s, next: s.next + 1, items: [item, ...s.items] }
    }
    case 'tick':
      return { ...s, items: s.items.map((it) => advance(it, s.rules, a.at)) }
    case 'toggleSource': {
      const pausing = !s.paused.includes(a.id)
      return {
        ...s,
        paused: pausing ? [...s.paused, a.id] : s.paused.filter((p) => p !== a.id),
        items: pausing
          ? s.items
          : s.items.map((it) => (it.state === 'Queued' && it.task.source === a.id ? { ...it, state: 'Processing' } : it)),
      }
    }
    case 'hold':
      return patch(a.id, (it) => ({ ...it, state: 'Held', trail: person(it, 'Held by you', a.at) }))
    case 'release':
      return patch(a.id, (it) => {
        const released = { ...it, trail: person(it, 'Released by you', a.at) }
        // Held by a rule at Route: the next rule that is not a hold. Held by a person mid-way: carry on.
        return it.rule?.to === 'hold' && it.stage === ROUTE_STAGE
          ? decide(released, s.rules, a.at, true)
          : { ...released, state: 'Processing' }
      })
    case 'retry':
      return patch(a.id, (it) => ({ ...it, state: 'Processing', retried: true, trail: person(it, 'Retried by you', a.at) }))
    case 'reroute':
      return patch(a.id, (it) => ({
        ...it,
        state: STATE_FOR[a.to],
        stage: ROUTE_STAGE,
        destination: a.to,
        decidedAt: a.at,
        trail: person(it, a.to === 'autonomous' ? 'Sent to Fully Agentic by you' : 'Kept with a person by you', a.at),
      }))
    case 'setRule':
      return { ...s, rules: s.rules.map((r) => (r.id === a.id ? { ...r, ...a.patch } : r)) }
  }
}

const INITIAL: State = { next: 0, items: [], paused: [], rules: INITIAL_RULES }

/** `running` false freezes the whole stream: nothing arrives and nothing moves until it is true again. */
export function useIntake(running = true) {
  // The first task is in on load rather than after a blank wait. Seeded in the
  // initial state, not an effect, so StrictMode's double mount cannot add two.
  const [state, dispatch] = useReducer(reducer, INITIAL, (s) => reducer(s, { type: 'arrive', at: Date.now() }))
  const done = state.next >= TASKS.length

  useEffect(() => {
    if (done || !running) return
    const id = window.setInterval(() => dispatch({ type: 'arrive', at: Date.now() }), ARRIVAL_MS)
    return () => window.clearInterval(id)
  }, [done, running])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => dispatch({ type: 'tick', at: Date.now() }), STAGE_MS)
    return () => window.clearInterval(id)
  }, [running])

  return { ...state, dispatch }
}

export const clockOf = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour12: false })
