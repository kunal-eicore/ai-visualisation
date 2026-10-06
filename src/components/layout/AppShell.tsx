import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AutonomyProvider } from '@/lib/autonomy'
import { AgentRunProvider } from '@/lib/agentRun'
import { RUN_TASKS } from '@/routes/quotation/group-health/data'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/**
 * §5 App shell. `<main>` is the **only** page-level scroll container, and
 * it is re-keyed by pathname so every route change replays the fade-up
 * entrance. A full-height page sets `h-full overflow-hidden` on its own
 * root and scrolls an inner panel, so fixed side rails don't scroll away.
 *
 * The autonomy provider sits here rather than inside a route, because the
 * control it feeds lives in the TopBar — above the outlet. It stays dormant
 * until a route with a decision-class journey claims it (`useAutonomyScope`).
 *
 * The agent run sits here for a harder reason. An autonomous run keeps going
 * when you walk away from the screen that started it, so its state and its
 * timers cannot live in that route: unmounting the quotation would silently
 * cancel the work it is doing. Hoisting it is also what lets the top bar say
 * so, which is the only reason a person on another screen would ever find
 * out that something is waiting on them.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(true)
  const { pathname } = useLocation()

  return (
    <AutonomyProvider>
      <AgentRunProvider tasks={RUN_TASKS}>
      <div className="flex h-screen overflow-hidden bg-surface-page text-default">
        <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            <div key={pathname} className="h-full animate-fade-up">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      </AgentRunProvider>
    </AutonomyProvider>
  )
}
