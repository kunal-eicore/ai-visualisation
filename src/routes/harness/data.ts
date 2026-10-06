import type { Tone } from '@/components/ui/Badge'

/**
 * Fixtures for the Agent Harness.
 *
 * The premise, and it shapes every screen here: **the product ships no model
 * access.** There is no bundled inference, no rate card, no key of ours behind
 * a proxy. The tenant brings their own provider accounts, the harness holds the
 * wiring, and calls leave the tenant for the provider directly. Everything in
 * this file is read as "yours" — your key, your quota, your bill.
 *
 * Anthropic model ids, context windows and list prices are the real published
 * ones. Prices are shown only because you cannot pick a model without them; they
 * are the provider's list rate against the tenant's own account, never ours.
 */

/* ------------------------------------------------------------------ *
 * Providers — the bring-your-own-key half
 * ------------------------------------------------------------------ */

export type ProviderStatus = 'connected' | 'unconfigured' | 'error'

/** What kind of endpoint this is. Separate from the provider's id because a
 *  tenant can connect two self-hosted endpoints, and everything keyed off
 *  "what shape is this" must follow the kind rather than the row. */
export type ProviderKind = 'anthropic' | 'bedrock' | 'azure' | 'onprem' | 'vertex'

/** How the tenant proves who they are to their own provider. Four shapes, and
 *  the harness has to hold all four — an API key is only the simplest one. */
export type AuthMode = 'API key' | 'Endpoint + key' | 'Workload identity' | 'Private endpoint'

export type CredentialField = {
  label: string
  /** Masked at rest and masked here — the harness never renders a secret back. */
  value: string
  secret?: boolean
  hint?: string
}

export type Provider = {
  id: string
  kind: ProviderKind
  name: string
  /** Who operates the endpoint the tenant is paying. */
  operator: string
  status: ProviderStatus
  authMode: AuthMode
  /** Where inference physically runs — the question that decides half of these. */
  residency: string
  /** Where the secret is held. Never in the harness. */
  vault: string
  lastCheck: string
  summary: string
  fields: CredentialField[]
}

export const PROVIDERS: Provider[] = [
  {
    id: 'anthropic',
    kind: 'anthropic',
    name: 'Anthropic',
    operator: 'Anthropic, first-party API',
    status: 'connected',
    authMode: 'API key',
    residency: 'US · EU',
    vault: 'tenant vault · eicore-prod/kv/llm',
    lastCheck: 'Handshake 4 min ago',
    summary:
      'The tenant’s own Anthropic account. Usage bills to that account at Anthropic’s list rates; the harness only holds a reference to the secret.',
    fields: [
      { label: 'API key', value: 'sk-ant-api03-' + '•'.repeat(24) + '4f2a', secret: true, hint: 'Held in the tenant vault. Written once, never read back.' },
      { label: 'Workspace', value: 'eicore-underwriting' },
      { label: 'Base URL', value: 'https://api.anthropic.com', hint: 'Default. Override only for an approved gateway.' },
      { label: 'Org rate limit', value: '4,000 req/min · 800K input tok/min' },
    ],
  },
  {
    id: 'bedrock',
    kind: 'bedrock',
    name: 'Amazon Bedrock',
    operator: 'AWS, partner-operated',
    status: 'connected',
    authMode: 'Workload identity',
    residency: 'ap-south-1 (Mumbai)',
    vault: 'no secret — IAM role assumed at call time',
    lastCheck: 'Handshake 4 min ago',
    summary:
      'The same Claude models inside the tenant’s AWS account, in-region. No key to store: the harness assumes a role. Bedrock is partner-operated and priced separately from Anthropic’s first-party rates.',
    fields: [
      { label: 'Role ARN', value: 'arn:aws:iam::4418••••••:role/eicore-llm-invoke' },
      { label: 'Region', value: 'ap-south-1' },
      { label: 'External ID', value: '•'.repeat(18) + 'c71', secret: true },
      { label: 'Session duration', value: '60 min' },
    ],
  },
  {
    id: 'azure',
    kind: 'azure',
    name: 'Azure OpenAI',
    operator: 'Microsoft, tenant subscription',
    status: 'connected',
    authMode: 'Endpoint + key',
    residency: 'India Central',
    vault: 'tenant vault · Azure Key Vault',
    lastCheck: 'Handshake 11 min ago',
    summary:
      'Already procured for the group’s other workloads, so it arrives as a deployment name rather than a model name. The harness maps the deployment to the model it actually serves.',
    fields: [
      { label: 'Endpoint', value: 'https://eicore-ai.openai.azure.com' },
      { label: 'API key', value: '•'.repeat(28) + 'a90', secret: true },
      { label: 'API version', value: '2026-02-01' },
      { label: 'Deployments', value: 'uw-reasoning · uw-bulk' },
    ],
  },
  {
    id: 'onprem',
    kind: 'onprem',
    name: 'Self-hosted (vLLM)',
    operator: 'The tenant’s own GPUs',
    status: 'connected',
    authMode: 'Private endpoint',
    residency: 'Mumbai DC · no egress',
    vault: 'mTLS client certificate',
    lastCheck: 'Handshake 1 min ago',
    summary:
      'Open-weight models on the tenant’s hardware. The only route for work that may not leave the data centre at all — slower and less capable, and that trade is the point of listing it beside the others.',
    fields: [
      { label: 'Base URL', value: 'https://llm.eicore.internal/v1' },
      { label: 'Client certificate', value: 'eicore-harness.pem', secret: true },
      { label: 'Served models', value: '2 (see catalogue)' },
      { label: 'Capacity', value: '4 × H100 · 1 replica' },
    ],
  },
  {
    id: 'vertex',
    kind: 'vertex',
    name: 'Google Vertex AI',
    operator: 'Google Cloud, partner-operated',
    status: 'unconfigured',
    authMode: 'Workload identity',
    residency: 'not set',
    vault: 'not set',
    lastCheck: 'Never connected',
    summary:
      'Listed because the harness supports it, not because anything is configured. Nothing in this product talks to Vertex until the tenant supplies a project and grants the service account.',
    fields: [
      { label: 'Project ID', value: '', hint: 'Required' },
      { label: 'Region', value: '', hint: 'Required · global is recommended' },
      { label: 'Service account', value: '', hint: 'Grant roles/aiplatform.user' },
    ],
  },
]

export const PROVIDER_BY_ID: Record<string, Provider> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p]),
)

