import type { Tone } from '@/components/ui/Badge'

/*
 * Fixtures for the Benchmark Gap surface.
 *
 * WHERE THIS COMES FROM. The decision classes, their authority rungs, their
 * touchpoints and the whole reference run are taken from the group health
 * quotation walkthrough in `../../quotation/group-health/data.ts` — `AGENTS`
 * for the roster, `RUN_TASKS` for what each class decided on the M/s Eicore
 * tech LTD renewal, and `IMPORT_CHECKS`, `EXTRACTION_FILES`, `RECONCILE_ROWS`,
 * `COVERS_FROM_EXPIRING`, `QUOTE_SOURCES`, `AGE_WISE_CLAIMS` and `PREMIUM` for
 * the values. Nothing here invents a class, a step or a number the walkthrough
 * does not already run on. Quotation MAGM-400201-26-7000002-1 is the run the
 * first trace of every class replays.
 *
 * A CLASS SPANS THE FLOW, NOT A SCREEN. Proposal documents is not "the upload
 * step" — it owns the entity, the policy period, the sector and the
 * intermediary on Business Details too, because those are the same kind of
 * decision made from the same documents. Premium rating spans the Summary
 * checkpoint and the Process Sheet. So every class carries the `steps` it reaches and
 * every touchpoint names the step it fires in: a class whose scope is drawn at
 * a screen boundary is a screen, not a decision class.
 *
 * HOW A TOUCHPOINT IS SCORED. Not against an oracle — against what the person
 * did with what the system produced. Four observable states, and they are the
 * whole measurement model:
 *
 *   proposed + accepted  — the value stood as generated
 *   proposed + modified  — it was put forward and the person changed it
 *   not proposed + added — the person supplied a value the system never
 *                          offered: it was in the pack and was not read, or it
 *                          should have been asked for and was not
 *   not proposed, not added — nobody had it. Genuinely absent from the pack,
 *                          which is the one shortfall that is not a defect
 *
 * That is why there is no separate ground truth to maintain. The product
 * already records it: every Apply, every edit over a generated value and every
 * field a person fills into a blank is one of those four.
 *
 * HANDOFFS ARE NOT FAILURES. The walkthrough settles five of its ten tasks and
 * hands off five — `question`, `escalation`, `delegation` — and the handoffs
 * are the ladder working (north star 04 and 09). So accuracy is scored on what
 * the class SETTLED, and the handoff rate sits beside it, never inside it.
 * Count handoffs as failures and a careful class looks incompetent; count them
 * as successes and a class that asks for help on everything scores 100%.
 */

/* ------------------------------------------------------------------ *
 * Workflow scope
 * ------------------------------------------------------------------ */

export type WorkflowOption = {
  id: string
  name: string
  journey: string
  /** Only the group health quotation is instrumented end to end. */
  modelled: boolean
}

export const WORKFLOWS: WorkflowOption[] = [
  { id: 'wf-gh-quote', name: 'Group health quotation', journey: 'Quotation', modelled: true },
  { id: 'wf-uw-referral', name: 'UW referral triage', journey: 'Underwriting', modelled: false },
  { id: 'wf-quote-stp', name: 'Quotation STP fork', journey: 'Policy builder', modelled: false },
  { id: 'wf-dedupe', name: 'Contact dedupe', journey: 'Contact management', modelled: false },
]

/** The seven-step spine the classes are spread across. */
export const FLOW_STEPS = [
  'Start Quotation',
  'Business Details',
  'Member Details',
  'Cover Details',
  'Claims and TPA',
  'Summary',
  'Process Sheet',
] as const

/** The run every class's first trace replays. */
export const REFERENCE_RUN = {
  quotation: 'MAGM-400201-26-7000002-1',
  client: 'M/s Eicore tech LTD',
  summary: 'Group health renewal, 3,616 lives across 1,367 employees, three sum-insured bands.',
}

/* ------------------------------------------------------------------ *
 * The gap over time
 * ------------------------------------------------------------------ */

export const RANGES = ['30 days', '90 days', '6 months', '12 months'] as const
export type Range = (typeof RANGES)[number]

/** How many weekly points each range slices off the end of the series. */
export const RANGE_WEEKS: Record<Range, number> = {
  '30 days': 5,
  '90 days': 13,
  '6 months': 26,
  '12 months': 52,
}

export type GapPoint = {
  /** Week commencing, ISO. */
  t: string
  /** Human benchmark accuracy on the same decisions, same week. */
  benchmark: number
  system: number
  /** Half-width of the system's 90% interval, in points. */
  ci: number
}

/*
 * 52 weeks, week-commencing Monday, ending on the reference run's own week.
 *
 * The benchmark is flat and noisy rather than a straight line because it is
 * measured, not assumed — a human baseline that never moves is a baseline
 * nobody re-measured. The interval around the system narrows as volume
 * accumulates, which is why it is carried as data: a gap of 5 points with an
 * interval of 9 is not the same claim as a gap of 5 with an interval of 3,
 * and a chart drawing only the lines would state both identically.
 */
const RAW: [string, number, number, number][] = [
  ['2025-09-29', 92, 51, 9],
  ['2025-10-06', 93, 53, 9],
  ['2025-10-13', 92, 52, 8],
  ['2025-10-20', 91, 55, 9],
  ['2025-10-27', 93, 56, 8],
  ['2025-11-03', 92, 55, 8],
  ['2025-11-10', 94, 58, 8],
  ['2025-11-17', 93, 59, 7],
  ['2025-11-24', 92, 58, 8],
  ['2025-12-01', 93, 61, 7],
  ['2025-12-08', 91, 62, 7],
  ['2025-12-15', 92, 61, 7],
  ['2025-12-22', 93, 64, 7],
  ['2025-12-29', 94, 65, 6],
  ['2026-01-05', 92, 64, 7],
  ['2026-01-12', 93, 66, 6],
  ['2026-01-19', 92, 67, 6],
  ['2026-01-26', 91, 66, 6],
  ['2026-02-02', 93, 69, 6],
  ['2026-02-09', 92, 70, 6],
  ['2026-02-16', 93, 69, 5],
  ['2026-02-23', 94, 71, 6],
  ['2026-03-02', 92, 72, 5],
  ['2026-03-09', 93, 71, 5],
  ['2026-03-16', 92, 73, 5],
  ['2026-03-23', 93, 74, 5],
  ['2026-03-30', 91, 73, 5],
  ['2026-04-06', 92, 75, 4],
  ['2026-04-13', 94, 76, 5],
  ['2026-04-20', 93, 75, 4],
  ['2026-04-27', 92, 77, 4],
  ['2026-05-04', 93, 78, 4],
  ['2026-05-11', 92, 77, 4],
  ['2026-05-18', 94, 79, 4],
  ['2026-05-25', 93, 80, 4],
  ['2026-06-01', 92, 79, 4],
  ['2026-06-08', 91, 81, 3],
  ['2026-06-15', 93, 82, 4],
  ['2026-06-22', 92, 81, 3],
  ['2026-06-29', 93, 83, 4],
  ['2026-07-06', 94, 84, 3],
  ['2026-07-13', 92, 83, 3],
  ['2026-07-20', 93, 84, 3],
  ['2026-07-27', 92, 85, 3],
  ['2026-08-03', 93, 84, 3],
  ['2026-08-10', 91, 86, 3],
  ['2026-08-17', 92, 85, 3],
  ['2026-08-24', 93, 86, 3],
  ['2026-08-31', 94, 87, 3],
  ['2026-09-07', 93, 86, 3],
  ['2026-09-14', 92, 87, 3],
  ['2026-09-21', 93, 88, 3],
]

