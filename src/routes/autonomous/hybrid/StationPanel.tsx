import { useNavigate } from 'react-router-dom'
import { Settings2, Square } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConnectorTile } from '@/components/workspace/ConnectorsMenu'
import { PanelSection, SidePanel } from '@/components/workspace/SidePanel'
import { cn } from '@/lib/cn'
import { CONNECTORS } from '@/routes/harness/connectors/data'
import { agentsAt, capacityAt, connectorsOf, type AgentSettings } from '../agents/settings'
import { needsPerson, stageProgress, stopReason, type CaseState, type RunState } from '../run/engine'
import { SegmentIcon, clientOf } from '../run/parts'
import { SCRIPT_BY_ID, STAGES } from '../run/script'

/**
 * One station's ongoing tasks: the cases its agent is working, the ones
 * queued for it, and any it stopped on. Every case still on the line can be
 * stopped from here, which hands it back to the person unchanged.
 *
 * The footer carries what the agent runs with, and the way into its settings.
 */
export function StationPanel({
  state,
  stage,
  settings,
  onClose,
  onOpen,
  onStop,
}: {
  state: RunState
  stage: number
  settings: AgentSettings
  onClose: () => void
  onOpen: (id: string) => void
  onStop: (id: string) => void
}) {
  const navigate = useNavigate()
  const station = STAGES[stage]
  const agents = agentsAt(settings, stage)
  const capacity = capacityAt(settings, stage)
  const here = Object.values(state.cases).filter((c) => c.onLine && c.stage === stage)
  const working = here.filter((c) => c.phase === 'working').sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0))
  const waiting = here.filter((c) => c.phase === 'queued').sort((a, b) => a.order - b.order)
  const stopped = here.filter(needsPerson)
  // The agent the settings link opens: the station's first active one, or
  // its default agent when the station is off.
  const agent = agents[0] ?? settings.agents.find((a) => a.role === station.id) ?? settings.agents[stage]
  const linked = connectorsOf(settings, agent)
    .map((id) => CONNECTORS.find((c) => c.id === id))
    .filter((c): c is (typeof CONNECTORS)[number] => !!c)

  return (
    <SidePanel
      title={station.agent}
      eyebrow={station.label}
      closeLabel="Close ongoing tasks"
      onClose={onClose}
      footer={
        <>
          {agents.length === 0 ? (
            <Badge tone="neutral">Agent off</Badge>
          ) : (
            <span className="font-mono text-xs text-subtle">Up to {capacity} at once</span>
          )}
          {agent.humanApproval && agents.length > 0 && <Badge tone="info">Approval on</Badge>}
          {linked.length > 0 && (
            <span className="flex items-center" title={linked.map((c) => c.label).join(', ')}>
              {linked.map((c, i) => (
                <span key={c.id} className={cn('inline-flex rounded-full bg-surface-card p-0.5', i > 0 && '-ml-2')}>
                  <ConnectorTile item={c} />
                </span>
              ))}
            </span>
          )}
          <span className="flex-1" />
          <Button
            variant="neutral"
            size="sm"
            icon={<Settings2 aria-hidden className="h-3.5 w-3.5" />}
            onClick={() => navigate(`/autonomous/settings?agent=${agent.id}`)}
          >
            Agent settings
          </Button>
        </>
      }
    >
      <PanelSection title="Working" aside={<span className="font-mono text-xs text-subtle">{working.length}/{capacity}</span>}>
        {working.length === 0 ? (
          <p className="text-sm text-subtle">Nothing in hand.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {working.map((c) => (
              <TaskRow key={c.id} c={c} onOpen={onOpen} onStop={onStop} />
            ))}
          </ul>
        )}
      </PanelSection>

      {waiting.length > 0 && (
        <PanelSection title="Waiting" aside={<span className="font-mono text-xs text-subtle">{waiting.length}</span>}>
          <ul className="flex flex-col gap-2">
            {waiting.map((c) => (
              <TaskRow key={c.id} c={c} onOpen={onOpen} onStop={onStop} />
            ))}
          </ul>
        </PanelSection>
      )}

      {stopped.length > 0 && (
        <PanelSection title="Needs your attention">
          <ul className="flex flex-col gap-2">
            {stopped.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  className={cn(
                    'flex w-full flex-col gap-0.5 rounded-lg border px-4 py-3 text-left transition-shadow duration-base hover:shadow-card',
                    'focus-visible:outline-none focus-visible:shadow-focus',
                    c.phase === 'failed'
                      ? 'border-danger bg-danger-bg'
                      : c.phase === 'approval'
                        ? 'border-info bg-info-bg'
                        : 'border-warning bg-warning-bg',
                  )}
                >
                  <CaseLine c={c} />
                  <span className={cn('truncate text-sm', c.phase === 'failed' ? 'text-danger-fg' : 'text-subtle')}>
                    {stopReason(c)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}
    </SidePanel>
  )
}

function CaseLine({ c }: { c: CaseState }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs text-subtle">
        <SegmentIcon id={c.id} />
        {SCRIPT_BY_ID[c.id].short}
      </span>
      <span className="truncate text-sm font-medium text-default">{clientOf(c.id)}</span>
    </span>
  )
}

/**
 * A case in the agent's hands or queued for it. Working rows carry the
 * agent's latest trace line and the station's progress; the run counts one
 * second as one agent minute, so the elapsed figure reads in minutes.
 */
function TaskRow({ c, onOpen, onStop }: { c: CaseState; onOpen: (id: string) => void; onStop: (id: string) => void }) {
  const working = c.phase === 'working'
  const latest = [...c.trace].reverse().find((t) => t.stage === c.stage && !t.kind)?.text
  return (
    <li
      className={cn(
        'relative flex items-center gap-4 overflow-hidden rounded-lg border bg-surface-card py-3 pl-4 pr-3',
        working ? 'border-brand' : 'border-dashed border-strong',
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(c.id)}
        className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-sm text-left focus-visible:outline-none focus-visible:shadow-focus"
      >
        <CaseLine c={c} />
        <span className="truncate text-sm text-subtle">
          {working ? (latest ?? 'Starting') : c.paused ? 'Paused' : 'Queued'}
        </span>
      </button>
      {working && (
        <span className="shrink-0 font-mono text-xs text-subtle">{Math.floor(c.t / 1000)} min</span>
      )}
      <Button
        variant="neutral"
        size="sm"
        aria-label={`Stop ${SCRIPT_BY_ID[c.id].short}`}
        icon={<Square aria-hidden className="h-3 w-3" />}
        onClick={() => onStop(c.id)}
      >
        Stop
      </Button>
      {working && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-100">
          <span
            className="block h-full bg-brand-500 transition-[width] duration-200 ease-linear"
            style={{ width: `${stageProgress(c) * 100}%` }}
          />
        </span>
      )}
    </li>
  )
}
