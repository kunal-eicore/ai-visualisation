/**
 * Seed data for the UW Agent screen — a straight port of the rate-table
 * state in `../../ai-research/UW_flow_AI_with_sim.html`.
 *
 * Domain: the group health renewal for K D Supply Chain Solutions, 5,432
 * lives, running at a 113% loss ratio. Every number below (member counts,
 * rates, group premiums, the canned agent scripts) is carried over from the
 * prototype verbatim — this screen exists to reproduce that interaction, so
 * the figures are not re-derived.
 *
 * Fixtures only. The prototype's live Anthropic call is replaced by the
 * scripted flows in `PILL_SCRIPTS` plus the regex router in `parseActions`,
 * because what is being explored is the chat driving the table, not the model.
 */

/** Age bands, in the prototype's order. */
export const AGE_BANDS = [
  '0–18', '19–35', '36–45', '46–55', '56–65', '66–70', '71–75', '76–80', 'Above 80',
] as const
export type AgeBand = (typeof AGE_BANDS)[number]

/** Members per band, per group (`MD`). Index matches `GROUPS`. */
export const MEMBERS: Record<AgeBand, [number, number, number]> = {
  '0–18':     [270, 402, 236],
  '19–35':    [522, 670, 431],
  '36–45':    [594, 622, 432],
  '46–55':    [234, 324, 206],
  '56–65':    [126, 130,  92],
  '66–70':    [ 36,  34,  24],
  '71–75':    [ 18,  18,  11],
  '76–80':    [  0,   0,   0],
  'Above 80': [  0,   0,   0],
}

/** Current rate per band, per group (`RD`). Zero renders as an em dash. */
export const RATES: Record<AgeBand, [number, number, number]> = {
  '0–18':     [ 640,  510,  380],
  '19–35':    [1200,  950,  700],
  '36–45':    [1740, 1380, 1010],
  '46–55':    [2620, 2070, 1520],
  '56–65':    [4100, 3250, 2390],
  '66–70':    [6400, 5080, 3740],
  '71–75':    [8000, 6340, 4670],
  '76–80':    [   0,    0,    0],
  'Above 80': [   0,    0,    0],
}

export type Group = {
  name: string
  label: string
  si: string
  /** Rate basis — per member or per family. */
  basis: string
  lives: number
  /** Current average rate. */
  rate: number
}

/** The three groups (`S.grps` merged with `GD`). */
export const GROUPS: Group[] = [
  { name: 'Group A+', label: 'Senior Leadership',  si: '₹10,00,000', basis: 'Per Member', lives: 1800, rate: 2672 },
  { name: 'Group A',  label: 'Senior Management',  si: '₹5,00,000',  basis: 'Per Family', lives: 2200, rate: 1668 },
  { name: 'Group B',  label: 'Middle Management',  si: '₹3,00,000',  basis: 'Per Family', lives: 1432, rate: 1434 },
]

export const TOTAL_LIVES = 5432

/* ── Formatting, matching the prototype's helpers ────────────────────── */

export const fmtCr = (v: number) => `₹${(v / 10_000_000).toFixed(2)} Cr`
export const fmtL = (v: number) => `₹${(v / 100_000).toFixed(2)}L`
export const fmtRs = (v: number) => `₹${v.toLocaleString('en-IN')}`

/** Group premium totals at a given multiplier. */
export function pricingImpact(mult: number) {
  const rows = GROUPS.map((g) => {
    const proposedRate = Math.round(g.rate * mult)
    const current = g.lives * g.rate
    const proposed = g.lives * proposedRate
    return {
      ...g,
      proposedRate,
      current,
      proposed,
      change: g.rate > 0 ? Math.round(((proposedRate - g.rate) / g.rate) * 1000) / 10 : 0,
    }
  })
  const totalCurrent = rows.reduce((s, r) => s + r.current, 0)
  const totalProposed = rows.reduce((s, r) => s + r.proposed, 0)
  return {
    rows: rows.map((r) => ({ ...r, contribution: totalProposed > 0 ? Math.round((r.proposed / totalProposed) * 100) : 0 })),
    totalCurrent,
    totalProposed,
    totalChange: totalCurrent > 0 ? Math.round(((totalProposed - totalCurrent) / totalCurrent) * 1000) / 10 : 0,
  }
}

/* ── Actions the chat can fire ───────────────────────────────────────── */

export type Action =
  | { type: 'loading'; val: number }
  | { type: 'discount'; val: number }
  | { type: 'reduce'; val: number }
  | { type: 'breakup' }

