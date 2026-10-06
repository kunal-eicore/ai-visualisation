import { useEffect, useRef, useState } from 'react'
import { CircleSlash, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FIELD } from '@/components/workspace/field'
import { Region } from '@/components/workspace/Shell'
import { cn } from '@/lib/cn'
import {
  HAND_HINT,
  PROBE_STEPS,
  UNIMPORTED,
  probe,
  type AddSource,
  type Model,
  type ProbeResult,
  type Provider,
} from './data'

type AddModelProps = {
  provider: Provider
  /** Wire ids already added this session — a second row for one id is how a
   *  role ends up bound to the copy nobody is watching. */
  takenIds: string[]
  onCancel: () => void
  onAdd: (model: Model) => void
}

/**
 * Adding a model to the catalogue.
 *
 * Under bring-your-own-key this is **a claim that gets verified, not a form
 * that gets saved**. The product cannot grant access to a model, so the only
 * question worth asking is whether the tenant's own account already serves the
 * id — and the only honest way to answer it is to call the account and see.
 * Every field the probe can answer is therefore filled by the probe, not typed:
 * a context window someone typed by hand is a number that will be wrong later.
 *
 * It takes over the inspector slot rather than opening a modal — the same
 * gesture as defining a context in the workbench, and the reason the §0.5
 * primitive set still has no dialog in it.
 *
 * The flow is deliberately four small steps rather than one spinner, because
 * each one fails differently and the fix differs: a dead credential, an id the
 * account cannot see, a capability that did not come back.
 */
