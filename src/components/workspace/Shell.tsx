import type { ReactNode } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { cn } from '@/lib/cn'

/**
 * The workbench shell — side panels and a canvas inside one surface.
 *
 * Every step is the same shape: rails on the outside, canvas in the middle.
 * The regions are not cards. They are one bordered surface split by 1px
 * hairlines (`gap-px` over a neutral ground), so the eye reads a single
 * workspace with divisions rather than a stack of floating cards. The
 * workspace fills the viewport under a slim step band — it is a tool surface,
 * not a page of panels. Anything that would otherwise become its own card — a
 * hint, a run bar, a palette — docks into a region's header or footer instead.
 */

export function Workspace({ cols, children }: { cols: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        /* Full-bleed: no radius, no outer border, no page padding. The rails
           run to the edges of the viewport the way an editor's do. */
        'grid min-h-0 flex-1 grid-cols-1 gap-px overflow-auto bg-neutral-200 xl:overflow-hidden',
        cols,
      )}
    >
      {children}
    </div>
  )
}

type RegionProps = {
  title: string
  icon?: ReactNode
  /** What this section is for. Lives in a tooltip, not on the surface. */
  info?: ReactNode
  /** Quiet text after the title — the place for a hint that used to be a Callout. */
  meta?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  /** The canvas sits on the sunken ground; rails sit on card. */
  sunken?: boolean
  /** Off for a region whose body is a full-bleed list or canvas. */
  pad?: boolean
  className?: string
  children: ReactNode
}

export function Region({
  title,
  icon,
  info,
  meta,
  actions,
  footer,
  sunken,
  pad = true,
  className,
  children,
}: RegionProps) {
  return (
    <section
      className={cn(
        'flex min-h-[340px] min-w-0 flex-col xl:min-h-0',
        sunken ? 'bg-surface-sunken' : 'bg-surface-card',
        className,
      )}
    >
      <header className="relative flex h-10 shrink-0 items-center gap-2 border-b border-default bg-surface-card px-3">
        <h3 className="inline-flex min-w-0 shrink items-center gap-1.5 text-sm font-semibold text-default">
          {icon}
          <span className="truncate">{title}</span>
        </h3>
        {info && <InfoTip label={title}>{info}</InfoTip>}
        {meta && <span className="min-w-0 truncate text-xs text-muted">{meta}</span>}
        {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
      </header>

      <div className={cn('min-h-0 flex-1 overflow-auto', pad && 'p-3')}>{children}</div>

      {footer && (
        <div className="shrink-0 border-t border-default bg-surface-card px-3 py-2">{footer}</div>
      )}
    </section>
  )
}

/** A rail row. Flat, hairline-separated, with a left marker for the selected
 *  one — the list idiom the workflow cards were doing badly. */
export function RailRow({
  selected,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  selected?: boolean
  onClick?: () => void
  onDoubleClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'relative flex w-full flex-col gap-1 border-b border-subtle px-3 py-2.5 pl-4 text-left transition-colors duration-base',
        'focus-visible:outline-none focus-visible:shadow-focus',
        selected ? 'bg-brand-50' : 'hover:bg-neutral-50',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute bottom-0 left-0 top-0 w-1',
          selected ? 'bg-brand-500' : 'bg-transparent',
        )}
      />
      {children}
    </button>
  )
}
