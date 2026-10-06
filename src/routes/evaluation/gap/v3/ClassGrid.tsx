import { useEffect, useRef } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { CLASSES, HISTORY_MONTHS, RUNG_TONE, accuracyOf, type DecisionClass } from '../data'
import { ClassSheet } from '../v2/ClassSheet'
import { RangeReading } from '../v2/RangeReading'
import { classBand } from '../v2/data'

/*
 * The five decision classes, the twelve months behind each of them, and the
 * detail of whichever one is open.
 *
 * WHY A GRID AND NOT A TABLE OF COLUMNS. Five sparklines share no scale, so
 * the eye compares shapes rather than values; five rows of coloured months on
 * ONE scale can be read down as well as across. This is the format the class
 * band has always been at its best in, and losing it is what made a leaner
 * page feel like less of one: a column of trend lines is a smaller picture,
 * not a simpler one.
 *
 * WHAT IS V2 ABOUT IT. Two things. The gap column is gone, replaced by the
 * range strip and the standing word, because the finding is not "five points
 * behind a number", it is whether the system sits inside the spread of the
 * people doing the same work. And the rows are in JOURNEY order, matching the
 * band above row for row, rather than ranked by distance — that ranking is an
 * argument about the rung system and this page does not open for it.
 *
 * THE DETAIL IS A SIDE PANEL, AND THE GRID IS WHY. An expansion row is the
 * right disclosure for a list, because the rows below move to make room and
 * the answer opens where the click was. It is the wrong one for a grid: the
 * whole point of five rows of months on one scale is reading DOWN a column,
 * and a detail wedged into the middle of that breaks every column it sits in.
 * So the detail takes half the width beside the grid, the grid stays on
 * screen to be compared across, and the open row keeps its tint — which is
 * what ties the panel to the row it came out of.
 *
 * ONE ROW AT A TIME. Comparing classes is the point, and a grid serving three
 * panels at once is not doing that.
 */

/*
 * The scale is STATUS, not magnitude — red / amber / green off the status
 * ramps, never a single-hue brand ramp. A one-hue sequential ramp says "more"
 * and "less"; this cell means good or bad against people who are already on
 * the row.
 *
 * Intensity is severity on BOTH arms rather than lightness running one way:
 * deep green at the top, deep red at the bottom, pale ambers at the pivot. A
 * month that went badly has to be the first thing seen, and a uniformly
 * light-to-dark scale buries one of its two extremes in the palest cell.
 *
 * Six discrete bands, not a continuous interpolation — a reader holds six
 * categories, and a smooth gradient invites a precision the monthly sample
 * does not support.
 *
 * Red and green together is the colour-vision trap, so colour is never the
 * only channel: every cell carries its own number, which is also what
 * licenses the pale mid-bands under the contrast rule. Each pairing clears
 * 4.5:1 for its label — the darkest green and red take inverse ink.
 */
const STEP = (v: number) => {
  if (v >= 88) return 'bg-success-600 text-inverse'
  if (v >= 78) return 'bg-success-300 text-default'
  if (v >= 70) return 'bg-warning-200 text-default'
  if (v >= 62) return 'bg-warning-300 text-default'
  if (v >= 52) return 'bg-danger-300 text-default'
  return 'bg-danger-500 text-inverse'
}

/** Worst to best, left to right — the order the cells step through. */
const LEGEND = ['bg-danger-500', 'bg-danger-300', 'bg-warning-300', 'bg-warning-200', 'bg-success-300', 'bg-success-600']

