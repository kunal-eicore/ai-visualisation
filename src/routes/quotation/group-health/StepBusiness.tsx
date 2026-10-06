import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { Skeleton } from '@/components/ui/Skeleton'
import { FIELD } from '@/components/workspace/field'
import { cn } from '@/lib/cn'
import { useAgentField } from './agentEdits'
import { RowLabel, SectionCard } from './parts'
import {
  BUSINESS_DEFAULTS,
  BUSINESS_TYPES,
  INDUSTRIES,
  INWARD_MODES,
  QUOTATION_TYPES,
  SOURCES,
} from './data'
import { useHandoffProps } from './Handoffs'

/**
 * Step 2 — Business Details.
 *
 * Three cards, in the order the captured run has them: what is being quoted,
 * who it is for, and where it came from. All three arrive pre-filled from the
 * extraction, which is why each header carries the Auto-filled badge — the
 * user's job here is to correct, not to type.
 *
 * The one control that is genuinely derived rather than entered is the
 * effective end date: it follows start + term and is therefore read-only.
 * Making it editable would invite two sources of truth for the policy period.
 * It carries no note saying so — it sits immediately after the start date and
 * the term, and a read-only field between its own two inputs does not need a
 * sentence explaining where its value came from (hard rule 8).
 *
 * Three of the fields are addressable by the assistant (`useAgentField`), so
 * a proposal applied in the dock lands here rather than being reported as
 * done. Which three is not arbitrary: they are the ones the uploaded
 * documents actually speak to. The term and the end date are derived, and the
 * address is on the schedule already — a machine offering to write those
 * would be offering to overwrite the better source with a worse one.
 */
export function StepBusiness() {
  const quotationHandoff = useHandoffProps('business.quotation')
  const companyHandoff = useHandoffProps('business.company')

  const [quotationType, setQuotationType] = useState<string>(BUSINESS_DEFAULTS.quotationType)
  const [businessType, setBusinessType] = useState<string>(BUSINESS_DEFAULTS.businessType)
  const [source, setSource] = useState<string>(BUSINESS_DEFAULTS.source)
  const [inward, setInward] = useState<string>(BUSINESS_DEFAULTS.inward)
  const startDate = useAgentField('business.startDate', BUSINESS_DEFAULTS.startDate)
  const company = useAgentField('business.company', BUSINESS_DEFAULTS.company)
  const industry = useAgentField('business.industry', BUSINESS_DEFAULTS.industry)
  const gstin = useAgentField('business.gstin', BUSINESS_DEFAULTS.gstin)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-default">Business Details</h2>
        <p className="text-base text-subtle">
          Quotation type, business information, policy period, company identity and intermediary details
        </p>
      </div>

      <SectionCard
        id="business.quotation"
        title="Quotation Details"
        autoFilled
        {...quotationHandoff}
      >
        <div className="flex items-start gap-3">
          <RowLabel>Product</RowLabel>
          <Chip label={BUSINESS_DEFAULTS.product} selected onClick={() => {}} />
        </div>

        <div className="flex items-start gap-3">
          <RowLabel>Quotation type</RowLabel>
          <div className="flex flex-wrap gap-2">
            {QUOTATION_TYPES.map((t) => (
              <Chip key={t} label={t} selected={quotationType === t} onClick={() => setQuotationType(t)} />
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <RowLabel>Business type</RowLabel>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_TYPES.map((t) => (
              <Chip key={t} label={t} selected={businessType === t} onClick={() => setBusinessType(t)} />
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1.5fr]">
          <Field label="Effective start date" required field={startDate}>
            <input
              type="date"
              className={FIELD}
              value={startDate.value}
              onChange={(e) => startDate.setValue(e.target.value)}
            />
          </Field>
          <Field label="Policy term">
            <input className={FIELD} value={BUSINESS_DEFAULTS.term} readOnly />
          </Field>
          <Field label="Effective end date">
            <input className={FIELD} value={BUSINESS_DEFAULTS.endDate} readOnly />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        id="business.company"
        title="Company Details"
        autoFilled
        {...companyHandoff}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company name" field={company}>
            <input
              className={FIELD}
              value={company.value}
              onChange={(e) => company.setValue(e.target.value)}
            />
          </Field>
          <Field label="Industry / Sector" field={industry}>
            <select
              className={FIELD}
              value={industry.value}
              onChange={(e) => industry.setValue(e.target.value)}
            >
              {INDUSTRIES.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <Field label="Registered address">
            <input className={FIELD} value={BUSINESS_DEFAULTS.address} readOnly />
          </Field>
          <Field label="GSTIN" field={gstin}>
            <input
              className={FIELD}
              value={gstin.value}
              onChange={(e) => gstin.setValue(e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Source Details" autoFilled>
        <div className="flex flex-wrap items-start gap-3">
          <RowLabel>Source</RowLabel>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <Chip key={s} label={s} selected={source === s} onClick={() => setSource(s)} />
            ))}
          </div>
          <span aria-hidden className="mt-1.5 hidden h-5 w-px bg-neutral-200 md:block" />
          <RowLabel>Inward</RowLabel>
          <div className="flex flex-wrap gap-2">
            {INWARD_MODES.map((m) => (
              <Chip key={m} label={m} selected={inward === m} onClick={() => setInward(m)} />
            ))}
          </div>
        </div>
        <Field label="Intermediary">
          <input className={FIELD} value={BUSINESS_DEFAULTS.intermediary} readOnly />
        </Field>
      </SectionCard>
    </div>
  )
}

/**
 * A labelled control, in one of three states.
 *
 * While the assistant is recomputing it, the control is REPLACED by a
 * placeholder of the same geometry rather than being disabled or overlaid. A
 * disabled input still shows its old value, which is the one claim that is
 * definitely no longer true; and an overlay leaves a control underneath that
 * the keyboard can still reach. The placeholder keeps the field's box, its
 * label and its place in the grid, so nothing moves when the value lands.
 *
 * When it lands, the control comes back on §2.7's reveal — a 3px rise, not a
 * flash. The field has just changed under the user's eyes without them typing
 * it, and that deserves to be noticed once, not celebrated.
 */
function Field({
  label,
  required,
  field,
  children,
}: {
  label: string
  required?: boolean
  /** From `useAgentField` — present only on fields the assistant can write. */
  field?: { busy: boolean; landed: boolean }
  children: React.ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5" aria-busy={field?.busy || undefined}>
      <span className="text-base text-default">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {field?.busy ? (
        /* Same box as FIELD, so the grid does not reflow on the swap. */
        <span className="flex h-[34px] w-full items-center rounded-md border border-brand-200 bg-brand-50 px-2.5">
          <Skeleton w="100%" h={10} />
        </span>
      ) : (
        <span className={cn('block', field?.landed && 'animate-reveal')}>{children}</span>
      )}
    </label>
  )
}
