import { useEffect, useState } from 'react'
import { PanelRightClose, PanelRightOpen, TrafficCone, X } from 'lucide-react'
import { Badge, TONE, type Tone } from '@/components/ui/Badge'
import { Card, CardHeading } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { MetricCard } from '@/components/ui/MetricCard'
import { AnchoredCard, useAnchored } from '@/components/Anchored'
import { cn } from '@/lib/cn'
import { bottleneckOf, casesOf, needsPerson, overallProgress, viewOf, type CaseState, type RunState } from './engine'
import { SegmentIcon, StageNode, clientOf } from './parts'
import { DONE, JAM_AT, OUTCOMES, OUTCOME_OF, SCRIPT_BY_ID, STAGES, formatClock, isJammed } from './script'

/** Hours of TAT left under which an open case counts as at risk. */
const SLA_RISK_HOURS = 12
const SHOW_EVENTS = 80

/**
 * Everything at once: the run's numbers, each agent and what it holds, every
 * case as one cell in the task overview, and the feed of every step every agent takes.
 * It opens over the line rather than beside it — this is the view for
 * stepping back, and the line is one click away.
 */
export function SystemView({
  state,
  controls,
  onClose,
  onOpen,
  drawerOpen,
}: {
  state: RunState
  controls: React.ReactNode
  onClose: () => void
  onOpen: (id: string) => void
  /** Escape belongs to the case panel while one is open over this view. */
  drawerOpen: boolean
}) {
  useEffect(() => {
    if (drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, drawerOpen])

  // Hidden until asked for: the fleet and the overview get the width first.
  const [eventsOpen, setEventsOpen] = useState(false)
  const cases = casesOf(state)
  const done = cases.filter((c) => c.stage === DONE)
  const blocked = cases.filter(needsPerson)
  const failed = blocked.filter((c) => c.phase === 'failed').length
  const inFlight = cases.filter((c) => c.stage !== DONE && !needsPerson(c) && (c.stage > 0 || c.phase === 'working'))
  const atRisk = cases.filter((c) => {
    const r = SCRIPT_BY_ID[c.id].row
    return c.stage !== DONE && r.tatSlaHours - r.tatElapsedHours <= SLA_RISK_HOURS
  })
  const avg = done.length
    ? done.reduce((n, c) => n + ((c.resolvedAt ?? 0) - (c.startedAt ?? 0)), 0) / done.length
    : null

  return (
    <div
      role="dialog"
      aria-label="System view"
      className="absolute inset-0 z-30 flex origin-top-right animate-view-in flex-col bg-surface-page"
    >
      <header className="flex items-center gap-3 border-b border-default bg-surface-card px-8 py-4">
        <h2 className="text-lg font-semibold text-default">System view</h2>
        <span className="font-mono text-sm text-subtle">{formatClock(state.clock)}</span>
        <span className="flex-1" />
        {controls}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close system view"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-btn-neutral bg-btn-neutral text-default transition-colors duration-base hover:border-btn-neutral-hover hover:bg-btn-neutral-hover focus-visible:outline-none focus-visible:shadow-focus"
        >
          <X aria-hidden className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-5 gap-3">
          <MetricCard
            label="Resolved"
            value={`${done.length}/${cases.length}`}
            tone={done.length === cases.length ? 'success' : 'neutral'}
          />
          <MetricCard label="In flight" value={String(inFlight.length)} tone={inFlight.length ? 'brand' : 'neutral'} />
          <MetricCard
            label="Needs your attention"
            value={String(blocked.length)}
            tone={failed ? 'danger' : blocked.length ? 'warning' : 'neutral'}
          />
          <MetricCard label="SLA at risk" value={String(atRisk.length)} tone={atRisk.length ? 'alert' : 'neutral'} />
          <MetricCard label="Avg time per case" value={avg === null ? '—' : formatClock(avg)} />
        </div>

        {/* The row's height is set by the left column alone: the event log
            sits absolutely in its cell, so it ends where the overview ends and
            scrolls inside itself however many events it holds. */}
        {/* With the live events put away, the fleet and the overview take
            the full width. */}
        <div className={cn('grid gap-6', eventsOpen ? 'grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]' : 'grid-cols-1')}>
          <div className="flex min-w-0 flex-col gap-6">
            <Fleet
              state={state}
              cases={cases}
              onOpen={onOpen}
              eventsOpen={eventsOpen}
              onToggleEvents={() => setEventsOpen((o) => !o)}
            />
            <Overview cases={cases} onOpen={onOpen} />
          </div>
          {eventsOpen && (
            <div className="relative min-w-0 animate-fade-in">
              <Events state={state} onOpen={onOpen} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Fleet({
  state,
  cases,
  onOpen,
  eventsOpen,
  onToggleEvents,
}: {
  state: RunState
  cases: CaseState[]
  onOpen: (id: string) => void
  eventsOpen: boolean
  onToggleEvents: () => void
}) {
  return (
    <Card bare>
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <CardHeading title="Agent fleet" />
        <EventsToggle open={eventsOpen} onToggle={onToggleEvents} />
      </div>
      <Bottleneck state={state} />
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-default text-xs font-semibold text-subtle">
            <th className="px-4 py-2 font-semibold">Agent</th>
            <th className="px-4 py-2 font-semibold">Working on</th>
            <th className="w-20 px-4 py-2 text-right font-semibold">Done</th>
            <th className="w-20 px-4 py-2 text-right font-semibold">Waiting</th>
            <th className="w-32 px-4 py-2 font-semibold">Trend, past 60s</th>
          </tr>
        </thead>
        <tbody>
          {STAGES.map((stage, i) => {
            const working = cases.filter((c) => c.stage === i && c.phase === 'working')
            const waiting = cases.filter((c) => c.stage === i && c.phase === 'queued').length
            const passed = cases.filter((c) => c.stage > i).length
            const active = state.running && working.length > 0
            const jammed = isJammed(i, waiting)
            return (
              <tr key={stage.id} className="border-b border-default last:border-b-0">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <StageNode active={active} jammed={jammed} />
                    <span className="text-sm font-medium text-default">{stage.agent}</span>
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {working.length === 0 ? (
                    <span className="text-sm text-muted">Idle</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {working.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onOpen(c.id)}
                          title={clientOf(c.id)}
                          className={cn(
                            'inline-flex h-6 items-center rounded-md border px-1.5 font-mono text-xs transition-colors duration-base focus-visible:outline-none focus-visible:shadow-focus',
                            TONE.brand,
                          )}
                        >
                          {SCRIPT_BY_ID[c.id].short}
                        </button>
                      ))}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-default">{passed}</td>
                <td
                  className={cn(
                    'px-4 py-2.5 text-right font-mono text-sm',
                    jammed ? 'font-semibold text-warning-fg' : 'text-default',
                  )}
                >
                  {waiting}
                </td>
                <td className="px-4 py-2.5">
                  <WaitingTrend state={state} stage={i} now={waiting} jammed={jammed} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

/** Shows or hides the live events beside the fleet. Icon-only, so the label
 *  is the tooltip, and the tooltip says what a click will do. */
function EventsToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { anchorRef, pos, show, hide } = useAnchored({ align: 'right', width: 148 })
  const label = open ? 'Hide live events' : 'Show live events'
  const Icon = open ? PanelRightClose : PanelRightOpen
  return (
    <span ref={anchorRef} className="flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={open}
        onClick={onToggle}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-btn-neutral bg-btn-neutral text-default transition-colors duration-base hover:border-btn-neutral-hover hover:bg-btn-neutral-hover focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Icon aria-hidden className="h-4 w-4" />
      </button>
      {pos && (
        <AnchoredCard pos={pos}>
          <span className="block w-max rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs text-inverse shadow-classic">
            {label}
          </span>
        </AnchoredCard>
      )}
    </span>
  )
}

/** The trend's fixed scale. Fixed, not fitted to the data: a line's height
 *  has to mean the same number of waiting files in every row and all run. */
const TREND_MAX = 20
const TREND_W = 88
const TREND_H = 22

/**
 * A stage's waiting count over the past 60 seconds (5s samples plus now). Flat
 * means the agent is keeping up; climbing means files arrive faster than they
 * leave. The dashed hairline is the jam threshold, so a line above it is a
 * stage that is backed up. Past `TREND_MAX` the line runs along the top.
 */
function WaitingTrend({ state, stage, now, jammed }: { state: RunState; stage: number; now: number; jammed: boolean }) {
  const pts = [
    ...state.history.filter((h) => h.at > state.clock - 60000).map((h) => ({ at: h.at, v: h.waiting[stage] })),
    { at: state.clock, v: now },
  ]
  const x = (at: number) => TREND_W - ((state.clock - at) / 60000) * TREND_W
  const y = (v: number) => TREND_H - 1 - (Math.min(v, TREND_MAX) / TREND_MAX) * (TREND_H - 2)
  const line = pts.map((p) => `${x(p.at).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const area = `${x(pts[0].at).toFixed(1)},${TREND_H} ${line} ${TREND_W},${TREND_H}`
  const { anchorRef, pos, show, hide } = useAnchored({
    align: 'center',
    width: 264,
  })
  const then = pts[0].v
  const direction = now - then >= 2 ? 'Rising' : then - now >= 2 ? 'Falling' : 'Steady'
  const agent = STAGES[stage].agent

  return (
    <span
      ref={anchorRef}
      tabIndex={0}
      role="img"
      aria-label={`${agent} waiting, past 60 seconds: ${then} to ${now}, ${direction.toLowerCase()}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="inline-flex cursor-default rounded-sm focus-visible:outline-none focus-visible:shadow-focus"
    >
      <svg aria-hidden width={TREND_W} height={TREND_H} className="shrink-0 overflow-visible">
        {/* Intake's queue is the inbox, never a jam, so it gets no threshold. */}
        {stage > 0 && (
          <line
            x1="0"
            x2={TREND_W}
            y1={y(JAM_AT)}
            y2={y(JAM_AT)}
            strokeDasharray="2 3"
            strokeWidth="1"
            className="stroke-neutral-400"
          />
        )}
        <polygon points={area} className={jammed ? 'fill-warning-100' : 'fill-brand-100'} />
        <polyline
          points={line}
          fill="none"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          className={jammed ? 'stroke-warning-500' : 'stroke-brand-500'}
        />
      </svg>
      {pos && (
        <AnchoredCard pos={pos}>
          {/* The house tooltip (dark, as InfoTip): header, key-value, body. */}
          <span className="flex flex-col gap-2 rounded-md bg-neutral-900 p-2.5 text-inverse shadow-classic">
            <span className="border-b border-neutral-700 pb-2 text-xs font-semibold">
              {agent}, past 60 seconds
            </span>
            <span className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              <span className="text-neutral-400">Waiting now</span>
              <span className={cn('font-mono', jammed && 'font-semibold text-warning-300')}>{now}</span>
              <span className="text-neutral-400">60 seconds ago</span>
              <span className="font-mono">{then}</span>
              <span className="text-neutral-400">Direction</span>
              <span>{direction}</span>
            </span>
            <span className="border-t border-neutral-700 pt-2 text-xs leading-relaxed text-neutral-400">
              {stage === 0
                ? 'Files waiting for this agent. Here that is new cases arriving, so it is never marked as backed up.'
                : `Files waiting for this agent. Flat means it is keeping up; rising means files arrive faster than it clears them. Above the dashed line (${JAM_AT} waiting) the stage is backed up.`}
            </span>
          </span>
        </AnchoredCard>
      )}
    </span>
  )
}

/**
 * The fleet's headline: the stage that is backed up worst, how many files are
 * piled in front of it, how fast the pile is growing over the last half
 * minute, and how long the oldest one has waited. One row, so the answer to
 * "where is it stuck" is read before the table is.
 */
function Bottleneck({ state }: { state: RunState }) {
  const b = bottleneckOf(state, isJammed)
  if (!b) {
    return (
      <div className="flex items-center gap-2.5 border-t border-default px-4 py-2.5">
        <span className="text-sm font-semibold text-default">Bottleneck</span>
        <span className="text-sm text-subtle">None</span>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-warning bg-warning-bg px-4 py-2.5">
      <TrafficCone aria-hidden className="h-4 w-4 shrink-0 text-warning-fg" />
      <span className="text-sm font-semibold text-default">Bottleneck</span>
      <span className="text-sm font-medium text-default">{STAGES[b.stage].agent}</span>
      <Badge tone="warning" dot>
        {b.waiting} waiting
      </Badge>
      <span className="font-mono text-sm text-warning-fg">{b.perMin > 0 ? `+${b.perMin}` : b.perMin}/min</span>
      <span className="ml-auto font-mono text-xs text-subtle">oldest waiting {formatClock(b.oldest)}</span>
    </div>
  )
}

function Overview({ cases, onOpen }: { cases: CaseState[]; onOpen: (id: string) => void }) {
  const [tip, setTip] = useState<{
    id: string
    x: number
    y: number
    w: number
  } | null>(null)
  const show = (id: string, el: HTMLElement) =>
    setTip({
      id,
      x: el.offsetLeft + el.offsetWidth / 2,
      y: el.offsetTop,
      w: (el.offsetParent as HTMLElement).offsetWidth,
    })
  const hide = () => setTip(null)

  return (
    <Card>
      <CardHeading title="Task overview" />
      <div className="relative flex flex-wrap" onMouseLeave={hide}>
        {cases.map((c) => (
          <OverviewCell key={c.id} c={c} onOpen={onOpen} onShow={show} onHide={hide} />
        ))}
        {tip && <CellTip c={cases.find((c) => c.id === tip.id)!} {...tip} />}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-subtle">
        <Swatch className="border-default bg-surface-sunken" label="Not started" />
        <Swatch className="border-brand bg-brand-100" label="On the line" />
        <Swatch className={TONE.warning} label="Needs your attention" />
        <Swatch className={TONE.danger} label="Error" />
        {OUTCOMES.map((o) => (
          <Swatch key={o.id} className={TONE[o.tone]} label={o.label} />
        ))}
      </div>
    </Card>
  )
}

function cellStatus(c: CaseState): { label: string; tone: Tone } {
  const v = viewOf(c)
  if (v === 'done') return OUTCOME_OF[SCRIPT_BY_ID[c.id].outcome]
  if (v === 'blocked') return { label: 'Needs your attention', tone: 'warning' }
  if (v === 'failed') return { label: 'Failed', tone: 'danger' }
  if (v === 'paused') return { label: `Paused at ${STAGES[c.stage].label}`, tone: 'neutral' }
  if (c.stage > 0 || c.phase === 'working') return { label: `In ${STAGES[c.stage].label}`, tone: 'brand' }
  return { label: 'Not started', tone: 'neutral' }
}

/**
 * One case: a 16px square in a 24px hit area (WCAG 2.5.8's minimum target),
 * so sixty of them sit in three rows. Open cases fill from the bottom as they
 * travel the line; decided ones take their outcome's colours.
 */
function OverviewCell({
  c,
  onOpen,
  onShow,
  onHide,
}: {
  c: CaseState
  onOpen: (id: string) => void
  onShow: (id: string, el: HTMLElement) => void
  onHide: () => void
}) {
  const s = SCRIPT_BY_ID[c.id]
  const v = viewOf(c)
  const started = c.stage > 0 || c.phase === 'working'
  return (
    <button
      type="button"
      onClick={() => onOpen(c.id)}
      onMouseEnter={(e) => onShow(c.id, e.currentTarget)}
      onFocus={(e) => onShow(c.id, e.currentTarget)}
      onBlur={onHide}
      aria-label={`${s.short} ${clientOf(c.id)}, ${cellStatus(c).label}`}
      className="group flex h-6 w-6 items-center justify-center rounded-md focus-visible:outline-none focus-visible:shadow-focus"
    >
      <span
        className={cn(
          'relative h-4 w-4 overflow-hidden rounded-[3px] border transition-[transform,background-color,border-color] duration-slow group-hover:scale-125',
          v === 'done'
            ? TONE[OUTCOME_OF[s.outcome].tone]
            : v === 'blocked'
              ? TONE.warning
              : v === 'failed'
                ? TONE.danger
                : started
                  ? 'border-brand bg-surface-card'
                  : 'border-default bg-surface-sunken',
        )}
      >
        {v !== 'done' && v !== 'blocked' && v !== 'failed' && started && (
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 bg-brand-200 transition-[height] duration-200 ease-linear"
            style={{ height: `${overallProgress(c) * 100}%` }}
          />
        )}
        {(v === 'blocked' || v === 'failed') && (
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
          />
        )}
      </span>
    </button>
  )
}

/**
 * The house tooltip (dark, as InfoTip), header + body, with a 14x7 arrow at
 * the cell. It reads from live state, so it keeps up with a case that moves
 * while it is open.
 */
/** Half the tooltip's widest, so a tip on an edge cell stays inside the card. */
const TIP_HALF = 120

function CellTip({ c, x, y, w }: { c: CaseState; x: number; y: number; w: number }) {
  const s = SCRIPT_BY_ID[c.id]
  const status = cellStatus(c)
  // The box is held inside the row; the arrow still points at the cell.
  const left = Math.max(TIP_HALF, Math.min(x, w - TIP_HALF))
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 w-max max-w-[240px] -translate-x-1/2 -translate-y-full animate-fade-in"
      style={{ left, top: y - 4 }}
    >
      <div className="flex flex-col gap-2 rounded-md bg-neutral-900 p-2.5 text-inverse shadow-classic">
        <div className="flex flex-col border-b border-neutral-700 pb-2">
          <span className="flex items-center gap-1.5 font-mono text-xs text-neutral-400">
            <SegmentIcon id={c.id} />
            {s.short}
          </span>
          <span className="text-sm font-medium">{clientOf(c.id)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={status.tone} dot={status.tone === 'warning'}>
            {status.label}
          </Badge>
          <span className="text-xs text-neutral-400">{s.row.plan}</span>
        </div>
      </div>
      <svg
        aria-hidden
        width="14"
        height="7"
        viewBox="0 0 14 7"
        className="absolute top-full -mt-px -translate-x-1/2"
        style={{ left: `calc(50% + ${x - left}px)` }}
      >
        <path d="M0 0 L7 7 L14 0" className="fill-neutral-900" />
      </svg>
    </div>
  )
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cn('h-3 w-3 rounded-sm border', className)} />
      {label}
    </span>
  )
}

function Events({ state, onOpen }: { state: RunState; onOpen: (id: string) => void }) {
  const [stage, setStage] = useState<number | null>(null)
  const shown = state.events
    .filter((e) => stage === null || e.stage === stage)
    .slice(-SHOW_EVENTS)
    .reverse()

  return (
    <Card className="absolute inset-0">
      <CardHeading title="Live events" />
      <div className="flex flex-wrap gap-1.5">
        <Chip label="All" selected={stage === null} onClick={() => setStage(null)} />
        {STAGES.map((s, i) => (
          <Chip key={s.id} label={s.label} selected={stage === i} onClick={() => setStage(i)} />
        ))}
      </div>
      <ol className="-mx-4 min-h-0 flex-1 overflow-y-auto border-t border-default">
        {shown.length === 0 && <li className="px-4 py-3 text-sm text-subtle">No events yet.</li>}
        {shown.map((e) => (
          <li
            key={e.seq}
            className="grid animate-fade-up grid-cols-[44px_1fr] gap-3 border-b border-subtle px-4 py-2 last:border-b-0"
          >
            <span className="font-mono text-xs leading-5 text-muted">{formatClock(e.at)}</span>
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-subtle">{STAGES[e.stage].agent}</span>
                <button
                  type="button"
                  onClick={() => onOpen(e.caseId)}
                  className="rounded-sm font-mono text-brand hover:underline focus-visible:outline-none focus-visible:shadow-focus"
                >
                  {SCRIPT_BY_ID[e.caseId].short}
                </button>
              </span>
              <span
                className={cn(
                  'text-sm',
                  e.kind === 'block'
                    ? 'text-warning-fg'
                    : e.kind === 'error'
                      ? 'text-danger-fg'
                      : e.kind === 'resume'
                        ? 'text-brand'
                        : 'text-default',
                )}
              >
                {e.text}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  )
}
