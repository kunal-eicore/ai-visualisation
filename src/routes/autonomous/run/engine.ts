import { agentsAt, type AgentConfig, type AgentSettings } from '../agents/settings'
import { ALL_SCRIPTS, DONE, QUEUE_SCRIPTS, SCENARIOS, SCRIPT_BY_ID, STAGES, arrivalOf, type ScenarioId } from './script'

/**
 * The run, as a pure reducer.
 *
 * Every tick advances the clock and every case on it. The reducer is pure on
 * purpose: React runs updaters twice under StrictMode, and anything here that
 * read a ref or fired an effect would happen twice (see the StrictMode trap in
 * the project notes).
 */

/** `blocked`: the agent is missing something only a person can supply.
 *  `failed`: a tool call kept failing, or the station ran past its timeout.
 *  `approval`: the agent finished, and its settings ask a person to approve
 *  the output before the case moves on.
 *  `manual`: the station's agent is switched off (Autonomous only), so a
 *  person works this step. */
export type Phase = 'queued' | 'working' | 'blocked' | 'failed' | 'approval' | 'manual'

/**
 * Autonomous runs every case down the whole line. Hybrid runs one station at
 * a time, only when a person sends a case to it, and hands the case back when
 * the station is done.
 */
export type RunMode = 'autonomous' | 'hybrid'

export type TraceStep = {
  /** Run-clock milliseconds. */
  at: number
  stage: number
  text: string
  kind?: 'block' | 'resume' | 'done' | 'error' | 'approval'
}

export type CaseState = {
  id: string
  /** 0..4 on the line, `DONE` once decided. Off the line (Hybrid), the
   *  station it last left. */
  stage: number
  phase: Phase
  /** On the line. Always, in Autonomous; in Hybrid only between a person
   *  sending the case to a station and the station handing it back. */
  onLine: boolean
  /** The agent holding the case while it is working. */
  agentId?: string
  /** Stations finished, by an agent or by a person. */
  done: number[]
  /** Hybrid: stations a person stopped this case on. Automation leaves the
   *  case alone there, so a stop is not undone on the next tick. */
  skip: number[]
  /** A person approved this station's output. */
  approved: boolean
  /** Milliseconds spent in the current stage. */
  t: number
  /** Held by a person: out of its slot, at the top of its stage's queue, and
   *  passed over until someone resumes it. */
  paused: boolean
  unblocked: boolean
  /** Failed tool calls on the error stage so far. */
  errors: number
  /** The tool got through: on a retry by the agent, or because a person
   *  retried after the agent gave up. A person's retry also lifts the
   *  station's timeout. */
  retried: boolean
  /** Run-clock time it entered its current stage (arrival, for Intake). */
  enteredAt: number
  /** Queue position inside a stage. Lower goes first. */
  order: number
  /** Run-clock time it lands at Intake. Until then it is not in the run. */
  arrivesAt: number
  /** Milliseconds per stage under the run's scenario. */
  durations: number[]
  startedAt?: number
  resolvedAt?: number
  trace: TraceStep[]
}

export type RunEvent = TraceStep & { caseId: string; seq: number }

export type RunState = {
  mode: RunMode
  /** Hybrid: automated stations. Every case with the person that has not
   *  done one of these is sent to the earliest of them. */
  auto: number[]
  scenario: ScenarioId
  clock: number
  running: boolean
  seq: number
  cases: Record<string, CaseState>
  events: RunEvent[]
  /** Waiting per stage, sampled every `SAMPLE_MS`, for the bottleneck's
   *  growth rate. */
  history: { at: number; waiting: number[] }[]
}

export type RunAction =
  | { type: 'tick'; dt: number; settings: AgentSettings }
  | { type: 'toggle' }
  | { type: 'pauseCase'; id: string }
  | { type: 'unblock'; id: string }
  | { type: 'retry'; id: string }
  | { type: 'approve'; id: string }
  /** A person did a step whose agent is off. */
  | { type: 'complete'; id: string }
  /** Hybrid: a person sends cases to a station's agent. */
  | { type: 'trigger'; ids: string[]; stage: number }
  /** Hybrid: a person takes a case back off the line, mid-station. */
  | { type: 'stop'; id: string }
  /** Hybrid: automate a station, or hand it back to people. */
  | { type: 'setAuto'; stage: number; on: boolean }
  | { type: 'replay' }

