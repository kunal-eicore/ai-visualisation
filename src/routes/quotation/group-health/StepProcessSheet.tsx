import { Download, FileSpreadsheet, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MetricCard } from '@/components/ui/MetricCard'
import { Figure, KeyValue, KeyValues, SectionCard, Table, Td, Th, TotalRow } from './parts'
import {
  BUSINESS_DEFAULTS,
  BASE_COVER_COUNT,
  MEMBER_GROUPS,
  PREMIUM,
  PREMIUM_BY_AGE_BAND,
  PREMIUM_PER_MEMBER,
  PREMIUM_TOTALS,
  QUOTATION_NUMBER,
  formatInr,
} from './data'
import { useHandoffProps } from './Handoffs'

/**
 * Step 7 — Process Sheet (the second checkpoint).
 *
 * The calculator has run, the quotation number is minted, and the premium is
 * the first number on this screen that nobody typed. Everything above the
 * fold answers one question: is this priced sensibly against last year?
 *
 * Hence the three-card strip — current, previous, change — rather than a
 * single big premium. A +69.9% renewal is the finding; a lone total hides it.
 * This is the one screen in the flow where a KPI strip is the right shape,
 * because these three numbers ARE the content, not a restatement of a table
 * further down.
 *
 * The premium table is money in a grid, so it follows the money rules and
 * nothing else: right-aligned tabular figures, one row per age band.
 *
 * Its total takes `TotalRow`'s brand ground rather than the sunken one every
 * other table in the flow uses, and that split is the point: elsewhere a last
 * row is a RECONCILIATION — a census total whose job is to agree with a head
 * count — so it stays recessive. Here it is the RESULT, the figure the whole
 * run exists to produce, so it is the one total on any screen that gets the
 * brand band. The derived per-member row sits below it on the plain ground,
 * which is the hierarchy the old screen had inverted: the per-member row was
 * tinted and the total was not.
 */
export function StepProcessSheet() {
  const premiumHandoff = useHandoffProps('process.premium')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-lg font-semibold text-default">Process Sheet</h2>
          <span className="font-mono text-sm text-subtle">{QUOTATION_NUMBER}</span>
        </div>
        <Button size="sm" variant="neutral">
          <Download aria-hidden className="h-4 w-4" />
          Download summary
        </Button>
        <Button size="sm" variant="neutral">
          <FileSpreadsheet aria-hidden className="h-4 w-4" />
          Documents
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          label="Current total premium"
          value={PREMIUM.current}
          note={`${MEMBER_GROUPS.length} groups combined`}
        />
        <MetricCard label="Previous year premium" value={PREMIUM.previous} note="Prior policy period" />
        <MetricCard
          label="Change"
          value={PREMIUM.changePct}
          tone="warning"
          trend={
            <Badge tone="warning" icon={<TrendingUp aria-hidden className="h-3 w-3" />}>
              {PREMIUM.changeAbs}
            </Badge>
          }
        />
      </div>

      <SectionCard title="Business &amp; Policy">
        <KeyValues cols="sm:grid-cols-2 lg:grid-cols-3">
          <KeyValue label="Product" value="Group Health" />
          <KeyValue label="Company" value={BUSINESS_DEFAULTS.company} />
          <KeyValue label="Quotation type" value={BUSINESS_DEFAULTS.quotationType} />
          <KeyValue label="Business type" value={`${BUSINESS_DEFAULTS.businessType} Business`} />
          <KeyValue label="Policy period" value="24 May 2026 – 23 May 2027" />
          <KeyValue label="Inward type" value={BUSINESS_DEFAULTS.inward} />
        </KeyValues>
      </SectionCard>

      <SectionCard
        id="process.premium"
        title="Premium per age band"
        {...premiumHandoff}
        meta={<span className="text-sm text-muted">Age bands down, groups across</span>}
        pad={false}
      >
        <Table>
          <thead>
            <tr>
              <Th>Age band</Th>
              {MEMBER_GROUPS.map((g) => (
                <Th key={g.id} align="right">
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="text-base font-semibold normal-case tracking-normal text-default">
                      {formatInr(g.sumInsured)}
                    </span>
                    <span className="font-sans text-xs normal-case tracking-normal text-muted">
                      {g.members.toLocaleString('en-IN')} members
                    </span>
                  </span>
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PREMIUM_BY_AGE_BAND.map((row) => (
              <tr key={row.band}>
                <Td strong>{row.band}</Td>
                {row.values.map((value, i) => (
                  <Td key={MEMBER_GROUPS[i].id} align="right">
                    {value}
                  </Td>
                ))}
              </tr>
            ))}
            {/* The result, not a reconciliation — hence the brand ground.
                See `TotalRow`. */}
            <TotalRow tone="brand">
              <Td strong>Total premium</Td>
              {PREMIUM_TOTALS.map((value, i) => (
                <Td key={MEMBER_GROUPS[i].id} align="right" strong>
                  {value}
                </Td>
              ))}
            </TotalRow>
            <tr>
              <Td strong>Per member</Td>
              {PREMIUM_PER_MEMBER.map((value, i) => (
                <Td key={MEMBER_GROUPS[i].id} align="right" strong>
                  {value}
                </Td>
              ))}
            </tr>
          </tbody>
        </Table>
      </SectionCard>

      {/* Per-group roll-up.
          
          A TABLE, which is what it should have been from the start. It was a
          list of content-width label/value pairs with fixed gaps, so every
          column drifted with the width of the figure under it — ₹1,43,19,425
          pushed its neighbours right, ₹8,47,847 did not, and nothing lined up
          down the card. It also repeated four labels on every row and left
          the right half of the card empty.

          Members, premium, per-member and add-ons are all comparable DOWN
          the column, which is the definition of a table column: the header
          says each label once and the figures share an edge you can read
          against. */}
      <SectionCard
        title="Groups &amp; Covers"
        meta={<Figure value={BASE_COVER_COUNT} label="base covers on every group" />}
        pad={false}
      >
        <Table>
          <thead>
            <tr>
              <Th>Sum insured</Th>
              <Th>SI type</Th>
              <Th align="right">Members</Th>
              <Th align="right">Premium</Th>
              <Th align="right">Per member</Th>
              <Th align="right">Add-ons</Th>
            </tr>
          </thead>
          <tbody>
            {MEMBER_GROUPS.map((group, i) => (
              <tr key={group.id}>
                <Td strong>{formatInr(group.sumInsured)}</Td>
                <Td>{group.siType}</Td>
                <Td align="right">{group.members.toLocaleString('en-IN')}</Td>
                <Td align="right" strong>
                  {PREMIUM_TOTALS[i]}
                </Td>
                <Td align="right">{PREMIUM_PER_MEMBER[i]}</Td>
                <Td align="right">0</Td>
              </tr>
            ))}
            <TotalRow>
              <Td strong>Total</Td>
              <Td />
              <Td align="right" strong>
                {MEMBER_GROUPS.reduce((sum, g) => sum + g.members, 0).toLocaleString('en-IN')}
              </Td>
              <Td align="right" strong>
                {PREMIUM.current}
              </Td>
              {/* Per member is an average, and an average of averages is not
                  a sum — so this column has no total rather than a wrong one. */}
              <Td />
              <Td align="right" strong>
                0
              </Td>
            </TotalRow>
          </tbody>
        </Table>
      </SectionCard>
    </div>
  )
}

