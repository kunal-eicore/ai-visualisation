import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import {
  AGE_BANDS, GROUPS, MEMBERS, RATES, TOTAL_LIVES,
  fmtCr, fmtL, fmtRs, pricingImpact,
} from './data'

/**
 * The rate-table screen, ported from `rRt()` in
 * `../../ai-research/UW_flow_AI_with_sim.html`: the group-wise pricing impact
 * on top, the age-band rate matrix below.
 *
 * It exists here to be the thing the chat moves. Every cell the agent is
 * repricing goes to a shimmer for exactly as long as the call is in flight,
 * the recomputing rows pulse, and the new values land on a reveal. Holding a
 * stale number in place while a new one is being priced is the one genuinely
 * misleading option, which is what makes the skeleton the point of the screen
 * rather than decoration on it.
 */

export type RateState = {
  /** Multiplier applied to every rate. 1 while nothing is proposed. */
  mult: number
  /** `flat` is the prototype's editable proposed-rate mode. */
  mode: 'calculated' | 'flat'
  /** A repricing call is in flight — cells are skeletons. */
  skeleton: boolean
  /** The 700ms settle after values land. */
  reveal: boolean
}

export function RateTable({ state }: { state: RateState }) {
  const flat = state.mode === 'flat'
  const showProposed = flat
  const { rows, totalCurrent, totalProposed, totalChange } = pricingImpact(state.mult)
  const reveal = state.reveal ? 'animate-reveal' : ''

  return (
    <div className="flex flex-col gap-4">
      {/* ── Group Wise Pricing Impact ──────────────────────────────── */}
      <section className="overflow-hidden rounded-lg border border-default bg-surface-card shadow-card">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-default bg-neutral-50 px-4 py-2.5">
          <SectionLabel>Group Wise Pricing Impact</SectionLabel>
          <div className="flex items-center gap-3">
            <Total label="Current" value={fmtCr(totalCurrent)} />
            {showProposed && (
              <>
                <span aria-hidden className="h-7 w-px bg-neutral-300" />
                <Total
                  label="Proposed"
                  brand
                  value={state.skeleton ? <Skeleton w={72} /> : <span className={reveal}>{fmtCr(totalProposed)}</span>}
                />
              </>
            )}
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <DtTh align="left">Group</DtTh>
                <DtTh>SI</DtTh>
                <DtTh>Lives</DtTh>
                <DtTh>Current Prem</DtTh>
                {showProposed && <DtTh>Proposed Prem</DtTh>}
                {showProposed && <DtTh>Change</DtTh>}
                <DtTh>Contribution</DtTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-subtle last:border-b-0 hover:bg-neutral-50">
                  <DtTd align="left">
                    <span className="font-semibold text-default">{r.name}</span>{' '}
                    <span className="text-[10px] font-normal text-muted">({r.basis})</span>
                  </DtTd>
                  <DtTd>{r.si}</DtTd>
                  <DtTd>{r.lives.toLocaleString('en-IN')}</DtTd>
                  <DtTd>{fmtL(r.current)}</DtTd>
                  {showProposed && (
                    <DtTd className="font-semibold text-brand">
                      {state.skeleton ? <Skeleton w={52} /> : <span className={reveal}>{fmtL(r.proposed)}</span>}
                    </DtTd>
                  )}
                  {showProposed && (
                    <DtTd
                      className={cn(
                        'font-semibold',
                        r.change > 0 ? 'text-danger-fg' : r.change < 0 ? 'text-success-fg' : 'text-muted',
                      )}
                    >
                      {state.skeleton ? (
                        <Skeleton w={36} />
                      ) : (
                        <span className={reveal}>{`${r.change > 0 ? '+' : ''}${r.change}%`}</span>
                      )}
                    </DtTd>
                  )}
                  <DtTd>{r.contribution}%</DtTd>
                </tr>
              ))}
              {/* .tr — the totals row */}
              <tr className="border-t-2 border-default bg-neutral-50">
                <DtTd align="left" className="font-bold text-brand">Total</DtTd>
                <DtTd className="text-brand" />
                <DtTd className="font-bold text-brand">{TOTAL_LIVES.toLocaleString('en-IN')}</DtTd>
                <DtTd className="font-bold text-brand">{fmtCr(totalCurrent)}</DtTd>
                {showProposed && (
                  <DtTd className="font-bold text-brand">
                    {state.skeleton ? <Skeleton w={60} /> : <span className={reveal}>{fmtCr(totalProposed)}</span>}
                  </DtTd>
                )}
                {showProposed && (
                  <DtTd
                    className={cn(
                      'font-semibold',
                      totalChange > 0 ? 'text-success-fg' : totalChange < 0 ? 'text-danger-fg' : 'text-muted',
                    )}
                  >
                    {state.skeleton ? (
                      <Skeleton w={36} />
                    ) : (
                      <span className={reveal}>{`${totalChange > 0 ? '+' : ''}${totalChange}%`}</span>
                    )}
                  </DtTd>
                )}
                <DtTd className="font-bold text-brand">100%</DtTd>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Age Band Rate Table ────────────────────────────────────── */}
      <section className="overflow-hidden rounded-lg border border-default bg-surface-card shadow-card">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-default bg-neutral-50 px-4 py-2.5">
          <SectionLabel>Age Band Rate Table</SectionLabel>
          {/* §4.11 — the DS Badge, not a bespoke pill. */}
          <Badge tone={flat ? 'brand' : 'neutral'}>{flat ? 'Flat rate — editable' : 'Current'}</Badge>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <RtTh align="left">Group / Age Band</RtTh>
                {AGE_BANDS.map((b) => (
                  <RtTh key={b}>{b}</RtTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g, gi) => (
                <GroupBlock
                  key={g.name}
                  gi={gi}
                  name={g.name}
                  label={g.label}
                  si={g.si}
                  basis={g.basis}
                  state={state}
                  flat={flat}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/** One group: header band, member counts, current rates, and — in flat mode
 *  — the proposed rates the agent just wrote. */
function GroupBlock({
  gi, name, label, si, basis, state, flat,
}: {
  gi: number
  name: string
  label: string
  si: string
  basis: string
  state: RateState
  flat: boolean
}) {
  return (
    <>
      {/* .gh */}
      <tr className="border-b border-default bg-neutral-50">
        <td colSpan={AGE_BANDS.length + 1} className="px-2.5 py-1.5 text-left text-xs">
          <strong className="font-semibold text-default">{name}</strong>{' '}
          <span className="font-normal text-subtle">
            {label} · {si} · <span className="text-brand">{basis}</span>
          </span>
        </td>
      </tr>

      {/* .mr */}
      <tr className="bg-neutral-50">
        <RtTd align="left" className="text-xs font-semibold text-muted">Members</RtTd>
        {AGE_BANDS.map((b) => (
          <RtTd key={b} className="text-xs font-semibold text-muted">{MEMBERS[b][gi]}</RtTd>
        ))}
      </tr>

      <tr className="border-b border-subtle">
        <RtTd align="left" className="text-xs text-muted">Current Rate</RtTd>
        {AGE_BANDS.map((b) => {
          const v = RATES[b][gi]
          return <RtTd key={b}>{v ? fmtRs(v) : '—'}</RtTd>
        })}
      </tr>

      {flat && (
        <tr
          className={cn(
            'border-b border-subtle',
            state.skeleton && 'animate-row-pulse',
            state.reveal && 'animate-reveal',
          )}
        >
          <RtTd align="left" className="text-xs font-semibold text-brand">Proposed Rate</RtTd>
          {AGE_BANDS.map((b) => {
            const v = RATES[b][gi]
            if (state.skeleton) return <RtTd key={b}>{v ? <Skeleton w={40} /> : '—'}</RtTd>
            return (
              <RtTd key={b}>
                {v ? (
                  <input
                    // Re-keyed on the multiplier so a reprice resets the field
                    // to the agent's value rather than keeping a stale edit.
                    key={state.mult}
                    defaultValue={Math.round(v * state.mult)}
                    aria-label={`Proposed rate, ${b}`}
                    className={cn(
                      'w-[58px] rounded-md border border-strong bg-surface-card px-1.5 py-0.5',
                      'text-right font-mono text-xs text-default',
                      'focus:border-[1.5px] focus:border-focus focus:outline-none focus:shadow-focus-field',
                    )}
                  />
                ) : (
                  '—'
                )}
              </RtTd>
            )
          })}
        </tr>
      )}
    </>
  )
}

/* ── Table bits, matching the prototype's `.dt` and `.rt` rules ──────── */

function SectionLabel({ children }: { children: string }) {
  return <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{children}</span>
}

function Total({ label, value, brand }: { label: string; value: ReactNode; brand?: boolean }) {
  return (
    <div className="text-right">
      <div className={cn('text-xs font-semibold uppercase tracking-[0.06em]', brand ? 'text-brand' : 'text-muted')}>
        {label}
      </div>
      <div className={cn('font-mono text-base font-semibold', brand ? 'text-brand' : 'text-default')}>{value}</div>
    </div>
  )
}

function DtTh({ children, align = 'right' }: { children?: ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap border-b border-default bg-neutral-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted',
        align === 'left' ? 'text-left' : 'text-right',
      )}
    >
      {children}
    </th>
  )
}

function DtTd({ children, align = 'right', className }: { children?: ReactNode; align?: 'left' | 'right'; className?: string }) {
  return (
    <td
      className={cn(
        'px-3 py-2 text-sm text-default',
        align === 'left' ? 'text-left' : 'text-right font-mono',
        className,
      )}
    >
      {children}
    </td>
  )
}

function RtTh({ children, align = 'right' }: { children: string; align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap border-b border-default bg-neutral-50 px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted',
        align === 'left' ? 'min-w-[140px] text-left' : 'min-w-[60px] text-right',
      )}
    >
      {children}
    </th>
  )
}

function RtTd({ children, align = 'right', className }: { children?: ReactNode; align?: 'left' | 'right'; className?: string }) {
  return (
    <td
      className={cn(
        'px-2.5 py-1.5',
        align === 'left' ? 'text-left text-xs font-medium text-default' : 'text-right font-mono text-xs text-default',
        className,
      )}
    >
      {children}
    </td>
  )
}
