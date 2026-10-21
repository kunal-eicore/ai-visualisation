import { createContext, useContext, type ReactNode } from 'react'
import { useAgentEdits, type FieldEdit } from '@/routes/quotation/group-health/agentEdits'
import {
  ADDON_COVERS,
  BASE_COVERS,
  MEMBER_GROUPS,
  coverLimit,
  formatInr,
  type Cover,
} from '@/routes/quotation/group-health/data'
import { COVER_RECS, type CoverRec, type RecScope } from './data'

/**
 * Cover recommendations on the Cover Details step.
 *
 * Present only where a route provides it — `/knowledge-graph/recommendations`
 * does, `/quotation/group-health` does not — so the shared step renders
 * exactly as before everywhere else.
 *
 * The two views the top bar switches between:
 * - `card`: one row under the tab strip, with a Review list and Apply all.
 * - `inline`: a mark on each affected row, nothing above the tables.
 */
export type RecsView = 'card' | 'inline'

const CoverRecsContext = createContext<RecsView | null>(null)

export function CoverRecsProvider({ view, children }: { view: RecsView; children: ReactNode }) {
  return <CoverRecsContext.Provider value={view}>{children}</CoverRecsContext.Provider>
}

/** The active view, or null where recommendations are not offered. */
export function useCoverRecsView() {
  return useContext(CoverRecsContext)
}

/* Bus field ids. The add-on switch id is the one the chat's whole-table write
   already uses; the two limit ids are new, so a limit can be written to and
   taken back through the same path. */
export const ADDON_PREFIX = 'covers.addon.'
export const LIMIT_PREFIX = 'covers.limit.'
export const ADDON_LIMIT_PREFIX = 'covers.addonLimit.'

/**
 * A cover with a written limit laid over it.
 *
 * `share:0.3` re-links the cover to 30% of the band's sum insured; anything
 * else is a flat figure that keeps the original's per-claim / per-policy
 * suffix. An empty override (what Undo writes back) is no override.
 */
export function withLimit(cover: Cover, override: string | undefined): Cover {
  if (!override) return cover
  if (override.startsWith('share:')) return { ...cover, siShare: Number(override.slice(6)) }
  const suffix = cover.value.includes(' / ') ? ` / ${cover.value.split(' / ')[1]}` : ''
  return { ...cover, value: override + suffix, siShare: undefined }
}

const findCover = (rec: CoverRec) =>
  (rec.kind === 'addon' ? ADDON_COVERS : BASE_COVERS).find((c) => c.name === rec.cover)!

/** The sum insured a recommendation is read at: its own band, or the tab's. */
const siFor = (scope: RecScope, activeSi: number) =>
  scope === 'all' ? activeSi : MEMBER_GROUPS.find((g) => g.id === scope)!.sumInsured

export function recFields(rec: CoverRec): FieldEdit[] {
  if (rec.kind === 'limit') return [{ field: LIMIT_PREFIX + rec.cover, value: rec.limit! }]
  const key = `${rec.scope}:${rec.cover}`
  const edits: FieldEdit[] = [{ field: ADDON_PREFIX + key, value: 'on' }]
  if (rec.limit) edits.push({ field: ADDON_LIMIT_PREFIX + key, value: rec.limit })
  return edits
}

/** The change, as two short strings, read at the band on screen. */
export function recChange(rec: CoverRec, activeSi: number): { from: string; to: string } {
  const cover = findCover(rec)
  const si = siFor(rec.scope, activeSi)
  const to = coverLimit(withLimit(cover, rec.limit), si)
  if (rec.kind === 'addon') return { from: 'Off', to: `On · ${to}` }
  return { from: coverLimit(cover, si), to }
}

export function recScopeLabel(scope: RecScope) {
  if (scope === 'all') return 'All groups'
  return `${formatInr(MEMBER_GROUPS.find((g) => g.id === scope)!.sumInsured)} only`
}

/** Base changes apply to every tab; add-on changes to their own band. */
export const recsFor = (groupId: string) =>
  COVER_RECS.filter((r) => r.scope === 'all' || r.scope === groupId)

export const recById = (id: string) => COVER_RECS.find((r) => r.id === id)!

export type RecState = 'open' | 'working' | 'applied'

/**
 * One recommendation's state, and the two moves on it.
 *
 * State comes off the bus rather than a local flag: "applied" is "has an
 * undoable write under this token", so it cannot drift from what is in the
 * table. Working is any of its fields holding a skeleton, which covers the
 * Undo on its way back too.
 */
export function useRec(rec: CoverRec) {
  const { run, undo } = useAgentEdits()
  const token = `rec:${rec.id}`
  return {
    state: useRecStateOf()(rec),
    apply: () => run({ token, edits: recFields(rec) }),
    undo: () => undo(token),
  }
}

/** The state of any recommendation, for callers that read several at once. */
export function useRecStateOf() {
  const { undoable, pending } = useAgentEdits()
  return (rec: CoverRec): RecState =>
    recFields(rec).some((e) => pending.includes(e.field))
      ? 'working'
      : undoable.includes(`rec:${rec.id}`)
        ? 'applied'
        : 'open'
}
