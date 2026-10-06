import { useState } from 'react'
import { ArrowLeftRight, ChevronLeft, ChevronRight, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Region, Workspace } from '@/components/workspace/Shell'
import { StepBuild } from './StepBuild'
import { StepSelect } from './StepSelect'
import { StepTest } from './StepTest'
import { CONTEXTS, WORKFLOWS, type ContextDef } from './data'

const STEPS = ['Select workflow', 'Workflow builder', 'Test'] as const
type Step = (typeof STEPS)[number]

/**
 * The Eval Workbench — "Method 2" from `ai-research/Agentic flows.jpg`.
 *
 * The sketch weighs it against a training mode layered onto the live screens.
 * The trade it records is friction against fit: the overlay needs no new
 * screens and is therefore always in the caseworker's way, while this one is a
 * dedicated surface that costs a mode switch and touches nothing in the
 * journey. This route is the second.
 *
 * It is a full-height route (AppShell: `h-full overflow-hidden`, scroll the
 * inner panels). There is no page header and no page padding — a slim step
 * band, then the workspace edge to edge. A tool that is mostly canvas should
 * not spend a fifth of the screen introducing itself.
 *
 * State that outlives a step — the context library, the selected block — lives
 * here; everything local to a step stays in the step.
 */
export function Workbench() {
  const [step, setStep] = useState<Step>('Select workflow')
  const [workflowId, setWorkflowId] = useState<string>('wf-uw-referral')
  const [contexts, setContexts] = useState<ContextDef[]>(CONTEXTS)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const workflow = WORKFLOWS.find((w) => w.id === workflowId)!
  const index = STEPS.indexOf(step)

  const go = (next: Step) => {
    setStep(next)
    setSelectedNodeId(null)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-page">
      {/* The step band. Title, steps and step nav in one 48px row — the whole
          of the page chrome. */}
      <div className="flex h-12 shrink-0 items-center gap-4 border-b border-default bg-surface-card px-4">
        <h1 className="shrink-0 text-sm font-semibold text-default">Eval Workbench</h1>
        <span aria-hidden className="h-4 w-px shrink-0 bg-neutral-300" />
        <Tabs options={STEPS} value={step} onChange={go} aria-label="Workbench step" />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="hidden font-mono text-xs text-muted lg:inline">{workflow.name}</span>
          <span className="font-mono text-xs text-muted">Step {index + 1} of 3</span>
          <Button
            size="sm"
            variant="neutral"
            aria-label="Previous step"
            disabled={index === 0}
            onClick={() => go(STEPS[index - 1])}
            icon={<ChevronLeft aria-hidden className="h-4 w-4" />}
          />
          <Button size="sm" disabled={index === STEPS.length - 1} onClick={() => go(STEPS[index + 1])}>
            Next
            <ChevronRight aria-hidden className="ml-1 h-4 w-4" />
          </Button>
          <span aria-hidden className="h-4 w-px bg-neutral-300" />
          <Button
            size="sm"
            variant="neutral"
            aria-label="Compare runs"
            icon={<ArrowLeftRight aria-hidden className="h-4 w-4" />}
          />
        </div>
      </div>

      {step === 'Select workflow' && (
        <StepSelect
          selectedId={workflowId}
          onSelect={setWorkflowId}
          onOpen={(id) => {
            setWorkflowId(id)
            go('Workflow builder')
          }}
        />
      )}

      {step !== 'Select workflow' &&
        (workflow.modelled ? (
          step === 'Workflow builder' ? (
            <StepBuild
              contexts={contexts}
              onAddContext={(ctx) => setContexts((prev) => [...prev, ctx])}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          ) : (
            <StepTest selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
          )
        ) : (
          <NotModelled name={workflow.name} onBack={() => go('Select workflow')} />
        ))}
    </div>
  )
}

/** Five of the six library workflows are rows, not graphs — reachable only by
 *  jumping straight to a step with one of them selected. */
function NotModelled({ name, onBack }: { name: string; onBack: () => void }) {
  return (
    <Workspace cols="">
      <Region title={name} icon={<FlaskConical aria-hidden className="h-4 w-4 text-muted" />} sunken>
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <FlaskConical aria-hidden className="h-6 w-6 text-disabled" />
          <h2 className="text-sm font-semibold text-default">{name} is not modelled here</h2>
          <p className="max-w-md text-xs text-subtle">
            This exploration builds one workflow end to end — UW referral triage — so the canvas, the event
            stream and the checks all describe the same run.
          </p>
          <Button size="sm" variant="neutral" onClick={onBack}>Back to the library</Button>
        </div>
      </Region>
    </Workspace>
  )
}