/* ── Canned agentic flows for the quick-action pills (`PILL_SCRIPTS`) ─── */

/* ── Provenance: what the agent read ────────────────────────── */

/**
 * Every figure the agent quotes comes from somewhere: an uploaded document,
 * the underwriting rulebook, or a live table on the case. A copilot that
 * moves premium has to be able to show *which* — an underwriter signing off
 * on a loading needs to confirm it read the right claims dump, not merely
 * that it produced a confident sentence.
 *
 * The documents are the ones on the prototype's Documents tab
 * (`rDoc()` in `UW_flow_AI_with_sim.html`); the rulebook and rate-matrix
 * entries are the non-document inputs the pricing calls need.
 */
export type SourceId =
  | 'claims-mis' | 'prior-premium' | 'census' | 'prior-policy'
  | 'uw-guide' | 'rate-matrix' | 'hv-claims' | 'tpa-report'

export type Source = {
  id: SourceId
  /** Full name, as it appears in the case file. */
  name: string
  /** Short label for a chip in the transcript. */
  short: string
  format: 'PDF' | 'XLSX' | 'Rulebook' | 'Live table'
  category: 'Claims' | 'Premium' | 'Data' | 'Policy' | 'Underwriting' | 'Rates'
  /** Where inside the source the agent looked. */
  location: string
  /** Received date, or the revision for a rulebook. */
  dated: string
  /** The values actually pulled out — the point of the whole disclosure. */
  extract: { label: string; value: string }[]
  note?: string
}

export const SOURCES: Record<SourceId, Source> = {
  'claims-mis': {
    id: 'claims-mis',
    name: 'Claims MIS Report',
    short: 'Claims MIS',
    format: 'XLSX',
    category: 'Claims',
    location: "Sheet 'FY24-25 Paid' · 4,812 rows",
    dated: 'Received 3 May 2025',
    extract: [
      { label: 'Claims paid (policy period)', value: '₹1.19 Cr' },
      { label: 'Maternity', value: '₹40.4 L · 34% of burn' },
      { label: 'High value (above ₹5 L)', value: '2 claims · ₹26.2 L' },
      { label: 'Day care', value: '₹21.4 L · 18%' },
      { label: 'All other', value: '₹30.9 L · 26%' },
    ],
    note: 'Two rows with a nil paid amount were excluded as closed-without-payment.',
  },
  'prior-premium': {
    id: 'prior-premium',
    name: 'Premium Breakup (Prior)',
    short: 'Prior Premium',
    format: 'PDF',
    category: 'Premium',
    location: 'Page 2 · Premium summary',
    dated: 'Received 2 May 2025',
    extract: [
      { label: 'Gross written premium', value: '₹1.05 Cr' },
      { label: 'Base premium', value: '₹1.05 Cr' },
      { label: 'TPA charges', value: '3.5%' },
      { label: 'Commission', value: '7.5%' },
      { label: 'Margin', value: '5%' },
    ],
  },
  census: {
    id: 'census',
    name: 'Member Data (Census)',
    short: 'Census',
    format: 'XLSX',
    category: 'Data',
    location: "Sheet 'Members' · 5,432 rows",
    dated: 'Received 2 May 2025',
    extract: [
      { label: 'Total lives', value: '5,432' },
      { label: 'Group A+ · Senior Leadership', value: '1,800 lives' },
      { label: 'Group A · Senior Management', value: '2,200 lives' },
      { label: 'Group B · Middle Management', value: '1,432 lives' },
      { label: 'Bands 76–80 and above 80', value: 'Nil lives — unpriced' },
    ],
  },
  'prior-policy': {
    id: 'prior-policy',
    name: 'Previous Policy Copy',
    short: 'Prior Policy',
    format: 'PDF',
    category: 'Policy',
    location: 'Clause 4.2 · Schedule B',
    dated: 'Received 2 May 2025',
    extract: [
      { label: 'Maternity limit', value: '₹50,000 · no sub-limit' },
      { label: 'Room rent', value: '1% of SI per day' },
      { label: 'Co-pay', value: 'Nil on all groups' },
      { label: 'Waiting periods', value: 'Waived' },
    ],
    note: 'Maternity carries no sub-limit on the expiring policy, which is what leaves the +34% trend unchecked.',
  },
  'uw-guide': {
    id: 'uw-guide',
    name: 'Group Health UW Guidelines',
    short: 'UW Guide 6.3',
    format: 'Rulebook',
    category: 'Underwriting',
    location: 'Section 6.3 · Renewal loading grid',
    dated: 'Revision 11 · effective 1 Apr 2025',
    extract: [
      { label: 'LR 100–110%', value: 'Loading 5–8%' },
      { label: 'LR 110–125%', value: 'Loading 8–15%' },
      { label: 'LR above 125%', value: 'Refer to Head UW' },
      { label: 'Discretionary cap without referral', value: '15%' },
      { label: 'Rate reduction at LR above 100%', value: 'Requires written justification' },
    ],
    note: 'At 113% LR this case sits in the 8–15% band, so an 8% loading is the floor of the permitted range.',
  },
  'rate-matrix': {
    id: 'rate-matrix',
    name: 'Age Band Rate Matrix FY25',
    short: 'Rate Matrix',
    format: 'Live table',
    category: 'Rates',
    location: '9 bands × 3 groups · the table on this screen',
    dated: 'Product rate card v4',
    extract: [
      { label: 'Current multiplier', value: '1.00 · calculated mode' },
      { label: 'Group A+ average rate', value: '₹2,672' },
      { label: 'Group A average rate', value: '₹1,668' },
      { label: 'Group B average rate', value: '₹1,434' },
      { label: 'Bands priced', value: '7 of 9' },
    ],
  },
  'hv-claims': {
    id: 'hv-claims',
    name: 'High Value Claims Summary',
    short: 'High Value',
    format: 'PDF',
    category: 'Claims',
    location: 'Page 1 · Top 10 claims',
    dated: 'Received 3 May 2025',
    extract: [
      { label: 'Claim 1', value: '₹14.8 L · cardiac · Group A+' },
      { label: 'Claim 2', value: '₹11.4 L · oncology · Group A+' },
      { label: 'Claims 3–10', value: 'All below ₹5 L' },
      { label: 'Concentration', value: '22% of burn on 2 lives' },
    ],
  },
  'tpa-report': {
    id: 'tpa-report',
    name: 'TPA Performance Report',
    short: 'TPA Report',
    format: 'PDF',
    category: 'Claims',
    location: 'Page 4 · Turnaround and leakage',
    dated: 'Received 5 May 2025',
    extract: [
      { label: 'Cashless TAT', value: '4.2 hours · within SLA' },
      { label: 'Estimated leakage', value: '1.8% of paid claims' },
      { label: 'Day care authorisations', value: 'In line with expected' },
    ],
  },
}

