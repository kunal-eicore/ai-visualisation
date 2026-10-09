import { useEffect, useReducer, useRef } from 'react'
import { useAgentSettings } from '../agents/settings'
import { initialRun, isComplete, runReducer, type RunMode } from './engine'
import type { ScenarioId } from './script'

/** Real milliseconds between ticks. Short enough for the progress bars to
 *  read as continuous, long enough to keep re-renders cheap. */
const TICK = 200

/**
 * The run starts when the screen opens and stops when the screen closes. The
 * timer lives in an effect; the reducer itself stays pure, so the agent
 * settings ride in on each tick rather than being read inside it.
 */
export function useRun(scenario: ScenarioId, mode: RunMode = 'autonomous') {
  const [state, dispatch] = useReducer(runReducer, { scenario, mode }, initialRun)
  const { settings } = useAgentSettings()
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const live = state.running && !isComplete(state)

  useEffect(() => {
    if (!live) return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      // Clamped so a backgrounded tab does not jump the whole run on return.
      dispatch({ type: 'tick', dt: Math.min(now - last, 500), settings: settingsRef.current })
      last = now
    }, TICK)
    return () => window.clearInterval(id)
  }, [live])

  return { state, dispatch, complete: isComplete(state), settings }
}

export type Run = ReturnType<typeof useRun>
