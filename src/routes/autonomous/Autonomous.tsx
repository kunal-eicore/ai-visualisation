import { useSearchParams } from 'react-router-dom'
import { IntentScreen } from './intent/IntentScreen'
import { QueueScreen } from './queue/QueueScreen'
import { RunScreen } from './run/RunScreen'
import { autonomousModeFrom } from './modes'

/**
 * Fully Autonomous — intent-based workflows with little to no human
 * intervention at any point.
 *
 * Manual is the underwriting queue as it stands in onebuzz, rebuilt for
 * readability, with the queue assistant docked beside it. Intent based is a
 * single box with the capabilities under it. Autonomous is the run: agents
 * working the whole queue on a line of stations, with a system view over it.
 * Hybrid is deliberately blank until its content is described. The mode is picked in the top bar
 * (`AutonomousModeSwitch`).
 */
export function Autonomous() {
  const [params] = useSearchParams()
  const mode = autonomousModeFrom(params)
  if (mode === 'manual') return <QueueScreen />
  if (mode === 'intent') return <IntentScreen />
  if (mode === 'autonomous') return <RunScreen />
  return null
}
