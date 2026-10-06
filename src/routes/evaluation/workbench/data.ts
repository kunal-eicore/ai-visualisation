import type { Tone } from '@/components/ui/Badge'

/*
 * Fixtures for the Eval Workbench — the dedicated "Method 2" surface from
 * `../../../../ai-research/Agentic flows.jpg`: select a workflow, build it
 * against a real event stream, then test it.
 *
 * Domain content is the OneBuzz journeys named in
 * `../../../../ai-research/gap-usage.md` §0-§1 — the UW queue with its
 * referral / counter-offer decision, contact dedupe, IMD onboarding, the
 * quotation STP fork and the maker-checker gate. Nothing here is a service
 * call; the workbench is a design exploration, not a client.
 */

/* ------------------------------------------------------------------ *
 * Step 1 — the workflow library
 * ------------------------------------------------------------------ */

export type WorkflowStatus = 'Passing' | 'Failing' | 'Draft' | 'Never run'

export type Workflow = {
  id: string
  name: string
  /** The journey it is cut from — reads as the card's badge. */
  journey: string
  description: string
  blocks: number
  contexts: number
  lastRun: string
  /** Null until the workflow has been tested once. */
  passRate: number | null
  status: WorkflowStatus
  /** Only the referral workflow is modelled end to end; the rest are library rows. */
  modelled?: boolean
  /** The system's own proposal, not something a human drew (sketch: "system suggests workflows"). */
  suggested?: boolean
}

export const STATUS_TONE: Record<WorkflowStatus, Tone> = {
  Passing: 'success',
  Failing: 'danger',
  Draft: 'warning',
  'Never run': 'neutral',
}

export const WORKFLOWS: Workflow[] = [
  {
    id: 'wf-uw-referral',
    name: 'UW referral triage',
    journey: 'Underwriting',
    description:
      'A group health case lands in the UW queue. Parse the submission, pull claims history, score the risk, and decide between a counter-offer and a senior referral.',
    blocks: 7,
    contexts: 3,
    lastRun: '2 hours ago',
    passRate: 82,
    status: 'Failing',
    modelled: true,
  },
  {
    id: 'wf-dedupe',
    name: 'Contact dedupe and merge',
    journey: 'Contact management',
    description:
      'Score an inbound contact against the existing book, propose a survivor record, and hold the merge behind the data steward.',
    blocks: 6,
    contexts: 2,
    lastRun: '1 day ago',
    passRate: 94,
    status: 'Passing',
  },
  {
    id: 'wf-quote-stp',
    name: 'Quotation STP fork',
    journey: 'Policy builder',
    description:
      'Extract the proposal, run the STP rule set, and route the non-STP remainder to the right underwriting band.',
    blocks: 9,
    contexts: 4,
    lastRun: '3 days ago',
    passRate: 88,
    status: 'Passing',
  },
  {
    id: 'wf-imd-onboard',
    name: 'IMD onboarding checks',
    journey: 'Channel',
    description:
      'Validate agent code and IRDAI licence format per channel, then run the three-step onboarding to the point a human signs it off.',
    blocks: 5,
    contexts: 2,
    lastRun: '6 days ago',
    passRate: 71,
    status: 'Failing',
  },
  {
    id: 'wf-endorsement',
    name: 'Endorsement intake',
    journey: 'Servicing',
    description:
      'Read the endorsement request, classify it as financial or non-financial, and draft the change set for the servicing executive.',
    blocks: 6,
    contexts: 1,
    lastRun: 'Never',
    passRate: null,
    status: 'Draft',
  },
  {
    id: 'wf-checker',
    name: 'Maker-checker ranking',
    journey: 'Governance',
    description:
      'Rank the checker queue by blast radius so the second signature lands on the diffs that actually move money first.',
    blocks: 4,
    contexts: 2,
    lastRun: 'Never',
    passRate: null,
    status: 'Never run',
    suggested: true,
  },
]

/* ------------------------------------------------------------------ *
 * Step 2 — the agents toolbar
 * ------------------------------------------------------------------ */

export type AgentKind = 'trigger' | 'agent' | 'tool' | 'gate' | 'terminal'

export type AgentDef = {
  id: string
  name: string
  kind: AgentKind
  tone: Tone
  blurb: string
}

/** The palette a block is dragged from. Tone is the block's identity on the
 *  canvas, so it is declared once here and read everywhere else. */
