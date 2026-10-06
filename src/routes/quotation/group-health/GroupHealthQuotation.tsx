import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { CHAT_WIDTH, ChatDockHost } from '@/components/workspace/chat/ChatDockHost'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { useAutonomy, useAutonomyScope } from '@/lib/autonomy'
import { useAgentRun } from '@/lib/agentRun'
import { AgentEditsProvider } from './agentEdits'
import { ChatDock } from './ChatDock'
import { FileViewer } from './FileViewer'
import { Stepper, type Annotation } from './Stepper'
import { StepBusiness } from './StepBusiness'
import { StepClaims } from './StepClaims'
import { StepCovers } from './StepCovers'
import { StepMembers } from './StepMembers'
import { StepProcessSheet } from './StepProcessSheet'
import { StepStart } from './StepStart'
import { StepSummary } from './StepSummary'
import { ActionSlotProvider, ProvenanceProvider, type Provenance } from './parts'
import { RunBoard } from './RunBoard'
import { Tabs } from '@/components/ui/Tabs'
import { STEPS, type Step } from './data'

/**
 * The two views of an autonomous run.
 *
 * `steps` is the spine every rung shares and is the default at every rung,
 * Autonomous included. You land on the form you would have landed on in
 * Manual; the board is somewhere you choose to go. Defaulting to the board
 * would make Autonomous a different application that happens to share a
 * breadcrumb, which is the failure this whole ladder argues against.
 */
const VIEWS = ['Steps', 'Run board'] as const
type View = (typeof VIEWS)[number]

/**
 * Group Health Quotation — the Onebuzz flow, rebuilt as a walkthrough, and
 * run at one of four autonomy modes.
 *
 * The goal is the SHAPE of the run, not the functionality behind it: there is
 * no calculator, no extraction and no persistence. What is reproduced is the
 * spine — seven steps in the order the service actually sequences them
 * (`workflow2/src/workflow/groupQuotation/health/configurableUiStepList.ts`,
 * plus the two review checkpoints injected around the calculator):
 *
 *   Start Quotation -> Business Details -> Member Details -> Cover Details
 *   -> Claims & TPA -> Summary (checkpoint) -> Process Sheet (checkpoint)
 *
 * The two checkpoints are why the last two steps look different from the
 * first five. Everything up to Claims & TPA is a form; Summary is the lock
 * before the premium is calculated, and Process Sheet is the review after it.
 *
 * **The mode does not change the spine.** Manual, AI-assisted, Hybrid and
 * Autonomous all run these same seven steps; what changes is who fills them
 * and how much is left to confirm. That is the whole argument: autonomy is a
 * setting on a decision-class journey, not a different product. Three things
 * hold at every setting, and the shell is where they are enforced:
 *
 * - **The mode is switchable mid-run** and the run keeps what it has. An
 *   autonomy level you have to choose before you start is a commitment, and
 *   people commit to the safe one and never move.
 * - **The last action is always a person's.** Submit is never automatic, not
 *   even in Autonomous, where the agent has done everything but sign.
 * - **What the run was prepared under is part of the record.** The mode, the
 *   evidence and the delegations travel with the submission rather than
 *   living in the UI, which is what makes the decision reconstructable later.
 *
 * The rail carries the quotation steps only. The source screen lists the
 * underwriter's review block beneath them; it is not reproduced here, because
 * this walkthrough is the broker-facing run.
 *
 * Two pieces of chrome are fixed and the middle scrolls: the rail on the left,
 * the action bar at the bottom. This mirrors the source screen, where the
 * primary action must stay reachable through a 3,616-row census.
 */