export const SERIES: GapPoint[] = RAW.map(([t, benchmark, system, ci]) => ({ t, benchmark, system, ci }))

export function seriesFor(range: Range): GapPoint[] {
  return SERIES.slice(-RANGE_WEEKS[range])
}

/* ------------------------------------------------------------------ *
 * Confidence
 * ------------------------------------------------------------------ */

/**
 * Stated confidence against what the person then did, bucketed over the
 * decisions the class settled — a handed-off decision has no outcome to score.
 *
 * The finding is the one the walkthrough's own confidences predict. The tasks
 * it settles carry 0.93 to 0.99 and the ones it hands off carry 0.58 to 0.74,
 * and across a population that shape comes out as a system that UNDER-states
 * what it knows: every bucket is accepted more often than it claimed it would
 * be. That is not a harmless error in the safe direction — it is the direct
 * cause of the handoff column below. 613 decisions went to a person, and on
 * this evidence a share of them did not need to.
 */
export type CalibrationBucket = {
  band: string
  /** Mean confidence stated inside this band, as a percentage. */
  stated: number
  /** Share of those decisions the person then accepted unchanged. */
  actual: number
  n: number
}

export const CALIBRATION: CalibrationBucket[] = [
  { band: '0.5 to 0.6', stated: 55, actual: 62, n: 168 },
  { band: '0.6 to 0.7', stated: 65, actual: 71, n: 287 },
  { band: '0.7 to 0.8', stated: 75, actual: 83, n: 566 },
  { band: '0.8 to 0.9', stated: 85, actual: 91, n: 894 },
  { band: '0.9 to 1.0', stated: 96, actual: 97, n: 1060 },
]

/* ------------------------------------------------------------------ *
 * Decision classes
 * ------------------------------------------------------------------ */

/** The authority rung the class runs at — `AGENTS[*].rung` in the walkthrough. */
export type Rung = 'AI-assisted' | 'Hybrid' | 'Autonomous'

export const RUNG_TONE: Record<Rung, Tone> = {
  'AI-assisted': 'neutral',
  Hybrid: 'info',
  Autonomous: 'brand',
}

/**
 * One observable step inside a decision, scored by what the person did with
 * what the system produced.
 *
 * `accepted + modified = proposed`, and `added` is counted out of the
 * occasions the system proposed nothing. The remainder — expected, not
 * proposed, not added — is the value nobody had, and it is the only shortfall
 * here that is not a defect.
 */
/**
 * What actually produced the value: a deterministic rule, the model, or both
 * depending on the input.
 *
 * `rule` is a lookup, a mapping, a validation or arithmetic — a published
 * template register, a rating table, a synonym table, incurred over earned.
 * Given the same input it returns the same answer, and it is configuration
 * somebody wrote rather than anything the system inferred. `model` is a
 * reading or a judgement. `mixed` is the common case: the rule settles the
 * inputs it covers and the model takes the remainder.
 *
 * It is carried because accuracy alone cannot be read without it. A class
 * that scores 96% on touchpoints that are 100% rule-driven has demonstrated
 * that its configuration is correct, not that it can reason — and the gap it
 * closes against the human benchmark was closed by a table. It also points
 * the fix: a rule-driven shortfall is a config change, a model-driven one is
 * not.
 */
export type Driver = 'rule' | 'model' | 'mixed'

export const DRIVER_LABEL: Record<Driver, string> = {
  rule: 'rule',
  model: 'model',
  mixed: 'mixed',
}

/** Rule is deliberately the quiet one: deterministic is the unremarkable case. */
export const DRIVER_FG: Record<Driver, string> = {
  rule: 'text-muted',
  model: 'text-brand-fg',
  mixed: 'text-info-fg',
}

export type Touchpoint = {
  id: string
  name: string
  what: string
  /** The step of the spine it fires in. */
  step: string
  /** Rule, model, or both — see `Driver`. */
  driver: Driver
  /** Share of the proposals at this touchpoint produced deterministically. */
  ruleShare: number
  /** The rule itself, named. Reads as the second half of the touchpoint tip. */
  rule: string
  /** Occasions a value was needed. */
  expected: number
  /** Occasions the system put one forward. */
  proposed: number
  /** Proposed and kept as generated. */
  accepted: number
  /** Not proposed, and the person supplied it anyway. */
  added: number
  /** What the reference run did here, or why the shortfall is the shape it is. */
  note: string
}

/** Proposed and then changed by the person. */
export const modifiedAt = (t: Touchpoint) => t.proposed - t.accepted
/** Needed and never put forward. */
export const blankAt = (t: Touchpoint) => t.expected - t.proposed
/** Blank, and nobody supplied it either — absent from the pack. */
export const absentAt = (t: Touchpoint) => blankAt(t) - t.added
export const coverageAt = (t: Touchpoint) => Math.round((t.proposed / t.expected) * 100)
export const acceptRateAt = (t: Touchpoint) => Math.round((t.accepted / t.proposed) * 100)

/** A span in one decision's recorded execution. */
export type SpanStatus = 'ok' | 'warn' | 'failed' | 'missed' | 'handoff' | 'suppressed'

export type Span = {
  label: string
  /** Nesting level, 0 = root. */
  depth: number
  /** Zero for a span that never ran. */
  ms: number
  status: SpanStatus
  /** What the step read and what it concluded — the explainability line. */
  detail: string
}

/** The four states a decision can end in, in the person's terms. */
export type Outcome = 'accepted' | 'modified' | 'handed' | 'added'

export const OUTCOME_TONE: Record<Outcome, Tone> = {
  accepted: 'success',
  modified: 'danger',
  handed: 'info',
  added: 'warning',
}

/**
 * Which outcomes a reader has to act on.
 *
 * The Badge dot is reserved for these. A dot on every status badge is
 * decoration — it costs the reader a scan of the whole column to find the
 * rows that are actually asking for something, because every row is raising
 * its hand. `accepted` needs nothing. `handed` is the ladder working (north
 * star 04) and is deliberately not marked, or every careful class would read
 * as a class in trouble. What is left is the two that are defects: a value
 * the system produced and a person had to change, and a value it never
 * produced at all.
 */
export const OUTCOME_ATTENTION: Record<Outcome, boolean> = {
  accepted: false,
  modified: true,
  handed: false,
  added: true,
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  accepted: 'accepted as generated',
  modified: 'modified by the user',
  handed: 'handed off',
  added: 'added by the user',
}

/** The three kinds the walkthrough models, on the traces that ended in one. */
export type HandoffKind = 'question' | 'escalation' | 'delegation'

export type Trace = {
  id: string
  ref: string
  subject: string
  at: string
  outcome: Outcome
  /** Present when `outcome` is handed — kind, and who it went to. */
  handoff?: { kind: HandoffKind; to: string }
  /** The system's own stated confidence in this decision. */
  confidence: number
  /** Which touchpoint settled the outcome. */
  decidedAt: string
  summary: string
  spans: Span[]
}

