import { cn } from '@/lib/cn'
import { STANDING_LABEL, standingOf, type HumanBand } from './data'

/*
 * The signature of V2, and the one graphic the page asks you to learn.
 *
 * WHY IT EXISTS. V1 printed the distance to the human as a single number —
 * "5 pts" — which is only readable if you already believe the human is a
 * point. Two underwriters disagree with each other on sector and loading by
 * far more than five points, so the honest comparison is not system against a
 * number, it is system against a RANGE. Once the range is drawn, the reading
 * usually inverts: a system five points behind the mean is very often sitting
 * inside the spread of the people it is being measured against.
 *
 * WHY IT RECURS. The same strip renders at three scales — the page verdict,
 * a class row, a cohort row — so a reader learns it once and then reads every
 * level of the page with it. That repetition is what lets this surface carry
 * a lot of numbers without getting loud: one shape, three sizes, no second
 * vocabulary to learn further down.
 *
 * WHY IT IS NOT A PERCENTILE. "The 41st percentile of underwriters" is a more
 * precise claim and a worse one to put in front of a reader — it needs a
 * distribution in their head before it means anything. In-range or out-of-range
 * is the same finding stated the way a lab result states it.
 *
 * NOTHING HERE IS HOVER-ONLY. The strip is a picture of numbers that are also
 * printed beside it, so it never becomes the only route to a value.
 *
 * CONTRAST. Every mark that carries a reading clears 3:1 against the card it
 * sits on (WCAG 1.4.11): the axis and the band's edge are neutral/600 at 4.2:1,
 * the mean tick neutral/800, the interval brand/500 at 3.6:1. The band's FILL
 * is allowed to stay pale because its boundary is what states the range — the
 * earlier version had the boundary itself at 1.4:1, which is a graphic you
 * have to lean into the screen to read.
 */

/** Pinned, never fitted. A row whose axis moves cannot be compared to the row
 *  above it, and every reading on this page is a percentage of the same kind. */
const MIN = 50
const MAX = 100
const at = (v: number) => `${((Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN)) * 100}%`

type Size = 'page' | 'row' | 'cell'

const TRACK: Record<Size, string> = {
  page: 'h-9',
  row: 'h-4 w-[120px]',
  cell: 'h-3 w-[72px]',
}

const DOT: Record<Size, string> = {
  page: 'h-3.5 w-3.5 border-[3px]',
  row: 'h-2.5 w-2.5 border-2',
  cell: 'h-2 w-2 border-2',
}

export function RangeStrip({
  system,
  ci = 0,
  band,
  size = 'row',
  className,
}: {
  /** The system's own score on these decisions. */
  system: number
  /** Half-width of its 90% interval, in points. Zero draws no whisker. */
  ci?: number
  /** Where the people who do this work today landed on the same decisions. */
  band: HumanBand
  size?: Size
  className?: string
}) {
  const standing = standingOf(system, band)

  return (
    <div
      className={cn('relative flex items-center', TRACK[size], className)}
      role="img"
      aria-label={`System ${system} percent${ci ? `, give or take ${ci} points` : ''}. Underwriters scored ${band.lo} to ${band.hi} percent, average ${band.mid}. ${STANDING_LABEL[standing]}.`}
    >
      {/* The axis. Recessive by weight — one pixel — rather than by being
          too pale to see: it is the ruler that gives the dot its meaning. */}
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-neutral-600" />

      {/* The people. Ground rather than a series: they are what the system is
          measured against, so they sit behind it in neutral and never compete
          with the one accent on the page for attention. */}
      <span
        aria-hidden
        className="absolute top-1/2 h-[60%] min-h-[8px] -translate-y-1/2 rounded-sm border border-neutral-600 bg-neutral-300"
        style={{ left: at(band.lo), width: `calc(${at(band.hi)} - ${at(band.lo)})` }}
      />
      {/* The human mean, as a tick inside their own range. */}
      <span
        aria-hidden
        className="absolute top-1/2 h-[60%] min-h-[8px] w-0.5 -translate-x-1/2 -translate-y-1/2 bg-neutral-800"
        style={{ left: at(band.mid) }}
      />

      {/* The system's interval, before its point: a reading of 88 with an
          interval of 3 is a different claim from the same 88 with 9, and a
          bare dot states both identically. */}
      {ci > 0 && (
        <span
          aria-hidden
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-500"
          style={{ left: at(system - ci), width: `calc(${at(system + ci)} - ${at(system - ci)})` }}
        />
      )}

      {/* The system. The only accent in the component, and the thing the eye
          should land on first. White ring so it stays legible wherever on the
          human band it happens to fall. */}
      <span
        aria-hidden
        className={cn(
          'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-neutral-0 bg-primary',
          DOT[size],
        )}
        style={{ left: at(system) }}
      />
    </div>
  )
}

/** The strip's own legend. Rendered once per page, never per row. */
export function RangeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="inline-flex items-center gap-2 text-xs font-medium text-subtle">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full border-2 border-neutral-0 bg-primary shadow-control" />
        System
      </span>
      <span className="inline-flex items-center gap-2 text-xs font-medium text-subtle">
        <span aria-hidden className="h-3 w-6 rounded-sm border border-neutral-600 bg-neutral-300" />
        Underwriters, best to worst
      </span>
      <span className="inline-flex items-center gap-2 text-xs font-medium text-subtle">
        <span aria-hidden className="h-3 w-0.5 bg-neutral-800" />
        Their average
      </span>
    </div>
  )
}