export function GroupHealthQuotation() {
  useAutonomyScope()
  const { mode } = useAutonomy()

  const run = useAgentRun()

  const [step, setStep] = useState<Step>('Start Quotation')
  /* Which view of the same run the canvas is showing.
     The board is a second VIEW, never a second product: the rail stays
     mounted beside it, every step stays reachable, and anything the board
     can settle the step can settle by hand. That is what keeps Autonomous
     the same software as Manual rather than a separate one wearing the same
     breadcrumb. */
  const [view, setView] = useState<View>('Steps')
  // How far the run has been taken. The rail lets you go back freely but not
  // skip ahead — a step you have not passed through has no data to show.
  const [furthest, setFurthest] = useState(0)
  // Where the values in the steps ahead came from. Step 1 decides it, because
  // every route through it lands somewhere different: a blank form, a template
  // the script read, or a document the model read. A card claiming
  // "Auto-filled" over a value you typed is a false claim, and one claiming it
  // over a cell copied out of the published template is a weaker claim than
  // the evidence deserves.
  const [fill, setFill] = useState<Provenance>('manual')
  const [chatOpen, setChatOpen] = useState(mode.chat === 'open')
  const [submitted, setSubmitted] = useState(false)
  /* A cited document, opened from the dock. It takes the canvas rather than
     the screen, so the rail and the transcript that sent you here both stay
     — and the step underneath is untouched, so closing it puts you back
     exactly where you were rather than re-entering the step. */
  const [file, setFile] = useState<{ key: string; focus?: string } | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  // A callback ref rather than useRef: the slot has to be state, or the first
  // render of a step portals into null and the bar comes up empty.
  const [actionSlot, setActionSlot] = useState<HTMLDivElement | null>(null)

  const index = STEPS.indexOf(step)
  const isLast = index === STEPS.length - 1

  // Switching mode re-settles the run rather than restarting it. Autonomous
  // has already been everywhere, so every step unlocks; a mode that cannot
  // read loose documents cannot go on claiming a model filled the form.
  //
  // A template import SURVIVES the drop to Manual, and that is the point of
  // separating the two claims: the script that read those cells is still
  // available at this rung, so the evidence is still good. Only the AI claim
  // is withdrawn.
  useEffect(() => {
    if (!mode.extraction) setFill((f) => (f === 'extracted' ? 'manual' : f))
    setChatOpen(mode.chat === 'open')
    if (!mode.agentic) setView('Steps')
  }, [mode])

  /* In Autonomous the rail unlocks BEHIND the run rather than all at once.
     A step the agent has not reached has nothing in it, and opening it to a
     blank form while the top bar says the agent is working would be the
     screen contradicting itself. */
  useEffect(() => {
    if (!mode.agentic) return
    let reached = 0
    for (const task of run.tasks) {
      const state = run.state[task.id]
      if (!state || state === 'queued') continue
      reached = Math.max(reached, STEPS.indexOf(task.step as Step))
    }
    setFurthest((f) => Math.max(f, reached))
  }, [mode.agentic, run.tasks, run.state])

  /* The top-bar indicator asks for the board; the route is what can give it,
     because the view is the route's state. */
  useEffect(() => {
    if (!run.boardRequested) return
    if (mode.agentic) setView('Run board')
    run.clearBoardRequest()
  }, [run.boardRequested, mode.agentic, run])

  /* The agent claim is made by the RUN, not by the rung. Before the pack is
     confirmed there is no run, so Autonomous falls back to whatever actually
     filled the fields — which, having come through the same upload as the
     two rungs below it, is the extraction. A card reading "Agent filled"
     over values no agent has touched is the one claim this flow cannot
     afford to get wrong. */
  const provenance: Provenance = mode.agentic && run.started ? 'agent' : fill

  // The rail's second signal, and only in Autonomous: a step the agent
  // stopped on outranks one it filled, so a delegation wins the row.
  const annotations = useMemo(() => {
    if (!mode.agentic) return undefined
    const map: Partial<Record<Step, Annotation>> = {}
    for (const task of run.tasks) {
      const state = run.state[task.id]
      const step = task.step as Step
      if (!state || state === 'queued') continue
      if (state === 'waiting' || state === 'sent') map[step] = 'needs-you'
      else if (!map[step]) map[step] = 'agent'
    }
    return map
  }, [mode.agentic, run.tasks, run.state])

  const goTo = (next: Step) => {
    setStep(next)
    // Naming a step is a request to see it. A rail click that left the board
    // up would be a control that does nothing you can see.
    setView('Steps')
    setFurthest((f) => Math.max(f, STEPS.indexOf(next)))
    // A step change is a page change here; leaving the scroll where the last
    // step ended would open the next one halfway down.
    scroller.current?.scrollTo({ top: 0 })
  }

  const advance = () => {
    if (isLast) {
      setSubmitted(true)
      return
    }
    goTo(STEPS[index + 1])
  }

  return (
    <ProvenanceProvider value={provenance}>
      <ActionSlotProvider value={actionSlot}>
      {/* Outside the panel and the canvas both, because it is the bus
          between them: the dock proposes a write, the step renders it. */}
      <AgentEditsProvider onNavigate={goTo}>
      <div className="relative flex h-full overflow-hidden bg-surface-page">
        <Stepper current={step} furthest={furthest} annotations={annotations} onSelect={goTo} />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* The view switch, and only once a run exists to have two views
              of. In the other three rungs there is none, and in Autonomous
              there is none until the documents are confirmed — a tab bar
              with one live tab is chrome. */}
          {mode.agentic && run.phase !== 'idle' && (
            <div className="flex h-[41px] shrink-0 items-center border-b border-default bg-surface-card px-6">
              <Tabs
                aria-label="Quotation view"
                options={VIEWS}
                value={view}
                onChange={setView}
              />
            </div>
          )}

          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1180px] p-6">
              {view === 'Run board' && <RunBoard onOpenStep={goTo} />}
              {view === 'Steps' && (
              <>
              {file && (
                <FileViewer fileKey={file.key} focus={file.focus} onClose={() => setFile(null)} />
              )}
              <div className={cn(file && 'hidden')}>
              {step === 'Start Quotation' && (
                <StepStart
                  mode={mode}
                  onContinue={(source) => {
                    setFill(source)
                    /* In Autonomous the pack is what the agent was waiting
                       for, and confirming it is the go. There is no plan to
                       approve in between: the board opens on a run that is
                       already moving. Every other rung goes to the form. */
                    if (mode.agentic) {
                      if (run.phase === 'idle') run.start()
                      setView('Run board')
                      return
                    }
                    goTo('Business Details')
                  }}
                />
              )}
              {step === 'Business Details' && <StepBusiness />}
              {step === 'Member Details' && <StepMembers />}
              {step === 'Cover Details' && <StepCovers />}
              {step === 'Claims & TPA' && <StepClaims />}
              {step === 'Summary' && <StepSummary onJumpTo={goTo} />}
              {step === 'Process Sheet' && <StepProcessSheet />}
              </div>
              </>
              )}
            </div>
          </div>

          {/* The action bar, on every step including the first. Steps that
              move forward get Back + the primary; Step 1's actions change as
              you move through it, so it renders its own into the slot. */}
          <div className="flex h-14 shrink-0 items-center gap-3 border-t border-default bg-surface-card px-6">
            {index > 0 && (
              <Button
                variant="neutral"
                size="sm"
                onClick={() => goTo(STEPS[index - 1])}
                icon={<ChevronLeft aria-hidden className="h-4 w-4" />}
              >
                Back
              </Button>
            )}

            {/* In Autonomous the submit button is the only thing on this
                screen the agent did not do, and the bar says so rather
                than letting the label imply the work was the user's. */}
            {mode.agentic && isLast && (
              <span className="ml-3 font-mono text-xs uppercase tracking-wide text-muted">
                Prepared by the agent, submitted by you
              </span>
            )}

            <span className="ml-auto font-mono text-xs text-muted">
              Step {index + 1} of {STEPS.length}
            </span>

            <div ref={setActionSlot} className="flex shrink-0 items-center gap-2" />

            {step !== 'Start Quotation' && (
              <Button size="sm" onClick={advance}>
                {isLast
                  ? 'Submit Quotation'
                  : step === 'Summary'
                    ? 'Confirm & Continue'
                    : mode.agentic
                      ? 'Accept & Continue'
                      : 'Save & Continue'}
                {isLast ? (
                  <Send aria-hidden className="h-4 w-4" />
                ) : (
                  <ChevronRight aria-hidden className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* The tab rides just above the action bar rather than at the middle
            of the right edge, where it would sit level with whatever the
            user is reading. */}
        {mode.chat !== 'off' && (
          <ChatDockHost
            open={chatOpen}
            onOpen={() => setChatOpen(true)}
            tab={{ label: mode.agentic ? 'Agent run' : 'Assistant', className: 'bottom-[72px]' }}
          >
            <ChatDock
              mode={mode}
              width={CHAT_WIDTH}
              onClose={() => setChatOpen(false)}
              onJumpTo={(next) => {
                setFile(null)
                goTo(next)
              }}
              onOpenFile={(key, focus) => {
                setFile({ key, focus })
                scroller.current?.scrollTo({ top: 0 })
              }}
            />
          </ChatDockHost>
        )}

        {submitted && (
          <Toast
            tone="success"
            title="Quotation submitted"
            description={`Prepared in ${mode.label} mode and submitted by you. The mode, the evidence behind each field and anything the agent left open are stored with it, so the decision can be reconstructed later. It now sits with the underwriter for review.`}
            onDismiss={() => setSubmitted(false)}
          />
        )}
      </div>
      </AgentEditsProvider>
      </ActionSlotProvider>
    </ProvenanceProvider>
  )
}
