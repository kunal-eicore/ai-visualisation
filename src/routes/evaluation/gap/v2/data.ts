import {
  CLASSES,
  type Driver,
  HISTORY_MONTHS,
  SERIES,
  TOTALS,
  accuracyOf,
  coverageAt,
  settledOf,
  type DecisionClass,
  type GapPoint,
  type Touchpoint,
} from '../data'

/*
 * V2 fixtures — everything V1 could not say.
 *
 * WHAT THIS FILE IS FOR. `../data.ts` holds the measurement model and is not
 * touched: the four observable states, the classes, the touchpoints and the
 * traces are the same population V1 scores. This file adds the five dimensions
 * the audit (`notes/benchmark-gap-audit.md` part 2) found missing, and nothing
 * else. Every value here is constructed — labelled `FIX` in the value map's
 * vocabulary — but the SHAPE of each is taken from the walkthrough, and each
 * derivation below says which finding it was built to produce.
 *
 * WHAT IS DELIBERATELY ABSENT. No rupee exposure, no hours-saved comparison,
 * no cost per quotation. This surface measures system performance, not the
 * value the system drives, and a money figure on it would be answering a
 * different question. Materiality survives as CONTAINMENT — where the system's
 * own checks caught the error — which is a property of the system rather than
 * a claim about the business.
 *
 * Nor is there a clock anywhere. Latency was carried here for one pass and cut:
 * a decision is right or wrong at any speed, nothing else on the page moves
 * when it moves, and it kept inviting the comparison against a person that the
 * scope rules out. Audit gap A4 is answered instead by COVERAGE — what was
 * needed and never put forward — which is the denominator every accuracy
 * figure on this page is quietly scored against.
 */

/* ------------------------------------------------------------------ *
 * A2 — the human benchmark's own spread
 * ------------------------------------------------------------------ */

/**
 * How many underwriters the benchmark is measured across.
 *
 * The single largest unsourced value on V1 was the human line: flat 91-94
 * with no n, no provenance and no spread, sitting opposite a system line that
 * carried a 90% interval. "Five points behind the human" is not interpretable
 * until the human's own disagreement is on the chart — two underwriters differ
 * on sector and loading by far more than five points — and once it is, the
 * finding usually inverts: the system sits INSIDE inter-rater variance.
 */
export const HUMAN_RATERS = 7

/** A human benchmark reading with the disagreement behind it. */
export type HumanBand = {
  /** Mean accuracy across the raters. */
  mid: number
  /** Lowest and highest rater on the same decisions. */
  lo: number
  hi: number
}

/**
 * The spread on a weekly reading.
 *
 * Wider below the mean than above it, because the ceiling is 100 and the floor
 * is not: a careless reading can be much worse than the mean, an excellent one
 * can only be a little better. The weekly wobble is deterministic rather than
 * random so the chart is stable across renders — a band that moves when you
 * reload is a band nobody can read a trend off.
 */
export function humanBandAt(p: GapPoint, i: number): HumanBand {
  return {
    mid: p.benchmark,
    lo: p.benchmark - 8 + (i % 3),
    hi: Math.min(p.benchmark + 4 - (i % 2), 99),
  }
}

export type BandedPoint = GapPoint & { human: HumanBand }

export const bandedSeries = (points: GapPoint[]): BandedPoint[] =>
  points.map((p, i) => ({ ...p, human: humanBandAt(p, i) }))

/** Where a system reading sits relative to the people doing the same work. */
export type Standing = 'inside' | 'below' | 'above'

export function standingOf(system: number, band: HumanBand): Standing {
  if (system < band.lo) return 'below'
  if (system > band.hi) return 'above'
  return 'inside'
}

/**
 * What produced a value, in the words the reader uses.
 *
 * The shared fixture says rule / mixed / model, which are the engineering
 * names for it. V2 is read by an underwriting manager, so the surface says
 * rules / both / AI and the engineering names stay in the data.
 */
export const DRIVER_WORD: Record<'rule' | 'mixed' | 'model', string> = {
  rule: 'rules',
  mixed: 'both',
  model: 'AI',
}

export const STANDING_LABEL: Record<Standing, string> = {
  inside: 'Within the underwriter range',
  below: 'Below every underwriter',
  above: 'Above every underwriter',
}