export const AGENTS: AgentDef[] = [
  { id: 'a-trigger', name: 'Event trigger', kind: 'trigger', tone: 'neutral', blurb: 'Starts the run when a business event matches.' },
  { id: 'a-extract', name: 'Extractor', kind: 'agent', tone: 'brand', blurb: 'Pulls typed fields out of an unstructured submission.' },
  { id: 'a-lookup', name: 'System lookup', kind: 'tool', tone: 'info', blurb: 'Reads a table or a document store. No side effects.' },
  { id: 'a-score', name: 'Scorer', kind: 'agent', tone: 'brand', blurb: 'Produces a bounded score with a stated rationale.' },
  { id: 'a-gate', name: 'Policy gate', kind: 'gate', tone: 'warning', blurb: 'Branches on policy-as-code. Deterministic.' },
  { id: 'a-draft', name: 'Drafter', kind: 'agent', tone: 'brand', blurb: 'Writes the artefact a human will approve or reject.' },
  { id: 'a-handoff', name: 'Human handoff', kind: 'terminal', tone: 'success', blurb: 'Ends the run in a queue with a structured summary.' },
  { id: 'a-write', name: 'Committing tool', kind: 'tool', tone: 'danger', blurb: 'Writes to a system of record. Needs an approval gate above it.' },
]

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a])) as Record<string, AgentDef>

/* ------------------------------------------------------------------ *
 * The graph — one workflow modelled end to end
 * ------------------------------------------------------------------ */

/** A block's inner steps. Sketch: "single block can have many more layers
 *  within it" — the canvas shows one box, the drill-in shows the ladder. */
export type Layer = { label: string; detail: string }

export type GraphNode = {
  id: string
  label: string
  agentId: string
  /** Canvas coordinates, top-left, in the 980x420 design space. */
  x: number
  y: number
  /** Event ids this block consumes — the relation revealed on hover. */
  events: string[]
  /** Context ids this block resolves its definitions from. */
  contexts: string[]
  layers: Layer[]
  /** Step 3 only — what the block emitted on the selected run. */
  output: NodeOutput
}

/** The "output visualization within boxes" note on the sketch. Three shapes
 *  cover every block in the workflow; a block renders whichever it carries. */
export type NodeOutput =
  | { kind: 'fields'; rows: Array<{ key: string; value: string }> }
  | { kind: 'score'; value: number; max: number; unit: string; band: Tone }
  | { kind: 'split'; taken: string; bars: Array<{ label: string; pct: number; tone: Tone }> }

export const NODE_W = 188
export const NODE_H = 66
/** Test mode grows the box to fit its output visualisation. */
export const NODE_H_TEST = 122
export const CANVAS_W = 980
export const CANVAS_H = 430

export const NODES: GraphNode[] = [
  {
    id: 'n-trigger',
    label: 'Case referred',
    agentId: 'a-trigger',
    x: 10,
    y: 176,
    events: ['e1'],
    contexts: [],
    layers: [
      { label: 'Match event type', detail: 'uw.case.referred on the group health stream' },
      { label: 'Idempotency key', detail: 'case id + referral sequence' },
    ],
    output: {
      kind: 'fields',
      rows: [
        { key: 'case', value: 'GH-48120' },
        { key: 'lives', value: '1,240' },
      ],
    },
  },
  {
    id: 'n-extract',
    label: 'Submission parser',
    agentId: 'a-extract',
    x: 258,
    y: 34,
    events: ['e2', 'e3'],
    contexts: ['ctx-submission'],
    layers: [
      { label: 'Classify document set', detail: 'Proposal form, census, prior claims dump' },
      { label: 'Extract typed fields', detail: '31 fields against the submission schema' },
      { label: 'Confidence floor', detail: 'Anything under 0.8 is re-read, then flagged' },
    ],
    output: {
      kind: 'fields',
      rows: [
        { key: 'fields', value: '31 of 31' },
        { key: 'min conf', value: '0.86' },
      ],
    },
  },
  {
    id: 'n-claims',
    label: 'Claims history',
    agentId: 'a-lookup',
    x: 258,
    y: 300,
    events: ['e4'],
    contexts: ['ctx-book'],
    layers: [
      { label: 'Resolve the group', detail: 'Match on GSTIN, then on the contact tree' },
      { label: 'Pull 36 months', detail: 'Paid, outstanding and repudiated claims' },
    ],
    output: {
      kind: 'score',
      value: 113,
      max: 160,
      unit: '% loss ratio',
      band: 'danger',
    },
  },
  {
    id: 'n-score',
    label: 'Risk scorer',
    agentId: 'a-score',
    x: 506,
    y: 176,
    events: ['e5', 'e6'],
    contexts: ['ctx-submission', 'ctx-book'],
    layers: [
      { label: 'Assemble features', detail: 'Census mix, loss ratio, industry, prior loadings' },
      { label: 'Score', detail: 'Bounded 0-100 with a per-feature contribution' },
      { label: 'State the rationale', detail: 'Top three contributions, in the underwriter’s words' },
    ],
    output: {
      kind: 'score',
      value: 74,
      max: 100,
      unit: 'risk score',
      band: 'warning',
    },
  },
  {
    id: 'n-gate',
    label: 'Authority band',
    agentId: 'a-gate',
    x: 728,
    y: 176,
    events: ['e7'],
    contexts: ['ctx-authority'],
    layers: [
      { label: 'Read the band', detail: 'Junior to 15% loading, standard to 30%' },
      { label: 'Branch', detail: 'Within band drafts a counter-offer; a breach refers up' },
    ],
    output: {
      kind: 'split',
      taken: 'Breach',
      bars: [
        { label: 'Within band', pct: 38, tone: 'success' },
        { label: 'Breach', pct: 62, tone: 'danger' },
      ],
    },
  },
  {
    id: 'n-draft',
    label: 'Counter-offer draft',
    agentId: 'a-draft',
    x: 728,
    y: 20,
    events: ['e8'],
    contexts: ['ctx-authority'],
    layers: [
      { label: 'Price the loading', detail: 'Against the rate table the band allows' },
      { label: 'Write the letter', detail: 'Reason codes first, price second' },
    ],
    output: {
      kind: 'fields',
      rows: [
        { key: 'loading', value: 'not reached' },
        { key: 'state', value: 'skipped' },
      ],
    },
  },
  {
    id: 'n-senior',
    label: 'Refer to senior',
    agentId: 'a-handoff',
    x: 728,
    y: 332,
    events: ['e9'],
    contexts: [],
    layers: [
      { label: 'Summarise', detail: 'Score, rationale and the band it breached' },
      { label: 'Queue', detail: 'Senior UW queue, ranked by premium at risk' },
    ],
    output: {
      kind: 'fields',
      rows: [
        { key: 'queued', value: 'senior UW' },
        { key: 'rank', value: '4 of 27' },
      ],
    },
  },
]

