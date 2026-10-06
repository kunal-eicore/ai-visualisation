import { useEffect, useRef } from 'react'
import ChatThrobber, { type ThrobberPhase as LibPhase } from '@/lib/throbber'
import { cn } from '@/lib/cn'

/**
 * React wrapper around the house throbber (`src/lib/throbber.js`).
 *
 * The library is a four-state lifecycle, not a spinner, and the states are
 * the reason to use it: the ring **waves** while the agent is reasoning and
 * **spins** while a tool call is out. Those are different waits — one is the
 * agent thinking, the other is the agent blocked on something else — and
 * showing them as the same animation is what makes most copilots opaque.
 *
 * Phase mapping follows the library's own integration guidance:
 *
 *   tool_start     -> toolCall()       (exit to line if needed) -> spin
 *   thinking_start -> startThinking()  assemble -> wave
 *   done           -> endThinking()    waveout -> settle -> idle
 *   error / abort  -> reset()          idle, immediately
 *
 * A running cycle always completes before the next begins, so `done` is not
 * instant: use `onPhase` to hold the indicator until the ring has reformed,
 * which is what the docs mean by hiding the bubble only at `idle`.
 */
export type ThrobberPhase =
  /** Resting ring. Jumps there immediately — use for abort and teardown. */
  | 'idle'
  /** Active reasoning: assemble into the line, then wave. */
  | 'thinking'
  /** Blocked on a tool call: spin. */
  | 'toolCall'
  /** Turn complete: damp, settle, and come to rest. */
  | 'ending'

export function Throbber({
  phase = 'idle',
  size = 26,
  wave = 'dots',
  className,
  label,
  onPhase,
}: {
  phase?: ThrobberPhase
  /** The docs put this at 20–28px inside a chat bubble. */
  size?: number
  wave?: 'dots' | 'bars'
  className?: string
  /** Accessible name. Omit for a purely decorative mark. */
  label?: string
  /** Fires on every library phase change, including the final `idle`. */
  onPhase?: (phase: LibPhase) => void
}) {
  const mount = useRef<HTMLSpanElement>(null)
  const instance = useRef<ChatThrobber | null>(null)
  const handler = useRef(onPhase)
  handler.current = onPhase

  useEffect(() => {
    const el = mount.current
    if (!el) return

    const t = new ChatThrobber(el, {
      size,
      wave,
      // Near the library defaults (0.5 / 1.0 / 0.7 / 0.6), trimmed only on the
      // two transitions. An agent turn crosses between reasoning and tool
      // calls repeatedly, and a transition should not outlast the beat it is
      // announcing — but it does need to be seen, so this stays generous.
      phases: {
        spin:     { duration: 1.0, easing: 'in-out' },
        assemble: { duration: 0.45, easing: 'in-out' },
        wave:     { duration: 1.0, easing: 'in-out' },
        settle:   { duration: 0.55, easing: 'in' },
      },
      waveOut: 0.45,
    })
    instance.current = t

    const onLibPhase = (e: Event) => handler.current?.((e as CustomEvent).detail.phase as LibPhase)
    el.addEventListener('throbber:phase', onLibPhase)

    // The documented static fallback: a flat dot line, no animation loop.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) t.show('linerest')

    return () => {
      el.removeEventListener('throbber:phase', onLibPhase)
      t.destroy()
      instance.current = null
    }
  }, [size, wave])

  useEffect(() => {
    const t = instance.current
    if (!t) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    if (phase === 'thinking') t.startThinking()
    else if (phase === 'toolCall') t.toolCall()
    else if (phase === 'ending') t.endThinking()
    else t.reset()
  }, [phase])

  return (
    <span
      ref={mount}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    />
  )
}