/**
 * Per-class human spread.
 *
 * The half-width tracks how much judgement the class involves, which is the
 * same axis its authority rung is set on. Reading the proposal documents is a
 * retrieval task and underwriters broadly agree on it; the cover schedule and
 * the claims history are judgement, and two people routinely differ by fifteen
 * points. That inversion is the argument: the classes with the widest human
 * disagreement are the ones where "behind the human" means least.
 */
const CLASS_SPREAD: Record<string, { lo: number; hi: number }> = {
  docs: { lo: 3, hi: 2 },
  census: { lo: 4, hi: 3 },
  covers: { lo: 8, hi: 6 },
  claims: { lo: 9, hi: 7 },
  pricing: { lo: 7, hi: 6 },
}

export function classBand(c: DecisionClass): HumanBand {
  const s = CLASS_SPREAD[c.id] ?? { lo: 5, hi: 4 }
  return { mid: c.benchmark, lo: c.benchmark - s.lo, hi: Math.min(c.benchmark + s.hi, 99) }
}

/* ------------------------------------------------------------------ *
 * A6 — what was running when a reading was taken
 * ------------------------------------------------------------------ */

/**
 * Change events on the curve.
 *
 * A smooth 52-week climb with no change markers reads as a drawn curve rather
 * than a measured one, and the first question a risk function asks is whether
 * the last release made it worse and how fast anybody knew. Each marker names
 * the identity a reading can be attributed to; the weeks are real weeks in
 * `SERIES`.
 */
export type Release = {
  /** Week commencing, matching a point in SERIES. */
  t: string
  /** Rule config or model build — the two things that change an answer. */
  kind: 'rules' | 'model'
  id: string
  what: string
}

export const RELEASES: Release[] = [
  { t: '2025-12-08', kind: 'rules', id: 'GH-2025.4', what: 'Sum insured banding and family structure tables rebuilt.' },
  { t: '2026-02-09', kind: 'model', id: 'reader-v3', what: 'Document reader retrained on scanned packs.' },
  { t: '2026-05-25', kind: 'rules', id: 'GH-2026.1', what: 'Rating table for add-on covers published.' },
  { t: '2026-08-10', kind: 'model', id: 'reader-v4', what: 'Sector classification moved off the general reader.' },
]

/** Which release was live in a given week — the newest one at or before it. */
export function releaseAt(t: string): Release | undefined {
  return [...RELEASES].reverse().find((r) => r.t <= t)
}

/* ------------------------------------------------------------------ *
 * A7 — the one cohort cut: document quality
 * ------------------------------------------------------------------ */

/**
 * The cut, and why it is this one.
 *
 * The class says which capability is weak. It cannot answer the question a
 * buyer actually asks, which is whether it holds on THEIR pack. Of the cuts
 * the audit lists, document quality is the one that separates input difficulty
 * from system capability most cleanly: broker is a blurrier proxy for the same
 * thing, and sector describes the book rather than the system.
 */
export type CohortId = 'native' | 'scanned'

export type Cohort = {
  id: CohortId
  name: string
  what: string
}

export const COHORTS: Cohort[] = [
  {
    id: 'native',
    name: 'Native PDF',
    what: 'The RFQ, census and expiring schedule arrived as digital files with a text layer.',
  },
  {
    id: 'scanned',
    name: 'Scanned or photographed',
    what: 'At least one document in the pack is an image — a scan, or a photograph of a printout.',
  },
]

/**
 * How each outcome column divides between the two cohorts.
 *
 * Shares are set per OUTCOME rather than per class, so the two cohorts fall
 * out of the same four numbers the class already carries and cannot drift from
 * it: `decisions = accepted + modified + handed + added` holds inside each
 * cohort because each cohort's decisions are summed from its own four.
 *
 * Native takes the larger share of `accepted` and the smaller share of
 * everything that went wrong, which is the finding: a scanned pack is where
 * the remaining gap lives.
 */
