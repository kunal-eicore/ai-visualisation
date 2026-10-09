import { useEffect, useState } from 'react'
import { CheckCheck, ChevronDown, ChevronUp, CircleX, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { casesOf, needsPerson, stopReason, stoppedAt, type CaseState, type RunState } from './engine'
import { useFlip } from './flip'
import { SegmentIcon, clientOf } from './parts'
import { SCRIPT_BY_ID, STAGES } from './script'

/** Cards in the lane before the rest go behind "Show all". */
const IN_LANE = 3

export const ATTENTION = 'Needs your attention'

/**
 * Cases an agent stopped on: missing information or a step whose agent is
 * off (warning), a tool that kept failing (danger), or output waiting for a
 * person's approval (info). A case drops out of its station into this lane and
 * goes back to the front of the same station once someone unblocks or
 * retries it.
 *
 * Hidden while nothing is waiting. Otherwise it is one fixed row of the longest-waiting cards, so it never takes
 * more height from the line however many pile up. "Show all" opens the full
 * set as an overlay rising out of the lane, over the line rather than pushing
 * it, tall enough to read the cards in.
 */
export function NeedsYou({ state, onOpen }: { state: RunState; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const stopped = casesOf(state)
    .filter(needsPerson)
    .sort((a, b) => stoppedAt(a) - stoppedAt(b))
  const errors = stopped.filter((c) => c.phase === 'failed').length
  const approvals = stopped.filter((c) => c.phase === 'approval').length
  const warnings = stopped.length - errors - approvals
  const more = stopped.length > IN_LANE

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      // A case panel opened from the overlay takes Escape first.
      if (e.key === 'Escape' && !document.querySelector('[data-case-drawer]')) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Nothing left behind the fold: the overlay has nothing to show.
  useEffect(() => {
    if (!more) setOpen(false)
  }, [more])

  const heading = (toggle: 'open' | 'close' | null) => (
    <div className="flex items-center gap-2">
      <h2 className="text-sm font-semibold text-default">{ATTENTION}</h2>
      {/* One count per kind, not one total: a warning waits on information,
          an error on a retry, an approval on a yes, and each is worked
          differently. Icon as well as colour, so they read without colour. */}
      {warnings > 0 && (
        <span aria-label={`${warnings} ${warnings === 1 ? 'warning' : 'warnings'}`}>
          <Badge tone="warning" icon={<TriangleAlert aria-hidden className="h-3 w-3" />}>
            {warnings}
          </Badge>
        </span>
      )}
      {errors > 0 && (
        <span aria-label={`${errors} ${errors === 1 ? 'error' : 'errors'}`}>
          <Badge tone="danger" icon={<CircleX aria-hidden className="h-3 w-3" />}>
            {errors}
          </Badge>
        </span>
      )}
      {approvals > 0 && (
        <span aria-label={`${approvals} waiting for approval`}>
          <Badge tone="info" icon={<CheckCheck aria-hidden className="h-3 w-3" />}>
            {approvals}
          </Badge>
        </span>
      )}
      {toggle && (
        <button
          type="button"
          aria-expanded={toggle === 'close'}
          onClick={() => setOpen(toggle === 'open')}
          className="ml-auto inline-flex items-center gap-1 rounded-sm text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:shadow-focus"
        >
          {toggle === 'open' ? `Show all ${stopped.length}` : 'Collapse'}
          {/* The overlay rises out of the lane: up opens it, down puts it away. */}
          {toggle === 'open' ? (
            <ChevronUp aria-hidden className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown aria-hidden className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  )

  // Nothing waiting, no lane: the line gets the height back.
  if (stopped.length === 0) return null

  return (
    <>
      <section
        aria-label={ATTENTION}
        className="flex shrink-0 animate-fade-up flex-col gap-2.5 border-t border-default px-8 py-3.5"
      >
        {heading(more ? 'open' : null)}
        <ol className="grid grid-cols-3 gap-3">
          {stopped.slice(0, IN_LANE).map((c) => (
            <StoppedCard key={c.id} c={c} onOpen={onOpen} />
          ))}
        </ol>
      </section>

      {open && (
        <section
          role="dialog"
          aria-label={`${ATTENTION}, all`}
          className="absolute inset-x-0 bottom-0 z-20 flex max-h-[68%] animate-fade-up flex-col gap-2.5 border-t border-default bg-surface-card px-8 pb-5 pt-3.5 shadow-panel"
        >
          {heading('close')}
          <ol className="grid min-h-0 grid-cols-3 gap-3 overflow-y-auto pb-1">
            {stopped.map((c) => (
              <StoppedCard key={c.id} c={c} onOpen={onOpen} />
            ))}
          </ol>
        </section>
      )}
    </>
  )
}

function StoppedCard({ c, onOpen }: { c: CaseState; onOpen: (id: string) => void }) {
  const ref = useFlip<HTMLLIElement>(c.id)
  const s = SCRIPT_BY_ID[c.id]
  const failed = c.phase === 'failed'
  const approval = c.phase === 'approval'
  const reason = stopReason(c)
  return (
    <li
      ref={ref}
      className={cn(
        'relative flex h-[84px] min-w-0 items-start gap-3 rounded-lg border px-4 py-3',
        failed ? 'border-danger bg-danger-bg' : approval ? 'border-info bg-info-bg' : 'border-warning bg-warning-bg',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 font-mono text-xs text-subtle">
          <SegmentIcon id={c.id} />
          {s.short} · {STAGES[c.stage].label}
        </span>
        <span className="truncate text-sm font-medium text-default">{clientOf(c.id)}</span>
        <span title={reason} className={cn('truncate text-sm', failed ? 'text-danger-fg' : 'text-subtle')}>{reason}</span>
      </div>
      <Button variant="neutral" size="sm" onClick={() => onOpen(c.id)}>
        Review
      </Button>
    </li>
  )
}