/** Every source on the case, in the order the index lists them. */
export const ALL_SOURCE_IDS = Object.keys(SOURCES) as SourceId[]

/** Which sources each function reads. A call always names its inputs. */
export const SOURCES_FOR: Record<FunctionName, SourceId[]> = {
  get_position: ['claims-mis', 'prior-premium', 'census'],
  model_rate_change: ['rate-matrix', 'uw-guide', 'prior-premium'],
  decompose_loss_ratio: ['claims-mis', 'hv-claims', 'prior-policy'],
  get_premium_breakup: ['prior-premium', 'rate-matrix'],
  apply_rate_change: ['uw-guide', 'rate-matrix'],
}

/**
 * A turn is a sequence of beats, not a block of prose. The agent narrates,
 * calls a function, narrates what came back — and the throbber changes state
 * at each boundary, so the wait always says which kind of wait it is.
 */
export type Beat =
  | { kind: 'step'; text: string }
  | {
      kind: 'call'
      name: FunctionName
      args: Record<string, string | number>
      result: string
      /** Ids into `SOURCES` — what this call actually read. */
      sources: SourceId[]
    }

export type FunctionName =
  | 'get_position'
  | 'model_rate_change'
  | 'decompose_loss_ratio'
  | 'get_premium_breakup'
  | 'apply_rate_change'

export type PillScript = {
  prompt: string
  beats: Beat[]
  /** `<em>` spans are the only markup; see `Emphasised` in ChatPanel. */
  answer: string
  acts: Action[]
  /** Set when the flow reprices the table — drives the skeleton. */
  rateMult?: number
  /** Set when the flow opens the premium build-up. */
  fire?: 'breakup'
}

const step = (text: string): Beat => ({ kind: 'step', text })
const call = (
  name: FunctionName,
  args: Record<string, string | number>,
  result: string,
  sources: SourceId[] = SOURCES_FOR[name],
): Beat => ({ kind: 'call', name, args, result, sources })

