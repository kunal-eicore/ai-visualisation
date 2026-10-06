import { useEffect, useRef, useState } from 'react'
import { Check, KeyRound, Plug, PlugZap, ShieldCheck, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FIELD } from '@/components/workspace/field'
import { RailRow, Region, Workspace } from '@/components/workspace/Shell'
import { cn } from '@/lib/cn'
import {
  CONNECT_STEPS,
  PROVIDER_KINDS,
  connect,
  type ConnectResult,
  type KindSpec,
  type Model,
  type Provider,
} from './data'

type ConnectProviderProps = {
  /** Already connected, so the rail can say what cannot be added twice. */
  existing: Provider[]
  onCancel: () => void
  onConnect: (provider: Provider, models: Model[]) => void
}

/**
 * Connecting one of the tenant's own provider accounts.
 *
 * It takes over the whole step rather than the inspector slot, because it is
 * not an inspection — it is three distinct pieces of work that each need room:
 * choosing the shape, supplying the credential, and reading back what the
 * account actually turned out to serve. The workspace is the same three regions
 * as everywhere else in the route, so it reads as the same tool in a different
 * mode rather than a screen from another product.
 *
 * The thing the form has to resist being: **one API-key field.** That would be
 * the easiest build and wrong for three of the five shapes — two of them store
 * no secret at all, and one of them names models the vendor has never heard of.
 * The rail is therefore a choice of transaction, not a choice of logo.
 *
 * Nothing here grants access to anything. Connecting proves the tenant's own
 * account works and reads its catalogue; every model it finds arrives switched
 * off.
 */