const NATIVE_SHARE: Record<string, { accepted: number; modified: number; handed: number; added: number }> = {
  docs: { accepted: 0.78, modified: 0.42, handed: 0.5, added: 0.35 },
  census: { accepted: 0.74, modified: 0.45, handed: 0.52, added: 0.38 },
  covers: { accepted: 0.76, modified: 0.48, handed: 0.55, added: 0.4 },
  claims: { accepted: 0.72, modified: 0.46, handed: 0.53, added: 0.36 },
  pricing: { accepted: 0.75, modified: 0.5, handed: 0.58, added: 0.42 },
}

/**
 * The human is measured per cohort too, and degrades LESS than the system.
 *
 * That asymmetry is the whole reason the cut is worth drawing. If people fell
 * away on scans exactly as fast as the system does, a scanned pack would be
 * hard rather than a weakness, and the gap would be unchanged. It is not: an
 * underwriter reads a bad photocopy at a small cost, and the system does not.
 */
const COHORT_BENCHMARK: Record<CohortId, number> = { native: 1, scanned: -3 }

export type CohortRow = {
  cohort: Cohort
  decisions: number
  accepted: number
  modified: number
  handed: number
  added: number
  settled: number
  accuracy: number
  unaided: number
  benchmark: number
  band: HumanBand
  gap: number
}

/**
 * Split one class into its two cohorts.
 *
 * Native is rounded and scanned takes the remainder, so the pair always sums
 * to the class exactly. A cohort view that does not add up to the total above
 * it is worse than no cohort view.
 */
export function cohortsFor(c: DecisionClass): CohortRow[] {
  const share = NATIVE_SHARE[c.id] ?? { accepted: 0.75, modified: 0.45, handed: 0.5, added: 0.4 }
  const classSpread = CLASS_SPREAD[c.id] ?? { lo: 5, hi: 4 }

  const nat = {
    accepted: Math.round(c.accepted * share.accepted),
    modified: Math.round(c.modified * share.modified),
    handed: Math.round(c.handed * share.handed),
    added: Math.round(c.added * share.added),
  }
  const parts: Record<CohortId, typeof nat> = {
    native: nat,
    scanned: {
      accepted: c.accepted - nat.accepted,
      modified: c.modified - nat.modified,
      handed: c.handed - nat.handed,
      added: c.added - nat.added,
    },
  }

  return COHORTS.map((cohort) => {
    const p = parts[cohort.id]
    const decisions = p.accepted + p.modified + p.handed + p.added
    const settled = p.accepted + p.modified
    const accuracy = Math.round((p.accepted / settled) * 100)
    const benchmark = c.benchmark + COHORT_BENCHMARK[cohort.id]
    return {
      cohort,
      ...p,
      decisions,
      settled,
      accuracy,
      unaided: Math.round((settled / decisions) * 100),
      benchmark,
      band: { mid: benchmark, lo: benchmark - classSpread.lo, hi: Math.min(benchmark + classSpread.hi, 99) },
      gap: benchmark - accuracy,
    }
  })
}

/** Roll the cohort split up across every class, for the page-level strip. */
export function cohortTotals(): CohortRow[] {
  const rows = CLASSES.map(cohortsFor)
  return COHORTS.map((cohort, i) => {
    const mine = rows.map((r) => r[i])
    const add = (pick: (r: CohortRow) => number) => mine.reduce((a, r) => a + pick(r), 0)
    const accepted = add((r) => r.accepted)
    const modified = add((r) => r.modified)
    const handed = add((r) => r.handed)
    const added = add((r) => r.added)
    const settled = accepted + modified
    const decisions = accepted + modified + handed + added
    const accuracy = Math.round((accepted / settled) * 100)
    /* Decision-weighted, so a cohort benchmark is the benchmark of the work
     * actually in it and not an average of five unrelated numbers. */
    const benchmark = Math.round(add((r) => r.benchmark * r.decisions) / decisions)
    const lo = Math.round(add((r) => r.band.lo * r.decisions) / decisions)
    const hi = Math.round(add((r) => r.band.hi * r.decisions) / decisions)
    return {
      cohort,
      accepted,
      modified,
      handed,
      added,
      settled,
      decisions,
      accuracy,
      unaided: Math.round((settled / decisions) * 100),
      benchmark,
      band: { mid: benchmark, lo, hi },
      gap: benchmark - accuracy,
    }
  })
}

