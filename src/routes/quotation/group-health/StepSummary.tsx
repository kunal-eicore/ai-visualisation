import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { BarCell, Figure, KeyValue, KeyValues, SectionCard, Table, Td, Th, TotalRow } from './parts'
import {
  AGE_BANDS,
  BASE_COVERS,
  BASE_COVER_COUNT,
  BUSINESS_DEFAULTS,
  MEMBER_GROUPS,
  RELATIONSHIPS,
  RELATIONSHIP_BREAKUP_BY_GROUP,
  avgFamilySize,
  coverLimit,
  type Step,
  formatInr,
} from './data'

/**
 * Step 6 — Summary (the first checkpoint).
 *
 * Everything captured so far, read-only, before the calculator runs. The
 * point of the step is the one after it: once the premium is calculated the
 * inputs are locked, so this is the last cheap place to notice a wrong
 * industry code or a missing add-on.
 *
 * Every card carries an Edit that jumps back to the step that owns the data
 * rather than letting the user edit in place. A summary you can edit is not a
 * summary — it is a fourth copy of the form.
 *
 * Three things went, and they went for the same reason: a review page is
 * nothing but values, so anything that decorates a value decorates the whole
 * page and distinguishes nothing.
 *
 * - **The boxed field grid.** Every review screen in the wild — Deputy,
 *   Zillow, Remote, Airwallex — is one hairline-divided list of label over
 *   value. DESIGN.md §4.20 names the same shape ("Key-Value Rows"). A
 *   rectangle per field was seven boxes across and one more line of chrome
 *   per fact.
 * - **The four-tile metric strip.** Total members / groups / base / add-on,
 *   with "0 add-on covers" wearing a warning tone. No review page opens on
 *   KPI tiles: the counts belong on the section they describe, which is
 *   where a reader looking for them would go.
 * - **The closing "review all details above" Callout.** Unrequested
 *   explanatory copy on a screen whose heading already says Summary and whose
 *   button already says Confirm (hard rule 8).
 */
