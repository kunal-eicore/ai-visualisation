import { Cable, Layers, Network, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RailRow, Region, Workspace } from '@/components/workspace/Shell'
import { cn } from '@/lib/cn'
import { Wiring, WiringLegend } from './Wiring'
import {
  BINDINGS,
  BINDING_BY_ID,
  BINDING_TONE,
  type Binding,
  type BindingKind,
} from './data'

const KIND_ORDER: BindingKind[] = ['Semantic layer', 'Intelligence layer', 'MCP server']

type StepLayersProps = {
  selectedId: string | null
  onSelect: (id: string | null) => void
  enabled: Record<string, boolean>
  onToggle: (id: string) => void
  /** How many models are switched on — the runtime node's caption. */
  enabledModels: number
}

/**
 * Step 2 — what the harness is allowed to reach.
 *
 * The rail lists the bindings grouped by which layer they belong to, the
 * canvas draws the route a call actually takes, and the inspector is the
 * binding you picked.
 *
 * The grouping is the argument. The semantic layer is not one MCP server among
 * four — it is the reason the model never writes SQL — so it sits at the top of
 * the rail under its own heading rather than being sorted alphabetically into
 * the middle.
 */
export function StepLayers({ selectedId, onSelect, enabled, onToggle, enabledModels }: StepLayersProps) {
  const selected = selectedId ? BINDING_BY_ID[selectedId] : null

  // Nodes behind a binding the tenant has switched off. The adapter and the
  // service go dark; the lakehouse does not, because something else still
  // reaches it.
  const off = new Set<string>(
    BINDINGS.filter((b) => !enabled[b.id]).flatMap((b) => b.path.slice(2, 4)),
  )
  const lit = selected && enabled[selected.id] ? new Set(selected.path) : null
  const liveCount = BINDINGS.filter((b) => enabled[b.id]).length
  const toolCount = BINDINGS.filter((b) => enabled[b.id]).reduce((n, b) => n + b.tools.length, 0)

  return (
    <Workspace cols="xl:grid-cols-[272px_minmax(0,1fr)_340px]">
      <Region
        title="Layers"
        icon={<Layers aria-hidden className="h-4 w-4 text-muted" />}
        info="Everything the harness can reach, grouped by the layer it belongs to. These are the same whichever model is bound — that is the point of putting them behind the harness rather than inside a prompt."
        meta={<span className="font-mono">{liveCount} on · {toolCount} tools</span>}
        pad={false}
        footer={
          <Button size="sm" variant="neutral" icon={<Cable aria-hidden className="h-4 w-4" />} className="w-full">
            Register an MCP server
          </Button>
        }
      >
        {KIND_ORDER.map((kind) => {
          const rows = BINDINGS.filter((b) => b.kind === kind)
          if (rows.length === 0) return null
          return (
            <section key={kind}>
              <h4 className="sticky top-0 z-10 border-b border-subtle bg-surface-sunken px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-muted">
                {kind}
              </h4>
              <ul>
                {rows.map((b) => (
                  <li key={b.id}>
                    <RailRow selected={b.id === selectedId} onClick={() => onSelect(b.id)}>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'truncate font-mono text-xs font-semibold',
                            enabled[b.id] ? 'text-default' : 'text-muted line-through',
                          )}
                        >
                          {b.name}
                        </span>
                        <Badge tone={enabled[b.id] ? BINDING_TONE[b.status] : 'neutral'} dot={enabled[b.id] && b.status === 'degraded'}>
                          {enabled[b.id] ? b.status : 'off'}
                        </Badge>
                      </div>
                      <span className="truncate text-xs text-subtle">
                        {b.tools.map((t) => t.name).join(' · ')}
                      </span>
                    </RailRow>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </Region>

      <Region
        title="Wiring"
        icon={<Network aria-hidden className="h-4 w-4 text-muted" />}
        info="The path a tool call takes: the runtime asks the harness, the harness calls an MCP server as the signed-in user, and the server — not the model — talks to the system behind it. Select a binding to trace its route; a binding that is switched off leaves a cut wire rather than disappearing."
        meta="Select a binding to trace its route"
        sunken
        pad={false}
        footer={<WiringLegend />}
      >
        <Wiring
          lit={lit}
          off={off}
          runtimeLabel="Agent runtime"
          runtimeDetail={`${enabledModels} models enabled`}
          selectedId={selected ? selected.path[2] : null}
          onSelect={(nodeId) => {
            const match = BINDINGS.find((b) => b.path[2] === nodeId)
            if (match) onSelect(match.id)
          }}
        />
      </Region>

      {selected ? (
        <BindingPanel
          binding={selected}
          enabled={enabled[selected.id]}
          onToggle={() => onToggle(selected.id)}
          onClose={() => onSelect(null)}
        />
      ) : (
        <Region
          title="Binding"
          icon={<Wrench aria-hidden className="h-4 w-4 text-muted" />}
          info="Select a binding on the left, or an MCP node on the canvas, to see the tools it exposes and the rules it enforces."
        >
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Wrench aria-hidden className="h-6 w-6 text-disabled" />
            <p className="max-w-[26ch] text-xs text-subtle">
              Pick a binding to see the tools it exposes and what it enforces on the way through.
            </p>
          </div>
        </Region>
      )}
    </Workspace>
  )
}

function BindingPanel({
  binding,
  enabled,
  onToggle,
  onClose,
}: {
  binding: Binding
  enabled: boolean
  onToggle: () => void
  onClose: () => void
}) {
  return (
    <Region
      title={binding.name}
      icon={<Cable aria-hidden className="h-4 w-4 text-muted" />}
      info="What this binding exposes to a bound model, who the call runs as, and what the layer enforces before it answers. Switching it off cuts the wire for every role at once."
      actions={
        <button
          type="button"
          onClick={onClose}
          aria-label="Close binding"
          className="rounded-md px-1.5 py-0.5 font-mono text-xs text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
        >
          Close
        </button>
      }
      footer={
        <Button size="sm" variant={enabled ? 'neutral' : 'primary'} onClick={onToggle} className="w-full">
          {enabled ? 'Switch off for every role' : 'Switch back on'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-subtle">{binding.summary}</p>

        <dl className="flex flex-col gap-1.5 rounded-md border border-default bg-neutral-50 p-2.5">
          {[
            ['Endpoint', binding.endpoint],
            ['Auth', binding.auth],
            ['Runs as', binding.identity],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <dt className="font-mono text-xs text-muted">{k}</dt>
              <dd className="break-all font-mono text-xs text-subtle">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-default">Tools exposed</span>
          <ul className="flex flex-col gap-1.5">
            {binding.tools.map((t) => (
              <li key={t.name} className="rounded-md border border-default bg-surface-card p-2">
                <span className="font-mono text-xs font-semibold text-default">{t.name}</span>
                <p className="mt-0.5 text-xs text-subtle">{t.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-default">Enforced here, not in the prompt</span>
          <ul className="flex flex-col gap-1 rounded-md border border-success bg-success-bg p-2">
            {binding.governance.map((g) => (
              <li key={g} className="text-xs text-success-fg">
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Region>
  )
}
