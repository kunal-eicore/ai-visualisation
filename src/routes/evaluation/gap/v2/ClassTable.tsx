import { useMemo, useState } from 'react'
import { Columns3, Check } from 'lucide-react'
import { InfoTip } from '@/components/InfoTip'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { CLASSES, RUNG_TONE, accuracyOf, autonomyOf, gapOf, type DecisionClass } from '../data'
import { ClassSheet } from './ClassSheet'
import { DriverBar, DriverLegend } from './Driver'
import { RangeStrip } from './RangeStrip'
import { Sparkline } from './Sparkline'
import { classBand, containedShareOf, coverageOf, handoffsOf, standingOf } from './data'

/*
 * The spine of the page.
 *
 * Every other band above this one is a summary of it, so it is the thing that
 * has to survive being stared at. Two ideas hold it together.
 *
 * FIRST, IT IS A SHEET AND NOT A SET OF CARDS. V1's own notes record the
 * complaint that started its redesign — "way too many cards within cards" —
 * and answered it with one card per region. V2 goes one further: the table has
 * no container at all, and the only devices separating anything are hairlines,
 * ground and type. At ten columns, a border around the whole thing is just a
 * line that steals width.
 *
 * SECOND, EVERY MEASURED VALUE IS MONOSPACED AND EVERY LABEL IS NOT. That
 * split is the page's identity and it is load-bearing rather than decorative:
 * figures line up digit over digit down a column so they can be compared
 * without reading them, and the eye can tell a reading from a name before it
 * has parsed either.
 *
 * THIRD, IT OPENS IN THE ORDER THE WORK HAPPENS. It used to arrive ranked by
 * gap, because that ordering is the finding an evaluation engineer wants:
 * authority tracks the distance to a person, and the two classes running
 * Autonomous are the two inside their underwriters' range. That finding is
 * still one click away and it is still true — but it is an argument about the
 * rung system, and the reader this page opens for is checking their own
 * quotation flow against the band above. Journey order matches that band row
 * for row, so the two read as one thing rather than two orderings of it.
 *
 * It also opens with five columns rather than ten. The other five are real
 * readings and they are all in the picker; none of them is what somebody is
 * looking for before they have found the row they care about.
 */

type ColId = 'unaided' | 'rule' | 'contained' | 'coverage' | 'handoffs' | 'history'

const OPTIONAL: { id: ColId; label: string }[] = [
  { id: 'unaided', label: 'No person needed' },
  { id: 'rule', label: 'Comes from' },
  { id: 'contained', label: 'Caught early' },
  { id: 'coverage', label: 'Suggested' },
  { id: 'handoffs', label: 'Waiting' },
  { id: 'history', label: 'Trend' },
]