/* ------------------------------------------------------------------ *
 * A3 — not every defect weighs the same
 * ------------------------------------------------------------------ */

/**
 * Where the error was caught, and what it touched.
 *
 * Two axes that are genuinely independent, which is the only reason a matrix
 * earns its place. WHEN is about the system's own checks: an error the
 * pre-calculation check catches before pricing runs costs a recompute, and the
 * same error found after the quotation was prepared costs a re-issue. WHAT is
 * about reach: a field that is wrong on the record, a premium that is wrong in
 * rupees, a cover term that is wrong in the contract.
 *
 * Neither axis is money. Both are properties of the system: which of its gates
 * fired, and how far the value had travelled when one did. `tr-cen-3` is the
 * worked example already in the fixture — 96 mother-in-law rows corrected
 * before pricing ran, a caught error with a named reach.
 */
export const CAUGHT = [
  { id: 'before', label: 'Before pricing ran', what: 'A downstream check of the system’s own caught it while the run was still in flight.' },
  { id: 'checkpoint', label: 'At the review screen', what: 'The person found it at the review checkpoint, which is where the flow asks them to look.' },
  { id: 'after', label: 'After the quote was ready', what: 'Nothing caught it before the quotation was assembled, so correcting it meant redoing work.' },
] as const

export const TOUCHED = [
  { id: 'field', label: 'Just the record', what: 'Wrong on the record, and nothing downstream had consumed it yet.' },
  { id: 'premium', label: 'The premium', what: 'The number the quotation is priced on moved.' },
  { id: 'terms', label: 'What is covered', what: 'What is actually covered changed — a limit, an add-on, a family definition.' },
] as const

export type CaughtId = (typeof CAUGHT)[number]['id']
export type TouchedId = (typeof TOUCHED)[number]['id']

/**
 * Per class, how its defects distribute over the nine cells.
 *
 * Rows are `TOUCHED`, columns are `CAUGHT`. The shape follows where the class
 * sits in the flow: document extraction and census run early and most of what
 * they get wrong is caught before pricing, while pricing is last and has
 * nothing downstream of it, so its errors land in the right-hand column — the
 * expensive one. That is also why pricing is the class held at the lowest
 * authority rung, so the matrix and the rung are two views of one fact.
 */
const CONTAINMENT_SHAPE: Record<string, number[][]> = {
  docs: [
    [0.34, 0.14, 0.03],
    [0.16, 0.1, 0.02],
    [0.12, 0.07, 0.02],
  ],
  census: [
    [0.4, 0.13, 0.03],
    [0.14, 0.09, 0.03],
    [0.1, 0.06, 0.02],
  ],
  covers: [
    [0.1, 0.12, 0.04],
    [0.09, 0.14, 0.06],
    [0.12, 0.22, 0.11],
  ],
  claims: [
    [0.08, 0.13, 0.05],
    [0.14, 0.24, 0.12],
    [0.07, 0.11, 0.06],
  ],
  pricing: [
    [0.06, 0.12, 0.08],
    [0.08, 0.26, 0.2],
    [0.03, 0.1, 0.07],
  ],
}

/** Every defect the class produced: proposed-and-changed, plus never-offered. */
export const defectsOf = (c: DecisionClass) => c.modified + c.added

/**
 * The nine cells for one class, or for every class summed.
 *
 * Rounded with the remainder pushed into the largest cell so the matrix always
 * totals the defect count exactly — nine rounded percentages will not.
 */
export function containmentOf(classes: DecisionClass[]): number[][] {
  const grid = TOUCHED.map(() => CAUGHT.map(() => 0))
  for (const c of classes) {
    const shape = CONTAINMENT_SHAPE[c.id]
    if (!shape) continue
    const total = defectsOf(c)
    let placed = 0
    let biggest = { r: 0, k: 0, v: -1 }
    shape.forEach((row, r) =>
      row.forEach((f, k) => {
        const n = Math.round(total * f)
        grid[r][k] += n
        placed += n
        if (f > biggest.v) biggest = { r, k, v: f }
      }),
    )
    grid[biggest.r][biggest.k] += total - placed
  }
  return grid
}