export type Edge = { from: string; to: string; label?: string }

export const EDGES: Edge[] = [
  { from: 'n-trigger', to: 'n-extract' },
  { from: 'n-trigger', to: 'n-claims' },
  { from: 'n-extract', to: 'n-score' },
  { from: 'n-claims', to: 'n-score' },
  { from: 'n-score', to: 'n-gate' },
  { from: 'n-gate', to: 'n-draft', label: 'within band' },
  { from: 'n-gate', to: 'n-senior', label: 'breach' },
]

export const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, GraphNode>

/* ------------------------------------------------------------------ *
 * The event stream, and the contexts cut out of it
 * ------------------------------------------------------------------ */

export type EventRow = {
  id: string
  /** Wall clock on the recorded run. */
  ts: string
  source: string
  label: string
  detail: string
}

/** The recorded stream a workflow is built against. Selecting a run of these
 *  and naming it is what produces a context (sketch: "tag to context"). */
export const EVENTS: EventRow[] = [
  { id: 'e1', ts: '09:14:02', source: 'uw.queue', label: 'case.referred', detail: 'GH-48120 referred from the quotation journey, 1,240 lives' },
  { id: 'e2', ts: '09:14:03', source: 'documents', label: 'proposal.uploaded', detail: 'Proposal form, 14 pages, scanned' },
  { id: 'e3', ts: '09:14:03', source: 'documents', label: 'census.uploaded', detail: 'Member census, 1,240 rows, age and dependant mix' },
  { id: 'e4', ts: '09:14:11', source: 'claims', label: 'history.read', detail: '36 months pulled, 412 claims, 113% loss ratio' },
  { id: 'e5', ts: '09:14:12', source: 'rating', label: 'rate.table.read', detail: 'Group health FY26 table, band C' },
  { id: 'e6', ts: '09:14:14', source: 'rules', label: 'loading.rules.read', detail: 'Industry loading matrix, 9 rules matched' },
  { id: 'e7', ts: '09:14:15', source: 'policy', label: 'authority.checked', detail: 'Standard band, ceiling 30% loading' },
  { id: 'e8', ts: '09:14:15', source: 'rating', label: 'loading.proposed', detail: '41% loading proposed against a 30% ceiling' },
  { id: 'e9', ts: '09:14:16', source: 'uw.queue', label: 'case.referred.senior', detail: 'Breach recorded, queued to senior UW' },
  { id: 'e10', ts: '09:22:40', source: 'uw.queue', label: 'decision.recorded', detail: 'Senior UW issued a 34% loading with a two-year lock' },
]

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e])) as Record<string, EventRow>