/* ------------------------------------------------------------------ *
 * Model catalogue
 * ------------------------------------------------------------------ */

export type Capability = 'Tools' | 'Vision' | 'Thinking' | 'Caching' | 'Streaming' | 'Batch'

/** What it costs the tenant per million tokens on their own account, or why
 *  there is no number to show. */
export type Rate =
  | { kind: 'list'; input: number; output: number }
  | { kind: 'partner'; note: string }
  | { kind: 'owned'; note: string }

export type Model = {
  id: string
  providerId: string
  name: string
  /** The exact id the harness sends on the wire. */
  apiId: string
  context: string
  maxOutput: string
  rate: Rate
  latency: string
  caps: Capability[]
  note: string
  /** Off means present in the catalogue and not callable — the tenant has not
   *  enabled it for this environment. */
  enabled: boolean
}

export const MODELS: Model[] = [
  {
    id: 'm-opus-5',
    providerId: 'anthropic',
    name: 'Claude Opus 5',
    apiId: 'claude-opus-5',
    context: '1M',
    maxOutput: '128K',
    rate: { kind: 'list', input: 5, output: 25 },
    latency: 'p50 4.2s',
    caps: ['Tools', 'Vision', 'Thinking', 'Caching', 'Streaming', 'Batch'],
    note: 'The reasoning route. Carries referral triage and the shadow evaluator.',
    enabled: true,
  },
  {
    id: 'm-sonnet-5',
    providerId: 'anthropic',
    name: 'Claude Sonnet 5',
    apiId: 'claude-sonnet-5',
    context: '1M',
    maxOutput: '128K',
    rate: { kind: 'list', input: 2, output: 10 },
    latency: 'p50 1.9s',
    caps: ['Tools', 'Vision', 'Thinking', 'Caching', 'Streaming', 'Batch'],
    note: 'The default for tool-driven work — metric Q&A and the copilot.',
    enabled: true,
  },
  {
    id: 'm-haiku-45',
    providerId: 'anthropic',
    name: 'Claude Haiku 4.5',
    apiId: 'claude-haiku-4-5',
    context: '200K',
    maxOutput: '64K',
    rate: { kind: 'list', input: 1, output: 5 },
    latency: 'p50 0.7s',
    caps: ['Tools', 'Vision', 'Caching', 'Streaming', 'Batch'],
    note: 'Bulk extraction. Cheap enough to run over every page of a proposal.',
    enabled: true,
  },
  {
    id: 'm-bedrock-opus-5',
    providerId: 'bedrock',
    name: 'Claude Opus 5 (Bedrock)',
    apiId: 'anthropic.claude-opus-5',
    context: '1M',
    maxOutput: '128K',
    rate: { kind: 'partner', note: 'AWS partner rate, billed on the tenant’s AWS account' },
    latency: 'p50 4.6s',
    caps: ['Tools', 'Vision', 'Thinking', 'Caching', 'Streaming'],
    note: 'The in-region copy. Same model, same prompts, different bill and different jurisdiction.',
    enabled: true,
  },
  {
    id: 'm-bedrock-sonnet-5',
    providerId: 'bedrock',
    name: 'Claude Sonnet 5 (Bedrock)',
    apiId: 'anthropic.claude-sonnet-5',
    context: '1M',
    maxOutput: '128K',
    rate: { kind: 'partner', note: 'AWS partner rate, billed on the tenant’s AWS account' },
    latency: 'p50 2.1s',
    caps: ['Tools', 'Vision', 'Thinking', 'Caching', 'Streaming'],
    note: 'In-region fallback for anything the regulator may ask to see hosted locally.',
    enabled: true,
  },
  {
    id: 'm-azure-reasoning',
    providerId: 'azure',
    name: 'uw-reasoning',
    apiId: 'deployment: uw-reasoning',
    context: '256K',
    maxOutput: '64K',
    rate: { kind: 'partner', note: 'Enterprise agreement, billed on the tenant’s Azure subscription' },
    latency: 'p50 3.8s',
    caps: ['Tools', 'Vision', 'Streaming'],
    note: 'A deployment, not a model name — the harness resolves what it serves at handshake.',
    enabled: true,
  },
  {
    id: 'm-azure-bulk',
    providerId: 'azure',
    name: 'uw-bulk',
    apiId: 'deployment: uw-bulk',
    context: '128K',
    maxOutput: '16K',
    rate: { kind: 'partner', note: 'Enterprise agreement, billed on the tenant’s Azure subscription' },
    latency: 'p50 0.9s',
    caps: ['Tools', 'Streaming', 'Batch'],
    note: 'Committed throughput the group already pays for. Cheapest place to put volume.',
    enabled: false,
  },
  {
    id: 'm-llama',
    providerId: 'onprem',
    name: 'Llama 3.3 70B Instruct',
    apiId: 'llama-3.3-70b-instruct',
    context: '128K',
    maxOutput: '8K',
    rate: { kind: 'owned', note: 'No per-token cost — the tenant owns the hardware' },
    latency: 'p50 6.1s',
    caps: ['Tools', 'Streaming'],
    note: 'For records that may not leave the data centre. Weaker at tool use; the routing step accounts for that.',
    enabled: true,
  },
  {
    id: 'm-embed',
    providerId: 'onprem',
    name: 'bge-m3 (embeddings)',
    apiId: 'bge-m3',
    context: '8K',
    maxOutput: 'n/a',
    rate: { kind: 'owned', note: 'No per-token cost — the tenant owns the hardware' },
    latency: 'p50 40ms',
    caps: ['Batch'],
    note: 'Backs the wording and circular index. Kept on-prem so the corpus never ships out.',
    enabled: true,
  },
]

export const MODEL_BY_ID: Record<string, Model> = Object.fromEntries(
  MODELS.map((m) => [m.id, m]),
)

export const modelsFor = (providerId: string) => MODELS.filter((m) => m.providerId === providerId)

/* ------------------------------------------------------------------ *
 * The canvas — model, harness, and the layers underneath
 * ------------------------------------------------------------------ */

export const CANVAS_W = 990
export const CANVAS_H = 372
export const NODE_W = 150
export const NODE_H = 68

export type NodeKind = 'runtime' | 'harness' | 'adapter' | 'service' | 'store'

export type WireNode = {
  id: string
  label: string
  kind: NodeKind
  /** The line under the label — an endpoint, a count, a dialect. */
  detail: string
  x: number
  y: number
}