/** Share of one class's defects that never reached a prepared quotation. */
export function containedShareOf(c: DecisionClass): number {
  const grid = containmentOf([c])
  const total = grid.flat().reduce((a, n) => a + n, 0)
  const after = grid.reduce((a, row) => a + row[2], 0)
  return Math.round(((total - after) / total) * 100)
}

/**
 * How serious a cell is, for its surface tone.
 *
 * Severity rises to the right (caught later) and downward (reached further).
 * The bottom-right cell — cover terms wrong on a prepared quotation — is the
 * one the whole rung system exists to keep small.
 */
export function cellTone(r: number, k: number): 'neutral' | 'warning' | 'danger' {
  const weight = r + k
  if (weight >= 3) return 'danger'
  if (weight >= 2) return 'warning'
  return 'neutral'
}

/* ------------------------------------------------------------------ *
 * A4 — what the class never put forward at all
 * ------------------------------------------------------------------ */

/*
 * WHY THIS IS NOT LATENCY ANY MORE. An earlier pass carried p50, p95 and the
 * slowest span here, on the argument that speed is system performance rather
 * than a value claim. It is — but it is not performance at the thing this
 * screen measures. Nothing on this page is scored against a clock: a decision
 * that took nine seconds and one that took two are the same decision, right or
 * wrong, and no reading elsewhere on the screen moves when the number does.
 * Beside a gap to the underwriter range it is noise wearing the costume of a
 * metric, and it invited exactly the comparison the scope forbids — that a
 * person would have taken longer.
 *
 * WHAT REPLACED IT, AND WHY IT IS THE HONEST PAIR TO ACCURACY. Every accuracy
 * figure on this page is scored on values the system PUT FORWARD. Coverage is
 * that measure's denominator: the occasions it was needed and nothing was
 * offered. A class can hold 95% kept while staying silent on a sixth of what
 * it was asked for, and until this is drawn the two are indistinguishable.
 *
 * It splits in two, and only one half is a defect. `added` is a blind spot —
 * the value was in the pack and a person supplied it. `absent` is nobody
 * having it, which is a shortfall in the submission and not in the system.
 */
export type Coverage = {
  expected: number
  proposed: number
  /** Never proposed, and a person supplied it. The blind spot. */
  added: number
  /** Never proposed and nobody had it. Not a defect. */
  absent: number
  /** Share of occasions a value was put forward at all. */
  coverage: number
  /** The touchpoint carrying the most of the blind spot. */
  blindest: { name: string; added: number }
}

export function coverageOf(c: DecisionClass): Coverage {
  const at = (pick: (t: Touchpoint) => number) => c.touchpoints.reduce((a, t) => a + pick(t), 0)
  const expected = at((t) => t.expected)
  const proposed = at((t) => t.proposed)
  const added = at((t) => t.added)
  const worst = [...c.touchpoints].sort((a, b) => b.added - a.added)[0]
  return {
    expected,
    proposed,
    added,
    absent: expected - proposed - added,
    coverage: Math.round((proposed / expected) * 100),
    blindest: { name: worst.name, added: worst.added },
  }
}

export const COVERAGE_TOTAL = (() => {
  const all = CLASSES.map(coverageOf)
  const sumOf = (pick: (x: Coverage) => number) => all.reduce((a, x) => a + pick(x), 0)
  const expected = sumOf((x) => x.expected)
  const proposed = sumOf((x) => x.proposed)
  const added = sumOf((x) => x.added)
  return {
    expected,
    proposed,
    added,
    absent: expected - proposed - added,
    missing: expected - proposed,
    coverage: Math.round((proposed / expected) * 100),
  }
})()

/* ------------------------------------------------------------------ *
 * A5 — the handoffs the screen could not follow
 * ------------------------------------------------------------------ */

/**
 * What became of the decisions the class handed to a person.
 *
 * 613 handoffs are correctly not scored as failures. But `tr-prc-3` is
 * literally a sector escalation nobody answered, and a handoff nobody answers
 * is a stalled quotation — so without this beside it, "handoffs are the ladder
 * working" is unfalsifiable.
 *
 * Counted, not clocked. An earlier pass measured this in hours to an answer,
 * which turned a reading about the system into a reading about how quickly
 * people reply to it. Whether it came back is the system's business; how long
 * somebody took is theirs.
 */
