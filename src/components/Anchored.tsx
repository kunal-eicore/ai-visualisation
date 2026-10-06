import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

/*
 * A card pinned to an element, rendered outside whatever is clipping it.
 *
 * WHY THIS EXISTS. An absolutely positioned tooltip is clipped by the nearest
 * ancestor with `overflow` set, and every dense table on these screens sits in
 * an `overflow-x-auto` wrapper so it can scroll sideways on a narrow window.
 * `overflow-x: auto` is not a one-axis promise — the used value of the other
 * axis becomes `auto` too — so the wrapper clips vertically as well, and a
 * tooltip on the first or last row gets cut off. No amount of z-index fixes
 * that: the element is not painted outside its clip rect at all.
 *
 * So the card is portalled to `document.body` and positioned `fixed` against
 * the anchor's measured rect. It leaves the clipping context entirely, which
 * is the only actual fix.
 *
 * It re-measures on scroll and resize rather than closing, because these cards
 * open on hover and a card that vanishes the moment the page moves under the
 * pointer is worse than one that follows it.
 */

export type Align = 'left' | 'right' | 'center'

export type Anchor = {
  left: number
  width: number
  /** Where the card's top edge goes when it opens downward. */
  below: number
  /** Where its bottom edge goes when it opens upward. */
  above: number
  /** The guess made from the anchor alone, before the card has a height. */
  flip: boolean
}

/**
 * Clearance below the anchor before a card is flipped above it.
 *
 * Only a first guess: the card's height is not knowable until it has rendered,
 * and these range from one line to a six-row table. `AnchoredCard` measures
 * itself once mounted and corrects this, so the threshold just avoids a
 * visible flip on the common cases.
 */
const ROOM = 190
const MARGIN = 8
const OFFSET = 6

export function useAnchored({ align = 'left', width }: { align?: Align; width: number }) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<Anchor | null>(null)
  const shown = pos !== null

  const place = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()

    let left =
      align === 'right' ? r.right - width : align === 'center' ? r.left + r.width / 2 - width / 2 : r.left
    /* Never off the side of the window, whatever the anchor is doing. */
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN))

    setPos({
      left,
      width,
      below: r.bottom + OFFSET,
      above: r.top - OFFSET,
      flip: r.bottom > window.innerHeight - ROOM,
    })
  }, [align, width])

  useEffect(() => {
    if (!shown) return
    const on = () => place()
    /* Capture phase: the scroller here is `main`, not the window. */
    window.addEventListener('scroll', on, true)
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on, true)
      window.removeEventListener('resize', on)
    }
  }, [shown, place])

  return { anchorRef, pos, show: place, hide: () => setPos(null) }
}

/** The portalled surface. `pointer-events-none`, so it can never swallow a
 *  click meant for what is underneath it. */
export function AnchoredCard({
  pos,
  className,
  children,
}: {
  pos: Anchor
  className?: string
  children: ReactNode
}) {
  const el = useRef<HTMLDivElement>(null)
  const [flip, setFlip] = useState(pos.flip)

  /* The anchor's rect cannot say whether the card fits, because the card's
   * height is not known until it exists — these run from one line to a
   * six-row table. So measure once mounted and flip if it actually overflows,
   * before the browser paints. */
  useLayoutEffect(() => {
    const node = el.current
    if (!node) return
    const r = node.getBoundingClientRect()
    if (!flip && r.bottom > window.innerHeight - MARGIN && pos.above - r.height > MARGIN) setFlip(true)
    else if (flip && r.top < MARGIN) setFlip(false)
  }, [flip, pos.above, pos.below])

  return createPortal(
    <div
      ref={el}
      role="tooltip"
      style={{
        position: 'fixed',
        left: pos.left,
        top: flip ? pos.above : pos.below,
        width: pos.width,
        transform: flip ? 'translateY(-100%)' : undefined,
        /* Never taller than the window, whichever way it opened. */
        maxHeight: (flip ? pos.above : window.innerHeight - pos.below) - MARGIN,
        overflow: 'auto',
        zIndex: 60,
      }}
      className={cn('pointer-events-none animate-fade-in', className)}
    >
      {children}
    </div>,
    document.body,
  )
}