export function StepSummary({ onJumpTo }: { onJumpTo: (step: Step) => void }) {
  // One tab state for the page. Two independent group tab bars, a card apart,
  // each remembering a different group, is the same control disagreeing with
  // itself.
  const [groupId, setGroupId] = useState(MEMBER_GROUPS[0].id)
  const group = MEMBER_GROUPS.find((g) => g.id === groupId)!
  const totalMembers = MEMBER_GROUPS.reduce((sum, g) => sum + g.members, 0)

  // Everything below the tabs is read off the SELECTED band, so switching
  // bands changes the family matrix and every SI-linked cover limit. Bars
  // scale to the band's own largest cell, since the ₹10L band's biggest
  // number is 17 and would be invisible against the ₹3L band's 1102.
  const breakup = RELATIONSHIP_BREAKUP_BY_GROUP[groupId]
  const breakupMax = Math.max(...RELATIONSHIPS.flatMap((rel) => breakup[rel]))

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-default">Summary</h2>

      <SectionCard
        title="Business Details"
        actions={<EditLink label="Business Details" onClick={() => onJumpTo('Business Details')} />}
      >
        <KeyValues cols="sm:grid-cols-2 lg:grid-cols-4">
          <KeyValue label="Company" value={BUSINESS_DEFAULTS.company} />
          <KeyValue label="Industry" value={BUSINESS_DEFAULTS.industry} />
          <KeyValue label="Quotation type" value={BUSINESS_DEFAULTS.quotationType} />
          <KeyValue label="Business type" value={`${BUSINESS_DEFAULTS.businessType} Business`} />
          <KeyValue label="Effective start" value={BUSINESS_DEFAULTS.startDate} />
          <KeyValue label="Policy term" value="1 year" />
          <KeyValue label="Source" value={BUSINESS_DEFAULTS.source} />
          <KeyValue label="Inward" value={BUSINESS_DEFAULTS.inward} />
          <KeyValue label="Broker" value={BUSINESS_DEFAULTS.intermediary} span />
          <KeyValue label="Registered address" value={BUSINESS_DEFAULTS.address} span />
        </KeyValues>
      </SectionCard>

      <SectionCard
        title="Member Details"
        meta={
          <span className="flex items-baseline gap-4">
            <Figure value={totalMembers.toLocaleString('en-IN')} label="members" />
            <Figure value={MEMBER_GROUPS.length} label="groups" />
          </span>
        }
        actions={<EditLink label="Member Details" onClick={() => onJumpTo('Member Details')} />}
        pad={false}
      >
        <GroupTabs value={groupId} onChange={setGroupId} />
        {/* One rule under the whole block, spanning the card edge to edge, so
            it meets the table header's hairline below it as a single line.
            Per-field borders broke into three stubs across the column gaps. */}
        <div className="border-b border-default px-4 py-3">
          <KeyValues cols="sm:grid-cols-4">
            <KeyValue label="Sum insured" value={formatInr(group.sumInsured)} />
            <KeyValue label="SI type" value={group.siType} />
            <KeyValue label="Members in group" value={group.members.toLocaleString('en-IN')} />
            <KeyValue
              label="Avg family size"
              value={avgFamilySize(breakup, group.members)}
            />
          </KeyValues>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Relationship</Th>
              {AGE_BANDS.map((band) => (
                <Th key={band} align="right">
                  {band}
                </Th>
              ))}
              <Th align="right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {RELATIONSHIPS.map((rel) => (
              <tr key={rel}>
                <Td strong>{rel}</Td>
                {breakup[rel].map((count, i) => (
                  <BarCell key={AGE_BANDS[i]} value={count} max={breakupMax} />
                ))}
                <Td align="right" strong>
                  {breakup[rel].reduce((a, b) => a + b, 0).toLocaleString('en-IN')}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </SectionCard>

      <SectionCard
        title="Cover Details"
        meta={
          <span className="flex items-baseline gap-4">
            <Figure value={BASE_COVER_COUNT} label="base covers" />
            <Figure value={0} label="add-ons" />
          </span>
        }
        actions={<EditLink label="Cover Details" onClick={() => onJumpTo('Cover Details')} />}
        pad={false}
      >
        <GroupTabs value={groupId} onChange={setGroupId} />
        <Table>
          <thead>
            <tr>
              <Th>Cover</Th>
              <Th>Applies to</Th>
              <Th align="right">Limit</Th>
            </tr>
          </thead>
          <tbody>
            {BASE_COVERS.map((cover) => (
              <tr key={cover.name}>
                <Td strong>{cover.name}</Td>
                <Td>{cover.type}</Td>
                <Td align="right" strong>
                  {coverLimit(cover, group.sumInsured)}
                </Td>
              </tr>
            ))}
            <TotalRow>
              <Td strong>
                {BASE_COVER_COUNT - BASE_COVERS.length} further base covers at product default
              </Td>
              <Td />
              <Td />
            </TotalRow>
          </tbody>
        </Table>
      </SectionCard>

      <SectionCard
        title="Claims &amp; TPA"
        actions={<EditLink label="Claims &amp; TPA" onClick={() => onJumpTo('Claims & TPA')} />}
      >
        {/* Only what step 5 actually captures. An earlier pass had a
            "Prior claims years" row here that no fixture backs — a summary
            that invents a field is worse than one that omits it. */}
        <KeyValues cols="sm:grid-cols-3">
          <KeyValue label="Servicing mode" value="In-house" />
          <KeyValue label="TPA" value="Not applicable" />
        </KeyValues>
      </SectionCard>
    </div>
  )
}

function GroupTabs({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" aria-label="Member groups" className="flex gap-1 border-b border-default px-2">
      {MEMBER_GROUPS.map((group) => {
        const active = group.id === value
        return (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(group.id)}
            className={cn(
              'border-b-2 px-3 py-2.5 text-base font-semibold transition-colors duration-base',
              'focus-visible:outline-none focus-visible:shadow-focus',
              active
                ? 'border-b-primary text-brand'
                : 'border-b-transparent text-muted hover:border-b-strong hover:text-default',
            )}
          >
            {formatInr(group.sumInsured)}
          </button>
        )
      })}
    </div>
  )
}

function EditLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="sm" variant="text" onClick={onClick}>
      <Pencil aria-hidden className="h-3.5 w-3.5" />
      Edit
      <span className="sr-only"> {label}</span>
    </Button>
  )
}
