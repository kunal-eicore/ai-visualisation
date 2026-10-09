import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  ArrowRight,
  ChevronDown,
  CornerRightUp,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Inbox,
  MoreVertical,
  Search,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { AnchoredCard, useAnchored } from '@/components/Anchored'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Tabs } from '@/components/ui/Tabs'
import { FIELD } from '@/components/workspace/field'
import { cn } from '@/lib/cn'
import { Menu, type MenuItem } from './Menu'
import {
  PRIORITIES,
  PRIORITY_TONE,
  ROWS,
  STATUS_ATTENTION,
  STATUS_TABS,
  STATUS_TONE,
  formatDate,
  formatInr,
  formatTat,
  isAssignable,
  prettifyStatus,
  type Priority,
  type QueueRow,
} from './data'
import { SEGMENTS, scopeRows, type Queue, type Sort, type SortKey } from './state'

const PAGE_SIZES = [10, 25, 50]

/**
 * What Hybrid adds to the queue, configured by the parent so Manual stays the
 * table it was. A select box in the ID cell, the agent's state under the
 * status badge, extra items in the row menu, and the agent controls at the
 * right of the toolbar. No new columns.
 */
export type QueueAgentSlot = {
  selected: ReadonlySet<string>
  onSelect: (ids: string[], on: boolean) => void
  selectable: (row: QueueRow) => boolean
  status: (row: QueueRow) => ReactNode
  /** Items placed above Take / Reassign in the row menu. */
  menu: (row: QueueRow) => MenuItem[]
  onMenu: (row: QueueRow, key: string) => void
  toolbar: ReactNode
}

/**
 * The underwriting queue, rebuilt from onebuzz's `UnderwritingQueueDefault`.
 *
 * Same content as the reference view — the four counts, the segment switch,
 * the status filters, search, priority and plan, the nine onebuzz columns
 * under their onebuzz names, pagination, and Review / Take / Reassign — laid
 * out to be read rather than scanned around:
 *
 * - The counts are one strip of four figures instead of four floating tiles,
 *   and lose the hardcoded captions ("+12.5% vs yesterday") that no data
 *   backed.
 * - Filters sit in two bands: status, then search, priority and plan. The
 *   segment is a scope, not a filter, so it is the card's tab strip.
 * - The ownership chips and assignee badge are left out: onebuzz renders them
 *   only for the underwriter role, and the reference view does not show them.
 *   Cases assigned to you carry a small mark by the ID instead, so a Take or
 *   Reassign from the assistant leaves a trace in the table.
 * - Status tones split by who the case waits on instead of all being amber.
 * - A pending row's missing premium reads "—", not onebuzz's "₹0.00/yr".
 *
 * Review and the row menu's Take / Reassign are not wired: this is the list
 * screen only. The assistant (`QueueChat`) can assign, through `useQueue`.
 */
