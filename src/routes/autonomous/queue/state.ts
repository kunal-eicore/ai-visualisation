import { useEffect, useMemo, useRef, useState } from 'react'
import { ROWS, STATUS_TABS, prettifyStatus, type Ownership, type Priority, type QueueRow, type StatusTabKey } from './data'

export const SEGMENTS = ['All', 'Retail', 'Group'] as const
export type SegmentTab = (typeof SEGMENTS)[number]

export type SortKey = 'quotationNo' | 'clientName' | 'plan' | 'premium' | 'createdAt' | 'tat' | 'priority' | 'status'
export type Sort = { key: SortKey; dir: 'asc' | 'desc' }

/** Everything that decides which rows show and in what order. */
export type View = {
  segment: SegmentTab
  statusTab: StatusTabKey
  search: string
  priority: Priority | null
  plan: string | null
  sort: Sort
}

export const DEFAULT_VIEW: View = {
  segment: 'All',
  statusTab: 'all',
  search: '',
  priority: null,
  plan: null,
  sort: { key: 'createdAt', dir: 'desc' },
}

/** What the assistant can do to the queue once Apply is pressed. */
export type QueueAction = { kind: 'view'; patch: Partial<View> } | { kind: 'assign'; ids: string[] }

const PRIORITY_RANK: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }
const tatLeft = (r: QueueRow) => r.tatSlaHours - r.tatElapsedHours

const SORTERS: Record<SortKey, (a: QueueRow, b: QueueRow) => number> = {
  quotationNo: (a, b) => (a.quotationNo ?? '').localeCompare(b.quotationNo ?? ''),
  clientName: (a, b) => (a.clientName ?? '').localeCompare(b.clientName ?? ''),
  plan: (a, b) => (a.plan ?? '').localeCompare(b.plan ?? ''),
  premium: (a, b) => a.premium - b.premium,
  createdAt: (a, b) => a.createdAt.localeCompare(b.createdAt),
  tat: (a, b) => tatLeft(a) - tatLeft(b),
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  status: (a, b) => a.status.localeCompare(b.status),
}

export function scopeRows(rows: QueueRow[], segment: SegmentTab) {
  return segment === 'All' ? rows : rows.filter((r) => r.segment === segment.toLowerCase())
}

/** Pure, so `show` can work out where a row will land before rendering. */
export function filterRows(rows: QueueRow[], v: View) {
  const q = v.search.trim().toLowerCase()
  const tab = STATUS_TABS.find((t) => t.key === v.statusTab)!
  const kept = scopeRows(rows, v.segment).filter(
    (r) =>
      tab.match(r) &&
      (!v.priority || r.priority === v.priority) &&
      (!v.plan || r.plan === v.plan) &&
      (!q || [r.quotationNo, r.clientName, r.plan, prettifyStatus(r.status)].some((x) => x?.toLowerCase().includes(q))),
  )
  const by = SORTERS[v.sort.key]
  return [...kept].sort((a, b) => (v.sort.dir === 'asc' ? by(a, b) : by(b, a)))
}

/** How long a row the assistant pointed at stays highlighted. */
const FLASH_MS = 1400
const TOAST_MS = 5000

export type QueueToast = { token: string; title: string }

/**
 * The queue's state, lifted out of the table so the assistant can drive it.
 *
 * Every change the assistant makes goes through `apply` under a token, and
 * `undo(token)` puts back exactly what that apply replaced. Undo lives on the
 * chat receipt only; the toast just reports the assignment.
 *
 * Ownership is local state over the fixture: a Take or Reassign marks the
 * case as yours until it is undone or the page is left.
 */
export function useQueue() {
  const [view, setViewState] = useState<View>(DEFAULT_VIEW)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(10)
  const [owners, setOwners] = useState<Record<string, Ownership>>({})
  const [flashId, setFlashId] = useState<string | null>(null)
  const [toast, setToast] = useState<QueueToast | null>(null)
  const [undoable, setUndoable] = useState<string[]>([])
  const undos = useRef(new Map<string, () => void>())
  const timers = useRef<{ flash?: number; toast?: number }>({})

  useEffect(
    () => () => {
      window.clearTimeout(timers.current.flash)
      window.clearTimeout(timers.current.toast)
    },
    [],
  )

  const rows = useMemo(
    () => ROWS.map((r) => (owners[r.id] ? { ...r, ownership: owners[r.id] } : r)),
    [owners],
  )
  const filtered = useMemo(() => filterRows(rows, view), [rows, view])

  const setView = (patch: Partial<View>) => {
    setViewState((v) => ({ ...v, ...patch }))
    setPage(1)
  }

  const setPageSize = (n: number) => {
    setPageSizeState(n)
    setPage(1)
  }

  const clear = () => setView({ ...DEFAULT_VIEW, sort: view.sort })

  /** Bring a row into sight: drop the filters only if they hide it, go to
   *  its page, and highlight it briefly. */
  const show = (id: string) => {
    let next = view
    if (!filterRows(rows, next).some((r) => r.id === id)) next = { ...DEFAULT_VIEW, sort: view.sort }
    const index = filterRows(rows, next).findIndex((r) => r.id === id)
    if (index < 0) return
    setViewState(next)
    setPage(Math.floor(index / pageSize) + 1)
    setFlashId(id)
    window.clearTimeout(timers.current.flash)
    timers.current.flash = window.setTimeout(() => setFlashId(null), FLASH_MS)
  }

  const dismissToast = () => {
    window.clearTimeout(timers.current.toast)
    setToast(null)
  }

  const apply = (token: string, action: QueueAction) => {
    if (action.kind === 'view') {
      const before = view
      setView(action.patch)
      undos.current.set(token, () => {
        setViewState(before)
        setPage(1)
      })
    } else {
      const before = Object.fromEntries(action.ids.map((id) => [id, owners[id]]))
      setOwners((o) => ({ ...o, ...Object.fromEntries(action.ids.map((id) => [id, 'assigned' as const])) }))
      undos.current.set(token, () =>
        setOwners((o) => {
          const n = { ...o }
          for (const id of action.ids) {
            if (before[id] === undefined) delete n[id]
            else n[id] = before[id]
          }
          return n
        }),
      )
      const count = action.ids.length
      setToast({ token, title: `${count} ${count === 1 ? 'case' : 'cases'} assigned to you` })
      window.clearTimeout(timers.current.toast)
      timers.current.toast = window.setTimeout(() => setToast(null), TOAST_MS)
    }
    setUndoable((u) => [...u, token])
  }

  const undo = (token: string) => {
    undos.current.get(token)?.()
    undos.current.delete(token)
    setUndoable((u) => u.filter((t) => t !== token))
    if (toast?.token === token) dismissToast()
  }

  return {
    rows,
    view,
    setView,
    clear,
    filtered,
    page,
    setPage,
    pageSize,
    setPageSize,
    flashId,
    show,
    apply,
    undo,
    undoable,
    toast,
    dismissToast,
  }
}

export type Queue = ReturnType<typeof useQueue>
