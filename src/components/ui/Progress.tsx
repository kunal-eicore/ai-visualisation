import { cn } from '@/lib/cn'

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info'
type Size = 'sm' | 'md' | 'lg'

const FILL: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger:  'bg-danger-500',
  info:    'bg-info-500',
}
/** §4.13 heights — 4 / 6 / 8. */
const HEIGHT: Record<Size, string> = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' }

type ProgressProps = {
  value: number
  tone?: Tone
  size?: Size
  /** Labelled form: a header row above the track (§4.13). */
  label?: string
}

/**
 * §4.13 Progress Bar — track radius-full on `neutral/200`, fill radius-full.
 * The labelled form stacks a header row (label + percentage) above the track.
 *
 * Note: §4.13 specifies the percentage in `text/muted`, but §2.2 forbids muted
 * at body size (it fails AA below ~16px) and the §8 checklist enforces that —
 * so this uses `text/subtle`. Deliberate deviation, accessibility wins.
 */
export function Progress({ value, tone = 'primary', size = 'md', label }: ProgressProps) {
  const pct = Math.min(Math.max(value, 0), 100)
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-base font-medium text-default">{label}</span>
          <span className="font-mono text-base font-medium text-subtle">{pct}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn('w-full rounded-full bg-neutral-200', HEIGHT[size])}
      >
        {/* A 2% floor keeps a zero-value bar visible as an empty state. */}
        <div className={cn('rounded-full', HEIGHT[size], FILL[tone])} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  )
}
