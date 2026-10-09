import { Building2, Pause, Power, User } from 'lucide-react'
import { TONE } from '@/components/ui/Badge'
import { Throbber } from '@/components/ui/Throbber'
import { cn } from '@/lib/cn'
import { justErred, stageProgress, viewOf, type CaseState } from './engine'
import { useFlip } from './flip'
import { OUTCOME_OF, SCRIPT_BY_ID } from './script'

const FOCUS = 'focus-visible:outline-none focus-visible:shadow-focus'

export function SegmentIcon({ id, className = 'h-3 w-3' }: { id: string; className?: string }) {
  const Icon = SCRIPT_BY_ID[id].row.segment === 'group' ? Building2 : User
  return <Icon aria-hidden className={cn('shrink-0', className)} />
}

export const clientOf = (id: string) => SCRIPT_BY_ID[id].row.clientName ?? SCRIPT_BY_ID[id].short

/**
 * A case on the line. Working cases are full cards with the stage's progress
 * along the bottom edge; waiting cases are a dashed one-liner, so the eye
 * lands on what is moving.
 */
export function CaseChip({
  c,
  now,
  onOpen,
  selected,
}: {
  c: CaseState
  /** Run clock, for the retry flash. */
  now: number
  onOpen: (id: string) => void
  selected: boolean
}) {
  const ref = useFlip<HTMLButtonElement>(c.id)
  const s = SCRIPT_BY_ID[c.id]
  const v = viewOf(c)
  const label = `${s.short} ${clientOf(c.id)}`

  if (v === 'queued' || v === 'paused') {
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onOpen(c.id)}
        aria-label={label}
        className={cn(
          'relative flex w-full items-center gap-2 rounded-md border border-dashed bg-surface-card px-2.5 py-1.5 text-left transition-colors duration-base hover:border-brand-300 hover:bg-brand-50',
          selected ? 'border-brand' : 'border-strong',
          FOCUS,
        )}
      >
        <span className="font-mono text-xs text-subtle">{s.short}</span>
        <span className="min-w-0 truncate text-xs text-subtle">{clientOf(c.id)}</span>
        {v === 'paused' && <Pause aria-label="Paused" className="ml-auto h-3 w-3 shrink-0 text-default" />}
      </button>
    )
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onOpen(c.id)}
      aria-label={label}
      className={cn(
        'relative flex h-[58px] w-full flex-col justify-center gap-0.5 overflow-hidden rounded-lg border bg-surface-card px-3 text-left shadow-card transition-[border-color,box-shadow] duration-base hover:shadow-classic',
        justErred(c, now) ? 'animate-flash-danger border-danger' : 'border-brand',
        selected && 'shadow-focus',
        FOCUS,
      )}
    >
      <span className="flex items-center gap-1.5 font-mono text-xs text-subtle">
        <SegmentIcon id={c.id} />
        {s.short}
      </span>
      <span className="truncate text-sm font-medium text-default">{clientOf(c.id)}</span>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-100">
        <span
          className="block h-full bg-brand-500 transition-[width] duration-200 ease-linear"
          style={{ width: `${stageProgress(c) * 100}%` }}
        />
      </span>
    </button>
  )
}

/** A decided case in the ledger. It flies in from the Decision station, then
 *  the stamp presses it down once the flight has landed. */
export function LedgerChip({ c, fresh, onOpen }: { c: CaseState; fresh: boolean; onOpen: (id: string) => void }) {
  const ref = useFlip<HTMLButtonElement>(c.id)
  const s = SCRIPT_BY_ID[c.id]
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onOpen(c.id)}
      aria-label={`${s.short} ${clientOf(c.id)}, ${OUTCOME_OF[s.outcome].label}`}
      title={clientOf(c.id)}
      className={cn('relative rounded-md', FOCUS)}
    >
      <span
        className={cn(
          'inline-flex h-6 items-center rounded-md border px-1.5 font-mono text-xs',
          // Only a decision that just landed stamps; chips shown by expanding a
          // bucket were decided earlier and appear as they are.
          fresh && 'animate-stamp [animation-delay:520ms]',
          TONE[OUTCOME_OF[s.outcome].tone],
        )}
      >
        {s.short}
      </span>
    </button>
  )
}

/** The station's mark on the rail. Its throbber waves while the agent has a
 *  case in hand and settles back to a ring when it has none. A station with
 *  no active agent is a hollow dashed node with a power mark. */
export function StageNode({ active, jammed = false, off = false }: { active: boolean; jammed?: boolean; off?: boolean }) {
  if (off) {
    return (
      <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-strong bg-surface-sunken text-muted">
        <Power aria-hidden className="h-3.5 w-3.5" />
      </span>
    )
  }
  return (
    <span
      className={cn(
        'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-slow',
        jammed ? 'border-warning bg-warning-bg' : active ? 'border-brand bg-brand-bg' : 'border-default bg-surface-card',
      )}
    >
      <Throbber phase={active ? 'thinking' : 'ending'} size={22} />
    </span>
  )
}
