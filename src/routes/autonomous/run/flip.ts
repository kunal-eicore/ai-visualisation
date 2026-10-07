import { useLayoutEffect, useRef } from 'react'

/**
 * FLIP across parents. A case is a different element in every station, so the
 * last position is kept per case id, outside React. A new element with the same
 * id that mounts right after the old one went away starts from the old one's
 * spot and glides to its own.
 *
 * Positions come from the offsetParent chain rather than
 * getBoundingClientRect, so an element caught mid-flight is measured where it
 * lives, not where its transform is drawing it.
 */
const last = new Map<string, { x: number; y: number; t: number }>()

/** How long a departed element's position stays claimable. One commit apart
 *  in practice; the margin covers a slow frame. */
const HANDOFF_MS = 400

function layoutPos(el: HTMLElement) {
  let x = 0
  let y = 0
  let e: HTMLElement | null = el
  while (e) {
    x += e.offsetLeft
    y += e.offsetTop
    e = e.offsetParent as HTMLElement | null
  }
  return { x, y }
}

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useFlip<T extends HTMLElement>(id: string, duration = 620) {
  const ref = useRef<T>(null)
  const own = useRef<{ x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const now = layoutPos(el)
    let from = own.current
    if (!from) {
      const handed = last.get(id)
      if (handed && performance.now() - handed.t < HANDOFF_MS) from = handed
    }
    own.current = now
    if (!from || reduced()) return
    const dx = from.x - now.x
    const dy = from.y - now.y
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    el.style.zIndex = '20'
    const a = el.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
      { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    )
    a.onfinish = a.oncancel = () => {
      el.style.zIndex = ''
    }
  })

  useLayoutEffect(
    () => () => {
      if (own.current) last.set(id, { ...own.current, t: performance.now() })
    },
    [id],
  )

  return ref
}
