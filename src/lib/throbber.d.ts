/**
 * Types for the vendored `throbber.js` (see the header in that file).
 *
 * The .js is copied verbatim from the hub root — it is third-party to this
 * project, which is why it carries its own hex palette rather than resolving
 * through the token layer (§0.4 governs components, not vendored libraries).
 * Do not edit it here; re-copy from `../../throbber.js` if it changes.
 */

export type ThrobberPhase =
  | 'idle' | 'linerest' | 'spin' | 'assemble' | 'wave' | 'wavebars' | 'waveout' | 'settle'

export type ThrobberOptions = {
  /** Rendered px. The viewBox is fixed at 60x60, so it scales freely. */
  size?: number
  /** `null` keeps the multicolour mark; any CSS colour forces single-colour. */
  color?: string | null
  colors?: string[]
  wave?: 'dots' | 'bars'
  autoStart?: 'spin' | 'thinking' | null
  phases?: Partial<Record<'spin' | 'assemble' | 'wave' | 'settle', { duration?: number; easing?: string }>>
  waveOut?: number
}

export const DEFAULT_COLORS: string[]
export const DEFAULTS: ThrobberOptions

export default class ChatThrobber {
  constructor(target: Element | string, options?: ThrobberOptions)
  /** Constant spin loop — indefinite background work, i.e. a tool call. */
  toolCall(): this
  /** Rotate to a line, then wave — active thinking. */
  startThinking(): this
  /** Wave calms, settles back to the ring, then idles. */
  endThinking(): this
  reset(): this
  show(phase: ThrobberPhase): this
  set(patch: ThrobberOptions): this
  readonly state: ThrobberPhase
  readonly isThinking: boolean
  destroy(): void
}
