/**
 * Cover recommendations for the Eicore Tech renewal, and the evidence behind
 * each one.
 *
 * Fictional, but shaped on the real knowledge-graph export
 * (`../ai-research/knowledge-graph-dump`): the entity types, the ARN scheme,
 * the stored relationship names (CONTAINS, COVERS, PROPOSER_OF) and the
 * quotation statuses are the dump's own. What the dump does not hold — group
 * clients, industries, cover values with a limit in them — is invented here,
 * so the graph can say something about a GROUP quotation.
 *
 * Two kinds of edge, and the panel draws them differently:
 * - **stored** — a relationship that exists in the graph as a record.
 * - **derived** — one the recommender inferred (the similarity match, the
 *   aggregate over a cohort). It is the part a reader should question first,
 *   so it is drawn dashed and says what it was computed from.
 */

const TENANT = '10000000-0000-4000-8000-000000000001'
const arn = (path: string) => `arn:eicore:insurance::${TENANT}:${path}`

/** Display name for the recommendation's group scope. */
export type RecScope = 'all' | 'g-300k' | 'g-500k' | 'g-1000k'

export type GraphNodeId = 'quotation' | 'client' | 'cohort' | 'outcome' | 'plan' | 'cover' | 'value'

export type GraphNode = {
  id: GraphNodeId
  /** The entity type, as the dump names it. */
  type: string
  name: string
  arn?: string
  attributes: Record<string, string>
  /** On a derived node: what it was computed from. */
  derivation?: Derivation
}

/** One matching rule, and how many quotations were left once it applied. */
export type FunnelStep = { rule: string; field: string; client?: string; left: number }

export type Derivation =
  | { kind: 'funnel'; steps: FunnelStep[] }
  | { kind: 'count'; field: string; over: string; counts: { value: string; n: number }[] }

export type GraphEdge = {
  from: GraphNodeId
  to: GraphNodeId
  label: string
  kind: 'stored' | 'derived'
  /** On the path that produced the recommendation. */
  path?: boolean
}

export type Example = {
  number: string
  client: string
  industry: string
  employees: number
  /** The value this quotation carried for the recommended cover. */
  value: string
  status: 'APPROVED' | 'DECLINED'
  decidedOn: string
}

export type CoverRec = {
  id: string
  cover: string
  scope: RecScope
  kind: 'limit' | 'addon'
  /**
   * The limit to write. A rupee figure is flat; `share:0.3` is 30% of the
   * band's sum insured, so one base change reads right on every tab.
   */
  limit?: string
  confidence: number
  /** The derived cohort the recommendation was read off. */
  cohort: { label: string; size: number; match: string; funnel: FunnelStep[] }
  /** How many of the cohort carried the recommended value. */
  carried: number
  outcome: { approved: number; of: number }
  insights: { value: string; label: string }[]
  examples: Example[]
}

export const CLIENT = {
  name: 'Eicore Tech Ltd',
  industry: 'IT / Technology Services',
  employees: '1,367',
  businessType: 'Renewal',
}

export const QUOTATION_NO = 'QN-GH-2026-0142'

/* The matching rules every cohort starts with. Field names are the dump's
   entity types; the counts are invented. */
const ALL: FunnelStep = { rule: 'All group health quotations', field: 'INSURANCE_QUOTATION', left: 412 }
const INDUSTRY: FunnelStep = {
  rule: 'Industry is IT / ITES',
  field: 'PARTY_ORGANISATION.industry',
  client: 'IT / Technology Services',
  left: 96,
}
const RECENT = (left: number): FunnelStep => ({
  rule: 'Decided in the last 24 months',
  field: 'AUDIT_EVENT.occurredAt',
  left,
})

const IT_RENEWALS = {
  label: '38 similar renewals',
  size: 38,
  match: 'IT / ITES · 1,000–2,500 employees · renewal · last 24 months',
  funnel: [
    ALL,
    INDUSTRY,
    { rule: '1,000–2,500 employees', field: 'PARTY_ORGANISATION.employees', client: '1,367', left: 51 },
    { rule: 'Renewal', field: 'INSURANCE_QUOTATION.businessType', client: 'Renewal', left: 44 },
    RECENT(38),
  ],
}

/** A cohort of member groups at one sum insured, rather than whole quotations. */
const bandCohort = (si: string, short: string, withBand: number, size: number) => ({
  label: `${size} similar ${short} bands`,
  size,
  match: `IT / ITES · ${si} band · renewal · last 24 months`,
  funnel: [
    ALL,
    INDUSTRY,
    { rule: 'Renewal', field: 'INSURANCE_QUOTATION.businessType', client: 'Renewal', left: 81 },
    { rule: `Has a ${si} member group`, field: 'MEMBER_GROUP.sumInsured', client: si, left: withBand },
    RECENT(size),
  ],
})

