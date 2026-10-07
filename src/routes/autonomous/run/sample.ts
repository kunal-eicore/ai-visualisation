import type { QueueRow } from '../queue/data'

/**
 * The cases that arrive while the run is going: 38 invented cases after the
 * 22 queue rows, so the line ends up holding 60. Generated deterministically, so
 * every load is the same run. Same shape and status vocabulary as the queue's
 * own fixtures; nothing here exists in onebuzz.
 */

const FIRST = ['Aditi', 'Karan', 'Neha', 'Suresh', 'Pooja', 'Imran', 'Divya', 'Manoj', 'Shreya', 'Anil', 'Tanvi', 'Rahul', 'Bhavna', 'Yusuf', 'Isha', 'Varun']
const LAST = ['Sharma', 'Nair', 'Gupta', 'Rao', 'Mehta', 'Qureshi', 'Pillai', 'Desai', 'Bose', 'Kapoor', 'Iyer', 'Saxena', 'Ghosh', 'Khan']
const COMPANIES = ['Meridian Agro Pvt Ltd', 'Bluefin Shipping LLP', 'Sahyadri Hospitals Trust', 'Vertex Motors Ltd', 'Pinewood Retail Pvt Ltd', 'Kaveri Cement Ltd', 'Lumen Software Pvt Ltd', 'Harbour Freight Co', 'Indus Pharma Ltd', 'Greenleaf Hotels Pvt Ltd']
const RETAIL_PLANS = ['Health Shield Plus', 'Health Shield Basic', 'Family Floater Gold', 'Family Floater Silver', 'Senior Care Classic']
const GROUP_PLANS = ['Group Health Standard', 'Group Health Enhanced']
const TYPES = ['New Business', 'Renewal', 'Portability', 'Roll Over']
/** Weighted towards the clean path, as a real queue would be. */
const STATUSES = ['under_review', 'under_review', 'under_review', 'underwriting', 'counter_offered', 'partial_accepted', 'rejected', 'info_required']

export const LARGE_EXTRA: QueueRow[] = Array.from({ length: 38 }, (_, i) => {
  const group = i % 5 === 2
  const n = 7000500 + i * 7
  const status = STATUSES[(i * 5 + 3) % STATUSES.length]
  const sla = [48, 72, 96][i % 3]
  return {
    id: `g-${String(i + 1).padStart(3, '0')}`,
    quotationNo: `MAGM-400201-26-${n}-1`,
    businessType: TYPES[i % TYPES.length],
    clientName: group ? COMPANIES[i % COMPANIES.length] : `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`,
    clientPhone: '',
    plan: group ? GROUP_PLANS[i % 2] : RETAIL_PLANS[i % RETAIL_PLANS.length],
    sumInsured: group ? [200000, 300000, 500000][i % 3] : [300000, 500000, 700000, 1000000, 1500000][i % 5],
    premium: group ? 400000 + ((i * 137) % 30) * 100000 : 7000 + ((i * 53) % 45) * 1000,
    createdAt: '2026-10-06',
    tatElapsedHours: Math.round(sla * (((i * 37) % 110) / 100)),
    tatSlaHours: sla,
    priority: (['High', 'Medium', 'Low'] as const)[i % 3],
    status,
    segment: group ? 'group' : 'retail',
    ownership: 'unassigned',
    referred: i % 13 === 6,
  }
})

/** Why a generated `info_required` case stops, by the stage it stops at. */
export const LARGE_BLOCK_REASONS: { stage: number; reason: string }[] = [
  { stage: 1, reason: 'Address proof is unreadable, the scan is cropped' },
  { stage: 1, reason: 'Discharge summary for the 2024 admission is missing' },
  { stage: 2, reason: 'Declared height and weight give a BMI outside any table' },
  { stage: 1, reason: 'Member census has duplicate employee IDs' },
  { stage: 2, reason: 'Previous policy shows a claim not declared on the proposal' },
]
