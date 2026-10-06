import { Bot, Database, Plug, Server, ShieldCheck, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  CANVAS_H,
  CANVAS_W,
  EDGES,
  NODES,
  NODE_BY_ID,
  NODE_H,
  NODE_W,
  type NodeKind,
} from './data'

const KIND_ICON: Record<NodeKind, LucideIcon> = {
  runtime: Bot,
  harness: ShieldCheck,
  adapter: Plug,
  service: Server,
  store: Database,
}

type WiringProps = {
  /** The route currently being traced. Null lights everything — nothing is
   *  selected, so nothing should be emphasised over anything else. */
  lit: Set<string> | null
  /** Bindings the tenant has switched off. Present on the canvas and not
   *  callable: a wire that has been cut still has to be visible. */
  off: Set<string>
  /** The left-hand node is the one thing that changes between steps — it is a
   *  model binding in one and a role's route in the other. */
  runtimeLabel: string
  runtimeDetail: string
  selectedId: string | null
  onSelect?: (id: string) => void
}

/**
 * The harness wiring — the model on the left, the layers on the right, and
 * every call in between going through one gate.
 *
 * It is drawn as the round trip the explainer describes rather than as a
 * feature list: runtime, harness, MCP adapters, the services behind them, the
 * lakehouse at the end. The shape is the argument — the model never reaches
 * past the adapter column, so it can ask for a governed name and never for a
 * table.
 *
 * Same construction as the eval workbench's canvas: a fixed design space with
 * coordinates declared in `data.ts`, absolute blocks over an SVG edge layer.
 * Deterministic, no graph library, dependency list stays closed.
 */
export function Wiring({ lit, off, runtimeLabel, runtimeDetail, selectedId, onSelect }: WiringProps) {
  const isLit = (id: string) => lit === null || lit.has(id)

  return (
    <div
      className="relative"
      style={{
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundImage: 'radial-gradient(#e2e2ec 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      <svg width={CANVAS_W} height={CANVAS_H} className="absolute inset-0" aria-hidden>
        {EDGES.map((e) => {
          const a = NODE_BY_ID[e.from]
          const b = NODE_BY_ID[e.to]
          const x1 = a.x + NODE_W
          const y1 = a.y + NODE_H / 2
          const x2 = b.x
          const y2 = b.y + NODE_H / 2
          const mid = (x1 + x2) / 2
          const cut = off.has(e.from) || off.has(e.to)
          const live = !cut && isLit(e.from) && isLit(e.to)
          const traced = live && lit !== null
          return (
            <g key={`${e.from}-${e.to}`} className="transition-opacity duration-base" opacity={live ? 1 : 0.16}>
              <path
                d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2 - 7} ${y2}`}
                fill="none"
                stroke={traced ? '#5046e5' : '#b0b0c4'}
                strokeWidth={traced ? 2 : 1.5}
                strokeDasharray={cut ? '4 4' : undefined}
              />
              {/* Arrowhead as a filled triangle — a lucide icon cannot sit in
                  an SVG path and a text glyph is a §0.2 defect. */}
              <path
                d={`M ${x2 - 7} ${y2 - 4} L ${x2} ${y2} L ${x2 - 7} ${y2 + 4} Z`}
                fill={traced ? '#5046e5' : '#b0b0c4'}
              />
              {e.label && (
                <text x={mid} y={y2 - 8} textAnchor="middle" className="fill-current font-mono text-[11px] text-muted">
                  {e.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {NODES.map((n) => {
        const Icon = KIND_ICON[n.kind]
        const isOff = off.has(n.id)
        const selected = selectedId === n.id
        const label = n.id === 'runtime' ? runtimeLabel : n.label
        const detail = n.id === 'runtime' ? runtimeDetail : n.detail
        const interactive = Boolean(onSelect) && n.kind === 'adapter'

        const body = (
          <>
            <div className="flex items-center gap-1.5">
              {/* Monochrome, as on the workbench canvas: colour on this screen
                  means a result, and nothing here is a result yet. */}
              <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="truncate text-sm font-semibold text-default">{label}</span>
            </div>
            <span className="truncate font-mono text-xs text-muted">{isOff ? 'switched off' : detail}</span>
          </>
        )

        const shell = cn(
          'flex w-full flex-col gap-1.5 rounded-lg border bg-surface-card p-2.5 text-left shadow-card',
          'transition-shadow duration-base',
          selected ? 'border-primary shadow-classic' : 'border-default',
          isOff && 'border-dashed',
        )

        return (
          <div
            key={n.id}
            className={cn(
              'absolute transition-opacity duration-base',
              !isLit(n.id) && 'opacity-25',
              isOff && 'opacity-40',
            )}
            style={{ left: n.x, top: n.y, width: NODE_W }}
          >
            {interactive ? (
              <button
                type="button"
                onClick={() => onSelect?.(n.id)}
                className={cn(shell, 'hover:shadow-classic focus-visible:outline-none focus-visible:shadow-focus')}
                style={{ height: NODE_H }}
              >
                {body}
              </button>
            ) : (
              <div className={shell} style={{ height: NODE_H }}>
                {body}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** The column key. It docks into the canvas header rather than floating as a
 *  legend card — five node types on one surface need naming once, quietly. */
export function WiringLegend() {
  const items: { kind: NodeKind; label: string }[] = [
    { kind: 'runtime', label: 'Runtime' },
    { kind: 'harness', label: 'Harness' },
    { kind: 'adapter', label: 'MCP' },
    { kind: 'service', label: 'Service' },
    { kind: 'store', label: 'Data' },
  ]
  return (
    <div className="flex items-center gap-2.5">
      {items.map((i) => {
        const Icon = KIND_ICON[i.kind]
        return (
          <span key={i.kind} className="inline-flex items-center gap-1 font-mono text-xs text-muted">
            <Icon aria-hidden className="h-3 w-3" />
            {i.label}
          </span>
        )
      })}
    </div>
  )
}