export type DecisionClass = {
  id: string
  name: string
  rung: Rung
  /** The agent that owns it, from `AGENTS` in the walkthrough. */
  agent: string
  /** Every step of the spine this class reaches. */
  steps: string[]
  /** What the class is authorised to decide, in one line. */
  decides: string
  /** Where its authority stops — the half of rung 04 that is not the verb. */
  stops: string
  decisions: number
  /** Settled and kept as generated. */
  accepted: number
  /** Settled, and the person changed it. */
  modified: number
  /** Asked a person instead of deciding. */
  handed: number
  /** Never produced, and the person supplied it. */
  added: number
  /** Human accuracy on the same decisions. */
  benchmark: number
  /** Mean stated confidence. */
  confidence: number
  /** Stated confidence minus acceptance. Negative is under-confident. */
  calibration: number
  /** Twelve monthly accuracy readings, oldest first. */
  history: number[]
  touchpoints: Touchpoint[]
  traces: Trace[]
}

export const CLASSES: DecisionClass[] = [
  {
    id: 'docs',
    name: 'Proposal documents',
    rung: 'Autonomous',
    agent: 'Document reader',
    steps: ['Start Quotation', 'Business Details'],
    decides: 'What the pack says, and what the business record on the quotation therefore is.',
    stops: 'A workbook that is not the published template is rejected, never interpreted.',
    decisions: 1284,
    accepted: 1064,
    modified: 61,
    handed: 138,
    added: 21,
    benchmark: 96,
    confidence: 0.93,
    calibration: -0.02,
    history: [78, 81, 84, 86, 88, 89, 91, 92, 93, 94, 94, 95],
    touchpoints: [
      { id: 'tp-docs-1', name: 'Workbook verdict', step: 'Start Quotation',
        what: 'Accept, reject or fail each dropped file.',
        driver: 'rule', ruleShare: 100, rule: 'Published template register — a workbook either matches a published version or it does not.',
        expected: 1284, proposed: 1284, accepted: 1266, added: 0,
        note: 'The entry condition for everything after it, so it is always reached. Three verdicts, not two: a rejection is about the content and a retry cannot change it.' },
      { id: 'tp-docs-2', name: 'Field read', step: 'Start Quotation',
        what: 'Pull each declared field out of the mapped columns.',
        driver: 'mixed', ruleShare: 78, rule: 'The column map on the published template is deterministic; an unmapped header falls to the reader.',
        expected: 1284, proposed: 1258, accepted: 1192, added: 19,
        note: 'The reference run read 51 of 56 declared fields across three workbooks: 26 of 26, 16 of 18, 9 of 12. A field it cannot find is left blank rather than guessed, which is why the added column here is small.' },
      { id: 'tp-docs-3', name: 'Company match', step: 'Business Details',
        what: 'Resolve the proposer to one group register entry.',
        driver: 'mixed', ruleShare: 44, rule: 'An exact GSTIN or registered-name hit on the group register is a lookup; anything short of that is resolved by the reader.',
        expected: 1284, proposed: 1251, accepted: 1207, added: 26,
        note: 'Matched M/s Eicore tech LTD to one entry at 0.96 on the reference run. The 26 added are runs where the proposer was named only in the covering e-mail, which is not in scope for the read.' },
      { id: 'tp-docs-4', name: 'Policy period', step: 'Business Details',
        what: 'Set the effective start date, and let the term carry the end date.',
        driver: 'mixed', ruleShare: 35, rule: 'The term length carries the end date by rule; the start date is read and ranked.',
        expected: 1284, proposed: 1198, accepted: 1084, added: 61,
        note: 'On the reference run the RFQ asked for 1 June and the request form said 24 May, so it was put as a question with a stated fallback rather than picked.' },
      { id: 'tp-docs-5', name: 'Sector classification', step: 'Business Details',
        what: 'Decide the rated sector the risk is written under.',
        driver: 'model', ruleShare: 0, rule: 'No rule stands behind it. The sector is ranked from the documents, which is exactly why a disagreement between them has no default.',
        expected: 1284, proposed: 1102, accepted: 948, added: 104,
        note: 'The weakest touchpoint in the class. Reference run: the RFQ said IT services and the expiring schedule said ITES, they price differently, and nothing in the pack settles it — so it escalated with no default.' },
      { id: 'tp-docs-6', name: 'Intermediary and source', step: 'Business Details',
        what: 'Carry the broker, the business source and the inward mode from the RFQ.',
        driver: 'mixed', ruleShare: 52, rule: 'A broker code on the RFQ is a register lookup; a letterhead is read.',
        expected: 1284, proposed: 1171, accepted: 1093, added: 71,
        note: 'Millennials Insurance Brokers read off the RFQ letterhead on the reference run. Where the RFQ is an e-mail rather than a document, the person types it in.' },
    ],
    traces: [
      {
        id: 'tr-docs-1', ref: 'MAGM-400201-26-7000002-1', subject: 'M/s Eicore tech LTD, renewal — three workbooks, the RFQ and the expiring schedule',
        at: '21 Sep 2026, 09:14', outcome: 'accepted', confidence: 0.98,
        decidedAt: 'Field read',
        summary: 'Read the pack, reconciled 3,616 lives against 1,367 employees, matched the company and carried the broker. Taken as generated.',
        spans: [
          { label: 'Read pack', depth: 0, ms: 4120, status: 'ok', detail: 'Active_Data 2.xlsx, Claims Data.xlsx, M_s Eicore tech LTD 3.xlsx, plus the broker RFQ and the expiring schedule.' },
          { label: 'Workbook verdict', depth: 1, ms: 210, status: 'ok', detail: 'All three workbooks matched a published template version. Accepted.' },
          { label: 'Field read', depth: 1, ms: 9700, status: 'ok', detail: '51 of 56 declared fields: 26 of 26 in 4.2s, 16 of 18 in 3.1s, 9 of 12 in 2.4s. The two missing on the claims dump are the TPA code and the cut-off date.' },
          { label: 'Company match', depth: 1, ms: 340, status: 'ok', detail: 'M/s Eicore tech LTD matched to one group register entry. Accepted unchanged.' },
          { label: 'Intermediary and source', depth: 1, ms: 300, status: 'ok', detail: 'Millennials Insurance Brokers, from the RFQ letterhead. Source set to Broker, inward mode Offline.' },
          { label: 'Reconcile the pack against itself', depth: 1, ms: 480, status: 'warn', detail: 'Four values differ across documents: company name, sector, start date, and a GSTIN nothing else carried. Raised as separate decisions rather than settled here.' },
        ],
      },
      {
        id: 'tr-docs-2', ref: 'MAGM-400201-26-7000002-1 / sector', subject: 'Sector classification — RFQ says IT services, expiring schedule says ITES',
        at: '21 Sep 2026, 09:15', outcome: 'handed', handoff: { kind: 'escalation', to: 'you' }, confidence: 0.61,
        decidedAt: 'Sector classification',
        summary: 'Escalated rather than proposed. The two documents disagree, they price differently, and nothing in the pack settles it — so there is no default that is safe to apply.',
        spans: [
          { label: 'Classify sector', depth: 0, ms: 1240, status: 'ok', detail: 'Two sources, both first-party.' },
          { label: 'Read RFQ', depth: 1, ms: 380, status: 'ok', detail: 'Broker RFQ p.1, risk summary: "Sector: IT services".' },
          { label: 'Read expiring schedule', depth: 1, ms: 360, status: 'ok', detail: 'Schedule p.1: "Sector: ITES".' },
          { label: 'Rank the sources', depth: 1, ms: 420, status: 'warn', detail: 'Neither document supersedes the other. Confidence fell to 0.61 and no candidate cleared the threshold to propose.' },
          { label: 'Settle sector', depth: 1, ms: 0, status: 'handoff', detail: 'Escalated with both options and both sources. No fallback offered, because there is no default that is safe if nobody answers.' },
          { label: 'Write to Business Details', depth: 1, ms: 0, status: 'suppressed', detail: 'Held. The field stays open until a person settles it.' },
        ],
      },
      {
        id: 'tr-docs-3', ref: 'QTN-40077', subject: 'Harbour Freight Pvt Ltd — proposer named only in the covering e-mail',
        at: '17 Sep 2026, 11:41', outcome: 'added', confidence: 0.0,
        decidedAt: 'Company match',
        summary: 'Nothing was proposed and the underwriter typed the company in. The name was in the thread, which is not in scope for the read — so this is a scope gap, not a misread.',
        spans: [
          { label: 'Read pack', depth: 0, ms: 2870, status: 'ok', detail: 'One workbook, two sheets. No RFQ and no schedule in the pack.' },
          { label: 'Workbook verdict', depth: 1, ms: 180, status: 'ok', detail: 'Census accepted as template v4.2.' },
          { label: 'Field read', depth: 1, ms: 1940, status: 'ok', detail: '24 of 26 fields. Proposer name and sector absent from every sheet.' },
          { label: 'Company match', depth: 1, ms: 0, status: 'missed', detail: 'No proposer identifier anywhere in scope. Not guessed and, because the step never ran, not flagged either — the person found the blank rather than being sent to it.' },
          { label: 'Sector classification', depth: 1, ms: 0, status: 'missed', detail: 'Downstream of the company match. Never reached.' },
          { label: 'Write to Business Details', depth: 1, ms: 0, status: 'suppressed', detail: 'Held. A partial business record is not written.' },
        ],
      },
    ],
  },
  {
    id: 'census',
    name: 'Member census',
    rung: 'Autonomous',
    agent: 'Census',
    steps: ['Member Details'],
    decides: 'How raw member rows become groups, age bands and a relationship matrix.',
    stops: 'A life it cannot age is held out and asked for, never defaulted into a band.',
    decisions: 962,
    accepted: 772,
    modified: 67,
    handed: 106,
    added: 17,
    benchmark: 94,
    confidence: 0.9,
    calibration: -0.02,
    history: [71, 74, 77, 80, 82, 84, 86, 88, 89, 90, 91, 92],
    touchpoints: [
      { id: 'tp-cen-1', name: 'Row acceptance', step: 'Member Details',
        what: 'Decide whether a member row can be rated at all.',
        driver: 'rule', ruleShare: 96, rule: 'Column-list validation against the published census template.',
        expected: 962, proposed: 962, accepted: 948, added: 0,
        note: 'The reference run walked 1,370 rows and accepted 1,367: three carried a value outside the column list. Addresses go to the exceptions workbook, not to a table nobody can act on.' },
      { id: 'tp-cen-2', name: 'Date of birth resolution', step: 'Member Details',
        what: 'Find or derive a date of birth for every life.',
        driver: 'mixed', ruleShare: 41, rule: 'A declared date format parses deterministically; everything else is derived.',
        expected: 962, proposed: 907, accepted: 841, added: 41,
        note: 'Reference run: 23 lives carried a relationship and a band and no date anywhere in the pack, so it delegated them to the broker rather than deriving an age from the band.' },
      { id: 'tp-cen-3', name: 'Relationship classification', step: 'Member Details',
        what: 'Map each life to primary member, spouse, child or parent.',
        driver: 'mixed', ruleShare: 63, rule: 'The relationship synonym table settles the common wording; in-law and second-parent phrasing falls to the reader.',
        expected: 962, proposed: 953, accepted: 899, added: 6,
        note: 'Reference run: 1,367 primary, 1,203 spouses, 404 children, 642 parents. In-law and second-parent wording is where it gets modified.' },
      { id: 'tp-cen-4', name: 'Sum insured banding', step: 'Member Details',
        what: 'Place each family into a declared sum-insured band.',
        driver: 'rule', ruleShare: 100, rule: 'The declared sum-insured bands on the product. Nothing is inferred — where a band is only implied by premium paid, it proposes nothing.',
        expected: 962, proposed: 950, accepted: 918, added: 8,
        note: 'Reference run: 3,435 lives at 3L, 106 at 5L, 75 at 10L. Reliable where bands are declared, weak where they are implied by premium paid.' },
      { id: 'tp-cen-5', name: 'Member group build', step: 'Member Details',
        what: 'Build the groups and the relationship / age-band matrix behind them.',
        driver: 'mixed', ruleShare: 71, rule: 'Family keying is deterministic; the matrix behind it inherits the relationship read.',
        expected: 962, proposed: 944, accepted: 902, added: 11,
        note: 'Reference run: three groups, average family size 2.65, consistent across all three bands.' },
      { id: 'tp-cen-6', name: 'Dependent age flagging', step: 'Member Details',
        what: 'Flag dependents over 60, where the age loading steps up.',
        driver: 'rule', ruleShare: 100, rule: 'The product age-loading thresholds: over 60, then 61-65 and 66-70.',
        expected: 962, proposed: 879, accepted: 796, added: 54,
        note: 'Reference run: 212 over 60, being 168 spouses and 44 parents, in the 61-65 and 66-70 bands. The 83 never proposed all sit downstream of an unresolved date of birth.' },
    ],
    traces: [
      {
        id: 'tr-cen-1', ref: 'MAGM-400201-26-7000002-1', subject: 'Three member groups and the relationship / age-band matrix',
        at: '21 Sep 2026, 09:21', outcome: 'accepted', confidence: 0.97,
        decidedAt: 'Member group build',
        summary: 'Built three groups from 3,616 lives, average family size 2.65. Taken as generated.',
        spans: [
          { label: 'Normalise census', depth: 0, ms: 3980, status: 'ok', detail: '1,370 rows walked, 1,367 employees accepted, 3,616 lives.' },
          { label: 'Row acceptance', depth: 1, ms: 620, status: 'ok', detail: '3 rows held: a value outside the permitted list on each. Sent to the exceptions workbook.' },
          { label: 'Date of birth resolution', depth: 1, ms: 1240, status: 'ok', detail: 'Every accepted life dated from the census age column.' },
          { label: 'Relationship classification', depth: 1, ms: 780, status: 'ok', detail: 'Primary 1,367, spouse 1,203, child 404, parent 642.' },
          { label: 'Sum insured banding', depth: 1, ms: 540, status: 'ok', detail: '3L 3,435 lives at 95.0%, 5L 106 at 2.9%, 10L 75 at 2.1%. All Family Floater.' },
          { label: 'Member group build', depth: 1, ms: 600, status: 'ok', detail: 'Three groups, average family size 2.65 in each.' },
          { label: 'Dependent age flagging', depth: 1, ms: 800, status: 'ok', detail: '212 over 60: 168 spouses, 44 parents, bands 61-65 and 66-70. Counted off the Dependents sheet only, so employees over 60 are not included.' },
        ],
      },
      {
        id: 'tr-cen-2', ref: 'MAGM-400201-26-7000002-1 / 23 lives', subject: '23 members carry a relationship and a band and no date of birth',
        at: '21 Sep 2026, 09:23', outcome: 'handed', handoff: { kind: 'delegation', to: 'Marsh India' }, confidence: 0.74,
        decidedAt: 'Date of birth resolution',
        summary: 'Delegated out of the building. Nobody inside the company holds these dates, so the request is drafted against the broker and left unsent.',
        spans: [
          { label: 'Resolve dates', depth: 0, ms: 1860, status: 'ok', detail: '3,616 lives, 23 without a date.' },
          { label: 'Search the census', depth: 1, ms: 640, status: 'ok', detail: 'Age column blank on 23 rows of Active_Data 2.xlsx.' },
          { label: 'Search the rest of the pack', depth: 1, ms: 720, status: 'ok', detail: 'No date for those employee IDs in the claims dump or the group summary.' },
          { label: 'Derive from band', depth: 1, ms: 500, status: 'warn', detail: 'A band gives a range, not a date. Age loading cannot be rated off a range, so this was not used.' },
          { label: 'Resolve date of birth', depth: 1, ms: 0, status: 'handoff', detail: 'Delegated to Marsh India with the employee IDs attached. The rest of the quote does not depend on these 23.' },
          { label: 'Send the request', depth: 1, ms: 0, status: 'suppressed', detail: 'Written, not sent. A task crossing out of the building is the one place an undo cannot reach.' },
        ],
      },
      {
        id: 'tr-cen-3', ref: 'QTN-40104', subject: 'Meridian Textiles, 2,240 lives, mixed relationship wording',
        at: '20 Sep 2026, 14:35', outcome: 'modified', confidence: 0.89,
        decidedAt: 'Relationship classification',
        summary: 'The underwriter reclassified 96 lives from spouse to parent. Proposed at 0.89 with no competing candidate recorded, so nothing about it looked close enough to check.',
        spans: [
          { label: 'Normalise census', depth: 0, ms: 3110, status: 'ok', detail: '812 employees, 2,240 lives.' },
          { label: 'Row acceptance', depth: 1, ms: 480, status: 'ok', detail: 'All rows accepted.' },
          { label: 'Date of birth resolution', depth: 1, ms: 1020, status: 'ok', detail: 'All lives dated.' },
          { label: 'Relationship classification', depth: 1, ms: 910, status: 'failed', detail: '96 rows reading "Mother in law" matched the spouse pattern on word order. Corrected by hand on the Member Details step 4 minutes later.' },
          { label: 'Sum insured banding', depth: 1, ms: 460, status: 'ok', detail: 'Two declared bands. Accepted.' },
          { label: 'Dependent age flagging', depth: 1, ms: 520, status: 'warn', detail: 'Flagged 96 lives as spouses over 60. Spouse over 60 and parent over 60 are different loadings, so the edit had to be made before pricing ran.' },
        ],
      },
    ],
  },
  {
    id: 'covers',
    name: 'Cover schedule',
    rung: 'Hybrid',
    agent: 'Cover mapping',
    steps: ['Cover Details'],
    decides: 'Which product covers the requested benefits map onto, at what structure and what limit.',
    stops: 'It proposes the whole table as one reversible write. Nothing applies until a person presses Apply.',
    decisions: 618,
    accepted: 372,
    modified: 83,
    handed: 131,
    added: 32,
    benchmark: 90,
    confidence: 0.78,
    calibration: -0.04,
    history: [52, 56, 59, 63, 66, 69, 72, 74, 76, 78, 80, 82],
    touchpoints: [
      { id: 'tp-cov-1', name: 'Base cover carry-over', step: 'Cover Details',
        what: 'Copy the expiring base cover set onto every group.',
        driver: 'rule', ruleShare: 92, rule: 'A copy of the expiring annexure, cover for cover.',
        expected: 618, proposed: 614, accepted: 541, added: 2,
        note: 'Reference run: 24 base covers, eight per group across three groups, limits unchanged. The expiring annexure applies identically to all three bands, which is what makes the copy safe.' },
      { id: 'tp-cov-2', name: 'Family structure', step: 'Cover Details',
        what: 'Decide floater against individual sum insured.',
        driver: 'rule', ruleShare: 85, rule: 'Floater or individual as declared on the group summary — which is why it is strong on renewal and weak on fresh business.',
        expected: 618, proposed: 607, accepted: 549, added: 7,
        note: 'Family Floater on all three groups in the reference run, read off the group summary. Strong on renewal, weak on fresh business with no expiring schedule.' },
      { id: 'tp-cov-3', name: 'Add-on selection', step: 'Cover Details',
        what: 'Set the add-on cells the expiring schedule carried.',
        driver: 'model', ruleShare: 12, rule: 'No rule beyond the expiring cells. Which add-ons a fresh request implies is read, not looked up.',
        expected: 618, proposed: 561, accepted: 448, added: 34,
        note: 'Reference run proposed seven cells as one write: OPD and corporate floater on all three bands, critical illness on the 10L band only. Seven cells is not something anybody confirms one at a time.' },
      { id: 'tp-cov-4', name: 'Cover limit derivation', step: 'Cover Details',
        what: 'Derive each cover limit from the group sum insured.',
        driver: 'mixed', ruleShare: 58, rule: 'A percentage of sum insured is arithmetic and a flat cap is a product lookup; the flat caps are also where it gets edited.',
        expected: 618, proposed: 588, accepted: 502, added: 18,
        note: 'Arithmetic where the limit is a percentage of sum insured, a lookup where it is a flat cap. The flat caps are where it gets edited.' },
      { id: 'tp-cov-5', name: 'Unpriced add-on', step: 'Cover Details',
        what: 'Detect a requested cover the current rating table cannot price.',
        driver: 'rule', ruleShare: 100, rule: 'A cover with no row in rating table GH-2026 is unpriced. The defect here is never running the check, never the check itself.',
        expected: 618, proposed: 479, accepted: 341, added: 96,
        note: 'The largest blind spot on the screen: 139 runs proposed a table without ever checking it against the rating table. The reference run did check, and that is why maternity went to an underwriter instead of being priced.' },
    ],
    traces: [
      {
        id: 'tr-cov-1', ref: 'MAGM-400201-26-7000002-1', subject: 'Expiring base cover set copied onto all three groups',
        at: '21 Sep 2026, 09:33', outcome: 'accepted', confidence: 0.93,
        decidedAt: 'Base cover carry-over',
        summary: '24 base covers with unchanged limits, and seven add-on cells, proposed as one reversible write and applied without an edit.',
        spans: [
          { label: 'Map covers', depth: 0, ms: 2980, status: 'ok', detail: 'Three groups at 3L, 5L and 10L.' },
          { label: 'Base cover carry-over', depth: 1, ms: 880, status: 'ok', detail: 'Eight base covers per group: hospitalisation, pre and post, day care, maternity, ambulance, ICU, domiciliary, AYUSH. Limits unchanged.' },
          { label: 'Family structure', depth: 1, ms: 420, status: 'ok', detail: 'Family Floater on all three, from the Group Summary sheet.' },
          { label: 'Add-on selection', depth: 1, ms: 610, status: 'ok', detail: 'Seven cells: OPD and corporate floater on 3L, 5L and 10L, critical illness on 10L only.' },
          { label: 'Cover limit derivation', depth: 1, ms: 530, status: 'ok', detail: 'Limits derived per group sum insured.' },
          { label: 'Apply to Cover Details', depth: 1, ms: 0, status: 'suppressed', detail: 'Proposed as one act with every cell skeletoned, and the band sign-off deliberately left out of it: copying last year is a proposal about covers, declaring a band configured is a decision about this year.' },
        ],
      },
      {
        id: 'tr-cov-2', ref: 'MAGM-400201-26-7000002-1 / maternity', subject: 'Maternity add-on on Group 1',
        at: '21 Sep 2026, 09:35', outcome: 'handed', handoff: { kind: 'delegation', to: 'S. Raghavan' }, confidence: 0.58,
        decidedAt: 'Unpriced add-on',
        summary: 'Delegated to an underwriter. The RFQ asks for it, the expiring policy never carried it, and rating table GH-2026 has no line to price it from.',
        spans: [
          { label: 'Evaluate maternity', depth: 0, ms: 2240, status: 'ok', detail: 'Requested on Group 1 only.' },
          { label: 'Read the RFQ', depth: 1, ms: 420, status: 'ok', detail: 'RFQ p.2: "Maternity to remain covered; sub-limit to be confirmed by the insurer."' },
          { label: 'Read the expiring annexure', depth: 1, ms: 400, status: 'ok', detail: 'Add-on covers: none. It was never carried.' },
          { label: 'Look up the rating table', depth: 1, ms: 520, status: 'warn', detail: 'Rating table GH-2026 carries no maternity add-on line. There is nothing to price it from.' },
          { label: 'Price maternity', depth: 1, ms: 0, status: 'handoff', detail: 'Delegated to S. Raghavan to price or decline. Pricing a cover the table does not carry would be inventing a rate, which is not this class to do at any confidence.' },
        ],
      },
      {
        id: 'tr-cov-3', ref: 'QTN-40110', subject: 'Pinecrest Retail, fresh business, day-to-day cover requested in prose',
        at: '20 Sep 2026, 12:19', outcome: 'modified', confidence: 0.86,
        decidedAt: 'Add-on selection',
        summary: 'Bound the benefit to Consultation on a 0.03 margin and reported it at 0.86. The underwriter rebound it to OPD before applying.',
        spans: [
          { label: 'Map covers', depth: 0, ms: 3320, status: 'ok', detail: 'One group, nine requested benefits.' },
          { label: 'Base cover carry-over', depth: 1, ms: 0, status: 'missed', detail: 'Fresh business, no expiring schedule. Correctly out of scope rather than a blind spot.' },
          { label: 'Family structure', depth: 1, ms: 400, status: 'ok', detail: 'Individual sum insured, stated in the RFQ. Accepted.' },
          { label: 'Add-on selection', depth: 1, ms: 740, status: 'failed', detail: '"Day to day medical" had two candidates at 0.61 and 0.58 and was bound to Consultation. The two price differently. A 0.03 margin was reported to the user as 0.86 confidence.' },
          { label: 'Cover limit derivation', depth: 1, ms: 480, status: 'ok', detail: 'Limits derived from the single group sum insured.' },
          { label: 'Unpriced add-on', depth: 1, ms: 0, status: 'missed', detail: 'Never ran. The rating table was not consulted, so a cover it cannot price would not have surfaced here either.' },
        ],
      },
    ],
  },
  {
    id: 'claims',
    name: 'Claims history',
    rung: 'Hybrid',
    agent: 'Claims',
    steps: ['Claims and TPA'],
    decides: 'What the prior claims experience says about this risk, and who services it.',
    stops: 'It reads the experience. Turning the reading into a loading belongs to Pricing.',
    decisions: 544,
    accepted: 291,
    modified: 82,
    handed: 132,
    added: 39,
    benchmark: 88,
    confidence: 0.74,
    calibration: -0.04,
    history: [46, 50, 54, 57, 61, 64, 67, 70, 72, 74, 76, 78],
    touchpoints: [
      { id: 'tp-clm-1', name: 'Claims load and band', step: 'Claims and TPA',
        what: 'Load the prior claims dump and band it by age, amount and sum insured.',
        driver: 'rule', ruleShare: 88, rule: 'Banding by age, amount and sum insured against the declared bands.',
        expected: 544, proposed: 544, accepted: 509, added: 0,
        note: 'Reference run loaded four years, 29 claims and 15,14,771 paid, and banded all of it. Always reached: it is how the step starts.' },
      { id: 'tp-clm-2', name: 'Incurred ratio', step: 'Claims and TPA',
        what: 'Compute incurred against earned premium for the expiring period.',
        driver: 'rule', ruleShare: 100, rule: 'Incurred over earned premium. Arithmetic on two declared figures, which is why every edit here is an upstream read.',
        expected: 544, proposed: 538, accepted: 498, added: 4,
        note: 'Reference run: 113% against a premium of 62,41,000. Arithmetic on two declared figures, so the edits here are all upstream reads.' },
      { id: 'tp-clm-3', name: 'Burn concentration', step: 'Claims and TPA',
        what: 'Find which age bands and which claim sizes the burn sits in.',
        driver: 'rule', ruleShare: 94, rule: 'Concentration computed off the age-wise sheet, against config thresholds.',
        expected: 544, proposed: 521, accepted: 424, added: 14,
        note: 'Reference run put roughly two thirds of burn in the 46-60 band, and one claim above 5L at 37% of value on 3% of claims. Needs an age-wise sheet; 23 packs carried only a total.' },
      { id: 'tp-clm-4', name: 'Maternity split', step: 'Claims and TPA',
        what: 'Separate maternity burn from the rest of the experience.',
        driver: 'mixed', ruleShare: 46, rule: 'A separate maternity claim head is a split by rule; where the dump does not carry one it is inferred.',
        expected: 544, proposed: 490, accepted: 359, added: 31,
        note: 'Reference run: 40.4 lakh, 34% of burn and 34% above expected frequency. Where maternity is not a separate line the split is inferred, and inference is where it gets edited.' },
      { id: 'tp-clm-5', name: 'Servicing continuity', step: 'Claims and TPA',
        what: 'Set the servicing mode, and decide whether the experience is comparable across a change of it.',
        driver: 'model', ruleShare: 18, rule: 'The servicing mode carries forward by rule. Whether the experience is comparable across a change of it is a judgement, and that is the part that gets edited.',
        expected: 544, proposed: 452, accepted: 331, added: 68,
        note: 'The reference run carried in-house servicing forward from the expiring policy — but the TPA code and the claims cut-off date are two of the fields the dump does not carry, which is exactly what this step needs.' },
    ],
    traces: [
      {
        id: 'tr-clm-1', ref: 'MAGM-400201-26-7000002-1', subject: 'Four years of prior claims loaded and banded',
        at: '21 Sep 2026, 09:44', outcome: 'accepted', confidence: 0.95,
        decidedAt: 'Burn concentration',
        summary: 'Incurred 113%, two thirds of burn in the 46-60 band, maternity 34% above expected. In-house servicing carried forward and accepted.',
        spans: [
          { label: 'Read claims pack', depth: 0, ms: 3410, status: 'ok', detail: 'Claims Data.xlsx, 16 of 18 fields across the Paid and Summary sheets.' },
          { label: 'Claims load and band', depth: 1, ms: 1180, status: 'ok', detail: '29 claims, 15,14,771 paid. Banded by age, amount, sum insured and month. 27 settled, 2 outstanding.' },
          { label: 'Incurred ratio', depth: 1, ms: 380, status: 'ok', detail: '113% on the expiring year, against a premium of 62,41,000.' },
          { label: 'Burn concentration', depth: 1, ms: 920, status: 'ok', detail: 'Roughly two thirds in 46-60. One claim above 5L carries 37% of value on 3% of claims. Dependents average 93,643 against 26,927 for employees.' },
          { label: 'Maternity split', depth: 1, ms: 660, status: 'ok', detail: 'A separate line in the Summary sheet: 40.4 lakh, 34% of burn, 34% above expected frequency.' },
          { label: 'Servicing continuity', depth: 1, ms: 440, status: 'warn', detail: 'In-house carried forward from the expiring policy. The TPA code and the cut-off date are not in the dump, so continuity is asserted from the schedule rather than verified in the data.' },
        ],
      },
      {
        id: 'tr-clm-2', ref: 'QTN-40113', subject: 'Verity Chemicals — TPA changed in month 7 of the expiring year',
        at: '20 Sep 2026, 17:26', outcome: 'modified', confidence: 0.88,
        decidedAt: 'Servicing continuity',
        summary: 'Proposed a 34-point improvement in incurred ratio that is a reporting change, not a risk change. The underwriter split the period by hand and re-read it.',
        spans: [
          { label: 'Read claims pack', depth: 0, ms: 3760, status: 'ok', detail: 'One sheet, twelve months.' },
          { label: 'Claims load and band', depth: 1, ms: 1090, status: 'ok', detail: '214 claims loaded and banded.' },
          { label: 'Incurred ratio', depth: 1, ms: 360, status: 'ok', detail: '78% for the period taken as a whole.' },
          { label: 'Burn concentration', depth: 1, ms: 880, status: 'warn', detail: 'Concentration differs sharply between the first and second halves of the year.' },
          { label: 'Maternity split', depth: 1, ms: 600, status: 'ok', detail: 'Separate line, within expectation.' },
          { label: 'Servicing continuity', depth: 1, ms: 470, status: 'failed', detail: 'A TPA change in month 7 was read as a data gap and smoothed over. The two halves are not comparable and were compared anyway. Proposed at 0.88.' },
        ],
      },
      {
        id: 'tr-clm-3', ref: 'QTN-40088', subject: 'Selwyn Foods — claims summary with totals only',
        at: '18 Sep 2026, 13:55', outcome: 'added', confidence: 0.57,
        decidedAt: 'Burn concentration',
        summary: 'Three of five touchpoints had nothing to observe, and the underwriter worked the concentration out from the raw dump by hand. The thinness of the reading is visible only here.',
        spans: [
          { label: 'Read claims pack', depth: 0, ms: 1980, status: 'ok', detail: 'One sheet, four total rows, no age or relationship breakdown.' },
          { label: 'Claims load and band', depth: 1, ms: 520, status: 'warn', detail: 'Totals loaded. There is nothing to band.' },
          { label: 'Incurred ratio', depth: 1, ms: 340, status: 'ok', detail: '96% on the expiring year. Accepted.' },
          { label: 'Burn concentration', depth: 1, ms: 0, status: 'missed', detail: 'No age-wise data in the pack. A single large loss would be invisible here, and would not be flagged as invisible.' },
          { label: 'Maternity split', depth: 1, ms: 0, status: 'missed', detail: 'No maternity line and no per-claim detail to infer one from.' },
          { label: 'Servicing continuity', depth: 1, ms: 400, status: 'ok', detail: 'Single servicing mode named for the period.' },
        ],
      },
    ],
  },
  {
    id: 'pricing',
    name: 'Premium rating',
    rung: 'AI-assisted',
    agent: 'Pricing',
    steps: ['Summary', 'Process Sheet'],
    decides: 'The loadings, the group split and the premium the quotation is prepared at.',
    stops: 'The quotation is prepared, never submitted. The last action is a person at every rung.',
    decisions: 311,
    accepted: 132,
    modified: 51,
    handed: 106,
    added: 22,
    benchmark: 87,
    confidence: 0.69,
    calibration: -0.03,
    history: [38, 42, 45, 49, 52, 56, 59, 62, 65, 68, 70, 72],
    touchpoints: [
      { id: 'tp-prc-1', name: 'Pre-calculation check', step: 'Summary',
        what: 'Confirm every input the premium rests on is present and settled before it runs.',
        driver: 'rule', ruleShare: 100, rule: 'A completeness gate: every input the premium rests on is present and settled.',
        expected: 311, proposed: 311, accepted: 278, added: 0,
        note: 'The checkpoint either side of the calculation is the reason a premium is never the first thing a person sees. Always reached.' },
      { id: 'tp-prc-2', name: 'Age-band loading', step: 'Process Sheet',
        what: 'Apply the rating table step-up to the banded census.',
        driver: 'rule', ruleShare: 100, rule: 'Rating table GH-2026 step-ups, applied to the banded census.',
        expected: 311, proposed: 311, accepted: 271, added: 0,
        note: 'Rating table GH-2026 steps up at 46-60 by 12% and at 61-65 and 66-70 by 18%. The reference run applied it to 212 dependents over 60.' },
      { id: 'tp-prc-3', name: 'Claims loading', step: 'Process Sheet',
        what: 'Turn the claims reading into a loading percentage.',
        driver: 'mixed', ruleShare: 64, rule: 'The loading is a banded lookup; the band it lands in inherits the claims reading.',
        expected: 311, proposed: 306, accepted: 241, added: 3,
        note: 'A banded lookup: above 100% incurred is a 45% loading. The reference run landed there on 113%. It inherits every upstream edit in Claims interpretation.' },
      { id: 'tp-prc-4', name: 'Group premium split', step: 'Process Sheet',
        what: 'Price each sum-insured group and the age bands inside it.',
        driver: 'rule', ruleShare: 100, rule: 'Rate times banded lives, per group.',
        expected: 311, proposed: 299, accepted: 224, added: 7,
        note: 'Reference run: 1,43,19,425 on the 3L group, 8,47,847 on 5L, 13,10,577 on 10L. Per member 4,169 / 7,999 / 17,474.' },
      { id: 'tp-prc-5', name: 'Movement against expiring', step: 'Process Sheet',
        what: 'State the premium movement against the expiring policy, and what drives it.',
        driver: 'mixed', ruleShare: 82, rule: 'The movement is arithmetic. What drives it is attributed, and that is the half a person rewrites.',
        expected: 311, proposed: 288, accepted: 198, added: 14,
        note: 'Reference run: 97,00,000 to 1,64,77,850, a 69.9% rise — two thirds claims experience, the rest 284 more lives and a mix shift towards 5L. A movement that size is customer-affecting and hard to reverse, which is what keeps this class at the lowest rung.' },
      { id: 'tp-prc-6', name: 'Unpriceable component', step: 'Process Sheet',
        what: 'Detect a component with no rate behind it, before the premium is stated.',
        driver: 'rule', ruleShare: 100, rule: 'Every component checked for a row in the rating table before the premium is stated.',
        expected: 311, proposed: 249, accepted: 161, added: 44,
        note: 'The weakest touchpoint on the screen. 62 runs stated a premium without checking that every component in it had a rate behind it.' },
    ],
    traces: [
      {
        id: 'tr-prc-1', ref: 'MAGM-400201-26-7000002-1', subject: 'Premium calculated at 1,64,77,850, up 69.9% on expiring',
        at: '21 Sep 2026, 09:58', outcome: 'handed', handoff: { kind: 'delegation', to: 'you' }, confidence: 0.99,
        decidedAt: 'Movement against expiring',
        summary: 'Calculated at 0.99 and still handed over. A 69.9% renewal is customer-affecting and hard to reverse, so it is prepared and the signature stays human.',
        spans: [
          { label: 'Calculate premium', depth: 0, ms: 4630, status: 'ok', detail: 'Three groups, 3,616 lives, rating table GH-2026 effective 01 Apr 2026.' },
          { label: 'Pre-calculation check', depth: 1, ms: 620, status: 'warn', detail: 'Every input present except the maternity add-on, which is still with an underwriter. Recorded on the sheet rather than blocking the run.' },
          { label: 'Age-band loading', depth: 1, ms: 980, status: 'ok', detail: 'Step-up applied: 46-60 at plus 12%, 61-65 and 66-70 at plus 18%. 212 dependents in the over-60 bands.' },
          { label: 'Claims loading', depth: 1, ms: 1140, status: 'ok', detail: '113% incurred falls in the above-100% row: plus 45%.' },
          { label: 'Group premium split', depth: 1, ms: 1040, status: 'ok', detail: '1,43,19,425 / 8,47,847 / 13,10,577. Per member 4,169 / 7,999 / 17,474.' },
          { label: 'Movement against expiring', depth: 1, ms: 520, status: 'ok', detail: '97,00,000 to 1,64,77,850. Plus 67,77,850, or 69.9%. Two thirds claims experience, the rest 284 more lives and a mix shift towards the 5L band.' },
          { label: 'Submit quotation', depth: 1, ms: 0, status: 'handoff', detail: 'Prepared, not submitted. The agent does not sign, at any rung.' },
        ],
      },
      {
        id: 'tr-prc-2', ref: 'QTN-40109', subject: 'Ridgeway Motors — claims loading applied across a servicing change',
        at: '20 Sep 2026, 11:03', outcome: 'modified', confidence: 0.83,
        decidedAt: 'Claims loading',
        summary: 'Proposed a 10% loading off an incurred ratio the claims class had already flagged. The flag did not travel, and the underwriter raised the loading by hand.',
        spans: [
          { label: 'Calculate premium', depth: 0, ms: 4180, status: 'ok', detail: 'One group, 640 lives.' },
          { label: 'Pre-calculation check', depth: 1, ms: 580, status: 'ok', detail: 'All inputs present.' },
          { label: 'Age-band loading', depth: 1, ms: 860, status: 'ok', detail: 'Step-up applied at 46-60.' },
          { label: 'Claims loading', depth: 1, ms: 1020, status: 'failed', detail: '78% incurred read as the 71-85% row: plus 10%. The reading carried a warning from Claims history that the period spans a TPA change, and this step consumed the number without the warning attached to it.' },
          { label: 'Group premium split', depth: 1, ms: 910, status: 'ok', detail: 'Single group priced.' },
          { label: 'Movement against expiring', depth: 1, ms: 480, status: 'warn', detail: 'Plus 11.4%, which reads as unremarkable and is the reason nobody looked at the loading behind it until the check.' },
        ],
      },
      {
        id: 'tr-prc-3', ref: 'QTN-40099', subject: 'Calder Industries — sector escalation never answered',
        at: '19 Sep 2026, 09:12', outcome: 'added', confidence: 0.61,
        decidedAt: 'Age-band loading',
        summary: 'Priced on the default table because the sector escalation upstream was still open. The preparer noticed at the checkpoint and set the sector themselves.',
        spans: [
          { label: 'Calculate premium', depth: 0, ms: 3890, status: 'ok', detail: 'Two groups, 1,180 lives.' },
          { label: 'Pre-calculation check', depth: 1, ms: 600, status: 'failed', detail: 'The open sector escalation was not treated as a missing input, so the check passed a run that was not ready.' },
          { label: 'Age-band loading', depth: 1, ms: 900, status: 'missed', detail: 'The sector-specific table was never selected. The default table was used and the substitution was not recorded on the decision.' },
          { label: 'Claims loading', depth: 1, ms: 1080, status: 'ok', detail: '91% incurred: plus 25%.' },
          { label: 'Group premium split', depth: 1, ms: 880, status: 'ok', detail: 'Two groups priced off the default table.' },
          { label: 'Unpriceable component', depth: 1, ms: 0, status: 'missed', detail: 'Never ran. An unanswered escalation upstream is not a component this step knows how to look for.' },
        ],
      },
    ],
  },
]

