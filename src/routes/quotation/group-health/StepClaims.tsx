import { useState } from 'react'
import { FileText, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Callout } from '@/components/ui/Callout'
import { cn } from '@/lib/cn'
import { Collapsible, SectionCard, Table, Td, Th, TotalRow } from './parts'
import {
  AGE_WISE_CLAIMS,
  AGE_WISE_TOTAL,
  AMOUNT_WISE_CLAIMS,
  CASHLESS_VS_REIMB,
  CLAIMS_STATUS,
  DISEASE_ANALYSIS,
  EMPLOYEE_VS_DEPENDENT,
  MONTH_WISE_CLAIMS,
  SERVICING_MODES,
  SI_BAND_CLAIMS,
  TOP_HOSPITALS,
  TPA_LIBRARY,
  type ServicingMode,
} from './data'

/**
 * Step 5 — Claims & TPA.
 *
 * Two jobs in one step, and they pull in opposite directions: one decision
 * (who services the claims) and eight tables of prior-claims analytics that
 * the underwriter will price off.
 *
 * The decision goes on top and stays expanded; every analytics table is
 * collapsible and only the first opens by default. Prior claims is reference
 * material — it earns its place by being available, not by being unavoidable.
 */
export function StepClaims() {
  const [mode, setMode] = useState<ServicingMode>('In-House')
  const [tpaId, setTpaId] = useState(TPA_LIBRARY[0].id)
  const [open, setOpen] = useState<Record<string, boolean>>({ age: true })

  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-default">Claims &amp; TPA</h2>
        <p className="text-base text-subtle">
          Configure TPA servicing and review prior claims analytics.
        </p>
      </div>

      <SectionCard title="TPA &amp; Network">
        <div className="grid gap-3 md:grid-cols-2">
          {SERVICING_MODES.map((option) => {
            const selected = mode === option
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => setMode(option)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors duration-base',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  selected
                    ? 'border-primary bg-brand-bg'
                    : 'border-default bg-surface-card hover:border-strong',
                )}
              >
                {option === 'In-House' ? (
                  <FileText aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                ) : (
                  <Users aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                )}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-base font-semibold text-default">{option}</span>
                  <span className="text-sm text-subtle">
                    {option === 'In-House' ? 'Claims handled by insurer' : 'Third Party Administrator'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {mode === 'In-House' ? (
          <Callout>Claims handled directly by insurer. No TPA needed.</Callout>
        ) : (
          <ul className="flex flex-col gap-2">
            {TPA_LIBRARY.map((tpa) => {
              const selected = tpaId === tpa.id
              return (
                <li key={tpa.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setTpaId(tpa.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors duration-base',
                      'focus-visible:outline-none focus-visible:shadow-focus',
                      selected ? 'border-primary bg-brand-bg' : 'border-default hover:bg-neutral-50',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-base text-default">{tpa.name}</span>
                    <Badge tone="neutral">{tpa.code}</Badge>
                    <span className="shrink-0 text-sm text-subtle">{tpa.network}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      <Collapsible
        title="Age-wise Claims Summary"
        open={Boolean(open.age)}
        onToggle={() => toggle('age')}
      >
        <Table>
          <thead>
            <tr>
              <Th>Age band</Th>
              <Th align="right">Cashless claims</Th>
              <Th align="right">Cashless amt</Th>
              <Th align="right">Cashless ACS</Th>
              <Th align="right">Reimb claims</Th>
              <Th align="right">Reimb amt</Th>
              <Th align="right">Reimb ACS</Th>
              <Th align="right">Total claims</Th>
              <Th align="right">Total amt</Th>
              <Th align="right">Total ACS</Th>
            </tr>
          </thead>
          <tbody>
            {AGE_WISE_CLAIMS.map((row) => (
              <tr key={row.band}>
                <Td strong>{row.band}</Td>
                <Td align="right">{row.cashlessClaims}</Td>
                <Td align="right">{row.cashlessAmt}</Td>
                <Td align="right">{row.cashlessAcs}</Td>
                <Td align="right">{row.reimbClaims}</Td>
                <Td align="right">{row.reimbAmt}</Td>
                <Td align="right">{row.reimbAcs}</Td>
                <Td align="right">{row.totalClaims}</Td>
                <Td align="right">{row.totalAmt}</Td>
                <Td align="right">{row.totalAcs}</Td>
              </tr>
            ))}
            <TotalRow>
              <Td strong>{AGE_WISE_TOTAL.band}</Td>
              <Td align="right">{AGE_WISE_TOTAL.cashlessClaims}</Td>
              <Td align="right">{AGE_WISE_TOTAL.cashlessAmt}</Td>
              <Td align="right">{AGE_WISE_TOTAL.cashlessAcs}</Td>
              <Td align="right">{AGE_WISE_TOTAL.reimbClaims}</Td>
              <Td align="right">{AGE_WISE_TOTAL.reimbAmt}</Td>
              <Td align="right">{AGE_WISE_TOTAL.reimbAcs}</Td>
              <Td align="right">{AGE_WISE_TOTAL.totalClaims}</Td>
              <Td align="right">{AGE_WISE_TOTAL.totalAmt}</Td>
              <Td align="right">{AGE_WISE_TOTAL.totalAcs}</Td>
            </TotalRow>
          </tbody>
        </Table>
      </Collapsible>

      <Collapsible title="Claims Status Summary" open={Boolean(open.status)} onToggle={() => toggle('status')}>
        <Table>
          <thead>
            <tr>
              <Th>Status</Th>
              <Th />
              <Th align="right">No. claims</Th>
              <Th align="right">Claims/OS amt</Th>
              <Th align="right">Paid amount</Th>
            </tr>
          </thead>
          <tbody>
            {CLAIMS_STATUS.map((row) => (
              <tr key={row.status}>
                <Td strong>{row.status}</Td>
                <Td>{row.sub}</Td>
                <Td align="right">{row.count}</Td>
                <Td align="right">{row.amount}</Td>
                <Td align="right">{row.paid}</Td>
              </tr>
            ))}
            <TotalRow>
              <Td strong>Total</Td>
              <Td />
              <Td align="right">29</Td>
              <Td align="right">₹16,32,942</Td>
              <Td align="right">₹15,14,771</Td>
            </TotalRow>
          </tbody>
        </Table>
      </Collapsible>

      <Collapsible title="Cashless vs Reimbursement" open={Boolean(open.split)} onToggle={() => toggle('split')}>
        <Table>
          <thead>
            <tr>
              <Th>Type</Th>
              <Th align="right">No. of claims</Th>
              <Th align="right">Amount</Th>
              <Th>% of total</Th>
              <Th align="right">Avg claim size</Th>
            </tr>
          </thead>
          <tbody>
            {CASHLESS_VS_REIMB.map((row) => (
              <tr key={row.type}>
                <Td strong>{row.type}</Td>
                <Td align="right">{row.claims}</Td>
                <Td align="right">{row.amount}</Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-24 shrink-0 rounded-full bg-neutral-200">
                      <span
                        aria-hidden
                        className={cn(
                          'block h-1.5 rounded-full',
                          row.type === 'Cashless' ? 'bg-primary' : 'bg-warning-500',
                        )}
                        style={{ width: `${row.pct}%` }}
                      />
                    </span>
                    <span className="tabular-nums">{row.pct}%</span>
                  </span>
                </Td>
                <Td align="right">{row.avg}</Td>
              </tr>
            ))}
            <TotalRow>
              <Td strong>Total</Td>
              <Td align="right">29</Td>
              <Td align="right">₹15,14,771</Td>
              <Td>100%</Td>
              <Td align="right">₹52,233</Td>
            </TotalRow>
          </tbody>
        </Table>
      </Collapsible>

      <Collapsible
        title="Claims by Employee vs Dependents"
        open={Boolean(open.relationship)}
        onToggle={() => toggle('relationship')}
      >
        <Table>
          <thead>
            <tr>
              <Th>Relationship</Th>
              <Th align="right">No. of claims</Th>
              <Th align="right">Amount</Th>
              <Th align="right">Avg claim size</Th>
            </tr>
          </thead>
          <tbody>
            {EMPLOYEE_VS_DEPENDENT.map((row) => (
              <tr key={row.relationship}>
                <Td strong>{row.relationship}</Td>
                <Td align="right">{row.claims}</Td>
                <Td align="right">{row.amount}</Td>
                <Td align="right">{row.avg}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Collapsible>

      <Collapsible title="Claim Amount-wise Analysis" open={Boolean(open.amount)} onToggle={() => toggle('amount')}>
        <BandTable rows={AMOUNT_WISE_CLAIMS} head="Amount band" />
      </Collapsible>

      <Collapsible title="SI Band-wise Claims" open={Boolean(open.si)} onToggle={() => toggle('si')}>
        <BandTable rows={SI_BAND_CLAIMS} head="SI band" />
      </Collapsible>

      <Collapsible title="Month-wise Claims Trend" open={Boolean(open.month)} onToggle={() => toggle('month')}>
        <Table>
          <thead>
            <tr>
              <Th>Month</Th>
              <Th align="right">No. claims</Th>
              <Th align="right">Amount</Th>
              <Th>Bar</Th>
            </tr>
          </thead>
          <tbody>
            {MONTH_WISE_CLAIMS.map((row) => (
              <tr key={row.month}>
                <Td strong>{row.month}</Td>
                <Td align="right">{row.claims}</Td>
                <Td align="right">{row.amount}</Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-32 shrink-0 rounded-full bg-neutral-200">
                      <span
                        aria-hidden
                        className="block h-1.5 rounded-full bg-primary"
                        style={{ width: `${Math.max(row.pct, 2)}%` }}
                      />
                    </span>
                    <span className="tabular-nums">{row.pct}%</span>
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Collapsible>

      <Collapsible
        title="Disease Analysis — Top 10"
        open={Boolean(open.disease)}
        onToggle={() => toggle('disease')}
      >
        <Table>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Disease category</Th>
              <Th align="right">Total claims</Th>
              <Th align="right">Total amount</Th>
              <Th align="right">ACS</Th>
            </tr>
          </thead>
          <tbody>
            {DISEASE_ANALYSIS.map((row) => (
              <tr key={row.category}>
                <Td>{row.rank}</Td>
                <Td strong>{row.category}</Td>
                <Td align="right">{row.claims}</Td>
                <Td align="right">{row.amount}</Td>
                <Td align="right">{row.acs}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Collapsible>

      <Collapsible title="Top Hospitals" open={Boolean(open.hospitals)} onToggle={() => toggle('hospitals')}>
        <Table>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Hospital</Th>
              <Th>Zone</Th>
              <Th align="right">Claims</Th>
              <Th align="right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {TOP_HOSPITALS.map((row) => (
              <tr key={row.hospital}>
                <Td>{row.rank}</Td>
                <Td strong>{row.hospital}</Td>
                <Td>
                  <Badge tone="neutral">{row.zone}</Badge>
                </Td>
                <Td align="right">{row.claims}</Td>
                <Td align="right">{row.amount}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Collapsible>
    </div>
  )
}

type BandRow = {
  band: string
  cashlessClaims: number
  cashlessAmt: string
  reimbClaims: number
  reimbAmt: string
  totalClaims: number
  totalAmt: string
  pctClaims: string
  pctValue: string
}

/** Amount-band and SI-band tables are the same eight columns over a different
 *  first column, so they share one renderer rather than one each. */
function BandTable({ rows, head }: { rows: BandRow[]; head: string }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{head}</Th>
          <Th align="right">Cashless claims</Th>
          <Th align="right">Cashless amt</Th>
          <Th align="right">Reimb claims</Th>
          <Th align="right">Reimb amt</Th>
          <Th align="right">Total claims</Th>
          <Th align="right">Total amt</Th>
          <Th align="right">% claims</Th>
          <Th align="right">% value</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.band}>
            <Td strong>{row.band}</Td>
            <Td align="right">{row.cashlessClaims}</Td>
            <Td align="right">{row.cashlessAmt}</Td>
            <Td align="right">{row.reimbClaims}</Td>
            <Td align="right">{row.reimbAmt}</Td>
            <Td align="right">{row.totalClaims}</Td>
            <Td align="right">{row.totalAmt}</Td>
            <Td align="right">{row.pctClaims}</Td>
            <Td align="right">{row.pctValue}</Td>
          </tr>
        ))}
        <TotalRow>
          <Td strong>Overall</Td>
          <Td align="right">12</Td>
          <Td align="right">₹9,29,622</Td>
          <Td align="right">17</Td>
          <Td align="right">₹5,85,149</Td>
          <Td align="right">29</Td>
          <Td align="right">₹15,14,771</Td>
          <Td align="right">100%</Td>
          <Td align="right">100%</Td>
        </TotalRow>
      </tbody>
    </Table>
  )
}
