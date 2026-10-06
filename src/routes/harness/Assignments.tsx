import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import {
  BINDING_BY_ID,
  CHECKS,
  CLASS_RATIONALE,
  DECISION_CLASSES,
  MODEL_BY_ID,
  ROLES,
  eligibility,
  type Assignment,
  type Model,
  type Provider,
  type Role,
} from './data'

type Slot = 'Primary' | 'Fallback'

type AssignmentsProps = {
  providers: Provider[]
  selectedId: string
  onSelect: (id: string) => void
  bindingEnabled: Record<string, boolean>
  assignments: Record<string, Assignment>
  added: Model[]
  /** Roles bound to something the last preflight never tested. */
  stale: Record<string, boolean>
  modelEnabled: Record<string, boolean>
  /** The table is also where the binding is changed — the cell is the control. */
  onEdit: (roleId: string, slot: Slot) => void
}

/**
 * Every role and the model it is bound to, on one surface.
 *
 * The per-role route answers "what can this one reach". It cannot answer the
 * question anyone actually asks of a harness — *which model is doing what, and
 * why that one* — because that is a comparison, and a comparison needs the rows
 * side by side.
 *
 * It is grouped by **decision class** rather than by department or by model,
 * because the class is what justifies the binding: a reversible proposal a
 * steward checks can run on a cheap on-prem model, and a measurement cannot run
 * on anything that might move under it. Grouping by model would show the same
 * data and argue nothing.
 */
