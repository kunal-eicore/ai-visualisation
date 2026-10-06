import { useMemo, useState } from 'react'
import { ListTree, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeading } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { MetricCard } from '@/components/ui/MetricCard'
import { Calibration } from './Calibration'
import { ClassMatrix } from './ClassMatrix'
import { ClassesPanel } from './ClassesPanel'
import { GapChart } from './GapChart'
import {
  CALIBRATION_BIAS,
  CLASSES,
  RANGES,
  REFERENCE_RUN,
  SETTLED,
  TOTALS,
  WORKFLOWS,
  seriesFor,
  type Range,
} from './data'

/**
 * Benchmark Gap — whether the distance between the system and the person who
 * does this work today is shrinking, and where the remainder of it sits.
 *
 * The layout is a bento: a KPI strip, the two charts, then the class grid.
 * The rule that keeps it readable is that a card never contains another card.
 * What made an earlier pass feel crowded was not the cards, it was the nesting
 * — a detail card inside a table card inside a column — so the fix is one level
 * of container, not none. Inside any tile, regions are separated by hairlines,
 * ground and type alone.
 *
 * Three things stay held apart all the way down, because merging any two of
 * them produces a number that flatters: the gap (how far behind), the
 * confidence (whether the system knows how far behind it is), and what the
 * person actually did with each value (the only ground truth there is).
 */
export function BenchmarkGap() {
  const [workflow, setWorkflow] = useState(WORKFLOWS[0].id)
  const [range, setRange] = useState<Range>('12 months')
  const [openClass, setOpenClass] = useState<string | null>(CLASSES[0].id)
  const [panelOpen, setPanelOpen] = useState(false)

  const active = WORKFLOWS.find((w) => w.id === workflow) ?? WORKFLOWS[0]
  const points = useMemo(() => seriesFor(range), [range])
  const first = points[0]
  const latest = points[points.length - 1]
  const gap = latest.benchmark - latest.system
  const closed = first.benchmark - first.system - gap

  return (
    <div className="px-8 py-7">
      {panelOpen && <ClassesPanel onClose={() => setPanelOpen(false)} />}

      {/* §5 page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-default">Benchmark Gap</h1>
            <Badge tone="brand">{active.journey}</Badge>
            <Badge tone="neutral">{REFERENCE_RUN.quotation}</Badge>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            Scored on what the person did with each generated value.
          </p>
        </div>
        <Button
          variant="neutral"
          icon={<ListTree aria-hidden className="h-4 w-4" />}
          onClick={() => setPanelOpen(true)}
        >
          Decision classes
        </Button>
      </div>

      {/* §4.6 filter bars — Chips, never Buttons. */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Workflow</span>
          <div role="group" aria-label="Workflow" className="flex flex-wrap items-center gap-2">
            {WORKFLOWS.map((w) => (
              <Chip key={w.id} label={w.name} selected={workflow === w.id} onClick={() => setWorkflow(w.id)} />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Range</span>
          <div role="group" aria-label="Range" className="flex flex-wrap items-center gap-2">
            {RANGES.map((r) => (
              <Chip key={r} label={r} selected={range === r} onClick={() => setRange(r)} />
            ))}
          </div>
        </div>
      </div>

      {!active.modelled ? (
        <NotModelled name={active.name} />
      ) : (
        <>
          {/* §4.15 KPI strip */}
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label="Gap to benchmark"
              value={`${gap} pts`}
              tone={gap <= 5 ? 'success' : 'warning'}
              note={`${latest.system}% system, ${latest.benchmark}% human`}
              trend={
                closed > 0 ? (
                  <Badge tone="success" icon={<TrendingDown aria-hidden className="h-3 w-3" />}>
                    {`${closed} pts closed`}
                  </Badge>
                ) : undefined
              }
              info="The human benchmark on these decisions minus the system's own score on the same decisions, in the latest week of the selected range. Both count a decision as right when the value stood as it was produced, so neither side is graded against an oracle nobody maintains. The trend is the change across the whole range, not week on week."
            />
            <MetricCard
              label="Kept as generated"
              value={`${Math.round((TOTALS.accepted / SETTLED) * 100)}%`}
              tone="success"
              note={`${TOTALS.modified.toLocaleString('en-IN')} edited instead`}
              info="Of the values the system put forward, how many the person kept without changing them. This is the ground truth on this screen: there is no separate answer key, only what the product already records when somebody applies a suggestion, edits over it, or fills a blank it left."
            />
            <MetricCard
              label="Settled unaided"
              value={`${Math.round((SETTLED / TOTALS.decisions) * 100)}%`}
              tone="info"
              note={`${TOTALS.handed.toLocaleString('en-IN')} handed off`}
              info="Decisions the classes put a value forward on, against every decision they were asked to make. The remainder is a handoff — a question, an escalation or a delegation — which is the ladder working rather than failing, and is never counted as an error. Read it beside the accuracy: a class can raise one by lowering the other."
            />
            <MetricCard
              label="Confidence bias"
              value={`${CALIBRATION_BIAS > 0 ? '+' : ''}${CALIBRATION_BIAS.toFixed(2)}`}
              tone="neutral"
              note={CALIBRATION_BIAS < 0 ? 'under-confident' : 'over-confident'}
              info="Stated confidence minus what was actually kept, volume-weighted and signed. Negative means the system is surer than it says. That is not the safe direction it sounds like: under-confidence is what produces the handoff column, so every point of it is work sent to a person who did not need to receive it."
              infoAlign="right"
            />
          </div>

          {/* §5 two-column body — the chart takes 2fr, calibration 1fr. */}
          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <GapChart points={points} range={range} />
            </div>
            <Calibration />
          </div>

          {/* The classes, full width. The open class expands in place inside
              this card rather than into a second card beside or below it. */}
          <div className="mt-5">
            <ClassMatrix
              open={openClass}
              onToggle={(id) => setOpenClass((prev) => (prev === id ? null : id))}
            />
          </div>
        </>
      )}
    </div>
  )
}

/** The honest state for a workflow nobody has instrumented yet. Volume without
 *  touchpoints would be a number with no trace behind it, so the screen reports
 *  nothing rather than reporting an average. */
function NotModelled({ name }: { name: string }) {
  return (
    <Card className="mt-5 items-start">
      <CardHeading
        title={`${name} is not instrumented`}
        subtitle="No touchpoints are captured for this workflow, so there is no gap to report."
      />
    </Card>
  )
}
