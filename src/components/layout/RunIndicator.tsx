import { useNavigate } from 'react-router-dom'
import { UserRoundCheck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Throbber } from '@/components/ui/Throbber'
import { cn } from '@/lib/cn'
import { useAgentRun } from '@/lib/agentRun'

/**
 * The run indicator — an autonomous run, reported from outside the screen
 * that started it.
 *
 * This is the piece the other three rungs do not need. Below Autonomous
 * nothing happens while you are not looking, so the state of the work is
 * always on the screen you are on. Once the agent owns the sequence that
 * stops being true: it keeps going when you walk away, and it can arrive at
 * something only you can settle while you are three routes away doing
 * something else. A run you can only see by going back to it is a run that
 * quietly waits forever.
 *
 * So it is app chrome rather than route chrome, and it carries exactly two
 * facts, in this order of priority:
 *
 * - **Somebody is waiting on you.** This outranks progress, because progress
 *   is the agent's problem and the handoff is yours. When there is one, the
 *   pill switches to warning and leads with the count.
 * - **How far along it is.** Plain counting, not a percentage: eight of ten
 *   tasks is a thing you can check against the board, and 80% is not.
 *
 * It renders nothing at all when no run exists, which is most of the time.
 * A permanently-present strip reading "no agent running" would be the status
 * chrome this project bans, and would train people to stop reading the spot
 * where the real thing appears.
 */
export function RunIndicator() {
  const { started, working, done, waiting, tasks, requestBoard } = useAgentRun()
  const navigate = useNavigate()

  if (!started) return null

  const needsYou = waiting.filter((t) => t.handoff?.to === 'you').length

  const open = () => {
    requestBoard()
    navigate('/quotation/group-health')
  }

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        'flex h-9 items-center gap-2 rounded-lg border px-2.5 transition-colors duration-base',
        'focus-visible:outline-none focus-visible:shadow-focus',
        needsYou
          ? 'border-warning bg-warning-bg text-warning-fg hover:bg-warning-100'
          : 'border-default text-muted hover:bg-surface-sunken hover:text-default',
      )}
    >
      {working ? (
        <Throbber phase="thinking" size={18} label="Agent running" />
      ) : (
        <UserRoundCheck aria-hidden className="h-4 w-4 shrink-0" />
      )}
      <span className="text-sm font-medium">
        {working ? 'Agent running' : 'Run prepared'}
      </span>
      <span className="font-mono text-xs">
        {done} of {tasks.length}
      </span>
      {needsYou > 0 && <Badge tone="warning">{needsYou} for you</Badge>}
    </button>
  )
}
