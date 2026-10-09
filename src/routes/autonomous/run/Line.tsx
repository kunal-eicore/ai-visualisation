import { Stamp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { capacityAt, isStationOn, type AgentSettings } from '../agents/settings'
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
 *
 * Each station's width comes from the agent settings. A station with no
 * active agent is drawn off: a hollow node, no slots, and no flow on the
 * stretch of rail leaving it. With every agent on, the line is fully lit.
 */
export function Line({
  state,
  settings,
  selected,
  onOpen,
  onStation,
  auto,
}: {
  state: RunState
  settings: AgentSettings
  selected: string | null
  onOpen: (id: string) => void
  /** Opens a station's ongoing tasks. Without it the headers are not buttons. */
  onStation?: (stage: number) => void
  /** Hybrid: automated stations, marked on their headers. */
  auto?: number[]
}) {
  const cases = casesOf(state)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const decided = cases.filter((c) => c.stage === DONE).sort((a, b) => (a.resolvedAt ?? 0) - (b.resolvedAt ?? 0))

  return (
    <div
      className="relative grid flex-1 gap-x-4"
      style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr)) ${LEDGER_W}px` }}
    >
      {/* The rail's ground, from the first station's node to the ledger's.
          The flow on it is drawn per station, below. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute top-[17px] h-0.5 overflow-visible"
        // Ledger node centre: its column's left edge + 1px border + 16px pad + 18.
        style={{ left: 18, width: `calc(100% - ${LEDGER_W - 35 + 18}px)` }}
      >
        <line x1="0" y1="1" x2="100%" y2="1" className="stroke-neutral-300" strokeWidth="2" />
      </svg>

      {STAGES.map((stage, i) => {
        const here = cases.filter((c) => c.onLine && c.stage === i && !needsPerson(c))
        const working = here.filter((c) => c.phase === 'working')
        const waiting = here.filter((c) => c.phase === 'queued').sort((a, b) => a.order - b.order)
        const on = isStationOn(settings, i)
        const capacity = capacityAt(settings, i)
        const active = state.running && working.length > 0
        const jammed = isJammed(i, waiting.length)
        const last = i === STAGES.length - 1
        const head = (
          <>
            <StageNode active={active} jammed={jammed} off={!on} />
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="flex items-center gap-1.5">
                <h2 className={cn('text-sm font-semibold', on ? 'text-default' : 'text-subtle')}>{stage.label}</h2>
                {on && auto?.includes(i) && <Badge tone="brand">Auto</Badge>}
              </span>
              {!on ? (
                <Badge tone="neutral">Agent off</Badge>
              ) : jammed ? (
                <Badge tone="warning" dot>
                  {waiting.length} waiting
                </Badge>
              ) : (
                <p className="font-mono text-xs text-subtle">
                  {working.length}/{capacity}
                  {waiting.length > 0 && ` · ${waiting.length} waiting`}
                </p>
              )}
            </div>
          </>
        )
        return (
          <section key={stage.id} aria-label={stage.label} className="relative flex min-w-0 flex-col gap-4 pb-6">
            {/* The flow leaving this station, from its node to the next node
                (the next column's left + 18) or, after Decision, the ledger's
                (its left + 1px border + 16px pad + 18). Lit while the station
                has an agent; still while the run is paused. */}
            <svg
              aria-hidden
              className={cn(
                'pointer-events-none absolute left-[18px] top-[17px] h-0.5 overflow-visible transition-opacity duration-slow',
                on && state.running ? 'opacity-100' : 'opacity-0',
              )}
              style={{ width: last ? 'calc(100% + 33px)' : 'calc(100% + 16px)' }}
            >
              <line x1="0" y1="1" x2="100%" y2="1" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 8" className="animate-rail stroke-brand-400" />
            </svg>
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
            {onStation ? (
              <header>
                <button
                  type="button"
                  onClick={() => onStation(i)}
                  aria-label={`${stage.agent}, ongoing tasks`}
                  className="-m-1.5 flex items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors duration-base hover:bg-neutral-100 focus-visible:outline-none focus-visible:shadow-focus"
                >
                  {head}
                </button>
              </header>
            ) : (
              <header className="flex items-center gap-2.5">{head}</header>
            )}

            {on && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: Math.max(capacity, working.length) }, (_, k) => {
                  const c = working[k]
                  return c ? (
                    <CaseChip key={c.id} c={c} now={state.clock} onOpen={onOpen} selected={selected === c.id} />
                  ) : (
                    <div key={`slot-${k}`} aria-hidden className="h-[58px] rounded-lg border border-dashed border-default" />
                  )
                })}
              </div>
            )}

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
