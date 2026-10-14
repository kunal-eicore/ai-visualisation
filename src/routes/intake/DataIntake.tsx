import { useCallback, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Workspace } from '@/components/workspace/Shell'
import { sourceOf, type SourceId } from './data'
import { IntakeDetail } from './IntakeDetail'
import { IntakeLog, type StateFilter } from './IntakeLog'
import type { ActionKey } from './parts'
import { RoutingRules } from './RoutingRules'
import { SourcesRail } from './SourcesRail'
import { useIntake, type ItemState } from './useIntake'

const VIEWS = ['Log', 'Routing rules'] as const
type View = (typeof VIEWS)[number]

/**
 * Data Intake: how work lands in the system before an agentic flow picks it
 * up. 100 tasks from six sources feed one pipeline (Arrive, Extract /
 * Normalise, Classify, Validate / Enrich, Route); routing rules decide whether
 * each one reaches the agentic flow (Fully Agentic: the same 60 cases as the
 * line on /autonomous) or not, and every decision keeps its trail.
 * Intent based is never a destination.
 *
 * Same shell as Harness and Connectors: a 48px band with the view tabs, then
 * a rail and a canvas split by hairlines. The log uses the Underwriting
 * Queue's table idioms; item details open in the house side panel.
 */
export function DataIntake() {
  const [running, setRunning] = useState(true)
  const { items, paused, rules, dispatch } = useIntake(running)
  const [view, setView] = useState<View>('Log')
  const [source, setSource] = useState<SourceId | null>(null)
  const [filter, setFilter] = useState<StateFilter>('Received')
  const [reason, setReason] = useState<ItemState | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const close = useCallback(() => setOpenId(null), [])
  const open = items.find((it) => it.task.id === openId)

  const act = useCallback(
    (id: string, a: ActionKey) => {
      const at = Date.now()
      if (a === 'toAgents' || a === 'toPerson') dispatch({ type: 'reroute', id, to: a === 'toAgents' ? 'autonomous' : 'manual', at })
      else dispatch({ type: a, id, at })
    },
    [dispatch],
  )

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-surface-page">
      <div className="flex h-12 shrink-0 items-center gap-4 border-b border-default bg-surface-card px-4">
        <h1 className="shrink-0 text-sm font-semibold text-default">Data Intake</h1>
        <span aria-hidden className="h-4 w-px shrink-0 bg-neutral-300" />
        <Tabs options={VIEWS} value={view} onChange={setView} aria-label="Data Intake view" />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            variant="neutral"
            size="sm"
            aria-pressed={!running}
            onClick={() => setRunning((r) => !r)}
            icon={running ? <Pause aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Play aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} />}
          >
            {running ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </div>

      {view === 'Log' ? (
        <Workspace cols="xl:grid-cols-[320px_minmax(0,1fr)]">
          <SourcesRail
            items={items}
            paused={paused}
            selected={source}
            onSelect={setSource}
            onToggle={(id) => dispatch({ type: 'toggleSource', id })}
          />
          <IntakeLog
            title={source ? sourceOf(source).label : 'All sources'}
            items={source ? items.filter((it) => it.task.source === source) : items}
            filter={filter}
            onFilter={setFilter}
            reason={reason}
            onReason={setReason}
            openId={openId}
            onOpen={setOpenId}
            onAct={act}
          />
        </Workspace>
      ) : (
        <Workspace cols="xl:grid-cols-1">
          <RoutingRules rules={rules} onChange={(id, patch) => dispatch({ type: 'setRule', id, patch })} />
        </Workspace>
      )}

      {open && <IntakeDetail key={open.task.id} item={open} onAct={(a) => act(open.task.id, a)} onClose={close} />}
    </div>
  )
}
