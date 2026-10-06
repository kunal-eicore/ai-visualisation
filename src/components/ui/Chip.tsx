import { cn } from '@/lib/cn'

type ChipProps = {
  label: string
  /** `Type=Counter` appends a 25×20 count badge. */
  count?: number
  selected: boolean
  /** §4.6 `Disabled unselected` / `Disabled selected`. */
  disabled?: boolean
  onClick: () => void
}

/**
 * §4.6 Chip — 29px tall, radius 8, 1.5px border, padding 4/8, gap 8,
 * label Medium 14 (Semibold when a counter chip is selected).
 *
 * "Use Chips for filter bars, not Buttons." A selected chip is the canonical
 * "this filter is on" affordance.
 */
export function Chip({ label, count, selected, disabled, onClick }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-[29px] items-center gap-2 rounded-lg border-[1.5px] px-2 py-1 text-base transition-colors duration-base',
        'focus-visible:outline-none focus-visible:shadow-focus',
        // §6 — dedicated disabled tokens, never opacity.
        'disabled:cursor-not-allowed disabled:border-default disabled:bg-neutral-50',
        'disabled:text-disabled disabled:hover:border-default disabled:hover:bg-neutral-50',
        selected
          ? 'border-brand bg-brand-bg font-semibold text-brand-fg'
          : 'border-strong bg-surface-card font-medium text-default hover:border-focus-ring hover:bg-brand-50',
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'inline-flex h-5 min-w-[25px] items-center justify-center rounded-md px-2 py-0.5 font-mono text-sm font-semibold',
            selected ? 'bg-brand-200 text-brand-fg' : 'bg-neutral-100 text-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