export const COVER_RECS: CoverRec[] = [
  {
    id: 'R1',
    cover: 'Road Ambulance Cover',
    scope: 'all',
    kind: 'limit',
    limit: '₹2,500',
    confidence: 0.86,
    cohort: IT_RENEWALS,
    carried: 29,
    outcome: { approved: 27, of: 29 },
    insights: [
      { value: '29 of 38', label: 'set road ambulance at ₹2,500 or more' },
      { value: '₹2,500', label: 'median limit across the cohort' },
      { value: '41%', label: 'of ambulance claims in the cohort exceeded ₹1,000' },
    ],
    examples: [
      { number: 'QN-GH-2025-0412', client: 'Northwind Software Pvt Ltd', industry: 'IT services', employees: 1520, value: '₹2,500', status: 'APPROVED', decidedOn: '12 Mar 2026' },
      { number: 'QN-GH-2025-0377', client: 'Kestrel Analytics Ltd', industry: 'ITES / BPO', employees: 1180, value: '₹3,000', status: 'APPROVED', decidedOn: '28 Jan 2026' },
      { number: 'QN-GH-2025-0291', client: 'Tessera Systems Pvt Ltd', industry: 'IT services', employees: 2210, value: '₹1,000', status: 'DECLINED', decidedOn: '04 Nov 2025' },
    ],
  },
  {
    id: 'R2',
    cover: 'Pre-Post Hospitalization',
    scope: 'all',
    kind: 'limit',
    limit: 'share:0.3',
    confidence: 0.74,
    cohort: IT_RENEWALS,
    carried: 22,
    outcome: { approved: 21, of: 22 },
    insights: [
      { value: '22 of 38', label: 'carried pre-post at 30% of sum insured' },
      { value: '21 of 22', label: 'of those were approved' },
      { value: '+1.8%', label: 'median premium effect against 20% of SI' },
    ],
    examples: [
      { number: 'QN-GH-2025-0398', client: 'Brightpath IT Solutions', industry: 'IT services', employees: 1340, value: '30% of SI', status: 'APPROVED', decidedOn: '19 Feb 2026' },
      { number: 'QN-GH-2025-0356', client: 'Lumen Data Services', industry: 'ITES / BPO', employees: 1890, value: '30% of SI', status: 'APPROVED', decidedOn: '08 Jan 2026' },
      { number: 'QN-GH-2025-0264', client: 'Orbis Infotech Ltd', industry: 'IT services', employees: 1050, value: '20% of SI', status: 'APPROVED', decidedOn: '17 Oct 2025' },
    ],
  },
  {
    id: 'R3',
    cover: 'OPD Cover',
    scope: 'g-300k',
    kind: 'addon',
    limit: '₹5,000',
    confidence: 0.82,
    cohort: IT_RENEWALS,
    carried: 31,
    outcome: { approved: 28, of: 31 },
    insights: [
      { value: '31 of 38', label: 'carried OPD on their lowest sum-insured band' },
      { value: '₹5,000', label: 'median OPD limit on that band' },
      { value: '28 of 31', label: 'approved with OPD, against 5 of 7 without' },
    ],
    examples: [
      { number: 'QN-GH-2025-0412', client: 'Northwind Software Pvt Ltd', industry: 'IT services', employees: 1520, value: 'On · ₹5,000', status: 'APPROVED', decidedOn: '12 Mar 2026' },
      { number: 'QN-GH-2025-0388', client: 'Halcyon Tech Pvt Ltd', industry: 'IT services', employees: 1610, value: 'On · ₹4,000', status: 'APPROVED', decidedOn: '06 Feb 2026' },
      { number: 'QN-GH-2025-0302', client: 'Saffron Digital Ltd', industry: 'ITES / BPO', employees: 1275, value: 'Off', status: 'DECLINED', decidedOn: '21 Nov 2025' },
    ],
  },
  {
    id: 'R4',
    cover: 'Critical Illness Cover',
    scope: 'g-500k',
    kind: 'addon',
    confidence: 0.68,
    cohort: bandCohort('₹5,00,000', '₹5L', 33, 24),
    carried: 17,
    outcome: { approved: 15, of: 17 },
    insights: [
      { value: '17 of 24', label: '₹5,00,000 bands carried critical illness' },
      { value: '₹5,00,000', label: 'limit in every one of them (100% of SI)' },
      { value: '15 of 17', label: 'of those were approved' },
    ],
    examples: [
      { number: 'QN-GH-2025-0377', client: 'Kestrel Analytics Ltd', industry: 'ITES / BPO', employees: 1180, value: 'On · ₹5,00,000', status: 'APPROVED', decidedOn: '28 Jan 2026' },
      { number: 'QN-GH-2025-0341', client: 'Meridian Cloud Pvt Ltd', industry: 'IT services', employees: 1430, value: 'On · ₹5,00,000', status: 'APPROVED', decidedOn: '15 Dec 2025' },
      { number: 'QN-GH-2025-0291', client: 'Tessera Systems Pvt Ltd', industry: 'IT services', employees: 2210, value: 'On · ₹5,00,000', status: 'DECLINED', decidedOn: '04 Nov 2025' },
    ],
  },
  {
    id: 'R5',
    cover: 'Air Ambulance Cover',
    scope: 'g-1000k',
    kind: 'addon',
    confidence: 0.71,
    cohort: bandCohort('₹10,00,000', '₹10L', 26, 19),
    carried: 12,
    outcome: { approved: 12, of: 12 },
    insights: [
      { value: '12 of 19', label: '₹10,00,000 bands carried air ambulance' },
      { value: '12 of 12', label: 'of those were approved' },
      { value: '₹2,00,000', label: 'per-policy limit in all twelve' },
    ],
    examples: [
      { number: 'QN-GH-2025-0398', client: 'Brightpath IT Solutions', industry: 'IT services', employees: 1340, value: 'On · ₹2,00,000', status: 'APPROVED', decidedOn: '19 Feb 2026' },
      { number: 'QN-GH-2025-0341', client: 'Meridian Cloud Pvt Ltd', industry: 'IT services', employees: 1430, value: 'On · ₹2,00,000', status: 'APPROVED', decidedOn: '15 Dec 2025' },
      { number: 'QN-GH-2025-0319', client: 'Quartzline Software Ltd', industry: 'IT services', employees: 1720, value: 'Off', status: 'APPROVED', decidedOn: '27 Nov 2025' },
    ],
  },
]

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/**
 * The slice of the graph a recommendation was read off.
 *
 * The highlighted path is the argument: this quotation, its proposer, the
 * cohort the proposer was matched into, the value that cohort carried, and
 * the cover that value is for. The rest is context: the plan both sides sit
 * under, and how the cohort's quotations were decided.
 */
