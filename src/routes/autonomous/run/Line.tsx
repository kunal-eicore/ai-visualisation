import { Stamp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { casesOf, needsPerson, type RunState } from './engine'
import { CaseChip, LedgerChip, StageNode } from './parts'
import { Badge } from '@/components/ui/Badge'
import { DONE, OUTCOMES, SCRIPT_BY_ID, STAGES, isJammed } from './script'

/** Waiting cases shown per station before the rest fold into a count. */
const SHOW_WAITING = 4
/** Decided chips shown per bucket before it folds: three full rows of three
 *  at this width. */
const SHOW_DECIDED = 9
const LEDGER_W = 248

/**
 * The line: five stations on a rail, then the ledger where decisions land.
 *
 * Every case is one element that moves (see `flip.ts`), so a handoff from
 * Risk to Pricing is a card gliding one column right rather than one card
 * vanishing and another appearing. Nothing in here clips overflow; a card in
 * flight has to be able to cross the columns.
 */
export function Line({
  state,
  selected,
  onOpen,
}: {
  state: RunState
  selected: string | null
  onOpen: (id: string) => void
}) {
  const cases = casesOf(state)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const decided = cases.filter((c) => c.stage === DONE).sort((a, b) => (a.resolvedAt ?? 0) - (b.resolvedAt ?? 0))

  return (
    <div
      className="relative grid flex-1 gap-x-4"
      style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr)) ${LEDGER_W}px` }}
    >
      {/* The rail, from the first station's node to the ledger's. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute top-[17px] h-0.5 overflow-visible"
        // Ledger node centre: its column's left edge + 1px border + 16px pad + 18.
        style={{ left: 18, width: `calc(100% - ${LEDGER_W - 35 + 18}px)` }}
      >
        <line x1="0" y1="1" x2="100%" y2="1" className="stroke-neutral-300" strokeWidth="2" />
        <line
          x1="0"
          y1="1"
          x2="100%"
          y2="1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 8"
          className={cn('animate-rail stroke-brand-400 transition-opacity duration-slow', !state.running && 'opacity-0')}
        />
      </svg>

      {STAGES.map((stage, i) => {
        const here = cases.filter((c) => c.stage === i && !needsPerson(c))
        const working = here.filter((c) => c.phase === 'working')
        const waiting = here.filter((c) => c.phase === 'queued').sort((a, b) => a.order - b.order)
        const active = state.running && working.length > 0
        const jammed = isJammed(i, waiting.length)
        return (
          <section key={stage.id} aria-label={stage.label} className="relative flex min-w-0 flex-col gap-4 pb-6">
            {/* A backed-up station turns the stretch of rail feeding it amber,
                and the dashes on it crawl: files are arriving faster than
                they leave. From the previous node's centre to this one's —
                columns are equal, so that is one column plus the gap back. */}
            {i > 0 && (
              <svg
                aria-hidden
                className={cn(
                  'pointer-events-none absolute top-[17px] h-0.5 overflow-visible transition-opacity duration-slow',
                  jammed ? 'opacity-100' : 'opacity-0',
                )}
                style={{ left: 'calc(2px - 100%)', width: 'calc(100% + 16px)' }}
              >
                <line x1="0" y1="1" x2="100%" y2="1" className="stroke-warning-200" strokeWidth="2" />
                <line
                  x1="0"
                  y1="1"
                  x2="100%"
                  y2="1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="2 8"
                  className={cn('animate-rail stroke-warning-500 [animation-duration:2.4s]', !state.running && '[animation-play-state:paused]')}
                />
              </svg>
            )}
            <header className="flex items-center gap-2.5">
              <StageNode active={active} jammed={jammed} />
              <div className="flex min-w-0 flex-col items-start gap-0.5">
                <h2 className="text-sm font-semibold text-default">{stage.label}</h2>
                {jammed ? (
                  <Badge tone="warning" dot>
                    {waiting.length} waiting
                  </Badge>
                ) : (
                  <p className="font-mono text-xs text-subtle">
                    {working.length}/{stage.capacity}
                    {waiting.length > 0 && ` · ${waiting.length} waiting`}
                  </p>
                )}
              </div>
            </header>

            <div className="flex flex-col gap-2">
              {Array.from({ length: stage.capacity }, (_, k) => {
                const c = working[k]
                return c ? (
                  <CaseChip key={c.id} c={c} now={state.clock} onOpen={onOpen} selected={selected === c.id} />
                ) : (
                  <div key={`slot-${k}`} aria-hidden className="h-[58px] rounded-lg border border-dashed border-default" />
                )
              })}
            </div>

            {waiting.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {waiting.slice(0, SHOW_WAITING).map((c) => (
                  <CaseChip key={c.id} c={c} now={state.clock} onOpen={onOpen} selected={selected === c.id} />
                ))}
                {waiting.length > SHOW_WAITING && (
                  <p className="px-1 font-mono text-xs text-muted">+{waiting.length - SHOW_WAITING} more</p>
                )}
              </div>
            )}
          </section>
        )
      })}

      <section aria-label="Decided" className="flex min-w-0 flex-col gap-4 border-l border-default pb-6 pl-4">
        <header className="flex items-center gap-2.5">
          <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-default bg-surface-card text-subtle">
            <Stamp aria-hidden className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-default">Decided</h2>
            <p className="font-mono text-xs text-subtle">
              {decided.length} of {cases.length}
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-4">
          {OUTCOMES.map((o) => {
            const mine = decided.filter((c) => SCRIPT_BY_ID[c.id].outcome === o.id)
            const open = expanded[o.id] ?? false
            // Folded, a bucket keeps its newest decisions in view.
            const shown = open || mine.length <= SHOW_DECIDED ? mine : mine.slice(-SHOW_DECIDED)
            return (
              <div key={o.id} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-default">{o.label}</span>
                  {/* Keyed on the count so each new decision rolls the number in. */}
                  <span key={mine.length} className="animate-reveal font-mono text-md font-semibold text-default">
                    {mine.length}
                  </span>
                </div>
                <div className="flex min-h-6 flex-wrap gap-1">
                  {shown.map((c) => (
                    <LedgerChip key={c.id} c={c} fresh={state.clock - (c.resolvedAt ?? 0) < 1500} onOpen={onOpen} />
                  ))}
                </div>
                {mine.length > SHOW_DECIDED && (
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpanded((e) => ({ ...e, [o.id]: !open }))}
                    className="self-start rounded-sm text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    {open ? 'Show less' : `Show all ${mine.length}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
