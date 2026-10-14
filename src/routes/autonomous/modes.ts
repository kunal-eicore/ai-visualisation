/**
 * The four modes of the Fully Autonomous block. Manual is the underwriting
 * queue as it stands, Intent based is the centred chat, Autonomous is the
 * agent run, and Hybrid is the queue with stations handed to agents on demand.
 *
 * Separate from `lib/autonomy` on purpose: that ladder (with AI-assisted)
 * belongs to the group health journey, and this switch exists only on
 * /autonomous. The mode lives in `?mode=` so a reload or a shared link keeps
 * it; Manual is the bare URL.
 */
export const AUTONOMOUS_MODES = [
  { id: 'manual', label: 'Deterministic' },
  { id: 'hybrid', label: 'Deterministic + Agent' },
  { id: 'autonomous', label: 'Fully Agentic' },
  { id: 'intent', label: 'Intent based' },
] as const

export type AutonomousModeId = (typeof AUTONOMOUS_MODES)[number]['id']

export const AUTONOMOUS_PATH = '/autonomous'

/** An unknown or missing `?mode=` reads as Manual. */
export function autonomousModeFrom(params: URLSearchParams): AutonomousModeId {
  const raw = params.get('mode')
  return AUTONOMOUS_MODES.find((m) => m.id === raw)?.id ?? 'manual'
}
