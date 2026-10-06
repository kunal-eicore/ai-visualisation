import { Database, GitBranch, Layers, PenLine, UserCheck, Zap, type LucideIcon } from 'lucide-react'
import type { Tone } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import {
  AGENT_BY_ID,
  CANVAS_H,
  CANVAS_W,
  EDGES,
  NODES,
  NODE_BY_ID,
  NODE_H,
  NODE_H_TEST,
  NODE_W,
  type AgentKind,
  type CheckStatus,
  type NodeOutput,
} from './data'

export const KIND_ICON: Record<AgentKind, LucideIcon> = {
  trigger: Zap,
  agent: PenLine,
  tool: Database,
  gate: GitBranch,
  terminal: UserCheck,
}

const TONE_FG: Record<Tone, string> = {
  brand: 'text-brand-fg', neutral: 'text-neutral-fg', success: 'text-success-fg',
  info: 'text-info-fg', warning: 'text-warning-fg', alert: 'text-alert-fg', danger: 'text-danger-fg',
}
const TONE_BAR: Record<Tone, string> = {
  brand: 'bg-brand-500', neutral: 'bg-neutral-600', success: 'bg-success-500',
  info: 'bg-info-500', warning: 'bg-warning-500', alert: 'bg-warning-400', danger: 'bg-danger-500',
}

/** The ring a tested block takes. Passing blocks get nothing: if every result
 *  is drawn, none of them stands out, and the one failing block is the entire
 *  reason you opened this step. */
const CHECK_RING: Record<CheckStatus, string> = {
  pass: '',
  fail: 'ring-2 ring-danger-400',
  skipped: 'ring-1 ring-neutral-300',
}

type GraphProps = {
  mode: 'build' | 'test'
  selectedId: string | null
  onSelect: (id: string) => void
  hoveredId: string | null
  onHover: (id: string | null) => void
  /** Test mode — the worst check status per block. */
  statusByNode?: Record<string, CheckStatus>
  /** Blocks whose drill-in is open, rendered as a layer stack. */
  expandedId?: string | null
  onToggleLayers?: (id: string) => void
}

/**
 * The workflow canvas. Fixed 980x430 design space scaled by the container,
 * so node coordinates in `data.ts` stay readable numbers and the layout is
 * deterministic — no physics, no layout library, nothing to re-run.
 *
 * Hovering a block reveals its relations (sketch: "hover on a node to see
 * relations"): the block, its direct neighbours and the edges between them
 * hold full contrast while everything else drops back.
 */
