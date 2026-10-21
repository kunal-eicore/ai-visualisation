import { useState, type ReactNode } from 'react'
import { ArrowRight, Check, ChevronDown, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { recChange, recScopeLabel, recsFor, useRec } from './coverRecs'
import type { CoverRec } from './data'

/**
 * A text action sized for a table row.
 *
 * The `text` Button is 32px tall, which would push a 40px row to 52 the
 * moment a recommendation lands on it. This keeps the row's height and is
 * still a real button with the house focus ring.
 */
function RowAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm px-1 text-sm font-medium text-brand transition-colors duration-base hover:text-brand-700 focus-visible:outline-none focus-visible:shadow-focus"
    >
      {children}
    </button>
  )
}

/** Why · Apply, Applying, or Applied · Undo — the same three states everywhere. */
export function RecActions({ rec, onWhy }: { rec: CoverRec; onWhy: (id: string) => void }) {
  const { state, apply, undo } = useRec(rec)
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {state === 'applied' && (
        <Badge tone="success" icon={<Check aria-hidden className="h-3 w-3" />}>
          Applied
        </Badge>
      )}
      <RowAction onClick={() => onWhy(rec.id)}>Why</RowAction>
      {state === 'open' && <RowAction onClick={apply}>Apply</RowAction>}
      {state === 'applied' && <RowAction onClick={undo}>Undo</RowAction>}
      {state === 'working' && <span className="px-1 text-sm text-muted">Applying</span>}
    </span>
  )
}

function Change({ from, to }: { from: string; to: string }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span className="text-muted">{from}</span>
      <ArrowRight aria-hidden className="h-3.5 w-3.5 text-muted" />
      <span className="font-semibold text-default">{to}</span>
    </span>
  )
}

/**
 * "In card" view: one row under the tab strip, scoped to the band on screen.
 *
 * Counts what is still open, so the row goes quiet as you work through it.
 * Review opens the list in place rather than in a dialog: the rows it will
 * change are right underneath, and Apply should be watchable where it lands.
 */
export function RecsBar({
  groupId,
  sumInsured,
  onWhy,
}: {
  groupId: string
  sumInsured: number
  onWhy: (id: string) => void
}) {
  const recs = recsFor(groupId)
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-default">
      <div className="flex min-h-11 items-center gap-2.5 bg-brand-50 px-4 py-1.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-btn-primary text-inverse">
          <Sparkles aria-hidden className="h-3.5 w-3.5" />
        </span>
        <CountLabel recs={recs} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="neutral"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            icon={
              <ChevronDown
                aria-hidden
                className={cn('h-4 w-4 transition-transform duration-base', open && 'rotate-180')}
              />
            }
          >
            Review
          </Button>
          <ApplyAll recs={recs} />
        </div>
      </div>

      {open && (
        <ul className="border-t border-subtle">
          {recs.map((rec) => {
            const change = recChange(rec, sumInsured)
            return (
              <li
                key={rec.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_72px_auto] items-center gap-4 border-b border-subtle px-4 py-2.5 last:border-b-0"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-semibold text-default">{rec.cover}</span>
                  <span className="text-xs text-muted">{recScopeLabel(rec.scope)}</span>
                </span>
                <Change from={change.from} to={change.to} />
                <span className="text-right font-mono text-xs text-subtle">
                  {Math.round(rec.confidence * 100)}%
                </span>
                <RecActions rec={rec} onWhy={onWhy} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function CountLabel({ recs }: { recs: CoverRec[] }) {
  const applied = useRecStates(recs).filter((r) => r.state === 'applied').length
  const open = recs.length - applied
  return (
    <span className="flex items-baseline gap-2">
      <span className="text-base font-semibold text-brand-700">
        {open === 0
          ? `All ${recs.length} recommendations applied`
          : `${open} ${open === 1 ? 'recommendation' : 'recommendations'}`}
      </span>
      {open > 0 && applied > 0 && <span className="text-sm text-muted">{applied} applied</span>}
    </span>
  )
}

function ApplyAll({ recs }: { recs: CoverRec[] }) {
  const open = useRecStates(recs).filter((r) => r.state === 'open')
  if (open.length === 0) return null
  return (
    <Button size="sm" onClick={() => open.forEach((r) => r.apply())}>
      Apply all
    </Button>
  )
}

/* One `useRec` per recommendation, in a loop. Safe because a band's list is
   fixed: the bar is keyed by the band in StepCovers, so switching tabs
   remounts it rather than changing the number of hooks. */
function useRecStates(recs: CoverRec[]) {
  return recs.map((rec) => ({ rec, ...useRec(rec) }))
}

/**
 * "Inline" view, name cell: the actions, on the row the recommendation would
 * change. The row itself carries the mark (edge, tint, sparkle) while it is
 * open — see `row-suggested` and CoverTable.
 */
export function InlineRecMark({ rec, onWhy }: { rec: CoverRec; onWhy: (id: string) => void }) {
  return (
    <span className="ml-auto">
      <RecActions rec={rec} onWhy={onWhy} />
    </span>
  )
}

/** "Inline" view, value cell: what the value would become, until applied.
 *  Dashed, because it is not the value yet. */
export function InlineRecValue({ rec, sumInsured }: { rec: CoverRec; sumInsured: number }) {
  const { state } = useRec(rec)
  if (state === 'applied') return null
  const { to } = recChange(rec, sumInsured)
  return (
    <span className="inline-flex rounded-sm border border-dashed border-brand-500 bg-surface-card px-1.5 text-xs font-medium leading-[18px] text-brand-700">
      <span className="sr-only">Suggested </span>
      {to}
    </span>
  )
}
