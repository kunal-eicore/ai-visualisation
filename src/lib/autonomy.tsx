import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Bot, MessagesSquare, PencilLine, Sparkles, type LucideIcon } from 'lucide-react'

/**
 * Autonomy modes — the ladder a decision-class journey is run at.
 *
 * The four states are not four feature levels. They are four *authority*
 * settings, which is the distinction the north star turns on: "machine
 * authority belongs to a defined decision class, with clear conditions and
 * intervention paths" (04), and "autonomy grows only as accountability does"
 * (13). So every mode here declares two things and never one: what the
 * machine may do, and what stays with the person.
 *
 * Three consequences are deliberately baked into the shape of this type:
 *
 * - **Every rung keeps a human gate.** The whole run in Manual, confirming
 *   each extracted value in AI-assisted, the Apply in Hybrid, the signature in
 *   Autonomous. "The human intervention path never disappears" (09) is a
 *   property of the ladder, not of its lower rungs — so it is enforced in the
 *   screens rather than stated in a banner the user has to read.
 * - **Manual is a real rung, not a failure state.** It is the mode the run
 *   falls back to when the model is unavailable, and it loses speed rather
 *   than control (10) — which is only true if it is built and reachable at
 *   any moment, not kept as a disaster-recovery path nobody has opened. It
 *   keeps the template import for the same reason: a deterministic script
 *   reading a workbook whose shape was agreed in advance is not AI, so
 *   withholding it from Manual would be withholding plumbing, not authority.
 * - **The mode is part of the record.** It is switchable mid-run, so what a
 *   quotation was prepared under is a fact about the decision and travels
 *   with it (06, 14) rather than being a UI preference.
 *
 * What the mode does NOT do is change the steps. The spine is the same seven
 * steps at every setting; autonomy changes who fills them in and how much is
 * left to confirm. A mode that changed the workflow would be a second
 * product with a shared name.
 */

export const MODE_IDS = ['manual', 'assisted', 'hybrid', 'autonomous'] as const
export type ModeId = (typeof MODE_IDS)[number]

export type Mode = {
  id: ModeId
  label: string
  icon: LucideIcon
  /** Whether the chat exists, and whether it starts open. */
  chat: 'off' | 'launcher' | 'open'
  /**
   * A filled copy of the published workbook template can be imported.
   *
   * True at every rung, Manual included, because this is not an AI capability
   * — it is a script reading known cells out of a known sheet. The file has to
   * BE the template; anything looser is rejected rather than interpreted.
   * Availability therefore does not depend on the authority setting, and
   * taking it away in Manual would make Manual mean "type 1,367 rows by hand",
   * which is not a rung of a ladder anybody climbs.
   */
  templateImport: boolean
  /**
   * Loosely structured documents can be read — a broker's own census layout,
   * an RFQ e-mail, a claims dump with the columns in a different order.
   *
   * This is the line the ladder actually turns on. Reading a file nobody
   * agreed the shape of in advance is an interpretation, and an interpretation
   * is the thing that needs an authority setting behind it.
   */
  extraction: boolean
  /** Fields arrive filled rather than blank. */
  autofill: boolean
  /** The system sequences the run itself and delegates what it cannot settle. */
  agentic: boolean
}

export const MODES: Record<ModeId, Mode> = {
  manual: {
    id: 'manual',
    label: 'Manual',
    icon: PencilLine,
    chat: 'off',
    templateImport: true,
    extraction: false,
    autofill: false,
    agentic: false,
  },
  assisted: {
    id: 'assisted',
    label: 'AI-assisted',
    icon: Sparkles,
    chat: 'launcher',
    templateImport: true,
    extraction: true,
    autofill: true,
    agentic: false,
  },
  hybrid: {
    id: 'hybrid',
    label: 'Hybrid',
    icon: MessagesSquare,
    chat: 'open',
    templateImport: true,
    extraction: true,
    autofill: true,
    agentic: false,
  },
  autonomous: {
    id: 'autonomous',
    label: 'Autonomous',
    icon: Bot,
    chat: 'open',
    templateImport: true,
    extraction: true,
    autofill: true,
    agentic: true,
  },
}

export const MODE_LIST = MODE_IDS.map((id) => MODES[id])

type AutonomyValue = {
  mode: Mode
  setMode: (id: ModeId) => void
  /** True only while a route that HAS a mode is mounted. */
  scoped: boolean
  setScoped: (on: boolean) => void
}

const AutonomyContext = createContext<AutonomyValue | null>(null)

export function AutonomyProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<ModeId>('assisted')
  const [scoped, setScoped] = useState(false)

  const value = useMemo<AutonomyValue>(
    () => ({ mode: MODES[id], setMode: setId, scoped, setScoped }),
    [id, scoped],
  )

  return <AutonomyContext.Provider value={value}>{children}</AutonomyContext.Provider>
}

export function useAutonomy() {
  const value = useContext(AutonomyContext)
  if (!value) throw new Error('useAutonomy must be used inside <AutonomyProvider>')
  return value
}

/**
 * Claim the top-bar mode switch for the lifetime of a route.
 *
 * The switch is deliberately not global chrome. A mode is a property of a
 * decision-class journey, and a control that sits above routes with no such
 * journey would be asserting an authority setting over screens that have no
 * authority to set.
 */
export function useAutonomyScope() {
  const { setScoped } = useAutonomy()
  useEffect(() => {
    setScoped(true)
    return () => setScoped(false)
  }, [setScoped])
}
