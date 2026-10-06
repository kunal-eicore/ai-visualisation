import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export type MenuItem = { key: string; label: string; disabled?: boolean }

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
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    onSelect(item.key)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex h-8 w-full items-center gap-2 rounded-sm px-2.5 text-left text-sm font-medium transition-colors duration-base',
                    'focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:text-disabled',
                    selected ? 'bg-brand-bg text-brand-fg' : 'text-default hover:bg-surface-sunken',
                  )}
                >
                  <span className="flex-1 truncate">{item.label}</span>
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