export function UnderwritingQueue({
  q,
  agent,
  headerAction,
}: {
  q: Queue
  agent?: QueueAgentSlot
  /** Sits beside Export. */
  headerAction?: ReactNode
}) {
  const { view, setView, filtered, page, setPage, pageSize, setPageSize, clear } = q
  const { segment, statusTab, search, priority, plan, sort } = view

  // Counts come from the whole list, as in onebuzz; the chip counts are
  // scoped to the segment.
  const kpis = useMemo(
    () => [
      { label: 'Pending review', value: ROWS.filter(STATUS_TABS[1].match).length, tone: 'text-warning-fg' },
      { label: 'Urgent today', value: ROWS.filter((r) => r.priority === 'High').length, tone: 'text-danger-fg' },
      { label: 'Awaiting response', value: ROWS.filter((r) => r.status === 'counter_offered').length, tone: 'text-info-fg' },
      { label: 'Resolved today', value: ROWS.filter(STATUS_TABS[5].match).length, tone: 'text-success-fg' },
    ],
    [],
  )

  const scoped = useMemo(() => scopeRows(q.rows, segment), [q.rows, segment])

  const plans = useMemo(() => [...new Set(ROWS.map((r) => r.plan).filter(Boolean) as string[])].sort(), [])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pages)
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize)

  const anyFilter = !!search || !!priority || !!plan || statusTab !== 'all' || segment !== 'All'

  const onSort = (key: SortKey) =>
    setView({ sort: sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' } })

  return (
    <div className="flex flex-col gap-5 px-8 py-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-default">Underwriting queue</h1>
          <p className="mt-1.5 text-sm text-subtle">Aggregated pending reviews · your queue</p>
        </div>
        <div className="flex items-center gap-3">
          {headerAction}
          <Button size="sm" variant="neutral" icon={<Download aria-hidden className="h-4 w-4" />}>
            Export
          </Button>
        </div>
      </header>

      <Card bare className="grid grid-cols-2 overflow-hidden lg:grid-cols-4">
        {kpis.map((k, n) => (
          <div
            key={k.label}
            className={cn(
              'flex flex-col gap-1 px-5 py-4',
              n > 0 && 'lg:border-l lg:border-subtle',
              n % 2 === 1 && 'border-l border-subtle',
              n >= 2 && 'border-t border-subtle lg:border-t-0',
            )}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">{k.label}</span>
            <span className={cn('font-mono text-3xl font-semibold tabular-nums', k.tone)}>{k.value}</span>
          </div>
        ))}
      </Card>

      <Card bare className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-default px-4">
          <h2 className="mr-2 text-md font-semibold text-default">All tasks</h2>
          <Tabs
            options={SEGMENTS}
            value={segment}
            onChange={(v) => setView({ segment: v })}
            aria-label="Segment"
            counts={{
              All: ROWS.length,
              Retail: ROWS.filter((r) => r.segment === 'retail').length,
              Group: ROWS.filter((r) => r.segment === 'group').length,
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-subtle px-4 py-3">
          {STATUS_TABS.map((t) => (
            <Chip
              key={t.key}
              label={t.label}
              count={scoped.filter(t.match).length}
              selected={statusTab === t.key}
              onClick={() => setView({ statusTab: t.key })}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
          <label className="relative w-[320px] max-w-full">
            <span className="sr-only">Search</span>
            <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setView({ search: e.target.value })}
              placeholder="Search quotation ID or client"
              className={cn(FIELD, 'h-8 rounded-lg py-0 pl-8')}
            />
          </label>
          <FilterMenu
            label="Priority"
            value={priority}
            options={PRIORITIES}
            onChange={(v) => setView({ priority: v as Priority | null })}
          />
          <FilterMenu label="Plan" value={plan} options={plans} onChange={(v) => setView({ plan: v })} />
          {anyFilter && (
            <Button size="sm" variant="text" icon={<X aria-hidden className="h-4 w-4" />} onClick={clear}>
              Clear filters
            </Button>
          )}
          <div className="ml-auto flex items-center gap-3">
            {agent && agent.selected.size > 0 ? (
              <span className="flex items-center gap-1">
                <span className="font-mono text-xs text-default">{agent.selected.size} selected</span>
                <Button size="sm" variant="text" onClick={() => agent.onSelect([...agent.selected], false)}>
                  Clear
                </Button>
              </span>
            ) : (
              <span className="font-mono text-xs text-subtle">
                {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
              </span>
            )}
            {agent && (
              <>
                <span aria-hidden className="h-5 w-px bg-neutral-200" />
                {agent.toolbar}
              </>
            )}
          </div>
        </div>

        {/* `relative` keeps the header's sr-only label inside the scroll box —
            otherwise it positions against <main> and widens the page. */}
        <div className="relative overflow-x-auto">
          {/* Natural width, never squeezed: below it the card scrolls sideways
              rather than wrapping status badges onto two lines. */}
          {/* Hybrid adds a select box; 2px off every cell's side pays for
              it, so the table still fits at 1440. */}
          <table className={cn('w-max min-w-full border-collapse text-left', agent && '[&_td]:px-2.5 [&_th]:px-2.5')}>
            <thead>
              <tr className="border-y border-default">
                <Th sortKey="quotationNo" sort={sort} onSort={onSort} lead={agent && <SelectAll agent={agent} rows={visible} />}>
                  Quotation ID
                </Th>
                <Th sortKey="clientName" sort={sort} onSort={onSort}>Client</Th>
                <Th sortKey="plan" sort={sort} onSort={onSort}>Product / Plan</Th>
                <Th sortKey="premium" sort={sort} onSort={onSort} right>SI / Premium</Th>
                <Th sortKey="createdAt" sort={sort} onSort={onSort}>Created At</Th>
                <Th sortKey="tat" sort={sort} onSort={onSort}>TAT</Th>
                <Th sortKey="priority" sort={sort} onSort={onSort}>Priority</Th>
                <Th sortKey="status" sort={sort} onSort={onSort}>Status</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <Row key={r.id} row={r} flash={q.flashId === r.id} agent={agent} />
              ))}
            </tbody>
          </table>

          {visible.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-300 bg-brand-50 text-brand">
                <Inbox aria-hidden className="h-5 w-5" />
              </span>
              <p className="text-md font-medium text-default">No cases match these filters</p>
              <Button size="sm" variant="outline" onClick={clear}>
                Clear filters
              </Button>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-4 border-t border-default px-4 py-2.5">
          <span className="font-mono text-xs text-subtle">
            {filtered.length === 0
              ? 'Showing 0 of 0'
              : `Showing ${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, filtered.length)} of ${filtered.length}`}
          </span>
          <span className="flex items-center gap-2 text-xs text-subtle">
            Rows
            <Menu
              label="Rows per page"
              value={String(pageSize)}
              items={PAGE_SIZES.map((n) => ({ key: String(n), label: String(n) }))}
              onSelect={(k) => setPageSize(Number(k))}
              trigger={({ open, toggle }) => (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={toggle}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-strong bg-surface-card px-2 font-mono text-xs text-default focus-visible:outline-none focus-visible:shadow-focus"
                >
                  {pageSize}
                  <ChevronDown aria-hidden className="h-3.5 w-3.5 text-muted" />
                </button>
              )}
            />
          </span>
          <nav aria-label="Pagination" className="ml-auto flex items-center gap-1">
            <PageButton aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}>
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </PageButton>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <PageButton key={p} active={p === current} aria-label={`Page ${p}`} onClick={() => setPage(p)}>
                {p}
              </PageButton>
            ))}
            <PageButton aria-label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)}>
              <ChevronRight aria-hidden className="h-4 w-4" />
            </PageButton>
          </nav>
        </footer>
      </Card>
    </div>
  )
}

