import type { Tone as BadgeTone } from '@/components/ui/Badge'

/**
 * Seed data for the shadow-parity surface.
 *
 * Domain: motor **underwriting referrals**. A shadow agent runs the same
 * referral the underwriter is working, with side effects suppressed, and its
 * decision is recorded against what the human actually did. Fixtures only —
 * this screen is read-only and has no service layer.
 *
 * Source: ai-research/gap-data-shadow-regulatory.md §B.
 */

/** How the shadow decision diverged from the human one. */
export type Drift = 'match' | 'stricter' | 'looser'

/** The four terminal outcomes of a motor UW referral. */
export type Decision = 'Accept' | 'Accept w/ loading' | 'Refer to senior' | 'Decline'

/** Difficulty tier — parity is only meaningful stratified by this. */
export type Tier = 'Routine' | 'Complex' | 'Edge'

export type Run = {
  id: string
  /** Descending run number, newest first. */
  no: number
  caseRef: string
  subject: string
  tier: Tier
  human: Decision
  ai: Decision
  drift: Drift
  /** The single biggest gap, pre-formatted for the table. */
  delta: string
}

/** Newest first. */
export const RUNS: Run[] = [
  { id:'r-112', no:112, caseRef:'UWR-24118', subject:'Goods carrier, 7.5T — 3 OD claims in 24 months',
    tier:'Complex', human:'Decline', ai:'Accept w/ loading', drift:'looser', delta:'+45% loading vs decline' },
  { id:'r-111', no:111, caseRef:'UWR-24117', subject:'Private car, IDV ₹18.4L — declared value above grid',
    tier:'Routine', human:'Accept w/ loading', ai:'Accept w/ loading', drift:'match', delta:'IDV ₹45,000 apart' },
  { id:'r-110', no:110, caseRef:'UWR-24115', subject:'Two-wheeler fleet, 42 units — first-time corporate',
    tier:'Complex', human:'Accept', ai:'Refer to senior', drift:'stricter', delta:'referred on fleet size' },
  { id:'r-109', no:109, caseRef:'UWR-24112', subject:'Taxi permit, commercial — NCB continuity unverified',
    tier:'Edge', human:'Accept w/ loading', ai:'Decline', drift:'stricter', delta:'declined on NCB gap' },
  { id:'r-108', no:108, caseRef:'UWR-24109', subject:'Private car, imported — parts availability flag',
    tier:'Edge', human:'Refer to senior', ai:'Accept w/ loading', drift:'looser', delta:'no referral raised' },
  { id:'r-107', no:107, caseRef:'UWR-24104', subject:'Private car, renewal — zero-dep add-on in year 6',
    tier:'Routine', human:'Accept', ai:'Accept', drift:'match', delta:'identical terms' },
  { id:'r-106', no:106, caseRef:'UWR-24101', subject:'School bus, 32-seater — PA cover to passengers',
    tier:'Complex', human:'Accept w/ loading', ai:'Accept', drift:'looser', delta:'0% vs 20% loading' },
  { id:'r-105', no:105, caseRef:'UWR-24098', subject:'Private car — RC name mismatch with proposer',
    tier:'Routine', human:'Refer to senior', ai:'Refer to senior', drift:'match', delta:'same referral reason' },
]

/**
 * Accuracy per run, scored against the post-hoc checker outcome. Human sits
 * flat and high; the shadow agent climbs but has not converged — the gap
 * between the two lines *is* the drift this screen exists to show.
 */
export type AccuracyPoint = { run: number; human: number; ai: number }

export const ACCURACY: AccuracyPoint[] = [
  { run:105, human:81, ai:44 }, { run:106, human:80, ai:41 },
  { run:107, human:82, ai:39 }, { run:108, human:80, ai:47 },
  { run:109, human:81, ai:48 }, { run:110, human:83, ai:54 },
  { run:111, human:82, ai:63 }, { run:112, human:82, ai:67 },
]

/** Corpus-level headline numbers, shown above the chart. */
export type Stat = {
  label: string
  value: string
  tone: BadgeTone
  note: string
  /** How the number is arrived at, and what it does not cover. Shown in the
   *  metric's "i" — a headline figure nobody can define is a figure nobody
   *  should be promoting a model on. */
  info: string
  trend?: { dir: 'up' | 'down'; label: string; tone: BadgeTone }
}

