import { useState } from 'react'
import { ArrowUpRight, Bot, Check, Send, UserRound } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Throbber } from '@/components/ui/Throbber'
import { cn } from '@/lib/cn'
import { useAgentRun, type HandoffKind, type RunTask, type TaskState } from '@/lib/agentRun'
import { useSettleHandoff } from './Handoffs'
import type { Step } from './data'

/**
 * The run board — the second view of the run, and the one where the agent's
 * ownership of the sequence is visible.
 *
 * It does not replace the stepper and is not allowed to. The steps are the
 * continuity with the other three rungs: the same seven, in the same order,
 * editable by hand, whether or not an agent touched them. What the board adds
 * is the thing the stepper structurally cannot show, because a rail is
 * ordered by the form and a run is not: that work is in flight, that some of
 * it is with people, and which people.
 *
 * Three columns, by who currently holds the task. Sorting by status instead
 * would put a question to the broker next to a question to you, which is the
 * grouping that matters least — the whole reason to look at this screen is to
 * find what is yours.
 *
 * Nothing here is a second way to do what a step does. A handoff with options
 * is settled in place because the answer IS the whole task; a handoff without
 * them sends you to the step, because the decision needs the form around it.
 */
export function RunBoard({ onOpenStep }: { onOpenStep: (step: Step) => void }) {
  const { tasks, state } = useAgentRun()

  const working = tasks.filter((t) => {
    const s = state[t.id]
    return s === 'queued' || s === 'running'
  })
  /* A sent request stays here. It is with a person more than anything else
     on this screen is — it is with a person who does not work here. */
  const withPeople = tasks.filter((t) => {
    const s = state[t.id]
    return s === 'waiting' || s === 'sent'
  })
  const settled = tasks.filter((t) => {
    const s = state[t.id]
    return s === 'done' || s === 'answered'
  })

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Column
        title="Agent working"
        count={working.length}
        tone={working.length ? 'brand' : 'neutral'}
      >
        {working.map((task) => (
          <TaskCard key={task.id} task={task} state={state[task.id]} onOpenStep={onOpenStep} />
        ))}
      </Column>

      <Column
        title="With people"
        count={withPeople.length}
        tone={withPeople.length ? 'warning' : 'neutral'}
      >
        {withPeople.map((task) => (
          <TaskCard key={task.id} task={task} state={state[task.id]} onOpenStep={onOpenStep} />
        ))}
      </Column>

      <Column title="Settled" count={settled.length} tone="success">
        {settled.map((task) => (
          <TaskCard key={task.id} task={task} state={state[task.id]} onOpenStep={onOpenStep} />
        ))}
      </Column>
    </div>
  )
}

