import { ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Throbber } from '@/components/ui/Throbber'
import { ChatPanel } from '@/components/workspace/chat/ChatPanel'
import { useState } from 'react'
import { Evidence } from './SourcePeek'
import { Reconcile } from './Reconcile'
import { cn } from '@/lib/cn'
import type { Mode } from '@/lib/autonomy'
import { useAgentEdits } from './agentEdits'
import { useAgentRun } from '@/lib/agentRun'
import {
  NO_MATCH_REPLY,
  RECONCILE_TARGET,
  matchAssisted,
  reconcileTurn,
  suggestionsFor,
  type ChatTurn,
  type ReconcileRow,
  type Step,
} from './data'

/**
 * The chat dock — the same panel at three different authorities.
 *
 * What changes between modes is not the styling but what the panel is *for*,
 * and each difference is load-bearing:
 *
 * - **AI-assisted** — it answers questions about data you uploaded, and offers
 *   a field write you have to press. It opens only when you open it.
 * - **Hybrid** — it is the way into the run. Documents arrive through it, and
 *   it moves you between steps. It is open from the start, because a control
 *   surface you have to summon is not the primary one.
 * - **Autonomous** — the run already happened, so the panel opens on the log
 *   of what the agent did and what it refused to settle. Conversation is the
 *   second thing here, not the first.
 *
 * One rule holds at all three: **nothing the agent proposes is applied until
 * the Apply is pressed**, and every answer carries what it was read out of.
 * An agent that writes on its own account, or answers with no source, cannot
 * be reconstructed afterwards — and a decision nobody can reconstruct is not
 * one the insurer can stand behind.
 */
export function ChatDock({
  mode,
  width,
  onClose,
  onJumpTo,
  onOpenFile,
}: {
  mode: Mode
  /** Fixed, because the host animates ITS width and clips this. */
  width: number
  onClose: () => void
  onJumpTo: (step: Step) => void
  onOpenFile: (fileKey: string, focus?: string) => void
}) {
  const [applied, setApplied] = useState<string[]>([])
  const { run, undo, undoable, busy: writing } = useAgentEdits()

  /**
   * Apply a proposal.
   *
   * A turn that names the fields it would change hands them to the edit bus,
   * which navigates, rings the section and skeletons those fields. One that
   * only names a step still just takes you there — an Apply that claimed to
   * have written something the form cannot show would be the worst of the
   * three outcomes.
   */
  const applyTurn = (turn: ChatTurn) => {
    if (!turn.apply) return
    setApplied((a) => [...a, turn.apply as string])
    if (turn.edits && turn.section && turn.step) {
      run({ token: turn.apply, step: turn.step, section: turn.section, edits: turn.edits })
    } else if (turn.step) {
      onJumpTo(turn.step)
    }
  }

  /**
   * Take the chosen side of a reconciliation.
   *
   * Only the rows the user moved to the document travel; the ones left on
   * the form are not written back as "unchanged", because re-writing a value
   * to itself would skeleton a field that nothing happened to. The whole set
   * is one token, so Undo puts back every field the file won in one press.
   */
  const applyReconcile = (index: number, chosen: ReconcileRow[]) => {
    const token = `reconcile:${index}`
    setApplied((a) => [...a, token])
    run({
      token,
      step: RECONCILE_TARGET.step,
      section: RECONCILE_TARGET.section,
      edits: chosen.map((r) => ({ field: r.field, value: r.incoming.value })),
    })
  }

  const undoToken = (token: string) => {
    undo(token)
    setApplied((a) => a.filter((x) => x !== token))
  }

  return (
    <ChatPanel<ChatTurn>
      ariaLabel={`${mode.label} assistant`}
      width={width}
      header={{
        title: mode.agentic ? 'Agent run' : 'Assistant',
        icon: mode.icon,
        badge: { label: mode.label, tone: mode.agentic ? 'brand' : 'neutral' },
        onClose,
      }}
      conversation={{
        pendingLabel: 'Reading the run',
        // Switching rung starts a new conversation rather than carrying
        // answers given under another authority.
        resetKey: mode.id,
        /* The composer is held while the canvas is being written to as well
           as while the panel is thinking. A second request sent mid-write
           would put two skeletons on the same field and land them out of
           order. */
        busy: writing,
        before: mode.agentic ? <RunLog onJumpTo={onJumpTo} /> : undefined,
        /* A document beats a prompt. If something was attached, the request
           is about that document whatever else was typed alongside it —
           answering the sentence and ignoring the file is how an assistant
           loses the user's trust in one turn. */
        respond: (text, files) => {
          const doc = files[0]?.name
          return doc ? reconcileTurn(doc) : (matchAssisted(text) ?? NO_MATCH_REPLY)
        },
        /**
         * **An answer about a step takes you to that step.** A proposal to
         * change the company name, read while looking at the upload screen,
         * is a claim about somewhere else — you have to take it on trust,
         * press Apply, and only then find out where it landed. Arriving first
         * turns it into something you can check. The navigation is the answer
         * to a request you made, which is what makes it welcome; the write
         * still waits for the Apply.
         */
        onReply: (reply) => {
          if (reply.reconcile) {
            onJumpTo(RECONCILE_TARGET.step)
          } else if (reply.direct && reply.apply && reply.edits && reply.section && reply.step) {
            /* The request named the change: it runs, and the turn is a
               receipt for it rather than an offer of it. `run` does the
               navigating. */
            setApplied((a) => [...a, reply.apply as string])
            run({ token: reply.apply, step: reply.step, section: reply.section, edits: reply.edits })
          } else if (reply.step) {
            /* An answer about somewhere else still takes you there, quietly
               — no ring. The ring belongs to a write, and firing one here
               would spend it before anything had changed. */
            onJumpTo(reply.step)
          }
        },
        /* Sources are shown on the answer, not behind a disclosure. An
           underwriter confirming a number needs to see which dump it came
           out of at the moment they read it — and be able to open it there
           and then, without losing the form it is a claim about. */
        renderExtras: (turn, i) => (
          <>
            {turn.evidence && <Evidence sources={turn.evidence} onOpenFile={onOpenFile} />}
            {turn.reconcile && (
              <Reconcile
                file={turn.file}
                rows={turn.reconcile}
                applied={applied.includes(`reconcile:${i}`)}
                undoable={undoable.includes(`reconcile:${i}`)}
                onApply={(chosen) => applyReconcile(i, chosen)}
                onUndo={() => undoToken(`reconcile:${i}`)}
              />
            )}
          </>
        ),
        apply: {
          state: (turn) => ({
            applied: turn.apply ? applied.includes(turn.apply) : false,
            undoable: turn.apply ? undoable.includes(turn.apply) : false,
          }),
          onApply: (turn) => applyTurn(turn),
          onUndo: (turn) => turn.apply && undoToken(turn.apply),
        },
      }}
      suggestions={{ items: suggestionsFor(mode.id).map((s) => s.suggest as string) }}
      composer={{
        attach: mode.extraction,
        placeholder: mode.agentic ? 'Ask why the agent did something' : 'Ask about the data, or ask me to fill something',
        label: 'Message the assistant',
      }}
    />
  )
}

