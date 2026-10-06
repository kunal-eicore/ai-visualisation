/**
 * Fixtures for the Group Health Quotation walkthrough.
 *
 * Every number here is lifted from the captured Onebuzz run of
 * "M/s Eicore tech LTD" (Figma: Quotation Builder - Retail, page "Group
 * Quotation screens"). They are kept verbatim rather than invented, because
 * the point of this exploration is the SHAPE of the flow — a plausible-looking
 * census that does not add up would undermine exactly the thing being shown.
 *
 * This is a visualisation sandbox: nothing is fetched, nothing is calculated.
 * The premium numbers are the ones the real calculator produced.
 */

import type { ModeId } from '@/lib/autonomy'
import type { RunTask } from '@/lib/agentRun'

export const STEPS = [
  'Start Quotation',
  'Business Details',
  'Member Details',
  'Cover Details',
  'Claims & TPA',
  'Summary',
  'Process Sheet',
] as const

export type Step = (typeof STEPS)[number]

// ---------------------------------------------------------------- step 1

export type UploadedDocument = { name: string; type: string; status: 'Received' }

export const DOCUMENTS: UploadedDocument[] = [
  { name: 'Active_Data 2.xlsx', type: 'XLSX', status: 'Received' },
  { name: 'Claims Data.xlsx', type: 'XLSX', status: 'Received' },
  { name: 'M_s Eicore tech LTD 3.xlsx', type: 'XLSX', status: 'Received' },
]

/**
 * The published workbook templates a run can import.
 *
 * Template import is not extraction and the two are kept apart everywhere in
 * this flow. A template is a contract agreed before the file exists: fixed
 * sheet names, fixed headers, fixed column order. Reading one is a script
 * walking known cells — deterministic, repeatable, and wrong in ways that can
 * be pointed at ("row 412, DOB blank") rather than ways that have to be
 * trusted. That is why it is available in Manual: nothing is being inferred.
 *
 * The corollary is the harder half. A workbook that is not the template is
 * REJECTED, not interpreted — no column-name guessing, no "looks like a DOB"
 * heuristic. Loose input is what the AI modes are for, and blurring the line
 * would put an interpretation inside the mode that promises none.
 */
export type Template = {
  name: string
  version: string
  sheets: string[]
  columns: number
}

export const TEMPLATES: Template[] = [
  {
    name: 'Group Health Member Census',
    version: 'v4.2',
    sheets: ['Active Members', 'Sum Insured Bands'],
    columns: 14,
  },
  {
    name: 'Prior Claims Experience',
    version: 'v2.1',
    sheets: ['Age-wise Claims', 'Relationship-wise Claims'],
    columns: 11,
  },
]

/**
 * What a dropped file was found to be.
 *
 * Three verdicts, not two, because the two kinds of failure take different
 * actions. `rejected` is about the CONTENT — the sheet is missing, the file
 * is not the template — and reading it again produces the same answer, so
 * the only move is to take it out and fix it. `failed` is about the READ —
 * the file never arrived — and that is the one a retry can change.
 *
 * A Retry button on a deterministic rejection is a lie the user pays for by
 * pressing it twice.
 */
export type DroppedFile = {
  name: string
  verdict: 'accepted' | 'rejected' | 'failed'
  /** The template it matched, or the check it stopped at. */
  detail: string
}

export const DROPPED_FILES: DroppedFile[] = [
  {
    name: 'Active_Data 2.xlsx',
    verdict: 'accepted',
    detail: 'Group Health Member Census v4.2',
  },
  {
    name: 'Claims Data.xlsx',
    verdict: 'accepted',
    detail: 'Prior Claims Experience v2.1',
  },
  {
    name: 'Eicore_HR_headcount.xlsx',
    verdict: 'rejected',
    detail: "Sheet 'Active Members' not found",
  },
  {
    name: 'RFQ - Millennials Brokers.pdf',
    verdict: 'rejected',
    detail: 'Not a template workbook',
  },
  {
    name: 'Claims Annexure.xlsx',
    verdict: 'failed',
    detail: 'Upload failed',
  },
]

/** The checks the import script runs, in order. Named rather than summarised
 *  as "validating", because the point of a deterministic import is that the
 *  step it failed at is a fact you can be told. */
export const IMPORT_CHECKS = [
  'Workbook signature',
  "Sheet 'Active Members'",
  'Header row against v4.2',
  'Column types',
  'Row values',
]

export const IMPORT_RESULT = {
  rows: 1367,
  lives: 3616,
  bands: 3,
  template: 'Group Health Member Census v4.2',
  /** Rows the script read but would not accept — a required field empty, a
   *  value outside the column's permitted list, a band not on the product.
   *  A count only: the addresses and the failed rule go in the exceptions
   *  workbook, which is where the rows get fixed. */
  skipped: 3,
}

/**
 * What each accepted file yielded — one row per file on the overview screen.
 *
 * `read` is every row the script walked; `imported` and `skipped` split it.
 * A count and a duration are the two things a deterministic read can always
 * state, so they are what the screen states. The address and the failed rule
 * for each skipped row go in the exceptions workbook, where the rows get
 * fixed — not into a table nobody can act on.
 */
export type FileResult = {
  name: string
  read: number
  seconds: number
  imported: number
  skipped: number
}

export const IMPORT_FILES: FileResult[] = [
  { name: 'Active_Data 2.xlsx', read: 1370, seconds: 1.8, imported: 1367, skipped: 3 },
  { name: 'Claims Data.xlsx', read: 214, seconds: 0.6, imported: 214, skipped: 0 },
]

/**
 * The same shape for the model branch, counted in fields rather than rows.
 *
 * `found` and `missing` are the hit/miss the sketch asks for: of the fields
 * this step needs, how many the read settled and how many it left for a
 * person. A miss here is not an error — it is a field that stays empty.
 */
export type ExtractionResult = {
  name: string
  fields: number
  seconds: number
  found: number
  missing: number
}

export const EXTRACTION_FILES: ExtractionResult[] = [
  { name: 'Active_Data 2.xlsx', fields: 26, seconds: 4.2, found: 26, missing: 0 },
  { name: 'Claims Data.xlsx', fields: 18, seconds: 3.1, found: 16, missing: 2 },
  { name: 'M_s Eicore tech LTD 3.xlsx', fields: 12, seconds: 2.4, found: 9, missing: 3 },
]

export const EXTRACTION = {
  lives: 3616,
  employees: 1367,
  bands: 3,
  sheet: 'Active_Data 2.xlsx.txt (Sheet: Active Members Count)',
  errors: 0,
}

// ---------------------------------------------------------------- step 2

export const QUOTATION_TYPES = ['Group', 'Master'] as const
export const BUSINESS_TYPES = ['New Business', 'Renewal', 'Rollover'] as const
export const SOURCES = ['Agent', 'Broker', 'Direct Sales'] as const
export const INWARD_MODES = ['Offline', 'Online'] as const

export const BUSINESS_DEFAULTS = {
  product: 'Magma One Health GHI',
  quotationType: 'Master' as (typeof QUOTATION_TYPES)[number],
  businessType: 'Renewal' as (typeof BUSINESS_TYPES)[number],
  startDate: '2026-05-24',
  endDate: '23/05/2027',
  term: '1 Year',
  company: 'M/s Eicore tech LTD',
  industry: 'IT / Technology Services',
  /* Blank on purpose. The extraction had nothing to read it out of, and a
     field the machine could not fill is the case a reconciliation has to
     handle differently from one it filled wrongly. */
  gstin: '',
  source: 'Broker' as (typeof SOURCES)[number],
  inward: 'Online' as (typeof INWARD_MODES)[number],
  intermediary: 'Millennials Insurance Brokers',
  address: '577, Phase V, Udyog Vihar, Sector 19, Gurugram, Haryana 122016',
}

