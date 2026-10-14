import { Badge, type Tone } from '@/components/ui/Badge'
import { ATTENTION_KIND, type AttentionKind } from '@/routes/autonomous/run/parts'
import { cn } from '@/lib/cn'
import { STAGES } from './data'
import type { Item, ItemState } from './useIntake'

export const STATE_ORDER: ItemState[] = ['Processing', 'Queued', 'Held', 'Failed', 'Rejected', 'Kept with a person', 'Reached']

export const STATE_TONE: Record<ItemState, Tone> = {
  Processing: 'info',
  Queued: 'neutral',
  Held: 'warning',
  Failed: 'danger',
  Rejected: 'warning',
  'Kept with a person': 'neutral',
  Reached: 'success',
}

/** The actions a task offers, by state: what the panel footer and the row
 *  menu both show. `primary` is the footer's right-most button. */
export type ActionKey = 'hold' | 'release' | 'retry' | 'toAgents' | 'toPerson'

export const ACTION_LABEL: Record<ActionKey, string> = {
  hold: 'Hold',
  release: 'Release',
  retry: 'Retry',
  toAgents: 'Send to Fully Agentic',
  toPerson: 'Keep with a person',
}

export const ACTIONS: Record<ItemState, { primary?: ActionKey; secondary?: ActionKey }> = {
  Processing: { primary: 'hold' },
  Queued: {},
  Held: { primary: 'release', secondary: 'toPerson' },
  Failed: { primary: 'retry', secondary: 'toPerson' },
  Rejected: { primary: 'toAgents', secondary: 'toPerson' },
  Reached: { primary: 'toPerson' },
  'Kept with a person': { primary: 'toAgents' },
}

/** States that wait on a person, in the Fully Agentic run's attention kinds:
 *  a hold or a rejection waits on a person's call, a failure on a retry. */
export const ATTENTION_OF: Partial<Record<ItemState, AttentionKind>> = {
  Held: 'warning',
  Rejected: 'warning',
  Failed: 'error',
}

/** A task's state as a badge. Attention states carry the run's icon, never a dot alongside it. */
export function StateBadge({ state }: { state: ItemState }) {
  const kind = ATTENTION_OF[state]
  const Icon = kind && ATTENTION_KIND[kind].icon
  return (
    <Badge tone={STATE_TONE[state]} icon={Icon && <Icon aria-hidden className="h-3 w-3" />}>
      {state === 'Processing' ? 'In progress' : state}
    </Badge>
  )
}

/** Still moving, so neither reached nor not. */
export const IN_PROGRESS: ItemState[] = ['Processing', 'Queued']

/* ── Progress, in the case drawer's bars ─────────────────────────────── */


const FINAL: ItemState[] = ['Reached', 'Kept with a person', 'Rejected']

/** Fill and colour of one stage's bar, by the drawer's rules: brand while it
 *  moves, warning when it waits on a person, danger when it failed. */
function bar(item: Item, s: number): { fill: number; className: string } {
  if (item.state === 'Queued') return { fill: 0, className: '' }
  if (FINAL.includes(item.state) || s < item.stage) return { fill: 1, className: 'bg-brand-500' }
  if (s > item.stage) return { fill: 0, className: '' }
  if (item.state === 'Failed') return { fill: 1, className: 'bg-danger-400' }
  if (item.state === 'Held') return { fill: 1, className: 'bg-warning-400' }
  return { fill: 0.5, className: 'bg-brand-500' }
}

const SAY = (item: Item, s: number) => {
  const { fill, className } = bar(item, s)
  return fill === 0 ? 'not run' : className.includes('danger') ? 'failed' : className.includes('warning') ? 'held' : fill < 1 ? 'in progress' : 'done'
}

export function Progress({ item, labels }: { item: Item; labels?: boolean }) {
  return (
    <ol
      aria-label={STAGES.map((st, s) => `${st}: ${SAY(item, s)}`).join(', ')}
      className={cn('grid grid-cols-5', labels ? 'gap-1.5' : 'w-[96px] gap-0.5')}
    >
      {STAGES.map((stage, s) => {
        const { fill, className } = bar(item, s)
        const here = s === item.stage && !FINAL.includes(item.state) && item.state !== 'Queued'
        return (
          <li key={stage} className="flex flex-col gap-1.5">
            <span className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
              <span className={cn('block h-full rounded-full transition-[width] duration-200 ease-linear', className)} style={{ width: `${fill * 100}%` }} />
            </span>
            {labels && <span className={cn('text-xs', here ? 'font-semibold text-default' : 'text-subtle')}>{stage}</span>}
          </li>
        )
      })}
    </ol>
  )
}
