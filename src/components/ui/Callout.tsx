import { Info, TriangleAlert, CircleCheck, CircleX } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** §4.9 tones — a different recipe from the Badge triple: -50 fill,
 *  -200 border, -700/-800 text. */
type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

const TONE: Record<Tone, string> = {
  info:    'bg-info-50 border-info-200 text-info-700',
  success: 'bg-success-50 border-success-200 text-success-700',
  warning: 'bg-warning-50 border-warning-200 text-warning-700',
  danger:  'bg-danger-50 border-danger-500 text-danger-700',
  neutral: 'bg-neutral-50 border-neutral-200 text-neutral-700',
}

const ICON: Record<Tone, typeof Info> = {
  info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleX, neutral: Info,
}

/**
 * §4.9 Callout — radius 8, padding 8/12, gap 8, 16px leading icon, text
 * Regular 13. The icon is optional; **the border is not** — a tinted fill
 * with no border is not a Callout.
 */
export function Callout({
  tone = 'info',
  showIcon = true,
  children,
}: {
  tone?: Tone
  showIcon?: boolean
  children: ReactNode
}) {
  const Icon = ICON[tone]
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-sm', TONE[tone])}>
      {showIcon && <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{children}</span>
    </div>
  )
}
