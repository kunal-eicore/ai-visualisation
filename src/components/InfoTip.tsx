import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { AnchoredCard, useAnchored, type Align } from '@/components/Anchored'

/**
 * The "i" that explains a section on demand.
 *
 * Not a §0.5 primitive — it is page furniture shared by the evaluation
 * routes, which is why it sits here rather than in `components/ui`. The
 * argument for it is subtraction: every line of standing help is a line
 * competing with the data it describes, so the explanation moves off the
 * surface and stays one hover (or one tab stop) away.
 *
 * The card is portalled rather than absolutely positioned. These tips sit
 * inside dense tables, and those tables sit in `overflow-x-auto` wrappers so
 * they can scroll sideways — which clips vertically too, and cut the tooltips
 * off on the first and last rows. See `Anchored.tsx`.
 *
 * Opens on hover and on keyboard focus, flips above the anchor when there is
 * no room below, and is `pointer-events-none` so it can never swallow a click
 * meant for what is underneath it.
 */
export function InfoTip({
  label,
  align = 'left',
  children,
}: {
  /** What the tooltip describes — read out as "About <label>". */
  label: string
  /** Flip to `right` when the icon sits near the right edge of its column. */
  align?: Align
  children: ReactNode
}) {
  const { anchorRef, pos, show, hide } = useAnchored({ align, width: 288 })

  return (
    <span
      ref={anchorRef}
      className="relative flex shrink-0"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <button
        type="button"
        aria-label={`About ${label}`}
        className="rounded-md p-0.5 text-disabled transition-colors duration-base hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Info aria-hidden className="h-3.5 w-3.5" />
      </button>
      {pos && (
        <AnchoredCard pos={pos}>
          <span className="block rounded-md bg-neutral-900 px-2.5 py-2 text-xs leading-relaxed text-inverse shadow-classic">
            {children}
          </span>
        </AnchoredCard>
      )}
    </span>
  )
}
