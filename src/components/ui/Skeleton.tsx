import { cn } from '@/lib/cn'

/**
 * The placeholder a value holds while it is being recomputed.
 *
 * A shimmer rather than a spinner, and sized to the value it stands in for:
 * the point is that the shape of the row, the cell or the field survives the
 * wait, so the eye stays where it was reading instead of being sent back to
 * find its place afterwards. A spinner in a table cell collapses the column
 * width; a spinner in a form field replaces the control with a different
 * control.
 *
 * It is brand-tinted, not grey. Grey is what an empty field looks like
 * anyway; the tint is what says a machine is working on this one — which is
 * the whole message when the request came from the assistant.
 *
 * `aria-hidden` throughout: the placeholder carries no information a screen
 * reader can use, and the surface that owns it is responsible for announcing
 * that work is in flight (`aria-busy` on the region, a live status in the
 * transcript). Announcing the shimmer itself would read out "image" per cell
 * across a table.
 */
export function Skeleton({
  w,
  h = 12,
  className,
}: {
  /** Width of the placeholder. A number is px; a string is any CSS length,
   *  which is how a form field asks for a full-width bar. */
  w?: number | string
  /** Height in px. The default matches a 14px text line's ink. */
  h?: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      style={{ width: w, height: h }}
      className={cn(
        'relative inline-block min-w-[28px] animate-skeleton overflow-hidden rounded-sm bg-brand-100 align-middle',
        className,
      )}
    >
      <span className="absolute inset-0 w-1/2 animate-shimmer bg-gradient-to-r from-brand-100 via-brand-400 to-brand-100" />
    </span>
  )
}
