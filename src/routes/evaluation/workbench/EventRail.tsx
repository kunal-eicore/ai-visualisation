import { Radio, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { Region } from '@/components/workspace/Shell'
import { EVENTS } from './data'

type EventRailProps = {
  /** The run of events currently marked for tagging. */
  selected: Set<string>
  onSelect: (id: string, extend: boolean) => void
  /** Events the block under the cursor consumes — the relation, seen from
   *  the other end of the canvas. */
  linked: Set<string>
  onTag: () => void
  /** Events already claimed by a saved context. */
  claimed: Set<string>
}

/**
 * The recorded event stream, with a timestamp column (sketch: "w/ timestamp").
 *
 * Two independent highlights sit on this list and must not be confused:
 * **selection** is what you are about to name as a context, and **linked** is
 * what the block you are hovering already reads. Selection is a filled row,
 * link is a left marker — different channels, so a selected linked row still
 * reads as both.
 */
export function EventRail({ selected, onSelect, linked, onTag, claimed }: EventRailProps) {
  return (
    <Region
      title="Events"
      icon={<Radio aria-hidden className="h-4 w-4 text-muted" />}
      info="The recorded run this workflow is built against — one real case, in order, with timestamps. Select a stretch of it and tag it into a named context. A marker on the left shows which events the block you are hovering reads."
      meta={<span className="font-mono">{EVENTS.length}</span>}
      pad={false}
      footer={
        <Button
          size="sm"
          variant={selected.size ? 'primary' : 'neutral'}
          disabled={selected.size === 0}
          onClick={onTag}
          icon={<Tag aria-hidden className="h-4 w-4" />}
          className="w-full"
        >
          {selected.size ? `Tag ${selected.size} events to context` : 'Select a run of events'}
        </Button>
      }
    >
      <ul>
        {EVENTS.map((e) => {
          const isSelected = selected.has(e.id)
          const isLinked = linked.has(e.id)
          return (
            <li key={e.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={(ev) => onSelect(e.id, ev.shiftKey)}
                className={cn(
                  'flex w-full flex-col gap-0.5 border-b border-subtle px-3 py-2 text-left transition-colors duration-base',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  isSelected ? 'bg-success-bg' : 'hover:bg-neutral-50',
                )}
              >
                <div className="flex items-center gap-1.5">
                  {/* The relation marker. Holds its width when absent so the
                      rows do not shift as the cursor moves over the canvas. */}
                  <span
                    aria-hidden
                    className={cn('h-3.5 w-0.5 shrink-0 rounded-full', isLinked ? 'bg-brand-500' : 'bg-transparent')}
                  />
                  <span className="font-mono text-xs text-muted">{e.ts}</span>
                  <span
                    className={cn(
                      'truncate font-mono text-xs font-semibold',
                      isSelected ? 'text-success-fg' : 'text-default',
                    )}
                  >
                    {e.label}
                  </span>
                  {claimed.has(e.id) && !isSelected && (
                    <Tag aria-hidden className="ml-auto h-3 w-3 shrink-0 text-muted" />
                  )}
                </div>
                <p className="truncate pl-3.5 text-xs text-subtle">{e.detail}</p>
              </button>
            </li>
          )
        })}
      </ul>
    </Region>
  )
}