export function graphFor(rec: CoverRec, recommended: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const coverSlug = slug(rec.cover)
  const nodes: GraphNode[] = [
    {
      id: 'quotation',
      type: 'INSURANCE_QUOTATION',
      name: QUOTATION_NO,
      arn: arn(`quotation/${QUOTATION_NO.toLowerCase()}`),
      attributes: { number: QUOTATION_NO, status: 'DRAFT', businessType: CLIENT.businessType },
    },
    {
      id: 'client',
      type: 'PARTY_ORGANISATION',
      name: CLIENT.name,
      arn: arn('party/organisation/eicore-tech-ltd'),
      attributes: { industry: CLIENT.industry, employees: CLIENT.employees },
    },
    {
      id: 'cohort',
      type: 'DERIVED_COHORT',
      name: rec.cohort.label,
      attributes: { matchedOn: rec.cohort.match, size: String(rec.cohort.size) },
      derivation: { kind: 'funnel', steps: rec.cohort.funnel },
    },
    {
      id: 'outcome',
      type: 'AUDIT_EVENT',
      name: `Approved ${rec.outcome.approved} of ${rec.outcome.of}`,
      attributes: {
        source: 'Underwriter decision events on the cohort',
        approved: String(rec.outcome.approved),
        declined: String(rec.outcome.of - rec.outcome.approved),
      },
      derivation: {
        kind: 'count',
        field: 'INSURANCE_QUOTATION.status',
        over: `${rec.outcome.of} cohort quotations carrying ${recommended}`,
        counts: [
          { value: 'APPROVED', n: rec.outcome.approved },
          { value: 'DECLINED', n: rec.outcome.of - rec.outcome.approved },
        ],
      },
    },
    {
      id: 'plan',
      type: 'INSURANCE_PLAN',
      name: 'Group Health Total › Standard',
      arn: arn('product/group-health-total/plan/standard'),
      attributes: { status: 'Published', lineOfBusiness: 'Health' },
    },
    {
      id: 'cover',
      type: 'INSURANCE_COVER',
      name: rec.cover,
      arn: arn(`cover-configuration/standard-${coverSlug}`),
      attributes: { kind: rec.kind === 'addon' ? 'Add-on' : 'Base' },
    },
    {
      id: 'value',
      type: 'INSURANCE_COVER_VALUE',
      name: recommended,
      arn: arn(`cover-value/cohort-${coverSlug}`),
      attributes: { carriedBy: `${rec.carried} of ${rec.cohort.size}`, value: recommended },
    },
  ]

  const edges: GraphEdge[] = [
    { from: 'client', to: 'quotation', label: 'PROPOSER_OF', kind: 'stored', path: true },
    { from: 'client', to: 'cohort', label: 'SIMILAR_TO', kind: 'derived', path: true },
    { from: 'cohort', to: 'value', label: `${rec.carried} of ${rec.cohort.size} carry`, kind: 'derived', path: true },
    { from: 'value', to: 'cover', label: 'COVERS', kind: 'stored', path: true },
    { from: 'cohort', to: 'outcome', label: 'DECIDED', kind: 'derived' },
    { from: 'plan', to: 'quotation', label: 'CONTAINS', kind: 'stored' },
    { from: 'plan', to: 'cover', label: 'CONTAINS', kind: 'stored' },
  ]

  return { nodes, edges }
}