const COL = [0, 210, 420, 630, 840]
const ROW = [8, 96, 184, 272]
const MID = 150

export const NODES: WireNode[] = [
  { id: 'runtime', label: 'Agent runtime', kind: 'runtime', detail: 'model binding', x: COL[0], y: MID },
  { id: 'harness', label: 'Harness', kind: 'harness', detail: 'identity · allowlist · trace', x: COL[1], y: MID },

  { id: 'mcp-semantic', label: 'semantic-engine', kind: 'adapter', detail: 'MCP · 2 tools', x: COL[2], y: ROW[0] },
  { id: 'mcp-intel', label: 'intelligence', kind: 'adapter', detail: 'MCP · 3 tools', x: COL[2], y: ROW[1] },
  { id: 'mcp-records', label: 'core-records', kind: 'adapter', detail: 'MCP · 3 tools', x: COL[2], y: ROW[2] },
  { id: 'mcp-docs', label: 'documents', kind: 'adapter', detail: 'MCP · 2 tools', x: COL[2], y: ROW[3] },

  { id: 'svc-semantic', label: 'Semantic engine', kind: 'service', detail: 'resolve · plan · SQL', x: COL[3], y: ROW[0] },
  { id: 'svc-intel', label: 'Intelligence layer', kind: 'service', detail: 'extract · score · match', x: COL[3], y: ROW[1] },
  { id: 'svc-sims', label: 'SureBuzz core', kind: 'service', detail: 'policy · claims', x: COL[3], y: ROW[2] },
  { id: 'svc-docs', label: 'Document store', kind: 'service', detail: 'wordings · circulars', x: COL[3], y: ROW[3] },

  { id: 'lakehouse', label: 'Lakehouse', kind: 'store', detail: 'Iceberg on object store', x: COL[4], y: MID },
]

export const NODE_BY_ID: Record<string, WireNode> = Object.fromEntries(
  NODES.map((n) => [n.id, n]),
)

export type WireEdge = { from: string; to: string; label?: string }

export const EDGES: WireEdge[] = [
  { from: 'runtime', to: 'harness', label: 'tool call' },
  { from: 'harness', to: 'mcp-semantic' },
  { from: 'harness', to: 'mcp-intel' },
  { from: 'harness', to: 'mcp-records' },
  { from: 'harness', to: 'mcp-docs' },
  { from: 'mcp-semantic', to: 'svc-semantic' },
  { from: 'mcp-intel', to: 'svc-intel' },
  { from: 'mcp-records', to: 'svc-sims' },
  { from: 'mcp-docs', to: 'svc-docs' },
  { from: 'svc-semantic', to: 'lakehouse', label: 'pushdown' },
  { from: 'svc-sims', to: 'lakehouse' },
]

/* ------------------------------------------------------------------ *
 * Bindings — what the harness is allowed to reach
 * ------------------------------------------------------------------ */

export type BindingKind = 'MCP server' | 'Intelligence layer' | 'Semantic layer'
export type BindingStatus = 'live' | 'degraded' | 'off'

export type ToolDef = { name: string; detail: string }

export type Binding = {
  id: string
  name: string
  kind: BindingKind
  endpoint: string
  status: BindingStatus
  auth: string
  /** Who the call runs as. The answer is never "a service account" for
   *  anything that reads customer data. */
  identity: string
  tools: ToolDef[]
  governance: string[]
  summary: string
  /** Nodes lit when this binding is selected — the route the call takes. */
  path: string[]
  enabled: boolean
}

export const BINDINGS: Binding[] = [
  {
    id: 'b-semantic',
    name: 'semantic-engine-mcp',
    kind: 'Semantic layer',
    endpoint: 'mcp+https://semantic.eicore.internal/mcp',
    status: 'live',
    auth: 'OIDC, identity passthrough',
    identity: 'the signed-in underwriter',
    tools: [
      { name: 'list_metrics', detail: 'Returns the certified catalogue — metrics, dimensions, grains. The model grounds on this before it asks anything.' },
      { name: 'query_metric', detail: 'A metric by name, sliced by real dimensions. No SQL crosses this boundary in either direction.' },
    ],
    governance: [
      'Row-level rules applied per identity, at resolve and at execute',
      'Column masking on PII — the model never sees an unmasked field',
      'Every answer carries the definition and the owner that produced it',
    ],
    summary:
      'The one binding that stops two workflows quietly disagreeing about what a loss ratio is. The model asks for a governed name; the engine owns the SQL.',
    path: ['runtime', 'harness', 'mcp-semantic', 'svc-semantic', 'lakehouse'],
    enabled: true,
  },
  {
    id: 'b-intel',
    name: 'intelligence-mcp',
    kind: 'Intelligence layer',
    endpoint: 'mcp+https://intelligence.eicore.internal/mcp',
    status: 'live',
    auth: 'OIDC, identity passthrough',
    identity: 'the signed-in underwriter',
    tools: [
      { name: 'extract_fields', detail: 'Typed fields out of a proposal form or a claim bill, each one carrying the page it came from.' },
      { name: 'score_referral', detail: 'The referral risk score, with the factors that moved it. Bounded and explainable, not a bare number.' },
      { name: 'match_contact', detail: 'Candidate duplicates for a contact or a group, with the rule that matched.' },
    ],
    governance: [
      'Scores are advisory — no binding may auto-apply one',
      'Extraction returns provenance or it returns nothing',
    ],
    summary:
      'The house models, reached the same way as anything else. A model the tenant did not bring is still behind a tool call, not inside the prompt.',
    path: ['runtime', 'harness', 'mcp-intel', 'svc-intel'],
    enabled: true,
  },
  {
    id: 'b-records',
    name: 'core-records-mcp',
    kind: 'MCP server',
    endpoint: 'mcp+https://core.eicore.internal/mcp',
    status: 'live',
    auth: 'OIDC, identity passthrough',
    identity: 'the signed-in underwriter',
    tools: [
      { name: 'get_policy', detail: 'One policy, as the core system holds it — schedule, endorsements, status.' },
      { name: 'get_claim_history', detail: 'Claims for a policy or a group, at the grain the core system stores them.' },
      { name: 'list_endorsements', detail: 'Endorsements in force, in order, with effective dates.' },
    ],
    governance: [
      'Read-only. Nothing in this catalogue writes to the core system',
      'Branch and channel scoping follows the caller, not the harness',
    ],
    summary:
      'Policy and claims out of SureBuzz core. Read-only on purpose: a copilot that can write to the book of record is a different risk conversation.',
    path: ['runtime', 'harness', 'mcp-records', 'svc-sims', 'lakehouse'],
    enabled: true,
  },
  {
    id: 'b-docs',
    name: 'documents-mcp',
    kind: 'MCP server',
    endpoint: 'mcp+https://docs.eicore.internal/mcp',
    status: 'degraded',
    auth: 'OIDC, identity passthrough',
    identity: 'the signed-in underwriter',
    tools: [
      { name: 'search_documents', detail: 'Retrieval over wordings, circulars and the rulebook. Returns passages with the document and page.' },
      { name: 'get_document_page', detail: 'One page, verbatim, so an answer can be checked against the source rather than trusted.' },
    ],
    governance: [
      'Passages carry document id and page — an uncited passage is dropped',
      'Embeddings are built on-prem; the corpus does not leave the data centre',
    ],
    summary:
      'Reindexing after the September circular load — retrieval is live but three days stale. The harness reports that rather than answering from a stale index silently.',
    path: ['runtime', 'harness', 'mcp-docs', 'svc-docs'],
    enabled: true,
  },
]

