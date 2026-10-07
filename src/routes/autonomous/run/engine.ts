import { ALL_SCRIPTS, DONE, SCENARIOS, SCRIPT_BY_ID, STAGES, arrivalOf, type ScenarioId } from './script'

/**
 * The run, as a pure reducer.
 *
 * Every tick advances the clock and every case on it. The reducer is pure on
 * purpose: React runs updaters twice under StrictMode, and anything here that
 * read a ref or fired an effect would happen twice (see the StrictMode trap in
 * the project notes).
 */

/** `blocked`: the agent is missing something only a person can supply.
 *  `failed`: a tool call kept failing and the agent gave up retrying. */
export type Phase = 'queued' | 'working' | 'blocked' | 'failed'

export type TraceStep = {
  /** Run-clock milliseconds. */
  at: number
  stage: number
  text: string
  kind?: 'block' | 'resume' | 'done' | 'error'
}

export type CaseState = {
  id: string
  /** 0..4 on the line, `DONE` once decided. */
  stage: number
  phase: Phase
  /** Milliseconds spent in the current stage. */
  t: number
  /** Held by a person: out of its slot, at the top of its stage's queue, and
   *  passed over until someone resumes it. */
  paused: boolean
  unblocked: boolean
  /** Failed tool calls on the error stage so far. */
  errors: number
  /** A person retried after the agent gave up; the tool gets through. */
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
  | { type: 'tick'; dt: number }
  | { type: 'toggle' }
  | { type: 'pauseCase'; id: string }
  | { type: 'unblock'; id: string }
  | { type: 'retry'; id: string }
  | { type: 'replay' }

const MAX_EVENTS = 300
const SAMPLE_MS = 5000
const MAX_SAMPLES = 13

export function initialRun(scenario: ScenarioId = 'normal'): RunState {
  const slow = SCENARIOS.find((s) => s.id === scenario)!.slow
  const cases: Record<string, CaseState> = {}
  ALL_SCRIPTS.forEach((s, i) => {
    cases[s.row.id] = {
      id: s.row.id,
      stage: 0,
      phase: 'queued',
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
  return { scenario, clock: 0, running: true, seq: ALL_SCRIPTS.length, cases, events: [], history: [] }
}

/** The cases that have arrived, in arrival order. */
export const casesOf = (s: RunState) => Object.values(s.cases).filter((c) => c.arrivesAt <= s.clock)

export const isComplete = (s: RunState) => Object.values(s.cases).every((c) => c.stage === DONE)

function tick(state: RunState, dt: number): RunState {
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

  const all = Object.values(cases).filter((c) => c.arrivesAt <= clock)
  for (let s = 0; s < STAGES.length; s++) {
    // Fill free slots from the stage's queue.
    const here = all.filter((c) => cases[c.id].stage === s)
    let free = STAGES[s].capacity - here.filter((c) => cases[c.id].phase === 'working').length
    const waiting = here
      .filter((c) => cases[c.id].phase === 'queued' && !cases[c.id].paused)
      .sort((a, b) => cases[a.id].order - cases[b.id].order)
    for (const c of waiting) {
      if (free <= 0) break
      // `t` is kept: a resumed case picks the stage up where it was paused.
      cases[c.id] = { ...cases[c.id], phase: 'working', startedAt: cases[c.id].startedAt ?? clock }
      free--
    }

    // Move every working case along.
    for (const c0 of here) {
      let c = cases[c0.id]
      if (c.phase !== 'working') continue
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
        if (c.errors === 0 && after >= 0.35) {
          c = log({ ...c, errors: 1 }, { at: clock, stage: s, text: `${err.tool} timed out, retrying (1 of 2)`, kind: 'error' })
        } else if (c.errors === 1 && after >= 0.55) {
          c = err.recovers
            ? log({ ...c, errors: 2 }, { at: clock, stage: s, text: `${err.tool} went through on retry` })
            : log({ ...c, errors: 2 }, { at: clock, stage: s, text: `${err.tool} timed out again, retrying (2 of 2)`, kind: 'error' })
        } else if (!err.recovers && c.errors === 2 && after >= 0.75) {
          cases[c.id] = log(
            { ...c, errors: 3, phase: 'failed' },
            { at: clock, stage: s, text: `${err.tool} failed after 2 retries`, kind: 'error' },
          )
          continue
        }
      }

      if (script.block?.stage === s && !c.unblocked && after >= 0.5) {
        c = log({ ...c, phase: 'blocked' }, { at: clock, stage: s, text: script.block.reason, kind: 'block' })
      } else if (t >= dur) {
        if (s === STAGES.length - 1) {
          c = { ...c, stage: DONE, phase: 'queued', t: 0, resolvedAt: clock }
        } else {
          c = { ...c, stage: s + 1, phase: 'queued', t: 0, order: seq++, enteredAt: clock }
        }
      }
      cases[c.id] = c
    }
  }

  let history = state.history
  if (Math.floor(clock / SAMPLE_MS) > Math.floor(state.clock / SAMPLE_MS)) {
    const live = Object.values(cases).filter((c) => c.arrivesAt <= clock)
    const waiting = STAGES.map((_, i) => live.filter((c) => c.stage === i && c.phase === 'queued').length)
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
      return tick(state, action.dt)
    case 'toggle':
      return { ...state, running: !state.running }
    case 'pauseCase': {
      const c = state.cases[action.id]
      if (!c || c.stage === DONE || c.phase === 'blocked' || c.phase === 'failed') return state
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
    case 'replay':
      return initialRun(state.scenario)
  }
}

// ------------------------------------------------------------- readings

export type CaseView = 'queued' | 'working' | 'paused' | 'blocked' | 'failed' | 'done'

export function viewOf(c: CaseState): CaseView {
  if (c.stage === DONE) return 'done'
  if (c.phase === 'blocked') return 'blocked'
  if (c.phase === 'failed') return 'failed'
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
  return Math.min(c.t / c.durations[c.stage], 1)
}

/** Stopped and waiting on a person: missing information or a failed tool. */
export const needsPerson = (c: CaseState) => c.phase === 'blocked' || c.phase === 'failed'

/** When it stopped — the last block or error line in its trace. */
export const stoppedAt = (c: CaseState) =>
  [...c.trace].reverse().find((t) => t.kind === 'block' || t.kind === 'error')?.at ?? 0

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
    const queue = live.filter((c) => c.stage === i && c.phase === 'queued')
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