const MAX_EVENTS = 300
const SAMPLE_MS = 5000
const MAX_SAMPLES = 13

export function initialRun({ scenario = 'normal', mode = 'autonomous' }: { scenario?: ScenarioId; mode?: RunMode } = {}): RunState {
  const slow = SCENARIOS.find((s) => s.id === scenario)!.slow
  const cases: Record<string, CaseState> = {}
  // Hybrid works the queue as it stands; nothing arrives while it runs.
  const scripts = mode === 'hybrid' ? QUEUE_SCRIPTS : ALL_SCRIPTS
  scripts.forEach((s, i) => {
    const seeded = mode === 'hybrid' ? seedDone(s.row.status) : []
    cases[s.row.id] = {
      id: s.row.id,
      // A seeded case that is already decided sits at DONE with no
      // `resolvedAt`: a person decided it, so it is not in the agents' ledger.
      stage: seeded.length === STAGES.length ? DONE : 0,
      phase: 'queued',
      onLine: mode === 'autonomous',
      done: seeded,
      skip: [],
      approved: false,
      t: 0,
      paused: false,
      unblocked: false,
      errors: 0,
      retried: false,
      enteredAt: arrivalOf(i),
      order: i,
      arrivesAt: arrivalOf(i),
      durations: s.durations.map((d, k) => Math.round(d * slow[k])),
      trace: [],
    }
  })
  return { mode, auto: mode === 'hybrid' ? loadAuto() : [], scenario, clock: 0, running: true, seq: scripts.length, cases, events: [], history: [] }
}

/**
 * Hybrid opens on the queue as it stands, so each case has already been
 * worked as far as its onebuzz status says. Approved mapping: under review
 * has nothing done, info required is through Intake (stuck on documents),
 * underwriting through Documents, partial accepted through Risk, counter
 * offered and negotiated through Pricing, and rejected is decided.
 */
const SEED: Record<string, number> = {
  under_review: 0,
  info_required: 1,
  underwriting: 2,
  partial_accepted: 3,
  counter_offered: 4,
  negotiated: 4,
  rejected: 5,
}
const seedDone = (status: string) => Array.from({ length: SEED[status] ?? 0 }, (_, i) => i)

const AUTO_KEY = 'ai-vis.hybrid-auto.v1'

/** Automated stations survive leaving Hybrid and coming back. */
function loadAuto(): number[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(AUTO_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((n) => Number.isInteger(n) && n >= 0 && n < STAGES.length) : []
  } catch {
    return []
  }
}

export function saveAuto(auto: number[]) {
  try {
    window.localStorage.setItem(AUTO_KEY, JSON.stringify(auto))
  } catch {
    // Storage blocked: automation still holds while the page is open.
  }
}

/** The automated station a case with the person goes to next, if any. */
export const nextAuto = (c: CaseState, auto: number[]) =>
  [...auto].sort((a, b) => a - b).find((s) => canTrigger(c, s) && !c.skip.includes(s))

/** The cases on the line or decided by the run, in arrival order. */
export const casesOf = (s: RunState) =>
  Object.values(s.cases).filter(
    (c) => c.arrivesAt <= s.clock && (c.onLine || (c.stage === DONE && c.resolvedAt !== undefined)),
  )

/** Autonomous is complete once every case is decided. Hybrid never is; it
 *  is idle while no case is on the line, and the clock stops there. */
export const isComplete = (s: RunState) =>
  s.mode === 'hybrid'
    ? !Object.values(s.cases).some((c) => c.onLine || nextAuto(c, s.auto) !== undefined)
    : Object.values(s.cases).every((c) => c.stage === DONE)

const label = (stage: number) => STAGES[stage].label
const agentLabel = (stage: number) => STAGES[stage].agent

/**
 * A station is finished. Autonomous moves the case to the next station (or
 * into the ledger); Hybrid hands it back to the person, off the line. Either
 * way the station is recorded as done and its approval is spent.
 */
function advance(c: CaseState, mode: RunMode, clock: number, order: number): CaseState {
  const s = c.stage
  const base = { ...c, done: c.done.includes(s) ? c.done : [...c.done, s], approved: false, agentId: undefined, t: 0 }
  if (s === STAGES.length - 1) {
    return { ...base, stage: DONE, phase: 'queued', onLine: false, resolvedAt: clock }
  }
  if (mode === 'hybrid') return { ...base, phase: 'queued', onLine: false }
  return { ...base, stage: s + 1, phase: 'queued', order, enteredAt: clock }
}