export const BINDING_BY_ID: Record<string, Binding> = Object.fromEntries(
  BINDINGS.map((b) => [b.id, b]),
)

export const BINDING_TONE: Record<BindingStatus, Tone> = {
  live: 'success',
  degraded: 'warning',
  off: 'neutral',
}

/* ------------------------------------------------------------------ *
 * Roles — which model does which job
 * ------------------------------------------------------------------ */

/**
 * What kind of call the role is making. This is the axis that actually decides
 * the model — not the department the job sits in, and not how interesting the
 * work sounds. A reversible proposal a human checks can run on a cheap model;
 * anything that moves money or is being measured cannot.
 */
export type DecisionClass =
  | 'Judgement · customer-affecting'
  | 'Mechanical · high volume'
  | 'Retrieval · answers a question'
  | 'Measurement · not customer-facing'
  | 'Proposal · a human decides'

export const DECISION_CLASSES: DecisionClass[] = [
  'Judgement · customer-affecting',
  'Retrieval · answers a question',
  'Mechanical · high volume',
  'Measurement · not customer-facing',
  'Proposal · a human decides',
]

/** Why that class implies the binding it does. One line, so the assignment
 *  table can be read as an argument rather than a list of preferences. */
export const CLASS_RATIONALE: Record<DecisionClass, string> = {
  'Judgement · customer-affecting':
    'Reasoning-heavy and hard to reverse. Worth the most capable model and the highest effort; low volume keeps that affordable.',
  'Retrieval · answers a question':
    'The governed layer supplies the numbers, so the model only has to ask well. A mid-tier model is enough, and the answer is checkable either way.',
  'Mechanical · high volume':
    'Shallow work over a lot of pages. The cheapest model that holds accuracy wins, and confidence below the floor goes to a human rather than to a bigger model.',
  'Measurement · not customer-facing':
    'Must be pinned and must not drift. Capability matters less than stability — a model that changes under the measurement invalidates it.',
  'Proposal · a human decides':
    'A steward reviews everything, so the cost of being wrong is low. Residency, not capability, is what constrains the binding here.',
}

export type Role = {
  id: string
  name: string
  decisionClass: DecisionClass
  purpose: string
  primaryModelId: string
  /** Null where a fallback would change the thing being measured. */
  fallbackModelId: string | null
  fallbackNote: string
  effort: string
  bindingIds: string[]
  /** What a model must report before it may carry this role. Checked against
   *  the catalogue, not against a reputation. */
  requires: Capability[]
  /** Set where the records this role reads may not leave the data centre. */
  onPremOnly?: boolean
  /** False where a fallback would change the thing being measured, or would be
   *  a breach rather than a degraded mode. */
  fallbackAllowed: boolean
  budget: string
  /** What a human still has to do. A role with no gate says so plainly. */
  gate: string
}

export const ROLES: Role[] = [
  {
    id: 'r-referral',
    requires: ['Tools', 'Thinking'] as Capability[],
    fallbackAllowed: true,
    decisionClass: 'Judgement · customer-affecting',
    name: 'UW referral triage',
    purpose:
      'Reads a referred case, pulls prior experience and the rulebook, and proposes a decision with the factors behind it.',
    primaryModelId: 'm-opus-5',
    fallbackModelId: 'm-bedrock-opus-5',
    fallbackNote: 'Same model in-region — a fallback that changes jurisdiction but not behaviour.',
    effort: 'high',
    bindingIds: ['b-semantic', 'b-records', 'b-docs'],
    budget: '120K tokens per case',
    gate: 'An underwriter accepts or overrides. Nothing is applied from the agent.',
  },
  {
    id: 'r-metric-qa',
    requires: ['Tools'] as Capability[],
    fallbackAllowed: true,
    decisionClass: 'Retrieval · answers a question',
    name: 'Metric Q&A',
    purpose:
      'Plain-language questions about the book, answered out of the certified metrics rather than out of the model.',
    primaryModelId: 'm-sonnet-5',
    fallbackModelId: 'm-haiku-45',
    fallbackNote: 'Cheaper model, same tools — the answer is governed either way.',
    effort: 'medium',
    bindingIds: ['b-semantic'],
    budget: '30K tokens per question',
    gate: 'None. Every figure traces to a governed metric and a real query.',
  },
  {
    id: 'r-extraction',
    requires: ['Tools', 'Vision'] as Capability[],
    fallbackAllowed: true,
    decisionClass: 'Mechanical · high volume',
    name: 'Proposal extraction',
    purpose: 'Typed fields out of proposal forms and claim bills, each field carrying the page it came from.',
    primaryModelId: 'm-haiku-45',
    fallbackModelId: 'm-sonnet-5',
    fallbackNote: 'Escalates on low extraction confidence, not on error.',
    effort: 'low',
    bindingIds: ['b-intel', 'b-docs'],
    budget: '8K tokens per document',
    gate: 'Fields below the confidence floor go to a human queue.',
  },
  {
    id: 'r-shadow',
    requires: ['Tools', 'Thinking'] as Capability[],
    fallbackAllowed: false,
    decisionClass: 'Measurement · not customer-facing',
    name: 'Shadow evaluator',
    purpose:
      'Runs the same frozen input the underwriter saw and records where it would have decided differently.',
    primaryModelId: 'm-opus-5',
    fallbackModelId: null,
    fallbackNote:
      'No fallback by design. A shadow run that silently switches model is measuring two things and reporting one.',
    effort: 'high',
    bindingIds: ['b-semantic', 'b-records'],
    budget: '120K tokens per run',
    gate: 'Never customer-facing. Output lands in the parity report only.',
  },
  {
    id: 'r-dedupe',
    requires: ['Tools'] as Capability[],
    onPremOnly: true,
    fallbackAllowed: false,
    decisionClass: 'Proposal · a human decides',
    name: 'Contact dedupe',
    purpose: 'Candidate duplicates across the contact base, with the rule that matched.',
    primaryModelId: 'm-llama',
    fallbackModelId: null,
    fallbackNote:
      'No fallback off the data centre. The records this reads may not leave, so a cloud fallback is not a degraded mode — it is a breach.',
    effort: 'low',
    bindingIds: ['b-intel', 'b-records'],
    budget: '4K tokens per candidate pair',
    gate: 'A steward merges. The agent only proposes.',
  },
]