export const INDUSTRIES = [
  'IT / Technology Services',
  'ITES / BPO Services',
  'Banking & Financial Services',
  'Manufacturing',
  'Pharmaceuticals',
  'Logistics & Transport',
]

// ---------------------------------------------------------------- step 3

export const AGE_BANDS = ['0-18', '19-35', '36-45', '46-55', '56-65', '66-80'] as const
export type AgeBand = (typeof AGE_BANDS)[number]

export type MemberGroup = {
  id: string
  name: string
  sumInsured: number
  siType: 'Individual' | 'Family Floater' | 'Multi-Individual'
  members: number
  /** Head-count per age band, in AGE_BANDS order. */
  byAgeBand: number[]
}

export const MEMBER_GROUPS: MemberGroup[] = [
  {
    id: 'g-300k',
    name: 'Sum Insured 300000',
    sumInsured: 300000,
    siType: 'Family Floater',
    members: 3435,
    byAgeBand: [1102, 1402, 710, 203, 18, 0],
  },
  {
    id: 'g-500k',
    name: 'Sum Insured 500000',
    sumInsured: 500000,
    siType: 'Family Floater',
    members: 106,
    byAgeBand: [31, 20, 33, 19, 3, 0],
  },
  {
    id: 'g-1000k',
    name: 'Sum Insured 1000000',
    sumInsured: 1000000,
    siType: 'Family Floater',
    members: 75,
    byAgeBand: [18, 15, 13, 20, 9, 0],
  },
]

export const RELATIONSHIPS = ['Primary Member', 'Spouse', 'Children', 'Parents'] as const

export type RelationshipBreakup = Record<string, number[]>

/**
 * Relationship × age band, PER GROUP, in AGE_BANDS order.
 *
 * Per group rather than one global matrix, because the screens that show it
 * sit next to a group selector: switching from the ₹3L band to the ₹10L band
 * and watching an identical family matrix appear is the clearest way a
 * walkthrough can tell the reader the numbers are wallpaper.
 *
 * It reconciles in both directions, which is the only thing that makes it
 * worth having:
 *
 * - each group's COLUMN sums equal that group's `byAgeBand`
 *   (1102/1402/710/203/18, 31/20/33/19/3, 18/15/13/20/9), and
 * - each group's grand total equals its `members` (3435 / 106 / 75 = 3616).
 *
 * The all-groups matrix is DERIVED from these below, so the two can never
 * drift apart.
 */
export const RELATIONSHIP_BREAKUP_BY_GROUP: Record<string, RelationshipBreakup> = {
  'g-300k': {
    'Primary Member': [0, 675, 458, 143, 12, 0],
    Spouse: [0, 578, 252, 60, 6, 0],
    Children: [1102, 149, 0, 0, 0, 0],
    Parents: [0, 0, 0, 0, 0, 0],
  },
  'g-500k': {
    'Primary Member': [0, 10, 21, 13, 2, 0],
    Spouse: [0, 8, 12, 6, 1, 0],
    Children: [31, 2, 0, 0, 0, 0],
    Parents: [0, 0, 0, 0, 0, 0],
  },
  'g-1000k': {
    'Primary Member': [0, 4, 9, 14, 6, 0],
    Spouse: [1, 8, 4, 6, 3, 0],
    Children: [17, 3, 0, 0, 0, 0],
    Parents: [0, 0, 0, 0, 0, 0],
  },
}

/** The whole population, summed from the groups. Step 3 shows this one — it
 *  has no group selector, it shows every band as a column. */
export const RELATIONSHIP_BREAKUP: RelationshipBreakup = Object.fromEntries(
  RELATIONSHIPS.map((rel) => [
    rel,
    AGE_BANDS.map((_, band) =>
      Object.values(RELATIONSHIP_BREAKUP_BY_GROUP).reduce(
        (sum, group) => sum + group[rel][band],
        0,
      ),
    ),
  ]),
)

/** Lives ÷ primary members, for one group or for the whole population.
 *  An average of the three group averages would not be the population
 *  average, so it is always recomputed from the counts. */
export const avgFamilySize = (breakup: RelationshipBreakup, lives: number) => {
  const employees = breakup['Primary Member'].reduce((a, b) => a + b, 0)
  return employees === 0 ? 0 : Number((lives / employees).toFixed(2))
}

export const AVG_FAMILY_SIZE = avgFamilySize(RELATIONSHIP_BREAKUP, 3616)

export const FAMILY_TYPES = ['1E', '1E + 1S', '1E + 1S + 2C', '1E + 1S + 2C + 2P']

// ---------------------------------------------------------------- step 4

export type LimitType = 'Range' | 'Fixed' | 'Percentage'
export type CoverType = 'Within SI' | 'Additional SI' | 'Over and above SI'

export type Cover = {
  name: string
  type: CoverType
  limitType: LimitType
  /** The limit at the ₹3L band, and the limit outright for a flat cover. */
  value: string
  /**
   * How the limit moves with the group's sum insured.
   *
   * A cover written "Within SI" for an amount is nearly always a share of
   * that SI, so the ₹10L band cannot carry the ₹3L band's ceiling — and a
   * screen where all three bands show the same ₹3,00,000 in-patient limit is
   * telling the reader the group selector does nothing.
   *
   * Absent means flat: an ambulance cap or an organ-donor limit is the same
   * rupee figure whatever the band, and a cover already written as a
   * percentage of SI ("100% of Sum Insured") scales in words.
   */
  siShare?: number
  /** Base covers the product ships pre-modified for this client. */
  modified?: boolean
}

export const BASE_COVERS: Cover[] = [
  { name: 'In-patient Hospitalization', type: 'Within SI', limitType: 'Range', value: '₹3,00,000', siShare: 1, modified: true },
  { name: 'Pre-Post Hospitalization', type: 'Within SI', limitType: 'Fixed', value: '₹60,000 / claim', siShare: 0.2 },
  { name: 'Day Care Treatment', type: 'Within SI', limitType: 'Range', value: '₹3,00,000', siShare: 1, modified: true },
  { name: 'Road Ambulance Cover', type: 'Within SI', limitType: 'Range', value: '₹1,000', modified: true },
  // Within SI, so it cannot exceed the band's SI — flat ₹5,00,000 was a
  // larger sub-limit than the ₹3L band's whole cover.
  { name: 'Organ Donor Expenses', type: 'Within SI', limitType: 'Fixed', value: '₹3,00,000 / policy', siShare: 1 },
  { name: 'Domiciliary Hospitalisation', type: 'Within SI', limitType: 'Percentage', value: '100% of Sum Insured / policy' },
  { name: 'AYUSH Treatment', type: 'Within SI', limitType: 'Percentage', value: '100% of Sum Insured / policy' },
  { name: 'Baby Day 1 Cover', type: 'Within SI', limitType: 'Percentage', value: '100% of Sum Insured / policy' },
]

/** The product carries 24 base covers; the eight above are the ones the
 *  captured run shows. The count is real, the long tail is not enumerated. */
export const BASE_COVER_COUNT = 24

export const ADDON_COVERS: Cover[] = [
  { name: 'OPD Cover', type: 'Additional SI', limitType: 'Range', value: '₹2,500' },
  { name: 'Maternity Cover', type: 'Additional SI', limitType: 'Range', value: '₹30,000', siShare: 0.1 },
  { name: 'Corporate Floater', type: 'Over and above SI', limitType: 'Range', value: '₹0 – ₹1,00,000' },
  { name: 'Critical Illness Cover', type: 'Additional SI', limitType: 'Range', value: '₹3,00,000', siShare: 1 },
  { name: 'Air Ambulance Cover', type: 'Over and above SI', limitType: 'Fixed', value: '₹2,00,000 / policy' },
]