export const PILL_SCRIPTS: PillScript[] = [
  {
    prompt: 'Apply 8% loading',
    beats: [
      call('get_position', {}, '5,432 lives · ₹1.05 Cr premium · ₹1.19 Cr claims · LR 113%'),
      step('Reading current position — 5,432 lives, LR at 113% (₹1.19 Cr claims vs ₹1.05 Cr premium).'),
      call('model_rate_change', { kind: 'loading', pct: 8 }, '₹1.13 Cr (+₹8.4 L) · projected LR ~105%'),
      step('Modelling an 8% loading: premium rises ₹8.4 L to ₹1.13 Cr, pulling projected LR to ~105%.'),
      call('decompose_loss_ratio', {}, 'Maternity +34% · 2 high-value A+ claims · day-care in line'),
      step('Cross-checking drivers — maternity is running +34% over expected and 2 high-value A+ claims dominate the burn.'),
      step("8% is defensible against the trend but won't fully reach a 95% target LR. Preparing the apply action."),
    ],
    answer:
      'Applying an <em>8% loading</em> lifts premium from ₹1.05 Cr to <em>₹1.13 Cr</em> (+₹8.4 L), bringing projected LR from 113% down to <em>~105%</em>. It is defensible given the +34% maternity trend, though ~13% would be needed to hit a 95% target LR.',
    acts: [{ type: 'loading', val: 8 }],
    rateMult: 1.08,
  },
  {
    prompt: 'Reduce premium 5%',
    beats: [
      call('get_position', {}, '₹1.05 Cr premium · ₹1.19 Cr claims · LR 113%'),
      step('Pulling current position — LR already at 113%, so the book is loss-making before any change.'),
      call('model_rate_change', { kind: 'discount', pct: 5 }, '₹0.997 Cr (-₹5.25 L) · projected LR ~119%'),
      step('Modelling a 5% reduction: premium drops ₹5.25 L to ₹0.997 Cr, pushing projected LR up to ~119%.'),
      step('Flagging risk — this widens the gap against the +34% maternity trend and the 2 A+ claims.'),
      step('Recommending against an unconditional cut; staging the action so you can override if commercially required.'),
    ],
    answer:
      'A <em>5% premium reduction</em> takes premium from ₹1.05 Cr to <em>₹0.997 Cr</em> (-₹5.25 L) and pushes projected LR from 113% to <em>~119%</em>. At a loss-making LR this is not advisable — consider pairing it with a co-pay or sub-limits to offset.',
    acts: [{ type: 'reduce', val: 5 }],
    rateMult: 0.95,
  },
  {
    prompt: 'Show breakup',
    beats: [
      step('Gathering premium components across all groups for K D Supply Chain.'),
      call('get_premium_breakup', {}, 'Base ₹1.05 Cr · 5 adjustments · 6 covers allocated'),
      step('Aggregating base premium, add-on covers, loadings and any applied discounts.'),
      step('Reconciling the build-up against the ₹1.05 Cr gross premium figure.'),
      step('Rendering the full breakup view.'),
    ],
    answer:
      'Here is the full premium build-up reconciling to <em>₹1.05 Cr</em> gross. The breakup is open above the rate table with base, loadings and adjustments itemised.',
    acts: [{ type: 'breakup' }],
    fire: 'breakup',
  },
  {
    prompt: "What's the LR?",
    beats: [
      call('get_position', {}, 'Claims ₹1.19 Cr · earned premium ₹1.05 Cr'),
      step('Fetching claims and premium totals for the policy period.'),
      step('Claims paid ₹1.19 Cr against ₹1.05 Cr earned premium.'),
      call('decompose_loss_ratio', {}, 'Maternity 34% · A+ claims 22% · day-care 18% · other 26%'),
      step('Computing loss ratio = claims over premium = 113%.'),
      step('Decomposing the drivers behind the figure.'),
    ],
    answer:
      'Current <em>loss ratio is 113%</em> — ₹1.19 Cr in claims against ₹1.05 Cr premium, so the book is running ~13 points in the red. Main drivers: maternity <em>+34%</em> over expected and <em>2 high-value A+</em> claims.',
    acts: [],
  },
]

/** Every distinct source a turn touched, in the order it was first read. */
export const sourcesOf = (beats: Beat[]): SourceId[] => {
  const seen: SourceId[] = []
  for (const b of beats) {
    if (b.kind !== 'call') continue
    for (const id of b.sources) if (!seen.includes(id)) seen.push(id)
  }
  return seen
}

/** The reasoning trace only, for the collapsed "thought process" disclosure. */
export const stepsOf = (beats: Beat[]) =>
  beats.filter((b): b is Extract<Beat, { kind: 'step' }> => b.kind === 'step').map((b) => b.text)