/* ------------------------------------------------------------------ *
 * Roll-ups
 * ------------------------------------------------------------------ */

/** Decisions the class put a value forward on, whether or not it stood. */
export const settledOf = (c: DecisionClass) => c.accepted + c.modified
/** Accuracy is scored on what was proposed. Handoffs are not failures. */
export const accuracyOf = (c: DecisionClass) => Math.round((c.accepted / settledOf(c)) * 100)
/** How much of the class's work it took on rather than asking. */
export const autonomyOf = (c: DecisionClass) => Math.round((settledOf(c) / c.decisions) * 100)
export const gapOf = (c: DecisionClass) => c.benchmark - accuracyOf(c)

/**
 * Share of everything the class proposed that a deterministic rule produced,
 * weighted by how often each touchpoint actually fires.
 *
 * Weighted, not averaged across touchpoints: a rule that settles the busiest
 * touchpoint in the class is not the same claim as one that settles its
 * rarest, and an unweighted mean states both identically.
 */
export const ruleShareOf = (c: DecisionClass) =>
  Math.round(
    c.touchpoints.reduce((a, t) => a + t.proposed * t.ruleShare, 0) /
      c.touchpoints.reduce((a, t) => a + t.proposed, 0),
  )

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0)

export const TOTALS = {
  decisions: sum(CLASSES.map((c) => c.decisions)),
  accepted: sum(CLASSES.map((c) => c.accepted)),
  modified: sum(CLASSES.map((c) => c.modified)),
  handed: sum(CLASSES.map((c) => c.handed)),
  added: sum(CLASSES.map((c) => c.added)),
  expected: sum(CLASSES.flatMap((c) => c.touchpoints.map((t) => t.expected))),
  proposed: sum(CLASSES.flatMap((c) => c.touchpoints.map((t) => t.proposed))),
  userAdded: sum(CLASSES.flatMap((c) => c.touchpoints.map((t) => t.added))),
}

export const SETTLED = TOTALS.accepted + TOTALS.modified

/** Volume-weighted mean absolute gap between stated confidence and acceptance. */
export const CALIBRATION_ERROR =
  sum(CALIBRATION.map((b) => b.n * Math.abs(b.stated - b.actual))) / sum(CALIBRATION.map((b) => b.n)) / 100

/** Signed, so the UI can say which way it is wrong. Negative is under-confident. */
export const CALIBRATION_BIAS =
  sum(CALIBRATION.map((b) => b.n * (b.stated - b.actual))) / sum(CALIBRATION.map((b) => b.n)) / 100

/** Month labels for the per-class history matrix, oldest first. */
export const HISTORY_MONTHS = [
  'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
]
