import { useEffect, useRef, type ReactNode } from 'react'
import { ChatEdgeTab } from './ChatEdgeTab'

/**
 * Shared geometry, so every docked chat opens to the same width and pace.
 *
 * The panel is a flex sibling of the canvas, so the thing that has to animate
 * is the ROOM, not the panel. Sliding the panel in with a keyframe looked
 * like nothing: the row reserved its 380px on the first frame, the canvas
 * snapped over, and the slide then happened inside a gap that was already
 * open. Transitioning the width instead means the canvas gives the room up
 * progressively and the panel is revealed as it arrives — which is what a
 * slide-out reads as.
 */
export const CHAT_WIDTH = 440
const CHAT_MS = 140

/**
 * Where a `ChatPanel` docks: a right-hand column that animates its width,
 * plus the edge tab that reopens it.
 *
 * Render it as the last child of a `relative flex` row; it takes room from
 * the content beside it rather than covering it. The panel inside is given a
 * fixed width because the host animates ITS width and clips it — a panel that
 * reflowed on the way out would reflow its whole conversation with it.
 */
export function ChatDockHost({
  open,
  onOpen,
  tab,
  children,
}: {
  open: boolean
  onOpen: () => void
  /** The edge tab's label, and its vertical position (e.g. `bottom-6`). */
  tab: { label: string; className?: string }
  children: ReactNode
}) {
  const host = useRef<HTMLDivElement>(null)

  // The closed panel stays mounted so its width can animate, so it also has
  // to stay out of the tab order and off the accessibility tree.
  useEffect(() => {
    if (host.current) host.current.inert = !open
  }, [open])

  return (
    <>
      <div
        ref={host}
        style={{ width: open ? CHAT_WIDTH : 0, transitionDuration: `${CHAT_MS}ms` }}
        className="h-full shrink-0 overflow-hidden transition-[width] ease-out motion-reduce:transition-none"
      >
        {children}
      </div>
      {!open && <ChatEdgeTab label={tab.label} onOpen={onOpen} className={tab.className} />}
    </>
  )
}
