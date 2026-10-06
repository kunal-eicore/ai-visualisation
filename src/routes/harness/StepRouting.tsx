import { useEffect, useRef, useState } from 'react'
import { CircleDot, Network, Play, RefreshCw, Route, ShieldAlert, UserCog } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RailRow, Region, Workspace } from '@/components/workspace/Shell'
import { cn } from '@/lib/cn'
import { Assignments } from './Assignments'
import { RoleBinding } from './RoleBinding'
import { Wiring, WiringLegend } from './Wiring'
import {
  BINDINGS,
  BINDING_BY_ID,
  CHECKS,
  CHECK_TONE,
  MODEL_BY_ID,
  ROLES,
  ROLE_BY_ID,
  type Assignment,
  type Check,
  type Model,
  type Provider,
  type Role,
} from './data'

type StepRoutingProps = {
  roleId: string
  onSelectRole: (id: string) => void
  /** Bindings switched off in step 2 — a role cannot route to a cut wire. */
  bindingEnabled: Record<string, boolean>
  providers: Provider[]
  assignments: Record<string, Assignment>
  onAssign: (roleId: string, slot: 'Primary' | 'Fallback', modelId: string | null) => void
  /** Roles whose binding changed since the last preflight. */
  stale: Record<string, boolean>
  onRanPreflight: (roleId: string) => void
  added: Model[]
  modelEnabled: Record<string, boolean>
}

/**
 * Step 3 — which model does which job, and whether the wiring actually holds.
 *
 * A harness that ends at "the key works" has proved the least interesting
 * thing about itself. The checks on the right are the ones that fail quietly in
 * production: a floating model id under a measurement, a service account where
 * identity passthrough was assumed, an on-prem model that is weaker at tool
 * calling than the cloud roles it is being compared against.
 *
 * The canvas is the same wiring as step 2, filtered to what this role may
 * reach — reused rather than redrawn, the way the workbench reuses its graph
 * between build and test.
 */
type View = 'Assignments' | 'Route'

