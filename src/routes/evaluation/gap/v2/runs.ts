import {
  type SpanStatus,
  acceptRateAt,
  type DecisionClass,
  type Outcome,
  type Touchpoint,
  type Trace,
} from '../data'
import type { Tone } from '@/components/ui/Badge'

/*
 * The run log — every run the class actually made, one row each.
 *
 * WHY THIS EXISTS SEPARATELY FROM `Example cases`. The traces in `../data.ts`
 * are three CHOSEN runs per class: the reference run and the two that make the
 * class's argument. They are the right thing to read first and the wrong thing
 * to audit from, because somebody picked them. This is the population they
 * were picked out of — unselected, in the order it happened — and it is behind
 * a deliberate open for exactly that reason: it is the answer to "show me all
 * of them", which most readers of this screen never ask.
 *
 * THE LABEL IS UTILISATION, NOT CORRECTNESS. A run is scored here on whether
 * the system's own work carried it, which is a different question from whether
 * the quotation that came out was right. The four states are the ones the
 * product already records (`Outcome` in `../data.ts`), read from that angle:
 *
 *   accepted — it produced the values and they stood. The work was used.
 *   modified — it produced them and a person changed one. Used, and corrected.
 *   handed   — it declined to decide and asked. NOT A FAILURE (north star 04):
 *              a class that asks where nothing in the pack settles the
 *              question is the ladder working, so this is its own label and
 *              never folded into the one below it.
 *   added    — it never produced the value and a person supplied it. This is
 *              the one that is unambiguously waste: the run happened and the
 *              intelligence contributed nothing to it.
 *
 * HOW THE ROWS ARE BUILT. The class's four tallies in `../data.ts` are already
 * run-level and already sum to `decisions`, so the label mix here is drawn
 * from them rather than invented — a sample of the real distribution, not a
 * second set of numbers that disagrees with the table it opened from. Each
 * run's per-value states are then derived from its label and the class's own
 * touchpoints, weighted so the values that fail are the ones the touchpoint
 * table already says are weakest. Nothing is random at render: the seed is the
 * class id, so a run carries the same reading every time it is opened.
 */

/** What became of one value on one run. */
export type ValueState = 'kept' | 'changed' | 'supplied' | 'absent' | 'asked' | 'notReached'

/*
 * TWO WORDS, NOT A SENTENCE.
 *
 * These began as clauses — "kept as generated", "a person changed it" — and a
 * column of thirty-two of them reads as prose rather than as a state: the eye
 * has to finish each line before it can tell one row from the next, which is
 * the opposite of what a log is for. A status token is meant to be recognised
 * at a glance and compared down the column, so each is now the shortest form
 * that is still unambiguous. `edited` and `never ran` are deliberately the
 * same words the step list below uses, because on a run that kept a trace the
 * two lists are printed one under the other.
 */
export const STATE_LABEL: Record<ValueState, string> = {
  kept: 'kept',
  changed: 'edited',
  supplied: 'person supplied',
  absent: 'not in pack',
  asked: 'asked',
  notReached: 'never ran',
}

export const STATE_TONE: Record<ValueState, Tone> = {
  kept: 'success',
  changed: 'danger',
  supplied: 'warning',
  absent: 'neutral',
  asked: 'info',
  notReached: 'neutral',
}

/** The states that mean the system's own output stood. */
export const isUsed = (s: ValueState) => s === 'kept'
/** The states that are a shortfall in the system, rather than in the pack. */
export const isDefect = (s: ValueState) => s === 'changed' || s === 'supplied'

export type RunValue = { t: Touchpoint; state: ValueState }

export type Run = {
  id: string
  ref: string
  client: string
  at: string
  outcome: Outcome
  confidence: number
  /** The value that settled how the run ended. */
  decidedAt: string
  values: RunValue[]
  /** Present on the three runs kept as example cases — the recorded steps. */
  trace?: Trace
}

/**
 * The run label, read as utilisation — same rule as the states above.
 *
 * `used as-is` is the phrase the touchpoint table and the class table already
 * use for the same fact, so the log is not a third vocabulary for it.
 */