export const ROLE_BY_ID: Record<string, Role> = Object.fromEntries(ROLES.map((r) => [r.id, r]))

/* ------------------------------------------------------------------ *
 * Preflight — what has to be true before a role can run
 * ------------------------------------------------------------------ */

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'pending'

export type Check = {
  id: string
  label: string
  /** Written for the failure case: what it means when this one does not pass. */
  detail: string
  status: Exclude<CheckStatus, 'pending'>
  result: string
}

/** Per role, because a check that passes everywhere tells you nothing. */
export const CHECKS: Record<string, Check[]> = {
  'r-referral': [
    { id: 'c1', label: 'Credential valid', detail: 'The tenant’s key still authenticates. Keys expire and nobody notices until a case is waiting.', status: 'pass', result: 'Anthropic · key accepted' },
    { id: 'c2', label: 'Model reachable', detail: 'The bound model answers a one-token probe at the bound id.', status: 'pass', result: 'claude-opus-5 · 380ms' },
    { id: 'c3', label: 'Tool handshake', detail: 'Every bound server lists its tools and the names match what the role expects.', status: 'warn', result: 'documents-mcp · index 3 days stale' },
    { id: 'c4', label: 'Metric resolves', detail: 'A named metric returns a governed definition — proof the semantic layer is answering, not the model.', status: 'pass', result: 'loss_ratio · owner: Actuarial' },
    { id: 'c5', label: 'Identity passthrough', detail: 'The call runs as the underwriter. If it runs as a service account, row-level security is not doing anything.', status: 'pass', result: 'OIDC · caller propagated' },
    { id: 'c6', label: 'Residency honoured', detail: 'Inference ran where the role says it must.', status: 'pass', result: 'US · permitted for this role' },
    { id: 'c7', label: 'Budget headroom', detail: 'The per-case ceiling is above what a real case costs.', status: 'pass', result: '120K ceiling · 71K observed p95' },
  ],
  'r-metric-qa': [
    { id: 'c1', label: 'Credential valid', detail: 'The tenant’s key still authenticates.', status: 'pass', result: 'Anthropic · key accepted' },
    { id: 'c2', label: 'Model reachable', detail: 'The bound model answers a one-token probe.', status: 'pass', result: 'claude-sonnet-5 · 210ms' },
    { id: 'c3', label: 'Tool handshake', detail: 'The semantic server lists both tools.', status: 'pass', result: 'list_metrics · query_metric' },
    { id: 'c4', label: 'Metric resolves', detail: 'A named metric returns a governed definition.', status: 'pass', result: 'combined_ratio · owner: Actuarial' },
    { id: 'c5', label: 'Identity passthrough', detail: 'The call runs as the caller, so masking applies.', status: 'pass', result: 'OIDC · caller propagated' },
    { id: 'c6', label: 'Residency honoured', detail: 'Inference ran where the role permits.', status: 'pass', result: 'US · permitted for this role' },
    { id: 'c7', label: 'Budget headroom', detail: 'The per-question ceiling is above observed spend.', status: 'pass', result: '30K ceiling · 9K observed p95' },
  ],
  'r-extraction': [
    { id: 'c1', label: 'Credential valid', detail: 'The tenant’s key still authenticates.', status: 'pass', result: 'Anthropic · key accepted' },
    { id: 'c2', label: 'Model reachable', detail: 'The bound model answers a one-token probe.', status: 'pass', result: 'claude-haiku-4-5 · 120ms' },
    { id: 'c3', label: 'Tool handshake', detail: 'Every bound server lists its tools.', status: 'warn', result: 'documents-mcp · index 3 days stale' },
    { id: 'c4', label: 'Metric resolves', detail: 'Not bound to the semantic layer, so nothing to resolve.', status: 'pass', result: 'not bound · skipped' },
    { id: 'c5', label: 'Identity passthrough', detail: 'The call runs as the caller.', status: 'pass', result: 'OIDC · caller propagated' },
    { id: 'c6', label: 'Residency honoured', detail: 'Inference ran where the role permits.', status: 'pass', result: 'US · permitted for this role' },
    { id: 'c7', label: 'Budget headroom', detail: 'The per-document ceiling is above observed spend.', status: 'pass', result: '8K ceiling · 5K observed p95' },
  ],
  'r-shadow': [
    { id: 'c1', label: 'Credential valid', detail: 'The tenant’s key still authenticates.', status: 'pass', result: 'Anthropic · key accepted' },
    { id: 'c2', label: 'Model reachable', detail: 'The bound model answers a one-token probe.', status: 'pass', result: 'claude-opus-5 · 400ms' },
    { id: 'c3', label: 'Tool handshake', detail: 'Every bound server lists its tools.', status: 'pass', result: '2 servers · 5 tools' },
    { id: 'c4', label: 'Metric resolves', detail: 'A named metric returns a governed definition.', status: 'pass', result: 'loss_ratio · owner: Actuarial' },
    { id: 'c5', label: 'Identity passthrough', detail: 'A shadow run must read exactly what the underwriter could read, or the comparison is not like-for-like.', status: 'pass', result: 'replays the recorded caller' },
    { id: 'c6', label: 'Model pinned', detail: 'A shadow run compares against a fixed model. An unpinned binding moves under the measurement.', status: 'fail', result: 'bound to a floating id, not a pinned version' },
    { id: 'c7', label: 'Budget headroom', detail: 'The per-run ceiling is above observed spend.', status: 'pass', result: '120K ceiling · 88K observed p95' },
  ],
  'r-dedupe': [
    { id: 'c1', label: 'Credential valid', detail: 'The client certificate is still in date.', status: 'pass', result: 'mTLS · 41 days to expiry' },
    { id: 'c2', label: 'Model reachable', detail: 'The served model answers a one-token probe.', status: 'pass', result: 'llama-3.3-70b-instruct · 640ms' },
    { id: 'c3', label: 'Tool handshake', detail: 'Every bound server lists its tools and the names match.', status: 'pass', result: '2 servers · 6 tools' },
    { id: 'c4', label: 'Metric resolves', detail: 'Not bound to the semantic layer, so nothing to resolve.', status: 'pass', result: 'not bound · skipped' },
    { id: 'c5', label: 'Identity passthrough', detail: 'The call runs as the steward.', status: 'pass', result: 'OIDC · caller propagated' },
    { id: 'c6', label: 'Residency honoured', detail: 'These records may not leave the data centre at all.', status: 'pass', result: 'Mumbai DC · no egress' },
    { id: 'c7', label: 'Tool-use reliability', detail: 'The on-prem model is weaker at tool calling — measured, not assumed.', status: 'warn', result: '91% well-formed calls · cloud roles run at 99%' },
  ],
}

