import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** DESIGN.md §4.11 — the seven status states. */
export type Tone = 'brand' | 'neutral' | 'success' | 'info' | 'warning' | 'alert' | 'danger'

/* §0.6 — every status surface is a bg + border + fg triple, never a bare
 * tinted fill. This map is the whole status palette. */
export const TONE: Record<Tone, string> = {
  brand:   'bg-brand-bg border-brand text-brand-fg',
  neutral: 'bg-neutral-bg border-neutral text-neutral-fg',
  success: 'bg-success-bg border-success text-success-fg',
  info:    'bg-info-bg border-info text-info-fg',
  warning: 'bg-warning-bg border-warning text-warning-fg',
  alert:   'bg-alert-bg border-alert text-alert-fg',
  danger:  'bg-danger-bg border-danger text-danger-fg',
}

type BadgeProps = {
  tone?: Tone
  /** 6px leading dot in the tone's /fg. */
  dot?: boolean
  /** 12px leading icon slot. */
  icon?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * §4.11 — ONE primitive covers every status surface in the product.
 * 20px tall, radius 6, padding 1/8, gap 4, label Regular 12 in Geist Mono
 * (status text reads as a fixed-width state token, not prose).
 *
 * Do not build a second status chip. Status Bar, Confidence Pill, Trend
 * Indicator and Auto-Filled Badge are all this component with different
 * props — compose before you create.
 */
export function Badge({ tone = 'neutral', dot, icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        /* 20px is a floor, not a height: a label longer than its space wraps
           and the pill grows to hold it, never wider than its container.
           Dot and icon sit against the first line. */
        'inline-flex min-h-5 shrink-0 items-start gap-1 rounded-md border px-2 py-px font-mono text-xs font-normal leading-[16px]',
        TONE[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {icon && <span className="flex h-4 shrink-0 items-center">{icon}</span>}
      <span className="min-w-0 break-words">{children}</span>
    </span>
  )
}
