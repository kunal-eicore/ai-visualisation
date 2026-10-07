import { useEffect, useReducer } from 'react'
import { initialRun, isComplete, runReducer } from './engine'
import type { ScenarioId } from './script'

/** Real milliseconds between ticks. Short enough for the progress bars to
 *  read as continuous, long enough to keep re-renders cheap. */
const TICK = 200

/**
 * The run starts when the screen opens and stops when the screen closes. The
 * timer lives in an effect; the reducer itself stays pure.
 */
export function useRun(scenario: ScenarioId) {
  const [state, dispatch] = useReducer(runReducer, scenario, initialRun)
  const live = state.running && !isComplete(state)

  useEffect(() => {
    if (!live) return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      // Clamped so a backgrounded tab does not jump the whole run on return.
      dispatch({ type: 'tick', dt: Math.min(now - last, 500) })
      last = now
    }, TICK)
    return () => window.clearInterval(id)
  }, [live])

  return { state, dispatch, complete: isComplete(state) }
}

export type Run = ReturnType<typeof useRun>
