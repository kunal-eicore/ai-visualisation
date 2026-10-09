import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * The house side panel. Geometry follows the Company profile edit panel
 * (Figma giNrgEoSsSwLA1K5Aob8JK, 22:1362): 720 wide over a scrim, a bordered
 * header with a 32px neutral close, titled sections in the body, and a
 * bordered footer with the meta on the left and the actions on the right.
 *
 * Lifted out of the run's case drawer so the station panel opens on the same
 * shell. Escape closes it; focus goes to the close button on open and back to
 * whatever opened it on close.
 */
export function SidePanel({
  title,
  eyebrow,
  closeLabel,
  onClose,
  footer,
  bodyRef,
  marker,
  children,
}: {
  title: ReactNode
  /** Small mono line above the title — an ID, a role. */
  eyebrow?: ReactNode
  closeLabel: string
  onClose: () => void
  footer?: ReactNode
  bodyRef?: RefObject<HTMLDivElement>
  /** A data attribute the panel carries, so other layers can tell it is open
   *  (the attention overlay checks for the case drawer before taking Escape). */
  marker?: string
  children: ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const selector = marker ? `[${marker}]` : '[data-side-panel]'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    if (!openerRef.current) openerRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      // After the frame, and only if the panel is really gone (StrictMode
      // runs this cleanup on its development double-mount too).
      setTimeout(() => {
        if (!document.querySelector(selector)) openerRef.current?.focus?.()
      }, 0)
    }
  }, [onClose, selector])

  const attrs = { [marker ?? 'data-side-panel']: '' }

  return createPortal(
    <>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="fixed inset-0 z-40 animate-fade-in cursor-default bg-neutral-900/40"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        {...attrs}
        className="fixed inset-y-0 right-0 z-50 flex w-[720px] max-w-full animate-sheet-in flex-col border-l border-default bg-surface-card shadow-panel"
      >
        <header className="flex items-center gap-3 border-b border-default py-[18px] pl-6 pr-5">
          <div className="min-w-0">
            {eyebrow && <p className="font-mono text-xs text-subtle">{eyebrow}</p>}
            <h2 className="truncate text-md font-semibold text-default">{title}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-btn-neutral bg-btn-neutral text-default transition-colors duration-base hover:border-btn-neutral-hover hover:bg-btn-neutral-hover focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </header>

        <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && <footer className="flex items-center gap-2.5 border-t border-default px-6 py-3.5">{footer}</footer>}
      </aside>
    </>,
    document.body,
  )
}

export function PanelSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-default">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}
