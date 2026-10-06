/**
 * "Look here" — scroll a surface into view and hold a brand ring on it.
 *
 * Fired on a CLICK, never on the agent's own account. When the agent moves
 * something, the skeleton already says so, in place, on the exact values
 * being recomputed; and one request can touch several surfaces, so ringing
 * each in turn would be three competing "look here"s for something nobody
 * asked to be shown. **The ring answers a request; the skeleton reports
 * work.** Keeping those two signals apart is what stops the screen from
 * flashing at the user continuously.
 *
 * Held and released rather than animated, and written as an inline shadow
 * from the `--ring-flash` token rather than a Tailwind class. Both choices
 * are about the ways this failed before: an animation does not replay when
 * re-applied to an element that already carries the class, is cancelled by
 * any child `animationend` bubbling up, and is collapsed to 0.01ms under
 * `prefers-reduced-motion`; and a *newly added* utility class does not exist
 * until the Tailwind config is reloaded, which a running dev server may not
 * have done. An inline value from a token in the CSS entry has none of those
 * dependencies. The fade is a transition, which degrades to an instant
 * appearance under reduced motion instead of to nothing.
 *
 * Driven on the node rather than through React state because no re-render is
 * otherwise needed; the timer is parked on the element so a second call
 * extends the same ring instead of racing it. Nothing else writes
 * `style.boxShadow` on these wrappers, so clearing it is safe.
 */

/** How long the ring is held on a surface the chat has just sent you to. */
export const FLASH_MS = 1400

export function scrollTo(el: HTMLElement | null) {
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function ring(el: HTMLElement | null, hold = FLASH_MS) {
  if (!el) return
  scrollTo(el)
  el.style.boxShadow = 'var(--ring-flash)'
  window.clearTimeout(Number(el.dataset.flashTimer))
  el.dataset.flashTimer = String(
    window.setTimeout(() => {
      el.style.boxShadow = ''
    }, hold),
  )
}
