import type { Tone } from '@/components/ui/Badge'

/**
 * The underwriting queue, as onebuzz models it
 * (`onebuzz/packages/ui/portal/src/features/underwriting-queue/`).
 *
 * Field names, statuses, the status-tab groupings and the TAT/priority
 * generator are taken from that code. The rows themselves are invented:
 * onebuzz reads them from its API and carries no fixtures.
 */

export type Segment = 'retail' | 'group'
export type Ownership = 'assigned' | 'unassigned' | 'other'
export type Priority = 'High' | 'Medium' | 'Low'

export type QueueRow = {
  id: string
  /** `null` for a pending execution that has no quotation number yet. */
  quotationNo: string | null
  businessType: string
  clientName: string | null
  clientPhone: string
  plan: string | null
  sumInsured: number | null
  premium: number
  createdAt: string
  tatElapsedHours: number
  tatSlaHours: number
  priority: Priority
  status: string
  segment: Segment
  ownership: Ownership
  assigneeLabel?: string
  referred?: boolean
}

// ---------------------------------------------- generators, as in onebuzz

export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']
const TAT_SLA_OPTIONS = [48, 72, 96]

function hashId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return Math.abs(hash)
}

/** `utils/mock-data.ts` mockPriority — stable per id. */
function mockPriority(id: string): Priority {
  return PRIORITIES[hashId(id) % PRIORITIES.length] ?? 'Medium'
}

/** `utils/mock-data.ts` mockTat — 0..1.2 x SLA, so roughly 17% breach. */
function mockTat(id: string): { elapsed: number; sla: number } {
  const hash = hashId(id)
  const sla = TAT_SLA_OPTIONS[hash % TAT_SLA_OPTIONS.length] ?? 48
  const elapsed = Math.max(1, Math.round(sla * (((hash >> 3) % 120) / 100)))
  return { elapsed, sla }
}

// --------------------------------------------------------------- fixtures

type Seed = Omit<QueueRow, 'tatElapsedHours' | 'tatSlaHours' | 'priority'>