export type ContextDef = {
  id: string
  name: string
  description: string
  /** The run of events the definition was cut from. */
  eventIds: string[]
  fields: Array<{ key: string; value: string }>
  /** Library contexts are shared across workflows; local ones are not. */
  scope: 'Library' | 'This workflow'
}

/** Sketch: "context library, use at core definitions." A context is a named
 *  slice of the event stream plus the fields a block may read from it. */
export const CONTEXTS: ContextDef[] = [
  {
    id: 'ctx-submission',
    name: 'Submission set',
    description:
      'Everything the group submitted, as one definition. Any workflow that reads a proposal reads this rather than naming documents itself.',
    eventIds: ['e2', 'e3'],
    fields: [
      { key: 'proposal', value: 'document ref' },
      { key: 'census', value: 'table, 1,240 rows' },
      { key: 'lives', value: 'integer' },
      { key: 'age_mix', value: 'distribution' },
    ],
    scope: 'Library',
  },
  {
    id: 'ctx-book',
    name: 'Prior experience',
    description:
      'The claims view of an existing group. Cut once so the loss-ratio definition cannot drift between underwriting and renewal.',
    eventIds: ['e4', 'e5'],
    fields: [
      { key: 'months', value: '36' },
      { key: 'loss_ratio', value: 'percent' },
      { key: 'large_claims', value: 'count over 5L' },
    ],
    scope: 'Library',
  },
  {
    id: 'ctx-authority',
    name: 'Authority band',
    description:
      'The policy-as-code view of what this underwriter may sign. Local to the workflow because the band is journey-specific.',
    eventIds: ['e7', 'e8'],
    fields: [
      { key: 'band', value: 'junior | standard | senior' },
      { key: 'ceiling', value: 'percent loading' },
    ],
    scope: 'This workflow',
  },
]

export const CONTEXT_BY_ID = Object.fromEntries(CONTEXTS.map((c) => [c.id, c])) as Record<string, ContextDef>

/* ------------------------------------------------------------------ *
 * Step 3 — the test run
 * ------------------------------------------------------------------ */

export type CheckStatus = 'pass' | 'fail' | 'skipped'

export type Check = {
  id: string
  nodeId: string
  label: string
  /** Sketch: "test (AI + manual defined)" — assertions come from both. */
  origin: 'AI' | 'Manual'
  status: CheckStatus
  expected: string
  actual: string
  note?: string
}

export const CHECKS: Check[] = [
  {
    id: 'c1',
    nodeId: 'n-extract',
    label: 'All 31 submission fields extracted',
    origin: 'Manual',
    status: 'pass',
    expected: '31 of 31 fields, minimum confidence 0.80',
    actual: '31 of 31 fields, minimum confidence 0.86',
  },
  {
    id: 'c2',
    nodeId: 'n-claims',
    label: 'Loss ratio matches the claims dump',
    origin: 'Manual',
    status: 'pass',
    expected: '113%',
    actual: '113%',
  },
  {
    id: 'c3',
    nodeId: 'n-score',
    label: 'Risk score cites its top three contributions',
    origin: 'AI',
    status: 'fail',
    expected: 'Three named contributions, each with a signed weight',
    actual: 'Two contributions named; the industry loading was applied without being cited',
    note:
      'The block is right about the number and wrong about the reason it gives. An underwriter signing this is signing a rationale that does not account for 11 points of the score.',
  },
  {
    id: 'c4',
    nodeId: 'n-gate',
    label: 'Breach refers up rather than drafting',
    origin: 'Manual',
    status: 'pass',
    expected: 'Counter-offer draft skipped, senior referral queued',
    actual: 'Counter-offer draft skipped, senior referral queued',
  },
  {
    id: 'c5',
    nodeId: 'n-senior',
    label: 'Handoff summary names the band it breached',
    origin: 'AI',
    status: 'pass',
    expected: 'Band and ceiling present in the summary',
    actual: 'Standard band, 30% ceiling, 41% proposed',
  },
  {
    id: 'c6',
    nodeId: 'n-draft',
    label: 'Counter-offer priced within the ceiling',
    origin: 'Manual',
    status: 'skipped',
    expected: 'Loading at or under 30%',
    actual: 'Block did not run on this path',
  },
]

/** The workbench's own run history for the modelled workflow. */
export const RUN_HISTORY = [
  { id: 'r-114', label: 'Run 114', when: '2 hours ago', passed: 4, failed: 1, skipped: 1, current: true },
  { id: 'r-113', label: 'Run 113', when: 'Yesterday', passed: 5, failed: 0, skipped: 1, current: false },
  { id: 'r-112', label: 'Run 112', when: '3 days ago', passed: 3, failed: 2, skipped: 1, current: false },
]