export function StepRouting({
  roleId,
  onSelectRole,
  bindingEnabled,
  providers,
  assignments,
  onAssign,
  stale,
  onRanPreflight,
  added,
  modelEnabled,
}: StepRoutingProps) {
  const role = ROLE_BY_ID[roleId]
  const checks = CHECKS[roleId]
  const assignment = assignments[roleId]
  const providerById = Object.fromEntries(providers.map((p) => [p.id, p]))

  // The slot the inspector is editing, or null when it is showing preflight.
  const [binding, setBinding] = useState<'Primary' | 'Fallback' | null>(null)

  // Opens on the whole map. "Which model is doing what" is the question a
  // harness gets asked first, and one role's route cannot answer it.
  const [view, setView] = useState<View>('Assignments')

  // The panel opens on the last run rather than empty: the previous result is
  // more use than a blank slate, and re-running is one click away.
  const [revealed, setRevealed] = useState(checks.length)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  useEffect(() => {
    clearTimers()
    setRevealed(CHECKS[roleId].length)
    return clearTimers
  }, [roleId])

  const run = () => {
    clearTimers()
    onRanPreflight(roleId)
    setRevealed(0)
    checks.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setRevealed(i + 1), 220 * (i + 1)))
    })
  }

  const running = revealed < checks.length
  const live = role.bindingIds.filter((id) => bindingEnabled[id])
  const cut = role.bindingIds.filter((id) => !bindingEnabled[id])
  const lit = new Set(live.flatMap((id) => BINDING_BY_ID[id].path))
  const off = new Set(BINDINGS.filter((b) => !bindingEnabled[b.id]).flatMap((b) => b.path.slice(2, 4)))

  const primary = MODEL_BY_ID[assignment.primaryModelId] ?? added.find((m) => m.id === assignment.primaryModelId)!
  const isStale = Boolean(stale[roleId])

  return (
    <Workspace cols="xl:grid-cols-[272px_minmax(0,1fr)_340px]">
      <Region
        title="Agent roles"
        icon={<UserCog aria-hidden className="h-4 w-4 text-muted" />}
        info="A role is a job, not a model. Binding the job to a model here is what lets the model change without touching the workflow that depends on it — and what makes the change auditable when it happens."
        meta={<span className="font-mono">{ROLES.length}</span>}
        pad={false}
      >
        <ul>
          {ROLES.map((r) => {
            const m =
              MODEL_BY_ID[assignments[r.id].primaryModelId] ??
              added.find((x) => x.id === assignments[r.id].primaryModelId)!
            return (
              <li key={r.id}>
                <RailRow selected={r.id === roleId} onClick={() => onSelectRole(r.id)}>
                  <span className="truncate text-sm font-semibold text-default">{r.name}</span>
                  <span className="truncate font-mono text-xs text-muted">{m.apiId}</span>
                  <span className="truncate text-xs text-subtle">{r.decisionClass}</span>
                </RailRow>
              </li>
            )
          })}
        </ul>
      </Region>

      <Region
        title={view === 'Assignments' ? 'Assignments' : 'Route'}
        icon={<Network aria-hidden className="h-4 w-4 text-muted" />}
        info={
          view === 'Assignments'
            ? 'Every role and the model it is bound to, grouped by decision class — the axis that justifies the binding. A reversible proposal a steward checks can run on a cheap on-prem model; a measurement cannot run on anything that might move under it.'
            : "What this role may reach. Everything outside its allowance is drawn back rather than hidden — a role's blast radius is easier to argue about when you can see what it is not allowed to touch."
        }
        meta={view === 'Assignments' ? `${ROLES.length} roles` : role.name}
        sunken
        pad={false}
        actions={
          <div className="flex items-center gap-2">
            {view === 'Route' && <WiringLegend />}
            <div className="flex overflow-hidden rounded-md border border-strong">
              {(['Assignments', 'Route'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-2 py-1 font-mono text-xs transition-colors duration-base',
                    'focus-visible:outline-none focus-visible:shadow-focus',
                    view === v
                      ? 'bg-brand-bg text-brand-fg'
                      : 'bg-surface-card text-muted hover:bg-neutral-50',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        }
        footer={
          view === 'Route' ? (
            <ModelBar
              role={role}
              assignment={assignment}
              added={added}
              providerById={providerById}
              onEdit={setBinding}
            />
          ) : undefined
        }
      >
        {view === 'Assignments' ? (
          <Assignments
            providers={providers}
            selectedId={roleId}
            onSelect={onSelectRole}
            bindingEnabled={bindingEnabled}
            assignments={assignments}
            added={added}
            stale={stale}
            modelEnabled={modelEnabled}
            onEdit={(id, slot) => {
              onSelectRole(id)
              setBinding(slot)
            }}
          />
        ) : (
          <Wiring
            lit={lit}
            off={off}
            runtimeLabel={role.name}
            runtimeDetail={primary.apiId}
            selectedId={null}
          />
        )}
      </Region>

      {binding ? (
        <RoleBinding
          role={role}
          assignment={assignment}
          providers={providers}
          added={added}
          modelEnabled={modelEnabled}
          initialSlot={binding}
          onAssign={(slot, modelId) => onAssign(roleId, slot, modelId)}
          onClose={() => setBinding(null)}
        />
      ) : (
        <Region
          title="Preflight"
          icon={<CircleDot aria-hidden className="h-4 w-4 text-muted" />}
          info="Run before a role goes live and after any change to a key, a model or a binding. Each check names what it means when it does not pass, because a red row with no explanation gets clicked past."
          meta={running ? 'Running' : isStale ? 'Out of date' : 'Last run 9 min ago'}
          actions={
            <Button
              size="sm"
              variant={isStale ? 'primary' : 'neutral'}
              onClick={run}
              disabled={running}
              icon={<Play aria-hidden className="h-4 w-4" />}
            >
              {running ? 'Running' : 'Run'}
            </Button>
          }
          footer={<Verdict checks={checks} revealed={revealed} cut={cut.length} stale={isStale} />}
        >
          {/* A stale result is the one genuinely misleading thing this panel
              could show, so the previous run is labelled rather than silently
              left standing next to a binding it never tested. */}
          {isStale && (
            <div className="mb-2 flex items-start gap-2 rounded-md border border-warning bg-warning-bg p-2.5">
              <RefreshCw aria-hidden className="mt-px h-3.5 w-3.5 shrink-0 text-warning-fg" />
              <p className="text-xs text-warning-fg">
                The binding changed. Everything below is from the previous one and proves nothing
                about this one — run it again.
              </p>
            </div>
          )}
          <ul className={cn('flex flex-col gap-1.5', isStale && 'opacity-50')}>
            {checks.map((c, i) => (
              <li key={c.id}>
                <CheckRow check={c} revealed={i < revealed} />
              </li>
            ))}
          </ul>
        </Region>
      )}

    </Workspace>
  )
}

/** Primary and fallback dock into the canvas footer — they are what the route
 *  above resolves to, not a panel of their own. Each is the control that opens
 *  the binding, so the place you read the assignment is the place you change
 *  it. */
function ModelBar({
  role,
  assignment,
  added,
  providerById,
  onEdit,
}: {
  role: Role
  assignment: Assignment
  added: Model[]
  providerById: Record<string, Provider>
  onEdit: (slot: 'Primary' | 'Fallback') => void
}) {
  const lookup = (id: string | null) =>
    id ? (MODEL_BY_ID[id] ?? added.find((m) => m.id === id) ?? null) : null
  const primary = lookup(assignment.primaryModelId)!
  const fallback = lookup(assignment.fallbackModelId)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono text-xs text-muted">primary</span>
        <SlotButton label={primary.apiId} onClick={() => onEdit('Primary')} />
        <span className="font-mono text-xs text-muted">
          · {providerById[primary.providerId]?.name ?? 'unknown account'} · effort {role.effort}
        </span>
      </span>
      <span aria-hidden className="hidden h-4 w-px bg-neutral-300 sm:block" />
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono text-xs text-muted">fallback</span>
        <SlotButton
          label={fallback ? fallback.apiId : 'none'}
          muted={!fallback}
          onClick={() => onEdit('Fallback')}
        />
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-subtle">{role.fallbackNote}</span>
      <span className="shrink-0 font-mono text-xs text-muted">{role.budget}</span>
    </div>
  )
}

function SlotButton({
  label,
  muted,
  onClick,
}: {
  label: string
  muted?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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

function CheckRow({ check, revealed }: { check: Check; revealed: boolean }) {
  if (!revealed) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-default bg-surface-card px-2.5 py-2">
        {/* A skeleton for exactly as long as the check is out — the same rule
            the copilot's repricing cells follow. */}
        <span aria-hidden className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-neutral-200" />
        <span aria-hidden className="h-3 w-32 animate-pulse rounded bg-neutral-200" />
        <span className="sr-only">{check.label} — checking</span>
      </div>
    )
  }

  const tone = CHECK_TONE[check.status]
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-md border px-2.5 py-2',
        check.status === 'pass' && 'border-default bg-surface-card',
        check.status === 'warn' && 'border-warning bg-warning-bg',
        check.status === 'fail' && 'border-danger bg-danger-bg',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-default">{check.label}</span>
        <Badge tone={tone}>{check.status}</Badge>
      </div>
      <span className="font-mono text-xs text-subtle">{check.result}</span>
      {check.status !== 'pass' && <p className="text-xs text-subtle">{check.detail}</p>}
    </div>
  )
}

