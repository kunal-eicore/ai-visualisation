import { X } from 'lucide-react'
import { BREAKUP, fmtL, fmtRs } from './data'
import { cn } from '@/lib/cn'

/**
 * The premium build-up the `breakup` action opens, condensed from
 * `showPremBreakup()` in the prototype: the ladder from base premium to gross,
 * and the cover-wise allocation underneath.
 *
 * It appears above the rate table rather than in an overlay — this screen is
 * the rate table, and a modal would hide the thing the chat is moving.
 */
export function PremiumBreakup({ onClose }: { onClose: () => void }) {
  const loadings = BREAKUP.rows.reduce((s, r) => s + r.amount, 0)
  const gross = BREAKUP.base + loadings

  return (
    <section className="animate-fade-up overflow-hidden rounded-lg border border-default bg-surface-card shadow-card">
      <header className="flex items-center justify-between gap-2 border-b border-default bg-neutral-50 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">
          Premium Build-Up
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close premium build-up"
          className="rounded-sm p-0.5 text-muted transition-colors duration-base hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
        >
          <X aria-hidden className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
        <div className="flex flex-col">
          <Row label="Base premium" value={fmtL(BREAKUP.base)} />
          {BREAKUP.rows.map((r) => (
            <Row key={r.label} label={r.label} note={r.note} value={fmtL(r.amount)} muted={r.amount === 0} />
          ))}
          <Row label="Gross premium" value={fmtL(gross)} strong />
        </div>

        <div className="flex flex-col">
          {BREAKUP.covers.map((c) => (
            <Row key={c.label} label={c.label} note={c.share} value={fmtRs(c.amount)} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Row({
  label, note, value, strong, muted,
}: {
  label: string
  note?: string
  value: string
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-subtle px-4 py-2 last:border-b-0',
        strong && 'border-t-2 border-t-default bg-neutral-50',
      )}
    >
      <span className={cn('text-sm', strong ? 'font-semibold text-default' : muted ? 'text-muted' : 'text-default')}>
        {label}
        {note && <span className="ml-1.5 font-mono text-xs text-muted">{note}</span>}
      </span>
      <span className={cn('font-mono text-sm', strong ? 'font-semibold text-brand' : muted ? 'text-muted' : 'text-default')}>
        {value}
      </span>
    </div>
  )
}
