import { createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Bot, CircleCheck, FileSpreadsheet, FileText, RefreshCw, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { useSectionRef } from './agentEdits'

/**
 * The step-form vocabulary, local to this walkthrough.
 *
 * The §0.5 primitive set covers status, buttons, chips and cards, but a
 * long configurable form needs three things it does not have: a card whose
 * header is a band above a hairline, a dense read/edit data table, and a
 * modal. They live here rather than in `components/ui` because they are the
 * idiom of THIS flow, not a system-wide addition — the same call `field.ts`
 * and `workspace/Shell.tsx` already make.
 */

/**
 * Where the values on a card came from. Set once by the shell, read by every
 * SectionCard, because the claim a card makes about its own contents has to
 * follow the autonomy mode the run is at: in Manual nothing was filled for
 * you, so a badge saying otherwise is a lie the UI tells on every screen.
 *
 * The four states are four standards of evidence, and they are kept apart on
 * purpose — collapsing them into one green badge is how a judgement ends up
 * wearing the authority of a census:
 *
 * - `manual` — you typed it.
 * - `imported` — a script read it out of a cell in the published template.
 *   The strongest of the three non-manual claims, and the only one available
 *   in Manual mode, because the file's shape was agreed before it was filled.
 * - `extracted` — a model read it out of a document nobody agreed the shape
 *   of. Reliable enough to offer, never enough to skip the look.
 * - `agent` — the agent concluded it from more than one source.
 */
export type Provenance = 'manual' | 'imported' | 'extracted' | 'agent'

const ProvenanceContext = createContext<Provenance>('manual')

export function ProvenanceProvider({
  value,
  children,
}: {
  value: Provenance
  children: ReactNode
}) {
  return <ProvenanceContext.Provider value={value}>{children}</ProvenanceContext.Provider>
}

/** Read the run's evidence standard. Steps use it where a whole region is a
 *  receipt for a file — a receipt for a file nobody uploaded is a lie the
 *  screen tells, so those regions have to disappear rather than go blank. */
export function useProvenance() {
  return useContext(ProvenanceContext)
}

/** A form section. The header band is what carries the fill claim, which is
 *  the one thing this flow has to say on almost every card: whether the value
 *  in front of you came out of a document, out of the agent, or out of your
 *  own keyboard. */
export function SectionCard({
  id,
  title,
  autoFilled,
  meta,
  actions,
  notice,
  attention,
  pad = true,
  children,
}: {
  /**
   * Makes the card addressable by the assistant, so a write it performs can
   * ring the area it lands in. Cards no proposal can reach leave it unset —
   * registering every card would keep a map of nodes nothing ever looks up.
   */
  id?: string
  title: string
  /** This card's values are filled rather than typed — when the mode fills. */
  autoFilled?: boolean
  meta?: ReactNode
  actions?: ReactNode
  /**
   * A standing band at the top of the body — used for the one thing on this
   * card that is waiting on a person. It sits inside the card rather than
   * above it because what is blocked is this surface, and a notice floating
   * above a card is a notice about the page.
   */
  notice?: ReactNode
  /**
   * Glow the card's edge, now. Transient — the caller turns it off after a
   * beat. Reserved for a `notice` the READER can act on: a glow over
   * somebody else's work is an alarm you have no way to clear.
   */
  attention?: boolean
  pad?: boolean
  children: ReactNode
}) {
  const provenance = useContext(ProvenanceContext)
  const sectionRef = useSectionRef(id)

  return (
    <section
      ref={sectionRef}
      /* The ring is written as an inline box-shadow by `lib/ring`; the
         transition is what makes it fade out rather than vanish. */
      className={cn(
        'overflow-hidden rounded-lg border border-default bg-surface-card transition-shadow duration-slow',
        /* The glow REPLACES the card shadow rather than stacking with it.
           Both are box-shadow, and a Tailwind utility beats a stylesheet
           rule, so leaving `shadow-card` on would silently win and the glow
           would never appear. Only the shadow changes, so what the eye sees
           when it lapses is a fade rather than the border snapping colour. */
        attention ? 'ring-attention' : 'shadow-card',
      )}
    >
      <header className="flex h-12 items-center gap-2 border-b border-default px-4">
        <h3 className="shrink-0 text-base font-semibold text-default">{title}</h3>
        {autoFilled && provenance === 'imported' && (
          <Badge tone="neutral" icon={<FileSpreadsheet aria-hidden className="h-3 w-3" />}>
            From template
          </Badge>
        )}
        {autoFilled && provenance === 'extracted' && (
          <Badge tone="success" icon={<Sparkles aria-hidden className="h-3 w-3" />}>
            Auto-filled
          </Badge>
        )}
        {autoFilled && provenance === 'agent' && (
          <Badge tone="brand" icon={<Bot aria-hidden className="h-3 w-3" />}>
            Agent filled
          </Badge>
        )}
        {meta}
        {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {notice}
      <div className={cn(pad && 'flex flex-col gap-4 p-4')}>{children}</div>
    </section>
  )
}

/** The uppercase label that sits in the left column of a chip row. */
export function RowLabel({ children }: { children: ReactNode }) {
  return (
    <span className="w-28 shrink-0 pt-1.5 font-mono text-xs uppercase tracking-wide text-muted">
      {children}
    </span>
  )
}

/**
 * A read-only label/value pair — DESIGN.md §4.20 "Field Grid / Key-Value
 * Rows": label column muted, value column `text/default`.
 *
 * This replaces a grid of bordered cells. A boxed cell per field draws a
 * rectangle around every value on a review page, and a review page is
 * ALL values — so the boxes stop distinguishing anything and just add a
 * line of chrome per field. The industry has settled on the row: Deputy,
 * Zillow, Remote and Airwallex all draw a review as one hairline-divided
 * list, label left, value right, nothing around either.
 *
 * `span` widens a field whose value is prose (an address) so it is not
 * competing for a third of the width with a one-word one.
 *
 * There is deliberately NO hairline under each field. §4.20 specifies a row
 * GAP, and a per-cell border in a multi-column grid renders as a row of
 * disconnected stubs — one per column, each stopping at the column gap —
 * which read as a table whose borders failed rather than as rows. Deputy and
 * Zillow get an unbroken rule because their review lists are ONE column
 * wide; at two or four columns the separator has to be space.
 */
export function KeyValue({
  label,
  value,
  span,
}: {
  label: string
  value: ReactNode
  /** Take two columns — for an address or a long name. */
  span?: boolean
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', span && 'sm:col-span-2')}>
      <dt className="truncate text-xs font-medium text-muted">{label}</dt>
      <dd className="text-base text-default">{value}</dd>
    </div>
  )
}

/**
 * A run of `KeyValue` rows. Columns wrap on width; the hairline under each
 * row is what lines them up, so no vertical rules are needed.
 */
export function KeyValues({ cols = 'sm:grid-cols-3', children }: { cols?: string; children: ReactNode }) {
  return <dl className={cn('grid gap-x-8 gap-y-4', cols)}>{children}</dl>
}

/**
 * A figure quoted inline in a header or a receipt strip — the value in the
 * mono face (§2.3, it is data), the label beside it rather than under it.
 *
 * Stacked centred stat columns were the shape before this, and four of them
 * in a row read as a KPI strip: four equal claims on the eye for numbers
 * that are only there to identify a file.
 */
export function Figure({
  label,
  value,
  tone,
}: {
  label: string
  value: ReactNode
  /** The one figure on a strip that is an exception, when there is one. */
  tone?: 'warning' | 'danger'
}) {
  return (
    <span className="flex shrink-0 items-baseline gap-1.5">
      <span
        className={cn(
          'font-mono text-base font-semibold tabular-nums',
          tone === 'warning' && 'text-warning-fg',
          tone === 'danger' && 'text-danger-fg',
          !tone && 'text-default',
        )}
      >
        {value}
      </span>
      <span className="text-sm text-muted">{label}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ table */

/**
 * The page is the only scroller.
 *
 * A `max-h` + `overflow-y-auto` wrapper per table — which is what the source
 * does (`TABLE_SCROLL_CLASS`) to stop a long catalogue stretching the page —
 * was tried here and removed: it hijacks the wheel the moment the pointer
 * crosses a table, so scrolling the page stalls in the middle of one and the
 * reader has to find an inch of non-table to get going again. Two nested
 * scrollers on one screen is a worse problem than a long screen.
 *
 * The step's real complaint — the band selector leaving the viewport — is
 * fixed where it belongs, by pinning the selector, not by shortening
 * everything underneath it.
 */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-base">{children}</table>
    </div>
  )
}

export function Th({
  children,
  align = 'left',
  className,
}: {
  children?: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn(
        /* DESIGN.md §4.19 — Semibold 12, uppercase, on "a surface/sunken OR
           hairline-bottomed band". This was Regular on the sunken band, and
           `text/muted` (#7878a0) on #eaeaef is 3.6:1 — under AA at 12px, and
           it read as a washed-out strip. Taking the hairline option and one
           step darker on the ink puts it at 12:1 with less furniture. */
        'whitespace-nowrap border-b border-default px-3 py-2.5 font-mono text-xs font-semibold uppercase tracking-wide text-subtle',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  align = 'left',
  strong,
  className,
}: {
  children?: ReactNode
  align?: 'left' | 'right' | 'center'
  strong?: boolean
  className?: string
}) {
  return (
    <td
      className={cn(
        'border-b border-subtle px-3 py-2.5 text-base',
        strong ? 'font-semibold text-default' : 'text-subtle',
        align === 'right' && 'text-right tabular-nums',
        align === 'center' && 'text-center tabular-nums',
        className,
      )}
    >
      {children}
    </td>
  )
}

/**
 * A count cell that also shows its size.
 *
 * A census matrix is two dozen bare integers, and the one thing an
 * underwriter takes from it is where the population sits — which is exactly
 * what a column of digits hides. The fix is the one Amplitude uses in its
 * breakdown tables: the number, with a pale bar behind it scaled against the
 * largest cell in the matrix. No legend, one hue, because there is one
 * series (`dataviz`).
 *
 * `max` is the matrix maximum, not the row or column maximum — a bar that
 * rescales per row would make 18 and 1402 the same length.
 */
/** Below this share of the matrix maximum a bar is thinner than a hairline,
 *  so it is not drawn. A 2px stub right-anchored beside a figure does not
 *  read as a small bar — it reads as a stray vertical border, which is
 *  exactly how it looked next to `1`, `20`, `72` and `170`. The figure
 *  already carries the precision; the bar is only there for the shape of the
 *  distribution, and at 1% of the maximum there is no shape to show. */
const BAR_FLOOR_PCT = 4

export function BarCell({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const showBar = value > 0 && pct >= BAR_FLOOR_PCT
  return (
    <td className="border-b border-subtle px-3 py-2.5 text-base">
      <span className="relative flex h-6 items-center justify-end">
        {showBar && (
          <span
            aria-hidden
            /* Anchored RIGHT, growing leftward — the one detail that makes the
               bars trackable.

               Grown from the left edge (the first cut) a bar and its figure
               share no reference point: the number is right-aligned, so a
               small value put a stub at the far left of the cell with its
               `18` stranded at the other end, and across four columns you
               got a picket fence you had to measure against nothing. Anchored
               right, the bar's tip always lands under the figure it belongs
               to, and every bar in the column shares one baseline — the same
               right edge the eye already follows down a column of tabular
               numbers.

               Rounding goes on the data end (now the left), so the growing
               tip is the soft one and the baseline edge stays flush. */
            className="absolute inset-y-0.5 right-0 rounded-l-sm bg-brand-100"
            style={{ width: `${pct}%` }}
          />
        )}
        <span
          className={cn(
            'relative px-1.5 tabular-nums',
            value > 0 ? 'text-default' : 'text-muted',
          )}
        >
          {value > 0 ? value.toLocaleString('en-IN') : '—'}
        </span>
      </span>
    </td>
  )
}

/**
 * The trailing action group on a table row.
 *
 * Hidden until the row is hovered or something inside it is focused — the
 * pattern every row-based product has landed on (Vapi, PlanetScale, Plain).
 * Three bordered buttons per row, always drawn, is nine boxes of chrome on a
 * three-row list and it puts the same weight on "remove" as on the data.
 *
 * `focus-within` is load-bearing, not a nicety: hover-only controls are
 * unreachable by keyboard, so tabbing into the row has to reveal them too.
 */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-base group-hover:opacity-100 group-focus-within:opacity-100">
      {children}
    </span>
  )
}

/** One icon action inside a `RowActions` group. */
export function RowAction({
  label,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string
  icon: (props: { className?: string; 'aria-hidden'?: boolean }) => ReactNode
  tone?: 'danger'
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-base',
        'focus-visible:outline-none focus-visible:shadow-focus',
        tone === 'danger'
          ? 'text-muted hover:bg-danger-50 hover:text-danger'
          : 'text-muted hover:bg-neutral-100 hover:text-default',
      )}
    >
      <Icon aria-hidden className="h-4 w-4" />
    </button>
  )
}