const SEEDS: Seed[] = [
  { id: 'q-0412', quotationNo: 'MAGM-400201-26-7000412-1', businessType: 'Renewal', clientName: 'Ananya Krishnan', clientPhone: '+91 98450 22107', plan: 'Health Shield Plus', sumInsured: 1000000, premium: 24860, createdAt: '2026-09-30', status: 'under_review', segment: 'retail', ownership: 'assigned' },
  { id: 'q-0415', quotationNo: 'MAGM-400201-26-7000415-1', businessType: 'New Business', clientName: 'Rohit Malhotra', clientPhone: '+91 99101 48236', plan: 'Family Floater Gold', sumInsured: 1500000, premium: 38420, createdAt: '2026-09-30', status: 'info_required', segment: 'retail', ownership: 'unassigned' },
  { id: 'p-1081', quotationNo: null, businessType: '', clientName: null, clientPhone: '', plan: null, sumInsured: null, premium: 0, createdAt: '2026-09-30', status: 'paused', segment: 'group', ownership: 'other' },
  { id: 'q-0398', quotationNo: 'MAGM-400201-26-7000398-1', businessType: 'Portability', clientName: 'Meera Pillai', clientPhone: '+91 94470 31952', plan: 'Senior Care Classic', sumInsured: 500000, premium: 41275, createdAt: '2026-09-29', status: 'partial_accepted', segment: 'retail', ownership: 'assigned', referred: true },
  { id: 'q-0402', quotationNo: 'MAGM-400201-26-7000402-1', businessType: 'New Business', clientName: 'Northwind Logistics Pvt Ltd', clientPhone: '+91 80 4123 9900', plan: 'Group Health Standard', sumInsured: 300000, premium: 1842000, createdAt: '2026-09-29', status: 'negotiated', segment: 'group', ownership: 'other', assigneeLabel: 'Senior UW · Group' },
  { id: 'q-0391', quotationNo: 'MAGM-400201-26-7000391-1', businessType: 'Renewal', clientName: 'Vikram Sethi', clientPhone: '+91 98201 77345', plan: 'Health Shield Plus', sumInsured: 700000, premium: 19340, createdAt: '2026-09-28', status: 'counter_offered', segment: 'retail', ownership: 'assigned' },
  { id: 'q-0388', quotationNo: 'MAGM-400201-26-7000388-1', businessType: 'Roll Over', clientName: 'Fatima Sheikh', clientPhone: '+91 90040 61128', plan: 'Family Floater Gold', sumInsured: 2000000, premium: 46910, createdAt: '2026-09-28', status: 'under_review', segment: 'retail', ownership: 'unassigned' },
  { id: 'q-0002', quotationNo: 'MAGM-400201-26-7000002-1', businessType: 'Renewal', clientName: 'M/s Eicore tech LTD', clientPhone: '+91 22 6170 4400', plan: 'Group Health Enhanced', sumInsured: 500000, premium: 16477850, createdAt: '2026-09-27', status: 'under_review', segment: 'group', ownership: 'assigned', referred: true },
  { id: 'q-0384', quotationNo: 'MAGM-400201-26-7000384-1', businessType: 'New Business', clientName: 'Arjun Reddy', clientPhone: '+91 97000 15563', plan: 'Health Shield Basic', sumInsured: 300000, premium: 8650, createdAt: '2026-09-27', status: 'rejected', segment: 'retail', ownership: 'assigned' },
  { id: 'p-1077', quotationNo: null, businessType: '', clientName: null, clientPhone: '', plan: null, sumInsured: null, premium: 0, createdAt: '2026-09-27', status: 'failed', segment: 'retail', ownership: 'other' },
  { id: 'q-0379', quotationNo: 'MAGM-400201-26-7000379-1', businessType: 'Renewal', clientName: 'Kavya Iyer', clientPhone: '+91 99860 40271', plan: 'Senior Care Classic', sumInsured: 1000000, premium: 52300, createdAt: '2026-09-26', status: 'under_review', segment: 'retail', ownership: 'other', assigneeLabel: 'R. Bose' },
  { id: 'q-0376', quotationNo: 'MAGM-400201-26-7000376-1', businessType: 'New Business', clientName: 'Brightpath Schools Trust', clientPhone: '+91 40 2788 1300', plan: 'Group Health Standard', sumInsured: 200000, premium: 624500, createdAt: '2026-09-26', status: 'counter_offered', segment: 'group', ownership: 'unassigned' },
  { id: 'q-0371', quotationNo: 'MAGM-400201-26-7000371-1', businessType: 'Portability', clientName: 'Sanjay Kulkarni', clientPhone: '+91 98220 93014', plan: 'Health Shield Plus', sumInsured: 1500000, premium: 31780, createdAt: '2026-09-25', status: 'underwriting', segment: 'retail', ownership: 'unassigned' },
  { id: 'q-0368', quotationNo: 'MAGM-400201-26-7000368-1', businessType: 'Renewal', clientName: 'Priyanka Das', clientPhone: '+91 90510 27649', plan: 'Family Floater Silver', sumInsured: 500000, premium: 17250, createdAt: '2026-09-25', status: 'partial_accepted', segment: 'retail', ownership: 'assigned' },
  { id: 'q-0365', quotationNo: 'MAGM-400201-26-7000365-1', businessType: 'Renewal', clientName: 'Coastline Foods LLP', clientPhone: '+91 484 239 7700', plan: 'Group Health Enhanced', sumInsured: 400000, premium: 2318400, createdAt: '2026-09-24', status: 'under_review', segment: 'group', ownership: 'other', assigneeLabel: 'Senior UW · Group' },
  { id: 'q-0361', quotationNo: 'MAGM-400201-26-7000361-1', businessType: 'New Business', clientName: 'Nikhil Joshi', clientPhone: '+91 99300 56782', plan: 'Health Shield Basic', sumInsured: 500000, premium: 11420, createdAt: '2026-09-24', status: 'under_review', segment: 'retail', ownership: 'assigned' },
  { id: 'q-0357', quotationNo: 'MAGM-400201-26-7000357-1', businessType: 'Roll Over', clientName: 'Lakshmi Narayanan', clientPhone: '+91 94440 18836', plan: 'Senior Care Classic', sumInsured: 700000, premium: 47960, createdAt: '2026-09-23', status: 'rejected', segment: 'retail', ownership: 'unassigned' },
  { id: 'p-1069', quotationNo: null, businessType: '', clientName: null, clientPhone: '', plan: null, sumInsured: null, premium: 0, createdAt: '2026-09-23', status: 'paused', segment: 'group', ownership: 'other' },
  { id: 'q-0352', quotationNo: 'MAGM-400201-26-7000352-1', businessType: 'Renewal', clientName: 'Deepak Chauhan', clientPhone: '+91 98110 64490', plan: 'Family Floater Gold', sumInsured: 1000000, premium: 29870, createdAt: '2026-09-22', status: 'counter_offered', segment: 'retail', ownership: 'assigned' },
  { id: 'q-0349', quotationNo: 'MAGM-400201-26-7000349-1', businessType: 'New Business', clientName: 'Aurora Textiles Ltd', clientPhone: '+91 261 246 8810', plan: 'Group Health Standard', sumInsured: 300000, premium: 1104300, createdAt: '2026-09-22', status: 'info_required', segment: 'group', ownership: 'unassigned' },
  { id: 'q-0345', quotationNo: 'MAGM-400201-26-7000345-1', businessType: 'Portability', clientName: 'Sneha Banerjee', clientPhone: '+91 90070 33415', plan: 'Health Shield Plus', sumInsured: 1000000, premium: 23940, createdAt: '2026-09-21', status: 'under_review', segment: 'retail', ownership: 'other', assigneeLabel: 'R. Bose' },
  { id: 'q-0341', quotationNo: 'MAGM-400201-26-7000341-1', businessType: 'Renewal', clientName: 'Harish Menon', clientPhone: '+91 94960 72058', plan: 'Family Floater Silver', sumInsured: 700000, premium: 21110, createdAt: '2026-09-20', status: 'partial_accepted', segment: 'retail', ownership: 'unassigned' },
  { id: 'q-0338', quotationNo: 'MAGM-400201-26-7000338-1', businessType: 'Renewal', clientName: 'Orbit Fintech Pvt Ltd', clientPhone: '+91 80 6790 2200', plan: 'Group Health Enhanced', sumInsured: 500000, premium: 3412600, createdAt: '2026-09-19', status: 'negotiated', segment: 'group', ownership: 'assigned' },
  { id: 'q-0334', quotationNo: 'MAGM-400201-26-7000334-1', businessType: 'New Business', clientName: 'Ritu Agarwal', clientPhone: '+91 98290 41167', plan: 'Health Shield Basic', sumInsured: 300000, premium: 7980, createdAt: '2026-09-18', status: 'under_review', segment: 'retail', ownership: 'assigned' },
  { id: 'q-0330', quotationNo: 'MAGM-400201-26-7000330-1', businessType: 'Roll Over', clientName: 'Gaurav Bhatia', clientPhone: '+91 99580 26631', plan: 'Senior Care Classic', sumInsured: 500000, premium: 39540, createdAt: '2026-09-17', status: 'underwriting', segment: 'retail', ownership: 'unassigned' },
]