export const STATS: Stat[] = [
  { label:'Agreement rate', value:'62.5%', tone:'brand', note:'5 of 8 runs matched',
    info:'Runs where the shadow agent matched the underwriter on every gating field — decision, loading and referral target. An exact match on what changes the outcome, not a similarity score; free-text wording is ignored. 5 of 8 runs here. The trend compares against the previous eight.',
    trend:{ dir:'up', label:'+12 pts', tone:'success' } },
  { label:'Of disagreements, AI right', value:'1 of 3', tone:'warning',
    note:'checker-confirmed',
    info:'Of the 3 runs where the two disagreed, how many the checker later ruled the agent had right. This is what makes the agreement rate readable: disagreement only counts against the agent when the human was the one who was correct.' },
  { label:'Calibration error', value:'0.19', tone:'danger', note:'over-confident on Edge tier',
    info:'Mean absolute gap between the confidence the agent states and how often it is actually right, bucketed by confidence. 0 is perfect; 0.19 is wide, and it is concentrated on the Edge tier — the agent is most certain exactly where it is least correct.',
    trend:{ dir:'up', label:'+0.04', tone:'danger' } },
  { label:'Shadow coverage', value:'78%', tone:'success', note:'of live referral volume',
    info:'Share of live referral volume the shadow agent ran against. Every other number on this page is measured on that 78% — the missing fifth is cases it could not parse, which is unmeasured rather than passing.',
    trend:{ dir:'up', label:'+6 pts', tone:'success' } },
]

/**
 * Parity by difficulty tier. Sits beside the aggregate deliberately — a
 * headline agreement rate routinely hides a failing tier, and promotion
 * decisions are made per tier, not on the average.
 */
export type TierRow = { tier: Tier; runs: number; agreement: number; note: string }

export const BY_TIER: TierRow[] = [
  { tier:'Routine', runs:3, agreement:100, note:'at parity — candidate for suggest-only' },
  { tier:'Complex', runs:3, agreement:33,  note:'below gate, both directions' },
  { tier:'Edge',    runs:2, agreement:0,   note:'insufficient volume to gate on' },
]

/** One field compared across the two decision objects. */
export type FieldDiff = { field: string; human: string; ai: string; agree: boolean }

/** A span in the shadow run's execution trace. */
export type Span = {
  label: string
  /** Nesting level, 0 = root. */
  depth: number
  ms: number
  status: 'ok' | 'warn' | 'suppressed'
  detail: string
}

export type RunDetail = {
  /** One plain-English line on what diverged and why. */
  summary: string
  fields: FieldDiff[]
  scores: { label: string; value: string; tone: 'good' | 'bad' | 'muted' }[]
  spans: Span[]
}

/**
 * Per-run detail. One authored fixture per run — the field diff is the
 * decision object compared key by key, the trace is the shadow run's span
 * tree. Suppressed tool calls are kept as spans on purpose: the write never
 * happened, and the trace is where you verify that.
 */