/**
 * A titled band that groups rows inside a card WITHOUT nesting a second card.
 *
 * Hairline-bounded, NOT filled. The `surface/sunken` fill it had put its
 * `text/muted` meta at 3.6:1 — under AA at 14px — and stacked another grey
 * band into a table that already had a grey total row. Two rules cost
 * nothing and every word on them is now on white.
 *
 * The shape this replaces was a bordered card holding bordered cards — same
 * fill, same radius, one inside the other, which reads as nesting without
 * earning it (the same call already made for `FileList`). A hairline band
 * with the group's name and its own actions separates two tables just as
 * clearly and costs no boxes.
 */
export function GroupBand({
  title,
  meta,
  actions,
}: {
  title: string
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex h-11 items-center gap-2 border-b border-default px-4 [&:not(:first-child)]:border-t">
      <h4 className="shrink-0 text-base font-semibold text-default">{title}</h4>
      {meta}
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

/**
 * The summary row a table ends on.
 *
 * **A rule above it, not a fill under it.** The grey band this used to be
 * (`surface/sunken`, #eaeaef) differentiated weakly and read badly: a
 * low-contrast wash under the figures, stacked between white rows and the
 * grey `GroupBand` headers, so a table became grey / white / grey and the
 * numbers sat on the muddiest ground on the screen. DESIGN.md §4.19 offers
 * the hairline instead of the fill and `Th` already took it — so the table
 * is now fill-free from header to total, and every figure sits on white.
 *
 * A rule above the total is also just what a financial table does. It is a
 * boundary, and a boundary is a line.
 *
 * Two weights, because two kinds of total:
 *
 * - `rule` (the default) — a reconciliation. The census matrices and the
 *   claims tables end on a figure whose job is to agree with something else:
 *   ruled off and set semibold, nothing more.
 * - `brand` — a result. The Process Sheet's premium total is the number the
 *   whole run exists to produce and the only one on the page nobody typed,
 *   so it is the one total that also takes a ground. `brand/bg` (#ededfd)
 *   against `text/default` is ~14:1, so it tints without dimming.
 *
 * Reserving the fill for the one real result is what keeps it meaning
 * anything; if every table's last row took one, it would be decoration on a
 * dozen screens.
 */
export function TotalRow({
  tone = 'rule',
  children,
}: {
  tone?: 'rule' | 'brand'
  children: ReactNode
}) {
  return (
    <tr
      className={cn(
        /* The rule goes on the cells, not the row: with `border-collapse` a
           `<tr>` border loses to the `<td>` borders next to it. */
        'font-semibold text-default [&>td]:border-t-2 [&>td]:border-t-strong',
        tone === 'brand' && 'bg-brand-bg',
      )}
    >
      {children}
    </tr>
  )
}

/* --------------------------------------------------------------- collapse */

export function Collapsible({
  title,
  meta,
  open,
  onToggle,
  children,
}: {
  title: string
  meta?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-default bg-surface-card shadow-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          'flex h-12 w-full items-center gap-2 px-4 text-left transition-colors duration-base hover:bg-neutral-50',
          'focus-visible:outline-none focus-visible:shadow-focus',
          open && 'border-b border-default',
        )}
      >
        <h3 className="shrink-0 text-base font-semibold text-default">{title}</h3>
        {meta}
        <ChevronMarker className="ml-auto" open={open} />
      </button>
      {open && <div>{children}</div>}
    </section>
  )
}