/**
 * The limit to print for a cover on a given band.
 *
 * A flat cover returns its own `value` untouched, suffix and all. An
 * SI-linked one is recomputed from the band's sum insured and keeps the
 * suffix, so "₹60,000 / claim" at ₹3L becomes "₹2,00,000 / claim" at ₹10L.
 */
export const coverLimit = (cover: Cover, sumInsured: number) => {
  if (cover.siShare === undefined) return cover.value
  const suffix = cover.value.includes(' / ') ? ` / ${cover.value.split(' / ')[1]}` : ''
  return formatInr(Math.round(sumInsured * cover.siShare)) + suffix
}

// ---------------------------------------------------------------- step 5

export const SERVICING_MODES = ['In-House', 'TPA'] as const
export type ServicingMode = (typeof SERVICING_MODES)[number]

export const TPA_LIBRARY = [
  { id: 'tpa-medi', name: 'Medi Assist Insurance TPA', code: 'TPA-001', network: '11,240 hospitals' },
  { id: 'tpa-paramount', name: 'Paramount Health Services', code: 'TPA-014', network: '8,900 hospitals' },
  { id: 'tpa-vidal', name: 'Vidal Health TPA', code: 'TPA-022', network: '7,350 hospitals' },
]

export const AGE_WISE_CLAIMS = [
  { band: '0-18', cashlessClaims: 2, cashlessAmt: '₹6,300', cashlessAcs: '₹3,150', reimbClaims: 1, reimbAmt: '₹1,92,884', reimbAcs: '₹1,92,884', totalClaims: 3, totalAmt: '₹1,99,184', totalAcs: '₹66,394' },
  { band: '19-35', cashlessClaims: 2, cashlessAmt: '₹1,44,016', cashlessAcs: '₹72,008', reimbClaims: 11, reimbAmt: '₹3,44,339', reimbAcs: '₹31,303', totalClaims: 13, totalAmt: '₹4,88,355', totalAcs: '₹37,565' },
  { band: '36-45', cashlessClaims: 8, cashlessAmt: '₹7,79,306', cashlessAcs: '₹97,413', reimbClaims: 3, reimbAmt: '₹47,398', reimbAcs: '₹15,799', totalClaims: 11, totalAmt: '₹8,26,704', totalAcs: '₹75,154' },
  { band: '46-55', cashlessClaims: 0, cashlessAmt: '₹0', cashlessAcs: '—', reimbClaims: 2, reimbAmt: '₹528', reimbAcs: '₹264', totalClaims: 2, totalAmt: '₹528', totalAcs: '₹264' },
]

export const AGE_WISE_TOTAL = {
  band: 'Overall', cashlessClaims: 12, cashlessAmt: '₹9,29,622', cashlessAcs: '₹77,468',
  reimbClaims: 17, reimbAmt: '₹5,85,149', reimbAcs: '₹34,420',
  totalClaims: 29, totalAmt: '₹15,14,771', totalAcs: '₹52,233',
}

export const CLAIMS_STATUS = [
  { status: 'Settled', sub: 'Paid', count: 27, amount: '₹15,14,771', paid: '₹15,14,771' },
  { status: 'Outstanding', sub: 'Outstanding', count: 2, amount: '₹1,18,171', paid: '₹0' },
]

export const CASHLESS_VS_REIMB = [
  { type: 'Cashless', claims: 12, amount: '₹9,29,622', pct: 41, avg: '₹77,468' },
  { type: 'Reimbursement', claims: 17, amount: '₹5,85,149', pct: 59, avg: '₹34,420' },
]

export const EMPLOYEE_VS_DEPENDENT = [
  { relationship: 'Employee', claims: 18, amount: '₹4,84,690', avg: '₹26,927' },
  { relationship: 'Dependent', claims: 11, amount: '₹10,30,081', avg: '₹93,643' },
]

export const AMOUNT_WISE_CLAIMS = [
  { band: '0-25K', cashlessClaims: 5, cashlessAmt: '₹42,104', reimbClaims: 12, reimbAmt: '₹73,603', totalClaims: 17, totalAmt: '₹1,15,707', pctClaims: '59%', pctValue: '8%' },
  { band: '25K-50K', cashlessClaims: 3, cashlessAmt: '₹1,02,409', reimbClaims: 2, reimbAmt: '₹70,297', totalClaims: 5, totalAmt: '₹1,72,706', pctClaims: '17%', pctValue: '11%' },
  { band: '50K-1L', cashlessClaims: 3, cashlessAmt: '₹2,21,019', reimbClaims: 1, reimbAmt: '₹82,134', totalClaims: 4, totalAmt: '₹3,03,153', pctClaims: '14%', pctValue: '20%' },
  { band: '1L-2L', cashlessClaims: 0, cashlessAmt: '₹0', reimbClaims: 2, reimbAmt: '₹3,59,115', totalClaims: 2, totalAmt: '₹3,59,115', pctClaims: '7%', pctValue: '24%' },
  { band: 'Above 5L', cashlessClaims: 1, cashlessAmt: '₹5,64,090', reimbClaims: 0, reimbAmt: '₹0', totalClaims: 1, totalAmt: '₹5,64,090', pctClaims: '3%', pctValue: '37%' },
]

export const SI_BAND_CLAIMS = [
  { band: '₹3,00,000', cashlessClaims: 11, cashlessAmt: '₹3,65,532', reimbClaims: 15, reimbAmt: '₹5,62,802', totalClaims: 26, totalAmt: '₹9,28,334', pctClaims: '90%', pctValue: '61%' },
  { band: '₹5,00,000', cashlessClaims: 1, cashlessAmt: '₹5,64,090', reimbClaims: 2, reimbAmt: '₹22,347', totalClaims: 3, totalAmt: '₹5,86,437', pctClaims: '10%', pctValue: '39%' },
]

export const MONTH_WISE_CLAIMS = [
  { month: '2025-06', claims: 2, amount: '₹0.2L', pct: 1 },
  { month: '2026-04', claims: 25, amount: '₹14.9L', pct: 100 },
]

export const DISEASE_ANALYSIS = [
  { rank: 1, category: 'CARDIOLOGY', claims: 3, amount: '₹6,13,145', acs: '₹2,04,381' },
  { rank: 2, category: 'MEDICAL GENERAL', claims: 15, amount: '₹4,07,353', acs: '₹27,156' },
  { rank: 3, category: 'PAEDIATRICS', claims: 1, amount: '₹1,92,884', acs: '₹1,92,884' },
  { rank: 4, category: 'ORTHOPEDICS', claims: 3, amount: '₹99,350', acs: '₹33,116' },
  { rank: 5, category: 'OPTHALMOLOGY', claims: 1, amount: '₹82,134', acs: '₹82,134' },
]

export const TOP_HOSPITALS = [
  { rank: 1, hospital: 'Apollo Multispeciality Hospitals Limited', zone: 'West Bengal', claims: 1, amount: '₹5,64,090' },
  { rank: 2, hospital: 'Unicure Hospital', zone: 'Maharashtra', claims: 1, amount: '₹1,92,884' },
  { rank: 3, hospital: 'Kaushalya Hospital', zone: 'Maharashtra', claims: 1, amount: '₹1,66,231' },
  { rank: 4, hospital: 'AIG Hospitals', zone: 'Telangana', claims: 3, amount: '₹86,329' },
  { rank: 5, hospital: 'DR. M.I. DOONGERWALA', zone: 'Maharashtra', claims: 1, amount: '₹82,134' },
]

