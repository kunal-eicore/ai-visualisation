import { CalendarClock, FileText, Mail, Plug, Upload, UserCheck, type LucideIcon } from 'lucide-react'
import { AUTONOMOUS_MODES, type AutonomousModeId } from '@/routes/autonomous/modes'
import type { QueueRow } from '@/routes/autonomous/queue/data'
import { ALL_SCRIPTS } from '@/routes/autonomous/run/script'
import { COMPANIES, FIRST, GROUP_PLANS, LARGE_BLOCK_REASONS, LAST, RETAIL_PLANS } from '@/routes/autonomous/run/sample'

/*
 * Fixture for Data Intake, approved 13 Oct 2026.
 *
 * 100 tasks. 60 reach the agentic flow: they are exactly the cases on the
 * Fully Agentic line (`ALL_SCRIPTS`), imported rather than copied so the two
 * screens cannot drift. 40 do not: generated here in the same shape, each
 * with the reason it stops.
 *
 * Intent based is never a destination (project rule, see CLAUDE.md).
 */

export const STAGES = ['Arrive', 'Extract / Normalise', 'Classify', 'Validate / Enrich', 'Route'] as const
export const ROUTE_STAGE = STAGES.length - 1

export type IntakeType = 'User starts it' | 'Assigned to a bucket' | 'System to system' | 'Unstructured inbound'

export type DestinationId = Exclude<AutonomousModeId, 'intent'>

export const destinationLabel = (id: DestinationId) => AUTONOMOUS_MODES.find((m) => m.id === id)!.label

/* ── Sources ─────────────────────────────────────────────────────────── */

export type SourceId = 'forms' | 'uw-queue' | 'renewal-job' | 'aggregator' | 'inbox' | 'portal'

export const SOURCES: { id: SourceId; label: string; type: IntakeType; icon: LucideIcon }[] = [
  { id: 'forms', label: 'OneBuzz quotation forms', type: 'User starts it', icon: FileText },
  { id: 'uw-queue', label: 'Underwriting queue', type: 'Assigned to a bucket', icon: UserCheck },
  { id: 'renewal-job', label: 'Renewal job (nightly, 02:00)', type: 'System to system', icon: CalendarClock },
  { id: 'aggregator', label: 'Aggregator API', type: 'System to system', icon: Plug },
  { id: 'inbox', label: 'Broker email inbox', type: 'Unstructured inbound', icon: Mail },
  { id: 'portal', label: 'Broker / IMD portal', type: 'Unstructured inbound', icon: Upload },
]

export const sourceOf = (id: SourceId) => SOURCES.find((s) => s.id === id)!

/* ── Tasks ───────────────────────────────────────────────────────────── */

/** What the routing rules read. */
export type Facts = {
  userStarted?: boolean
  duplicateOf?: string
  proposerAge?: number
  extractionConfidence?: number
  deviation?: boolean
  /** Group sum insured per employee, in rupees. */
  groupSumInsured?: number
}

export type Task = {
  id: string
  case: Pick<QueueRow, 'clientName' | 'plan' | 'businessType' | 'segment' | 'sumInsured' | 'premium'>
  source: SourceId
  /** The source's own reference. Nothing here has a quotation ID yet: intake comes before one exists. */
  sourceRef: string
  facts: Facts
  /** A stage that errors. A retry re-runs it; `retrySucceeds` says whether that clears it. */
  fails?: { stage: number; message: string; retrySucceeds: boolean }
}

/** The 60, by where they come from: the queue's cases are assigned work; the rest by type. */
function sourceFor(r: QueueRow, fromQueue: boolean): SourceId {
  if (fromQueue) return 'uw-queue'
  if (r.businessType === 'Renewal' || r.businessType === 'Roll Over') return 'renewal-job'
  if (r.businessType === 'Portability') return 'portal'
  return r.segment === 'group' ? 'inbox' : 'aggregator'
}