/** Put a case on the line at a station, at the back of its queue. */
const sendTo = (c: CaseState, stage: number, clock: number, order: number): CaseState => ({
  ...c,
  onLine: true,
  stage,
  phase: 'queued',
  t: 0,
  paused: false,
  order,
  enteredAt: clock,
})

/** The line a hand-back writes, so the trace says where the case went. */
function advanceStep(c: CaseState, mode: RunMode, clock: number, by: 'agent' | 'person'): TraceStep {
  const s = c.stage
  const who = by === 'person' ? 'by you' : `by the ${agentLabel(s).toLowerCase()}`
  if (s === STAGES.length - 1) return { at: clock, stage: s, text: `Decided ${who}`, kind: 'done' }
  if (mode === 'hybrid') return { at: clock, stage: s, text: `${label(s)} done ${who}, handed back to you`, kind: 'done' }
  return { at: clock, stage: s, text: `${label(s)} done ${who}`, kind: 'done' }
}

function tick(state: RunState, dt: number, settings: AgentSettings): RunState {
  if (!state.running || isComplete(state)) return state
  const clock = state.clock + dt
  let seq = state.seq
  const cases = { ...state.cases }
  const events: RunEvent[] = []

  const log = (c: CaseState, step: TraceStep): CaseState => {
    events.push({ ...step, caseId: c.id, seq: seq++ })
    return { ...c, trace: [...c.trace, step] }
  }

  // Arrivals. The opening queue is there from the start and says nothing.
  for (const c of Object.values(cases)) {
    if (c.arrivesAt > 0 && c.arrivesAt > state.clock && c.arrivesAt <= clock) {
      cases[c.id] = log(c, { at: c.arrivesAt, stage: 0, text: 'New case received' })
    }
  }

  // Automation: a case with the person goes to its next automated station,
  // provided that station has an agent on.
  if (state.mode === 'hybrid' && state.auto.length) {
    for (const c of Object.values(cases)) {
      const s = nextAuto(c, state.auto.filter((a) => agentsAt(settings, a).length > 0))
      if (s === undefined) continue
      cases[c.id] = log(sendTo(c, s, clock, seq++), { at: clock, stage: s, text: `Sent to the ${agentLabel(s).toLowerCase()} by automation`, kind: 'resume' })
    }
  }

  const all = Object.values(cases).filter((c) => c.arrivesAt <= clock)
  for (let s = 0; s < STAGES.length; s++) {
    const here = all.filter((c) => cases[c.id].onLine && cases[c.id].stage === s)
    const agents = agentsAt(settings, s)
    const byId: Record<string, AgentConfig> = Object.fromEntries(settings.agents.map((a) => [a.id, a]))

    const waiting = here
      .filter((c) => cases[c.id].phase === 'queued' && !cases[c.id].paused)
      .sort((a, b) => cases[a.id].order - cases[b.id].order)

    if (agents.length === 0) {
      // Nobody works this station. Autonomous hands the step to a person;
      // Hybrid gives the case straight back, since a person sent it here.
      for (const c of waiting) {
        const cur = cases[c.id]
        cases[c.id] =
          state.mode === 'hybrid'
            ? log({ ...cur, onLine: false, t: 0 }, { at: clock, stage: s, text: `${agentLabel(s)} is off, handed back to you`, kind: 'resume' })
            : log({ ...cur, phase: 'manual' }, { at: clock, stage: s, text: `${agentLabel(s)} is off, this step is yours`, kind: 'block' })
      }
    } else {
      // Fill each agent's free slots from the stage's queue, in settings order.
      const load: Record<string, number> = {}
      for (const c of here) {
        const cur = cases[c.id]
        if (cur.phase === 'working' && cur.agentId) load[cur.agentId] = (load[cur.agentId] ?? 0) + 1
      }
      for (const c of waiting) {
        const agent = agents.find((a) => (load[a.id] ?? 0) < a.maxConcurrent)
        if (!agent) break
        load[agent.id] = (load[agent.id] ?? 0) + 1
        // `t` is kept: a resumed case picks the stage up where it was paused.
        cases[c.id] = { ...cases[c.id], phase: 'working', agentId: agent.id, startedAt: cases[c.id].startedAt ?? clock }
      }
    }

    // Move every working case along.
    for (const c0 of here) {
      let c = cases[c0.id]
      if (c.phase !== 'working') continue
      // An agent switched off mid-case finishes the case it is holding.
      const agent = (c.agentId && byId[c.agentId]) || agents[0] || settings.agents[s]
      const script = SCRIPT_BY_ID[c.id]
      const dur = c.durations[s]
      const before = c.t / dur
      const t = c.t + dt
      const after = t / dur
      c = { ...c, t }

      for (const step of script.steps[s]) {
        if (step.at > before && step.at <= after) c = log(c, { at: clock, stage: s, text: step.text })
      }

      const err = script.error
      if (err?.stage === s && !c.retried) {
        /* The first failure lands a third of the way in, then one retry every
           15% of the station after it, as many as the agent is allowed. */
        const max = agent.retries
        const due = 0.35 + 0.15 * c.errors
        if (after >= due) {
          if (c.errors === 0 && max === 0) {
            cases[c.id] = log(
              { ...c, errors: 1, phase: 'failed' },
              { at: clock, stage: s, text: `${err.tool} timed out, retries are off`, kind: 'error' },
            )
            continue
          }
          if (c.errors === 0) {
            c = log({ ...c, errors: 1 }, { at: clock, stage: s, text: `${err.tool} timed out, retrying (1 of ${max})`, kind: 'error' })
          } else if (err.recovers) {
            c = log({ ...c, retried: true }, { at: clock, stage: s, text: `${err.tool} went through on retry` })
          } else if (c.errors < max) {
            c = log(
              { ...c, errors: c.errors + 1 },
              { at: clock, stage: s, text: `${err.tool} timed out again, retrying (${c.errors + 1} of ${max})`, kind: 'error' },
            )
          } else {
            cases[c.id] = log(
              { ...c, errors: c.errors + 1, phase: 'failed' },
              { at: clock, stage: s, text: `${err.tool} failed after ${max} ${max === 1 ? 'retry' : 'retries'}`, kind: 'error' },
            )
            continue
          }
        }
      }

      // One run-clock second stands for one agent minute.
      if (!c.retried && t >= agent.timeoutMin * 1000 && t < dur) {
        cases[c.id] = log(
          { ...c, phase: 'failed' },
          { at: clock, stage: s, text: `${label(s)} ran past the ${agent.timeoutMin} min timeout`, kind: 'error' },
        )
        continue
      }

      if (script.block?.stage === s && !c.unblocked && after >= 0.5) {
        c = log({ ...c, phase: 'blocked' }, { at: clock, stage: s, text: script.block.reason, kind: 'block' })
      } else if (t >= dur) {
        if (agent.humanApproval && !c.approved) {
          c = log({ ...c, phase: 'approval' }, { at: clock, stage: s, text: `${agent.name} finished, waiting for your approval`, kind: 'approval' })
        } else {
          c = log(c, advanceStep(c, state.mode, clock, 'agent'))
          c = advance(c, state.mode, clock, seq++)
        }
      }
      cases[c.id] = c
    }
  }

  let history = state.history
  if (Math.floor(clock / SAMPLE_MS) > Math.floor(state.clock / SAMPLE_MS)) {
    const live = Object.values(cases).filter((c) => c.arrivesAt <= clock)
    const waiting = STAGES.map((_, i) => live.filter((c) => c.onLine && c.stage === i && c.phase === 'queued').length)
    history = [...history, { at: clock, waiting }].slice(-MAX_SAMPLES)
  }

  return {
    ...state,
    clock,
    seq,
    cases,
    history,
    events: events.length ? [...state.events, ...events].slice(-MAX_EVENTS) : state.events,
  }
}

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'tick':
      return tick(state, action.dt, action.settings)
    case 'toggle':
      return { ...state, running: !state.running }
    case 'pauseCase': {
      const c = state.cases[action.id]
      if (!c || c.stage === DONE || needsPerson(c)) return state
      /* Pausing takes the case out of its slot, so the agent picks up the next
         one, and puts it at the top of the stage's queue. It is passed over
         there until resumed; resumed, it is first in line for the next slot.
         Order -1 is the same front-of-queue place an unblocked case takes. */
      const pausing = !c.paused
      const step: TraceStep = {
        at: state.clock,
        stage: c.stage,
        text: pausing ? 'Paused by you' : 'Resumed by you, next in line',
        kind: 'resume',
      }
      return {
        ...state,
        seq: state.seq + 1,
        cases: {
          ...state.cases,
          [c.id]: { ...c, paused: pausing, phase: 'queued', order: -1, trace: [...c.trace, step] },
        },
        events: [...state.events, { ...step, caseId: c.id, seq: state.seq }].slice(-MAX_EVENTS),
      }
    }
    case 'unblock': {
      const c = state.cases[action.id]
      if (!c || c.phase !== 'blocked') return state
      const step: TraceStep = { at: state.clock, stage: c.stage, text: 'Unblocked by you, back on the line', kind: 'resume' }
      return {
        ...state,
        seq: state.seq + 1,
        // Order -1: an unblocked case goes to the front of its stage's queue.
        cases: { ...state.cases, [c.id]: { ...c, phase: 'queued', unblocked: true, order: -1, trace: [...c.trace, step] } },
        events: [...state.events, { ...step, caseId: c.id, seq: state.seq }].slice(-MAX_EVENTS),
      }
    }
    case 'retry': {
      const c = state.cases[action.id]
      if (!c || c.phase !== 'failed') return state
      const step: TraceStep = { at: state.clock, stage: c.stage, text: 'Retried by you, back on the line', kind: 'resume' }
      return {
        ...state,
        seq: state.seq + 1,
        cases: { ...state.cases, [c.id]: { ...c, phase: 'queued', retried: true, order: -1, trace: [...c.trace, step] } },
        events: [...state.events, { ...step, caseId: c.id, seq: state.seq }].slice(-MAX_EVENTS),
      }
    }
    case 'approve':
    case 'complete': {
      const c = state.cases[action.id]
      const phase = action.type === 'approve' ? 'approval' : 'manual'
      if (!c || c.phase !== phase) return state
      const by = action.type === 'approve' ? 'agent' : 'person'
      const steps: TraceStep[] = [
        ...(action.type === 'approve' ? [{ at: state.clock, stage: c.stage, text: 'Approved by you', kind: 'resume' as const }] : []),
        advanceStep(c, state.mode, state.clock, by),
      ]
      const next = advance({ ...c, trace: [...c.trace, ...steps] }, state.mode, state.clock, state.seq + steps.length)
      return {
        ...state,
        seq: state.seq + steps.length + 1,
        cases: { ...state.cases, [c.id]: next },
        events: [...state.events, ...steps.map((st, k) => ({ ...st, caseId: c.id, seq: state.seq + k }))].slice(-MAX_EVENTS),
      }
    }
    case 'trigger': {
      let seq = state.seq
      const cases = { ...state.cases }
      const events: RunEvent[] = []
      for (const id of action.ids) {
        const c = cases[id]
        if (!c || !canTrigger(c, action.stage)) continue
        const step: TraceStep = { at: state.clock, stage: action.stage, text: `Sent to the ${agentLabel(action.stage).toLowerCase()} by you`, kind: 'resume' }
        events.push({ ...step, caseId: id, seq: seq++ })
        cases[id] = { ...sendTo(c, action.stage, state.clock, seq++), skip: c.skip.filter((x) => x !== action.stage), trace: [...c.trace, step] }
      }
      if (!events.length) return state
      return { ...state, seq, cases, events: [...state.events, ...events].slice(-MAX_EVENTS) }
    }
    case 'stop': {
      const c = state.cases[action.id]
      if (!c || !c.onLine || (c.phase !== 'working' && c.phase !== 'queued')) return state
      const step: TraceStep = { at: state.clock, stage: c.stage, text: `Stopped by you, ${label(c.stage)} handed back unchanged`, kind: 'resume' }
      return {
        ...state,
        seq: state.seq + 1,
        cases: {
          ...state.cases,
          [c.id]: {
            ...c,
            onLine: false,
            phase: 'queued',
            t: 0,
            agentId: undefined,
            paused: false,
            skip: c.skip.includes(c.stage) ? c.skip : [...c.skip, c.stage],
            trace: [...c.trace, step],
          },
        },
        events: [...state.events, { ...step, caseId: c.id, seq: state.seq }].slice(-MAX_EVENTS),
      }
    }
    case 'setAuto': {
      const auto = action.on ? [...new Set([...state.auto, action.stage])] : state.auto.filter((s) => s !== action.stage)
      return { ...state, auto }
    }
    case 'replay':
      return initialRun({ scenario: state.scenario, mode: state.mode })
  }
}

