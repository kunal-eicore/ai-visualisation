import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Chip } from '@/components/ui/Chip'
import { cn } from '@/lib/cn'
import { RANGES, REFERENCE_RUN, WORKFLOWS, seriesFor, type Range } from '../data'
import { GapTrend } from '../v2/GapTrend'
import { ClassGrid } from './ClassGrid'
import { Journey } from './Journey'
import { Standing } from './Standing'

/**
 * Benchmark Gap, V3 — the one-screen version.
 *
 * WHAT IT TAKES FROM EACH. V1 was readable because it was short: a strip of
 * four readings, a chart, a table, and nothing that had to be operated before
 * it would say anything. V2 was right because it was in the business's own
 * terms: the human drawn as the range they are rather than as a point, the
 * quotation drawn as the journey it is, and every label in the words an
 * underwriting manager already uses. Neither was both. V3 is V2's claim at
 * V1's length.
 *
 * FOUR BANDS, IN THE ORDER THE QUESTIONS GET ASKED. Where do we stand. Which
 * parts of the flow can it run. Is it getting better. What exactly does it
 * decide. That is the whole page; there is no fifth band held in reserve and
 * no sixth behind a tab.
 *
 * WHAT WENT, AND WHY THAT IS THE POINT. The column picker, the row-order
 * toggle, the five columns it hid, the driver legend, the band subtitles.
 * Every one of them was a real reading and every one was the same failure:
 * a control standing in for a decision about what the band is for. Detail
 * did not get deleted, it got moved to where somebody actually asks for it —
 * the class sheet, one click from either the journey or the table, carrying
 * all ten readings in full.
 *
 * ONE OPEN CLASS, TWO DOORS. The open class is page state rather than grid
 * state, so a block in the journey band and its row in the grid open the same
 * detail — and clicking the block scrolls the grid to it rather than throwing
 * a drawer over the page. The journey is a summary of the grid; making them
 * two independent disclosures would have been two pages pretending to be one.
 *
 * THE DETAIL OPENS IN PLACE. A sheet sliding in from the right covers the
 * grid the reader was comparing across, and the thing that changed is then
 * not where the click was. The expansion row cannot have that problem, and
 * three tabs inside it keep it to the height of one section rather than the
 * stack of six that drove it into a drawer in the first place.
 *
 * WHAT IT STILL WILL NOT SAY. No rupee exposure, no hours saved, no cost per
 * quotation — this surface reports how the system is performing, not what
 * that performance is worth. No percentiles, no calibration, no clocks. And
 * acceptance is not correctness: that check is on the page in an `unknown`
 * state rather than left off it.
 */
export function BenchmarkGapV3() {
  const [workflow, setWorkflow] = useState(WORKFLOWS[0].id)
  const [range, setRange] = useState<Range>('12 months')
  /* Nothing is open on arrival: the grid is what the band is for, and a row
     already expanded is a row the reader has to close to see it. */
  const [open, setOpen] = useState<string | null>(null)

  const active = WORKFLOWS.find((w) => w.id === workflow) ?? WORKFLOWS[0]
  const points = useMemo(() => seriesFor(range), [range])

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

      {/* Scope, and the only control on the page. Sticky, because the table
          is long enough that a reader can lose track of which slice they are
          looking at — and a number whose scope has scrolled off misleads. */}
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
          <Standing />
          <Journey onOpen={setOpen} />
          <GapTrend points={points} range={range} />
          <ClassGrid open={open} onToggle={(id) => setOpen((p) => (p === id ? null : id))} />
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