// ---------------------------------------------------------------- step 7

export const QUOTATION_NUMBER = 'MAGM-400201-26-7000002-1'

export const PREMIUM = {
  current: '₹1,64,77,850',
  previous: '₹97,00,000',
  changePct: '+69.9%',
  changeAbs: '+₹67,77,850',
}

/** Premium per age band, in MEMBER_GROUPS order. */
export const PREMIUM_BY_AGE_BAND: { band: string; values: string[] }[] = [
  { band: '0-18', values: ['₹9,34,954', '₹40,099', '₹42,151'] },
  { band: '19-35', values: ['₹62,59,081', '₹1,08,152', '₹1,02,125'] },
  { band: '36-45', values: ['₹48,47,092', '₹3,43,879', '₹2,45,229'] },
  { band: '46-55', values: ['₹20,07,106', '₹2,86,729', '₹5,46,399'] },
  { band: '56-65', values: ['₹2,71,192', '₹68,988', '₹3,74,674'] },
]

export const PREMIUM_TOTALS = ['₹1,43,19,425', '₹8,47,847', '₹13,10,577']
export const PREMIUM_PER_MEMBER = ['₹4,169', '₹7,999', '₹17,474']

export const formatInr = (value: number) =>
  '₹' + value.toLocaleString('en-IN')

// ------------------------------------------------------- autonomy fixtures

/**
 * A turn in the dock.
 *
 * **There is no opening transcript.** The panel starts empty and stays empty
 * until it is asked something. A scripted conversation sitting in the feed on
 * arrival reads as a recording of somebody else's session — and it buries the
 * one thing the panel has to make obvious, which is that you can type into
 * it. The suggestions above the composer are the way in instead, and the
 * modes differ in what they will DO with a request rather than in what they
 * have pre-said.
 */

export type ChatTurn = {
  role: 'user' | 'agent'
  text: string
  /** What the answer was read out of. An answer with no source is an opinion. */
  evidence?: string[]
  /**
   * What the write does, in one line.
   *
   * With `direct` it is a receipt for something that has happened; without
   * it, the label on a button you have to press.
   */
  apply?: string
  /**
   * The request named the change, so it runs on arrival.
   *
   * A confirmation step is worth its click when the agent chose something:
   * it volunteered a write nobody asked for, or it settled an ambiguity on
   * your behalf. Asking you to confirm an instruction you just issued — with
   * the value in the words you used — is not a gate, it is a second click on
   * the same decision, and paying it every time is what teaches people to
   * press the confirm without reading it. What replaces it is Undo: an
   * action that takes one click has to be reversible in one.
   */
  direct?: boolean
  /** Where that write would land. */
  step?: Step
  /**
   * The SectionCard id that write lands in — the area that takes the ring.
   * Shaped inline rather than imported from `agentEdits` so the script data
   * stays a leaf: the edit bus reads the scripts, not the other way round.
   */
  section?: string
  /** The fields the write actually changes. These drive the skeletons. */
  edits?: { field: string; value: string }[]
  /**
   * A document disagreed with the form, and the turn is the reconciliation.
   *
   * Rendered instead of the plain Apply row, because this is not one write
   * to accept or decline \u2014 it is several, each of which the user may want
   * to settle differently.
   */
  reconcile?: ReconcileRow[]
  /** The document this turn was produced by reading. */
  file?: string
}

/**
 * The agents, by decision class.
 *
 * Routing is by decision class rather than by capability, because the class is
 * already the unit authority is granted over ("machine authority belongs to a
 * defined decision class", north star 04). The consequence is the interesting
 * part: the rungs are NOT all the same. Reading documents has earned
 * Autonomous here; pricing has not, and that is why the premium at the end of
 * this run is prepared rather than submitted. A single global dial could not
 * express that, and would have to round it to the lowest class.
 *
 * The roster is readable and not settable. Who did what belongs in the record
 * so the decision can be reconstructed (06, 14); a dropdown letting a broker
 * pick a model would be a configuration surface wearing a control's clothes.
 */
export const AGENTS = {
  docs: { label: 'Document reader', decisionClass: 'Proposal documents', rung: 'Autonomous' },
  census: { label: 'Census', decisionClass: 'Member census', rung: 'Autonomous' },
  covers: { label: 'Cover mapping', decisionClass: 'Cover schedule', rung: 'Hybrid' },
  claims: { label: 'Claims', decisionClass: 'Claims history', rung: 'Hybrid' },
  pricing: { label: 'Pricing', decisionClass: 'Premium rating', rung: 'AI-assisted' },
} as const

export type AgentId = keyof typeof AGENTS

/** Spread an agent onto a task so the board does not have to look it up. */
function by(id: AgentId) {
  const a = AGENTS[id]
  return { agent: a.label, decisionClass: a.decisionClass, classRung: a.rung }
}

/**
 * The autonomous run, as a work queue the agent owns.
 *
 * Five of these settle and five do not, and the five that do not are the
 * point of the mode. A run that reported nothing but successes would be
 * claiming a confidence the inputs do not support — the industry code
 * genuinely has two sources that disagree, and 23 census rows genuinely have
 * no date of birth anywhere in the pack.
 *
 * Each handoff is written twice. `ask` is the task as it reads to whoever
 * picks it up — a work item for a person who did not watch the run; `yours`
 * is the same thing in second person and is only ever shown for the ones
 * addressed to `you`. The split is the difference between a queue and a
 * pile of things that all feel like yours.
 *
 * The handoffs deliberately cover all three kinds and all three recipients,
 * because the taxonomy only earns its keep if the cases are visibly
 * different: the start date has a safe place to land and so can be asked as a
 * question; the sector does not and so blocks; maternity is not the agent's
 * to price at any confidence; and the missing dates of birth cannot be
 * answered inside this company at all.
 */