/** Hybrid: a case can go to a station when it is with the person, not yet
 *  decided, that station is not done, and every station before it is. So a
 *  case is only ever eligible for one station: its next. */
export const canTrigger = (c: CaseState, stage: number) =>
  !c.onLine && c.stage !== DONE && !c.done.includes(stage) && STAGES.slice(0, stage).every((_, i) => c.done.includes(i))

/** Hybrid: the station a case with the person is eligible for, if any. */
export const nextStation = (c: CaseState) => {
  const s = STAGES.findIndex((_, i) => !c.done.includes(i))
  return s >= 0 && canTrigger(c, s) ? s : undefined
}

// ------------------------------------------------------------- readings

/** `idle`: Hybrid, with the person and off the line. */
export type CaseView = 'idle' | 'queued' | 'working' | 'paused' | 'blocked' | 'failed' | 'approval' | 'manual' | 'done'

export function viewOf(c: CaseState): CaseView {
  if (c.stage === DONE) return 'done'
  if (!c.onLine) return 'idle'
  if (c.phase === 'blocked') return 'blocked'
  if (c.phase === 'failed') return 'failed'
  if (c.phase === 'approval') return 'approval'
  if (c.phase === 'manual') return 'manual'
  if (c.paused) return 'paused'
  if (c.phase === 'working') return 'working'
  return 'queued'
}

