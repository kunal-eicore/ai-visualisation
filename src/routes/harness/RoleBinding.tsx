import { useState } from 'react'
import { Ban, Check, Link2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Region } from '@/components/workspace/Shell'
import { cn } from '@/lib/cn'
import {
  MODELS,
  eligibility,
  type Assignment,
  type Model,
  type Provider,
  type Role,
} from './data'

type Slot = 'Primary' | 'Fallback'

type RoleBindingProps = {
  role: Role
  assignment: Assignment
  providers: Provider[]
  added: Model[]
  modelEnabled: Record<string, boolean>
  /** Which slot the click that opened this panel was aimed at. */
  initialSlot: Slot
  onAssign: (slot: Slot, modelId: string | null) => void
  onClose: () => void
}

/**
 * Where a model is actually bound to a role.
 *
 * The assignment table is a comparison; this is the act. It opens in the
 * inspector slot — the same one the preflight occupies — because binding a
 * model and proving the binding works are two depths of one job, and only one
 * of them is ever the thing you are doing.
 *
 * The catalogue is filtered, never merely sorted: every model the tenant has is
 * listed, and the ones this role cannot use say **why** on the row. A harness
 * that lets you bind an unusable model and discovers it at the first real case
 * has moved the failure from a settings screen to an underwriter's desk.
 *
 * Two roles refuse a fallback outright rather than defaulting it to none, and
 * the panel gives the reason where the control would have been — a disabled
 * control with no explanation reads as an oversight.
 */
export function RoleBinding({
  role,
  assignment,
  providers,
  added,
  modelEnabled,
  initialSlot,
  onAssign,
  onClose,
}: RoleBindingProps) {
  const [slot, setSlot] = useState<Slot>(initialSlot)
  const byId = Object.fromEntries(providers.map((p) => [p.id, p]))
  const catalogue = [...MODELS, ...added]

  const current = slot === 'Primary' ? assignment.primaryModelId : assignment.fallbackModelId
  const fallbackBlocked = slot === 'Fallback' && !role.fallbackAllowed

  const rows = catalogue.map((m) => ({
    model: m,
    provider: byId[m.providerId],
    verdict: eligibility(role, m, byId[m.providerId], modelEnabled[m.id] ?? false),
  }))
  const usable = rows.filter((r) => r.verdict.ok).length

  return (
    <Region
      title="Bind a model"
      icon={<Link2 aria-hidden className="h-4 w-4 text-muted" />}
      info="The role is the stable thing; the model behind it is not. Binding one here is what lets the model change without touching the workflow that depends on it — and what makes the change auditable when it happens. Changing a binding invalidates the last preflight, so it has to be run again."
      meta={role.name}
      actions={
        <button
          type="button"
          onClick={onClose}
          aria-label="Close binding"
          className="rounded-md p-1 text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      }
      footer={
        <span className="font-mono text-xs text-muted">
          {usable} of {rows.length} models can carry this role
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-default">Slot</span>
          <div className="flex gap-2">
            {(['Primary', 'Fallback'] as const).map((sl) => (
              <button
                key={sl}
                type="button"
                aria-pressed={slot === sl}
                onClick={() => setSlot(sl)}
                className={cn(
                  'flex-1 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors duration-base',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  slot === sl
                    ? 'border-brand bg-brand-bg text-brand-fg'
                    : 'border-strong bg-surface-card text-subtle hover:bg-neutral-50',
                )}
              >
                {sl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-md border border-default bg-neutral-50 p-2.5">
          <span className="font-mono text-xs text-muted">This role requires</span>
          <span className="font-mono text-xs text-subtle">
            {role.requires.join(' · ')}
            {role.onPremOnly && ' · no egress'}
          </span>
          <span className="text-xs text-subtle">{role.decisionClass}</span>
        </div>

        {fallbackBlocked ? (
          // The reason sits where the control would have been. A greyed-out
          // picker with no explanation reads as an oversight.
          <div className="flex flex-col gap-1.5 rounded-md border border-warning bg-warning-bg p-2.5">
            <span className="flex items-center gap-1.5 text-sm font-medium text-warning-fg">
              <Ban aria-hidden className="h-3.5 w-3.5" />
              This role takes no fallback
            </span>
            <p className="text-xs text-warning-fg">{role.fallbackNote}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-default">
              {slot === 'Primary' ? 'Bind as primary' : 'Bind as fallback'}
            </span>

            {slot === 'Fallback' && (
              <button
                type="button"
                aria-pressed={current === null}
                onClick={() => onAssign('Fallback', null)}
                className={cn(
                  'w-full rounded-md border px-2.5 py-1.5 text-left transition-colors duration-base',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  current === null
                    ? 'border-brand bg-brand-bg'
                    : 'border-default bg-surface-card hover:bg-neutral-50',
                )}
              >
                <span className={cn('font-mono text-xs font-semibold', current === null ? 'text-brand-fg' : 'text-default')}>
                  none
                </span>
                <p className="text-xs text-subtle">
                  The role fails rather than quietly answering on another model.
                </p>
              </button>
            )}

            <ul className="flex flex-col gap-1">
              {rows.map(({ model, provider, verdict }) => {
                const bound = current === model.id
                const blockedElsewhere =
                  slot === 'Fallback' && assignment.primaryModelId === model.id
                    ? 'Already the primary. A fallback to the same model is not a fallback.'
                    : null
                const reason = !verdict.ok ? verdict.reason : blockedElsewhere
                const disabled = Boolean(reason)

                return (
                  <li key={model.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      aria-pressed={bound}
                      onClick={() => onAssign(slot, model.id)}
                      className={cn(
                        'flex w-full flex-col gap-0.5 rounded-md border px-2.5 py-1.5 text-left transition-colors duration-base',
                        'focus-visible:outline-none focus-visible:shadow-focus',
                        bound
                          ? 'border-brand bg-brand-bg'
                          : disabled
                            ? 'border-default bg-surface-sunken'
                            : 'border-default bg-surface-card hover:bg-neutral-50',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {bound && <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand-fg" />}
                        <span
                          className={cn(
                            'truncate font-mono text-xs font-semibold',
                            bound ? 'text-brand-fg' : disabled ? 'text-muted' : 'text-default',
                          )}
                        >
                          {model.apiId}
                        </span>
                      </span>
                      <span className="truncate font-mono text-xs text-muted">
                        {provider?.name ?? 'unknown account'} · {provider?.residency ?? 'residency unknown'}
                      </span>
                      {reason && <span className="text-xs text-subtle">{reason}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <Button size="sm" variant="neutral" onClick={onClose}>
          Done
        </Button>
      </div>
    </Region>
  )
}