export const RUN_TASKS: RunTask[] = [
  {
    id: 'docs-read',
    step: 'Start Quotation',
    title: 'Read 3 workbooks and reconciled the census',
    ...by('docs'),
    confidence: 0.98,
    note: '3,616 lives against 1,367 employees, 3 sum-insured bands, 0 unparsed rows.',
  },
  {
    id: 'company-match',
    step: 'Business Details',
    title: 'Matched the company and carried the broker and source from the RFQ',
    ...by('docs'),
    confidence: 0.96,
    note: 'Matched M/s Eicore tech LTD to one group register entry.',
  },
  {
    id: 'start-date',
    step: 'Business Details',
    title: 'Effective start date',
    ...by('docs'),
    confidence: 0.88,
    note: 'The RFQ asks for cover from 1 June. The quotation request form says 24 May.',
    handoff: {
      kind: 'question',
      to: 'you',
      section: 'business.quotation',
      ask: 'Confirm which inception date the quote is built on. The two documents give different ones.',
      yours: 'The RFQ asks for cover from 1 June and the request form says 24 May. Which one should this be built on?',
      can: 'Pick one of these, or type a date straight into Effective Start Date below.',
      options: ['01 Jun 2026', '24 May 2026'],
      writes: {
        '01 Jun 2026': [{ field: 'business.startDate', value: '2026-06-01' }],
        '24 May 2026': [{ field: 'business.startDate', value: '2026-05-24' }],
      },
      fallback: 'If nobody answers I will use 1 June, which leaves no gap with the expiring policy, and flag it on the process sheet.',
    },
  },
  {
    id: 'industry',
    step: 'Business Details',
    title: 'Industry classification',
    ...by('docs'),
    confidence: 0.61,
    note: 'The RFQ says IT services, the expiring schedule says ITES. The two price differently and nothing in the documents settles it.',
    handoff: {
      kind: 'escalation',
      to: 'you',
      section: 'business.company',
      ask: 'Decide which sector this risk is rated as. The documents disagree and neither settles it.',
      yours: 'This one is yours. The RFQ says IT services, the expiring schedule says ITES, and they price differently — nothing in the pack decides it.',
      can: 'Choose one of these, or pick a different sector from the field below. There is no safe default, so it stays open until you settle it.',
      options: ['IT / Technology Services', 'ITES / BPO Services'],
      writes: {
        'IT / Technology Services': [
          { field: 'business.industry', value: 'IT / Technology Services' },
        ],
        'ITES / BPO Services': [{ field: 'business.industry', value: 'ITES / BPO Services' }],
      },
    },
  },
  {
    id: 'census-build',
    step: 'Member Details',
    title: 'Built 3 member groups and the relationship / age-band matrix',
    ...by('census'),
    confidence: 0.97,
    note: 'Average family size 2.65, consistent across all three bands.',
  },
  {
    id: 'census-dob',
    step: 'Member Details',
    title: '23 members with no date of birth',
    ...by('census'),
    confidence: 0.74,
    note: 'They are in the active data with a relationship and a band, and no date anywhere in the pack. Age loading cannot be rated without one.',
    handoff: {
      kind: 'delegation',
      to: 'broker',
      who: 'Marsh India',
      section: 'members.ageBands',
      ask: 'Marsh India to obtain dates of birth for 23 members from the client. Nobody inside the company holds them.',
      /* It is the broker's task and still your button: the request is
         written and not sent, because a task crossing out of the building
         is the one place an Undo cannot reach. */
      can: 'The request is written and not sent. Read it on the run board, then send it from there.',
      outbound: {
        to: 'priya.nair@marsh.example',
        subject: 'Eicore Tech renewal 2026-27: 23 members missing date of birth',
        body: 'Hi Priya,\n\nWorking the Eicore Tech group renewal from the pack you sent on 14 September. 23 members in Active_Data 2.xlsx carry a relationship and a sum-insured band but no date of birth, so they cannot be age-rated.\n\nThe employee IDs are attached. Could you get the dates from the client?\n\nThe rest of the quote is ready and does not depend on these.',
      },
    },
  },
  {
    id: 'covers-base',
    step: 'Cover Details',
    title: 'Copied the expiring base cover set onto all three groups',
    ...by('covers'),
    confidence: 0.93,
    note: '24 base covers, unchanged limits.',
  },
  {
    id: 'covers-maternity',
    step: 'Cover Details',
    title: 'Maternity add-on on Group 1',
    ...by('covers'),
    confidence: 0.58,
    note: 'The broker RFQ asks for it, the expiring policy never carried it, and it is not priced in the current rating table.',
    handoff: {
      kind: 'delegation',
      to: 'underwriter',
      who: 'S. Raghavan',
      section: 'covers.table',
      ask: 'S. Raghavan to price the maternity add-on on Group 1, or decline it. It is not in the current rating table.',
    },
  },
  {
    id: 'claims-load',
    step: 'Claims & TPA',
    title: 'Loaded and banded 4 years of prior claims',
    ...by('claims'),
    confidence: 0.95,
    note: 'In-house servicing carried forward from the expiring policy.',
  },
  {
    id: 'premium',
    step: 'Process Sheet',
    title: 'Calculated the premium',
    ...by('pricing'),
    confidence: 0.99,
    note: 'A renewal 69.9% above expiring is customer-affecting and hard to reverse. It is prepared, not submitted.',
    handoff: {
      kind: 'delegation',
      to: 'you',
      section: 'process.premium',
      ask: 'Review the calculated premium and submit the quotation. The agent does not sign it.',
      yours: 'Everything on this run is prepared. The last action is yours, and it stays yours at every rung: the agent does not submit.',
      can: 'Check the figures below, then press Submit Quotation in the bar at the bottom.',
    },
  },
]

/**
 * Last year's add-on selection, as a write.
 *
 * Whole-table writes are the reason Hybrid needs a different transcript from
 * AI-assisted. Seven cells across three bands is not something anybody wants
 * to confirm cell by cell, and it is also not something that should land
 * silently \u2014 so it lands as ONE reversible act with every cell skeletoned
 * while it writes, and the group sign-off is deliberately not part of it.
 * Copying last year's shape is a proposal about covers; declaring a band
 * configured is a decision about this year's risk, and the machine does not
 * get to make the second one by doing the first.
 */
export const COVERS_FROM_EXPIRING: { field: string; value: string }[] = [
  { field: 'covers.addon.g-300k:OPD Cover', value: 'on' },
  { field: 'covers.addon.g-300k:Corporate Floater', value: 'on' },
  { field: 'covers.addon.g-500k:OPD Cover', value: 'on' },
  { field: 'covers.addon.g-500k:Corporate Floater', value: 'on' },
  { field: 'covers.addon.g-1000k:OPD Cover', value: 'on' },
  { field: 'covers.addon.g-1000k:Corporate Floater', value: 'on' },
  { field: 'covers.addon.g-1000k:Critical Illness Cover', value: 'on' },
]

/* ── AI-assisted: the things you can actually ask ─────────────────────── */

/**
 * What the assistant answers, and what it offers to write.
 *
 * AI-assisted is the rung where the machine reads and proposes but never
 * sequences, so every entry here is one of exactly two things: an answer with
 * the documents it came out of, or a single bounded write with an Apply. A
 * reply that did several unrelated things at once would be the Hybrid rung
 * wearing this one's label.
 *
 * It is a router over canned replies, not a model. The matcher is deliberately
 * loose — the point of the exploration is that typing a request in your own
 * words lands somewhere, so "change the industry", "industry is wrong" and
 * "set sector to IT" all have to reach the same reply. What it will NOT do is
 * guess: anything unmatched says so plainly rather than improvising an answer
 * with no source behind it, because an assistant that fabricates under
 * pressure is the failure this whole ladder is arguing against.
 */
export type AssistedReply = {
  /** Shown as a suggestion button when `suggest` is set. */
  suggest?: string
  /**
   * Rungs this is offered at. Omitted means every rung that has a chat.
   *
   * It gates the SUGGESTION, not the answer: a question the user types is
   * answered wherever they type it. What changes per rung is what is worth
   * putting in front of them — in Autonomous the run has already been made,
   * so offering "fill company details" would be offering to redo work the
   * agent did, while "why is the premium up" is the question that mode
   * actually leaves you with.
   */
  modes?: ModeId[]
  /** Tried in order against the lower-cased prompt. */
  match: RegExp[]
  reply: ChatTurn
}