export type Handoffs = {
  /** Handed to a person over the period — `c.handed`. */
  handed: number
  /** Still waiting on one right now. */
  open: number
  /** Answered, and the decision carried on. */
  returned: number
}

const OPEN: Record<string, number> = { docs: 19, census: 14, covers: 22, claims: 17, pricing: 26 }

export function handoffsOf(c: DecisionClass): Handoffs {
  const open = OPEN[c.id]
  return { handed: c.handed, open, returned: c.handed - open }
}

/**
 * The same 613, split by what was actually asked for.
 *
 * The split is the finding, and it survives dropping the clock intact: a
 * question goes to whoever is on the run and nearly always comes back; a
 * delegation frequently leaves the building — `tr-cen-2` is a request to Marsh
 * India drafted and deliberately left unsent — and two in five are still
 * waiting. Nothing inside the product can make an outside party reply, which
 * is the argument for asking outward as rarely as possible.
 */
export const HANDOFFS_BY_KIND = [
  { kind: 'question', label: 'Asked during the run', handed: 307, open: 24, waitsOn: 'whoever is on the case' },
  { kind: 'escalation', label: 'Sent to a senior', handed: 195, open: 31, waitsOn: 'the referral queue' },
  { kind: 'delegation', label: 'Sent outside', handed: 111, open: 43, waitsOn: 'the broker or the client' },
] as const

export const HANDOFF_TOTAL = (() => {
  const handed = HANDOFFS_BY_KIND.reduce((a, k) => a + k.handed, 0)
  const open = HANDOFFS_BY_KIND.reduce((a, k) => a + k.open, 0)
  return { handed, open, returned: handed - open }
})()

/* ------------------------------------------------------------------ *
 * A8 — a touchpoint carried one reading, the class carried twelve
 * ------------------------------------------------------------------ */

/**
 * Twelve monthly accept-rate readings per touchpoint.
 *
 * The fixes are made at touchpoint level and could not be seen there, so
 * "which fix worked" was unanswerable at the level the fixes happen. Generated
 * rather than written out: 28 touchpoints times 12 months is 336 literals
 * nobody would keep consistent with the current reading they have to end on.
 *
 * Seeded from the touchpoint id so a reload draws the same line — a history
 * that changes when you refresh is not a history. The series ends exactly on
 * the touchpoint's live accept rate and climbs toward it, with a per-month
 * wobble that never breaks the trend.
 */
function seed(id: string): () => number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return ((h >>> 0) % 1000) / 1000
  }
}

export function historyOf(t: Touchpoint): number[] {
  const end = Math.round((t.accepted / t.proposed) * 100)
  /* A weaker touchpoint started further back: there was more to fix. */
  const climb = Math.round((100 - end) * 0.9) + 6
  const rand = seed(t.id)
  const out: number[] = []
  for (let m = 0; m < HISTORY_MONTHS.length; m++) {
    const along = m / (HISTORY_MONTHS.length - 1)
    /* Eased, not linear: most of the movement is early, which is what a
     * touchpoint that got a config fix and then held actually looks like. */
    const base = end - climb * (1 - along) ** 1.6
    const wobble = m === HISTORY_MONTHS.length - 1 ? 0 : (rand() - 0.5) * 2.4
    out.push(Math.max(0, Math.min(100, Math.round(base + wobble))))
  }
  out[out.length - 1] = end
  return out
}

/** What a sparkline's hover card states: the spread behind the line. */
export type SeriesStat = { last: number; median: number; min: number; max: number }

export function statsOf(values: number[]): SeriesStat {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return {
    last: values[values.length - 1],
    median:
      sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  }
}

/* ------------------------------------------------------------------ *
 * A1 — the one the screen cannot honestly measure yet
 * ------------------------------------------------------------------ */

