import { cn } from '@/lib/cn'
import { standingOf, type HumanBand } from './data'

/*
 * The same finding as `RangeStrip`, in type.
 *
 * WHY IT EXISTS. The strip is the right graphic at page scale and it is not a
 * graphic at all at 120px: on a 50-100 axis that is 2.4 pixels per point, so
 * a nine-point underwriter spread renders about twenty pixels wide — a smudge
 * you can only read if you already know what it says. A picture that has to
 * be decoded from its own caption is worse than the caption.
 *
 * SO THERE IS ONE STRIP PER PAGE, at the size it can be read at, and
 * everywhere else the reading is printed: the number, the finding, and the
 * range it is being judged against. Nothing is lost — the strip never carried
 * a value that was not also printed beside it.
 *
 * THE FINDING LEADS AND IT IS ONLY COLOURED WHEN IT IS BAD. A distance inside
 * the underwriters' own disagreement is not a finding, so it is stated in the
 * meta weight; falling below their worst reading is the one case worth ink.
 */

const WORD = {
  inside: 'in range',
  below: 'behind them',
  above: 'ahead of them',
} as const

export function RangeReading({
  system,
  band,
  /** Print the system's own percentage first. Off where the row already
   *  carries it in a column of its own. */
  value,
  className,
}: {
  system: number
  band: HumanBand
  value?: boolean
  className?: string
}) {
  const standing = standingOf(system, band)

  return (
    <span className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      {value && <span className="font-mono text-md font-semibold text-default">{system}%</span>}
      <span className={cn('text-xs', standing === 'below' ? 'font-medium text-warning-fg' : 'text-muted')}>
        {WORD[standing]}
      </span>
      <span className="font-mono text-xs text-muted">
        {band.lo}-{band.hi}
      </span>
    </span>
  )
}
