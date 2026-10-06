import { useId, useMemo, useState } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { cn } from '@/lib/cn'
import {
  HUMAN_RATERS,
  RELEASES,
  bandedSeries,
  releaseAt,
  standingOf,
  type BandedPoint,
} from './data'
import type { GapPoint } from '../data'

/*
 * The distance over time, with both sides of it measured.
 *
 * WHAT CHANGED FROM V1. V1 drew two lines and shaded the gap between them.
 * That picture has one honest half: the system carried a 90% interval, and
 * the human was a bare line with no n, no provenance and no spread. So the
 * chart stated a precision on one side it could not state on the other, and
 * the gap it shaded was the distance to a number nobody had error bars for.
 *
 * Here the people are a REGION — the spread between the highest and lowest
 * underwriter on the same decisions — drawn as a hatch rather than a fill.
 * The hatch is doing real work: a solid band reads as a third series competing
 * with the two lines, and a texture reads as an area. It is also the encoding
 * that survives being printed, or being looked at by someone who cannot
 * separate the two hues.
 *
 * The release markers are the other addition. A smooth 52-week climb with no
 * change events on it reads as a drawn curve rather than a measured one, and
 * "did the last release make it worse" is the first question anyone with
 * responsibility asks.
 */

const W = 960
const H = 260
const PAD = { top: 26, right: 18, bottom: 34, left: 44 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

/** Pinned, not fitted. A closing gap must be a closing gap and not a rescale. */
const Y_MIN = 45
const Y_MAX = 100
const TICKS = [50, 60, 70, 80, 90, 100]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const px = (n: number, i: number) => PAD.left + (i / Math.max(n - 1, 1)) * PLOT_W
const py = (v: number) => PAD.top + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H

const line = (pts: BandedPoint[], pick: (p: BandedPoint) => number) =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(pts.length, i)},${py(pick(p))}`).join(' ')

const area = (pts: BandedPoint[], top: (p: BandedPoint) => number, bottom: (p: BandedPoint) => number) =>
  [
    ...pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(pts.length, i)},${py(top(p))}`),
    ...pts.map((p, i) => `L${px(pts.length, i)},${py(bottom(p))}`).reverse(),
    'Z',
  ].join(' ')

/** One label per month, never two within 44 design units of each other. */
function ticksFor(points: BandedPoint[]) {
  const out: { i: number; label: string }[] = []
  let lastKey = ''
  let lastX = -Infinity
  points.forEach((p, i) => {
    const d = new Date(p.t)
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    if (key === lastKey) return
    lastKey = key
    const x = px(points.length, i)
    if (x - lastX < 44) return
    lastX = x
    out.push({ i, label: MONTHS[d.getUTCMonth()] })
  })
  return out
}