/**
 * Acceptance integrity, rendered as a named check in an `unknown` state.
 *
 * The whole surface rests on "the person kept it", and that is gameable from
 * both sides: by a system that is agreeable, and by a reviewer who
 * rubber-stamps. Automation bias is the most predictable failure of a surface
 * like this, and 97% acceptance in the 0.9+ confidence bucket is exactly what
 * it looks like from the inside.
 *
 * V1 half-admitted this in a tooltip and then leaned on the metric anyway.
 * V2 states it as a check that has not got its data yet, in the same shape as
 * a check that passed — visible, named, and convertible into a real measure
 * the day a post-Apply correction record exists. Inventing a number here would
 * have been the one dishonest thing on the page.
 */
export const INTEGRITY_CHECK = {
  name: 'Acceptance integrity',
  state: 'unknown' as const,
  says: 'Not enough recorded history to separate a value that was right from one that was waved through.',
  needs:
    'A correction made after Apply — an amendment, a re-quote delta, or a second underwriter scoring a sample. Until one of those is captured, every acceptance figure on this page is what the person did, not whether they were right to.',
  affects: ['Kept as generated', 'Every class accuracy', 'Confidence against outcome'],
}

/* ------------------------------------------------------------------ *
 * Page-level roll-ups
 * ------------------------------------------------------------------ */

export const SETTLED_ALL = TOTALS.accepted + TOTALS.modified

/** The page headline: the system's own score on everything it settled. */
export const SYSTEM_ACCURACY = Math.round((TOTALS.accepted / SETTLED_ALL) * 100)

/** Decision-weighted human mean and spread across all five classes. */
export const HUMAN_ALL: HumanBand = (() => {
  const w = CLASSES.reduce((a, c) => a + c.decisions, 0)
  const at = (pick: (b: HumanBand) => number) =>
    Math.round(CLASSES.reduce((a, c) => a + pick(classBand(c)) * c.decisions, 0) / w)
  return { mid: at((b) => b.mid), lo: at((b) => b.lo), hi: at((b) => b.hi) }
})()

/** Defects that never reached a prepared quotation, over all defects. */
export const CONTAINED_SHARE = (() => {
  const grid = containmentOf(CLASSES)
  const total = grid.flat().reduce((a, n) => a + n, 0)
  const after = grid.reduce((a, row) => a + row[2], 0)
  return { total, after, share: Math.round(((total - after) / total) * 100) }
})()

/** Coverage decomposed the way the touchpoint table shows it. */
export const coverageParts = (t: Touchpoint) => ({
  proposed: t.proposed,
  added: t.added,
  absent: t.expected - t.proposed - t.added,
  coverage: coverageAt(t),
})

export { accuracyOf, settledOf, CLASSES, SERIES, TOTALS, HISTORY_MONTHS }

/* ------------------------------------------------------------------ *
 * Driver composition
 * ------------------------------------------------------------------ */

/**
 * What produced a class's proposals, as a composition rather than a figure.
 *
 * V1 printed `ruleShare` as a bare percentage — "53%" — which is a number a
 * reader cannot act on without first being told what it is a share OF, and
 * which quietly averages three different situations into one. The useful
 * reading is the SPLIT: how much of what this class put forward came from a
 * table somebody wrote, how much from a judgement, and how much from both.
 *
 * Weighted by proposals, not by touchpoint count: a rule that settles the
 * busiest touchpoint in a class is not the same claim as one that settles its
 * rarest, and counting touchpoints states both identically.
 */
export function driverMixOf(c: DecisionClass) {
  const total = c.touchpoints.reduce((a, t) => a + t.proposed, 0)
  const by = (d: Driver) =>
    c.touchpoints.filter((t) => t.driver === d).reduce((a, t) => a + t.proposed, 0)
  return {
    rule: by('rule') / total,
    mixed: by('mixed') / total,
    model: by('model') / total,
  }
}

/** How many of the class's touchpoints sit in each driver. */
export function driverCountsOf(c: DecisionClass) {
  const n = (d: Driver) => c.touchpoints.filter((t) => t.driver === d).length
  return { rule: n('rule'), mixed: n('mixed'), model: n('model'), all: c.touchpoints.length }
}

/** The driver that produced most of what the class proposed. */
export function dominantDriverOf(c: DecisionClass): Driver {
  const mix = driverMixOf(c)
  return (Object.entries(mix).sort((a, b) => b[1] - a[1])[0][0] as Driver) ?? 'mixed'
}