export const CHECK_TONE: Record<CheckStatus, Tone> = {
  pass: 'success',
  warn: 'warning',
  fail: 'danger',
  pending: 'neutral',
}

/* ------------------------------------------------------------------ *
 * Adding a model
 * ------------------------------------------------------------------ */

/**
 * Under bring-your-own-key nobody *creates* a model here — the tenant's account
 * either serves an id or it does not. So adding one is a claim that gets
 * verified, not a form that gets saved: name the id, probe it with the tenant's
 * own credential, and let the probe fill in what it reports.
 *
 * Two sources, because discovery cannot see everything. A provider's list
 * endpoint enumerates first-party ids; it cannot enumerate an Azure *deployment*
 * (an arbitrary name the tenant chose), a pinned version, or whatever a
 * self-hosted server happens to be serving. Those have to be named by hand.
 */
export type AddSource = 'Discovered' | 'By hand'

/** Ids the provider's own list endpoint returned that are not in the catalogue
 *  yet — the harness does not invent these, it read them. */
export const UNIMPORTED: Record<ProviderKind, string[]> = {
  anthropic: ['claude-opus-4-8', 'claude-sonnet-4-6'],
  bedrock: ['anthropic.claude-opus-4-8'],
  azure: [],
  onprem: [],
  vertex: [],
}

/** What the probe cannot ask for and the tenant must state. Residency is the
 *  one that matters: no endpoint reliably reports where it ran. */
export const HAND_HINT: Record<ProviderKind, string> = {
  anthropic: 'A pinned or newly released id, e.g. claude-opus-4-8',
  bedrock: 'A Bedrock model id, e.g. anthropic.claude-opus-4-8',
  azure: 'A deployment name from the Azure resource, e.g. uw-vision',
  onprem: 'A model the vLLM server is serving, e.g. mistral-small-3',
  vertex: 'Connect the account first',
}

export type ProbeStep = { id: string; label: string; detail: string }

/** The probe, in the order it runs. Each one can fail on its own, which is why
 *  they are steps and not a single spinner. */
export const PROBE_STEPS: ProbeStep[] = [
  { id: 'p1', label: 'Credential accepted', detail: 'The tenant’s own credential authenticates against the provider.' },
  { id: 'p2', label: 'Id resolves', detail: 'The provider serves something at this exact id on this account.' },
  { id: 'p3', label: 'Capabilities reported', detail: 'Tool use, vision and streaming are read from the provider, not assumed.' },
  { id: 'p4', label: 'Limits reported', detail: 'Context window and output cap come back from the endpoint.' },
]

export type ProbeOk = {
  ok: true
  name: string
  context: string
  maxOutput: string
  caps: Capability[]
  rate: Rate
  latency: string
  note: string
  /** What the probe could not establish. Someone has to answer these before the
   *  model is bound to anything. */
  unknowns: string[]
}

export type ProbeFail = { ok: false; failedStep: string; reason: string }
export type ProbeResult = ProbeOk | ProbeFail

const PROBE_TABLE: Record<string, Record<string, ProbeOk>> = {
  anthropic: {
    'claude-opus-4-8': {
      ok: true,
      name: 'Claude Opus 4.8',
      context: '1M',
      maxOutput: '128K',
      caps: ['Tools', 'Vision', 'Thinking', 'Caching', 'Streaming', 'Batch'],
      rate: { kind: 'list', input: 5, output: 25 },
      latency: 'p50 4.4s',
      note: 'Added by probe. The previous generation in the Opus tier — useful as a pinned comparison for anything being measured.',
      unknowns: ['Which roles may use it', 'Whether its residency suits the on-prem roles'],
    },
    'claude-sonnet-4-6': {
      ok: true,
      name: 'Claude Sonnet 4.6',
      context: '1M',
      maxOutput: '128K',
      caps: ['Tools', 'Vision', 'Thinking', 'Caching', 'Streaming', 'Batch'],
      rate: { kind: 'list', input: 3, output: 15 },
      latency: 'p50 2.2s',
      note: 'Added by probe. Prior-generation Sonnet, priced above the current one — worth pinning only if something is measured against it.',
      unknowns: ['Which roles may use it', 'Whether anything still needs the older generation'],
    },
  },
  bedrock: {
    'anthropic.claude-opus-4-8': {
      ok: true,
      name: 'Claude Opus 4.8 (Bedrock)',
      context: '1M',
      maxOutput: '128K',
      caps: ['Tools', 'Vision', 'Thinking', 'Caching', 'Streaming'],
      rate: { kind: 'partner', note: 'AWS partner rate, billed on the tenant’s AWS account' },
      latency: 'p50 4.8s',
      note: 'Added by probe. In-region copy of the same model — same prompts, different bill and jurisdiction.',
      unknowns: ['Which roles may use it'],
    },
  },
  azure: {
    'uw-vision': {
      ok: true,
      name: 'uw-vision',
      context: '128K',
      maxOutput: '16K',
      caps: ['Tools', 'Vision', 'Streaming'],
      rate: { kind: 'partner', note: 'Enterprise agreement, billed on the tenant’s Azure subscription' },
      latency: 'p50 2.6s',
      note: 'Added by probe. A deployment name, so what it serves can change under the same name — the harness records what answered today.',
      unknowns: ['Which model the deployment actually serves', 'Who may repoint it', 'Which roles may use it'],
    },
  },
  onprem: {
    'mistral-small-3': {
      ok: true,
      name: 'mistral-small-3',
      context: '32K',
      maxOutput: '8K',
      caps: ['Tools', 'Streaming'],
      rate: { kind: 'owned', note: 'No per-token cost — the tenant owns the hardware' },
      latency: 'p50 2.9s',
      note: 'Added by probe. Limits are whatever the server reported at handshake, not a published figure.',
      unknowns: ['Measured tool-call reliability', 'Capacity if a second role binds it'],
    },
  },
}

