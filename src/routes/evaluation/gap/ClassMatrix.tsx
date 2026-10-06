import { useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { InfoTip } from '@/components/InfoTip'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeading } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { ClassDetail } from './ClassDetail'
import { CLASSES, HISTORY_MONTHS, RUNG_TONE, accuracyOf, autonomyOf, gapOf } from './data'

/*
 * The five decision classes, the twelve months behind each of them, and the
 * detail of whichever one is open.
 *
 * The detail is an expansion row INSIDE this table rather than a panel
 * underneath it. A panel is what the screen had first, and it failed the only
 * test that matters for a selector: the thing that changed was not where the
 * click was. An expansion row cannot have that problem — the answer opens in
 * the space the row occupies, and the rows below move to make room, which is
 * itself the feedback. It also retires the need for a selected-row marker,
 * since an open row is self-evidently open.
 *
 * One row at a time. The point of the grid is comparing classes, and a table
 * with three detail panels wedged into it is no longer a grid.
 */

/*
 * The scale is STATUS, not magnitude — which is why it is red / amber / green
 * off the status ramps and not a single-hue brand ramp.
 *
 * A one-hue sequential ramp says "more" and "less". This cell does not mean
 * more, it means good or bad against a benchmark that is already on the row —
 * and a purple ramp asked the reader to remember which end was which while the
 * Gap column two inches away was already saying it in red, amber and green.
 * The two now agree.
 *
 * Intensity is severity on BOTH arms rather than lightness running one way
 * across the whole scale: deep green at the top, deep red at the bottom, the
 * pale ambers at the pivot. A month that has gone badly has to be the thing
 * you see first, and a scale that runs uniformly light-to-dark buries one of
 * its two extremes in the palest cell on the grid.
 *
 * Six discrete bands, not a continuous interpolation — a reader can hold six
 * categories, and a smooth gradient invites a precision the monthly sample
 * does not support.
 *
 * Red and green together is the colour-vision trap, so it is never the only
 * channel: every cell carries its own number, which is also what licenses the
 * pale mid-bands under the contrast rule. Each pairing below clears 4.5:1 for
 * that label — the darkest green and red take inverse ink, the rest take
 * default.
 */
const STEP = (v: number) => {
  if (v >= 88) return 'bg-success-600 text-inverse'
  if (v >= 78) return 'bg-success-300 text-default'
  if (v >= 70) return 'bg-warning-200 text-default'
  if (v >= 62) return 'bg-warning-300 text-default'
  if (v >= 52) return 'bg-danger-300 text-default'
  return 'bg-danger-500 text-inverse'
}

/** Worst to best, left to right — the same order the cells step through. */
const LEGEND = [
  'bg-danger-500',
  'bg-danger-300',
  'bg-warning-300',
  'bg-warning-200',
  'bg-success-300',
  'bg-success-600',
]

/** Class column, twelve months, gap column. */
const COLSPAN = 2 + HISTORY_MONTHS.length

type Props = {
  open: string | null
  onToggle: (id: string) => void
}

