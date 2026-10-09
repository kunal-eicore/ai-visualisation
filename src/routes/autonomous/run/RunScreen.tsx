import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pause, Play, Radar, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { CaseDrawer } from './CaseDrawer'
import { Line } from './Line'
import { NeedsYou } from './NeedsYou'
import { SystemView } from './SystemView'
import { casesOf } from './engine'
import { DONE, SCENARIOS, formatClock, scenarioFrom, type ScenarioId } from './script'
import { useRun } from './useRun'

/**
 * Autonomous mode: agents resolve the whole underwriting queue.
 *
 * The screen is the line (stations, rail, ledger) with the cases that stopped
 * for a person underneath it. The header carries the clock and the run
 * controls, and opens the system view. Outcomes are read off the ledger only;
 * a second outcome readout in the header was cut as a duplicate.
 */
export function RunScreen() {
  const [params, setParams] = useSearchParams()
  const scenario = scenarioFrom(params)
  /* The scenario lives in the URL (normal = bare), next to `mode`, so a reload
     or a shared link keeps it. Keyed on it, so a switch starts a fresh run. */
  const setScenario = (next: ScenarioId) =>
    setParams((p) => {
      const q = new URLSearchParams(p)
      if (next === 'normal') q.delete('scenario')
      else q.set('scenario', next)
      return q
    })
  return <Run key={scenario} scenario={scenario} onScenario={setScenario} />
}

function Run({ scenario, onScenario }: { scenario: ScenarioId; onScenario: (s: ScenarioId) => void }) {
  const { state, dispatch, complete, settings } = useRun(scenario)
  const [openId, setOpenId] = useState<string | null>(null)
  const [system, setSystem] = useState(false)

  const closeCase = useCallback(() => setOpenId(null), [])
  const closeSystem = useCallback(() => setSystem(false), [])

  const cases = casesOf(state)
  const done = cases.filter((c) => c.stage === DONE).length
  const open = openId ? state.cases[openId] : null

  const status = complete
    ? { label: 'Complete', tone: 'success' as const }
    : state.running
      ? { label: 'Running', tone: 'brand' as const }
      : { label: 'Paused', tone: 'neutral' as const }

  const runControl = complete ? (
    <Button variant="neutral" size="sm" icon={<RotateCcw aria-hidden className="h-3.5 w-3.5" />} onClick={() => dispatch({ type: 'replay' })}>
      Replay run
    </Button>
  ) : (
    <Button
      variant="neutral"
      size="sm"
      icon={state.running ? <Pause aria-hidden className="h-3.5 w-3.5" /> : <Play aria-hidden className="h-3.5 w-3.5" />}
      onClick={() => dispatch({ type: 'toggle' })}
    >
      {state.running ? 'Pause all' : 'Resume all'}
    </Button>
  )

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-surface-card">
      <header className="flex shrink-0 border-b border-default px-8 py-4">
        <div className="flex flex-1 items-center gap-3">
          <h1 className="text-xl font-semibold text-default">Underwriting run</h1>
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="font-mono text-sm text-subtle">{formatClock(state.clock)}</span>
          <span aria-hidden className="text-sm text-muted">·</span>
          <p className="font-mono text-sm text-subtle">
            {/* Keyed on the count so each decision rolls the number in. */}
            <span key={done} className="inline-block animate-reveal font-semibold text-default">
              {done}
            </span>{' '}
            / {cases.length} resolved
          </p>
          <span className="flex-1" />
          <div role="group" aria-label="Scenario" className="flex gap-1.5">
            {SCENARIOS.map((s) => (
              <Chip key={s.id} label={s.label} selected={scenario === s.id} onClick={() => onScenario(s.id)} />
            ))}
          </div>
          <Button variant="neutral" size="sm" icon={<Radar aria-hidden className="h-3.5 w-3.5" />} onClick={() => setSystem(true)}>
            System view
          </Button>
          {runControl}
        </div>
      </header>

      {/* No bottom padding here: the columns carry it, so the line fills the
          area and the Decided column's divider runs to the bottom edge. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pt-6">
        <Line state={state} settings={settings} selected={openId} onOpen={setOpenId} />
      </div>

      <NeedsYou state={state} onOpen={setOpenId} />

      {system && (
        <SystemView state={state} controls={runControl} onClose={closeSystem} onOpen={setOpenId} drawerOpen={!!open} />
      )}

      {open && (
        <CaseDrawer
          c={open}
          running={state.running}
          onClose={closeCase}
          onPause={() => dispatch({ type: 'pauseCase', id: open.id })}
          onUnblock={() => dispatch({ type: 'unblock', id: open.id })}
          onRetry={() => dispatch({ type: 'retry', id: open.id })}
          onApprove={() => dispatch({ type: 'approve', id: open.id })}
          onComplete={() => dispatch({ type: 'complete', id: open.id })}
        />
      )}
    </div>
  )
}