export function GapTrend({ points, range }: { points: GapPoint[]; range: string }) {
  const hatchId = useId()
  const series = useMemo(() => bandedSeries(points), [points])
  const [hover, setHover] = useState<number | null>(null)

  const latest = series[series.length - 1]
  const xTicks = ticksFor(series)
  /* Only releases inside the selected window — a marker for a week the chart
   * does not draw is a marker pointing at nothing. */
  const marks = RELEASES.map((r) => ({ r, i: series.findIndex((p) => p.t === r.t) })).filter((m) => m.i >= 0)
  const active = hover === null ? null : series[hover]

  return (
    <section className="border-t border-subtle bg-surface-card px-8 py-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-1.5">
          <div>
            <h2 className="text-md font-semibold text-default">Where the system sits, week by week</h2>
            <p className="mt-0.5 text-sm text-subtle">
              The shaded band is the spread between underwriters on the same decisions.
            </p>
          </div>
          <InfoTip label="Where the system sits">
            The band is the best and worst of {HUMAN_RATERS} underwriters in the same week; the dark line
            inside it is their average. Drawing the average alone would claim a precision neither side has —
            two underwriters routinely differ on sector and loading by more than the system differs from
            them. The axis stays fixed at {Y_MIN}-{Y_MAX}%, so a closing distance is real and not a rescale.
          </InfoTip>
        </div>
        <Legend />
      </header>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`Over the last ${range.toLowerCase()} the system rises to ${latest?.system}%, against an underwriter range of ${latest?.human.lo} to ${latest?.human.hi}%.`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect()
            const rel = ((e.clientX - box.left) / box.width) * W
            const frac = (rel - PAD.left) / PLOT_W
            const i = Math.round(frac * (series.length - 1))
            setHover(i >= 0 && i < series.length ? i : null)
          }}
        >
          <defs>
            {/* 45 degrees and thin, so it reads as a region at a glance and
                never as data points — but not so pale that the region has to
                be hunted for. The hatch alone is texture; the outline drawn
                round the region below is what states its edges at 4.2:1. */}
            <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#f2f2f5" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#b0b0c4" strokeWidth="1.5" />
            </pattern>
          </defs>

          <g className="text-neutral-400">
            {TICKS.map((t) => (
              <line key={t} x1={PAD.left} y1={py(t)} x2={W - PAD.right} y2={py(t)} stroke="currentColor" strokeWidth={1} />
            ))}
          </g>

          {/* The people, as ground. Drawn first, under everything. */}
          <path
            d={area(series, (p) => p.human.hi, (p) => p.human.lo)}
            fill={`url(#${hatchId})`}
            stroke="#7878a0"
            strokeWidth={1}
          />
          <path
            d={line(series, (p) => p.human.mid)}
            fill="none"
            stroke="#1f1f29"
            strokeWidth={1.5}
            strokeDasharray="1 4"
            strokeLinecap="round"
          />

          {/* The system's interval, then the system. */}
          <g className="text-primary">
            <path
              d={area(series, (p) => Math.min(p.system + p.ci, Y_MAX), (p) => p.system - p.ci)}
              fill="currentColor"
              fillOpacity={0.14}
            />
            <path
              d={line(series, (p) => p.system)}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Releases. A dashed rule and a numbered flag, because the point is
              that a reading belongs to a build, not that something happened. */}
          {marks.map(({ r, i }, n) => (
            <g key={r.id} className="text-neutral-600">
              <line
                x1={px(series.length, i)}
                y1={PAD.top - 8}
                x2={px(series.length, i)}
                y2={H - PAD.bottom}
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle cx={px(series.length, i)} cy={PAD.top - 14} r={7} fill="#f2f2f5" stroke="currentColor" strokeWidth={1} />
              <text
                x={px(series.length, i)}
                y={PAD.top - 10.5}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: 9 }}
                fill="#3a3a48"
              >
                {n + 1}
              </text>
            </g>
          ))}

          {/* Crosshair. */}
          {active && (
            <g>
              <line
                x1={px(series.length, hover!)}
                y1={PAD.top}
                x2={px(series.length, hover!)}
                y2={H - PAD.bottom}
                stroke="#3a3a48"
                strokeWidth={1}
              />
              <circle cx={px(series.length, hover!)} cy={py(active.system)} r={4} className="text-primary" fill="currentColor" stroke="#ffffff" strokeWidth={1.5} />
              <circle cx={px(series.length, hover!)} cy={py(active.human.mid)} r={3.5} fill="#7878a0" stroke="#ffffff" strokeWidth={1.5} />
            </g>
          )}

          <g className="font-mono text-muted" style={{ fontSize: 11 }}>
            {TICKS.map((t) => (
              <text key={t} x={PAD.left - 9} y={py(t) + 4} textAnchor="end" fill="currentColor">
                {t}
              </text>
            ))}
            {xTicks.map((t) => (
              <text key={t.i} x={px(series.length, t.i)} y={H - 10} textAnchor="middle" fill="currentColor">
                {t.label}
              </text>
            ))}
          </g>
        </svg>

        {active && (
          <Readout point={active} xPct={(px(series.length, hover!) / W) * 100} />
        )}
      </div>

      {marks.length > 0 && (
        <ol className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 border-t border-subtle pt-3">
          {marks.map(({ r }, n) => (
            <li key={r.id} className="flex items-baseline gap-2 text-xs text-subtle">
              <span className="font-mono text-muted">{n + 1}</span>
              <span className="font-mono text-default">{r.id}</span>
              <span>{r.what}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/**
 * What the crosshair says. Everything a reading needs to be attributable:
 * both sides, both spreads, and the build that produced it.
 *
 * It travels with the crosshair rather than sitting in a corner. A readout
 * parked at a fixed edge makes the eye leave the week it is reading, look
 * across the chart, and come back — on a 52-point series that is the whole
 * width of the plot, every time the pointer moves a pixel. Riding the vertical
 * rule keeps the number and the point it describes in one glance.
 *
 * It swaps to the other side of the rule past roughly two thirds across, so it
 * never runs off the right edge of the plot, and it holds a fixed vertical
 * position: following the y as well would put the card over the lines it is
 * quoting, and make it jump on a noisy series.
 */
function Readout({ point, xPct }: { point: BandedPoint; xPct: number }) {
  const standing = standingOf(point.system, point.human)
  const release = releaseAt(point.t)
  const flip = xPct > 62

  return (
    <div
      style={{ left: `${xPct}%` }}
      className={cn(
        'pointer-events-none absolute top-2 z-20 w-64 rounded-md border border-default bg-surface-card p-3 shadow-popover',
        flip ? '-translate-x-[calc(100%+14px)]' : 'translate-x-3.5',
      )}
    >
      <p className="font-mono text-xs text-muted">
        Week of{' '}
        {new Date(point.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
      <dl className="mt-2 space-y-1.5">
        <Row
          swatch={<span className="h-2 w-2 rounded-full bg-primary" />}
          label="System"
          value={`${point.system}%`}
          note={`±${point.ci}`}
        />
        <Row
          swatch={<span className="h-2 w-2 rounded-full bg-neutral-600" />}
          label="Underwriters"
          value={`${point.human.mid}%`}
          note={`${point.human.lo}-${point.human.hi}`}
        />
      </dl>
      <p
        className={cn(
          'mt-2.5 rounded-sm border px-1.5 py-1 text-xs font-medium',
          standing === 'inside'
            ? 'border-success bg-success-bg text-success-fg'
            : 'border-warning bg-warning-bg text-warning-fg',
        )}
      >
        {standing === 'inside' ? 'Inside the underwriter range' : 'Below the underwriter range'}
      </p>
      {release && (
        <p className="mt-2 border-t border-subtle pt-2 text-xs text-muted">
          Running <span className="font-mono text-subtle">{release.id}</span>
        </p>
      )}
    </div>
  )
}

function Row({ swatch, label, value, note }: { swatch: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span aria-hidden className="flex w-2.5 justify-center self-center">
        {swatch}
      </span>
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="ml-auto font-mono text-sm text-default">
        {value} <span className="text-xs text-muted">{note}</span>
      </dd>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="inline-flex items-center gap-2 text-xs font-medium text-subtle">
        <span aria-hidden className="h-0.5 w-5 rounded-full bg-primary" />
        System
      </span>
      <span className="inline-flex items-center gap-2 text-xs font-medium text-subtle">
        <span
          aria-hidden
          className="h-3 w-5 rounded-sm border border-neutral-600"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #b0b0c4 0 1.5px, #f2f2f5 1.5px 6px)',
          }}
        />
        Underwriters, best to worst
      </span>
      <span className="inline-flex items-center gap-2 text-xs font-medium text-subtle">
        <span aria-hidden className="h-0.5 w-5 rounded-full bg-neutral-800" />
        Their average
      </span>
    </div>
  )
}