/** 0..1 through the whole line. */
export function overallProgress(c: CaseState) {
  if (c.stage === DONE) return 1
  const dur = c.durations[c.stage]
  return (c.stage + Math.min(c.t / dur, 1)) / STAGES.length
}

export function stageProgress(c: CaseState) {
  if (c.stage === DONE) return 1
  if (c.phase === 'approval') return 1
  return Math.min(c.t / c.durations[c.stage], 1)
}

/** Stopped on the line and waiting on a person: missing information, a
 *  failed tool, an approval, or a step whose agent is off. */
export const needsPerson = (c: CaseState) =>
  c.onLine && (c.phase === 'blocked' || c.phase === 'failed' || c.phase === 'approval' || c.phase === 'manual')

/** When it stopped — the last block, error or approval line in its trace. */
export const stoppedAt = (c: CaseState) =>
  [...c.trace].reverse().find((t) => t.kind === 'block' || t.kind === 'error' || t.kind === 'approval')?.at ?? 0

/** Why a stopped case is waiting, in one line. */
export function stopReason(c: CaseState) {
  if (c.phase === 'blocked') return SCRIPT_BY_ID[c.id].block?.reason
  return [...c.trace].reverse().find((t) => t.kind === 'error' || t.kind === 'approval' || t.kind === 'block')?.text
}

