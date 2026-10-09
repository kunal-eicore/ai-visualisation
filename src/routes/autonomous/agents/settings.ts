import { useSyncExternalStore } from 'react'
import { STAGES } from '../run/script'

/**
 * Agent settings, shared by Hybrid and Autonomous.
 *
 * One record per agent. An agent's `role` is the station it works, so a
 * station's width is the sum of its active agents' `maxConcurrent`, and a
 * station with no active agent is off: Autonomous hands its cases to a person
 * and Hybrid will not offer it.
 *
 * Kept in a module store over localStorage rather than React state, so the
 * settings route and the run read the same object and a reload keeps it. A
 * per-viewer convenience: there is no backend behind this sandbox.
 */

export type StageId = (typeof STAGES)[number]['id']

export type AgentConfig = {
  id: string
  name: string
  role: StageId
  active: boolean
  /** Cases the agent works at once. */
  maxConcurrent: number
  /** The agent's output waits for a person before the case moves on. */
  humanApproval: boolean
  /** Retries on a failed tool call before the case is handed to a person. */
  retries: number
  /** Agent minutes on one station before the case is handed to a person.
   *  The run is simulated at one run-clock second per agent minute. */
  timeoutMin: number
  instructions: string
  /** Connectors bound to this agent alone, on top of the global ones. */
  connectors: string[]
}

export type AgentSettings = {
  /** Connectors bound to every agent. */
  global: string[]
  agents: AgentConfig[]
}

export const MAX_CONCURRENT = 10
export const RETRY_OPTIONS = [0, 1, 2, 3]
export const TIMEOUT_OPTIONS = [10, 15, 30, 60]

const INSTRUCTIONS: Record<StageId, string> = {
  intake: 'Read the proposal or RFQ, match the proposer to their CKYC record and open the case file.',
  documents: 'Extract every document in the case file. Flag anything missing or unreadable rather than guessing.',
  risk: 'Score the case against the underwriting appetite. Cite the declaration or claim behind every adverse finding.',
  pricing: 'Price from the rate table for the plan. Apply loadings only for declared conditions.',
  decision: 'Decide within delegated authority. Refer anything above the auto-approve limit to a senior underwriter.',
}

const OWN_CONNECTORS: Record<StageId, string[]> = {
  intake: ['email', 'ckyc'],
  documents: ['claims'],
  risk: ['surepass', 'claims'],
  pricing: ['policy-admin'],
  decision: ['policy-admin', 'email'],
}

export const DEFAULT_SETTINGS: AgentSettings = {
  global: ['documents'],
  agents: STAGES.map((s) => ({
    id: `${s.id}-agent`,
    name: s.agent,
    role: s.id,
    active: true,
    maxConcurrent: s.capacity,
    humanApproval: false,
    retries: 2,
    timeoutMin: 30,
    instructions: INSTRUCTIONS[s.id],
    connectors: OWN_CONNECTORS[s.id],
  })),
}

// ---------------------------------------------------------------- store

const KEY = 'ai-vis.agent-settings.v1'

function load(): AgentSettings {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    const saved = JSON.parse(raw) as AgentSettings
    // A saved copy from an older shape falls back to the defaults.
    if (!Array.isArray(saved.global) || !Array.isArray(saved.agents) || saved.agents.length !== STAGES.length) {
      return DEFAULT_SETTINGS
    }
    return saved
  } catch {
    return DEFAULT_SETTINGS
  }
}

let current: AgentSettings = load()
const listeners = new Set<() => void>()

function set(next: AgentSettings) {
  current = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage blocked: the settings still hold for this page's life.
  }
  listeners.forEach((l) => l())
}

export function useAgentSettings() {
  const settings = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
  return {
    settings,
    updateAgent: (id: string, patch: Partial<AgentConfig>) =>
      set({ ...current, agents: current.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) }),
    toggleGlobal: (connector: string) =>
      set({
        ...current,
        global: current.global.includes(connector)
          ? current.global.filter((c) => c !== connector)
          : [...current.global, connector],
      }),
    reset: () => set(DEFAULT_SETTINGS),
  }
}

// ------------------------------------------------------------- readings

/** The active agents working a station, in settings order. */
export const agentsAt = (s: AgentSettings, stage: number) =>
  s.agents.filter((a) => a.active && a.role === STAGES[stage].id)

/** Cases a station works at once: its active agents' widths, summed. */
export const capacityAt = (s: AgentSettings, stage: number) =>
  agentsAt(s, stage).reduce((n, a) => n + a.maxConcurrent, 0)

export const isStationOn = (s: AgentSettings, stage: number) => agentsAt(s, stage).length > 0

/** Every connector an agent can reach: the global ones, then its own. */
export const connectorsOf = (s: AgentSettings, a: AgentConfig) => [
  ...s.global,
  ...a.connectors.filter((c) => !s.global.includes(c)),
]

export const stageIndexOf = (role: StageId) => STAGES.findIndex((s) => s.id === role)