/* --------------------------------------------------------------- run log */

/**
 * The run log — what the agent did, in the order it did it, live.
 *
 * It is the peripheral view of the same queue the board shows in full: you
 * are on a step, the dock is open, and this is what the run has got to
 * without leaving the field you are editing. The board is where a handoff is
 * actually settled, so nothing here is answerable — a second set of controls
 * over the same task would make "which one did I press" a real question.
 */
function RunLog({ onJumpTo }: { onJumpTo: (step: Step) => void }) {
  const { tasks, state, waiting, started } = useAgentRun()

  /* Nothing to log before the person lets it go. An earlier version rendered
     the fixture regardless of state, so the dock sat there reporting
     confidence scores for work that had not been done — the exact claim this
     flow exists to argue against. */
  if (!started) return null

  return (
    <section className="overflow-hidden rounded-lg border border-default">
      <header className="flex h-9 items-center gap-2 border-b border-default bg-surface-sunken px-3">
        <span className="font-mono text-xs uppercase tracking-wide text-muted">Run log</span>
        <Badge className="ml-auto" tone={waiting.length ? 'warning' : 'neutral'}>
          {waiting.length} with people
        </Badge>
      </header>
      <ol className="flex flex-col">
        {tasks.map((task) => {
          const s = state[task.id] ?? 'queued'
          const open = s === 'waiting'
          return (
            <li
              key={task.id}
              className={cn(
                'flex flex-col gap-1.5 border-b border-subtle px-3 py-2.5 last:border-b-0',
                open && 'bg-warning-100',
                s === 'queued' && 'opacity-40',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-sm font-medium text-default">{task.title}</span>
                {s === 'running' ? (
                  <Throbber phase="toolCall" size={16} label="Running" />
                ) : (
                  <Badge tone={open ? 'warning' : s === 'queued' ? 'neutral' : 'success'}>
                    {Math.round(task.confidence * 100)}%
                  </Badge>
                )}
              </div>
              <p className="text-xs text-subtle">{open ? task.handoff?.ask : task.note}</p>
              <button
                type="button"
                onClick={() => onJumpTo(task.step as Step)}
                className="inline-flex w-fit items-center gap-1 rounded-md font-mono text-xs uppercase tracking-wide text-brand transition-colors duration-base hover:text-brand-fg focus-visible:outline-none focus-visible:shadow-focus"
              >
                {task.step}
                <ArrowUpRight aria-hidden className="h-3 w-3" />
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