export function ConnectProvider({ existing, onCancel, onConnect }: ConnectProviderProps) {
  const [kind, setKind] = useState<KindSpec>(PROVIDER_KINDS[0])
  const [values, setValues] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState<number | null>(null)
  const [result, setResult] = useState<ConnectResult | null>(null)
  const [importing, setImporting] = useState<Set<string>>(new Set())
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const reset = () => {
    clearTimers()
    setRevealed(null)
    setResult(null)
    setImporting(new Set())
  }

  const taken = (k: KindSpec) => existing.some((p) => p.kind === k.kind && p.status === 'connected')
  const blocked = taken(kind) && !kind.multiple

  const handshake = () => {
    clearTimers()
    setResult(null)
    setRevealed(0)
    const outcome = connect(kind, values)
    const stopAt = outcome.ok
      ? CONNECT_STEPS.length
      : CONNECT_STEPS.findIndex((s) => s.id === outcome.failedStep) + 1

    for (let i = 1; i <= stopAt; i += 1) {
      timers.current.push(window.setTimeout(() => setRevealed(i), 280 * i))
    }
    timers.current.push(
      window.setTimeout(() => {
        setResult(outcome)
        // Everything discovered is ticked for import by default — but it still
        // arrives switched off, so this is a catalogue decision, not a traffic
        // decision.
        if (outcome.ok) setImporting(new Set(outcome.discovered.map((d) => d.apiId)))
      }, 280 * stopAt + 120),
    )
  }

  const save = () => {
    if (!result?.ok) return
    const suffix = existing.filter((p) => p.kind === kind.kind).length
    const id = suffix === 0 ? kind.kind : `${kind.kind}-${suffix + 1}`
    const label = values['Label']?.trim()

    const provider: Provider = {
      id,
      kind: kind.kind,
      name: label ? `${kind.name} · ${label}` : kind.name,
      operator: kind.operator,
      status: 'connected',
      authMode: kind.authMode,
      residency: result.residency,
      vault: kind.vault,
      lastCheck: 'Handshake just now',
      summary: kind.blurb,
      fields: kind.fields.map((f) => ({
        ...f,
        // A secret is never rendered back, including the one just supplied.
        value: f.secret ? '•'.repeat(24) : (values[f.label] ?? ''),
      })),
    }

    const models: Model[] = result.discovered
      .filter((d) => importing.has(d.apiId))
      .map((d) => ({ ...d, id: `m-${id}-${d.apiId.replace(/[^a-z0-9]+/gi, '-')}`, providerId: id, enabled: false }))

    onConnect(provider, models)
  }

  const running = revealed !== null && result === null

  return (
    <Workspace cols="xl:grid-cols-[288px_minmax(0,1fr)_340px]">
      <Region
        title="Connect a provider"
        icon={<Plug aria-hidden className="h-4 w-4 text-muted" />}
        info="Five shapes, not five logos. What differs between them is the transaction — a secret pasted here, a role assumed with no secret at all, an endpoint whose model names the tenant chose — and that difference decides which roles may ever use it."
        pad={false}
        actions={
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel connecting a provider"
            className="rounded-md p-1 text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        }
      >
        <ul>
          {PROVIDER_KINDS.map((k) => {
            const already = taken(k)
            return (
              <li key={k.kind}>
                <RailRow
                  selected={k.kind === kind.kind}
                  onClick={() => {
                    setKind(k)
                    setValues({})
                    reset()
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-default">{k.name}</span>
                    {already && (
                      <Badge tone={k.multiple ? 'info' : 'neutral'}>
                        {k.multiple ? 'Add another' : 'Connected'}
                      </Badge>
                    )}
                  </div>
                  <span className="truncate font-mono text-xs text-muted">{k.authMode}</span>
                </RailRow>
              </li>
            )
          })}
        </ul>
      </Region>

      <Region
        title={kind.name}
        icon={<KeyRound aria-hidden className="h-4 w-4 text-muted" />}
        info="Everything on this form belongs to the tenant. The secret, where one exists at all, is written to their vault and referenced by the harness — it is not stored in this product and is not rendered back afterwards."
        meta={kind.authMode}
        sunken
        footer={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handshake} disabled={running || blocked}>
              {running ? 'Handshaking' : 'Handshake'}
            </Button>
            <Button size="sm" variant="neutral" onClick={onCancel}>
              Cancel
            </Button>
            <span className="min-w-0 flex-1 truncate text-xs text-muted">
              {blocked
                ? `${kind.name} is already connected, and a tenant holds one of these.`
                : 'Nothing is saved until the handshake passes.'}
            </span>
          </div>
        }
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <p className="text-sm text-subtle">{kind.blurb}</p>

          <dl className="flex flex-col gap-1.5 rounded-md border border-default bg-surface-card p-2.5">
            {[
              ['Operator', kind.operator],
              ['Auth', kind.authMode],
              ['Inference will run in', kind.residency],
              ['Secret held in', kind.vault],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 font-mono text-xs text-muted">{k}</dt>
                <dd className="truncate text-right font-mono text-xs text-subtle">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {kind.fields.map((f) => (
              <label key={f.label} className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-default">
                  {f.label}
                  {f.secret && <KeyRound aria-hidden className="h-3 w-3 text-muted" />}
                </span>
                <input
                  className={cn(FIELD, f.secret && 'font-mono')}
                  type={f.secret ? 'password' : 'text'}
                  value={values[f.label] ?? ''}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, [f.label]: e.target.value }))
                    reset()
                  }}
                  placeholder={f.hint}
                />
                {f.hint && <span className="text-xs text-muted">{f.hint}</span>}
              </label>
            ))}
          </div>

          {/* The standing promise, on the screen where it is actually being
              made rather than in marketing copy. */}
          <div className="flex flex-col gap-1 rounded-md border border-info bg-info-bg p-2.5">
            <span className="flex items-center gap-1.5 text-sm font-medium text-info-fg">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
              What connecting does, and does not, mean
            </span>
            <ul className="flex flex-col gap-0.5 text-xs text-info-fg">
              <li>Calls go from the tenant to {kind.name} directly. Nothing is proxied through this product.</li>
              <li>Usage bills to the tenant’s own account. No inference is bundled and nothing is marked up.</li>
              <li>The catalogue is read from the account. This product cannot grant access to a model.</li>
              <li>Everything discovered arrives switched off.</li>
            </ul>
          </div>
        </div>
      </Region>

      <Region
        title="Handshake"
        icon={<PlugZap aria-hidden className="h-4 w-4 text-muted" />}
        info="Four checks, because each fails differently and the fix differs. The one that catches most real mistakes is the third: an identity that can read the account but not invoke a model looks connected right up until the first case needs it."
        meta={running ? 'Running' : result ? (result.ok ? 'Passed' : 'Failed') : 'Not run'}
        footer={
          result?.ok ? (
            <Button size="sm" onClick={save} disabled={importing.size === 0} className="w-full">
              {importing.size === 0
                ? 'Select at least one model'
                : `Connect and import ${importing.size} model${importing.size > 1 ? 's' : ''}`}
            </Button>
          ) : (
            <span className="text-xs text-muted">
              Supply the fields and handshake. Nothing is written until it passes.
            </span>
          )
        }
      >
        {revealed === null ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <PlugZap aria-hidden className="h-6 w-6 text-disabled" />
            <p className="max-w-[28ch] text-xs text-subtle">
              The account is checked before anything is saved, so a provider in the rail is one that
              answered — not one somebody typed.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-1">
              {CONNECT_STEPS.map((s, i) => {
                const failedHere = result && !result.ok && result.failedStep === s.id
                const reached = i < revealed
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
                      'flex flex-col gap-0.5 rounded-md border px-2.5 py-1.5',
                      failedHere ? 'border-danger bg-danger-bg' : 'border-success bg-success-bg',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          'h-2.5 w-2.5 shrink-0 rounded-full',
                          failedHere ? 'bg-danger-500' : 'bg-success-500',
                        )}
                      />
                      <span
                        className={cn('font-mono text-xs', failedHere ? 'text-danger-fg' : 'text-success-fg')}
                      >
                        {s.label}
                      </span>
                    </span>
                    {failedHere && <p className="pl-4.5 text-xs text-danger-fg">{s.detail}</p>}
                  </li>
                )
              })}
            </ul>

            {result && !result.ok && (
              <div className="rounded-md border border-danger bg-danger-bg p-2.5">
                <p className="text-xs text-danger-fg">{result.reason}</p>
              </div>
            )}

            {result?.ok && (
              <>
                {result.warning && (
                  <div className="rounded-md border border-warning bg-warning-bg p-2.5">
                    <p className="text-xs text-warning-fg">{result.warning}</p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-default">
                    Discovered{' '}
                    <span className="font-mono text-muted">({result.discovered.length})</span>
                  </span>
                  <span className="text-xs text-muted">
                    Read from the account, not from a list held here. Import what the tenant intends
                    to use; the rest stays in their account, untouched.
                  </span>
                  <ul className="flex flex-col gap-1">
                    {result.discovered.map((d) => {
                      const on = importing.has(d.apiId)
                      return (
                        <li key={d.apiId}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setImporting((prev) => {
                                const next = new Set(prev)
                                if (next.has(d.apiId)) next.delete(d.apiId)
                                else next.add(d.apiId)
                                return next
                              })
                            }
                            className={cn(
                              'flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors duration-base',
                              'focus-visible:outline-none focus-visible:shadow-focus',
                              on
                                ? 'border-brand bg-brand-bg'
                                : 'border-default bg-surface-card hover:bg-neutral-50',
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                on ? 'border-brand bg-brand-500 text-white' : 'border-strong bg-surface-card',
                              )}
                            >
                              {on && <Check aria-hidden className="h-3 w-3" />}
                            </span>
                            <span className="flex min-w-0 flex-col">
                              <span
                                className={cn(
                                  'truncate font-mono text-xs font-semibold',
                                  on ? 'text-brand-fg' : 'text-default',
                                )}
                              >
                                {d.apiId}
                              </span>
                              <span className="truncate font-mono text-xs text-muted">
                                {d.context} context · {d.latency}
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </Region>
    </Workspace>
  )
}
