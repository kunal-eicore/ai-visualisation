import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** §4.8 — three card variants. Hover lift on an interactive card goes
 *  `surface` to `classic`. `ghost` groups without a visible container. */
type Variant = 'surface' | 'classic' | 'ghost'

const VARIANT: Record<Variant, string> = {
  surface: 'border border-default bg-surface-card shadow-card',
  classic: 'border border-default bg-surface-card shadow-classic',
  ghost:   '',
}

type CardProps = {
  variant?: Variant
  /** Drop the default padding when the card hosts its own header/table bands. */
  bare?: boolean
  className?: string
  children: ReactNode
}

/** §4.8 Card — radius **8** (not 16), padding 16, gap 12. */
export function Card({ variant = 'surface', bare = false, className, children }: CardProps) {
  return (
    <div className={cn('rounded-lg', VARIANT[variant], !bare && 'flex flex-col gap-3 p-4', className)}>
      {children}
    </div>
  )
}

/** §5 / §4.8 — the section title + one-line subtitle every card opens with. */
export function CardHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-md font-semibold text-default">{title}</h2>
      {subtitle && <p className="text-sm text-subtle">{subtitle}</p>}
    </div>
  )
}
