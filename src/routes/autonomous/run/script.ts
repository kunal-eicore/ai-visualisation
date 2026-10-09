import type { Tone } from '@/components/ui/Badge'
import { ROWS, formatInr, type QueueRow } from '../queue/data'
import { LARGE_BLOCK_REASONS, LARGE_EXTRA } from './sample'

/**
 * What each case will do on the line, decided up front.
 *
 * The run is simulated (no agent is behind it), so every case carries a
 * script: how long each stage takes, the trace lines its agents write on the
 * way, whether it stops for a person, and how it ends. The script is derived
 * from the queue row so the same case always behaves the same way, and the
 * outcome follows the row's onebuzz status — a row that is `rejected` in the
 * queue is rejected here.
 *
 * Pending executions (`p-*`) have no quotation yet, so they never reach the
 * line.
 *
 * The run opens with the 22 queue rows; the 38 generated cases in `sample.ts`
 * then arrive one at a time until there are 60.
 */

export const STAGES = [
  /* Intake keeps ahead of arrivals (one per 3s), and every later station is
     wider than Intake, so in the normal scenario nothing backs up anywhere —
     a pile is the jam scenario's doing, not the line's shape. */
  { id: 'intake', label: 'Intake', agent: 'Intake agent', capacity: 3 },
  { id: 'documents', label: 'Documents', agent: 'Documents agent', capacity: 4 },
  { id: 'risk', label: 'Risk', agent: 'Risk agent', capacity: 4 },
  { id: 'pricing', label: 'Pricing', agent: 'Pricing agent', capacity: 4 },
  { id: 'decision', label: 'Decision', agent: 'Decision agent', capacity: 4 },
] as const

export const DONE = STAGES.length

export type Outcome = 'accepted' | 'counter_offered' | 'referred' | 'rejected'

export const OUTCOMES: { id: Outcome; label: string; tone: Tone }[] = [
  { id: 'accepted', label: 'Accepted', tone: 'success' },
  { id: 'counter_offered', label: 'Counter offered', tone: 'info' },
  { id: 'referred', label: 'Referred', tone: 'neutral' },
  // Alert, not danger: danger is kept for errors, which need someone now.
  { id: 'rejected', label: 'Rejected', tone: 'alert' },
]

export const OUTCOME_OF = Object.fromEntries(OUTCOMES.map((o) => [o.id, o])) as Record<
  Outcome,
  (typeof OUTCOMES)[number]
>

/** A trace line, written when the stage reaches `at` (0..1) of its length. */
type ScriptStep = { at: number; text: string }

export type CaseScript = {
  row: QueueRow
  /** The last block of the quotation number — what people read a case by. */
  short: string
  /** Milliseconds per stage. */
  durations: number[]
  steps: ScriptStep[][]
  outcome: Outcome
  /** Where the case stops for a person, and why. */
  block?: { stage: number; reason: string }
  /** A tool call that fails on this stage. The agent retries twice on its
   *  own; `recovers` says whether the first retry gets through or both fail
   *  and the case is handed to a person. */
  error?: { stage: number; tool: string; recovers: boolean }
}