/** The opening message the prototype seeds the transcript with (`S.msgs`). */
export const OPENING_MESSAGE =
  'AI UW Agent for K D Supply Chain. LR 113%, maternity +34%, 2 high value A+. Ask me anything.'

/**
 * The prototype's `parseActions` — a regex intent parser over the typed
 * message. Kept as-is: it is what decides which action buttons an answer
 * carries, and a regex keeps every run reproducible.
 */
export function parseActions(text: string): Action[] {
  const t = text.toLowerCase()
  const actions: Action[] = []

  const lm = t.match(/loading[s]?\s*(?:of|to|at|=|:)?\s*(\d+(?:\.\d+)?)\s*%/)
  if (lm) actions.push({ type: 'loading', val: parseFloat(lm[1]) })

  const dm = t.match(/discount[s]?\s*(?:of|to|at|=|:)?\s*(\d+(?:\.\d+)?)\s*%/)
  if (dm) actions.push({ type: 'discount', val: parseFloat(dm[1]) })

  const rm = t.match(/reduce\s*(?:overall\s*)?premium\s*(?:by\s*)?(\d+(?:\.\d+)?)\s*%/)
  if (rm) actions.push({ type: 'reduce', val: parseFloat(rm[1]) })

  if (/show breakup|premium breakup|full breakup/.test(t)) actions.push({ type: 'breakup' })

  return actions
}

/**
 * Stands in for the prototype's API call. It answers from the parsed actions
 * so a typed message still moves the table, and says so plainly when it
 * cannot price the request rather than inventing a number.
 */
export function scriptedReply(actions: Action[]): string {
  const rate = actions.find((a) => a.type === 'loading' || a.type === 'discount' || a.type === 'reduce')
  if (rate && 'val' in rate) {
    const mult = multiplierFor(rate)
    const { totalCurrent, totalProposed } = pricingImpact(mult)
    const delta = totalProposed - totalCurrent
    const lr = (11_900_000 / totalProposed) * 100
    const verb = rate.type === 'loading' ? 'loading' : rate.type === 'discount' ? 'discount' : 'reduction'
    return `A <em>${rate.val}% ${verb}</em> moves premium from ${fmtCr(totalCurrent)} to <em>${fmtCr(totalProposed)}</em> (${delta >= 0 ? '+' : ''}${fmtL(delta)}) and projected LR to <em>~${Math.round(lr)}%</em>. Rates are repriced across every band — apply below to commit.`
  }
  if (actions.some((a) => a.type === 'breakup')) {
    return 'Opened the premium build-up above the rate table, reconciling to <em>₹1.05 Cr</em> gross.'
  }
  return 'This prototype runs on scripted intents, so it prices what it recognises: a loading, a discount, a premium reduction, or the breakup. Current position is <em>₹1.05 Cr</em> premium at a <em>113%</em> loss ratio.'
}

/** The multiplier an action applies to every rate in the table. */
export function multiplierFor(action: Action): number {
  if (action.type === 'loading') return 1 + action.val / 100
  if (action.type === 'discount' || action.type === 'reduce') return 1 - action.val / 100
  return 1
}

/* ── Premium build-up, opened by the breakup action ──────────────────── */

const BASE = 10_530_000

export const BREAKUP = {
  base: BASE,
  rows: [
    { label: 'Claims loading', note: '3%', amount: Math.round(BASE * 0.03) },
    { label: 'Discount', note: '0%', amount: 0 },
    { label: 'TPA charges', note: '3.5%', amount: Math.round(BASE * 1.03 * 0.035) },
    { label: 'Commission', note: '7.5%', amount: Math.round(BASE * 1.03 * 0.075) },
    { label: 'Margin', note: '5%', amount: Math.round(BASE * 1.03 * 0.05) },
  ],
  /** Cover-wise allocation of the base premium. */
  covers: [
    { label: 'Inpatient Care',     share: '42%', amount: Math.round(BASE * 0.42) },
    { label: 'Room Rent Capping',  share: '18%', amount: Math.round(BASE * 0.18) },
    { label: 'Maternity Cover',    share: '12%', amount: Math.round(BASE * 0.12) },
    { label: 'Cancer Care',        share: '8%',  amount: Math.round(BASE * 0.08) },
    { label: 'OPD Cover',          share: '5%',  amount: Math.round(BASE * 0.05) },
    { label: 'Day Care Treatment', share: '4%',  amount: Math.round(BASE * 0.04) },
  ],
}