export function ClassGrid({ open, onToggle }: { open: string | null; onToggle: (id: string) => void }) {
  const rowRef = useRef<HTMLTableRowElement | null>(null)
  const mounted = useRef(false)
  const selected = open ? (CLASSES.find((c) => c.id === open) ?? null) : null

  /*
   * Bring the open row into view, but only far enough. `block: 'nearest'` is
   * the whole point: a row already on screen does not move, and one below the
   * fold is pulled up by exactly the amount needed. Skipped on mount so
   * arriving at the page does not scroll past the chart. This is also how a
   * click in the journey band above lands here — that band sets the same open
   * class, and the panel it opens has to be readable against its row.
   */
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (open && rowRef.current) rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open])

  return (
    <section className="border-t border-subtle bg-surface-card px-8 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-1.5">
          <h2 className="text-md font-semibold text-default">The decisions it makes</h2>
          <InfoTip label="The decisions it makes">
            One row per kind of decision, one column per month, on one scale so rows compare with each other
            and not only with themselves. A cell is the share of that month's suggestions the underwriter
            kept unchanged; the ones it handed to a person are not counted, because it put no value forward
            to keep. A row turning green is a kind of decision arriving at the people who do it today, and a
            row that has stopped changing colour has stopped improving, whatever the line above is doing.
          </InfoTip>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted">Used as-is</span>
          <span className="font-mono text-xs text-muted">low</span>
          {LEGEND.map((c) => (
            <span key={c} aria-hidden className={cn('h-3 w-3 rounded-sm', c)} />
          ))}
          <span className="font-mono text-xs text-muted">high</span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead>
            <tr className="border-y border-subtle text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="w-72 py-2 pr-3 font-semibold">Decision</th>
              {HISTORY_MONTHS.map((m) => (
                <th key={m} className="px-1 py-2 text-center font-semibold">
                  {m}
                </th>
              ))}
              <th className="w-44 py-2 pl-3 font-semibold">
                <span className="inline-flex items-center gap-1">
                  Vs underwriters
                  <InfoTip label="Vs underwriters" align="right">
                    How often the underwriter kept what this decision produced, and the spread between the
                    best and the worst of them on the same decisions. Inside that spread means the system is
                    within the range the people themselves disagree over. The band at the top of the page
                    draws the same comparison for everything at once.
                  </InfoTip>
                </span>
              </th>
            </tr>
          </thead>

          {CLASSES.map((c) => (
            <Row key={c.id} c={c} open={c.id === open} onToggle={() => onToggle(c.id)} rowRef={rowRef} />
          ))}
        </table>
      </div>

      {selected && <ClassSheet c={selected} onClose={() => onToggle(selected.id)} strips={false} />}
    </section>
  )
}

function Row({
  c,
  open,
  onToggle,
  rowRef,
}: {
  c: DecisionClass
  open: boolean
  onToggle: () => void
  rowRef: React.MutableRefObject<HTMLTableRowElement | null>
}) {
  const band = classBand(c)
  const accuracy = accuracyOf(c)

  return (
    /* One tbody per class so the row and its expansion stay one unit — and so
       the open pair can carry a shared ground. */
    <tbody className="border-b border-subtle last:border-0">
      <tr
        ref={open ? rowRef : undefined}
        onClick={onToggle}
        className={cn(
          'cursor-pointer transition-colors duration-base',
          open ? 'bg-brand-50' : 'hover:bg-neutral-50',
        )}
      >
        <td className="py-2 pr-3">
          {/* No chevron. It promises a disclosure that opens in place, and
              what opens is a panel beside the grid; the row's own tint is
              what says which one is open. */}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="flex w-full items-center rounded-sm text-left focus-visible:outline-none focus-visible:shadow-focus"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-base font-medium text-default">{c.name}</span>
              <span className="flex items-center gap-1.5">
                <Badge tone={RUNG_TONE[c.rung]}>{c.rung}</Badge>
                <span className="truncate text-xs text-muted">{c.steps.join(' · ')}</span>
              </span>
            </span>
          </button>
        </td>

        {c.history.map((v, i) => (
          <td key={i} className="px-0.5 py-1">
            <span
              className={cn(
                'flex h-8 items-center justify-center rounded-sm font-mono text-xs font-medium',
                STEP(v),
              )}
              title={`${c.name}, ${HISTORY_MONTHS[i]}: ${v}% used as-is`}
            >
              {v}
            </span>
          </td>
        ))}

        {/* The comparison, where V1 printed a gap in points.
            TYPE, NOT A SECOND CHART. A 120px strip beside twelve coloured
            months was two pictures in one row, and the smaller of them was
            2.4 pixels per point — a nine-point spread about twenty pixels
            wide. The page draws that comparison once, at the top, at the
            width it takes to be read; here it is the number, the finding and
            the range the finding was made against. */}
        <td className="py-2 pl-3">
          <span className="flex flex-col gap-0.5">
            <span className="font-mono text-md font-semibold text-default">{accuracy}%</span>
            <RangeReading system={accuracy} band={band} />
          </span>
        </td>
      </tr>
    </tbody>
  )
}