/** A retry is under way: an error line in the last 1.2s. Drives the flash. */
export const justErred = (c: CaseState, clock: number) => {
  const last = c.trace[c.trace.length - 1]
  return !!last && last.kind === 'error' && clock - last.at < 1200
}

/** The worst backed-up stage, its pile's growth per minute and its oldest
 *  wait, or null when every stage is keeping up. */
export function bottleneckOf(state: RunState, isJammed: (stage: number, waiting: number) => boolean) {
  const live = Object.values(state.cases).filter((c) => c.arrivesAt <= state.clock)
  let worst: { stage: number; waiting: number; oldest: number } | null = null
  STAGES.forEach((_, i) => {
    const queue = live.filter((c) => c.onLine && c.stage === i && c.phase === 'queued')
    if (!isJammed(i, queue.length)) return
    if (worst && worst.waiting >= queue.length) return
    worst = { stage: i, waiting: queue.length, oldest: state.clock - Math.min(...queue.map((c) => c.enteredAt)) }
  })
  if (!worst) return null
  const w: { stage: number; waiting: number; oldest: number } = worst
  const then = state.history.find((h) => h.at >= state.clock - 30000)
  const perMin = then && state.clock > then.at ? ((w.waiting - then.waiting[w.stage]) / (state.clock - then.at)) * 60000 : 0
  return { ...w, perMin: Math.round(perMin) }
}