/** Deterministic: the same id against the same account always probes the same
 *  way. A prototype that randomised this would be teaching the wrong lesson. */
export function probe(provider: Provider, rawId: string, alreadyAdded: string[] = []): ProbeResult {
  const id = rawId.trim()

  if (provider.status !== 'connected') {
    return {
      ok: false,
      failedStep: 'p1',
      reason: `${provider.name} is not connected. There is no credential to probe with — nothing is bundled, so there is nothing to fall back to.`,
    }
  }
  const inCatalogue = MODELS.filter((m) => m.providerId === provider.id)
    .map((m) => m.apiId.replace('deployment: ', ''))
    .concat(alreadyAdded)
  if (inCatalogue.includes(id)) {
    return {
      ok: false,
      failedStep: 'p2',
      reason: 'Already in the catalogue for this account. Enable the existing row rather than adding a second one — two rows for one id is how a role ends up bound to the copy nobody is watching.',
    }
  }
  const hit = PROBE_TABLE[provider.kind]?.[id]
  if (hit) return hit

  return {
    ok: false,
    failedStep: 'p2',
    reason: `The credential works, but ${provider.name} serves nothing at "${id}" on this account. Check the id, or whether the account has been granted access to it.`,
  }
}

/* ------------------------------------------------------------------ *
 * Connecting a provider
 * ------------------------------------------------------------------ */

/**
 * Connecting an account is not one form with a key field in it.
 *
 * The four auth shapes are genuinely different transactions — a secret the
 * tenant pastes, a role the harness assumes with no secret at all, an endpoint
 * whose models are named by the tenant rather than the vendor, and a private
 * endpoint reached with a client certificate. A single "API key" form would be
 * the easiest thing to build and would be wrong for three of the five.
 */
export type KindSpec = {
  kind: ProviderKind
  name: string
  operator: string
  authMode: AuthMode
  /** Where inference will run if this is connected. The question that decides
   *  which roles may ever use it. */
  residency: string
  blurb: string
  /** Blank templates. Every field is the tenant's to supply. */
  fields: CredentialField[]
  /** Whether a tenant can hold more than one of these. */
  multiple: boolean
  /** What the vault holds afterwards — or does not. */
  vault: string
}

export const PROVIDER_KINDS: KindSpec[] = [
  {
    kind: 'anthropic',
    name: 'Anthropic',
    operator: 'Anthropic, first-party API',
    authMode: 'API key',
    residency: 'US · EU',
    blurb:
      'A key from the tenant’s own Anthropic console. Simplest to connect and the only shape where a secret is pasted here at all.',
    fields: [
      { label: 'API key', value: '', secret: true, hint: 'sk-ant-… Written to the tenant vault, never read back' },
      { label: 'Workspace', value: '', hint: 'Optional — scopes usage and limits to one workspace' },
      { label: 'Base URL', value: '', hint: 'Leave blank unless routing through an approved gateway' },
    ],
    multiple: false,
    vault: 'tenant vault · the harness stores a reference',
  },
  {
    kind: 'bedrock',
    name: 'Amazon Bedrock',
    operator: 'AWS, partner-operated',
    authMode: 'Workload identity',
    residency: 'the chosen AWS region',
    blurb:
      'No secret at all: the harness assumes a role in the tenant’s AWS account at call time. The strongest shape on offer — there is nothing to leak and nothing to rotate.',
    fields: [
      { label: 'Role ARN', value: '', hint: 'arn:aws:iam::<account>:role/<role> — must trust the harness principal' },
      { label: 'Region', value: '', hint: 'Where inference runs, e.g. ap-south-1' },
      { label: 'External ID', value: '', secret: true, hint: 'Required in the role’s trust policy' },
    ],
    multiple: true,
    vault: 'nothing stored — the role is assumed per call',
  },
  {
    kind: 'azure',
    name: 'Azure OpenAI',
    operator: 'Microsoft, tenant subscription',
    authMode: 'Endpoint + key',
    residency: 'the resource’s region',
    blurb:
      'Models arrive as deployment names the tenant chose, not vendor ids. Discovery can list the deployments; what any one of them serves can change under the same name, which the catalogue has to record rather than assume.',
    fields: [
      { label: 'Endpoint', value: '', hint: 'https://<resource>.openai.azure.com' },
      { label: 'API key', value: '', secret: true, hint: 'Written to the tenant vault, never read back' },
      { label: 'API version', value: '', hint: 'e.g. 2026-02-01' },
    ],
    multiple: true,
    vault: 'tenant vault · the harness stores a reference',
  },
  {
    kind: 'vertex',
    name: 'Google Vertex AI',
    operator: 'Google Cloud, partner-operated',
    authMode: 'Workload identity',
    residency: 'the chosen GCP region',
    blurb:
      'Federated to a service account in the tenant’s project — again no secret to hold. Claude on Vertex uses the bare model id and is priced by Google, not by Anthropic.',
    fields: [
      { label: 'Project ID', value: '', hint: 'The GCP project billed for inference' },
      { label: 'Region', value: '', hint: 'global is recommended; or a region for residency' },
      { label: 'Service account', value: '', hint: 'Must hold roles/aiplatform.user' },
    ],
    multiple: false,
    vault: 'nothing stored — federated identity, exchanged per call',
  },
  {
    kind: 'onprem',
    name: 'Self-hosted (OpenAI-compatible)',
    operator: 'The tenant’s own hardware',
    authMode: 'Private endpoint',
    residency: 'wherever the tenant runs it',
    blurb:
      'vLLM, TGI or anything speaking the same dialect. The only shape that can serve work which may not leave the data centre — and the only one where limits come from the server rather than a published figure.',
    fields: [
      { label: 'Base URL', value: '', hint: 'https://…/v1 — reachable from the harness network' },
      { label: 'Client certificate', value: '', secret: true, hint: 'mTLS. Written to the tenant vault' },
      { label: 'Label', value: '', hint: 'Names this endpoint in the rail, e.g. Mumbai DC' },
    ],
    multiple: true,
    vault: 'tenant vault · the harness stores a reference',
  },
]