/** The one sentence someone reads before deciding whether to turn the role on. */
function Verdict({
  checks,
  revealed,
  cut,
  stale,
}: {
  checks: Check[]
  revealed: number
  cut: number
  stale: boolean
}) {
  if (revealed < checks.length) {
    return <span className="font-mono text-xs text-muted">Checking {revealed} of {checks.length}</span>
  }
  if (stale) {
    return (
      <span className="text-xs text-warning-fg">
        Not run against the current binding. The role keeps running on its last proven one until it is.
      </span>
    )
  }
  const failed = checks.filter((c) => c.status === 'fail').length
  const warned = checks.filter((c) => c.status === 'warn').length

  if (failed > 0) {
    return (
      <div className="flex items-start gap-2">
        <ShieldAlert aria-hidden className="mt-px h-4 w-4 shrink-0 text-danger-fg" />
        <span className="text-xs text-danger-fg">
          {failed} check{failed > 1 ? 's' : ''} failed. The role stays off until it passes — a harness
          that lets you override this is not enforcing anything.
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2">
      <Route aria-hidden className="mt-px h-4 w-4 shrink-0 text-muted" />
      <span className="text-xs text-subtle">
        Ready to run.
        {warned > 0 && ` ${warned} warning${warned > 1 ? 's' : ''} — the role runs, degraded, and says so in the trace.`}
        {cut > 0 && ` ${cut} of its bindings are switched off.`}
      </span>
    </div>
  )
}
