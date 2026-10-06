import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * A modal over its nearest positioned ancestor. Lifted from group health's
 * parts so the intent screen's New chat confirmation runs on the same one.
 */
export function Dialog({
  title,
  onClose,
  footer,
  width = 'max-w-[620px]',
  children,
}: {
  title: string
  onClose: () => void
  footer?: ReactNode
  width?: string
  children: ReactNode
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center overflow-auto bg-neutral-900/30 p-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('w-full rounded-lg border border-default bg-surface-card shadow-panel', width)}
      >
        <header className="flex items-center gap-2 border-b border-default px-5 py-3.5">
          <h2 className="text-md font-semibold text-default">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </header>
        <div className="flex flex-col gap-4 p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-default px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