// ------------------------------------------------------------- toolbar

/** A filter dropdown, drawn with the same FIELD recipe as the search box so
 *  the toolbar reads as one row of inputs. */
function FilterMenu({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | null
  options: readonly string[]
  onChange: (v: string | null) => void
}) {
  const any = `Any ${label.toLowerCase()}`
  return (
    <Menu
      label={label}
      value={value ?? 'any'}
      items={[{ key: 'any', label: any }, ...options.map((o) => ({ key: o, label: o }))]}
      onSelect={(k) => onChange(k === 'any' ? null : k)}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
          className={cn(
            // cn() doesn't merge, so FIELD's w-full is dropped rather than overridden.
            FIELD.replace('w-full ', ''),
            'flex h-8 w-[168px] items-center justify-between gap-2 rounded-lg py-0 text-left',
            open && 'border-focus shadow-focus-field',
          )}
        >
          <span className={cn('truncate', !value && 'text-muted')}>{value ?? any}</span>
          <ChevronDown
            aria-hidden
            className={cn('h-4 w-4 shrink-0 text-muted transition-transform duration-base', open && 'rotate-180')}
          />
        </button>
      )}
    />
  )
}

function PageButton({
  active,
  children,
  ...rest
}: { active?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 font-mono text-xs transition-colors duration-base',
        'focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:text-disabled',
        active ? 'bg-brand-bg font-semibold text-brand-fg' : 'text-default hover:bg-surface-sunken',
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

// --------------------------------------------------------------- table

function Th({
  children,
  sortKey,
  sort,
  onSort,
  right,
  lead,
}: {
  children: ReactNode
  sortKey?: SortKey
  sort?: Sort
  onSort?: (k: SortKey) => void
  right?: boolean
  /** Sits before the label, in the same cell (the select-all box). */
  lead?: ReactNode
}) {
  const label = 'text-xs font-semibold uppercase tracking-wide text-muted'
  if (!sortKey || !sort || !onSort)
    return <th className={cn('px-3 py-2.5', label)}>{children}</th>
  const on = sort.key === sortKey
  const Icon = !on ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown
  return (
    <th
      aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('px-3 py-2.5', right && 'text-right')}
    >
      {lead && <span className="mr-2.5 inline-flex align-middle">{lead}</span>}
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm transition-colors duration-base hover:text-default',
          'focus-visible:outline-none focus-visible:shadow-focus',
          label,
          on && 'text-default',
        )}
      >
        {children}
        <Icon aria-hidden className={cn('h-3.5 w-3.5', on ? 'text-default' : 'text-disabled')} />
      </button>
    </th>
  )
}