function hash(s: string, salt = 0) {
  let h = salt
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** A stable 0..1 per case and purpose. */
const unit = (id: string, salt: number) => (hash(id, salt) % 1000) / 1000

function outcomeOf(r: QueueRow): Outcome {
  if (r.referred) return 'referred'
  if (r.status === 'rejected') return 'rejected'
  if (['counter_offered', 'negotiated', 'partial_accepted'].includes(r.status)) return 'counter_offered'
  return 'accepted'
}

/** The three cases that stop for a person. Two are `info_required` in the
 *  queue; the third is a portability case, which waits on another insurer. */
const BLOCKS: Record<string, { stage: number; reason: string }> = {
  'q-0415': { stage: 1, reason: "Proposer's medical report is missing from the case file" },
  'q-0349': { stage: 1, reason: 'Member census has 14 rows with no date of birth' },
  'q-0371': { stage: 2, reason: "Previous insurer's portability record has not come back" },
}

/** One error that hands over, one that clears on the first retry. */
const ERRORS: Record<string, { stage: number; tool: string; recovers: boolean }> = {
  'q-0388': { stage: 0, tool: 'CKYC lookup', recovers: false },
  'q-0352': { stage: 1, tool: 'Document store fetch', recovers: true },
}

function scriptFor(r: QueueRow, extraBlock?: { stage: number; reason: string }): CaseScript {
  const group = r.segment === 'group'
  const si = formatInr(r.sumInsured ?? 0)
  const outcome = outcomeOf(r)
  const lives = 80 + (hash(r.id, 3) % 420)
  const score = (0.18 + unit(r.id, 4) * 0.5).toFixed(2)
  const loading = 10 + (hash(r.id, 5) % 4) * 5
  const counter = formatInr(Math.round((r.premium * (100 + loading)) / 100))

  const steps: ScriptStep[][] = [
    group
      ? [
          { at: 0.3, text: `Read RFQ for ${r.plan}, SI ${si} per life` },
          { at: 0.8, text: `Loaded member census, ${lives} lives` },
        ]
      : [
          { at: 0.3, text: `Read proposal form for ${r.plan}, SI ${si}` },
          { at: 0.8, text: 'Matched proposer to CKYC record' },
        ],
    group
      ? [
          { at: 0.3, text: 'Extracted policy schedule and three years of claims' },
          { at: 0.8, text: `Claims ratio over three years is ${48 + (hash(r.id, 6) % 40)}%` },
        ]
      : [
          { at: 0.3, text: `Extracted ${3 + (hash(r.id, 6) % 4)} documents from the case file` },
          {
            at: 0.8,
            text:
              outcome === 'counter_offered'
                ? 'Medical declaration lists type 2 diabetes'
                : 'Medical declaration lists no pre-existing conditions',
          },
        ],
    [
      {
        at: 0.35,
        text:
          outcome === 'rejected'
            ? `Risk score ${score}, outside appetite`
            : `Risk score ${score}, within appetite`,
      },
      {
        at: 0.8,
        text: group
          ? `Average age ${31 + (hash(r.id, 7) % 12)}, industry class ${1 + (hash(r.id, 8) % 3)}`
          : `Age band ${['26-35', '36-45', '46-55', '56-65'][hash(r.id, 7) % 4]}, no adverse claims`,
      },
    ],
    [
      { at: 0.35, text: `Base premium ${formatInr(r.premium)}` },
      {
        at: 0.8,
        text:
          outcome === 'counter_offered'
            ? `Loading of ${loading}% for declared condition`
            : 'No loading applied',
      },
    ],
    [
      {
        at: 0.6,
        text: {
          accepted: 'Within delegated authority, accepted',
          counter_offered: `Counter offer issued at ${counter}`,
          referred: 'Above the auto-approve limit, referred to a senior underwriter',
          rejected: 'Outside underwriting appetite, declined',
        }[outcome],
      },
    ],
  ]

  return {
    row: r,
    short: r.quotationNo?.split('-')[3] ?? r.id,
    durations: STAGES.map((_, i) => Math.round(4000 + unit(r.id, 10 + i) * 5000)),
    steps,
    outcome,
    block: BLOCKS[r.id] ?? extraBlock,
    error: ERRORS[r.id],
  }
}

/** The queue as it stands: the cases the run opens with, and all Hybrid works. */
export const QUEUE_SCRIPTS = ROWS.filter((r) => r.quotationNo).map((r) => scriptFor(r))

let blocked = 0
const LARGE_SCRIPTS = LARGE_EXTRA.map((r) =>
  scriptFor(r, r.status === 'info_required' ? LARGE_BLOCK_REASONS[blocked++ % LARGE_BLOCK_REASONS.length] : undefined),
)

/** Every case the run will see, in arrival order. */
export const ALL_SCRIPTS: CaseScript[] = [...QUEUE_SCRIPTS, ...LARGE_SCRIPTS]

export const SCRIPT_BY_ID: Record<string, CaseScript> = Object.fromEntries(ALL_SCRIPTS.map((s) => [s.row.id, s]))

/** The queue is there when the run opens; every later case lands at Intake
 *  one `ARRIVAL_MS` after the one before it. */
export const ARRIVAL_MS = 3000
export const arrivalOf = (i: number) =>
  i < QUEUE_SCRIPTS.length ? 0 : (i - QUEUE_SCRIPTS.length + 1) * ARRIVAL_MS

export type ScenarioId = 'normal' | 'jam'

/**
 * Per-stage duration multipliers. The jam slows Documents, so files that are
 * through Intake queue for it, and slows Risk more, so files that are through
 * Documents queue again for Risk: two piles, one behind the other.
 */
export const SCENARIOS: { id: ScenarioId; label: string; slow: number[] }[] = [
  { id: 'normal', label: 'Normal', slow: [1, 1, 1, 1, 1] },
  { id: 'jam', label: 'Traffic jam', slow: [1, 2.2, 3, 1, 1] },
]

export const scenarioFrom = (params: URLSearchParams): ScenarioId => (params.get('scenario') === 'jam' ? 'jam' : 'normal')

/** A station is backed up once this many files wait in front of it. Intake's
 *  waiting list is the inbound queue rather than a jam, so it is never marked. */
export const JAM_AT = 4
export const isJammed = (stage: number, waiting: number) => stage > 0 && waiting >= JAM_AT

/** `m:ss` for run-clock milliseconds. */
export const formatClock = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