function ChevronMarker({ open, className }: { open: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-transform duration-base',
        open && 'rotate-180',
        className,
      )}
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/* ----------------------------------------------------------------- dialog */

// Lifted to the shared UI set; re-exported so the steps keep their import.
export { Dialog } from '@/components/ui/Dialog'

/* --------------------------------------------------------------- dropzone */

/**
 * The file drop target. One recipe for every upload area in the flow.
 *
 * This is the Onebuzz house pattern rather than a choice made here: the kit's
 * `FileDropZone` is a light-indigo ground inside a darker dashed indigo
 * border (`border-brand-300 bg-brand-50`), and the feature dropzones that do
 * not import it spell the same pair out by hand — contact-management's
 * `DROPZONE_CLASS`, the BRD extraction zone's "inviting" state, the POC's
 * `border-primary/40 bg-primary-soft`. DESIGN.md already names that pair
 * semantically (`brand/bg` + `brand/border`), so it is spelled with the
 * tokens here instead of with ramp steps.
 *
 * (One family in onebuzz deviates to neutral grey — the shared
 * `DocumentUploadCard`. It is the minority and it keeps its header badge
 * brand-tinted anyway, so the tint is what marks an upload either way.)
 *
 * The tint is doing real work on these screens: a quotation step is a wall of
 * white cards, and the one region that accepts a dragged file should be the
 * one region that is not white.
 *
 * `accepts` is the only copy inside it, and it is a label on a control —
 * what this particular target will take. It is not a description of the
 * feature, and nothing else belongs in here.
 */