function Row({ row, flash, agent }: { row: QueueRow; flash: boolean; agent?: QueueAgentSlot }) {
  const ref = useRef<HTMLTableRowElement>(null)
  const pending = row.quotationNo === null
  const mine = row.ownership === 'assigned'

  // A row the assistant pointed at is brought into view, not just tinted.
  useEffect(() => {
    if (flash) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [flash])
  const assignable = isAssignable(row)
  const actions: MenuItem[] = [
    ...(agent?.menu(row) ?? []),
    ...(row.ownership === 'unassigned' && assignable ? [{ key: 'take', label: 'Take this case' }] : []),
    ...(assignable ? [{ key: 'reassign', label: 'Reassign' }] : []),
  ]

  return (
    <tr
      ref={ref}
      className={cn(
        'group cursor-pointer border-b border-subtle transition-colors duration-base last:border-0',
        flash ? 'bg-brand-bg' : 'hover:bg-brand-50',
      )}
    >
      <td className="px-3 py-3">
        {pending ? (
          <span className="flex items-center gap-2.5">
            {agent && <span aria-hidden className="h-4 w-4 shrink-0" />}
            <span className="font-mono text-sm text-muted">Pending</span>
          </span>
        ) : (
          <span className="flex items-center gap-1">
            {agent && (
              <span className="mr-1 inline-flex">
                <Checkbox
                  label={`Select ${row.quotationNo}`}
                  checked={agent.selected.has(row.id)}
                  disabled={!agent.selectable(row)}
                  onChange={(on) => agent.onSelect([row.id], on)}
                />
              </span>
            )}
            <span className="whitespace-nowrap font-mono text-xs font-medium text-default">{row.quotationNo}</span>
            {row.referred && (
              <Mark label="Referred" icon={CornerRightUp} className="border-info bg-info-bg text-info-fg" />
            )}
            {mine && <Mark label="Assigned to you" icon={UserRound} className="border-brand bg-brand-bg text-brand-fg" />}
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        <Cell value={row.clientName} max="max-w-[108px]" />
      </td>
      <td className="px-3 py-3">
        <Cell value={row.plan} max="max-w-[108px]" />
      </td>
      <td className="px-3 py-3 text-right">
        {row.premium ? (
          <span className="whitespace-nowrap font-mono text-sm text-default tabular-nums">
            {formatInr(row.premium)}
            <span className="text-xs text-muted">/yr</span>
          </span>
        ) : (
          <span className="text-sm text-muted">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-subtle">{formatDate(row.createdAt)}</td>
      <td className="px-3 py-3">
        <Tat elapsed={row.tatElapsedHours} sla={row.tatSlaHours} />
      </td>
      <td className="px-3 py-3">
        <Badge tone={PRIORITY_TONE[row.priority]} dot={row.priority === 'High'}>
          {row.priority}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col items-start gap-1">
          <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} dot={STATUS_ATTENTION.has(row.status)}>
            {prettifyStatus(row.status)}
          </Badge>
          {agent?.status(row)}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="neutral" className="h-7 px-2.5 text-xs">
            Review
            <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-base group-hover:translate-x-0.5" />
          </Button>
          {actions.length > 0 && (
            <Menu
              label="Case actions"
              align="right"
              items={actions}
              onSelect={(k) => agent?.onMenu(row, k)}
              trigger={({ open, toggle }) => (
                <button
                  type="button"
                  aria-label="Case actions"
                  aria-expanded={open}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle()
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors duration-base hover:bg-surface-sunken hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
                >
                  <MoreVertical aria-hidden className="h-4 w-4" />
                </button>
              )}
            />
          )}
        </div>
      </td>
    </tr>
  )
}

/** A 16px check box on the house tokens. The primitive set has none; this is
 *  the one control the queue's bulk selection needs. */
function Checkbox({
  label,
  checked,
  indeterminate = false,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  onChange: (on: boolean) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 shrink-0 cursor-pointer rounded-sm border-strong accent-brand-700 focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed"
    />
  )
}

function SelectAll({ agent, rows }: { agent: QueueAgentSlot; rows: QueueRow[] }) {
  const ids = rows.filter(agent.selectable).map((r) => r.id)
  const on = ids.filter((id) => agent.selected.has(id)).length
  return (
    <Checkbox
      label="Select all on this page"
      checked={ids.length > 0 && on === ids.length}
      indeterminate={on > 0 && on < ids.length}
      disabled={ids.length === 0}
      onChange={(next) => agent.onSelect(ids, next)}
    />
  )
}

function Cell({ value, max }: { value: string | null; max: string }) {
  if (!value) return <span className="text-sm text-muted">—</span>
  return (
    <span title={value} className={cn('block truncate text-sm font-medium text-default', max)}>
      {value}
    </span>
  )
}

/**
 * Time left before the SLA, how much of it is used, and the raw hours.
 * The bar warms at 75% used and turns danger once breached, so the column
 * can be read by colour down the page without reading each label.
 */
function Tat({ elapsed, sla }: { elapsed: number; sla: number }) {
  const used = elapsed / Math.max(sla, 1)
  const breached = used >= 1
  const tone = breached ? 'danger' : used >= 0.75 ? 'warning' : 'success'
  const label = formatTat(elapsed, sla)
  return (
    <div className="flex w-[96px] flex-col gap-1.5">
      <span
        className={cn(
          'font-mono text-sm font-semibold',
          tone === 'danger' ? 'text-danger-fg' : tone === 'warning' ? 'text-warning-fg' : 'text-default',
        )}
      >
        {breached ? label : `${label} left`}
      </span>
      <span className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
        <span
          className={cn(
            'block h-full rounded-full',
            tone === 'danger' ? 'bg-danger-500' : tone === 'warning' ? 'bg-warning-500' : 'bg-success-500',
          )}
          style={{ width: `${Math.min(100, Math.max(4, used * 100))}%` }}
        />
      </span>
      <span className="font-mono text-xs text-subtle">
        {elapsed}h of {sla}h
      </span>
    </div>
  )
}

/**
 * A row flag drawn as an icon: Referred, and Assigned to you. A full badge
 * beside a 24-character ID pushed the table past 1440; the mark keeps the
 * signal in a fifth of the width. The label lives in the house tooltip and is
 * the mark's accessible name.
 */
function Mark({ label, icon: Icon, className }: { label: string; icon: LucideIcon; className: string }) {
  const { anchorRef, pos, show, hide } = useAnchored({ align: 'left', width: 120 })
  return (
    <span
      ref={anchorRef}
      role="img"
      aria-label={label}
      tabIndex={0}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border focus-visible:outline-none focus-visible:shadow-focus',
        className,
      )}
    >
      <Icon aria-hidden className="h-3 w-3" />
      {pos && (
        <AnchoredCard pos={pos}>
          <span className="block w-max rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs text-inverse shadow-classic">
            {label}
          </span>
        </AnchoredCard>
      )}
    </span>
  )
}
