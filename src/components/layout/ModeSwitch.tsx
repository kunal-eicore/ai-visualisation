import { Chip } from '@/components/ui/Chip'
import { MODE_LIST, useAutonomy } from '@/lib/autonomy'

/**
 * The autonomy switch — four Chips, not a new segmented control.
 *
 * §4.6 already owns this gesture ("use Chips for filter bars, not Buttons"),
 * and a mode switch is the same act as a filter: one of a small closed set is
 * on. §0.5 says compose before you create, so there is no SegmentedControl.
 *
 * It renders only where a decision-class journey is mounted
 * (`useAutonomyScope`). Autonomy is a setting on a journey, and a switch
 * standing above screens that have no journey would be claiming to govern
 * something that is not there.
 */
export function ModeSwitch() {
  const { mode, setMode } = useAutonomy()

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 font-mono text-xs uppercase tracking-wide text-muted">Mode</span>
      <div role="group" aria-label="Autonomy mode" className="flex items-center gap-1.5">
        {MODE_LIST.map((m) => (
          <Chip key={m.id} label={m.label} selected={m.id === mode.id} onClick={() => setMode(m.id)} />
        ))}
      </div>
    </div>
  )
}
