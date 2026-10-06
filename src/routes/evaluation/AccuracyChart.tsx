import { useId } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeading } from '@/components/ui/Card'
import type { AccuracyPoint } from './data'

/* Plot geometry. The SVG scales uniformly via viewBox, so these are design
 * units, not pixels. */
const W = 880
const H = 230
const PAD = { top: 16, right: 16, bottom: 30, left: 46 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

/** Fixed domain rather than data-derived, so the drift band keeps a stable
 *  visual weight as runs come in. */
const Y_MIN = 30
const Y_MAX = 90
const TICKS = [30, 45, 60, 75, 90]

const px = (n: number, i: number) => PAD.left + (i / Math.max(n - 1, 1)) * PLOT_W
const py = (value: number) => PAD.top + (1 - (value - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H

const path = (pts: AccuracyPoint[], pick: (p: AccuracyPoint) => number) =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(pts.length, i)},${py(pick(p))}`).join(' ')

/**
 * Human vs shadow-agent accuracy over runs.
 *
 * Not a DS primitive, so it is built from tokens only. The shaded band
 * between the two lines is the drift — it is the point of the chart, not
 * decoration, so it is drawn first and labelled in the legend.
 */
export function AccuracyChart({ points }: { points: AccuracyPoint[] }) {
  const bandId = useId()
  const latest = points[points.length - 1]
  const gap = latest ? latest.human - latest.ai : 0

  // Band polygon: human line left to right, then AI line back.
  const band = [
    ...points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(points.length, i)},${py(p.human)}`),
    ...points.map((p, i) => `L${px(points.length, i)},${py(p.ai)}`).reverse(),
    'Z',
  ].join(' ')

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-1.5">
          <CardHeading
            title="Accuracy over runs"
            subtitle="Scored against the checker outcome. The band is the live gap."
          />
          <InfoTip label="Accuracy over runs">
            Each point is one run batch, numbered along the bottom. Accuracy is the share of that batch's
            decisions that matched the checker's final outcome — the ground truth is the checker, not the
            underwriter, so both lines are scored the same way against the same frozen input and can be
            compared directly. The shaded band is human minus agent, and the badge states it for the latest
            batch. The axis is pinned to 30-90% rather than fitted to the data, so the band keeps a stable
            visual weight as new batches land and a narrowing gap cannot be manufactured by rescaling.
          </InfoTip>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LegendKey className="bg-success-500" label="Human" />
          <LegendKey className="bg-primary" label="AI (shadow)" />
          <Badge tone="danger" dot>{`Drift ${gap} pts`}</Badge>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Human accuracy holds near ${latest?.human ?? 0} percent while the shadow agent reaches ${latest?.ai ?? 0} percent, a gap of ${gap} points.`}
      >
        <defs>
          <linearGradient id={bandId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
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

        {/* The drift band */}
        <g className="text-danger-500">
          <path d={band} fill={`url(#${bandId})`} />
        </g>

        <Series points={points} pick={(p) => p.ai} className="text-primary" />
        <Series points={points} pick={(p) => p.human} className="text-success-500" />

        <g className="font-mono text-muted" style={{ fontSize: 11 }}>
          {points.map((p, i) => (
            <text key={p.run} x={px(points.length, i)} y={H - 8} textAnchor="middle" fill="currentColor">
              {p.run}
            </text>
          ))}
        </g>
      </svg>
    </Card>
  )
}

function Series({
  points,
  pick,
  className,
}: {
  points: AccuracyPoint[]
  pick: (p: AccuracyPoint) => number
  className: string
}) {
  return (
    <g className={className}>
      <path d={path(points, pick)} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={p.run} cx={px(points.length, i)} cy={py(pick(p))} r={3} fill="currentColor" />
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
