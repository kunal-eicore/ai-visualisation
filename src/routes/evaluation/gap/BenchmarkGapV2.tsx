import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Chip } from '@/components/ui/Chip'
import { cn } from '@/lib/cn'
import { RANGES, REFERENCE_RUN, WORKFLOWS, seriesFor, type Range } from './data'
import { ClassTable } from './v2/ClassTable'
import { Flow } from './v2/Flow'
import { GapTrend } from './v2/GapTrend'
import { Verdict } from './v2/Verdict'

/**
 * Benchmark Gap, V2.
 *
 * SAME DECISIONS, DIFFERENT CLAIM. V1 answered one question — how far behind
 * the person who does this work today is the system — and answered it against
 * a human rendered as a single number. Drawing that number as the range it
 * actually is changes the finding rather than decorating it: the system is
 * inside the spread of the underwriters it is measured against, not five
 * points adrift of a point.
 *
 * WHAT IT DELIBERATELY DOES NOT SAY. No rupee exposure, no hours saved, no
 * cost per quotation. This surface reports how the system is performing, not
 * what that performance is worth — a different question, for a different
 * audience, that a number on this page would answer badly. Materiality
 * survives as containment: which of the system's own gates caught a defect.
 *
 * WHAT THE READER'S OWN MODEL IS. They think in a journey — a quotation
 * arrives, it moves through seven steps, it goes out — so the journey is the
 * second band and not a sort option on a table three screens down. The order
 * is the claim, then the flow, then whether it is moving, then the detail.
 * Everything that is a property of the instrument rather than of the work —
 * which internal gate caught a defect, how the handoffs split by kind — sits
 * inside the class it belongs to, reachable in one click and costing nothing
 * until somebody asks.
 *
 * WHO IT IS FOR, AND WHAT THAT COSTS. The reader is an underwriting manager,
 * not an evaluation engineer, so every label on the canvas is ordinary English
 * and every coined term V2 had invented — put forward, blind spot, settled
 * unaided, containment — is gone from the surface. They were precise and they
 * were also why the page needed twenty-four tooltips to define itself. The
 * confidence-calibration band went with them: it is the most technical reading
 * on the page and the one this reader can act on least.
 *
 * WHY IT IS A SHEET AND NOT A BENTO. V1's notes record the complaint that
 * drove its layout — cards inside cards — and answered it with one card per
 * region. V2 removes the container entirely: full-bleed bands separated by
 * hairlines, ground and type. At this density a border around each region is
 * a line that costs width and buys nothing.
 *
 * THE ONE THING IT WILL NOT FAKE. Acceptance is not correctness, and nothing
 * in the product records a correction made after Apply. That check is on the
 * page in an `unknown` state rather than left off it — see `v2/data.ts`.
 */
export function BenchmarkGapV2() {
  const [workflow, setWorkflow] = useState(WORKFLOWS[0].id)
  const [range, setRange] = useState<Range>('12 months')

  const active = WORKFLOWS.find((w) => w.id === workflow) ?? WORKFLOWS[0]
  const points = useMemo(() => seriesFor(range), [range])
  const latest = points[points.length - 1]

  return (
    <div className="pb-10">
      <header className="px-8 pb-5 pt-7">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-default">Where the system stands</h1>
          <Badge tone="brand">{active.journey}</Badge>
          <Badge tone="neutral">{REFERENCE_RUN.quotation}</Badge>
        </div>
        {/* `text/subtle`, not `text/muted`: DESIGN.md 2.2 notes muted fails AA
            on white below 16px, so it is reserved for 11-12px meta lines. */}
        <p className="mt-1.5 max-w-2xl text-sm text-subtle">
          How the system did on the decisions it made, against the underwriters who do the same work.
        </p>
      </header>

      {/* Scope. Sticky, because the class table below is long enough that a
          reader can lose track of which slice they are looking at — and a
          number whose scope has scrolled off is a number that misleads. */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-default bg-surface-page/95 px-8 py-3 backdrop-blur">
        <Group label="Workflow">
          {WORKFLOWS.map((w) => (
            <Chip key={w.id} label={w.name} selected={workflow === w.id} onClick={() => setWorkflow(w.id)} />
          ))}
        </Group>
        <Group label="Range" className="lg:ml-auto">
          {RANGES.map((r) => (
            <Chip key={r} label={r} selected={range === r} onClick={() => setRange(r)} />
          ))}
        </Group>
      </div>

      {active.modelled ? (
        <>
          <Verdict ci={latest.ci} />
          <Flow />
          <GapTrend points={points} range={range} />
          <ClassTable />
        </>
      ) : (
        <NotModelled name={active.name} />
      )}
    </div>
  )
}

function Group({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  )
}

/** The honest state for a workflow nobody has instrumented. Volume without
 *  touchpoints would be a number with no trace behind it, so the page reports
 *  nothing rather than reporting an average. */
function NotModelled({ name }: { name: string }) {
  return (
    <section className="border-t border-subtle bg-surface-card px-8 py-10">
      <h2 className="text-md font-semibold text-default">{name} is not instrumented</h2>
      <p className="mt-1 max-w-xl text-sm text-subtle">
        No touchpoints are captured for this workflow, so there is no distance to report.
      </p>
    </section>
  )
}
