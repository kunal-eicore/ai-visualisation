import { Bot, Check, ChevronDown, UserRoundCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { STEPS, type Step } from './data'

/**
 * What the agent did to a step, in Autonomous mode. Nothing in the other
 * three: an empty column beside every row would be chrome claiming a state
 * the run does not have.
 */
export type Annotation = 'agent' | 'needs-you'

/**
 * The workflow rail — the quotation steps, and only those.
 *
 * The source screen also lists the underwriter's review block below this one.
 * It is deliberately not reproduced: this walkthrough is the broker-facing
 * run, and seven permanently-unreachable rows below the live ones cost rail
 * height while adding nothing you can act on.
 *
 * A completed step stays clickable. This is a configurable form, not a wizard
 * that punishes you for going back.
 *
 * In Autonomous mode the rail carries a second signal: which steps the agent
 * filled, and which it stopped on. That belongs in the rail rather than only
 * inside the steps, because the reviewer's first question is where to look,
 * and a run that answers it only after you open all seven steps has made
 * delegation the reviewer's search problem.
 */
export function Stepper({
  current,
  furthest,
  annotations,
  onSelect,
}: {
  current: Step
  /** How far the run has actually got. Steps beyond it are not selectable. */
  furthest: number
  /** Autonomous only: what the agent did to each step. */
  annotations?: Partial<Record<Step, Annotation>>
  onSelect: (step: Step) => void
}) {
  const index = STEPS.indexOf(current)

  return (
    <nav
      aria-label="Quotation steps"
      className="flex w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-default bg-surface-card py-4"
    >
      <GroupLabel>Group Quotation</GroupLabel>
      <ol className="-mt-4 flex flex-col">
        {STEPS.map((step, i) => (
          <StepRow
            key={step}
            label={step}
            state={i < index ? 'done' : i === index ? 'active' : 'upcoming'}
            first={i === 0}
            last={i === STEPS.length - 1}
            disabled={i > furthest}
            annotation={annotations?.[step]}
            onClick={() => onSelect(step)}
          />
        ))}
      </ol>
    </nav>
  )
}

function GroupLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 px-4">
      <ChevronDown aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted" />
      <span className="shrink-0 font-mono text-xs uppercase tracking-widest text-muted">
        {children}
      </span>
      <span aria-hidden className="h-px min-w-0 flex-1 bg-neutral-200" />
    </div>
  )
}

type RowState = 'done' | 'active' | 'upcoming'

function StepRow({
  label,
  state,
  first,
  last,
  disabled,
  annotation,
  onClick,
}: {
  label: string
  state: RowState
  first: boolean
  last: boolean
  disabled?: boolean
  annotation?: Annotation
  onClick?: () => void
}) {
  return (
    <li className="relative">
      {/* The connector is drawn behind the indicator and clipped at the ends of
          the group, so the spine never overshoots the first or last row. */}
      <span
        aria-hidden
        className={cn(
          'absolute left-[27px] w-px bg-neutral-200',
          first ? 'bottom-0 top-1/2' : last ? 'bottom-1/2 top-0' : 'inset-y-0',
        )}
      />
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-current={state === 'active' ? 'step' : undefined}
        className={cn(
          'relative flex h-[52px] w-full items-center gap-3 px-4 text-left transition-colors duration-base',
          'focus-visible:outline-none focus-visible:shadow-focus',
          state === 'active' && 'bg-brand-bg',
          !disabled && state !== 'active' && 'hover:bg-neutral-50',
          disabled && 'cursor-default',
        )}
      >
        <Indicator state={state} />
        <span
          className={cn(
            'min-w-0 truncate text-base',
            state === 'active' && 'font-semibold text-brand',
            state === 'done' && 'font-medium text-default',
            state === 'upcoming' && 'text-subtle',
          )}
        >
          {label}
        </span>
        {annotation && <Marker annotation={annotation} />}
      </button>
    </li>
  )
}

/** The agent's mark on a row. Warning carries the one that needs a person;
 *  muted carries the one that does not, because a row the agent settled is
 *  information, not an alert.
 *
 *  It says "a person" rather than "you" on purpose: a run hands work to the
 *  underwriter and to the broker as well, and a rail that called all three
 *  yours would be overstating your queue by more than half. Which person it
 *  is belongs on the board, where there is room to say so. */
function Marker({ annotation }: { annotation: Annotation }) {
  const needsYou = annotation === 'needs-you'
  const Icon = needsYou ? UserRoundCheck : Bot
  return (
    <span
      title={needsYou ? 'With a person' : 'Filled by the agent'}
      className={cn(
        'ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
        needsYou ? 'border-warning bg-warning-bg text-warning-fg' : 'border-default bg-neutral-50 text-muted',
      )}
    >
      <Icon aria-hidden className="h-3 w-3" />
      <span className="sr-only">{needsYou ? 'With a person' : 'Filled by the agent'}</span>
    </span>
  )
}

function Indicator({ state }: { state: RowState }) {
  if (state === 'done') {
    return (
      <span className="relative z-10 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-primary text-inverse">
        <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    )
  }
  if (state === 'active') {
    return (
      <span className="relative z-10 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-primary bg-surface-card">
        <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
      </span>
    )
  }
  return (
    <span className="relative z-10 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-default bg-surface-card">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
    </span>
  )
}
