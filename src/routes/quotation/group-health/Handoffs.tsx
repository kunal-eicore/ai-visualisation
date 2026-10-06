import { useEffect, useState, type ReactNode } from 'react'
import { UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useAgentRun, type Handoff, type RunTask } from '@/lib/agentRun'
import { useAgentEdits } from './agentEdits'
import type { Step } from './data'

/**
 * A handoff, told where it happened.
 *
 * The run board is the whole queue; this is the half of it that belongs on
 * the form. Someone working the steps — which is the normal way to use this
 * flow at every rung — should not have to go and read a board to find out
 * that the step they are on is stopped, and should not be told by a banner
 * at the top of the page either: the thing that is waiting is a particular
 * surface, so that surface is what says so and what lights up.
 *
 * Two properties are carried here rather than left to each step:
 *
 * - **The edge only glows when the task is yours.** A run hands work to the
 *   underwriter and to the broker as well, and lighting those the same way
 *   would make three quarters of the glow on the screen something you cannot
 *   act on. Those still say what they are; they just do not shout.
 * - **The glow fades; the notice does not.** Arriving at a step is the
 *   moment the glow has something to say, and a handoff can then sit open
 *   for as long as it takes to settle. Holding the edge lit for all of that
 *   makes it wallpaper, so the two signals are split by lifespan: the glow
 *   points, the band inside the card states.
 * - **The wording changes with the recipient.** Not yours reads as a work
 *   item written for whoever picks it up; yours addresses you and names the
 *   move. An obligation with no stated move is an alarm, not a task.
 */

/**
 * How long the arrival glow is held before it lapses.
 *
 * Longer than `FLASH_MS` (1400) because that one confirms something you just
 * clicked and this one has to be noticed by someone who was reading
 * elsewhere on the page when it appeared.
 */
const ATTENTION_MS = 2400

/**
 * True for a beat, whenever `active` becomes true.
 *
 * Re-arms on remount, which is what makes "when I navigate to it" work
 * without the route having to tell anyone: each step is mounted fresh when
 * it is opened, so arriving IS the mount.
 */
function useArrivalGlow(active: boolean) {
  const [on, setOn] = useState(active)

  useEffect(() => {
    if (!active) {
      setOn(false)
      return
    }
    setOn(true)
    const timer = window.setTimeout(() => setOn(false), ATTENTION_MS)
    return () => window.clearTimeout(timer)
  }, [active])

  return on
}

/** The open handoff sitting on a surface, if there is one. */
export function useHandoff(section: string | undefined): {
  task: RunTask
  handoff: Handoff
  mine: boolean
} | null {
  const { tasks, state } = useAgentRun()
  if (!section) return null
  const task = tasks.find(
    (t) => t.handoff?.section === section && (state[t.id] === 'waiting' || state[t.id] === 'sent'),
  )
  if (!task?.handoff) return null
  return { task, handoff: task.handoff, mine: task.handoff.to === 'you' }
}

/**
 * The props a surface needs to report a handoff. Spread onto a SectionCard:
 * one call, so a card can never end up glowing with nothing to read or
 * carrying a notice with no glow.
 */
export function useHandoffProps(section: string | undefined): {
  notice?: ReactNode
  attention?: boolean
} {
  const found = useHandoff(section)
  const glow = useArrivalGlow(Boolean(found?.mine))
  if (!found) return {}
  return {
    notice: <HandoffNotice {...found} />,
    attention: glow,
  }
}

/**
 * Settle a handoff: record the answer AND write it into the form.
 *
 * Both, always, and from one place — the notice on the step and the card on
 * the board call this rather than each doing half. Recording an answer the
 * field does not show would leave the run claiming one thing while the form
 * says another, and the whole argument of this flow is that those two can
 * never be allowed to drift.
 *
 * The write goes through the ordinary edit bus, so answering a question gets
 * the same skeleton, the same ring and the same Undo as anything else the
 * agent writes. Nothing here is a privileged path.
 */
export function useSettleHandoff() {
  const { answer } = useAgentRun()
  const { run } = useAgentEdits()

  return (task: RunTask, handoff: Handoff, choice: string) => {
    answer(task.id, choice)
    const edits = handoff.writes?.[choice]
    if (!edits?.length || !handoff.section) return
    run({
      token: `handoff:${task.id}`,
      step: task.step as Step,
      section: handoff.section,
      edits,
    })
  }
}

const TO_LABEL: Record<string, string> = {
  you: 'you',
  underwriter: 'the underwriter',
  broker: 'the broker',
}

const KIND_LABEL = {
  question: 'Question',
  delegation: 'Delegated',
  escalation: 'Escalated',
} as const

export function HandoffNotice({
  task,
  handoff,
  mine,
}: {
  task: RunTask
  handoff: Handoff
  mine: boolean
}) {
  const { state } = useAgentRun()
  const settle = useSettleHandoff()
  const sent = state[task.id] === 'sent'

  return (
    <div
      /* The not-yours band stays on the card surface rather than taking a
         sunken fill. A neutral badge on a sunken ground is grey on grey, and
         the status chip is the one thing in this band that has to be legible
         at a glance. The two states are told apart by the warning tint being
         present or absent, which is one signal doing one job.
 
         The yours band is warning/100 and not warning/50 for the same
         reason in the other palette: a Badge's warning fill IS warning/50,
         so a warning/50 ground makes the chip's fill do nothing and leaves
         it carried by its border alone. Every tinted container under a
         same-tone Badge has to sit one step deeper than the chip. */
      className={cn(
        'flex flex-col gap-2 border-b px-4 py-3',
        mine ? 'border-warning-200 bg-warning-100' : 'border-default bg-surface-card',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Colour carries ownership here, not kind: warning is the one you
            have to act on, info the one somebody else does. The board draws
            the same badge by KIND, because there all five sit together and
            telling a question from a delegation is what that screen is for. */}
        <Badge tone={mine ? 'warning' : 'info'}>{KIND_LABEL[handoff.kind]}</Badge>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          <UserRound aria-hidden className="h-3.5 w-3.5 shrink-0" />
          {sent ? 'Sent to ' : 'With '}
          {TO_LABEL[handoff.to]}
          {handoff.who ? ` · ${handoff.who}` : ''}
        </span>
      </div>

      {/* The voice switch. `yours` exists only on the ones addressed to the
          reader, so falling back to `ask` is not a default — it is the case
          where addressing them would be a false claim. */}
      <p className={cn('text-base', mine ? 'text-warning-700' : 'text-subtle')}>
        {mine ? (handoff.yours ?? handoff.ask) : handoff.ask}
      </p>

      {/* Questions only: where it lands if nobody comes back to it. The other
          two kinds have nowhere, which is what makes them blocking. */}
      {mine && handoff.fallback && (
        <p className="text-sm italic text-muted">{handoff.fallback}</p>
      )}

      {handoff.can && <p className="text-sm text-subtle">{handoff.can}</p>}

      {mine && handoff.options && (
        <div className="flex flex-wrap gap-2">
          {handoff.options.map((opt) => (
            <Button
              key={opt}
              size="sm"
              variant="outline"
              onClick={() => settle(task, handoff, opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
      )}

      {/* An outbound request is deliberately NOT sendable from here. Releasing
          something that leaves the building is the one act on this screen an
          Undo cannot reach, so it happens where the drafted message is
          actually legible — on the board — rather than behind a button next
          to a one-line summary of it. */}
      {sent && <Badge tone="info">Request sent, no answer yet</Badge>}
    </div>
  )
}
