import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export type MenuItem = {
  key: string
  label: string
  disabled?: boolean
  /** A short state on the right of the item, in mono ("Off", "Done"). */
  meta?: string
  /** Set on an on/off item: it draws a switch, and choosing it flips the
   *  switch without closing the menu. */
  checked?: boolean
}

/**
 * §4.3 menu container — surface card, radius 8, padding 4, items radius 4
 * (8 − 4, hard rule 9), selected item `brand/bg` + `text/brand`.
 *
 * Portalled and fixed-positioned for the same reason `Anchored.tsx` is: the
 * row menus live inside the table's `overflow-x-auto` wrapper, which clips on
 * both axes.
 */
export function Menu({
  trigger,
  items,
  value,
  onSelect,
  align = 'left',
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  items: MenuItem[]
  value?: string | null
  onSelect: (key: string) => void
  align?: 'left' | 'right'
  label: string
}) {
  const anchor = useRef<HTMLSpanElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchor.current) return
    const place = () => {
      const r = anchor.current!.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: align === 'left' ? r.left : r.right })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (!anchor.current?.contains(t) && !card.current?.contains(t)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <>
      <span ref={anchor} className="inline-flex">
        {trigger({ open, toggle: () => setOpen((o) => !o) })}
      </span>
      {open &&
        pos &&
        createPortal(
          <div
            ref={card}
            role="menu"
            aria-label={label}
            style={{ top: pos.top, left: pos.left }}
            className={cn(
              'fixed z-50 min-w-[168px] rounded-lg border border-default bg-surface-card p-1 shadow-classic',
              align === 'right' && '-translate-x-full',
            )}
          >
            {items.map((item) => {
              const selected = value === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                  aria-checked={item.checked}
                  disabled={item.disabled}
                  onClick={() => {
                    onSelect(item.key)
                    if (item.checked === undefined) setOpen(false)
                  }}
                  className={cn(
                    'flex h-8 w-full items-center gap-2 rounded-sm px-2.5 text-left text-sm font-medium transition-colors duration-base',
                    'focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:text-disabled',
                    selected ? 'bg-brand-bg text-brand-fg' : 'text-default hover:bg-surface-sunken disabled:hover:bg-transparent',
                  )}
                >
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.meta && <span className="shrink-0 font-mono text-xs font-normal text-muted">{item.meta}</span>}
                  {item.checked !== undefined && <SwitchMark on={item.checked} disabled={item.disabled} />}
                  {selected && <Check aria-hidden className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}

/** The look of `Switch`, drawn inside a menu item: the item is the control,
 *  so the switch itself must not be a second button. */
function SwitchMark({ on, disabled }: { on: boolean; disabled?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-base',
        disabled ? 'bg-neutral-200' : on ? 'bg-brand-500' : 'bg-neutral-300',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-surface-card shadow-card transition-all duration-base',
          on ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </span>
  )
}