export const KIND_BY_ID: Record<ProviderKind, KindSpec> = Object.fromEntries(
  PROVIDER_KINDS.map((k) => [k.kind, k]),
) as Record<ProviderKind, KindSpec>

/** The handshake, in order. Same reasoning as the model probe: each step fails
 *  differently, and "could not connect" is not a diagnosis. */
export const CONNECT_STEPS: ProbeStep[] = [
  { id: 'h1', label: 'Reachable', detail: 'The endpoint answers from the harness network at all.' },
  { id: 'h2', label: 'Credential accepted', detail: 'What the tenant supplied authenticates as who they say.' },
  { id: 'h3', label: 'Permission to invoke', detail: 'The identity may actually call a model, not merely read the account.' },
  { id: 'h4', label: 'Models discovered', detail: 'The account lists what it serves — the catalogue is read, never typed.' },
]

/** What discovery returns per kind. These are candidates for import, not models
 *  granted by this product. */
export const DISCOVERED: Record<ProviderKind, Omit<Model, 'id' | 'providerId' | 'enabled'>[]> = {
  anthropic: [],
  bedrock: [],
  azure: [],
  vertex: [
    {
      name: 'Claude Opus 5 (Vertex)',
      apiId: 'claude-opus-5',
      context: '1M',
      maxOutput: '128K',
      rate: { kind: 'partner', note: 'Google Cloud partner rate, billed on the tenant’s GCP project' },
      latency: 'p50 4.5s',
      caps: ['Tools', 'Vision', 'Thinking', 'Caching', 'Streaming'],
      note: 'Discovered on connect. Vertex uses the bare model id, and prices it on Google’s own rate card.',
    },
    {
      name: 'Claude Sonnet 5 (Vertex)',
      apiId: 'claude-sonnet-5',
      context: '1M',
      maxOutput: '128K',
      rate: { kind: 'partner', note: 'Google Cloud partner rate, billed on the tenant’s GCP project' },
      latency: 'p50 2.2s',
      caps: ['Tools', 'Vision', 'Thinking', 'Caching', 'Streaming'],
      note: 'Discovered on connect. A third jurisdiction for the same model — useful only if something requires it.',
    },
  ],
  onprem: [
    {
      name: 'mistral-small-3',
      apiId: 'mistral-small-3',
      context: '32K',
      maxOutput: '8K',
      rate: { kind: 'owned', note: 'No per-token cost — the tenant owns the hardware' },
      latency: 'p50 2.9s',
      caps: ['Tools', 'Streaming'],
      note: 'Discovered on connect. Limits are what the server reported, not a published figure.',
    },
  ],
}

export type ConnectResult =
  | { ok: true; residency: string; discovered: Omit<Model, 'id' | 'providerId' | 'enabled'>[]; warning?: string }
  | { ok: false; failedStep: string; reason: string }

/**
 * Deterministic, like the model probe. The interesting outcome is the failure:
 * the most common way a connection "works" and is still wrong is an identity
 * that can read the account but not invoke a model, which is why that is its
 * own step rather than folded into the credential check.
 */
export function connect(spec: KindSpec, values: Record<string, string>): ConnectResult {
  const missing = spec.fields.filter((f) => !f.hint?.startsWith('Optional') && !f.hint?.startsWith('Leave blank'))
    .filter((f) => !values[f.label]?.trim())

  if (missing.length > 0) {
    return {
      ok: false,
      failedStep: 'h1',
      reason: `${missing.map((f) => f.label).join(', ')} ${missing.length > 1 ? 'are' : 'is'} required before anything can be reached.`,
    }
  }

  const discovered = DISCOVERED[spec.kind]
  if (discovered.length === 0) {
    return {
      ok: false,
      failedStep: 'h4',
      reason:
        'The credential authenticates and may invoke, but the account lists no models this harness can use. Grant the identity access to at least one model and handshake again.',
    }
  }

  return {
    ok: true,
    residency: values['Region'] || values['Label'] || spec.residency,
    discovered,
    warning:
      spec.kind === 'azure'
        ? 'Deployment names can be repointed to a different model without the name changing. What answered today is recorded; preflight re-checks it.'
        : undefined,
  }
}

/* ------------------------------------------------------------------ *
 * Assigning a model to a role
 * ------------------------------------------------------------------ */

/** What a role is bound to right now. Held as state, because the whole point
 *  of a role is that its model can change without the workflow changing. */
export type Assignment = { primaryModelId: string; fallbackModelId: string | null }

export const DEFAULT_ASSIGNMENTS: Record<string, Assignment> = Object.fromEntries(
  ROLES.map((r) => [r.id, { primaryModelId: r.primaryModelId, fallbackModelId: r.fallbackModelId }]),
)

export type Eligibility = { ok: true } | { ok: false; reason: string }

/**
 * Whether a model may carry a role.
 *
 * Deliberately not a warning someone can click past. A harness that lets you
 * bind an unusable model and finds out at the first real case has moved the
 * failure from a settings screen to an underwriter's desk — every reason below
 * is one the catalogue already knows before anything runs.
 */
export function eligibility(
  role: Role,
  model: Model,
  provider: Provider | undefined,
  enabled: boolean,
): Eligibility {
  if (!enabled) {
    return {
      ok: false,
      reason: 'Switched off in the catalogue. Enable it on the Providers step before binding it.',
    }
  }
  if (provider?.status !== 'connected') {
    return { ok: false, reason: 'Its account is not connected, so there is no credential to call it with.' }
  }
  const missing = role.requires.filter((c) => !model.caps.includes(c))
  if (missing.length > 0) {
    return {
      ok: false,
      reason: `Does not report ${missing.join(' and ').toLowerCase()}. This role needs it — ${
        missing.includes('Vision')
          ? 'the documents it reads are scans'
          : missing.includes('Thinking')
            ? 'the decision has to be reasoned, not pattern-matched'
            : 'every call it makes is a tool call'
      }.`,
    }
  }
  if (role.onPremOnly && provider.kind !== 'onprem') {
    return {
      ok: false,
      reason: 'The records this role reads may not leave the data centre. A cloud model here is not a degraded mode, it is a breach.',
    }
  }
  return { ok: true }
}
