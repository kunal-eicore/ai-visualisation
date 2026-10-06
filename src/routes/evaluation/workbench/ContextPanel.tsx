import { useState } from 'react'
import { Layers, Library, Radio, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FIELD } from '@/components/workspace/field'
import { Region } from '@/components/workspace/Shell'
import { cn } from '@/lib/cn'
import { KIND_ICON } from './Graph'
import {
  AGENT_BY_ID,
  EVENT_BY_ID,
  NODES,
  type ContextDef,
  type GraphNode,
} from './data'

/** The one control every inspector header carries. */
function CloseAction({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={`Close ${label}`}
      className="rounded-md p-1 text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
    >
      <X aria-hidden className="h-4 w-4" />
    </button>
  )
}

/* ------------------------------------------------------------------ *
 * Define a context out of the selected events
 * ------------------------------------------------------------------ */

export function DefineContext({
  eventIds,
  onCancel,
  onSave,
}: {
  eventIds: string[]
  onCancel: () => void
  onSave: (ctx: ContextDef) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState<ContextDef['scope']>('Library')

  const save = () => {
    if (!name.trim()) return
    onSave({
      id: `ctx-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'No description given.',
      eventIds,
      // The fields a new context exposes are the event sources it was cut
      // from — the prototype does not parse payloads.
      fields: [...new Set(eventIds.map((id) => EVENT_BY_ID[id].source))].map((s) => ({
        key: s,
        value: 'from event payload',
      })),
      scope,
    })
  }

  return (
    <Region
      title="Define context"
      icon={<Library aria-hidden className="h-4 w-4 text-muted" />}
      info="Name the events you selected. Blocks then read the name instead of the raw events, so two workflows cannot quietly disagree about what a loss ratio is. Library scope makes it reusable; workflow scope keeps it here."
      actions={<CloseAction label="define context" onClose={onCancel} />}
      footer={
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={!name.trim()}>Save context</Button>
          <Button size="sm" variant="neutral" onClick={onCancel}>Cancel</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-default">Name</span>
          <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} placeholder="Prior experience" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-default">What it defines</span>
          <textarea
            className={cn(FIELD, 'min-h-[76px] resize-y')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="The claims view of an existing group, cut once so the definition cannot drift."
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-default">Scope</span>
          <div className="flex gap-2">
            {(['Library', 'This workflow'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={scope === s}
                onClick={() => setScope(s)}
                className={cn(
                  'flex-1 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors duration-base',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  scope === s
                    ? 'border-brand bg-brand-bg text-brand-fg'
                    : 'border-strong bg-surface-card text-subtle hover:bg-neutral-50',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-default">
            Tagged events <span className="font-mono text-muted">({eventIds.length})</span>
          </span>
          <ul className="flex flex-col gap-1 rounded-md border border-success bg-success-bg p-2">
            {eventIds.map((id) => (
              <li key={id} className="flex items-baseline gap-2 text-xs">
                <span className="font-mono text-success-fg">{EVENT_BY_ID[id].ts}</span>
                <span className="truncate font-mono font-semibold text-success-fg">{EVENT_BY_ID[id].label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Region>
  )
}

/* ------------------------------------------------------------------ *
 * The library of saved definitions
 * ------------------------------------------------------------------ */

export function ContextLibrary({
  contexts,
  onHoverEvents,
}: {
  contexts: ContextDef[]
  onHoverEvents: (ids: string[] | null) => void
}) {
  return (
    <Region
      title="Context library"
      icon={<Library aria-hidden className="h-4 w-4 text-muted" />}
      info="The core definitions this workflow and every other one reads from. Each was cut from a stretch of an event stream and named once. Hover one to light the events it came from."
      meta="Hover one to light its events"
      pad={false}
    >
      <ul>
        {contexts.map((c) => {
          const usedBy = NODES.filter((n) => n.contexts.includes(c.id))
          return (
            <li
              key={c.id}
              onMouseEnter={() => onHoverEvents(c.eventIds)}
              onMouseLeave={() => onHoverEvents(null)}
              className="flex flex-col gap-2 border-b border-subtle px-3 py-2.5 transition-colors duration-base hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-default">{c.name}</span>
                <Badge tone={c.scope === 'Library' ? 'info' : 'neutral'}>{c.scope}</Badge>
              </div>
              <p className="text-xs text-subtle">{c.description}</p>
              <div className="flex flex-wrap gap-1">
                {c.fields.slice(0, 3).map((f) => (
                  <span key={f.key} className="rounded-md border border-default bg-neutral-50 px-1.5 py-px font-mono text-xs text-subtle">
                    {f.key}
                  </span>
                ))}
                {c.fields.length > 3 && (
                  <span className="font-mono text-xs text-muted">+{c.fields.length - 3}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <Radio aria-hidden className="h-3 w-3" />
                  <span className="font-mono">{c.eventIds.length}</span> events
                </span>
                <span>
                  {usedBy.length ? `Read by ${usedBy.map((n) => n.label).join(', ')}` : 'Not read by any block yet'}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </Region>
  )
}

/* ------------------------------------------------------------------ *
 * The selected block, and the layers inside it
 * ------------------------------------------------------------------ */

export function BlockInspector({
  node,
  contexts,
  onClose,
}: {
  node: GraphNode
  contexts: ContextDef[]
  onClose: () => void
}) {
  const agent = AGENT_BY_ID[node.agentId]
  const Icon = KIND_ICON[agent.kind]

  return (
    <Region
      title={node.label}
      icon={<Icon aria-hidden className="h-4 w-4 text-muted" />}
      info="One block, opened up: the steps that run inside it, the contexts it reads and the events it consumes. A block on the canvas is a summary — this is what is actually underneath it."
      actions={<CloseAction label={node.label} onClose={onClose} />}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-start gap-1.5">
          <Badge tone={agent.tone}>{agent.name}</Badge>
          <p className="text-sm text-subtle">{agent.blurb}</p>
        </div>

        {/* Sketch: "a single block can have many more layers within it." */}
        <section className="flex flex-col gap-2">
          <h4 className="inline-flex items-center gap-1.5 text-sm font-semibold text-default">
            <Layers aria-hidden className="h-4 w-4 text-muted" />
            Inside this block
          </h4>
          <ol className="flex flex-col">
            {node.layers.map((l, i) => (
              <li key={l.label} className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-default bg-neutral-50 font-mono text-xs text-subtle">
                    {i + 1}
                  </span>
                  {i < node.layers.length - 1 && <span aria-hidden className="w-px flex-1 bg-neutral-300" />}
                </div>
                <div className="flex flex-col gap-0.5 pb-3">
                  <span className="text-sm font-medium text-default">{l.label}</span>
                  <span className="text-xs text-subtle">{l.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-default">Reads</h4>
          {node.contexts.length === 0 ? (
            <p className="text-xs text-muted">No context — this block runs off the event that triggered it.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {node.contexts.map((id) => {
                const c = contexts.find((x) => x.id === id)
                if (!c) return null
                return (
                  <li key={id} className="flex items-center justify-between gap-2 rounded-md border border-info bg-info-bg px-2 py-1.5">
                    <span className="truncate text-xs font-semibold text-info-fg">{c.name}</span>
                    <span className="shrink-0 font-mono text-xs text-info-fg">{c.eventIds.length} events</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-default">Consumes</h4>
          <ul className="flex flex-col gap-1">
            {node.events.map((id) => (
              <li key={id} className="flex items-baseline gap-2 text-xs">
                <span className="font-mono text-muted">{EVENT_BY_ID[id].ts}</span>
                <span className="truncate font-mono font-semibold text-default">{EVENT_BY_ID[id].label}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Region>
  )
}