function Column({
  title,
  count,
  tone,
  children,
}: {
  title: string
  count: number
  tone: Tone
  children: React.ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <header className="flex items-center gap-2 px-1">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted">{title}</h3>
        <Badge tone={tone}>{count}</Badge>
      </header>
      <div className="flex flex-col gap-3">
        {count === 0 ? (
          <p className="rounded-lg border border-dashed border-default px-3 py-4 text-sm text-subtle">
            Nothing here.
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

/**
 * The three handoff kinds, told apart by what they say rather than by colour
 * alone. The wording is the contract: a question names where it will land if
 * nobody answers, and the other two do not, because they have nowhere.
 */
const KIND: Record<HandoffKind, { label: string; tone: Tone }> = {
  question: { label: 'Question', tone: 'info' },
  delegation: { label: 'Delegated', tone: 'warning' },
  escalation: { label: 'Escalated', tone: 'alert' },
}

const TO_LABEL: Record<string, string> = {
  you: 'You',
  underwriter: 'Underwriter',
  broker: 'Broker',
}

function TaskCard({
  task,
  state,
  onOpenStep,
}: {
  task: RunTask
  state: TaskState | undefined
  onOpenStep: (step: Step) => void
}) {
  const { send, answers } = useAgentRun()
  const settle = useSettleHandoff()
  const [draftOpen, setDraftOpen] = useState(false)

  const handoff = task.handoff
  const mine = handoff?.to === 'you'
  const waiting = state === 'waiting'
  const answered = state === 'answered'
  const sent = state === 'sent'

  return (
    <article
      className={cn(
        'flex flex-col gap-2.5 rounded-lg border bg-surface-card p-3 shadow-card',
        waiting ? 'border-warning-200 bg-warning-100' : 'border-default',
        sent && 'border-info-200 bg-info-50',
        state === 'queued' && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-base font-medium text-default">{task.title}</span>
        {state === 'running' ? (
          <Throbber phase="toolCall" size={18} label="Running" />
        ) : sent ? (
          <Badge tone="info">Sent</Badge>
        ) : waiting && handoff ? (
          <Badge tone={KIND[handoff.kind].tone}>{KIND[handoff.kind].label}</Badge>
        ) : (
          <Badge tone="success" icon={<Check aria-hidden className="h-3 w-3" />}>
            {Math.round(task.confidence * 100)}%
          </Badge>
        )}
      </div>

      {/* Which agent, and the class that routed it there. The rung is on the
          card rather than in a legend because it is the reason this task is
          where it is: a class running below Autonomous cannot close its own
          work, and that is a fact about this row, not a note about the
          system. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral" icon={<Bot aria-hidden className="h-3 w-3" />}>
          {task.agent}
        </Badge>
        <span className="font-mono text-xs text-muted">{task.classRung}</span>
      </div>

      {/* Same voice rule as on the form: a task addressed to the reader is
          written at them, and everything else reads as a work item for
          whoever picks it up. The board is where the difference does most of
          its work, because this is the one screen showing all five at once. */}
      <p className="text-sm text-subtle">
        {handoff && (waiting || sent)
          ? mine
            ? (handoff.yours ?? handoff.ask)
            : handoff.ask
          : task.note}
      </p>

      {handoff && (waiting || sent) && handoff.can && (
        <p className="text-sm text-muted">{handoff.can}</p>
      )}

      {sent && handoff && (
        <div className="flex items-center gap-1.5">
          <UserRound aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted" />
          <span className="text-sm text-default">
            Waiting on {TO_LABEL[handoff.to].toLowerCase()}
            {handoff.who ? ` · ${handoff.who}` : ''}
          </span>
        </div>
      )}

      {waiting && handoff && (
        <>
          <div className="flex items-center gap-1.5">
            <UserRound aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted" />
            <span className="text-sm text-default">
              {TO_LABEL[handoff.to]}
              {handoff.who ? ` · ${handoff.who}` : ''}
            </span>
          </div>

          {/* Only a question has one, and it is the whole difference between
              a question and the other two: this task has somewhere safe to
              land if nobody comes back to it. */}
          {handoff.fallback && <p className="text-sm italic text-muted">{handoff.fallback}</p>}

          {handoff.options && (
            <div className="flex flex-wrap gap-2">
              {handoff.options.map((opt) => (
                <Button
                  key={opt}
                  size="sm"
                  variant="outline"
                  onClick={() => handoff && settle(task, handoff, opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}

          {/* Outbound: written by the agent, released by a person. Inside the
              company the agent assigns work on its own; the moment a task
              crosses to someone who is not in this building, the cost of
              being wrong stops being recoverable by an Undo. */}
          {handoff.outbound && (
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="text" onClick={() => setDraftOpen((o) => !o)}>
                {draftOpen ? 'Hide the draft' : 'Review the draft'}
              </Button>
              {draftOpen && (
                <div className="flex flex-col gap-2 rounded-md border border-default bg-surface-card p-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-muted">{handoff.outbound.to}</span>
                    <span className="text-sm font-medium text-default">
                      {handoff.outbound.subject}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-sm text-subtle">{handoff.outbound.body}</p>
                  <Button
                    size="sm"
                    className="self-start"
                    onClick={() => send(task.id)}
                    icon={<Send aria-hidden className="h-4 w-4" />}
                  >
                    Send it
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {answered && (
        <Badge tone="success">Answered: {answers[task.id]}</Badge>
      )}
      {sent && <Badge tone="info">Request sent, no answer yet</Badge>}

      <button
        type="button"
        onClick={() => onOpenStep(task.step as Step)}
        className="inline-flex w-fit items-center gap-1 rounded-md font-mono text-xs uppercase tracking-wide text-brand transition-colors duration-base hover:text-brand-fg focus-visible:outline-none focus-visible:shadow-focus"
      >
        {task.step}
        <ArrowUpRight aria-hidden className="h-3 w-3" />
      </button>
    </article>
  )
}