export const ROWS: QueueRow[] = SEEDS.map((s) => {
  const tat = mockTat(s.id)
  return { ...s, tatElapsedHours: tat.elapsed, tatSlaHours: tat.sla, priority: mockPriority(s.id) }
})

// ----------------------------------------------------- status vocabulary

/**
 * `constants/status-badge.ts` paints every queue status amber, which leaves
 * the column carrying no information. The tones here split them by who the
 * case is waiting on.
 */
export const STATUS_TONE: Record<string, Tone> = {
  // A pending row is a workflow execution, so it carries the run's state.
  paused: 'neutral',
  failed: 'danger',
  pending_review: 'warning',
  info_required: 'warning',
  underwriting: 'warning',
  under_review: 'warning',
  partial_accepted: 'alert',
  rejected: 'alert',
  counter_offered: 'info',
  negotiated: 'info',
}

/** Statuses that need someone now — the only ones that carry a dot (§4.11). */
export const STATUS_ATTENTION = new Set(['failed'])

export const PRIORITY_TONE: Record<Priority, Tone> = { High: 'danger', Medium: 'warning', Low: 'neutral' }

export const prettifyStatus = (status: string) =>
  status
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')

/** The status tabs, with the groupings `default.tsx` uses for each. */
export const STATUS_TABS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'pending_review', label: 'Pending review', match: (r: QueueRow) => ['pending_review', 'underwriting', 'info_required', 'pending'].includes(r.status) },
  { key: 'urgent', label: 'Urgent', match: (r: QueueRow) => r.priority === 'High' },
  { key: 'counter_offered', label: 'Counter-offered', match: (r: QueueRow) => r.status === 'counter_offered' },
  { key: 'partial_accepted', label: 'Partial accepted', match: (r: QueueRow) => r.status === 'partial_accepted' },
  { key: 'resolved', label: 'Resolved', match: (r: QueueRow) => ['approved', 'finalized', 'converted', 'rejected'].includes(r.status) },
] as const

export type StatusTabKey = (typeof STATUS_TABS)[number]['key']

/** Counter offers wait on the customer, so they cannot be taken or reassigned. */
export const isAssignable = (r: QueueRow) => !['counter_offered', 'negotiated'].includes(r.status)

// ------------------------------------------------------------ formatting

export const formatInr = (n: number) => '₹' + n.toLocaleString('en-IN')

export const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

/** `formatTatLabel` — remaining time, or Breached. */
export const formatTat = (elapsed: number, sla: number) => {
  const left = sla - elapsed
  if (left <= 0) return 'Breached'
  const d = Math.floor(left / 24)
  const h = left % 24
  return d === 0 ? `${h}h` : `${d}d ${h}h`
}
