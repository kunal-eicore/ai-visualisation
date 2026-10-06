import { useState } from 'react'
import { GitBranch } from 'lucide-react'
import { cn } from '@/lib/cn'
import { BlockInspector, ContextLibrary, DefineContext } from './ContextPanel'
import { EventRail } from './EventRail'
import { Graph, KIND_ICON } from './Graph'
import { Region, Workspace } from '@/components/workspace/Shell'
import { AGENTS, EVENTS, NODE_BY_ID, type ContextDef } from './data'

type StepBuildProps = {
  contexts: ContextDef[]
  onAddContext: (ctx: ContextDef) => void
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
}

/**
 * Step 2 — the workflow builder. Three regions of one surface, left to right:
 * the event stream it is built against, the canvas, and whichever inspector
 * the current action calls for.
 *
 * The right region is deliberately one slot rather than three stacked panels.
 * Defining a context, reading a block and browsing the library are the same
 * gesture at different depths, and only one of them is ever the thing you are
 * doing.
 *
 * The agents palette docks into the canvas footer instead of sitting under it
 * as a second surface: it is canvas chrome — the things you can put on the
 * canvas — not a panel of its own.
 */
export function StepBuild({ contexts, onAddContext, selectedNodeId, onSelectNode }: StepBuildProps) {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [anchor, setAnchor] = useState<string | null>(null)
  const [defining, setDefining] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredContextEvents, setHoveredContextEvents] = useState<string[] | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const selectEvent = (id: string, extend: boolean) => {
    setDefining(false)
    if (!extend || !anchor) {
      setAnchor(id)
      setPicked(new Set([id]))
      return
    }
    // Shift-click takes the whole run between the anchor and the click — a
    // context is a stretch of the stream, not a scatter of rows.
    const a = EVENTS.findIndex((e) => e.id === anchor)
    const b = EVENTS.findIndex((e) => e.id === id)
    const [lo, hi] = a < b ? [a, b] : [b, a]
    setPicked(new Set(EVENTS.slice(lo, hi + 1).map((e) => e.id)))
  }

  const saveContext = (ctx: ContextDef) => {
    onAddContext(ctx)
    setDefining(false)
    setPicked(new Set())
    setAnchor(null)
  }

  // The relation, seen from the rail: whatever block the cursor is on, or the
  // context it is on, lights its own events.
  const relationSource = hoveredNode ?? selectedNodeId
  const linked = new Set<string>(
    hoveredContextEvents ?? (relationSource ? NODE_BY_ID[relationSource].events : []),
  )
  const claimed = new Set(contexts.flatMap((c) => c.eventIds))
  const selectedNode = selectedNodeId ? NODE_BY_ID[selectedNodeId] : null

  return (
    <Workspace cols="xl:grid-cols-[272px_minmax(0,1fr)_320px]">
      <EventRail
        selected={picked}
        onSelect={selectEvent}
        linked={linked}
        claimed={claimed}
        onTag={() => setDefining(true)}
      />

      <Region
        title="Canvas"
        icon={<GitBranch aria-hidden className="h-4 w-4 text-muted" />}
        info="The workflow as blocks and the order they run in. Hover a block to see what it connects to and which events it reads; open a block to see the steps inside it. Drag an agent from the strip below onto the canvas to add one."
        meta="Hover a block to see its relations"
        sunken
        pad={false}
        footer={<AgentPalette />}
      >
        <Graph
          mode="build"
          selectedId={selectedNodeId}
          onSelect={(id) => onSelectNode(id === selectedNodeId ? null : id)}
          hoveredId={hoveredNode}
          onHover={setHoveredNode}
          expandedId={expanded}
          onToggleLayers={(id) => {
            setExpanded((prev) => (prev === id ? null : id))
            onSelectNode(id)
          }}
        />
      </Region>

      {defining ? (
        <DefineContext eventIds={[...picked]} onCancel={() => setDefining(false)} onSave={saveContext} />
      ) : selectedNode ? (
        <BlockInspector node={selectedNode} contexts={contexts} onClose={() => onSelectNode(null)} />
      ) : (
        <ContextLibrary contexts={contexts} onHoverEvents={setHoveredContextEvents} />
      )}
    </Workspace>
  )
}

/**
 * The agents palette. A strip, not a menu, and monochrome like the blocks it
 * drops onto the canvas — the tiles used to be tinted, which made the footer
 * shout as loudly as the graph above it.
 */
function AgentPalette() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">Agents</span>
      {AGENTS.map((a) => {
        const Icon = KIND_ICON[a.kind]
        return (
          <button
            key={a.id}
            type="button"
            title={a.blurb}
            className={cn(
              'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-default bg-surface-card px-2 text-xs font-medium text-default',
              'transition-shadow duration-base hover:shadow-classic focus-visible:outline-none focus-visible:shadow-focus',
            )}
          >
            <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted" />
            {a.name}
          </button>
        )
      })}
    </div>
  )
}
