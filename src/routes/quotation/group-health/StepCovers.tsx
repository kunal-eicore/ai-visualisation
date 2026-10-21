import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, ChevronRight, CircleCheck, Copy, Pencil, Sparkles, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FIELD } from '@/components/workspace/field'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { useAgentEdits, useSectionRef } from './agentEdits'
import { ActionSlot, GroupBand, Table, Td, Th } from './parts'
import {
  ADDON_COVERS,
  BASE_COVERS,
  BASE_COVER_COUNT,
  MEMBER_GROUPS,
  coverLimit,
  formatInr,
  type Cover,
} from './data'
import { useHandoffProps } from './Handoffs'
import {
  ADDON_LIMIT_PREFIX,
  LIMIT_PREFIX,
  recById,
  recsFor,
  useCoverRecsView,
  withLimit,
  useRecStateOf,
} from '@/routes/knowledge-graph/coverRecs'
import { InlineRecMark, InlineRecValue, RecsBar } from '@/routes/knowledge-graph/RecParts'
import { WhyPanel } from '@/routes/knowledge-graph/WhyPanel'
import type { CoverRec } from '@/routes/knowledge-graph/data'

/**
 * Step 4 — Cover Details.
 *
 * The step that is easiest to get wrong, because covers are configured PER
 * GROUP and the screen has to make that obvious without turning into three
 * screens. The device from the source is a tab bar whose tabs carry their own
 * status, so a user can see at a glance which band still needs work.
 *
 * Two things this screen had to stop doing.
 *
 * **It nested a card in a card in a card.** A page holding a bordered
 * section holding a SectionCard holding the table, all the same fill and the
 * same radius. One card with hairline group bands (`GroupBand`) separates
 * base from add-on just as clearly and costs no boxes — the same call
 * already made for `FileList`.
 *
 * **It put a Badge in every cell of two columns.** Thirteen covers × Type ×
 * Limit type was twenty-six pills, and the green on `Within SI` was the
 * status palette's "verified / approved" spent on a string that is neither.
 * The PILLS were the problem, not the columns: both facts are captured data
 * and both keep a column, now as plain text. The industry draws a cover as
 * one line with the amount emphasised by WEIGHT (Klook, Expedia, Kiwi), so
 * the limit is semibold with its per-claim / per-policy suffix set quietly
 * beneath — that suffix comes off the value string and is a SEPARATE fact
 * from `limitType`, which is why it does not stand in for it.
 *
 * Colour survives in the one place on the row that is a state: the
 * `Modified` Badge on a base cover changed from the product default.
 */
/** `utils/cover-group-status.ts` — saved, drafted, or nothing chosen yet. */
type GroupStatus = 'configured' | 'needsReview' | 'missingCover'

/** Bus field ids for an add-on selection: `covers.addon.<group>:<cover>`. */
const ADDON_PREFIX = 'covers.addon.'

/** The tab's status mark is the icon alone, so every state carries one. */
const STATUS_ICON_TONE: Record<GroupStatus, string> = {
  configured: 'text-success-fg',
  needsReview: 'text-warning-fg',
  missingCover: 'text-danger-fg',
}

const STATUS_LABEL: Record<GroupStatus, string> = {
  configured: 'Configured',
  needsReview: 'Needs review',
  missingCover: 'Missing cover',
}

const STATUS_ICON: Record<GroupStatus, ReactNode> = {
  configured: <CircleCheck aria-hidden className="h-3.5 w-3.5" />,
  needsReview: <TriangleAlert aria-hidden className="h-3.5 w-3.5" />,
  missingCover: <TriangleAlert aria-hidden className="h-3.5 w-3.5" />,
}