const DETAILS: Record<string, RunDetail> = {

  'r-112': {
    summary:'The agent priced a risk the underwriter refused to write. Appetite rules did not fire; the model reasoned from thin guideline support and treated frequency as a pricing input rather than a knock-out.',
    fields: [
      { field:'Decision', human:'Decline', ai:'Accept w/ loading', agree:false },
      { field:'Loading applied', human:'—', ai:'45%', agree:false },
      { field:'IDV', human:'₹12,40,000', ai:'₹12,40,000', agree:true },
      { field:'Primary reason', human:'Claims frequency breaches appetite', ai:'Claims frequency — priced, not excluded', agree:false },
      { field:'Exclusions applied', human:'Consequential loss', ai:'Consequential loss', agree:true },
      { field:'Stated confidence', human:'—', ai:'0.88', agree:true },
    ],
    scores: [
      { label:'Field agreement', value:'3 of 6', tone:'bad' },
      { label:'Model confidence', value:'0.88', tone:'bad' },
      { label:'Evidence sufficiency', value:'Thin — 2 chunks', tone:'bad' },
      { label:'Input parity', value:'Snapshot matched', tone:'good' },
    ],
    spans: [
      { label:'referral.received',       depth:0, ms:12,   status:'ok',         detail:'event · case UWR-24118' },
      { label:'input.snapshot',          depth:0, ms:84,   status:'ok',         detail:'frozen at human start time' },
      { label:'vahan.lookup',            depth:1, ms:340,  status:'ok',         detail:'GVW 7500kg · goods carrier' },
      { label:'claims.history',          depth:1, ms:226,  status:'ok',         detail:'3 OD claims / 24 months' },
      { label:'retrieval.uw_guidelines', depth:0, ms:480,  status:'warn',       detail:'2 chunks · thin support' },
      { label:'rules.appetite_check',    depth:1, ms:61,   status:'warn',       detail:'frequency rule not matched' },
      { label:'llm.decide',              depth:0, ms:2140, status:'ok',         detail:'decision object · confidence 0.88' },
      { label:'tool.apply_loading',      depth:1, ms:0,    status:'suppressed', detail:'write suppressed at tool layer' },
      { label:'tool.notify_producer',    depth:1, ms:0,    status:'suppressed', detail:'write suppressed at tool layer' },
      { label:'output.record_pair',      depth:0, ms:38,   status:'ok',         detail:'paired against human decision' },
    ],
  },

  'r-111': {
    summary:'Same decision, same loading. The only gap is IDV: the underwriter accepted the proposer’s declared value, the agent pulled the depreciation grid and took the lower figure.',
    fields: [
      { field:'Decision', human:'Accept w/ loading', ai:'Accept w/ loading', agree:true },
      { field:'Loading applied', human:'15%', ai:'15%', agree:true },
      { field:'IDV', human:'₹18,40,000', ai:'₹17,95,000', agree:false },
      { field:'Primary reason', human:'Declared value above grid — accepted', ai:'Grid value applied, 5th year depreciation', agree:false },
      { field:'Exclusions applied', human:'Standard', ai:'Standard', agree:true },
      { field:'Stated confidence', human:'—', ai:'0.91', agree:true },
    ],
    scores: [
      { label:'Field agreement', value:'4 of 6', tone:'bad' },
      { label:'Model confidence', value:'0.91', tone:'good' },
      { label:'Evidence sufficiency', value:'Adequate — 9 chunks', tone:'good' },
      { label:'Input parity', value:'Snapshot matched', tone:'good' },
    ],
    spans: [
      { label:'referral.received',       depth:0, ms:10,   status:'ok',         detail:'event · case UWR-24117' },
      { label:'input.snapshot',          depth:0, ms:71,   status:'ok',         detail:'frozen at human start time' },
      { label:'vahan.lookup',            depth:1, ms:284,  status:'ok',         detail:'private car · 2021 registration' },
      { label:'idv.grid_lookup',         depth:1, ms:118,  status:'ok',         detail:'5th year · 50% depreciation band' },
      { label:'retrieval.uw_guidelines', depth:0, ms:355,  status:'ok',         detail:'9 chunks · adequate' },
      { label:'rules.idv_tolerance',     depth:1, ms:44,   status:'warn',       detail:'declared 2.5% above grid ceiling' },
      { label:'llm.decide',              depth:0, ms:1690, status:'ok',         detail:'decision object · confidence 0.91' },
      { label:'tool.apply_terms',        depth:1, ms:0,    status:'suppressed', detail:'write suppressed at tool layer' },
      { label:'output.record_pair',      depth:0, ms:31,   status:'ok',         detail:'paired against human decision' },
    ],
  },

  'r-110': {
    summary:'The agent escalated where the underwriter wrote the risk. Fleet size crossed a referral threshold the underwriter knowingly waived for a known corporate relationship — context that exists outside the case record.',
    fields: [
      { field:'Decision', human:'Accept', ai:'Refer to senior', agree:false },
      { field:'Loading applied', human:'0%', ai:'—', agree:false },
      { field:'IDV', human:'₹31,60,000 (fleet)', ai:'₹31,60,000 (fleet)', agree:true },
      { field:'Primary reason', human:'Known corporate, clean prior book', ai:'Fleet > 25 units — senior authority', agree:false },
      { field:'Exclusions applied', human:'Standard', ai:'Standard', agree:true },
      { field:'Stated confidence', human:'—', ai:'0.79', agree:true },
    ],
    scores: [
      { label:'Field agreement', value:'3 of 6', tone:'bad' },
      { label:'Model confidence', value:'0.79', tone:'muted' },
      { label:'Evidence sufficiency', value:'Adequate — 6 chunks', tone:'good' },
      { label:'Input parity', value:'Snapshot matched', tone:'good' },
    ],
    spans: [
      { label:'referral.received',       depth:0, ms:13,   status:'ok',         detail:'event · case UWR-24115' },
      { label:'input.snapshot',          depth:0, ms:96,   status:'ok',         detail:'frozen at human start time' },
      { label:'fleet.schedule_parse',    depth:1, ms:512,  status:'ok',         detail:'42 units · 2-wheeler, mixed CC' },
      { label:'contact.book_history',    depth:1, ms:203,  status:'warn',       detail:'no prior policy on this entity' },
      { label:'retrieval.uw_guidelines', depth:0, ms:398,  status:'ok',         detail:'6 chunks · adequate' },
      { label:'rules.authority_matrix',  depth:1, ms:57,   status:'ok',         detail:'fleet over 25 routes to senior referral' },
      { label:'llm.decide',              depth:0, ms:1980, status:'ok',         detail:'decision object · confidence 0.79' },
      { label:'tool.raise_referral',     depth:1, ms:0,    status:'suppressed', detail:'write suppressed at tool layer' },
      { label:'output.record_pair',      depth:0, ms:35,   status:'ok',         detail:'paired against human decision' },
    ],
  },

  'r-109': {
    summary:'The hardest disagreement on the board. The underwriter priced an unverifiable NCB claim; the agent declined outright. The checker later sided with the agent — the one disagreement where the model was right.',
    fields: [
      { field:'Decision', human:'Accept w/ loading', ai:'Decline', agree:false },
      { field:'Loading applied', human:'25%', ai:'—', agree:false },
      { field:'IDV', human:'₹6,85,000', ai:'₹6,85,000', agree:true },
      { field:'Primary reason', human:'NCB unverified — priced the uncertainty', ai:'NCB continuity unprovable — decline per guideline', agree:false },
      { field:'Exclusions applied', human:'Standard', ai:'Standard', agree:true },
      { field:'Stated confidence', human:'—', ai:'0.72', agree:true },
    ],
    scores: [
      { label:'Field agreement', value:'3 of 6', tone:'bad' },
      { label:'Model confidence', value:'0.72', tone:'muted' },
      { label:'Evidence sufficiency', value:'Adequate — 8 chunks', tone:'good' },
      { label:'Input parity', value:'Snapshot matched', tone:'good' },
    ],
    spans: [
      { label:'referral.received',       depth:0, ms:11,   status:'ok',         detail:'event · case UWR-24112' },
      { label:'input.snapshot',          depth:0, ms:80,   status:'ok',         detail:'frozen at human start time' },
      { label:'vahan.lookup',            depth:1, ms:361,  status:'ok',         detail:'commercial · taxi permit active' },
      { label:'ncb.verify',              depth:1, ms:1204, status:'warn',       detail:'prior insurer no response · timeout' },
      { label:'permit.check',            depth:1, ms:274,  status:'ok',         detail:'permit valid to Mar 2027' },
      { label:'retrieval.uw_guidelines', depth:0, ms:441,  status:'ok',         detail:'8 chunks · adequate' },
      { label:'rules.ncb_continuity',    depth:1, ms:49,   status:'ok',         detail:'unprovable NCB forces decline' },
      { label:'llm.decide',              depth:0, ms:2260, status:'ok',         detail:'decision object · confidence 0.72' },
      { label:'tool.issue_decline',      depth:1, ms:0,    status:'suppressed', detail:'write suppressed at tool layer' },
      { label:'output.record_pair',      depth:0, ms:40,   status:'ok',         detail:'paired against human decision' },
    ],
  },

  'r-108': {
    summary:'The agent wrote a risk that should have gone up. It never retrieved the imported-parts guideline — the index has no chunk covering it — so no referral rule was available to fire. A corpus gap, not a reasoning failure.',
    fields: [
      { field:'Decision', human:'Refer to senior', ai:'Accept w/ loading', agree:false },
      { field:'Loading applied', human:'—', ai:'30%', agree:false },
      { field:'IDV', human:'₹42,10,000', ai:'₹42,10,000', agree:true },
      { field:'Primary reason', human:'Imported — parts lead time unquantified', ai:'High IDV — priced on value band', agree:false },
      { field:'Exclusions applied', human:'—', ai:'Standard', agree:false },
      { field:'Stated confidence', human:'—', ai:'0.84', agree:true },
    ],
    scores: [
      { label:'Field agreement', value:'2 of 6', tone:'bad' },
      { label:'Model confidence', value:'0.84', tone:'bad' },
      { label:'Evidence sufficiency', value:'Absent — 0 chunks', tone:'bad' },
      { label:'Input parity', value:'Snapshot matched', tone:'good' },
    ],
    spans: [
      { label:'referral.received',        depth:0, ms:12,   status:'ok',         detail:'event · case UWR-24109' },
      { label:'input.snapshot',           depth:0, ms:77,   status:'ok',         detail:'frozen at human start time' },
      { label:'vahan.lookup',             depth:1, ms:318,  status:'ok',         detail:'imported · CKD registration' },
      { label:'parts.catalogue',          depth:1, ms:890,  status:'warn',       detail:'no lead-time data for this model' },
      { label:'retrieval.uw_guidelines',  depth:0, ms:376,  status:'warn',       detail:'0 chunks · no imported-vehicle policy indexed' },
      { label:'rules.referral_triggers',  depth:1, ms:52,   status:'warn',       detail:'no rule matched — none exists' },
      { label:'llm.decide',               depth:0, ms:2010, status:'ok',         detail:'decision object · confidence 0.84' },
      { label:'tool.apply_loading',       depth:1, ms:0,    status:'suppressed', detail:'write suppressed at tool layer' },
      { label:'curation.flag_gap',        depth:0, ms:28,   status:'warn',       detail:'routed to KB owner — thin support' },
      { label:'output.record_pair',       depth:0, ms:33,   status:'ok',         detail:'paired against human decision' },
    ],
  },

  'r-107': {
    summary:'Clean parity. Identical decision, identical terms, strong retrieval support on both the zero-depreciation age cap and the renewal path. This is what the Routine tier looks like when it works.',
    fields: [
      { field:'Decision', human:'Accept', ai:'Accept', agree:true },
      { field:'Loading applied', human:'0%', ai:'0%', agree:true },
      { field:'IDV', human:'₹5,40,000', ai:'₹5,40,000', agree:true },
      { field:'Primary reason', human:'Clean renewal, zero-dep within age cap', ai:'Clean renewal, zero-dep within age cap', agree:true },
      { field:'Exclusions applied', human:'Standard', ai:'Standard', agree:true },
      { field:'Stated confidence', human:'—', ai:'0.94', agree:true },
    ],
    scores: [
      { label:'Field agreement', value:'6 of 6', tone:'good' },
      { label:'Model confidence', value:'0.94', tone:'good' },
      { label:'Evidence sufficiency', value:'Adequate — 11 chunks', tone:'good' },
      { label:'Input parity', value:'Snapshot matched', tone:'good' },
    ],
    spans: [
      { label:'referral.received',       depth:0, ms:9,    status:'ok',         detail:'event · case UWR-24104' },
      { label:'input.snapshot',          depth:0, ms:68,   status:'ok',         detail:'frozen at human start time' },
      { label:'policy.prior_term',       depth:1, ms:142,  status:'ok',         detail:'no claims in expiring term' },
      { label:'addon.eligibility',       depth:1, ms:96,   status:'ok',         detail:'zero-dep · year 6 of 7 cap' },
      { label:'retrieval.uw_guidelines', depth:0, ms:312,  status:'ok',         detail:'11 chunks · adequate' },
      { label:'llm.decide',              depth:0, ms:1480, status:'ok',         detail:'decision object · confidence 0.94' },
      { label:'tool.apply_terms',        depth:1, ms:0,    status:'suppressed', detail:'write suppressed at tool layer' },
      { label:'output.record_pair',      depth:0, ms:29,   status:'ok',         detail:'paired against human decision' },
    ],
  },

  'r-106': {
    summary:'Agreed on the decision, dropped the price. The underwriter loaded 20% for passenger PA exposure on a school bus; the agent found no rule tying occupancy to loading and wrote it flat.',
    fields: [
      { field:'Decision', human:'Accept w/ loading', ai:'Accept', agree:false },
      { field:'Loading applied', human:'20%', ai:'0%', agree:false },
      { field:'IDV', human:'₹19,80,000', ai:'₹19,80,000', agree:true },
      { field:'Primary reason', human:'32 minor passengers — PA exposure', ai:'Clean record, no rated hazard found', agree:false },
      { field:'Exclusions applied', human:'Standard', ai:'Standard', agree:true },
      { field:'Stated confidence', human:'—', ai:'0.81', agree:true },
    ],
    scores: [
      { label:'Field agreement', value:'3 of 6', tone:'bad' },
      { label:'Model confidence', value:'0.81', tone:'bad' },
      { label:'Evidence sufficiency', value:'Thin — 3 chunks', tone:'bad' },
      { label:'Input parity', value:'Snapshot matched', tone:'good' },
    ],
    spans: [
      { label:'referral.received',       depth:0, ms:11,   status:'ok',         detail:'event · case UWR-24101' },
      { label:'input.snapshot',          depth:0, ms:74,   status:'ok',         detail:'frozen at human start time' },
      { label:'vahan.lookup',            depth:1, ms:329,  status:'ok',         detail:'PSV · 32-seat school bus' },
      { label:'occupancy.pa_schedule',   depth:1, ms:188,  status:'warn',       detail:'seats read, no loading rule bound' },
      { label:'retrieval.uw_guidelines', depth:0, ms:404,  status:'warn',       detail:'3 chunks · thin support' },
      { label:'llm.decide',              depth:0, ms:1820, status:'ok',         detail:'decision object · confidence 0.81' },
      { label:'tool.apply_terms',        depth:1, ms:0,    status:'suppressed', detail:'write suppressed at tool layer' },
      { label:'output.record_pair',      depth:0, ms:32,   status:'ok',         detail:'paired against human decision' },
    ],
  },

  'r-105': {
    summary:'Full agreement including the referral reason — both stopped on the same RC-versus-proposer name mismatch and routed it the same way. Matched reasons, not just matched outcomes, are what make a pair worth counting.',
    fields: [
      { field:'Decision', human:'Refer to senior', ai:'Refer to senior', agree:true },
      { field:'Loading applied', human:'—', ai:'—', agree:true },
      { field:'IDV', human:'₹7,20,000', ai:'₹7,20,000', agree:true },
      { field:'Primary reason', human:'RC holder ≠ proposer — insurable interest', ai:'RC holder ≠ proposer — insurable interest', agree:true },
      { field:'Exclusions applied', human:'Pending referral', ai:'Pending referral', agree:true },
      { field:'Stated confidence', human:'—', ai:'0.89', agree:true },
    ],
    scores: [
      { label:'Field agreement', value:'6 of 6', tone:'good' },
      { label:'Model confidence', value:'0.89', tone:'good' },
      { label:'Evidence sufficiency', value:'Adequate — 7 chunks', tone:'good' },
      { label:'Input parity', value:'Snapshot matched', tone:'good' },
    ],
    spans: [
      { label:'referral.received',       depth:0, ms:10,   status:'ok',         detail:'event · case UWR-24098' },
      { label:'input.snapshot',          depth:0, ms:66,   status:'ok',         detail:'frozen at human start time' },
      { label:'vahan.lookup',            depth:1, ms:291,  status:'ok',         detail:'RC holder: S. Ramanathan' },
      { label:'kyc.name_match',          depth:1, ms:167,  status:'warn',       detail:'proposer mismatch · score 0.41' },
      { label:'retrieval.uw_guidelines', depth:0, ms:340,  status:'ok',         detail:'7 chunks · adequate' },
      { label:'rules.insurable_interest',depth:1, ms:46,   status:'ok',         detail:'mismatch routes to senior referral' },
      { label:'llm.decide',              depth:0, ms:1560, status:'ok',         detail:'decision object · confidence 0.89' },
      { label:'tool.raise_referral',     depth:1, ms:0,    status:'suppressed', detail:'write suppressed at tool layer' },
      { label:'output.record_pair',      depth:0, ms:30,   status:'ok',         detail:'paired against human decision' },
    ],
  },
}

export function detailFor(run: Run): RunDetail {
  return DETAILS[run.id]
}
