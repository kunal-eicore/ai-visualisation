import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Logo } from './Logo'
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from './navConfig'

type SidebarProps = {
  /** Pinned collapsed state, toggled by the panel button. */
  collapsed: boolean
  onToggleCollapsed: () => void
}

/**
 * §5 Sidebar — the flagship collapsible pattern. `w-60` expanded,
 * `w-[68px]` collapsed. **Pin + hover-to-peek:** a pinned-collapsed
 * sidebar expands on hover; pinned-open ignores hover. Icon-only density
 * by default, zero-click peek, explicit pin for users who want it open.
 */
export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const [hovered, setHovered] = useState(false)
  const effectiveCollapsed = collapsed && !hovered

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-default bg-surface-card transition-[width] duration-base',
        effectiveCollapsed ? 'w-[68px]' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex h-16 items-center border-b border-default px-3',
          effectiveCollapsed ? 'justify-center' : 'justify-between',
        )}
      >
        <Logo markOnly={effectiveCollapsed} className={effectiveCollapsed ? '' : 'pl-1'} />
        {!effectiveCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Keep sidebar expanded' : 'Collapse sidebar'}
            className="rounded-md p-1.5 text-muted transition-colors duration-base hover:bg-surface-sunken hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
          >
            {collapsed ? <PanelLeftOpen aria-hidden className="h-5 w-5" /> : <PanelLeftClose aria-hidden className="h-5 w-5" />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-1">
          {PRIMARY_NAV.map((item) => (
            <NavGroup key={item.label} item={item} collapsed={effectiveCollapsed} />
          ))}
        </ul>

        {SECONDARY_NAV.length > 0 && (
          <>
            <div className="my-3 border-t border-default" />
            <ul className="space-y-1">
              {SECONDARY_NAV.map((item) => (
                <NavGroup key={item.label} item={item} collapsed={effectiveCollapsed} />
              ))}
            </ul>
          </>
        )}
      </nav>

      <SidebarFooter collapsed={effectiveCollapsed} />
    </aside>
  )
}

function NavGroup({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation()
  const hasChildren = !!item.children?.length
  const groupActive = location.pathname.startsWith(item.to)
  const [open, setOpen] = useState(groupActive)
  const Icon = item.icon

  // Collapsed: a single icon link, no sub-items.
  if (collapsed) {
    return (
      <li>
        <NavLink to={item.to} title={item.label} className={({ isActive }) => rowClass(isActive, true)}>
          <Icon aria-hidden className="h-5 w-5 shrink-0" />
        </NavLink>
      </li>
    )
  }

  if (!hasChildren) {
    return (
      <li>
        <NavLink to={item.to} className={({ isActive }) => rowClass(isActive)}>
          <Icon aria-hidden className="h-5 w-5 shrink-0" />
          <span className="truncate">{item.label}</span>
        </NavLink>
      </li>
    )
  }

  return (
    <li>
      <button type="button" onClick={() => setOpen((o) => !o)} className={cn(rowClass(groupActive), 'w-full')}>
        <Icon aria-hidden className="h-5 w-5 shrink-0" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown aria-hidden className={cn('h-4 w-4 transition-transform duration-base', open && 'rotate-180')} />
      </button>

      {/* §5 — nested children indent to pl-9 with a 6px dot marker instead of an icon. */}
      {open && (
        <ul className="mt-1 space-y-1 pl-9">
          {item.children!.map((child) => (
            <li key={child.label}>
              <NavLink
                to={child.to}
                end={!child.deep}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-base focus-visible:outline-none focus-visible:shadow-focus',
                    isActive ? 'font-medium text-brand' : 'text-muted hover:text-default',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', isActive ? 'bg-primary' : 'bg-neutral-300')} />
                    <span className="truncate">{child.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** §6 — brand tint + brand text is the universal selected/active treatment. */
function rowClass(isActive: boolean, center = false) {
  return cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-base',
    'focus-visible:outline-none focus-visible:shadow-focus',
    center && 'justify-center px-0',
    isActive ? 'bg-brand-bg text-brand' : 'text-default/80 hover:bg-surface-sunken hover:text-default',
  )
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  // §4.12 — the avatar is a tone-tinted circle with a 1px border, never a bare fill.
  const avatar = (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-300 bg-brand-50 text-xs font-bold text-brand">
      AU
    </span>
  )

  if (collapsed) {
    return <div className="flex h-16 items-center justify-center border-t border-default px-3">{avatar}</div>
  }

  return (
    <div className="flex h-16 items-center gap-3 border-t border-default px-4">
      {avatar}
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-default">Admin User</p>
        <button
          type="button"
          className="rounded-sm text-xs text-muted transition-colors duration-base hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