export function Assignments({
  providers,
  selectedId,
  onSelect,
  bindingEnabled,
  assignments,
  added,
  stale,
  modelEnabled,
  onEdit,
}: AssignmentsProps) {
  const byId = Object.fromEntries(providers.map((p) => [p.id, p]))
  const lookup = (id: string | null) =>
    id ? (MODEL_BY_ID[id] ?? added.find((m) => m.id === id) ?? null) : null

  return (
    <div className="min-w-[840px]">
      {DECISION_CLASSES.map((cls) => {
        const rows = ROLES.filter((r) => r.decisionClass === cls)
        if (rows.length === 0) return null
        return (
          <section key={cls}>
            <header className="flex items-baseline gap-3 border-b border-default bg-surface-sunken px-3 py-2">
              <h3 className="shrink-0 font-mono text-xs font-semibold uppercase tracking-wide text-default">
                {cls}
              </h3>
              <p className="min-w-0 flex-1 truncate text-xs text-subtle">{CLASS_RATIONALE[cls]}</p>
            </header>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-subtle bg-surface-card">
                  {['Role', 'Primary', 'Fallback', 'May reach', 'Human gate', 'Preflight'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-3 py-1.5 text-left font-mono text-xs font-normal text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((role) => (
                  <Row
                    key={role.id}
                    role={role}
                    primary={lookup(assignments[role.id].primaryModelId)!}
                    fallback={lookup(assignments[role.id].fallbackModelId)}
                    providerFor={(m) => byId[m.providerId]}
                    selected={role.id === selectedId}
                    stale={Boolean(stale[role.id])}
                    onSelect={() => onSelect(role.id)}
                    onEdit={(slot) => onEdit(role.id, slot)}
                    bindingEnabled={bindingEnabled}
                    modelEnabled={modelEnabled}
                  />
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
    </div>
  )
}

function Row({
  role,
  primary,
  fallback,
  providerFor,
  selected,
  stale,
  onSelect,
  onEdit,
  bindingEnabled,
  modelEnabled,
}: {
  role: Role
  primary: Model
  fallback: Model | null
  providerFor: (m: Model) => Provider | undefined
  selected: boolean
  stale: boolean
  onSelect: () => void
  onEdit: (slot: Slot) => void
  bindingEnabled: Record<string, boolean>
  modelEnabled: Record<string, boolean>
}) {
  const provider = providerFor(primary)
  // A model switched off on the Providers step leaves the role bound to
  // something that cannot be called. Preflight would catch it on its next run;
  // the table must not claim "ready" in the meantime.
  const verdict = eligibility(role, primary, provider, modelEnabled[primary.id] ?? false)
  const checks = CHECKS[role.id]
  const failed = checks.filter((c) => c.status === 'fail').length
  const warned = checks.filter((c) => c.status === 'warn').length
  const cut = role.bindingIds.filter((id) => !bindingEnabled[id]).length

  return (
    <tr
      onClick={onSelect}
      className={cn(
        'cursor-pointer border-b border-subtle bg-surface-card align-top transition-colors duration-base',
        selected ? 'bg-brand-50' : 'hover:bg-neutral-50',
      )}
    >
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={onSelect}
          className="flex flex-col text-left focus-visible:outline-none focus-visible:shadow-focus"
        >
          <span className="text-sm font-semibold text-default">{role.name}</span>
          <span className="max-w-[28ch] truncate text-xs text-subtle">{role.purpose}</span>
        </button>
      </td>

      <td className="px-3 py-2">
        <span className="flex flex-col items-start">
          <Cell label={primary.apiId} onClick={() => onEdit('Primary')} />
          <span className="font-mono text-xs text-muted">
            {provider?.name ?? 'unknown account'} · effort {role.effort}
          </span>
          <span className="font-mono text-xs text-muted">{provider?.residency}</span>
        </span>
      </td>

      <td className="px-3 py-2">
        <span className="flex flex-col items-start">
          <Cell
            label={fallback ? fallback.apiId : 'none'}
            muted={!fallback}
            onClick={() => onEdit('Fallback')}
          />
          {/* Not an omission. Two roles must not silently switch model, and the
              table says why rather than leaving a blank cell. */}
          {!fallback && (
            <span className="max-w-[30ch] text-xs text-subtle">{role.fallbackNote}</span>
          )}
        </span>
      </td>

      <td className="px-3 py-2">
        <span className="flex flex-wrap gap-1">
          {role.bindingIds.map((id) => (
            <span
              key={id}
              className={cn(
                'rounded-md border px-1.5 py-px font-mono text-xs',
                bindingEnabled[id]
                  ? 'border-default bg-neutral-50 text-subtle'
                  : 'border-default bg-neutral-50 text-muted line-through',
              )}
            >
              {BINDING_BY_ID[id].name.replace('-mcp', '')}
            </span>
          ))}
        </span>
      </td>

      <td className="max-w-[26ch] px-3 py-2 text-xs text-subtle">{role.gate}</td>

      <td className="px-3 py-2">
        <span className="flex flex-col items-start gap-1">
          {!verdict.ok ? (
            <Badge tone="danger">broken</Badge>
          ) : stale ? (
            <Badge tone="warning">out of date</Badge>
          ) : failed > 0 ? (
            <Badge tone="danger">{failed} failed</Badge>
          ) : warned > 0 ? (
            <Badge tone="warning">{warned} warning</Badge>
          ) : (
            <Badge tone="success">ready</Badge>
          )}
          {!verdict.ok && (
            <span className="max-w-[24ch] text-xs text-danger-fg">{verdict.reason}</span>
          )}
          {verdict.ok && stale && (
            <span className="font-mono text-xs text-warning-fg">re-run needed</span>
          )}
          {cut > 0 && <span className="font-mono text-xs text-muted">{cut} binding off</span>}
        </span>
      </td>
    </tr>
  )
}

/** A bound model, rendered as the control that rebinds it. Dashed until
 *  hovered: it has to read as changeable without shouting over the table. */
function Cell({ label, muted, onClick }: { label: string; muted?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'rounded-md border border-dashed border-strong px-1.5 py-px font-mono text-xs font-semibold',
        'transition-colors duration-base hover:border-solid hover:border-brand hover:bg-brand-bg hover:text-brand-fg',
        'focus-visible:outline-none focus-visible:shadow-focus',
        muted ? 'text-muted' : 'text-default',
      )}
    >
      {label}
    </button>
  )
}
