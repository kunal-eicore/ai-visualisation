import { Inbox, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Region } from '@/components/workspace/Shell'
import { cn } from '@/lib/cn'
import { Menu } from '@/routes/autonomous/queue/Menu'
import { sourceOf } from './data'
import { ACTIONS, ACTION_LABEL, IN_PROGRESS, Progress, StateBadge, type ActionKey } from './parts'
import { clockOf, type Item, type ItemState } from './useIntake'

/** The four figures are the filters; "Not reached" opens onto its reasons. */
export type StateFilter = 'Received' | 'Reached agentic flow' | 'Not reached' | 'In progress'
const NOT_REACHED: ItemState[] = ['Kept with a person', 'Held', 'Failed', 'Rejected']

const IN_FILTER: Record<StateFilter, (it: Item) => boolean> = {
  Received: () => true,
  'Reached agentic flow': (it) => it.state === 'Reached',
  'Not reached': (it) => NOT_REACHED.includes(it.state),
  'In progress': (it) => IN_PROGRESS.includes(it.state),
}

const FIGURE_TONE: Record<StateFilter, string> = {
  Received: 'text-default',
  'Reached agentic flow': 'text-success-fg',
  'Not reached': 'text-warning-fg',
  'In progress': 'text-info-fg',
}

const TH = 'px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted'

/**
 * The intake log, drawn with the Underwriting Queue's idioms: a strip of four
 * figures, chips with counts, uppercase column labels, and a row menu. Newest first.
 *
 * The figures answer the screen's one question, of what came in how much
 * reached the agentic flow, and double as its filters. The row opens the
 * task; the menu holds its actions.
 */
export function IntakeLog({
  title,
  items,
  filter,
  onFilter,
  reason,
  onReason,
  openId,
  onOpen,
  onAct,
}: {
  title: string
  /** Already narrowed to the selected source. */
  items: Item[]
  filter: StateFilter
  onFilter: (f: StateFilter) => void
  reason: ItemState | null
  onReason: (r: ItemState | null) => void
  openId: string | null
  onOpen: (id: string) => void
  onAct: (id: string, a: ActionKey) => void
}) {
  const count = (pred: (it: Item) => boolean) => items.filter(pred).length
  const shown = items.filter((it) => IN_FILTER[filter](it) && (!reason || it.state === reason))
  const filtered = filter !== 'Received' || !!reason
  const clear = () => {
    onFilter('Received')
    onReason(null)
  }

  return (
    <Region
      title={title}
      meta={<span className="font-mono">{shown.length} {shown.length === 1 ? 'task' : 'tasks'}</span>}
      pad={false}
    >
      <div role="group" aria-label="Filter by outcome" className="grid grid-cols-4 border-b border-default">
        {(Object.keys(IN_FILTER) as StateFilter[]).map((f, n) => {
          const on = filter === f
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              onClick={() => {
                onFilter(f)
                onReason(null)
              }}
              className={cn(
                'flex flex-col gap-1 border-b-2 px-5 py-4 text-left transition-colors duration-base focus-visible:outline-none focus-visible:shadow-focus',
                n > 0 && 'border-l border-l-subtle',
                on ? 'border-b-primary bg-brand-50' : 'border-b-transparent hover:bg-neutral-50',
              )}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{f}</span>
              <span className={cn('font-mono text-3xl font-semibold tabular-nums', FIGURE_TONE[f])}>{count(IN_FILTER[f])}</span>
            </button>
          )
        })}
      </div>

      {filter === 'Not reached' && (
        <div className="flex flex-wrap items-center gap-2 border-b border-subtle px-4 py-3">
          {NOT_REACHED.map((r) => (
            <Chip key={r} label={r} count={count((it) => it.state === r)} selected={reason === r} onClick={() => onReason(reason === r ? null : r)} />
          ))}
        </div>
      )}

      <div className="relative overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-default">
              <th className={TH}>Intake ref</th>
              <th className={TH}>Client</th>
              <th className={TH}>Source</th>
              <th className={TH}>Progress</th>
              <th className={TH}>Outcome</th>
              <th className={TH}>Arrived</th>
              <th className={TH}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((it) => {
              const t = it.task
              const src = sourceOf(t.source)
              const Icon = src.icon
              const { primary, secondary } = ACTIONS[it.state]
              const menu = [primary, secondary].filter(Boolean).map((k) => ({ key: k!, label: ACTION_LABEL[k!] }))
              return (
                <tr
                  key={t.id}
                  onClick={() => onOpen(t.id)}
                  className={cn(
                    'group animate-fade-up cursor-pointer border-b border-subtle transition-colors duration-base last:border-0',
                    t.id === openId ? 'bg-brand-bg' : 'hover:bg-brand-50',
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-medium text-default">{it.ref}</td>
                  <td className="px-3 py-3">
                    <span className="block max-w-[220px] truncate text-sm font-medium text-default" title={t.case.clientName ?? undefined}>
                      {t.case.clientName}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      <Icon aria-hidden className="h-4 w-4 shrink-0 text-muted" />
                      <span className="block max-w-[200px] truncate text-sm text-default">{src.label}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Progress item={it} />
                  </td>
                  <td className="px-3 py-3">
                    <StateBadge state={it.state} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-subtle">{clockOf(it.arrivedAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      {menu.length > 0 ? (
                        <Menu
                          label="Task actions"
                          align="right"
                          items={menu}
                          onSelect={(k) => onAct(t.id, k as ActionKey)}
                          trigger={({ open, toggle }) => (
                            <button
                              type="button"
                              aria-label="Task actions"
                              aria-expanded={open}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggle()
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors duration-base hover:bg-surface-sunken hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
                            >
                              <MoreVertical aria-hidden className="h-4 w-4" />
                            </button>
                          )}
                        />
                      ) : (
                        <span aria-hidden className="h-7 w-7" />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-300 bg-brand-50 text-brand">
              <Inbox aria-hidden className="h-5 w-5" />
            </span>
            <p className="text-md font-medium text-default">{filtered ? 'No tasks match this filter' : 'Nothing received yet'}</p>
            {filtered && (
              <Button size="sm" variant="outline" onClick={clear}>
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </Region>
  )
}