export function StepCovers() {
  const [activeId, setActiveId] = useState(MEMBER_GROUPS[0].id)
  const [configured, setConfigured] = useState<Record<string, boolean>>({})
  const [addons, setAddons] = useState<Record<string, boolean>>({})
  const coversRef = useSectionRef('covers.table')
  const coversHandoff = useHandoffProps('covers.table')
  const { values } = useAgentEdits()
  /* Recommendations, where the route offers them. Null on Group Health. */
  const recsView = useCoverRecsView()
  const [whyId, setWhyId] = useState<string | null>(null)

  /* The assistant's whole-table write lands here.
     
     The toggles stay local state rather than becoming bus fields, because a
     user flipping a switch is the common case and it should not have to go
     through a write path built for a machine. What the bus does instead is
     push its result in \u2014 which also gives Undo for free, since taking the
     write back rewrites the same keys to nothing and this reads them as off. */
  useEffect(() => {
    const written: Record<string, boolean> = {}
    let any = false
    for (const [id, value] of Object.entries(values)) {
      if (!id.startsWith(ADDON_PREFIX)) continue
      written[id.slice(ADDON_PREFIX.length)] = value === 'on'
      any = true
    }
    if (any) setAddons((prev) => ({ ...prev, ...written }))
  }, [values])
  // One flag per table. Sharing a single `editing` across both meant pressing
  // Edit on the base covers silently turned every add-on value into an input.
  const [editBase, setEditBase] = useState(false)
  const [editAddons, setEditAddons] = useState(false)

  const active = MEMBER_GROUPS.find((g) => g.id === activeId)!
  const tabRecs = recsView ? recsFor(activeId) : []
  const baseRec = (name: string) => tabRecs.find((r) => r.kind === 'limit' && r.cover === name)
  const addonRec = (name: string) => tabRecs.find((r) => r.kind === 'addon' && r.cover === name)
  const recStateOf = useRecStateOf()
  /* Inline view: a row is marked while its recommendation is still open. */
  const suggested = (rec: CoverRec | undefined) =>
    recsView === 'inline' && rec !== undefined && recStateOf(rec) === 'open'
  /* Card view: what is still open on each band, shown on its tab. */
  const openOn = (groupId: string) =>
    recsView === 'card' ? recsFor(groupId).filter((r) => recStateOf(r) === 'open').length : 0
  const doneCount = MEMBER_GROUPS.filter((g) => configured[g.id]).length

  /**
   * A group's state, three-valued as in `utils/cover-group-status.ts`. The
   * middle state is the one that matters and a two-state done/not-done
   * collapses it: a band with add-ons chosen but not yet saved is a
   * different problem from a band with no add-on on it at all, and only the
   * second one blocks the quotation.
   */
  const groupStatus = (id: string): GroupStatus => {
    if (configured[id]) return 'configured'
    if (addonCount(id) > 0) return 'needsReview'
    return 'missingCover'
  }
  const remaining = MEMBER_GROUPS.filter((g) => !configured[g.id] && g.id !== activeId)

  /** Count a group's selected add-ons — the figure the band header quotes
   *  and the thing `needsReview` turns on. */
  const addonCount = (id: string) =>
    ADDON_COVERS.filter((c) => addons[`${id}:${c.name}`]).length

  /**
   * Copy the ACTIVE group's add-on selection onto other groups.
   *
   * The direction is from the group on screen outward, which is the source's
   * model (`CloneConfigRow`) and the one that matches the work: you configure
   * one band properly, then fan it out. An earlier pass here had it backwards
   * — a picker that pulled FROM a chosen group — which makes you configure a
   * group, navigate away, and then reach back for it.
   *
   * It REPLACES rather than merges: clone means the groups end up the same,
   * and a merge would leave a target holding add-ons neither group was
   * configured with and no way to tell which came from where.
   */
  const cloneTo = (targetIdList: string[]) => {
    setAddons((prev) => {
      const next = { ...prev }
      for (const targetId of targetIdList) {
        for (const cover of ADDON_COVERS) {
          next[`${targetId}:${cover.name}`] = Boolean(prev[`${activeId}:${cover.name}`])
        }
      }
      return next
    })
  }

  const activeIndex = MEMBER_GROUPS.findIndex((g) => g.id === activeId)
  const otherGroups = MEMBER_GROUPS.filter((g) => g.id !== activeId)
  const nextGroup = MEMBER_GROUPS[activeIndex + 1]
  const cloneToAll = () => cloneTo(otherGroups.map((g) => g.id))
  const cloneToNext = () => {
    if (!nextGroup) return
    cloneTo([nextGroup.id])
    setActiveId(nextGroup.id)
  }

  const saveGroup = () => {
    setConfigured((prev) => ({ ...prev, [activeId]: true }))
    setEditBase(false)
    setEditAddons(false)
    if (remaining.length > 0) setActiveId(remaining[0].id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-lg font-semibold text-default">Cover Details</h2>
          <p className="text-base text-subtle">
            Base covers apply to every group. Add-on covers are set per group.
          </p>
        </div>
        <span className="text-sm text-muted">
          {doneCount} of {MEMBER_GROUPS.length} groups configured
        </span>
      </div>

      {/* The card, with the band switch as its header (Figma SANDBOX-PREP
          118:7541). It replaces the three radio cards that sat above it, so
          the control and the tables it drives read as one surface.

          `overflow-clip`, not `overflow-hidden`: hidden makes the card a
          scroll container, which pins the sticky strip to the card itself
          and it never sticks. Clip still rounds the corners, and leaves the
          strip stuck to the step's scroller for exactly as long as any of
          the card is on screen; the card's bottom edge takes it away.

          Not a SectionCard, so the handoff is placed by hand. The maternity
          question is the underwriter's, so this surface carries the notice
          and deliberately does NOT take the glow: lighting an edge over work
          somebody else owes would be an alarm you cannot clear. */}
      <section
        ref={coversRef}
        className={cn(
          'overflow-clip rounded-lg border border-default bg-surface-card transition-shadow duration-slow',
          coversHandoff.attention ? 'ring-attention' : 'shadow-card',
        )}
      >
        <div
          role="tablist"
          aria-label="Member groups"
          className="sticky top-0 z-20 flex border-b border-default bg-surface-card pr-4 pt-1"
        >
          {MEMBER_GROUPS.map((group, i) => {
            const isActive = group.id === activeId
            const status = groupStatus(group.id)
            const recCount = openOn(group.id)
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                id={`cover-tab-${group.id}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveId(group.id)}
                onKeyDown={(e) => {
                  const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
                  if (!step) return
                  e.preventDefault()
                  const next = MEMBER_GROUPS[(i + step + MEMBER_GROUPS.length) % MEMBER_GROUPS.length]
                  setActiveId(next.id)
                  document.getElementById(`cover-tab-${next.id}`)?.focus()
                }}
                className={cn(
                  '-mb-px flex flex-col items-start gap-0.5 border-b-2 px-4 py-2.5 text-left transition-colors duration-base',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  isActive ? 'border-b-primary' : 'border-b-transparent hover:border-b-strong',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span role="img" aria-label={STATUS_LABEL[status]} className={STATUS_ICON_TONE[status]}>
                    {STATUS_ICON[status]}
                  </span>
                  <span
                    className={cn(
                      'whitespace-nowrap text-base font-semibold',
                      isActive ? 'text-default' : 'text-muted',
                    )}
                  >
                    {group.name}
                  </span>
                  {recCount > 0 && (
                    <Badge tone="brand" icon={<Sparkles aria-hidden className="h-3 w-3" />}>
                      {recCount}
                      <span className="sr-only">{recCount === 1 ? ' recommendation' : ' recommendations'}</span>
                    </Badge>
                  )}
                </span>
                <span className="pl-5 text-xs leading-4 text-muted">{formatInr(group.sumInsured)}</span>
              </button>
            )
          })}
        </div>

        {/* Its own box so the first band is still a first child and does not
            draw a top rule under the strip's bottom one. */}
        <div role="tabpanel" aria-labelledby={`cover-tab-${activeId}`}>
        {coversHandoff.notice}
        {recsView === 'card' && (
          <RecsBar key={activeId} groupId={activeId} sumInsured={active.sumInsured} onWhy={setWhyId} />
        )}
        <GroupBand
          title="Base cover"
          meta={
            <span className="text-sm text-muted">
              Every group, at {formatInr(active.sumInsured)} · {BASE_COVERS.length} of{' '}
              {BASE_COVER_COUNT} shown
            </span>
          }
          actions={<EditToggle editing={editBase} onToggle={() => setEditBase((v) => !v)} />}
        />
        <CoverTable
          covers={BASE_COVERS}
          editing={editBase}
          sumInsured={active.sumInsured}
          limitField={(name) => LIMIT_PREFIX + name}
          suggested={(name) => suggested(baseRec(name))}
          renderName={(name) => {
            const rec = recsView === 'inline' ? baseRec(name) : undefined
            return rec && <InlineRecMark rec={rec} onWhy={setWhyId} />
          }}
          renderValue={(name) => {
            const rec = recsView === 'inline' ? baseRec(name) : undefined
            return rec && <InlineRecValue rec={rec} sumInsured={active.sumInsured} />
          }}
        />

        <GroupBand
          title={`Add-on cover · ${formatInr(active.sumInsured)}`}
          meta={
            <span className="text-sm text-muted">
              {addonCount(activeId)} of {ADDON_COVERS.length} selected
            </span>
          }
          actions={
            <>
              <EditToggle editing={editAddons} onToggle={() => setEditAddons((v) => !v)} />
            </>
          }
        />
        <CoverTable
          covers={ADDON_COVERS}
          editing={editAddons}
          sumInsured={active.sumInsured}
          toggles={addons}
          onToggle={(name) =>
            setAddons((prev) => ({ ...prev, [`${active.id}:${name}`]: !prev[`${active.id}:${name}`] }))
          }
          groupId={active.id}
          limitField={(name) => `${ADDON_LIMIT_PREFIX}${active.id}:${name}`}
          suggested={(name) => suggested(addonRec(name))}
          renderName={(name) => {
            const rec = recsView === 'inline' ? addonRec(name) : undefined
            return rec && <InlineRecMark rec={rec} onWhy={setWhyId} />
          }}
          renderValue={(name) => {
            const rec = recsView === 'inline' ? addonRec(name) : undefined
            return rec && <InlineRecValue rec={rec} sumInsured={active.sumInsured} />
          }}
        />

        {/* Clone row. Two targets, both pushing this group's selection
            outward, and the next-group button disappears on the last group
            where there is no next — the source's `CloneConfigRow` exactly. */}
        <div className="flex flex-wrap items-center gap-2 border-t border-default px-4 py-3">
          <span className="text-sm font-medium text-muted">
            Clone {formatInr(active.sumInsured)} add-ons to
          </span>
          <Button size="sm" variant="outline" onClick={cloneToAll} disabled={otherGroups.length === 0}>
            <Copy aria-hidden className="h-4 w-4" />
            All groups
          </Button>
          {nextGroup && (
            <Button size="sm" variant="neutral" onClick={cloneToNext}>
              <ArrowRight aria-hidden className="h-4 w-4" />
              {formatInr(nextGroup.sumInsured)}
            </Button>
          )}
        </div>
        </div>
      </section>

      {/* Moving on WITHIN the step, next to the shell's own Save & Continue,
          which leaves it. This used to sit in a card header halfway up the
          page — the only step whose primary action was not in the bar.

          It disappears once every group is configured: a button that says
          "next group" when there is no next group is the reason people think
          they have finished when they have not. */}
      {whyId && (
        <WhyPanel rec={recById(whyId)} sumInsured={active.sumInsured} onClose={() => setWhyId(null)} />
      )}

      {(remaining.length > 0 || !configured[activeId]) && (
        <ActionSlot>
          <Button size="sm" variant="outline" onClick={saveGroup}>
            {remaining.length > 0 ? 'Save & next group' : 'Save group'}
            {remaining.length > 0 && <ChevronRight aria-hidden className="h-4 w-4" />}
          </Button>
        </ActionSlot>
      )}
    </div>
  )
}

function CoverTable({
  covers,
  editing,
  sumInsured,
  toggles,
  onToggle,
  groupId,
  limitField,
  renderName,
  renderValue,
  suggested,
}: {
  covers: Cover[]
  editing: boolean
  /** The active band's sum insured — every SI-linked limit is read off it. */
  sumInsured: number
  /** Present only for add-ons: a base cover is always in force. */
  toggles?: Record<string, boolean>
  onToggle?: (name: string) => void
  groupId?: string
  /** The bus field a written limit for this cover lives under. */
  limitField: (name: string) => string
  /** Extra content at the end of the name cell, e.g. a recommendation. */
  renderName?: (name: string) => ReactNode
  /** Extra content beside the value. */
  renderValue?: (name: string) => ReactNode
  /** Rows with an open recommendation: brand edge, tint and a sparkle. */
  suggested?: (name: string) => boolean
}) {
  const { pending, landed, values } = useAgentEdits()

  return (
    <Table>
      <thead>
        <tr>
          <Th>Cover</Th>
          <Th>Applies to</Th>
          <Th>Limit type</Th>
          <Th align="right">Limit</Th>
        </tr>
      </thead>
      <tbody>
        {covers.map((base) => {
          const key = `${groupId}:${base.name}`
          const on = toggles ? Boolean(toggles[key]) : true
          const limitId = limitField(base.name)
          const cover = withLimit(base, values[limitId])
          /* The switch only exists on add-on rows, so only they can have it
             written to. A whole-table write that skeletoned all 29 rows would
             be claiming to have reconsidered the base cover set as well. */
          const writing = Boolean(toggles) && pending.includes(ADDON_PREFIX + key)
          const writingLimit = pending.includes(limitId)
          const settled =
            (Boolean(toggles) && landed.includes(ADDON_PREFIX + key)) || landed.includes(limitId)
          const extraName = renderName?.(base.name)
          const extraValue = renderValue?.(base.name)
          const marked = Boolean(suggested?.(base.name)) && !writing && !writingLimit
          // The limit's qualifier — "/ claim", "/ policy" — is a modifier on
          // the amount, so it is set under it rather than pilled in a column
          // of its own. A range or a percentage carries no suffix.
          const [amount, qualifier] = splitLimit(coverLimit(cover, sumInsured))
          return (
            <tr
              key={cover.name}
              aria-busy={writing || writingLimit || undefined}
              className={cn(
                !on && !writing && 'text-subtle',
                settled && 'animate-reveal',
                /* The border is the write's, not the step's: it sits on the
                   rows being changed for exactly as long as they are. */
                (writing || writingLimit) && 'row-ring',
                marked && 'row-suggested',
              )}
            >
              <Td strong={on}>
                <span className="flex w-full items-center gap-2.5">
                  {onToggle &&
                    /* Same 36\u00d720 box as the switch, so the column does not
                       reflow when seven of them resolve at once. */
                    (writing ? (
                      <Skeleton w={36} h={20} className="rounded-full" />
                    ) : (
                      <Switch checked={on} label={cover.name} onChange={() => onToggle(cover.name)} />
                    ))}
                  {marked && <Sparkles aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" />}
                  <span className={cn(on ? 'text-default' : 'text-subtle')}>{cover.name}</span>
                  {/* A base cover whose limit was changed from the product
                      default for this client. That is a state, and state is
                      what colour is for — it keeps its Badge. */}
                  {cover.modified && (
                    <Badge tone="warning" className="font-normal">
                      Modified
                    </Badge>
                  )}
                  {extraName}
                </span>
              </Td>
              <Td>{cover.type}</Td>
              <Td>{cover.limitType}</Td>
              <Td align="right">
                {writingLimit ? (
                  <Skeleton w={88} h={14} />
                ) : editing ? (
                  <LimitEditor cover={cover} sumInsured={sumInsured} />
                ) : (
                  <span className="flex items-start justify-end gap-3">
                    {/* Beside the value rather than under it, so a suggestion
                        does not make its row taller than its neighbours. */}
                    {extraValue && <span className="leading-5">{extraValue}</span>}
                    <span className="flex flex-col items-end">
                      <span className={cn('font-semibold', on ? 'text-default' : 'text-subtle')}>
                        {amount}
                      </span>
                      {qualifier && <span className="text-xs text-muted">{qualifier}</span>}
                    </span>
                  </span>
                )}
              </Td>
            </tr>
          )
        })}
      </tbody>
    </Table>
  )
}

/**
 * The limit editor, shaped by the cover's limit type.
 *
 * The source picks the value cell purely off the limit type's `valueKind`
 * (`build-cover-columns.tsx`): a Range gets a min and a max, a Percentage
 * gets a number and a `%`, everything else gets one number. A single text
 * box for all three — which is what this had — lets someone type a range
 * into a fixed-amount cover and a rupee figure into a percentage.
 */
function LimitEditor({ cover, sumInsured }: { cover: Cover; sumInsured: number }) {
  const digits = (text: string) => text.replace(/[^0-9]/g, '')
  const limit = coverLimit(cover, sumInsured)

  if (cover.limitType === 'Range') {
    const [min, max] = limit.split('–')
    return (
      <span className="flex items-center justify-end gap-2">
        <input
          aria-label={`${cover.name} minimum`}
          className={cn(FIELD, 'max-w-[104px] text-right')}
          defaultValue={digits(min ?? '')}
          placeholder="Min"
        />
        <span className="text-muted">to</span>
        <input
          aria-label={`${cover.name} maximum`}
          className={cn(FIELD, 'max-w-[104px] text-right')}
          defaultValue={digits(max ?? min ?? '')}
          placeholder="Max"
        />
      </span>
    )
  }

  if (cover.limitType === 'Percentage') {
    return (
      <span className="flex items-center justify-end gap-1.5">
        <input
          aria-label={`${cover.name} percentage`}
          className={cn(FIELD, 'max-w-[88px] text-right')}
          defaultValue={digits(limit)}
        />
        <span className="text-subtle">% of SI</span>
      </span>
    )
  }

  return (
    <input
      aria-label={`${cover.name} limit`}
      className={cn(FIELD, 'ml-auto max-w-[160px] text-right')}
      defaultValue={digits(limit)}
    />
  )
}

/** Splits `₹60,000 / claim` into the amount and `per claim`. No suffix in,
 *  no second line out. */
function splitLimit(value: string): [string, string | null] {
  const at = value.indexOf(' / ')
  if (at === -1) return [value, null]
  return [value.slice(0, at), `per ${value.slice(at + 3)}`]
}

function EditToggle({ editing, onToggle }: { editing: boolean; onToggle: () => void }) {
  return (
    <Button size="sm" variant={editing ? 'primary' : 'outline'} onClick={onToggle}>
      {editing ? (
        <>
          <CircleCheck aria-hidden className="h-4 w-4" />
          Done
        </>
      ) : (
        <>
          <Pencil aria-hidden className="h-4 w-4" />
          Edit
        </>
      )}
    </Button>
  )
}

function Switch({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Include ${label}`}
      onClick={onChange}
      className={cn(
        'inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-base',
        'focus-visible:outline-none focus-visible:shadow-focus',
        checked ? 'border-primary bg-primary' : 'border-strong bg-neutral-200',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-3.5 w-3.5 rounded-full bg-surface-card transition-transform duration-base',
          checked && 'translate-x-4',
        )}
      />
    </button>
  )
}