export function Graph({
  mode,
  selectedId,
  onSelect,
  hoveredId,
  onHover,
  statusByNode,
  expandedId,
  onToggleLayers,
}: GraphProps) {
  const h = mode === 'test' ? NODE_H_TEST : NODE_H
  const canvasH = CANVAS_H + (mode === 'test' ? NODE_H_TEST - NODE_H : 0)

  // Direct neighbourhood of the hovered block — the relation set.
  const related = new Set<string>()
  if (hoveredId) {
    related.add(hoveredId)
    EDGES.forEach((e) => {
      if (e.from === hoveredId) related.add(e.to)
      if (e.to === hoveredId) related.add(e.from)
    })
  }
  const dimmed = (id: string) => hoveredId !== null && !related.has(id)

  return (
    /* No border and no radius: the canvas is a region of the workbench shell,
       not a card sitting inside one. The dot grid is the only thing telling
       you this is a canvas and not a diagram image — it is a background, so it
       is drawn inline rather than added to the token layer. */
    <div
      className="relative"
      style={{
        width: CANVAS_W,
        height: canvasH,
        backgroundImage: 'radial-gradient(#e2e2ec 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
      onMouseLeave={() => onHover(null)}
    >
        <svg width={CANVAS_W} height={canvasH} className="absolute inset-0" aria-hidden>
          {EDGES.map((e) => {
            const a = NODE_BY_ID[e.from]
            const b = NODE_BY_ID[e.to]
            const x1 = a.x + NODE_W
            const y1 = a.y + h / 2
            const x2 = b.x
            const y2 = b.y + h / 2
            const mid = (x1 + x2) / 2
            const live = hoveredId === null || (related.has(e.from) && related.has(e.to))
            return (
              <g key={`${e.from}-${e.to}`} className="transition-opacity duration-base" opacity={live ? 1 : 0.18}>
                <path
                  d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2 - 7} ${y2}`}
                  fill="none"
                  stroke={live && hoveredId !== null ? '#5046e5' : '#b0b0c4'}
                  strokeWidth={live && hoveredId !== null ? 2 : 1.5}
                />
                {/* Arrowhead as a filled triangle — a lucide icon cannot sit
                    inside an SVG path, and a text glyph is a §0.2 defect. */}
                <path d={`M ${x2 - 7} ${y2 - 4} L ${x2} ${y2} L ${x2 - 7} ${y2 + 4} Z`} fill={live && hoveredId !== null ? '#5046e5' : '#b0b0c4'} />
                {e.label && (
                  <text
                    x={mid}
                    y={y2 - 8}
                    textAnchor="middle"
                    className="fill-current font-mono text-[11px] text-muted"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {NODES.map((n) => {
          const agent = AGENT_BY_ID[n.agentId]
          const Icon = KIND_ICON[agent.kind]
          const selected = selectedId === n.id
          const status = statusByNode?.[n.id]
          const open = expandedId === n.id
          return (
            <div
              key={n.id}
              className={cn(
                'absolute transition-opacity duration-base',
                dimmed(n.id) && 'opacity-25',
              )}
              style={{ left: n.x, top: n.y, width: NODE_W }}
            >
              {/* The layer stack — two offset plates behind the block, so a
                  block with depth reads as deep before you click it. */}
              {n.layers.length > 1 && (
                <>
                  <span aria-hidden className="absolute left-1.5 top-1.5 h-full w-full rounded-lg border border-default bg-surface-card" />
                  <span aria-hidden className="absolute left-0.5 top-0.5 h-full w-full rounded-lg border border-default bg-surface-card" />
                </>
              )}
              <button
                type="button"
                onClick={() => onSelect(n.id)}
                onMouseEnter={() => onHover(n.id)}
                className={cn(
                  'relative flex w-full flex-col gap-1.5 rounded-lg border bg-surface-card p-2.5 text-left shadow-card transition-shadow duration-base',
                  'focus-visible:outline-none focus-visible:shadow-focus hover:shadow-classic',
                  selected && 'border-primary shadow-classic',
                  !selected && 'border-default',
                  mode === 'test' && status && CHECK_RING[status],
                )}
                style={{ height: h }}
              >
                <div className="flex items-center gap-1.5">
                  {/* Monochrome on purpose. Seven tinted chips on one canvas
                      is seven things competing before you have read a word;
                      colour here is reserved for results. */}
                  <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="truncate text-sm font-semibold text-default">{n.label}</span>
                </div>

                {mode === 'build' ? (
                  <span className="truncate font-mono text-xs text-muted">{agent.name}</span>
                ) : (
                  <OutputViz output={n.output} />
                )}
              </button>

              {n.layers.length > 1 && onToggleLayers && (selected || hoveredId === n.id) && (
                <button
                  type="button"
                  onClick={() => onToggleLayers(n.id)}
                  aria-expanded={open}
                  className={cn(
                    'relative mt-1 inline-flex h-5 items-center gap-1 rounded-md border px-1.5 font-mono text-xs transition-colors duration-base',
                    'focus-visible:outline-none focus-visible:shadow-focus',
                    open ? 'border-brand bg-brand-bg text-brand-fg' : 'border-default bg-surface-card text-muted hover:border-strong hover:text-default',
                  )}
                >
                  <Layers aria-hidden className="h-3 w-3" />
                  {n.layers.length} layers
                </button>
              )}
            </div>
        )
      })}
    </div>
  )
}

/** The sketch's "output visualization within boxes" — three shapes, chosen by
 *  what the block actually emits rather than by where it sits. */
function OutputViz({ output }: { output: NodeOutput }) {
  if (output.kind === 'fields') {
    return (
      <dl className="flex flex-col gap-0.5">
        {output.rows.map((r) => (
          <div key={r.key} className="flex items-baseline justify-between gap-2">
            <dt className="truncate font-mono text-xs text-muted">{r.key}</dt>
            <dd className="truncate font-mono text-xs font-semibold text-default">{r.value}</dd>
          </div>
        ))}
      </dl>
    )
  }

  if (output.kind === 'score') {
    const pct = Math.min(100, Math.round((output.value / output.max) * 100))
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className={cn('font-mono text-lg font-bold leading-none', TONE_FG[output.band])}>{output.value}</span>
          <span className="truncate font-mono text-xs text-muted">{output.unit}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-neutral-200">
          <div className={cn('h-1.5 rounded-full', TONE_BAR[output.band])} style={{ width: `${Math.max(pct, 2)}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {output.bars.map((b) => (
        <div key={b.label} className="flex items-center gap-1.5">
          <span className={cn('h-1.5 shrink-0 rounded-full', TONE_BAR[b.tone])} style={{ width: `${b.pct}%` }} />
          <span
            className={cn(
              'truncate font-mono text-xs',
              b.label === output.taken ? cn('font-semibold', TONE_FG[b.tone]) : 'text-muted',
            )}
          >
            {b.label}
          </span>
        </div>
      ))}
    </div>
  )
}