export const ASSISTED_REPLIES: AssistedReply[] = [
  {
    suggest: 'Fill company details',
    modes: ['assisted', 'hybrid'],
    match: [/fill .*(company|business)/, /company details/, /(fill|complete) the form/],
    reply: {
      role: 'agent',
      text: 'The RFQ header and the expiring schedule both carry the legal entity, and they agree once the abbreviations are expanded. I can put the registered name and the sector on Company Details — the address is already the one on the schedule, so I would leave it.',
      evidence: ['Broker RFQ, p.1', 'Expiring policy schedule 2025-26'],
      apply: 'Fill company name and industry',
      direct: true,
      step: 'Business Details',
      section: 'business.company',
      edits: [
        { field: 'business.company', value: 'M/s Eicore Tech Limited' },
        { field: 'business.industry', value: 'IT / Technology Services' },
      ],
    },
  },
  {
    suggest: 'Set the industry from the RFQ',
    modes: ['assisted', 'hybrid'],
    match: [/industry/, /sector/, /ites/],
    reply: {
      role: 'agent',
      text: 'The RFQ says IT services and the expiring policy says ITES. Both map to the same rated sector on our list, so the ambiguity does not survive the mapping — but it does change the loading if you pick Banking instead, which is what the broker letterhead would suggest.',
      evidence: ['Broker RFQ, p.1', 'Expiring policy schedule 2025-26'],
      apply: 'Set industry to IT / Technology Services',
      direct: true,
      step: 'Business Details',
      section: 'business.company',
      edits: [{ field: 'business.industry', value: 'IT / Technology Services' }],
    },
  },
  {
    suggest: 'Move the start date to 1 June',
    modes: ['assisted', 'hybrid'],
    match: [/start date/, /inception/, /policy period/, /1 june|01 june|1st june/],
    reply: {
      role: 'agent',
      text: 'The expiring policy runs to 31 May 2026, so a 1 June inception leaves no gap. The term stays at one year and the end date follows it, which is why that field is not mine to set.',
      evidence: ['Expiring policy schedule 2025-26'],
      apply: 'Set effective start date to 01 Jun 2026',
      direct: true,
      step: 'Business Details',
      section: 'business.quotation',
      edits: [{ field: 'business.startDate', value: '2026-06-01' }],
    },
  },
  {
    suggest: 'Dependents over 60?',
    match: [/over 60|above 60|60\+/, /dependent/, /parent/],
    reply: {
      role: 'agent',
      text: '212 across the three groups: 168 spouses and 44 parents. All of them sit in the 61-65 and 66-70 bands, which is where the age loading steps up.',
      evidence: ['Active_Data 2.xlsx (Sheet: Active Members Count)'],
    },
  },
  {
    suggest: 'Why is the claims ratio high?',
    match: [/claims? ratio/, /loss ratio/, /incurred/, /why.*(high|up)/, /burn/],
    reply: {
      role: 'agent',
      text: 'The incurred ratio on the expiring year is 113%. Two thirds of that sits in the 46-60 band, and a single maternity cohort accounts for most of the rest — 34% over the expected frequency for a group this size.',
      evidence: ['Claims Data.xlsx', 'Expiring policy schedule 2025-26'],
    },
  },
  {
    suggest: 'Rebuild the cover table from last year',
    modes: ['hybrid'],
    match: [/cover/, /last year/, /same as (before|last)/, /expiring/, /historical|history/],
    reply: {
      role: 'agent',
      text: 'The expiring schedule carried OPD and the corporate floater on all three bands, and critical illness on the \u20B910L band only. I can set that across the table. Maternity I am leaving off \u2014 the RFQ asks for it, the expiring policy never carried it, and it is not in the current rating table, so that one is yours.',
      evidence: ['Expiring policy schedule 2025-26', 'Rating table GH-2026'],
      apply: 'Set 7 add-on selections from the expiring schedule',
      direct: true,
      step: 'Cover Details',
      section: 'covers.table',
      edits: COVERS_FROM_EXPIRING,
    },
  },
  {
    suggest: 'Why is the premium up 69.9%?',
    modes: ['autonomous'],
    match: [/premium.*(up|rise|increase|higher)/, /69\.9|69%/, /why.*premium/],
    reply: {
      role: 'agent',
      text: 'Two thirds of it is claims experience: the incurred ratio on the expiring year is 113%, mostly from the 46-60 band. The rest is the census growing by 284 lives and the group mix shifting towards the 5L band.',
      evidence: ['Claims Data.xlsx', 'Active_Data 2.xlsx', 'Rating table GH-2026'],
    },
  },
  {
    match: [/how many|count|lives|members|census/],
    reply: {
      role: 'agent',
      text: '3,616 lives across 1,367 employees, in three sum-insured bands. 95% of the pool sits in the lowest band, which is the fact that decides how the quote behaves before any loading is applied.',
      evidence: ['Active_Data 2.xlsx', 'M_s Eicore tech LTD 3.xlsx'],
    },
  },
]

/** The suggestions offered above the composer at a given rung. */
export function suggestionsFor(mode: ModeId): AssistedReply[] {
  return ASSISTED_REPLIES.filter(
    (r) => r.suggest && (!r.modes || r.modes.includes(mode)),
  )
}

/**
 * Route a typed prompt to a reply.
 *
 * Returns `null` when nothing matches, and the caller says so rather than
 * inventing an answer — see the note on `ASSISTED_REPLIES`.
 */
export function matchAssisted(text: string): ChatTurn | null {
  const q = text.toLowerCase()
  for (const entry of ASSISTED_REPLIES) {
    if (entry.match.some((re) => re.test(q))) return entry.reply
  }
  return null
}

/** What the assistant says when it has nothing behind an answer. */
export const NO_MATCH_REPLY: ChatTurn = {
  role: 'agent',
  text: 'Nothing in the three uploaded workbooks answers that, and I am not going to guess at it. Ask me about the census, the prior claims or the RFQ, or point me at a field and I will fill it.',
}

/* ── Hybrid: a document that disagrees with the form ──────────────────── */

/**
 * One field a mid-flow upload has something to say about.
 *
 * The two cases are kept apart because they are not the same decision, and
 * flattening them into one list of "changes" is what makes reconciliation
 * screens feel hostile:
 *
 * - **`fill`** \u2014 the field is empty and the document supplies it. Nothing is
 *   being overwritten, there is no competing claim, and the cost of being
 *   wrong is a value the user can retype. It arrives selected.
 * - **`conflict`** \u2014 the field already holds something and the document says
 *   otherwise. Both sides have a source; the machine has no standing to
 *   decide which source the underwriter meant. It arrives on the FORM's
 *   value, so doing nothing changes nothing.
 *
 * That default is the whole ethic of the rung in one line: a proposing agent
 * may fill your blanks, and may not quietly win an argument with you.
 */
export type ReconcileRow = {
  /** The bus field id the write would land on. */
  field: string
  label: string
  kind: 'conflict' | 'fill'
  /** What the form holds now, and where that came from. */
  current: { value: string; source: string }
  /** What the uploaded document says, and where in it. */
  incoming: { value: string; source: string }
}

/**
 * What the assistant finds when a document is dropped into a run in flight.
 *
 * Scripted, and deliberately not keyed to the file that was actually
 * attached \u2014 the walkthrough takes any file, because the thing being
 * explored is the shape of the answer, not the parsing. What IS honest is
 * that the turn names the file the user chose rather than a fixture's
 * filename, and that the incoming sources are given as locations in that
 * document rather than as openable chips: a citation that cannot be opened
 * should not be dressed as one.
 */
export const RECONCILE_ROWS: ReconcileRow[] = [
  {
    field: 'business.company',
    label: 'Company name',
    kind: 'conflict',
    current: { value: 'M/s Eicore tech LTD', source: 'Expiring policy schedule' },
    incoming: { value: 'M/s Eicore Tech Limited', source: 'Header, p.1' },
  },
  {
    field: 'business.industry',
    label: 'Industry / Sector',
    kind: 'conflict',
    current: { value: 'IT / Technology Services', source: 'Expiring policy schedule' },
    incoming: { value: 'ITES / BPO Services', source: 'Risk details, p.1' },
  },
  {
    field: 'business.startDate',
    label: 'Effective start date',
    kind: 'conflict',
    current: { value: '2026-05-24', source: 'Quotation request' },
    incoming: { value: '2026-06-01', source: 'Cover required from, p.2' },
  },
  {
    field: 'business.gstin',
    label: 'GSTIN',
    kind: 'fill',
    current: { value: '', source: 'Not on any document read so far' },
    incoming: { value: '06AABCE1234F1Z5', source: 'Annexure A' },
  },
]

