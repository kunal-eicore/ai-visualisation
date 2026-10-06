import { useLocation, useSearchParams } from 'react-router-dom'
import { Chip } from '@/components/ui/Chip'
import { AUTONOMOUS_MODES, AUTONOMOUS_PATH, autonomousModeFrom } from '@/routes/autonomous/modes'

/**
 * The Fully Autonomous mode switch — the same Mode label + Chips as
 * `ModeSwitch`, but a different set and URL-held, like `VersionSwitch`.
 *
 * It renders only on /autonomous and decides that itself, so `TopBar` does
 * not need to know which routes have it.
 */
export function AutonomousModeSwitch() {
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()

  if (pathname !== AUTONOMOUS_PATH) return null
  const active = autonomousModeFrom(params)

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 font-mono text-xs uppercase tracking-wide text-muted">Mode</span>
      <div role="group" aria-label="Mode" className="flex items-center gap-1.5">
        {AUTONOMOUS_MODES.map((m) => (
          <Chip
            key={m.id}
            label={m.label}
            selected={m.id === active}
            onClick={() => {
              const next = new URLSearchParams(params)
              if (m.id === 'manual') next.delete('mode')
              else next.set('mode', m.id)
              setParams(next)
            }}
          />
        ))}
      </div>
    </div>
  )
}