export function DropZone({
  icon,
  title,
  accepts,
  action,
}: {
  icon: ReactNode
  title: string
  accepts: string
  action: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-brand bg-brand-bg px-6 py-8 text-center transition-colors duration-base hover:border-brand-700">
      <span className="inline-flex items-center justify-center rounded-md border border-brand-200 bg-surface-card p-2 text-brand">
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-default">{title}</p>
        <p className="text-sm text-subtle">{accepts}</p>
      </div>
      {action}
    </div>
  )
}

/* -------------------------------------------------------------- file rows */

export type FileState = 'checking' | 'ok' | 'error'

/**
 * The list of files under a drop zone.
 *
 * One bordered container with hairline-divided rows, NOT a card per file
 * inside a card. The shape before this stacked a `SectionCard` around a list
 * of `border bg-surface-card` boxes — same fill, same radius, one inside the
 * other — which read as nesting without ever earning it.
 */
export function FileList({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-subtle overflow-hidden rounded-lg border border-default bg-surface-card shadow-card">
      {children}
    </ul>
  )
}

/**
 * One uploaded file.
 *
 * The anatomy is the one every file manager and importer has converged on —
 * Whop, Linktree, AWS, Salesforce, Proton all draw the same row: a type tile,
 * the name on top, what-it-is underneath, controls at the trailing edge. It
 * is worth matching exactly, because a file row is the single most learned
 * object on the web and a novel one costs the reader a beat for nothing.
 *
 * Status is carried by the tile and by the secondary line, NOT by a coloured
 * bar down the side. A rail is a shape nothing else in the product uses, it
 * reads as decoration at rest, and it says nothing the tile does not.
 *
 * Only the failure is tinted. A screen where every accepted file glows green
 * spends its loudest colour on the rows that need nothing.
 */