/** Where a reconciliation lands. Every row here is on the one step. */
export const RECONCILE_TARGET = {
  step: 'Business Details' as Step,
  section: 'business.company',
}

/** What the assistant says when it has read an uploaded document. */
export function reconcileTurn(file: string): ChatTurn {
  const conflicts = RECONCILE_ROWS.filter((r) => r.kind === 'conflict').length
  const fills = RECONCILE_ROWS.length - conflicts
  return {
    role: 'agent',
    text: `I read ${file} against what is already on the form. ${conflicts} values disagree and ${fills} is one I had nothing for. I have not changed anything \u2014 pick a side on each and apply.`,
    file,
    reconcile: RECONCILE_ROWS,
  }
}

/* ── What the agent read ──────────────────────────────────────────────── */

/**
 * The documents behind the evidence chips.
 *
 * A chip that names a file and cannot be opened is a citation you have to
 * take on trust, which is the opposite of what a citation is for. The agent
 * can say "212 dependents over 60" with total confidence and still have
 * counted the wrong sheet — so every chip resolves to this: the document,
 * the exact place inside it, when it arrived, and the values actually pulled
 * out. That last part is the disclosure that matters. Naming the file proves
 * nothing; showing the numbers read out of it is what lets an underwriter
 * confirm the right thing was consulted before they sign.
 *
 * Keyed by the chip's own label, so a chip and its document cannot drift
 * apart: an evidence string with no entry here renders as plain text rather
 * than as a control that opens nothing.
 */
export type QuoteSource = {
  name: string
  format: 'XLSX' | 'PDF' | 'Rate table'
  /** Where inside the document the agent looked. */
  location: string
  /** When it arrived, or which revision it is. */
  dated: string
  /** The values actually pulled out — the point of the whole disclosure. */
  extract: { label: string; value: string }[]
  /** A caveat about the read itself, where there is one. */
  note?: string
  /** The whole document, in `SOURCE_FILES`. */
  fileKey: string
  /** The sheet or page the citation points at — where the file opens. */
  focus?: string
}

export const QUOTE_SOURCES: Record<string, QuoteSource> = {
  'Active_Data 2.xlsx': {
    fileKey: 'Active_Data 2.xlsx',
    focus: 'Sum Insured Bands',
    name: 'Active_Data 2.xlsx',
    format: 'XLSX',
    location: "Sheet 'Active Members Count' · 1,367 rows",
    dated: 'Received 14 May 2026',
    extract: [
      { label: 'Employees', value: '1,367' },
      { label: 'Lives (incl. dependents)', value: '3,616' },
      { label: 'Sum insured bands', value: '3 (3L / 5L / 10L)' },
      { label: 'Share in the 3L band', value: '3,435 lives · 95%' },
      { label: 'Fields read', value: '26 of 26' },
    ],
  },
  'Active_Data 2.xlsx (Sheet: Active Members Count)': {
    fileKey: 'Active_Data 2.xlsx',
    focus: 'Dependents',
    name: 'Active_Data 2.xlsx',
    format: 'XLSX',
    location: "Sheet 'Active Members Count' · age-band columns F-K",
    dated: 'Received 14 May 2026',
    extract: [
      { label: 'Dependents over 60', value: '212' },
      { label: '— spouses', value: '168' },
      { label: '— parents', value: '44' },
      { label: 'Bands they sit in', value: '61-65, 66-70' },
    ],
    note: 'Counted from the dependent rows only. Employees over 60 are a separate column and are not included.',
  },
  'Claims Data.xlsx': {
    fileKey: 'Claims Data.xlsx',
    focus: 'Summary',
    name: 'Claims Data.xlsx',
    format: 'XLSX',
    location: "Sheet 'Paid 2025-26' · 2,904 rows",
    dated: 'Received 14 May 2026',
    extract: [
      { label: 'Incurred ratio', value: '113%' },
      { label: 'Concentration, 46-60 band', value: '~two thirds of burn' },
      { label: 'Maternity vs expected', value: '+34%' },
      { label: 'Fields read', value: '16 of 18' },
    ],
    note: 'Two fields were left for you: the TPA code and the claims cut-off date are not in the dump.',
  },
  'M_s Eicore tech LTD 3.xlsx': {
    fileKey: 'M_s Eicore tech LTD 3.xlsx',
    focus: 'Group Summary',
    name: 'M_s Eicore tech LTD 3.xlsx',
    format: 'XLSX',
    location: "Sheet 'Group Summary'",
    dated: 'Received 14 May 2026',
    extract: [
      { label: 'Groups', value: '3' },
      { label: 'Cover structure', value: 'Family Floater' },
      { label: 'Fields read', value: '9 of 12' },
    ],
  },
  'Broker RFQ, p.1': {
    fileKey: 'Broker RFQ',
    focus: '1',
    name: 'Broker RFQ',
    format: 'PDF',
    location: 'Page 1 · letterhead and risk summary',
    dated: 'Received 12 May 2026',
    extract: [
      { label: 'Legal entity', value: 'M/s Eicore Tech Limited' },
      { label: 'Sector, as written', value: 'IT services' },
      { label: 'Intermediary', value: 'Millennials Insurance Brokers' },
      { label: 'Cover sought', value: 'Group Health, renewal' },
    ],
  },
  'Expiring policy schedule 2025-26': {
    fileKey: 'Expiring policy schedule',
    focus: '1',
    name: 'Expiring policy schedule',
    format: 'PDF',
    location: 'Schedule page 1, and the cover annexure',
    dated: 'Policy year 2025-26',
    extract: [
      { label: 'Period', value: '01 Jun 2025 - 31 May 2026' },
      { label: 'Sector, as written', value: 'ITES' },
      { label: 'Base covers', value: '8 per group, no add-ons' },
      { label: 'Lives at inception', value: '3,332' },
    ],
    note: 'The sector here disagrees with the RFQ. Both map to the same rated sector, so the quote is unaffected either way.',
  },
  'Rating table GH-2026': {
    fileKey: 'Rating table GH-2026',
    focus: 'Age-band loadings',
    name: 'Rating table GH-2026',
    format: 'Rate table',
    location: 'Group Health · age-band loadings',
    dated: 'Effective 01 Apr 2026',
    extract: [
      { label: 'Step-up band', value: '61-65' },
      { label: 'Claims loading applied', value: 'Yes — 113% incurred' },
      { label: 'Premium movement', value: '+69.9%' },
    ],
  },
}

/* ── The files themselves ─────────────────────────────────────────────── */

/**
 * The documents behind the chips, in full.
 *
 * The peek card answers "is this claim sound"; this answers "what else is in
 * here". They are different questions and they deserve different room — an
 * extract of four values is the right size for checking a number against the
 * field it filled, and exactly the wrong size for satisfying yourself that
 * the census says what the agent thinks it says.
 *
 * Keyed by file rather than by citation, because two chips can point at the
 * same workbook from different sheets: `Active_Data 2.xlsx` and
 * `Active_Data 2.xlsx (Sheet: Active Members Count)` are one file and must
 * open as one, on the sheet that was cited.
 *
 * The rows here are a PREVIEW, and the viewer says so rather than implying
 * the sheet is eight rows long. `total` is what is really in the file; the
 * row numbers are the real ones, so a cited row keeps the number an
 * underwriter would find it under when they open the workbook themselves.
 */
export type SourceSheet = {
  name: string
  columns: string[]
  /** `[rowNumber, ...cells]` — the row number is the file's, not the index. */
  rows: (string | number)[][]
  /** Rows in the real sheet. `rows` above is a preview of it. */
  total: number
  /** Row numbers the answer was actually read from. */
  cited?: number[]
}

