import { Bot } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * The way back to a closed chat dock: a tab tucked against the right edge,
 * not a button floating over the content. Shared by the group health quote
 * and the underwriting queue so the two cannot drift.
 *
 * It behaves like an edge, not like a control in the page — it arrives after
 * the screen has settled, stays welded to the right edge, and grows out from
 * it under the pointer. The caller sets the vertical position (`className`),
 * since what it must stay clear of differs per screen. Opening it takes room
 * from the canvas rather than covering it, because the canvas is what the
 * panel is FOR: a chat you have to close to see what it just changed is a
 * chat you stop using.
 */
export function ChatEdgeTab({
  label,
  onOpen,
  className,
}: {
  label: string
  onOpen: () => void
  className?: string
}) {
  return (
    <div className={cn('absolute right-0 z-10', className)}>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          /* It GROWS to the left on hover rather than sliding left. A
             translate lifted the whole tab off the edge and exposed its right
             side, which has no border and square corners because that side
             is meant to be the screen. Growing keeps that edge welded where
             it belongs and still reads as the tab coming out to meet the
             pointer. */
          'group relative flex h-14 w-11 items-center justify-center',
          'rounded-l-xl border border-r-0 border-default bg-surface-card shadow-panel',
          'animate-tab-in transition-[width,border-color,box-shadow] duration-base motion-reduce:animate-none',
          'hover:w-[54px] hover:border-brand-300',
          'hover:shadow-[0_0_0_1px_theme(colors.brand.300),-6px_0_24px_-6px_theme(colors.brand.400)]',
          'focus-visible:outline-none focus-visible:shadow-focus',
        )}
      >
        <Bot aria-hidden className="h-5 w-5 text-brand" />
        <span className="sr-only">{label}</span>
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 translate-x-1',
            'whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-inverse shadow-card',
            'opacity-0 transition-all duration-base group-hover:translate-x-0 group-hover:opacity-100',
          )}
        >
          {label}
        </span>
      </button>
    </div>
  )
}