export function FileRow({
  state,
  name,
  meta,
  action,
  onRemove,
}: {
  state: FileState
  name: string
  /** What it matched and what it yielded, or the check it stopped at.
   *  Never a guess at intent. */
  meta: ReactNode
  /** Retry, and only on a row a retry could change. */
  action?: ReactNode
  /** Taking a file back out. Present as soon as the file is, because the
   *  wrong file is noticed at the moment it is named. */
  onRemove?: () => void
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 transition-colors duration-base',
        state === 'error' && 'bg-danger-bg',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
          state === 'error'
            ? 'border-danger bg-surface-card text-danger-fg'
            : 'border-default bg-surface-sunken text-muted',
        )}
      >
        {state === 'checking' ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : name.toLowerCase().endsWith('.pdf') ? (
          <FileText className="h-4 w-4" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-medium text-default">{name}</span>
        <span
          className={cn('truncate text-sm', state === 'error' ? 'text-danger-fg' : 'text-subtle')}
        >
          {meta}
        </span>
      </span>

      {state === 'ok' && (
        <CircleCheck aria-hidden className="h-4 w-4 shrink-0 text-success-500" />
      )}
      {action}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      )}
    </li>
  )
}

/* ------------------------------------------------------------ action slot */

const ActionSlotContext = createContext<HTMLElement | null>(null)

export function ActionSlotProvider({
  value,
  children,
}: {
  value: HTMLElement | null
  children: ReactNode
}) {
  return <ActionSlotContext.Provider value={value}>{children}</ActionSlotContext.Provider>
}

/**
 * Renders a step's own buttons into the shell's bottom bar.
 *
 * Every step ends the same way — a person pressing something — so every step
 * ends in the same place on screen. Step 1 is the only one whose actions
 * change as you move through it (choose files, skip, continue, replace), and
 * before this it paid for that by putting them inline halfway up the page
 * while the other six had a fixed bar. Same job, two positions, for no reason
 * the user could see.
 */
export function ActionSlot({ children }: { children: ReactNode }) {
  const host = useContext(ActionSlotContext)
  return host ? createPortal(children, host) : null
}