export function ClassTable() {
  const [order, setOrder] = useState<'gap' | 'journey'>('journey')
  /* Nothing is open on arrival. A drawer covering half the screen before
     anybody has clicked is a panel the reader has to dismiss to see the table
     it came out of. */
  const [open, setOpen] = useState<string | null>(null)
  const [cols, setCols] = useState<Set<ColId>>(new Set(['history']))
  const [picker, setPicker] = useState(false)

  const rows = useMemo(
    () => (order === 'gap' ? [...CLASSES].sort((a, b) => gapOf(b) - gapOf(a)) : CLASSES),
    [order],
  )
  const on = (c: ColId) => cols.has(c)
  const selected = open ? (CLASSES.find((c) => c.id === open) ?? null) : null

  return (
    <section className="border-t border-subtle bg-surface-card px-8 py-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-1.5">
          <div>
            <h2 className="text-md font-semibold text-default">The decisions it makes</h2>
            <p className="mt-0.5 text-sm text-subtle">
              Click a row to see what it decides, where it stops, and real cases.
            </p>
          </div>
          <InfoTip label="The decisions it makes">
            Each row is a kind of decision, and each one is allowed a different amount of freedom — the badge
            beside the name. They are ordered by how far the system is from the underwriters, because that
            distance is what decides how much freedom a row is given.
          </InfoTip>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={order}
            onChange={setOrder}
            options={[
              { id: 'journey', label: 'Order of the flow' },
              { id: 'gap', label: 'Biggest difference first' },
            ]}
          />
          <div className="relative">
            <button
              type="button"
              aria-expanded={picker}
              onClick={() => setPicker((p) => !p)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-btn-neutral bg-btn-neutral px-2.5 text-xs font-medium text-default shadow-control transition-colors duration-base hover:bg-btn-neutral-hover focus-visible:outline-none focus-visible:shadow-focus"
            >
              <Columns3 aria-hidden className="h-3.5 w-3.5" />
              Columns
            </button>
            {picker && (
              <>
                <button
                  type="button"
                  aria-label="Close column options"
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => setPicker(false)}
                />
                <div className="absolute right-0 top-9 z-30 w-52 rounded-md border border-default bg-surface-card p-1 shadow-popover">
                  {OPTIONAL.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={on(c.id)}
                      onClick={() =>
                        setCols((prev) => {
                          const next = new Set(prev)
                          if (next.has(c.id)) next.delete(c.id)
                          else next.add(c.id)
                          return next
                        })
                      }
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-default transition-colors duration-base hover:bg-surface-sunken focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                        {on(c.id) && <Check aria-hidden className="h-3.5 w-3.5 text-brand-fg" />}
                      </span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <Th className="w-[22%]">Decision</Th>
              <Th align="right">How many</Th>
              <Th align="right">Used as-is</Th>
              <Th className="w-[17%]">
                <span className="flex items-center gap-1">
                  Vs underwriters
                  <InfoTip label="Vs underwriters">
                    The dot is the system. The block behind it is the spread between the best and the worst
                    underwriter on the same decisions, with their average as the dark line. A dot inside the
                    block means the system is within the range the people themselves disagree over.
                  </InfoTip>
                </span>
              </Th>
              <Th align="right">Difference</Th>
              {on('unaided') && <Th align="right">No person</Th>}
              {on('rule') && <Th align="right">Comes from</Th>}
              {on('contained') && <Th align="right">Caught early</Th>}
              {on('coverage') && <Th align="right">Suggested</Th>}
              {on('handoffs') && <Th align="right">Waiting</Th>}
              {on('history') && <Th align="right">Trend</Th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <ClassRow
                key={c.id}
                c={c}
                cols={cols}
                open={open === c.id}
                onToggle={() => setOpen((p) => (p === c.id ? null : c.id))}
              />
            ))}
          </tbody>
        </table>
      </div>

      {on('rule') && (
        <div className="mt-3">
          <DriverLegend />
        </div>
      )}

      {selected && <ClassSheet c={selected} onClose={() => setOpen(null)} />}
    </section>
  )
}

function ClassRow({
  c,
  cols,
  open,
  onToggle,
}: {
  c: DecisionClass
  cols: Set<ColId>
  open: boolean
  onToggle: () => void
}) {
  const on = (x: ColId) => cols.has(x)
  const band = classBand(c)
  const accuracy = accuracyOf(c)
  const shown = OPTIONAL.filter((o) => on(o.id))
  /* Which column closes the outline on the right. The picker makes it move. */
  const lastCol: string = shown.length ? shown[shown.length - 1].id : 'gap'

  return (
    <>
      {/* Selection is an OUTLINE, not a fill. A grey wash reads as a disabled
          region; a rule drawn round the row reads as what it is — the row the
          open panel belongs to. It is the only thing tying the two together
          now that the panel is beside the table rather than inside it, so it
          closes on all four sides.

          THE WHOLE ROW IS THE TARGET. It used to be the name in the first
          cell, which is a link-sized hit area on a row eight columns wide:
          everything right of the name looked identical, hovered identically
          and did nothing when clicked. The button stays, because it is what a
          keyboard reaches and what carries `aria-expanded`; the row simply
          forwards its own clicks to it. */}
      <tr
        onClick={onToggle}
        className={cn(
          'group cursor-pointer transition-colors duration-base',
          !open && 'hover:bg-surface-sunken',
        )}
      >
        <Td first open={open} edge="l">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={(e) => {
              /* The row above already handles this click. Without the stop it
                 fires twice and the panel opens and closes again. */
              e.stopPropagation()
              onToggle()
            }}
            className="flex w-full items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:shadow-focus"
          >
            {/* No chevron. It promised a disclosure that opened in place, and
                the panel it opens is beside the table now; the row's outline
                is what says which one is open. */}
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate font-medium text-default">{c.name}</span>
                {/* The rung sits on the row rather than inside the panel,
                    because the ordering of this table IS the argument:
                    authority tracks the distance to a person, and that is
                    only visible if the rung is next to the distance. */}
                <Badge tone={RUNG_TONE[c.rung]}>{c.rung}</Badge>
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted">{c.steps.join(' · ')}</span>
            </span>
          </button>
        </Td>
        <Td align="right" open={open}>
          <Num>{c.decisions.toLocaleString('en-IN')}</Num>
        </Td>
        <Td align="right" open={open}>
          <span className="font-mono text-default">{accuracy}%</span>
        </Td>
        <Td open={open}>
          <RangeStrip system={accuracy} band={band} size="row" />
        </Td>
        <Td align="right" open={open} edge={lastCol === 'gap' ? 'r' : undefined}>
          <GapCell system={accuracy} band={band} />
        </Td>
        {on('unaided') && (
          <Td align="right" open={open} edge={lastCol === 'unaided' ? 'r' : undefined}>
            <Num>{autonomyOf(c)}%</Num>
          </Td>
        )}
        {on('rule') && (
          <Td align="right" open={open} edge={lastCol === 'rule' ? 'r' : undefined}>
            <span className="flex justify-end">
              <DriverBar c={c} />
            </span>
          </Td>
        )}
        {on('contained') && (
          <Td align="right" open={open} edge={lastCol === 'contained' ? 'r' : undefined}>
            <Num>{containedShareOf(c)}%</Num>
          </Td>
        )}
        {on('coverage') && (
          <Td align="right" open={open} edge={lastCol === 'coverage' ? 'r' : undefined}>
            <Num>{coverageOf(c).coverage}%</Num>
          </Td>
        )}
        {on('handoffs') && (
          <Td align="right" open={open} edge={lastCol === 'handoffs' ? 'r' : undefined}>
            <span className="font-mono text-subtle">{handoffsOf(c).open}</span>
          </Td>
        )}
        {on('history') && (
          <Td align="right" open={open} edge={lastCol === 'history' ? 'r' : undefined}>
            <span className="flex justify-end">
              <Sparkline values={c.history} label={`${c.name} — kept as generated`} />
            </span>
          </Td>
        )}
      </tr>
    </>
  )
}

/**
 * The distance, and whether it means anything.
 *
 * A gap inside the underwriters' own disagreement is drawn quietly; one that
 * falls below their worst reading is the only case worth colouring. V1 toned
 * every gap by a fixed threshold, which made a two-point gap on a class where
 * people agree exactly look the same as a two-point gap on a class where they
 * differ by fifteen.
 */
function GapCell({ system, band, small }: { system: number; band: { lo: number; hi: number; mid: number }; small?: boolean }) {
  const standing = standingOf(system, band)
  const gap = band.mid - system
  return (
    <span
      className={cn(
        'font-mono',
        small ? 'text-xs' : '',
        standing === 'below' ? 'text-warning-fg' : small ? 'text-muted' : 'text-subtle',
      )}
      title={standing === 'below' ? 'Below every underwriter measured' : 'Within the underwriter range'}
    >
      {gap > 0 ? `-${gap}` : `+${Math.abs(gap)}`}
    </span>
  )
}

/* ------------------------------------------------------------------ */

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string }[]
}) {
  return (
    <div role="group" aria-label="Row order" className="inline-flex rounded-md border border-default bg-surface-sunken p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'h-7 rounded-sm px-2.5 text-xs font-medium transition-colors duration-base focus-visible:outline-none focus-visible:shadow-focus',
            value === o.id ? 'bg-surface-card text-default shadow-control' : 'text-muted hover:text-default',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Th({
  children,
  align,
  className,
}: {
  children?: React.ReactNode
  align?: 'right'
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-default bg-surface-card pb-2 text-xs font-medium text-muted',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align,
  first,
  open,
  edge,
}: {
  children?: React.ReactNode
  align?: 'right'
  first?: boolean
  /** Part of the opened class — draws the top of the outline. */
  open?: boolean
  /** Closes the left or right side of it. */
  edge?: 'l' | 'r'
}) {
  return (
    <td
      className={cn(
        'py-2.5 align-middle',
        open ? 'border-b border-t border-strong' : 'border-b border-subtle',
        open && edge === 'l' && 'border-l border-strong pl-2',
        open && edge === 'r' && 'border-r border-strong pr-2',
        align === 'right' ? 'pl-3 text-right' : 'pr-3',
        first && 'pr-4',
      )}
    >
      {children}
    </td>
  )
}

function Num({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <span className={cn('font-mono', muted ? 'text-muted' : 'text-subtle')}>{children}</span>
}
