import { cn } from '@/lib/cn'

/**
 * An on/off switch. Lifted out of the harness's model rows so the composer's
 * connectors menu runs on the same control.
 */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  /** Accessible name — what is being switched. */
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-base',
        'focus-visible:outline-none focus-visible:shadow-focus',
        checked ? 'bg-brand-500' : 'bg-neutral-300',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-surface-card shadow-card transition-all duration-base',
          checked ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  )
}