export function AddModel({ provider, takenIds, onCancel, onAdd }: AddModelProps) {
  const [source, setSource] = useState<AddSource>('Discovered')
  const [id, setId] = useState('')
  const [revealed, setRevealed] = useState<number | null>(null)
  const [result, setResult] = useState<ProbeResult | null>(null)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  // Changing the account or the id invalidates whatever the last probe said.
  // A result left standing next to an edited id is the one genuinely
  // misleading state this panel could hold.
  const reset = () => {
    clearTimers()
    setRevealed(null)
    setResult(null)
  }
  useEffect(reset, [provider.id])

  const unimported = UNIMPORTED[provider.kind] ?? []

  const runProbe = () => {
    clearTimers()
    setResult(null)
    setRevealed(0)
    const outcome = probe(provider, id, takenIds)
    const stopAt = outcome.ok
      ? PROBE_STEPS.length
      : PROBE_STEPS.findIndex((s) => s.id === outcome.failedStep) + 1

    for (let i = 1; i <= stopAt; i += 1) {
      timers.current.push(window.setTimeout(() => setRevealed(i), 260 * i))
    }
    timers.current.push(window.setTimeout(() => setResult(outcome), 260 * stopAt + 120))
  }

  const add = () => {
    if (!result?.ok) return
    onAdd({
      id: `m-added-${id.replace(/[^a-z0-9]+/gi, '-')}`,
      providerId: provider.id,
      name: result.name,
      apiId: provider.authMode === 'Endpoint + key' ? `deployment: ${id}` : id,
      context: result.context,
      maxOutput: result.maxOutput,
      rate: result.rate,
      latency: result.latency,
      caps: result.caps,
      note: result.note,
      // Lands switched off. Nothing should start carrying traffic because
      // somebody finished a form.
      enabled: false,
    })
  }

  const probing = revealed !== null && result === null

  return (
    <Region
      title="Add a model"
      icon={<Plus aria-hidden className="h-4 w-4 text-muted" />}
      info="The product cannot grant access to a model — it can only check whether the tenant's own account already serves one. Name the id, probe it with their credential, and the probe fills in the rest. It lands switched off until a role binds it and preflight passes."
      meta={provider.name}
      actions={
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close add model"
          className="rounded-md p-1 text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      }
      footer={
        <div className="flex gap-2">
          {result?.ok ? (
            <Button size="sm" onClick={add}>
              Add to catalogue
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={runProbe}
              disabled={!id.trim() || probing}
              icon={<Search aria-hidden className="h-4 w-4" />}
            >
              {probing ? 'Probing' : 'Probe this id'}
            </Button>
          )}
          <Button size="sm" variant="neutral" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {provider.status !== 'connected' && (
          <div className="rounded-md border border-warning bg-warning-bg p-2.5">
            <p className="text-xs text-warning-fg">
              {provider.name} is not connected, so there is no credential to probe with. Connect the
              account first — nothing is bundled, so there is nothing to fall back to.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-default">Where the id comes from</span>
          <div className="flex gap-2">
            {(['Discovered', 'By hand'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={source === s}
                onClick={() => {
                  setSource(s)
                  setId('')
                  reset()
                }}
                className={cn(
                  'flex-1 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors duration-base',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  source === s
                    ? 'border-brand bg-brand-bg text-brand-fg'
                    : 'border-strong bg-surface-card text-subtle hover:bg-neutral-50',
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted">
            {source === 'Discovered'
              ? 'Ids the provider’s list endpoint returned that are not in the catalogue yet.'
              : 'For what discovery cannot enumerate — a deployment name, a pinned version, whatever a self-hosted server is serving.'}
          </span>
        </div>

        {source === 'Discovered' ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-default">
              Not yet imported <span className="font-mono text-muted">({unimported.length})</span>
            </span>
            {unimported.length === 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-default bg-neutral-50 p-2.5">
                <CircleSlash aria-hidden className="mt-px h-3.5 w-3.5 shrink-0 text-muted" />
                <p className="text-xs text-subtle">
                  Discovery returned nothing new for {provider.name}. Either the catalogue is
                  complete, or this account serves names only the tenant knows — name it by hand.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {unimported.map((candidate: string) => (
                  <li key={candidate}>
                    <button
                      type="button"
                      aria-pressed={id === candidate}
                      onClick={() => {
                        setId(candidate)
                        reset()
                      }}
                      className={cn(
                        'w-full rounded-md border px-2.5 py-1.5 text-left font-mono text-xs transition-colors duration-base',
                        'focus-visible:outline-none focus-visible:shadow-focus',
                        id === candidate
                          ? 'border-brand bg-brand-bg text-brand-fg'
                          : 'border-default bg-surface-card text-subtle hover:bg-neutral-50',
                      )}
                    >
                      {candidate}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-default">
              {provider.authMode === 'Endpoint + key' ? 'Deployment name' : 'Model id'}
            </span>
            <input
              className={cn(FIELD, 'font-mono')}
              value={id}
              onChange={(e) => {
                setId(e.target.value)
                reset()
              }}
              placeholder={HAND_HINT[provider.kind]}
            />
            <span className="text-xs text-muted">
              Exact, and not a floating alias if anything will be measured against it.
            </span>
          </label>
        )}

        {revealed !== null && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-default">Probe</span>
            <ul className="flex flex-col gap-1">
              {PROBE_STEPS.map((s, i) => {
                const done = i < revealed
                const failedHere = !result?.ok && result?.failedStep === s.id
                const reached = done || (result !== null && i < revealed)
                if (!reached) {
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-2 rounded-md border border-default bg-surface-card px-2.5 py-1.5"
                    >
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-neutral-200" />
                      <span className="font-mono text-xs text-disabled">{s.label}</span>
                    </li>
                  )
                }
                return (
                  <li
                    key={s.id}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-2.5 py-1.5',
                      failedHere ? 'border-danger bg-danger-bg' : 'border-success bg-success-bg',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'h-2.5 w-2.5 shrink-0 rounded-full',
                        failedHere ? 'bg-danger-500' : 'bg-success-500',
                      )}
                    />
                    <span
                      className={cn(
                        'font-mono text-xs',
                        failedHere ? 'text-danger-fg' : 'text-success-fg',
                      )}
                    >
                      {s.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {result && !result.ok && (
          <div className="rounded-md border border-danger bg-danger-bg p-2.5">
            <p className="text-xs text-danger-fg">{result.reason}</p>
          </div>
        )}

        {result?.ok && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-default">Reported by the provider</span>
              <dl className="flex flex-col gap-1.5 rounded-md border border-default bg-neutral-50 p-2.5">
                {[
                  ['Name', result.name],
                  ['Context', result.context],
                  ['Max output', result.maxOutput],
                  ['Latency', result.latency],
                  ['Capabilities', result.caps.join(' · ')],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 font-mono text-xs text-muted">{k}</dt>
                    <dd className="truncate text-right font-mono text-xs text-subtle">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-default">The probe cannot answer these</span>
              <ul className="flex flex-col gap-1 rounded-md border border-warning bg-warning-bg p-2">
                {result.unknowns.map((u) => (
                  <li key={u} className="text-xs text-warning-fg">
                    {u}
                  </li>
                ))}
              </ul>
              <span className="text-xs text-muted">
                It lands switched off. Enabling it is a second, deliberate act.
              </span>
            </div>
          </>
        )}
      </div>
    </Region>
  )
}
