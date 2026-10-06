import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, ChevronRight, CircleCheck, Copy, Pencil, TriangleAlert } from 'lucide-react'
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

const STATUS_TONE: Record<GroupStatus, 'success' | 'warning' | 'danger'> = {
  configured: 'success',
  needsReview: 'warning',
  missingCover: 'danger',
}

const STATUS_LABEL: Record<GroupStatus, string> = {
  configured: 'Configured',
  needsReview: 'Needs review',
  missingCover: 'Missing cover',
}

const STATUS_ICON: Record<GroupStatus, ReactNode> = {
  configured: <CircleCheck aria-hidden className="h-3 w-3" />,
  needsReview: <TriangleAlert aria-hidden className="h-3 w-3" />,
  missingCover: undefined,
}

export function StepCovers() {
  const [activeId, setActiveId] = useState(MEMBER_GROUPS[0].id)
  const [configured, setConfigured] = useState<Record<string, boolean>>({})
  const [addons, setAddons] = useState<Record<string, boolean>>({})
  const coversRef = useSectionRef('covers.table')
  const coversHandoff = useHandoffProps('covers.table')
  const { values } = useAgentEdits()

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

      {/* Which band am I configuring?
          
          This was a tab bar, and it was cramped for a reason worth naming: a
          three-line tab is not a tab, and the second line repeated the first
          — a group's NAME is its sum insured ("Sum Insured 300000"), so the
          tab read ₹3,00,000 / Sum Insured 300000 / status in a 150px column.

          Selecting a band is choosing which plan you are configuring, which
          is the job Klook's "Select Your Plan" row does, so it gets that
          shape: one card per band, wide enough for the figure to be a
          headline and for the status to sit on its own line. It stays
          horizontal rather than becoming a left rail because the cover
          tables below need every pixel of width.

          Radio semantics, not tabs: these select the subject of the panel,
          they do not switch between panels of different content. */}
      <div
        role="radiogroup"
        aria-label="Member groups"
        /* Pinned: it is the control the whole step is operated with, and the
           step is taller than the viewport. Two tight lines rather than the
           roomier card it was, because a sticky block pays for its height on
           every scroll — at a third of the row's width there is still four
           times the room the old three-line tab had. */
        className="sticky top-0 z-20 grid gap-3 bg-surface-page py-2 sm:grid-cols-3"
      >
        {MEMBER_GROUPS.map((group) => {
          const isActive = group.id === activeId
          const status = groupStatus(group.id)
          const selected = addonCount(group.id)
          return (
            <button
              key={group.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setActiveId(group.id)}
              className={cn(
                'flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors duration-base',
                'focus-visible:outline-none focus-visible:shadow-focus',
                isActive
                  ? 'border-brand bg-brand-bg shadow-card'
                  : 'border-default bg-surface-card hover:border-strong',
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span
                  className={cn(
                    'text-md font-semibold',
                    isActive ? 'text-brand' : 'text-default',
                  )}
                >
                  {formatInr(group.sumInsured)}
                </span>
                <Badge className="ml-auto" tone={STATUS_TONE[status]} icon={STATUS_ICON[status]}>
                  {STATUS_LABEL[status]}
                </Badge>
              </span>
              <span className="text-sm text-muted">
                {group.members.toLocaleString('en-IN')} members · {selected} of{' '}
                {ADDON_COVERS.length} add-ons
              </span>
            </button>
          )
        })}
      </div>

      {/* Not a SectionCard, so the handoff is placed by hand. The maternity
          question is the underwriter's, so this surface carries the notice
          and deliberately does NOT take the glow: lighting an edge over work
          somebody else owes would be an alarm you cannot clear. */}
      <section
        ref={coversRef}
        className={cn(
          'overflow-hidden rounded-lg border border-default bg-surface-card transition-shadow duration-slow',
          coversHandoff.attention ? 'ring-attention' : 'shadow-card',
        )}
      >
        {coversHandoff.notice}
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
        <CoverTable covers={BASE_COVERS} editing={editBase} sumInsured={active.sumInsured} />

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
      </section>

      {/* Moving on WITHIN the step, next to the shell's own Save & Continue,
          which leaves it. This used to sit in a card header halfway up the
          page — the only step whose primary action was not in the bar.

          It disappears once every group is configured: a button that says
          "next group" when there is no next group is the reason people think
          they have finished when they have not. */}
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
}: {
  covers: Cover[]
  editing: boolean
  /** The active band's sum insured — every SI-linked limit is read off it. */
  sumInsured: number
  /** Present only for add-ons: a base cover is always in force. */
  toggles?: Record<string, boolean>
  onToggle?: (name: string) => void
  groupId?: string
}) {
  const { pending, landed } = useAgentEdits()

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
        {covers.map((cover) => {
          const key = `${groupId}:${cover.name}`
          const on = toggles ? Boolean(toggles[key]) : true
          /* Only add-on rows can be written to, and only those rows report
             it. A whole-table write that skeletoned all 29 rows would be
             claiming to have reconsidered the base cover set as well. */
          const writing = Boolean(toggles) && pending.includes(ADDON_PREFIX + key)
          const settled = Boolean(toggles) && landed.includes(ADDON_PREFIX + key)
          // The limit's qualifier — "/ claim", "/ policy" — is a modifier on
          // the amount, so it is set under it rather than pilled in a column
          // of its own. A range or a percentage carries no suffix.
          const [amount, qualifier] = splitLimit(coverLimit(cover, sumInsured))
          return (
            <tr
              key={cover.name}
              aria-busy={writing || undefined}
              className={cn(!on && !writing && 'text-subtle', settled && 'animate-reveal')}
            >
              <Td strong={on}>
                <span className="flex items-center gap-2.5">
                  {onToggle &&
                    /* Same 36\u00d720 box as the switch, so the column does not
                       reflow when seven of them resolve at once. */
                    (writing ? (
                      <Skeleton w={36} h={20} className="rounded-full" />
                    ) : (
                      <Switch checked={on} label={cover.name} onChange={() => onToggle(cover.name)} />
                    ))}
                  <span className={cn(on ? 'text-default' : 'text-subtle')}>{cover.name}</span>
                  {/* A base cover whose limit was changed from the product
                      default for this client. That is a state, and state is
                      what colour is for — it keeps its Badge. */}
                  {cover.modified && (
                    <Badge tone="warning" className="font-normal">
                      Modified
                    </Badge>
                  )}
                </span>
              </Td>
              <Td>{cover.type}</Td>
              <Td>{cover.limitType}</Td>
              <Td align="right">
                {editing ? (
                  <LimitEditor cover={cover} sumInsured={sumInsured} />
                ) : (
                  <span className="flex flex-col items-end">
                    <span className={cn('font-semibold', on ? 'text-default' : 'text-subtle')}>
                      {amount}
                    </span>
                    {qualifier && <span className="text-xs text-muted">{qualifier}</span>}
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