const QUEUE_COUNT = ALL_SCRIPTS.length - 38

/** What each source calls the thing it sent. */
function refFor(source: SourceId, id: string, c: Pick<QueueRow, 'clientName' | 'plan'>, k: number): string {
  const n = String(100000 + ((k * 7919) % 900000))
  switch (source) {
    case 'forms':
      return `Draft D-${n}`
    case 'uw-queue':
      return `Task ${id}`
    case 'renewal-job':
      return `Policy POL-${n}`
    case 'aggregator':
      return `Lead LEAD-${n}`
    case 'inbox':
      return `RFQ: ${c.clientName} / ${c.plan}`
    case 'portal':
      return `Upload UPL-${n}`
  }
}

const REACHED: Task[] = ALL_SCRIPTS.map((s, i) => {
  const source = sourceFor(s.row, i < QUEUE_COUNT)
  return { id: s.row.id, case: s.row, source, sourceRef: refFor(source, s.row.id, s.row, i), facts: {} }
})

/* The 40 that do not reach it. Names and plans come from the run's own pools. */

let seq = 0
function make(
  source: SourceId,
  segment: 'retail' | 'group',
  businessType: string,
  extra: { facts?: Facts; fails?: Task['fails']; sumInsured?: number; like?: Task['case'] },
): Task {
  const i = seq++
  const base = extra.like ?? {
    clientName: segment === 'group' ? COMPANIES[(i * 3) % COMPANIES.length] : `${FIRST[(i * 5) % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
    plan: segment === 'group' ? GROUP_PLANS[i % 2] : RETAIL_PLANS[i % RETAIL_PLANS.length],
    sumInsured: extra.sumInsured ?? (segment === 'group' ? [200000, 300000, 500000][i % 3] : [300000, 500000, 700000, 1000000][i % 4]),
    premium: segment === 'group' ? 500000 + ((i * 131) % 25) * 100000 : 8000 + ((i * 47) % 40) * 1000,
    businessType,
    segment,
  }
  const id = `n-${String(i + 1).padStart(3, '0')}`
  return {
    id,
    case: base,
    source,
    sourceRef: refFor(source, id, base, 100 + i),
    facts: extra.facts ?? {},
    fails: extra.fails,
  }
}

const times = <T,>(k: number, f: (j: number) => T) => Array.from({ length: k }, (_, j) => f(j))

const reason = (needle: string) => LARGE_BLOCK_REASONS.find((r) => r.reason.includes(needle))!.reason

const NOT_REACHED: Task[] = [
  // Kept with a person
  ...times(8, () => make('forms', 'retail', 'New Business', { facts: { userStarted: true } })),
  ...times(4, (j) =>
    make('inbox', 'group', 'New Business', { sumInsured: [1500000, 1200000, 2000000, 1500000][j], facts: { groupSumInsured: [1500000, 1200000, 2000000, 1500000][j] } }),
  ),
  // Held for review
  ...times(6, (j) =>
    make(j < 3 ? 'inbox' : 'portal', j < 3 ? 'group' : 'retail', j < 3 ? 'New Business' : 'Portability', {
      facts: { extractionConfidence: [62, 71, 54, 76, 68, 59][j] },
    }),
  ),
  ...times(4, () => make('uw-queue', 'retail', 'Renewal', { facts: { deviation: true } })),
  // Failed at a stage
  ...times(2, () => make('portal', 'retail', 'Portability', { fails: { stage: 1, message: reason('Address proof'), retrySucceeds: false } })),
  ...times(2, () => make('inbox', 'retail', 'New Business', { fails: { stage: 1, message: reason('Discharge summary'), retrySucceeds: false } })),
  ...times(2, () => make('inbox', 'group', 'New Business', { fails: { stage: 1, message: reason('duplicate employee IDs'), retrySucceeds: false } })),
  ...times(2, () => make('renewal-job', 'retail', 'Renewal', { fails: { stage: 3, message: reason('claim not declared'), retrySucceeds: false } })),
  ...times(2, () => make('portal', 'retail', 'Portability', { fails: { stage: 3, message: 'Previous-insurer portability lookup timed out', retrySucceeds: true } })),
  // Rejected at intake: duplicates carry the original's client and plan
  ...times(5, (j) => {
    const original = REACHED[j * 5]
    return make(j < 3 ? 'inbox' : 'portal', original.case.segment, original.case.businessType, {
      like: original.case,
      facts: { duplicateOf: original.id },
    })
  }),
  ...times(3, (j) => make('aggregator', 'retail', 'New Business', { facts: { proposerAge: [68, 71, 74][j] } })),
]

/** The intake reference, given on arrival. */
export const intakeRef = (arrival: number) => `IN-1013-${String(arrival + 1).padStart(4, '0')}`

/** A task's intake reference, by where it falls in the arrival order. */
export const refOf = (taskId: string) => intakeRef(TASKS.findIndex((t) => t.id === taskId))

/** Arrival order: the 60 in the line's own order, with the 40 spread through them, two in every five. */
export const TASKS: Task[] = (() => {
  const a = [...REACHED]
  // A fixed shuffle, so the reasons arrive mixed rather than in their groups.
  const b = NOT_REACHED.map((t, i) => ({ t, k: (i * 17) % NOT_REACHED.length })).sort((x, y) => x.k - y.k).map((x) => x.t)
  return Array.from({ length: a.length + b.length }, (_, i) => ((i % 5 === 1 || i % 5 === 3) && b.length ? b.shift()! : a.shift() ?? b.shift()!))
})()

/* ── Routing rules ───────────────────────────────────────────────────── */

export type Outcome = DestinationId | 'hold' | 'reject'

export const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: 'autonomous', label: destinationLabel('autonomous') },
  { id: 'hybrid', label: destinationLabel('hybrid') },
  { id: 'manual', label: destinationLabel('manual') },
  { id: 'hold', label: 'Hold for review' },
  { id: 'reject', label: 'Reject' },
]

export const outcomeLabel = (id: Outcome) => OUTCOMES.find((o) => o.id === id)!.label

export type Rule = {
  id: number
  when: string
  test: (f: Facts) => boolean
  to: Outcome
  enabled: boolean
  /** "In all other cases": always on, and always a mode. */
  fallback?: true
}

export const INITIAL_RULES: Rule[] = [
  { id: 1, when: 'Intake type is User starts it', test: (f) => !!f.userStarted, to: 'manual', enabled: true },
  { id: 2, when: 'Duplicate of an existing quotation', test: (f) => !!f.duplicateOf, to: 'reject', enabled: true },
  { id: 3, when: 'Proposer age above 65', test: (f) => (f.proposerAge ?? 0) > 65, to: 'reject', enabled: true },
  { id: 4, when: 'Extraction confidence below 80%', test: (f) => f.extractionConfidence !== undefined && f.extractionConfidence < 80, to: 'hold', enabled: true },
  { id: 5, when: 'Rules engine flags a deviation', test: (f) => !!f.deviation, to: 'hold', enabled: true },
  { id: 6, when: 'Group sum insured above ₹10,00,000 per employee', test: (f) => (f.groupSumInsured ?? 0) > 1000000, to: 'manual', enabled: true },
  { id: 7, when: 'In all other cases', test: () => true, to: 'autonomous', enabled: true, fallback: true },
]

/** First enabled match wins. `skipHolds` is the release path: a held task goes to the next rule that is not a hold. */
export function route(rules: Rule[], facts: Facts, skipHolds = false): Rule {
  return rules.find((r) => r.enabled && r.test(facts) && !(skipHolds && r.to === 'hold'))!
}

/* ── Timing ──────────────────────────────────────────────────────────── */

export const ARRIVAL_MS = 1000
export const STAGE_MS = 800
