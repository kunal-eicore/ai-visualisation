import type { ReactNode } from 'react'
import { Boxes, KeyRound, Plug, PlugZap, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { FIELD } from '@/components/workspace/field'
import { RailRow, Region, Workspace } from '@/components/workspace/Shell'
import { cn } from '@/lib/cn'
import { AddModel } from './AddModel'
import {
  MODELS,
  MODEL_BY_ID,
  type Model,
  type Provider,
  type ProviderStatus,
  type Rate,
} from './data'

const STATUS_TONE: Record<ProviderStatus, Tone> = {
  connected: 'success',
  unconfigured: 'neutral',
  error: 'danger',
}

const STATUS_LABEL: Record<ProviderStatus, string> = {
  connected: 'Connected',
  unconfigured: 'Not connected',
  error: 'Failing',
}

/** A mono pill. Capabilities are labels, not filters, so they are not Chips
 *  (§0.5: a Chip is something you can select). */
function Pill({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-md border px-1.5 py-px font-mono text-xs',
        muted ? 'border-default bg-neutral-50 text-muted' : 'border-default bg-neutral-50 text-subtle',
      )}
    >
      {children}
    </span>
  )
}

function rateLabel(rate: Rate) {
  if (rate.kind === 'list') return `$${rate.input} / $${rate.output} per Mtok`
  if (rate.kind === 'partner') return 'Partner rate'
  return 'No per-token cost'
}

type StepProvidersProps = {
  providerId: string
  onSelectProvider: (id: string) => void
  modelId: string | null
  onSelectModel: (id: string | null) => void
  enabled: Record<string, boolean>
  onToggleModel: (id: string) => void
  /** The tenant's accounts. State, not a constant — one can be connected from
   *  inside the route. */
  providers: Provider[]
  onStartConnect: () => void
  /** Models probed into the catalogue this session, appended to the fixtures. */
  added: Model[]
  adding: boolean
  onStartAdd: () => void
  onCancelAdd: () => void
  onAdd: (model: Model) => void
}

/**
 * Step 1 — the tenant's own provider accounts.
 *
 * The rail is the accounts they have brought, the canvas is what those
 * accounts actually serve, and the right region is either the credential or
 * the model you clicked. One slot, two depths, the way the workbench's
 * inspector works.
 *
 * The thing this step has to communicate before anything else: **no model
 * access ships with the product.** An unconfigured provider is therefore not
 * an error state to apologise for — it is the honest default, and it renders
 * as an empty catalogue rather than a hidden row.
 */
