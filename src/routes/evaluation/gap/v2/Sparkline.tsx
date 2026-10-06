import { AnchoredCard, useAnchored } from '@/components/Anchored'
import { cn } from '@/lib/cn'
import { HISTORY_MONTHS, statsOf } from './data'

/*
 * Twelve readings in a table cell, and the spread behind them one hover away.
 *
 * A bare sparkline is a shape with no numbers on it, which makes it decoration
 * in a table full of figures. The fix is not to print the numbers next to it —
 * that is the column it already sits beside — it is to let the line carry its
 * own summary: where it sits now, its median, and the range it moved through.
 * A touchpoint that climbed from 60 to 71 and one that oscillated between 65
 * and 78 draw almost the same line and are not the same finding.
 *
 * The trigger is a button, not a div. The card is the only place the median
 * and the range appear, so if it were hover-only it would be unreachable by
 * keyboard — and the last value, the one thing a reader must not have to hover
 * for, is printed in the row itself. The card is portalled because this cell
 * lives inside a horizontally scrollable table, which clips on both axes.
 */

const W = 96
const H = 22
const PAD = 2

export function Sparkline({
  values,
  label,
  className,
}: {
  /** Oldest first, one per month in HISTORY_MONTHS. */
  values: number[]
  /** What the series is of — read out, and titles the card. */
  label: string
  className?: string
}) {
  const stat = statsOf(values)
  const { anchorRef, pos, show, hide } = useAnchored({ align: 'center', width: 224 })

  /* Scaled to the series' own range, not 0-100: twelve readings inside eight
   * points would otherwise draw as a flat line and say nothing. The card
   * states the range, so the local scale cannot mislead. */
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = Math.max(hi - lo, 1)
  const x = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2)
  const y = (v: number) => PAD + (1 - (v - lo) / span) * (H - PAD * 2)
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ')

  return (
    <span
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <button
        type="button"
        aria-label={`${label} over twelve months: now ${stat.last} percent, median ${stat.median}, low ${stat.min}, high ${stat.max}`}
        className={cn(
          'rounded-sm p-0.5 transition-colors duration-base hover:bg-surface-sunken focus-visible:outline-none focus-visible:shadow-focus',
          className,
        )}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden className="block text-neutral-600">
          <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={x(values.length - 1)} cy={y(stat.last)} r={2.5} className="text-primary" fill="currentColor" />
        </svg>
      </button>

      {pos && (
        <AnchoredCard pos={pos}>
          <span className="block rounded-md bg-neutral-900 p-2.5 text-inverse shadow-classic">
            <span className="block text-xs font-semibold">{label}</span>
            <span className="mt-0.5 block text-xs text-neutral-400">
              {HISTORY_MONTHS[0]} to {HISTORY_MONTHS[HISTORY_MONTHS.length - 1]}, monthly
            </span>
            <span className="mt-2 grid grid-cols-3 gap-2 font-mono text-xs">
              <Stat k="now" v={`${stat.last}%`} />
              <Stat k="median" v={`${stat.median}%`} />
              <Stat k="range" v={`${stat.min}-${stat.max}%`} />
            </span>
          </span>
        </AnchoredCard>
      )}
    </span>
  )
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <span className="block">
      <span className="block font-sans text-[10px] uppercase tracking-wide text-neutral-500">{k}</span>
      <span className="block text-inverse">{v}</span>
    </span>
  )
}
