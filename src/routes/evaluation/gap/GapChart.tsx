import { useId } from 'react'
import { TrendingDown } from 'lucide-react'
import { InfoTip } from '@/components/InfoTip'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeading } from '@/components/ui/Card'
import type { GapPoint } from './data'

/* Plot geometry in design units — the SVG scales through its viewBox. */
const W = 900
const H = 230
const PAD = { top: 16, right: 16, bottom: 34, left: 46 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

/** Fixed domain, not fitted to the data. A gap cannot be made to look
 *  closed by rescaling an axis nobody pinned. */
const Y_MIN = 30
const Y_MAX = 100
const TICKS = [30, 45, 60, 75, 90]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const px = (n: number, i: number) => PAD.left + (i / Math.max(n - 1, 1)) * PLOT_W
const py = (v: number) => PAD.top + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H

const line = (pts: GapPoint[], pick: (p: GapPoint) => number) =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(pts.length, i)},${py(pick(p))}`).join(' ')

/** Fill between two accessors, left to right then back. */
const area = (pts: GapPoint[], top: (p: GapPoint) => number, bottom: (p: GapPoint) => number) =>
  [
    ...pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(pts.length, i)},${py(top(p))}`),
    ...pts.map((p, i) => `L${px(pts.length, i)},${py(bottom(p))}`).reverse(),
    'Z',
  ].join(' ')

/**
 * One label per month change, so a 52-week range does not print 52 dates —
 * and never two within 40 design units of each other, or a range starting in
 * the last days of a month prints its label straight through the next one.
 */
function ticksFor(points: GapPoint[]) {
  const out: { i: number; label: string }[] = []
  let lastKey = ''
  let lastX = -Infinity
  points.forEach((p, i) => {
    const d = new Date(p.t)
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    if (key === lastKey) return
    lastKey = key
    const at = px(points.length, i)
    if (at - lastX < 40) return
    lastX = at
    out.push({ i, label: MONTHS[d.getUTCMonth()] })
  })
  return out
}

/**
 * The distance between the system and the people who do this work today,
 * week by week.
 *
 * Three layers, in the order they are drawn: the gap itself as a filled
 * band, the system's interval as a second band around its line, then the
 * two lines. The interval is on the chart rather than in a footnote because
 * a narrowing gap and a narrowing interval are two different claims, and a
 * single line states them as one.
 */
export function GapChart({ points, range }: { points: GapPoint[]; range: string }) {
  const gapId = useId()
  const first = points[0]
  const latest = points[points.length - 1]
  const gap = latest ? latest.benchmark - latest.system : 0
  const closed = first && latest ? first.benchmark - first.system - gap : 0
  const xTicks = ticksFor(points)

  return (
    /* h-full, because this card is one cell of a bento row and a card that
       stops short of its neighbour reads as a rendering fault rather than a
       layout. The chart keeps its own aspect and centres in whatever height
       the row settles on — stretching an SVG to fill would distort the
       strokes and the axis type along with it. */
    <Card className="h-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-1.5">
          <CardHeading
            title="Gap to human benchmark"
            subtitle="Both measured on the same decisions, week by week. The band is the distance still to close."
          />
          <InfoTip label="Gap to human benchmark">
            The benchmark is the share of decisions a person got right, scored after the fact against
            the settled quotation. The system line is the same measure on the same decisions. Neither
            is a self-assessment, and the benchmark is re-measured each week rather than fixed once,
            which is why it moves. The lighter band around the system line is its 90% interval: it
            narrows as volume accumulates, so early weeks state less than they appear to. The axis is
            pinned to 30-100% rather than fitted, so a closing band is a closing gap and not a rescale.
          </InfoTip>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LegendKey className="bg-success-500" label="Human benchmark" />
          <LegendKey className="bg-primary" label="System" />
          <LegendKey className="bg-warning-200" label="Gap" />
          {closed > 0 && (
            <Badge tone="success" icon={<TrendingDown aria-hidden className="h-3 w-3" />}>
              {`Closed ${closed} pts over ${range.toLowerCase()}`}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`Over the last ${range.toLowerCase()} the human benchmark holds near ${latest?.benchmark ?? 0} percent while the system rises to ${latest?.system ?? 0} percent, leaving a gap of ${gap} points.`}
        >
          <defs>
            <linearGradient id={gapId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <g className="text-gridline">
            {TICKS.map((t) => (
              <line key={t} x1={PAD.left} y1={py(t)} x2={W - PAD.right} y2={py(t)} stroke="currentColor" strokeWidth={1} />
            ))}
          </g>
          <g className="font-mono text-muted" style={{ fontSize: 11 }}>
            {TICKS.map((t) => (
              <text key={t} x={PAD.left - 10} y={py(t) + 4} textAnchor="end" fill="currentColor">
                {t}%
              </text>
            ))}
          </g>

          {/* The gap. Drawn first and beneath both lines — it is the subject. */}
          <g className="text-warning-500">
            <path d={area(points, (p) => p.benchmark, (p) => p.system)} fill={`url(#${gapId})`} />
          </g>

          {/* The system's interval. */}
          <g className="text-primary">
            <path
              d={area(points, (p) => Math.min(p.system + p.ci, Y_MAX), (p) => p.system - p.ci)}
              fill="currentColor"
              fillOpacity={0.12}
            />
          </g>

          <Series points={points} pick={(p) => p.system} className="text-primary" dots={points.length <= 14} />
          <Series points={points} pick={(p) => p.benchmark} className="text-success-500" dots={points.length <= 14} />

          <g className="font-mono text-muted" style={{ fontSize: 11 }}>
            {xTicks.map((t) => (
              <text key={t.i} x={px(points.length, t.i)} y={H - 10} textAnchor="middle" fill="currentColor">
                {t.label}
              </text>
            ))}
          </g>
        </svg>
      </div>
    </Card>
  )
}

function Series({
  points,
  pick,
  className,
  dots,
}: {
  points: GapPoint[]
  pick: (p: GapPoint) => number
  className: string
  dots: boolean
}) {
  return (
    <g className={className}>
      <path
        d={line(points, pick)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dots &&
        points.map((p, i) => (
          <circle key={p.t} cx={px(points.length, i)} cy={py(pick(p))} r={3} fill="currentColor" />
        ))}
    </g>
  )
}

function LegendKey({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-subtle">
      <span aria-hidden className={`h-0.5 w-5 rounded-full ${className}`} />
      {label}
    </span>
  )
}
