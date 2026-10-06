import { Bell } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAutonomy } from '@/lib/autonomy'
import { AutonomousModeSwitch } from './AutonomousModeSwitch'
import { Breadcrumb } from './Breadcrumb'
import { ModeSwitch } from './ModeSwitch'
import { RunIndicator } from './RunIndicator'
import { VersionSwitch } from './VersionSwitch'
import { AUTONOMOUS_PATH } from '@/routes/autonomous/modes'

/**
 * §5 TopBar — h-16, breadcrumb left; bell + account right.
 *
 * The autonomy switch sits here, and only on routes that claim it: the mode
 * is a property of the whole journey, not of the step you happen to be on, so
 * it belongs in the band that names the run rather than inside the form it
 * governs.
 *
 * The DS TopBar also carries a Sun/Moon theme toggle. It is omitted here
 * because dark mode is explicitly deferred (§7): the status tone triples
 * have no Dark value, so a toggle would render success badges as pale mint
 * on a near-black card. See README before re-adding it.
 */
export function TopBar() {
  const { scoped } = useAutonomy()
  const { pathname } = useLocation()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-default bg-surface-card px-5">
      <Breadcrumb />

      <div className="flex items-center gap-3">
        {/* Outside the `scoped` gate on purpose. The mode switch belongs to
            the route that has a decision-class journey; the run does not,
            because the whole point of it is to be visible from the routes
            that do not. */}
        <RunIndicator />

        {/* Renders itself only on a screen that has versions, so the band
            does not need to know which those are. */}
        <VersionSwitch />

        {/* Only /autonomous has this switch. It gates itself too; the
            check here is for the divider. */}
        {pathname === AUTONOMOUS_PATH && (
          <>
            <AutonomousModeSwitch />
            <span aria-hidden className="h-6 w-px bg-neutral-200" />
          </>
        )}

        {scoped && (
          <>
            <ModeSwitch />
            <span aria-hidden className="h-6 w-px bg-neutral-200" />
          </>
        )}

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-default text-muted transition-colors duration-base hover:bg-surface-sunken hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Bell aria-hidden className="h-5 w-5" />
          <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
        </button>

        <button
          type="button"
          aria-label="Account"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-300 bg-brand-50 text-xs font-bold text-brand focus-visible:outline-none focus-visible:shadow-focus"
        >
          AU
        </button>
      </div>
    </header>
  )
}