export type SourcePage = {
  page: number
  heading: string
  lines: string[]
  /** Lines the answer was read from, by index into `lines`. */
  cited?: number[]
}

export type SourceFile = {
  name: string
  format: QuoteSource['format']
  dated: string
  sheets?: SourceSheet[]
  pages?: SourcePage[]
}

export const SOURCE_FILES: Record<string, SourceFile> = {
  'Active_Data 2.xlsx': {
    name: 'Active_Data 2.xlsx',
    format: 'XLSX',
    dated: 'Received 14 May 2026',
    sheets: [
      {
        name: 'Active Members Count',
        columns: ['Employee ID', 'Relation', 'Age', 'Sum insured', 'Age band'],
        total: 3616,
        cited: [418, 419],
        rows: [
          [1, 'EIC-00412', 'Self', 34, '3,00,000', '31-35'],
          [2, 'EIC-00412', 'Spouse', 31, '3,00,000', '31-35'],
          [3, 'EIC-00412', 'Child', 6, '3,00,000', '0-17'],
          [4, 'EIC-00413', 'Self', 41, '5,00,000', '41-45'],
          [5, 'EIC-00414', 'Self', 29, '3,00,000', '26-30'],
          [418, 'EIC-00701', 'Parent', 63, '3,00,000', '61-65'],
          [419, 'EIC-00701', 'Parent', 66, '3,00,000', '66-70'],
          [420, 'EIC-00702', 'Self', 38, '10,00,000', '36-40'],
        ],
      },
      {
        name: 'Sum Insured Bands',
        columns: ['Band', 'Lives', 'Share', 'Cover type'],
        total: 3,
        rows: [
          [1, '3,00,000', 3435, '95.0%', 'Family Floater'],
          [2, '5,00,000', 106, '2.9%', 'Family Floater'],
          [3, '10,00,000', 75, '2.1%', 'Family Floater'],
        ],
      },
      {
        name: 'Dependents',
        columns: ['Relation', 'Count', 'Over 60', 'Bands over 60'],
        total: 3,
        cited: [2, 3],
        rows: [
          [1, 'Spouse', 1203, 168, '61-65, 66-70'],
          [2, 'Parent', 642, 44, '61-65, 66-70'],
          [3, 'Child', 404, 0, '—'],
        ],
      },
    ],
  },
  'Claims Data.xlsx': {
    name: 'Claims Data.xlsx',
    format: 'XLSX',
    dated: 'Received 14 May 2026',
    sheets: [
      {
        name: 'Paid 2025-26',
        columns: ['Claim no.', 'Age band', 'Nature', 'Paid', 'Status'],
        total: 2904,
        cited: [1, 2],
        rows: [
          [1, 'CLM-24118', '46-60', 'Cardiac', '₹8,42,000', 'Paid'],
          [2, 'CLM-24119', '46-60', 'Oncology', '₹6,15,400', 'Paid'],
          [3, 'CLM-24120', '31-35', 'Maternity', '₹72,000', 'Paid'],
          [4, 'CLM-24121', '26-30', 'Maternity', '₹68,500', 'Paid'],
          [5, 'CLM-24122', '0-17', 'Day care', '₹14,200', 'Paid'],
          [6, 'CLM-24123', '61-65', 'Cardiac', '₹4,90,000', 'Paid'],
        ],
      },
      {
        name: 'Summary',
        columns: ['Measure', 'Value', 'Share of burn'],
        total: 5,
        cited: [1, 3],
        rows: [
          [1, 'Incurred ratio', '113%', '—'],
          [2, 'Total paid', '₹1.19 Cr', '100%'],
          [3, 'Maternity', '₹40.4 L', '34%'],
          [4, 'Day care', '₹21.4 L', '18%'],
          [5, 'All other', '₹57.1 L', '48%'],
        ],
      },
    ],
  },
  'M_s Eicore tech LTD 3.xlsx': {
    name: 'M_s Eicore tech LTD 3.xlsx',
    format: 'XLSX',
    dated: 'Received 14 May 2026',
    sheets: [
      {
        name: 'Group Summary',
        columns: ['Group', 'Sum insured', 'Members', 'Cover type'],
        total: 3,
        rows: [
          [1, 'Sum Insured 300000', '3,00,000', 3435, 'Family Floater'],
          [2, 'Sum Insured 500000', '5,00,000', 106, 'Family Floater'],
          [3, 'Sum Insured 1000000', '10,00,000', 75, 'Family Floater'],
        ],
      },
    ],
  },
  'Broker RFQ': {
    name: 'Broker RFQ.pdf',
    format: 'PDF',
    dated: 'Received 12 May 2026',
    pages: [
      {
        page: 1,
        heading: 'Request for Quotation — Group Health',
        cited: [1, 2, 4],
        lines: [
          'Millennials Insurance Brokers Pvt. Ltd., Gurugram',
          'Client: M/s Eicore Tech Limited',
          'Sector: IT services',
          'Registered office: 577, Phase V, Udyog Vihar, Sector 19, Gurugram, Haryana 122016',
          'Cover sought: Group Health, renewal of the expiring programme',
          'Requested inception: on expiry of the current policy',
          'Enclosures: active member census, prior claims dump, expiring schedule',
        ],
      },
      {
        page: 2,
        heading: 'Cover requirements',
        lines: [
          'Base covers to follow the expiring programme unless priced otherwise.',
          'Maternity to remain covered; sub-limit to be confirmed by the insurer.',
          'Day-care procedures as per the standard list.',
          'Corporate buffer: not required this year.',
        ],
      },
    ],
  },
  'Expiring policy schedule': {
    name: 'Expiring policy schedule 2025-26.pdf',
    format: 'PDF',
    dated: 'Policy year 2025-26',
    pages: [
      {
        page: 1,
        heading: 'Policy schedule',
        cited: [1, 2, 3],
        lines: [
          'Insured: M/s Eicore Tech Limited',
          'Sector: ITES',
          'Period of insurance: 01 Jun 2025 to 31 May 2026',
          'Lives at inception: 3,332',
          'Premium: ₹62,41,000 (excl. GST)',
        ],
      },
      {
        page: 2,
        heading: 'Cover annexure',
        cited: [0],
        lines: [
          'Base covers: 8 per group — hospitalisation, pre/post, day care, maternity, ambulance, ICU, domiciliary, AYUSH.',
          'Add-on covers: none.',
          'Applies identically to all three sum-insured groups.',
        ],
      },
    ],
  },
  'Rating table GH-2026': {
    name: 'Rating table GH-2026',
    format: 'Rate table',
    dated: 'Effective 01 Apr 2026',
    sheets: [
      {
        name: 'Age-band loadings',
        columns: ['Age band', 'Base rate', 'Loading', 'Effective'],
        total: 8,
        cited: [6, 7],
        rows: [
          [1, '0-17', '0.82', '—', '0.82'],
          [2, '18-25', '0.90', '—', '0.90'],
          [3, '26-30', '1.00', '—', '1.00'],
          [4, '31-35', '1.08', '—', '1.08'],
          [5, '36-45', '1.24', '—', '1.24'],
          [6, '46-60', '1.66', '+12%', '1.86'],
          [7, '61-65', '2.10', '+18%', '2.48'],
          [8, '66-70', '2.64', '+18%', '3.12'],
        ],
      },
      {
        name: 'Claims loading',
        columns: ['Incurred ratio', 'Loading applied'],
        total: 4,
        cited: [4],
        rows: [
          [1, 'Up to 70%', 'None'],
          [2, '71-85%', '+10%'],
          [3, '86-100%', '+25%'],
          [4, 'Above 100%', '+45%'],
        ],
      },
    ],
  },
}
