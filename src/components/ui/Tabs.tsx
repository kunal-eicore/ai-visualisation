import { cn } from '@/lib/cn'

type TabsProps<T extends string> = {
  options: readonly T[]
  value: T
  onChange: (next: T) => void
  'aria-label': string
  /** §4.7 `Type=Counter` — a 25×20 count badge after the label. */
  counts?: Partial<Record<T, number>>
}

/**
 * §4.7 Tab — an UNDERLINE tab, not a segmented pill. 41px tall, padding
 * 12/16, gap 8, label Semibold 14. Active takes `text/default` plus a
 * `primary` underline; hover previews it with `border/strong`.
 *
 * Generic over the option union so `onChange` stays typed.
 */
export function Tabs<T extends string>({ options, value, onChange, 'aria-label': ariaLabel, counts }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex items-center gap-2">
      {options.map((opt) => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt)}
            className={cn(
              'inline-flex h-[41px] items-center gap-2 border-b-2 px-4 py-3 text-base font-semibold transition-colors duration-base',
              'focus-visible:outline-none focus-visible:shadow-focus',
              active
                ? 'border-b-primary text-default'
                : 'border-b-transparent text-muted hover:border-b-strong hover:text-default',
            )}
          >
            {opt}
            {counts?.[opt] !== undefined && (
              <span
                className={cn(
                  'inline-flex h-5 min-w-[25px] items-center justify-center rounded-md px-2 font-mono text-sm font-semibold',
                  active ? 'bg-brand-bg text-brand-fg' : 'bg-neutral-100 text-muted',
                )}
              >
                {counts[opt]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