export const USE_LABEL: Record<Outcome, string> = {
  accepted: 'used as-is',
  modified: 'edited',
  handed: 'asked',
  added: 'not used',
}

/** The same words on the filter chips, which are sentence case. */
export const USE_SHORT: Record<Outcome, string> = {
  accepted: 'Used as-is',
  modified: 'Edited',
  handed: 'Asked',
  added: 'Not used',
}

export const OUTCOMES: Outcome[] = ['accepted', 'modified', 'handed', 'added']

/* ------------------------------------------------------------------ *
 * Deterministic draw
 * ------------------------------------------------------------------ */

function seed(s: string): () => number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** How many runs the log lists. Enough to read a distribution off, short
 *  enough to stay one scroll rather than a second screen. */
export const RUN_SAMPLE = 32

/* Clients the walkthrough's own traces already name, plus the rest of the
 * book. Group health, mid-market, the kind of proposer this flow sees. */
const CLIENTS = [
  'M/s Eicore tech LTD',
  'Harbour Freight Pvt Ltd',
  'Meridian Textiles Ltd',
  'Pinecrest Retail Pvt Ltd',
  'Verity Chemicals Ltd',
  'Selwyn Foods Pvt Ltd',
  'Ridgeway Motors Ltd',
  'Calder Industries Ltd',
  'Northbay Logistics Pvt Ltd',
  'Arcwell Engineering Ltd',
  'Bluestone Analytics Pvt Ltd',
  'Talbot Pharma Ltd',
  'Kestrel Components Pvt Ltd',
  'Orchard Hospitality Ltd',
  'Fairmont Cables Pvt Ltd',
  'Lyndon Steelworks Ltd',
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']

/** Working hours, stepping back from the reference run's own day. */
function stamp(i: number): string {
  const day = 21 - Math.floor(i * 1.6)
  const d = day > 0 ? day : 30 + day
  const m = day > 0 ? 8 : 7
  const hour = 9 + ((i * 3) % 8)
  const min = (i * 17) % 60
  return `${String(d).padStart(2, '0')} ${MONTHS[m]} 2026, ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** Largest remainder, so the sample's mix is the class's mix. */
function mixOf(c: DecisionClass): Outcome[] {
  const tally: Record<Outcome, number> = {
    accepted: c.accepted,
    modified: c.modified,
    handed: c.handed,
    added: c.added,
  }
  const total = c.decisions
  const exact = OUTCOMES.map((o) => (tally[o] / total) * RUN_SAMPLE)
  const take = exact.map((n) => Math.floor(n))
  let left = RUN_SAMPLE - take.reduce((a, b) => a + b, 0)
  const order = exact
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac)
  for (const { i } of order) {
    if (left <= 0) break
    take[i] += 1
    left -= 1
  }
  /* At least one of each, so the filter bar never offers an empty cut on a
     class that does produce that outcome. */
  OUTCOMES.forEach((o, i) => {
    if (take[i] === 0 && tally[o] > 0) {
      const from = take.indexOf(Math.max(...take))
      take[from] -= 1
      take[i] += 1
    }
  })
  return OUTCOMES.flatMap((o, i) => Array<Outcome>(take[i]).fill(o))
}

/**
 * Which value broke, on a run that broke.
 *
 * Weighted by the touchpoint's own shortfall — one minus its acceptance —
 * so the values that fail in the log are the values the touchpoint table
 * already names as weakest. A run log whose failures were spread evenly
 * would contradict the screen it opened from.
 */
function pickWeak(tps: Touchpoint[], r: () => number): Touchpoint {
  const w = tps.map((t) => Math.max(1, 100 - acceptRateAt(t)))
  const total = w.reduce((a, b) => a + b, 0)
  let n = r() * total
  for (let i = 0; i < tps.length; i += 1) {
    n -= w[i]
    if (n <= 0) return tps[i]
  }
  return tps[tps.length - 1]
}

function valuesFor(
  tps: Touchpoint[],
  outcome: Outcome,
  decisive: Touchpoint,
  r: () => number,
): RunValue[] {
  const at = tps.indexOf(decisive)
  /* A second value goes on a third of the corrected runs — one edit is the
     common shape, two is the one worth seeing. */
  const second = outcome === 'modified' && r() < 0.34 ? pickWeak(tps, r) : undefined
  /* A value nobody had. Not a defect, and drawn on its own so a reader can
     tell a blind spot from a document that does not exist. */
  const missingFromPack = r() < 0.22 ? pickWeak(tps, r) : undefined

  return tps.map((t, i) => {
    if (t === decisive) {
      const state: ValueState =
        outcome === 'modified' ? 'changed' : outcome === 'added' ? 'supplied' : outcome === 'handed' ? 'asked' : 'kept'
      return { t, state }
    }
    /* Everything downstream of a question is not a pass — it never ran. */
    if (outcome === 'handed' && i > at) return { t, state: 'notReached' as ValueState }
    if (t === second) return { t, state: 'changed' as ValueState }
    if (t === missingFromPack) return { t, state: 'absent' as ValueState }
    return { t, state: 'kept' as ValueState }
  })
}

/**
 * A recorded step, read as what became of the value it produced.
 *
 * Only used on the runs that kept a trace, and only to CORRECT the derived
 * states: a run whose steps say a value never ran cannot also print that the
 * value was kept as generated two tables above. The decisive value is left
 * alone — that one comes from how the run ended, which the trace states
 * directly.
 */
const FROM_SPAN: Partial<Record<SpanStatus, ValueState>> = {
  ok: 'kept',
  warn: 'kept',
  failed: 'changed',
  missed: 'notReached',
  handoff: 'asked',
  suppressed: 'notReached',
}

/** The log for one class: its three example cases first, then the population. */
export function runsFor(c: DecisionClass): Run[] {
  const r = seed(c.id)
  const tps = c.touchpoints

  /* The recorded traces are runs too, and they are the newest ones: they all
     replay the reference quotation. Reading them at the head of the log is
     what connects the two tabs. */
  const fromTraces: Run[] = c.traces.map((t, i) => {
    const decisive = tps.find((tp) => tp.name === t.decidedAt) ?? tps[0]
    return {
      id: `run-${t.id}`,
      ref: t.ref,
      client: t.subject.split(/[,—]/)[0].trim(),
      at: t.at,
      outcome: t.outcome,
      confidence: t.confidence,
      decidedAt: t.decidedAt,
      values: valuesFor(tps, t.outcome, decisive, seed(`${c.id}-${i}`)).map((v) => {
        if (v.t === decisive) return v
        const span = t.spans.find((sp) => sp.label === v.t.name)
        const state = span && FROM_SPAN[span.status]
        return state ? { t: v.t, state } : v
      }),
      trace: t,
    }
  })

  const mix = mixOf(c)
  /* Shuffled, because the log is in the order the runs happened and outcomes
     do not arrive sorted. Deterministic, so the order holds across renders. */
  for (let i = mix.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1))
    ;[mix[i], mix[j]] = [mix[j], mix[i]]
  }

  const generated: Run[] = mix.slice(fromTraces.length).map((outcome, i) => {
    const n = i + fromTraces.length
    const decisive = outcome === 'accepted' ? tps[Math.floor(r() * tps.length)] : pickWeak(tps, r)
    return {
      id: `run-${c.id}-${n}`,
      ref: `QTN-${40120 - n * 3 - (c.id.charCodeAt(0) % 7)}`,
      client: CLIENTS[(n * 5 + c.id.charCodeAt(1)) % CLIENTS.length],
      at: stamp(n),
      outcome,
      confidence: Number((0.62 + r() * 0.36).toFixed(2)),
      decidedAt: decisive.name,
      values: valuesFor(tps, outcome, decisive, r),
    }
  })

  return [...fromTraces, ...generated]
}

/** What happened to the values on one run, for the log row. */
export function tallyOf(run: Run) {
  const kept = run.values.filter((v) => v.state === 'kept').length
  const defects = run.values.filter((v) => isDefect(v.state)).length
  const absent = run.values.filter((v) => v.state === 'absent').length
  const notReached = run.values.filter((v) => v.state === 'notReached').length
  return { kept, defects, absent, notReached, total: run.values.length }
}
