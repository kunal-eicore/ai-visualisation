import { useMemo, useState } from 'react'
import { ArrowRight, FlaskConical, GitBranch, Layers, Library, Plus, Sparkle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { cn } from '@/lib/cn'
import { Graph } from './Graph'
import { Region, RailRow, Workspace } from '@/components/workspace/Shell'
import { WORKFLOWS, type Workflow, type WorkflowStatus } from './data'

const ALL = 'All journeys'

/** Status as a single dot — the rail's only colour. */
const DOT: Record<WorkflowStatus, string> = {
  Passing: 'bg-success-500',
  Failing: 'bg-danger-500',
  Draft: 'bg-warning-400',
  'Never run': 'bg-neutral-400',
}

type StepSelectProps = {
  selectedId: string
  onSelect: (id: string) => void
  /** Opening a modelled workflow moves straight on to the builder. */
  onOpen: (id: string) => void
}

/**
 * Step 1 — pick the workflow under test. A rail of what exists, and the canvas
 * showing the one that is selected.
 *
 * This was a card grid, which made the library look like the point. It is not:
 * the point is the workflow you are about to open, so the list stays a list and
 * the canvas gets the room.
 *
 * Only `UW referral triage` is modelled end to end. The rest are library rows
 * on purpose — a workbench that pretends every workflow is built is a worse
 * prototype than one that shows the shelf it is picking off.
 */
export function StepSelect({ selectedId, onSelect, onOpen }: StepSelectProps) {
  const [journey, setJourney] = useState<string>(ALL)
  const [hovered, setHovered] = useState<string | null>(null)

  const journeys = useMemo(() => [ALL, ...new Set(WORKFLOWS.map((w) => w.journey))], [])
  const shown = journey === ALL ? WORKFLOWS : WORKFLOWS.filter((w) => w.journey === journey)
  const current = WORKFLOWS.find((w) => w.id === selectedId)!

  return (
    <Workspace cols="xl:grid-cols-[308px_minmax(0,1fr)]">
      <Region
        title="Workflows"
        icon={<Library aria-hidden className="h-4 w-4 text-muted" />}
        info="Every agentic workflow the workbench knows about, cut from the OneBuzz journeys. Pick one to see it on the canvas; open it to build or test it. Only UW referral triage is modelled end to end."
        meta={<span className="font-mono">{WORKFLOWS.length}</span>}
        pad={false}
        footer={
          <Button
            size="sm"
            variant="neutral"
            className="w-full"
            icon={<Plus aria-hidden className="h-4 w-4" />}
          >
            New workflow
          </Button>
        }
      >
        {/* §4.6 — filter bars are Chips, never Buttons. Docked into the list
            rather than floated above it. */}
        <div className="flex flex-wrap gap-1.5 border-b border-default px-3 py-2">
          {journeys.map((j) => (
            <Chip
              key={j}
              label={j}
              count={j === ALL ? WORKFLOWS.length : WORKFLOWS.filter((w) => w.journey === j).length}
              selected={journey === j}
              onClick={() => setJourney(j)}
            />
          ))}
        </div>

        <ul>
          {shown.map((w) => (
            <li key={w.id}>
              <RailRow
                selected={selectedId === w.id}
                onClick={() => onSelect(w.id)}
                onDoubleClick={() => onOpen(w.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-default">{w.name}</span>
                    {w.suggested && (
                      <span title="Proposed by the system from the event stream" className="flex shrink-0">
                        <Sparkle aria-hidden className="h-3.5 w-3.5 text-brand" />
                      </span>
                    )}
                  </span>
                  {/* A dot, not a badge. Six badged rows in a 300px rail is
                      six blocks of colour and no hierarchy. */}
                  <span
                    aria-hidden
                    title={w.status}
                    className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', DOT[w.status])}
                  />
                  <span className="sr-only">{w.status}</span>
                </div>
                <span className="flex items-center gap-2 font-mono text-xs text-muted">
                  <span>{w.journey}</span>
                  <span aria-hidden className="h-3 w-px bg-neutral-300" />
                  <span>{w.blocks} blocks</span>
                  <span aria-hidden className="h-3 w-px bg-neutral-300" />
                  <span>{w.passRate === null ? 'never run' : `${w.passRate}% passing`}</span>
                </span>
              </RailRow>
            </li>
          ))}
        </ul>
      </Region>

      <Region
        title={current.name}
        icon={<GitBranch aria-hidden className="h-4 w-4 text-muted" />}
        info="A preview of the selected workflow: the blocks it runs and the order they run in. It is the same canvas you get in the builder, so what you pick here is what you open."
        meta={current.modelled ? 'Modelled against a recorded run' : 'Library row'}
        sunken={current.modelled}
        pad={!current.modelled}
        actions={
          <Button
            size="sm"
            disabled={!current.modelled}
            onClick={() => onOpen(current.id)}
          >
            Open
            <ArrowRight aria-hidden className="ml-1 h-4 w-4" />
          </Button>
        }
        footer={<Summary workflow={current} />}
      >
        {current.modelled ? (
          <Graph
            mode="build"
            selectedId={null}
            onSelect={() => onOpen(current.id)}
            hoveredId={hovered}
            onHover={setHovered}
          />
        ) : (
          <NotModelled name={current.name} />
        )}
      </Region>
    </Workspace>
  )
}

function Summary({ workflow: w }: { workflow: Workflow }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-subtle">{w.description}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Layers aria-hidden className="h-3.5 w-3.5" />
          <span className="font-mono">{w.blocks}</span> blocks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Library aria-hidden className="h-3.5 w-3.5" />
          <span className="font-mono">{w.contexts}</span> contexts
        </span>
        <span className="ml-auto font-mono">Last run {w.lastRun}</span>
      </div>
    </div>
  )
}

/** Five of the six library workflows are rows, not graphs. Saying so beats
 *  rendering the referral graph under someone else's name. */
function NotModelled({ name }: { name: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <FlaskConical aria-hidden className="h-6 w-6 text-disabled" />
      <h4 className="text-sm font-semibold text-default">{name} is not modelled here</h4>
      <p className="max-w-md text-xs text-subtle">
        This exploration builds one workflow end to end — UW referral triage — so the canvas, the event
        stream and the checks all describe the same run. The rest of the library is here to show what the
        shelf looks like.
      </p>
    </div>
  )
}
