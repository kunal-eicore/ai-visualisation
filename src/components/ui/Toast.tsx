import { Loader2, CircleCheck, Info } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tone = 'success' | 'info' | 'loading'

const TONE: Record<Tone, string> = {
  success: 'border-success bg-success-bg text-success-fg',
  info:    'border-info bg-info-bg text-info-fg',
  loading: 'border-info bg-info-bg text-info-fg',
}

type ToastProps = {
  title: string
  description?: string
  tone?: Tone
  onDismiss?: () => void
}

/**
 * §4.18 Toast — pinned top-right, `role="status"`, fade-up entrance,
 * radius 12 + popover shadow. Auto-dismiss is the caller's job (a timer
 * flipping visibility), which is why `onDismiss` is optional here.
 */
export function Toast({ title, description, tone = 'success', onDismiss }: ToastProps) {
  const Icon = tone === 'loading' ? Loader2 : tone === 'info' ? Info : CircleCheck
  return (
    <div
      role="status"
      onClick={onDismiss}
      className={cn(
        'fixed right-6 top-20 z-30 flex max-w-sm animate-fade-up items-start gap-3 rounded-xl border px-4 py-3 shadow-popover',
        TONE[tone],
      )}
    >
      <Icon aria-hidden className={cn('mt-0.5 h-4 w-4 shrink-0', tone === 'loading' && 'animate-spin')} />
      <div>
        <p className="text-base font-medium text-default">{title}</p>
        {description && <p className="mt-0.5 text-sm text-subtle">{description}</p>}
      </div>
    </div>
  )
}
