import { Layers } from 'lucide-react'
import { Switch } from '@/components/ui/Switch'
import { ConnectorTile } from '@/components/workspace/ConnectorsMenu'
import { RailRow, Region } from '@/components/workspace/Shell'
import { SOURCES, type IntakeType, type SourceId } from './data'
import type { Item } from './useIntake'

const TYPES: IntakeType[] = ['User starts it', 'Assigned to a bucket', 'System to system', 'Unstructured inbound']

/**
 * Sources, grouped under the four intake types, on the house rail (the
 * Connectors list). A row filters the log to that source; its switch pauses
 * it, so new items from it wait as Queued. Counts come from the log itself.
 *
 * The switch sits beside the row's button, not inside it: a control inside a
 * button is two controls in one.
 */
export function SourcesRail({
  items,
  paused,
  selected,
  onSelect,
  onToggle,
}: {
  items: Item[]
  paused: SourceId[]
  selected: SourceId | null
  onSelect: (id: SourceId | null) => void
  onToggle: (id: SourceId) => void
}) {
  const live = SOURCES.length - paused.length

  return (
    <Region title="Sources" meta={<span className="font-mono">{live} of {SOURCES.length} live</span>} pad={false}>
      <RailRow selected={selected === null} onClick={() => onSelect(null)}>
        <span className="flex items-center gap-2.5">
          <ConnectorTile item={{ icon: Layers, tone: 'neutral' }} size="md" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold text-default">All sources</span>
            <span className="truncate font-mono text-xs text-muted">{items.length} received</span>
          </span>
        </span>
      </RailRow>

      {TYPES.map((type) => (
        <div key={type}>
          <p className="border-b border-subtle px-4 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">{type}</p>
          {SOURCES.filter((s) => s.type === type).map((s) => {
            const mine = items.filter((it) => it.task.source === s.id)
            const isPaused = paused.includes(s.id)
            const queued = mine.filter((it) => it.state === 'Queued').length
            const meta = isPaused
              ? `Paused${queued ? ` · ${queued} queued` : ''}`
              : mine.length
                ? `${mine.length} received`
                : 'None yet'
            return (
              <div key={s.id} className="relative">
                <RailRow selected={selected === s.id} onClick={() => onSelect(s.id)}>
                  <span className="flex items-center gap-2.5 pr-12">
                    <ConnectorTile item={{ icon: s.icon, tone: 'neutral' }} size="md" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-semibold text-default">{s.label}</span>
                      <span className="truncate font-mono text-xs text-muted">{meta}</span>
                    </span>
                  </span>
                </RailRow>
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Switch checked={!isPaused} onChange={() => onToggle(s.id)} label={`${s.label} live`} />
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </Region>
  )
}
