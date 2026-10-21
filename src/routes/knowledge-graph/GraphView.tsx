import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import type { GraphEdge, GraphNode, GraphNodeId } from './data'

/*
 * Three columns and three rows, so every edge is a straight horizontal or
 * vertical run with room for its label in the gap. The highlighted path runs
 * from this quotation up to its client, across to the cohort the client was
 * matched into, then down through the value that cohort carried to the cover
 * it is for.
 *
 * Drawn at 672 wide (the 720 panel's body) and stretched sideways to whatever
 * the body is: columns and node widths scale, heights do not.
 */
const BASE_W = 672
const H = 276
const BASE_NODE_W = 156
const NODE_H = 56
const BASE_COL = [0, 258, 516]
const ROW = [0, 110, 220]

const CELL: Record<GraphNodeId, { col: number; row: number }> = {
  client: { col: 0, row: 0 },
  cohort: { col: 1, row: 0 },
  outcome: { col: 2, row: 0 },
  quotation: { col: 0, row: 1 },
  value: { col: 1, row: 1 },
  plan: { col: 0, row: 2 },
  cover: { col: 1, row: 2 },
}

function layout(width: number) {
  const k = width / BASE_W
  const nodeW = BASE_NODE_W * k
  const at = (id: GraphNodeId) => ({ x: BASE_COL[CELL[id].col] * k, y: ROW[CELL[id].row] })
  return { nodeW, at }
}

/** The two facing sides of two nodes that share a row or a column. */
function segment(edge: GraphEdge, { nodeW, at }: ReturnType<typeof layout>) {
  const a = at(edge.from)
  const b = at(edge.to)
  if (a.y === b.y) {
    const y = a.y + NODE_H / 2
    return a.x < b.x
      ? { x1: a.x + nodeW, y1: y, x2: b.x, y2: y }
      : { x1: a.x, y1: y, x2: b.x + nodeW, y2: y }
  }
  const x = a.x + nodeW / 2
  return a.y < b.y
    ? { x1: x, y1: a.y + NODE_H, x2: x, y2: b.y }
    : { x1: x, y1: a.y, x2: x, y2: b.y + NODE_H }
}

/** `INSURANCE_COVER_VALUE` reads as `COVER_VALUE` on the node; the panel's
 *  detail card carries the full name. */
const shortType = (type: string) => type.replace(/^INSURANCE_/, '')

export function GraphView({
  nodes,
  edges,
  selected,
  onSelect,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selected: GraphNodeId
  onSelect: (id: GraphNodeId) => void
}) {
  const onPath = new Set(edges.filter((e) => e.path).flatMap((e) => [e.from, e.to]))
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(BASE_W)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(BASE_W, entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const geo = layout(width)

  return (
    <div ref={ref} className="relative w-full" style={{ height: H }}>
      <svg width={width} height={H} className="absolute inset-0" aria-hidden>
        <defs>
          {(['path', 'rest'] as const).map((k) => (
            <marker
              key={k}
              id={`kg-arrow-${k}`}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L8 4 L0 8 z" className={k === 'path' ? 'fill-brand-500' : 'fill-neutral-400'} />
            </marker>
          ))}
        </defs>
        {edges.map((edge) => {
          const s = segment(edge, geo)
          const mx = (s.x1 + s.x2) / 2
          const my = (s.y1 + s.y2) / 2
          const labelW = edge.label.length * 6.6 + 12
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <line
                {...s}
                strokeWidth={edge.path ? 2 : 1.5}
                strokeDasharray={edge.kind === 'derived' ? '5 4' : undefined}
                markerEnd={`url(#kg-arrow-${edge.path ? 'path' : 'rest'})`}
                className={edge.path ? 'stroke-brand-500' : 'stroke-neutral-400'}
              />
              <rect
                x={mx - labelW / 2}
                y={my - 9}
                width={labelW}
                height={18}
                rx={4}
                className={cn(
                  'stroke-1',
                  edge.path ? 'fill-brand-50 stroke-brand-200' : 'fill-neutral-0 stroke-neutral-300',
                )}
              />
              <text
                x={mx}
                y={my + 3.5}
                textAnchor="middle"
                className={cn('font-mono text-[11px]', edge.path ? 'fill-brand-700' : 'fill-neutral-600')}
              >
                {edge.label}
              </text>
            </g>
          )
        })}
      </svg>

      {nodes.map((node) => {
        const at = geo.at(node.id)
        const isSelected = node.id === selected
        return (
          <button
            key={node.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(node.id)}
            style={{ left: at.x, top: at.y, width: geo.nodeW, height: NODE_H }}
            className={cn(
              'absolute flex flex-col justify-center gap-0.5 rounded-lg border px-3 text-left transition-shadow duration-base',
              'focus-visible:outline-none focus-visible:shadow-focus',
              onPath.has(node.id) ? 'border-brand-300 bg-brand-50' : 'border-default bg-surface-card',
              isSelected && 'border-brand shadow-classic',
            )}
          >
            <span className="truncate font-mono text-[11px] uppercase leading-4 text-muted">
              {shortType(node.type)}
            </span>
            <span className="truncate text-sm font-semibold text-default">{node.name}</span>
          </button>
        )
      })}
    </div>
  )
}
