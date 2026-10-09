import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Chip } from '@/components/ui/Chip'
import { Toast } from '@/components/ui/Toast'
import { UnderwritingQueue, type QueueAgentSlot } from '../queue/UnderwritingQueue'
import { useQueue } from '../queue/state'
import { CaseDrawer } from '../run/CaseDrawer'
import { Line } from '../run/Line'
import { NeedsYou } from '../run/NeedsYou'
import { canTrigger, saveAuto, type CaseState } from '../run/engine'
import { DONE, STAGES } from '../run/script'
import { useRun } from '../run/useRun'
import { AgentStatus, AutomateMenu, SendMenu, rowAgentItems } from './rowAgent'
import { StationPanel } from './StationPanel'

type HybridView = 'queue' | 'work'

const TOAST_MS = 4000

/**
 * Hybrid mode: the person works the queue as they do today, and hands steps
 * to agents. Three ways, all from the queue: one case to its next station (the
 * row menu), a batch ("Send to agent": the selection, or every eligible case),
 * or a standing rule ("Automate steps"): every case that has not done an
 * automated step is sent to it, now and whenever it comes back to the person.
 * The agent works that station and hands the case back.
 *
 * Two screens over one run. The queue is Manual's table with the agent
 * controls added; Agent work is the Autonomous line, lit only where agents are
 * on and holding only the cases a person sent. The run lives here, above both,
 * so switching screens keeps it. The screen is in `?view=` (queue = bare).
 */
export function HybridScreen() {
  const [params, setParams] = useSearchParams()
  const view: HybridView = params.get('view') === 'work' ? 'work' : 'queue'
  const setView = (next: HybridView) =>
    setParams((p) => {
      const q = new URLSearchParams(p)
      if (next === 'queue') q.delete('view')
      else q.set('view', next)
      return q
    })

  const { state, dispatch, settings } = useRun('normal', 'hybrid')
  const q = useQueue()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [station, setStation] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number>()

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])
  useEffect(() => saveAuto(state.auto), [state.auto])

  const onLine = Object.values(state.cases).filter((c) => c.onLine)
  const working = onLine.filter((c) => c.phase === 'working').length

  const say = (title: string) => {
    setToast(title)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }

  const run = (ids: string[], stage: number) => {
    const ready = ids.filter((id) => state.cases[id] && canTrigger(state.cases[id], stage))
    if (!ready.length) return
    dispatch({ type: 'trigger', ids: ready, stage })
    setSelected((s) => {
      const n = new Set(s)
      ready.forEach((id) => n.delete(id))
      return n
    })
    const agent = STAGES[stage].agent.toLowerCase()
    say(ready.length === 1 ? `Sent to the ${agent}` : `${ready.length} cases sent to the ${agent}`)
  }

  // A selected case that an agent picks up, or that gets decided, drops out
  // of the selection: it can no longer be sent anywhere.
  const selectable = useCallback((c: CaseState | undefined) => !!c && !c.onLine && c.stage !== DONE, [])
  useEffect(() => {
    setSelected((s) => {
      const keep = [...s].filter((id) => selectable(state.cases[id]))
      return keep.length === s.size ? s : new Set(keep)
    })
  }, [state.cases, selectable])

  const selectedCases = useMemo(() => [...selected].map((id) => state.cases[id]).filter(Boolean), [selected, state.cases])

  const slot: QueueAgentSlot = {
    selected,
    selectable: (row) => selectable(state.cases[row.id]),
    onSelect: (ids, on) =>
      setSelected((s) => {
        const n = new Set(s)
        ids.forEach((id) => (on ? n.add(id) : n.delete(id)))
        return n
      }),
    status: (row) => <AgentStatus c={state.cases[row.id]} onOpen={setOpenId} />,
    menu: (row) => rowAgentItems(state.cases[row.id], settings),
    onMenu: (row, key) => {
      if (key.startsWith('send:')) run([row.id], Number(key.slice(5)))
    },
    toolbar: (
      <>
        <SendMenu
          cases={selected.size ? selectedCases : Object.values(state.cases)}
          scope={selected.size ? 'selected' : 'all'}
          settings={settings}
          onRun={(stage) => run(selected.size ? [...selected] : Object.keys(state.cases), stage)}
        />
        <AutomateMenu
          auto={state.auto}
          settings={settings}
          onToggle={(stage, on) => {
            dispatch({ type: 'setAuto', stage, on })
            say(on ? `${STAGES[stage].label} is automated` : `${STAGES[stage].label} is back with you`)
          }}
        />
      </>
    ),
  }

  const switcher = (
    <div role="group" aria-label="Screen" className="flex gap-1.5">
      <Chip label="Queue" selected={view === 'queue'} onClick={() => setView('queue')} />
      <Chip label="Agent work" count={onLine.length} selected={view === 'work'} onClick={() => setView('work')} />
    </div>
  )

  const open = openId ? state.cases[openId] : null
  const closeCase = useCallback(() => setOpenId(null), [])
  const closeStation = useCallback(() => setStation(null), [])

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {view === 'queue' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <UnderwritingQueue q={q} agent={slot} headerAction={switcher} />
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-card">
          <header className="flex shrink-0 items-center gap-3 border-b border-default px-8 py-4">
            <h1 className="text-xl font-semibold text-default">Agent work</h1>
            {working > 0 ? <Badge tone="brand">{working} working</Badge> : <Badge tone="neutral">Idle</Badge>}
            <span className="flex-1" />
            {switcher}
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pt-6">
            <Line state={state} settings={settings} auto={state.auto} selected={openId} onOpen={setOpenId} onStation={setStation} />
          </div>
          <NeedsYou state={state} onOpen={setOpenId} />
        </div>
      )}

      {station !== null && (
        <StationPanel
          state={state}
          stage={station}
          settings={settings}
          onClose={closeStation}
          onOpen={(id) => {
            setStation(null)
            setOpenId(id)
          }}
          onStop={(id) => dispatch({ type: 'stop', id })}
        />
      )}

      {open && (
        <CaseDrawer
          c={open}
          running={state.running}
          onClose={closeCase}
          onStop={() => dispatch({ type: 'stop', id: open.id })}
          onUnblock={() => dispatch({ type: 'unblock', id: open.id })}
          onRetry={() => dispatch({ type: 'retry', id: open.id })}
          onApprove={() => dispatch({ type: 'approve', id: open.id })}
          onComplete={() => dispatch({ type: 'complete', id: open.id })}
        />
      )}

      {toast && <Toast title={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
