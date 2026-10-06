import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Plug, type LucideIcon } from 'lucide-react'
import { TONE, type Tone } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/cn'

/** A system a request may reach. `icon` on a `tone` tile stands in for its
 *  logo. */
export type ConnectorItem = { id: string; label: string; icon: LucideIcon; tone: Tone }

/** Tiles shown in the stack before the rest collapse into "+N". */
const STACK = 3

/**
 * The composer's connectors: the systems a request may reach, each switched
 * on or off. The plug always opens the menu; once anything is on, the
 * connected systems sit beside it as an overlapping stack of tiles, which
 * opens the same menu. §4.3 menu container geometry. It opens upward,
 * because the composer sits either mid-screen above content or pinned to the
 * bottom.
 */
export function ConnectorsMenu({
  items,
  on,
  onToggle,
  disabled,
}: {
  items: ConnectorItem[]
  on: string[]
  onToggle: (id: string) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const linked = items.filter((c) => on.includes(c.id))

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div ref={root} className="relative flex items-center">
      <button
        type="button"
        disabled={disabled}
        aria-label="Connectors"
        aria-expanded={open}
        title="Connectors"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-base',
          'focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:text-disabled disabled:hover:bg-transparent',
          open ? 'bg-neutral-100 text-default' : 'text-muted hover:bg-neutral-100 hover:text-default',
        )}
      >
        <Plug aria-hidden className="h-[18px] w-[18px]" />
      </button>

      {linked.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          aria-label={`Connected: ${linked.map((c) => c.label).join(', ')}`}
          title={linked.map((c) => c.label).join(', ')}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-9 items-center rounded-md px-1.5 transition-colors duration-base hover:bg-neutral-100 focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed"
        >
          {linked.slice(0, STACK).map((c, i) => (
            <Ringed key={c.id} first={i === 0}>
              <Tile item={c} />
            </Ringed>
          ))}
          {linked.length > STACK && (
            <Ringed first={false}>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-default bg-surface-sunken px-1 font-mono text-xs text-subtle">
                +{linked.length - STACK}
              </span>
            </Ringed>
          )}
        </button>
      )}

      {open && (
        <div
          role="group"
          aria-label="Connectors"
          className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border border-default bg-surface-card p-1 shadow-classic"
        >
          {items.map((c) => (
            <div key={c.id} className="flex h-10 items-center gap-2.5 rounded-sm px-2.5">
              <Tile item={c} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-default">{c.label}</span>
              <Switch checked={on.includes(c.id)} onChange={() => onToggle(c.id)} label={`Connect ${c.label}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Tile({ item }: { item: ConnectorItem }) {
  const Icon = item.icon
  return (
    <span aria-hidden className={cn('inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border', TONE[item.tone])}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  )
}

/** A card-coloured ring, so each overlapping tile reads as its own coin. */
function Ringed({ first, children }: { first: boolean; children: ReactNode }) {
  return <span className={cn('inline-flex rounded-full bg-surface-card p-0.5', !first && '-ml-2')}>{children}</span>
}