export function ClassMatrix({ open, onToggle }: Props) {
  const rows = [...CLASSES].sort((a, b) => gapOf(a) - gapOf(b))
  const detailRef = useRef<HTMLTableRowElement | null>(null)
  const mounted = useRef(false)

  /*
   * Bring a newly opened row into view, but only far enough.
   *
   * `block: 'nearest'` is the whole point: a row already on screen does not
   * move, and one whose detail opened past the fold is pulled up by exactly
   * the amount needed. Anything more assertive would yank the page on a row
   * the reader could already see. Skipped on mount so arriving at the screen
   * does not scroll past the chart to the class that happens to be open.
   */
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (open && detailRef.current) {
      detailRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [open])

  return (
    <Card bare>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex items-start gap-1.5">
          <CardHeading
            title="Decision classes"
            subtitle="Acceptance by month. Open a class for its touchpoints and traces."
          />
          <InfoTip label="Decision classes">
            One row per class, one column per month, on one scale so rows compare with each other
            and not only with themselves. A cell is the share of that month's proposals the person
            kept unchanged; handoffs are excluded, because the class put no value forward to accept.
            The bands are red below 52%, then 52, 62, 70 and 78, with green from 88% — so a row
            turning green is a class arriving at the benchmark, and a row that stops changing colour
            has stopped improving, whatever the aggregate line is doing.
          </InfoTip>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted">Accepted</span>
          <span className="font-mono text-xs text-muted">low</span>
          {LEGEND.map((c) => (
            <span key={c} aria-hidden className={cn('h-3 w-3 rounded-sm', c)} />
          ))}
          <span className="font-mono text-xs text-muted">high</span>
        </div>
      </div>

      <div className="overflow-x-auto px-4 pb-4">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-y border-subtle text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="w-72 py-2 pr-3 font-semibold">Class</th>
              {HISTORY_MONTHS.map((m) => (
                <th key={m} className="px-1 py-2 text-center font-semibold">{m}</th>
              ))}
              <th className="w-28 py-2 pl-3 text-right font-semibold">
                <span className="inline-flex items-center gap-1">
                  Gap
                  <InfoTip label="Gap" align="right">
                    The human benchmark on this class minus its acceptance rate. Acceptance is scored
                    on what the class proposed, so a handoff neither helps nor hurts it.
                  </InfoTip>
                </span>
              </th>
            </tr>
          </thead>

          {rows.map((c) => {
            const isOpen = c.id === open
            const Chevron = isOpen ? ChevronDown : ChevronRight
            return (
              /* One tbody per class so the row and its expansion stay one
                 unit — and so the open pair can carry a shared background. */
              <tbody key={c.id} className="border-b border-subtle last:border-0">
                <tr
                  onClick={() => onToggle(c.id)}
                  className={cn(
                    'cursor-pointer transition-colors duration-base',
                    isOpen ? 'bg-brand-50' : 'hover:bg-neutral-50',
                  )}
                >
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`detail-${c.id}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggle(c.id)
                        }}
                        className="rounded-md p-0.5 text-muted transition-colors duration-base hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
                      >
                        <Chevron aria-hidden className="h-4 w-4" />
                        <span className="sr-only">{isOpen ? 'Close' : 'Open'} {c.name}</span>
                      </button>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-base font-medium text-default">{c.name}</span>
                        <span className="flex items-center gap-1.5">
                          <Badge tone={RUNG_TONE[c.rung]}>{c.rung}</Badge>
                          <InfoTip label={c.name}>
                            {c.decides} Runs on {c.steps.join(' and ')}. Stops at: {c.stops} Currently{' '}
                            {accuracyOf(c)}% accepted and {autonomyOf(c)}% settled without a person.
                          </InfoTip>
                        </span>
                      </span>
                    </span>
                  </td>

                  {c.history.map((v, i) => (
                    <td key={i} className="px-0.5 py-1">
                      <span
                        className={cn(
                          'flex h-8 items-center justify-center rounded-sm font-mono text-xs font-medium',
                          STEP(v),
                        )}
                        title={`${c.name}, ${HISTORY_MONTHS[i]}: ${v}% accepted`}
                      >
                        {v}
                      </span>
                    </td>
                  ))}

                  <td className="py-2 pl-3 text-right">
                    <span className="flex flex-col items-end gap-0.5">
                      <span
                        className={cn(
                          'font-mono text-md font-semibold',
                          gapOf(c) <= 2 ? 'text-success-fg' : gapOf(c) <= 10 ? 'text-warning-fg' : 'text-danger-fg',
                        )}
                      >
                        {gapOf(c)} pts
                      </span>
                      <span className="font-mono text-xs text-muted">{accuracyOf(c)} of {c.benchmark}</span>
                    </span>
                  </td>
                </tr>

                {isOpen && (
                  <tr id={`detail-${c.id}`} ref={detailRef}>
                    {/* The open row and its detail carry ONE ground, the same
                        light brand tint, so the pair reads as a single unit
                        that the closed rows part around. Grey was the first
                        attempt and it was wrong twice over: it set the
                        expansion apart from the row that opened it, and it put
                        a heavy neutral fill under the densest content on the
                        screen. Separated from the rows above and below by that
                        ground, never by a border — a box here would be a box
                        in a box. */}
                    <td colSpan={COLSPAN} className="bg-brand-50 p-0">
                      <ClassDetail decisionClass={c} />
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
        </table>
      </div>
    </Card>
  )
}
