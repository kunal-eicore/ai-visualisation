import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { StepLayers } from './StepLayers'
import { StepProviders } from './StepProviders'
import { ConnectProvider } from './ConnectProvider'
import { StepRouting } from './StepRouting'
import {
  BINDINGS,
  DEFAULT_ASSIGNMENTS,
  MODELS,
  PROVIDERS,
  type Assignment,
  type Model,
  type Provider,
} from './data'

const STEPS = ['Providers', 'Layers', 'Routing'] as const
type Step = (typeof STEPS)[number]

/**
 * The Agent Harness — where a tenant points their own models at our layers.
 *
 * The premise it is designed around: **we sell the harness, not the
 * inference.** No key of ours sits behind this, nothing is proxied, and no
 * model access is bundled. That changes what the screen has to do. A product
 * that resold tokens would open on a catalogue and hide the plumbing; this one
 * opens on the tenant's own accounts, because until they bring one there is
 * nothing to call.
 *
 * Three steps, in the order the work actually happens:
 *
 * - **Providers** — connect your own accounts. Four auth shapes, because an API
 *   key is only the easiest one; an unconfigured provider renders as an empty
 *   catalogue rather than being hidden.
 * - **Layers** — bind the MCP servers, the intelligence layer and the semantic
 *   layer. These are model-independent, which is the whole reason they sit
 *   behind the harness instead of inside a prompt.
 * - **Routing** — bind each agent role to a model, then prove the wiring with a
 *   preflight that checks the things which fail quietly.
 *
 * Same shell as the eval workbench: a 48px step band, then full-bleed regions
 * divided by hairlines. State that outlives a step lives here.
 */
export function Harness() {
  const [step, setStep] = useState<Step>('Providers')
  const [providerId, setProviderId] = useState('anthropic')
  const [modelId, setModelId] = useState<string | null>(null)
  const [bindingId, setBindingId] = useState<string | null>('b-semantic')
  const [roleId, setRoleId] = useState('r-referral')

  // Models probed into the catalogue this session. They append to the fixtures
  // rather than replacing them, and they arrive switched off.
  const [added, setAdded] = useState<Model[]>([])
  const [adding, setAdding] = useState(false)

  // The accounts are state, not a constant: one can be connected from inside
  // the route, and connecting Vertex has to move it out of "not connected".
  const [providers, setProviders] = useState<Provider[]>(PROVIDERS)
  const [connecting, setConnecting] = useState(false)

  // Which model carries which role. The fixtures are only the starting point —
  // a role whose model cannot be changed here is not a role, it is a hardcoded
  // call with extra steps.
  const [assignments, setAssignments] = useState<Record<string, Assignment>>(DEFAULT_ASSIGNMENTS)
  // A binding changed since its last preflight. Kept here rather than in the
  // step so it survives moving between steps.
  const [stale, setStale] = useState<Record<string, boolean>>({})

  const assign = (roleId: string, slot: 'Primary' | 'Fallback', modelId: string | null) => {
    setAssignments((prev) => ({
      ...prev,
      [roleId]:
        slot === 'Primary'
          ? { ...prev[roleId], primaryModelId: modelId! }
          : { ...prev[roleId], fallbackModelId: modelId },
    }))
    // The last preflight tested the old binding and proves nothing about this
    // one. Saying so is the whole value of having run it.
    setStale((prev) => ({ ...prev, [roleId]: true }))
  }

  const [modelEnabled, setModelEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MODELS.map((m) => [m.id, m.enabled])),
  )
  const [bindingEnabled, setBindingEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(BINDINGS.map((b) => [b.id, b.enabled])),
  )

  const index = STEPS.indexOf(step)
  const enabledModels = [...MODELS, ...added].filter((m) => modelEnabled[m.id]).length

  const addModel = (model: Model) => {
    setAdded((prev) => [...prev, model])
    setModelEnabled((prev) => ({ ...prev, [model.id]: false }))
    setAdding(false)
    // Open what was just added, so the add ends somewhere rather than nowhere.
    setModelId(model.id)
  }

  const connectProvider = (provider: Provider, models: Model[]) => {
    setProviders((prev) => {
      const at = prev.findIndex((p) => p.id === provider.id)
      if (at === -1) return [...prev, provider]
      // Connecting a listed-but-unconfigured account replaces that row rather
      // than adding a second one beside it.
      const next = [...prev]
      next[at] = provider
      return next
    })
    setAdded((prev) => [...prev, ...models])
    setModelEnabled((prev) => ({
      ...prev,
      ...Object.fromEntries(models.map((m) => [m.id, false])),
    }))
    setConnecting(false)
    setProviderId(provider.id)
    setModelId(null)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-page">
      <div className="flex h-12 shrink-0 items-center gap-4 border-b border-default bg-surface-card px-4">
        <h1 className="shrink-0 text-sm font-semibold text-default">Agent Harness</h1>
        <span aria-hidden className="h-4 w-px shrink-0 bg-neutral-300" />
        <Tabs options={STEPS} value={step} onChange={setStep} aria-label="Harness step" />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* The standing caveat. It belongs in the chrome rather than in a
              Callout on one step, because it is true on all three. */}
          <span className="hidden font-mono text-xs text-muted lg:inline">
            Bring your own key · no inference bundled
          </span>
          <span className="font-mono text-xs text-muted">Step {index + 1} of 3</span>
          <Button
            size="sm"
            variant="neutral"
            aria-label="Previous step"
            disabled={index === 0}
            onClick={() => setStep(STEPS[index - 1])}
            icon={<ChevronLeft aria-hidden className="h-4 w-4" />}
          />
          <Button
            size="sm"
            disabled={index === STEPS.length - 1}
            onClick={() => setStep(STEPS[index + 1])}
          >
            Next
            <ChevronRight aria-hidden className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      {step === 'Providers' && connecting && (
        <ConnectProvider
          existing={providers}
          onCancel={() => setConnecting(false)}
          onConnect={connectProvider}
        />
      )}

      {step === 'Providers' && !connecting && (
        <StepProviders
          providerId={providerId}
          onSelectProvider={setProviderId}
          modelId={modelId}
          onSelectModel={setModelId}
          enabled={modelEnabled}
          onToggleModel={(id) => setModelEnabled((prev) => ({ ...prev, [id]: !prev[id] }))}
          added={added}
          adding={adding}
          onStartAdd={() => {
            setAdding(true)
            setModelId(null)
          }}
          onCancelAdd={() => setAdding(false)}
          onAdd={addModel}
          providers={providers}
          onStartConnect={() => {
            setConnecting(true)
            setAdding(false)
            setModelId(null)
          }}
        />
      )}

      {step === 'Layers' && (
        <StepLayers
          selectedId={bindingId}
          onSelect={setBindingId}
          enabled={bindingEnabled}
          onToggle={(id) => setBindingEnabled((prev) => ({ ...prev, [id]: !prev[id] }))}
          enabledModels={enabledModels}
        />
      )}

      {step === 'Routing' && (
        <StepRouting
          roleId={roleId}
          onSelectRole={setRoleId}
          bindingEnabled={bindingEnabled}
          providers={providers}
          assignments={assignments}
          onAssign={assign}
          stale={stale}
          onRanPreflight={(id) => setStale((prev) => ({ ...prev, [id]: false }))}
          added={added}
          modelEnabled={modelEnabled}
        />
      )}
    </div>
  )
}