export function StepProviders({
  providerId,
  onSelectProvider,
  modelId,
  onSelectModel,
  enabled,
  onToggleModel,
  providers,
  onStartConnect,
  added,
  adding,
  onStartAdd,
  onCancelAdd,
  onAdd,
}: StepProvidersProps) {
  const byId = Object.fromEntries(providers.map((p) => [p.id, p]))
  const provider = byId[providerId] ?? providers[0]
  const models = [...MODELS, ...added].filter((m) => m.providerId === provider.id)
  const model = modelId ? (MODEL_BY_ID[modelId] ?? added.find((m) => m.id === modelId) ?? null) : null
  const connectedCount = providers.filter((p) => p.status === 'connected').length

  return (
    <Workspace cols="xl:grid-cols-[272px_minmax(0,1fr)_340px]">
      <Region
        title="Your accounts"
        icon={<KeyRound aria-hidden className="h-4 w-4 text-muted" />}
        info="Provider accounts the tenant has connected. Nothing here is resold: the product bundles no inference and holds no key of its own. Calls leave the tenant for the provider directly, and usage bills to the account named on the row."
        meta={<span className="font-mono">{connectedCount} of {providers.length}</span>}
        pad={false}
        footer={
          <Button
            size="sm"
            variant="neutral"
            onClick={onStartConnect}
            icon={<Plug aria-hidden className="h-4 w-4" />}
            className="w-full"
          >
            Connect a provider
          </Button>
        }
      >
        <ul>
          {providers.map((p) => (
            <li key={p.id}>
              <RailRow
                selected={p.id === providerId}
                onClick={() => {
                  onSelectProvider(p.id)
                  onSelectModel(null)
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-default">{p.name}</span>
                  <Badge tone={STATUS_TONE[p.status]} dot={p.status === 'error'}>
                    {STATUS_LABEL[p.status]}
                  </Badge>
                </div>
                <span className="truncate font-mono text-xs text-muted">
                  {p.authMode} · {p.residency}
                </span>
              </RailRow>
            </li>
          ))}
        </ul>
      </Region>

      <Region
        title="Model catalogue"
        icon={<Boxes aria-hidden className="h-4 w-4 text-muted" />}
        info="What the selected account serves, read from the provider at handshake rather than kept as a list in this product. Prices are the provider's own list rate against the tenant's account — shown because a model cannot be chosen without them, not because anything is billed here."
        meta={provider.name}
        sunken
        pad={false}
        actions={
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted">
              {models.filter((m) => enabled[m.id]).length} of {models.length} enabled
            </span>
            <Button
              size="sm"
              variant="neutral"
              onClick={onStartAdd}
              disabled={provider.status !== 'connected'}
              icon={<Plus aria-hidden className="h-4 w-4" />}
            >
              Add model
            </Button>
          </div>
        }
      >
        {models.length === 0 ? (
          <EmptyCatalogue provider={provider} onConnect={onStartConnect} />
        ) : (
          <ul className="flex flex-col gap-px bg-neutral-200">
            {models.map((m) => (
              <li key={m.id}>
                <ModelRow
                  model={m}
                  selected={m.id === modelId}
                  enabled={enabled[m.id]}
                  isNew={added.some((a) => a.id === m.id)}
                  onOpen={() => onSelectModel(m.id)}
                  onToggle={() => onToggleModel(m.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </Region>

      {adding ? (
        <AddModel
          provider={provider}
          takenIds={added
            .filter((m) => m.providerId === providerId)
            .map((m) => m.apiId.replace('deployment: ', ''))}
          onCancel={onCancelAdd}
          onAdd={onAdd}
        />
      ) : model ? (
        <ModelPanel
          model={model}
          provider={byId[model.providerId] ?? provider}
          onClose={() => onSelectModel(null)}
        />
      ) : (
        <CredentialPanel provider={provider} />
      )}
    </Workspace>
  )
}

/* ------------------------------------------------------------------ *
 * Canvas
 * ------------------------------------------------------------------ */

function ModelRow({
  model,
  selected,
  enabled,
  isNew,
  onOpen,
  onToggle,
}: {
  model: Model
  selected: boolean
  enabled: boolean
  /** Probed into the catalogue this session. */
  isNew?: boolean
  onOpen: () => void
  onToggle: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 bg-surface-card px-3 py-2.5 transition-colors duration-base',
        selected && 'bg-brand-50',
        !enabled && 'bg-surface-sunken',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col gap-1 text-left focus-visible:outline-none focus-visible:shadow-focus"
      >
        <div className="flex items-center gap-2">
          <span className={cn('truncate text-sm font-semibold', enabled ? 'text-default' : 'text-muted')}>
            {model.name}
          </span>
          <Pill muted>{model.apiId}</Pill>
          {isNew && <Badge tone="info">Added</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-xs text-muted">{model.context} context</span>
          <span className="font-mono text-xs text-muted">{model.latency}</span>
          <span className="font-mono text-xs text-muted">{rateLabel(model.rate)}</span>
        </div>
      </button>

      <div className="hidden shrink-0 items-center gap-1 xl:flex">
        {model.caps.slice(0, 4).map((c) => (
          <Pill key={c}>{c}</Pill>
        ))}
      </div>

      {/* The one control on the row. A model in the catalogue that nobody has
          enabled is not callable, and that has to be visible without opening
          it. */}
      <Switch checked={enabled} onChange={onToggle} label={`${enabled ? 'Disable' : 'Enable'} ${model.name}`} />
    </div>
  )
}

function EmptyCatalogue({ provider, onConnect }: { provider: Provider; onConnect: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <PlugZap aria-hidden className="h-6 w-6 text-disabled" />
      <h2 className="text-sm font-semibold text-default">No models from {provider.name}</h2>
      <p className="max-w-md text-xs text-subtle">
        Nothing is bundled. The catalogue is whatever the tenant’s own account serves, so it stays
        empty until {provider.name} is connected — connect it and the models are read from the
        provider, not from a list held here.
      </p>
      <Button size="sm" variant="neutral" onClick={onConnect} icon={<Plug aria-hidden className="h-4 w-4" />}>
        Connect {provider.name}
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Inspector — one slot, two depths
 * ------------------------------------------------------------------ */

function CredentialPanel({ provider }: { provider: Provider }) {
  const unconfigured = provider.status === 'unconfigured'
  return (
    <Region
      title="Connection"
      icon={<ShieldCheck aria-hidden className="h-4 w-4 text-muted" />}
      info="The credential is written to the tenant's own vault and referenced by the harness — it is never stored in this product and never rendered back after it is saved. Rotating it here rotates the reference, not the secret."
      meta={provider.name}
      footer={
        <div className="flex gap-2">
          <Button size="sm" disabled={unconfigured} icon={<RefreshCw aria-hidden className="h-4 w-4" />}>
            Test connection
          </Button>
          <Button size="sm" variant="neutral">
            {unconfigured ? 'Save and connect' : 'Rotate credential'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-subtle">{provider.summary}</p>

        <dl className="flex flex-col gap-1.5 rounded-md border border-default bg-neutral-50 p-2.5">
          {[
            ['Operator', provider.operator],
            ['Auth', provider.authMode],
            ['Inference runs in', provider.residency],
            ['Secret held in', provider.vault],
            ['Last check', provider.lastCheck],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 font-mono text-xs text-muted">{k}</dt>
              <dd className="truncate text-right font-mono text-xs text-subtle">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-3">
          {provider.fields.map((f) => (
            <label key={f.label} className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-default">
                {f.label}
                {f.secret && <KeyRound aria-hidden className="h-3 w-3 text-muted" />}
              </span>
              <input
                className={cn(FIELD, f.secret && 'font-mono')}
                defaultValue={f.value}
                placeholder={f.hint && !f.value ? f.hint : undefined}
                readOnly={f.secret && Boolean(f.value)}
              />
              {f.hint && f.value && <span className="text-xs text-muted">{f.hint}</span>}
            </label>
          ))}
        </div>
      </div>
    </Region>
  )
}

function ModelPanel({
  model,
  provider,
  onClose,
}: {
  model: Model
  provider: Provider
  onClose: () => void
}) {
  return (
    <Region
      title={model.name}
      icon={<Boxes aria-hidden className="h-4 w-4 text-muted" />}
      info="What the harness sends on the wire for this model, and what it costs the tenant to call it. The id is exact: a model bound by a floating name moves under anything that is measuring it."
      actions={
        <button
          type="button"
          onClick={onClose}
          aria-label="Close model"
          className="rounded-md px-1.5 py-0.5 font-mono text-xs text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
        >
          Close
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-subtle">{model.note}</p>

        <dl className="flex flex-col gap-1.5 rounded-md border border-default bg-neutral-50 p-2.5">
          {[
            ['Wire id', model.apiId],
            ['Served by', provider.name],
            ['Context', model.context],
            ['Max output', model.maxOutput],
            ['Latency', model.latency],
            ['Rate', rateLabel(model.rate)],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 font-mono text-xs text-muted">{k}</dt>
              <dd className="truncate text-right font-mono text-xs text-subtle">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-default">Capabilities</span>
          <div className="flex flex-wrap gap-1">
            {model.caps.map((c) => (
              <Pill key={c}>{c}</Pill>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 rounded-md border border-info bg-info-bg p-2.5">
          <span className="text-sm font-medium text-info-fg">Who pays</span>
          <p className="text-xs text-info-fg">
            {model.rate.kind === 'list'
              ? `Calls bill to the tenant’s ${provider.name} account at ${provider.name}’s list rate. Nothing is marked up and nothing is proxied through this product.`
              : model.rate.note + '. Nothing is marked up and nothing is proxied through this product.'}
          </p>
        </div>
      </div>
    </Region>
  )
}
