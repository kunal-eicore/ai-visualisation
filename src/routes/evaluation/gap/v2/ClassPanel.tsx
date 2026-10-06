import { useState } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { Tabs } from '@/components/ui/Tabs'
import { cn } from '@/lib/cn'
import {
  acceptRateAt,
  autonomyOf,
  settledOf,
  type DecisionClass,
  type Touchpoint,
} from '../data'
import { ClassContainment } from './Containment'
import { RunLog } from './RunLog'
import { DriverSplit, DriverTag } from './Driver'
import { Traces } from './Traces'
import { RangeStrip } from './RangeStrip'
import { Sparkline } from './Sparkline'
import { RangeReading } from './RangeReading'
import { cohortsFor, coverageOf, coverageParts, handoffsOf, historyOf, standingOf } from './data'

/*
 * What is inside a class. Rendered in the sheet beside the table — see
 * `ClassSheet` for why it is no longer wedged into the row.
 *
 * Two things are promoted out of tooltips, both from audit gap A8. `stops` —
 * what the class refuses to do — is the clearest confidence asset the data
 * holds and was the hardest thing on V1 to find. And `absent` finally gets
 * drawn: it is the one shortfall that is not a defect, and folding it inside
 * a coverage percentage meant the screen could not tell a blind spot from a
 * document nobody had.
 */

export function ClassPanel({ c, strips = true }: { c: DecisionClass; strips?: boolean }) {
  const [tab, setTab] = useState<Tab>(TABS[0])
  const coverage = coverageOf(c)
  const handoffs = handoffsOf(c)

  return (
    <div className="px-6 py-6">
      {/* Scope. What it is allowed to decide, and where that stops.
          Two columns split by a hairline, not a card: they are a pair of
          equal readings, and boxing one made the limit look like an aside
          pinned to the side of the remit rather than half of it.
          FULL WIDTH, and the figures below it rather than beside it. Sharing
          the row with three figures left each of the five things about 90px,
          which is how a panel with plenty of room in it still reads as
          crammed: not too much content, too many columns. */}
      <div className="grid grid-cols-1 gap-y-5 md:grid-cols-2 md:gap-x-8 md:divide-x md:divide-subtle">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">What it decides</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-default">{c.decides}</p>
        </div>
        <div className="md:pl-8">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Where it stops</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-default">{c.stops}</p>
        </div>
      </div>

      {/* The class's own figures.
          THREE, NOT FIVE, AND EVERY ONE A SHARE. `Used as-is` is printed
          twice already — in the sheet header, and in the row this opened
          from. `Suggested` and `A person had to add it` were two halves of
          one reading, and the half that can be acted on is the one a person
          had to supply, so they are one figure now. Each leads with a ratio
          because a bare count has no size: 602 is neither good nor bad until
          the population it came out of is next to it. */}
      <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 border-t border-default pt-5 sm:grid-cols-3">
        <Figure
          k="No person needed"
          v={`${autonomyOf(c)}%`}
          sub={`${settledOf(c).toLocaleString('en-IN')} of ${c.decisions.toLocaleString('en-IN')}`}
        />
        {/* Coverage, not its complement — same reading as the top band, same
            direction. The blind spot keeps its count on the second line. */}
        <Figure
          k="Values it filled in"
          v={`${coverage.coverage}%`}
          sub={`${coverage.proposed.toLocaleString('en-IN')} of ${coverage.expected.toLocaleString('en-IN')} · ${coverage.added.toLocaleString('en-IN')} by a person`}
        />
        <Figure
          k="Waiting on a person"
          v={`${Math.round((handoffs.open / handoffs.handed) * 100)}%`}
          sub={`${handoffs.open.toLocaleString('en-IN')} of ${handoffs.handed.toLocaleString('en-IN')}`}
        />
      </dl>

      {/* TABS, NOT STACKED SECTIONS.
          Everything below used to run one after another, which made the panel
          a page you scrolled rather than a thing you read: the defect matrix
          and the cohort table have nothing to say to each other, and putting
          them end to end asked the reader to scroll past whichever one they
          did not want. One at a time, and the panel is the height of one
          section. Nothing was cut to do it.

          AND THE RUN LOG IS ONE OF THEM, not a takeover reached from a button
          inside `Example cases`. A view that replaces the tab bar it was
          opened from leaves the reader somewhere the panel's own navigation
          cannot describe — which is what the back control was there to
          compensate for, and it was the only way out. A tab says where you
          are and gets you out in one click. */}
      <div className="mt-6 border-t border-default">
        <Tabs aria-label={`${c.name} detail`} options={TABS} value={tab} onChange={setTab} />
      </div>

      {/* `bare` drops each section's own rule and heading — the tab above is
          already the heading, and a second one under it says the same word
          twice. */}
      <div className="border-t border-default pt-5">
        {tab === 'Each value it fills in' && <ClassTouchpoints c={c} bare />}
        {tab === 'Example cases' && <Traces c={c} bare />}
        {tab === 'Where it holds up' && (
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 2xl:grid-cols-2">
            <ClassCohorts c={c} bare strips={strips} />
            <ClassContainment c={c} bare />
          </div>
        )}
        {tab === 'Run log' && <RunLog c={c} />}
      </div>
    </div>
  )
}

/* Run log last: the first three are the class, and this is the population
   underneath them — the thing an auditor opens and a manager never does. */
const TABS = ['Each value it fills in', 'Example cases', 'Where it holds up', 'Run log'] as const
type Tab = (typeof TABS)[number]

function Figure({
  k,
  v,
  sub,
  tone,
}: {
  k: string
  v: string
  sub: string
  tone?: 'danger'
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className={cn('mt-0.5 font-mono text-lg leading-none', tone === 'danger' ? 'text-danger-fg' : 'text-default')}>
        {v}
      </dd>
      <dd className="mt-1 text-xs text-muted">{sub}</dd>
    </div>
  )
}

/**
 * The same class, split by whether the pack arrived as a file or as an image.
 *
 * This began as a page-level `Split by` control and belongs here instead: it
 * is not a different scope for the whole screen, it is a second reading of one
 * row — the answer to "does this class hold up on a harder pack". Putting it
 * in the expansion also means it costs nothing until somebody asks for it,
 * where a scope control charges every reader for a question most of them are
 * not asking.
 *
 * The underwriters are measured per cohort too, and degrade less than the
 * system does. That asymmetry is the whole reason the cut is worth drawing:
 * if people fell away on scans as fast as the system, a scanned pack would be
 * hard rather than a weakness.
 */
export function ClassCohorts({
  c,
  bare,
  strips = true,
}: {
  c: DecisionClass
  bare?: boolean
  /** Draw the range strip, or print the reading. A 120px strip on a 50-100
   *  axis gives a nine-point spread about twenty pixels, which is a graphic
   *  you have to already know to read. */
  strips?: boolean
}) {
  const rows = cohortsFor(c)

  return (
    <div className={bare ? undefined : 'mt-6 border-t border-default pt-4'}>
      <div className={bare ? 'hidden' : 'flex items-center gap-1.5'}>
        <h4 className="text-sm font-semibold text-default">By document quality</h4>
        <InfoTip label="By document quality">
          The same decisions, split by whether the pack was readable text or a scan. Underwriters lose less on
          a scan than the system does, so the distance widens rather than holding.
        </InfoTip>
      </div>

      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="border-b border-subtle text-left">
            <Th className="w-[34%]">Documents</Th>
            <Th className="text-right">How many</Th>
            <Th className="text-right">Used as-is</Th>
            <Th className="w-[26%]">Vs underwriters</Th>
            <Th className="text-right">No person</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const standing = standingOf(r.accuracy, r.band)
            return (
              <tr key={r.cohort.id} className="border-b border-subtle last:border-0">
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-1 font-medium text-default">
                    {r.cohort.name}
                    <InfoTip label={r.cohort.name}>{r.cohort.what}</InfoTip>
                  </span>
                </td>
                <td className="py-2 pl-3 text-right font-mono text-subtle">
                  {r.decisions.toLocaleString('en-IN')}
                </td>
                <td
                  className={cn(
                    'py-2 pl-3 text-right font-mono',
                    standing === 'below' ? 'text-warning-fg' : 'text-default',
                  )}
                >
                  {r.accuracy}%
                </td>
                <td className="py-2 pr-3">
                  {strips ? (
                    <RangeStrip system={r.accuracy} band={r.band} size="row" />
                  ) : (
                    <RangeReading system={r.accuracy} band={r.band} />
                  )}
                </td>
                <td className="py-2 pl-3 text-right font-mono text-subtle">{r.unaided}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function ClassTouchpoints({ c, bare }: { c: DecisionClass; bare?: boolean }) {
  return (
    /* A rule above it, like every other section in this panel. Without one
       it ran straight on from the defect matrix, and the blend bar opposite
       the heading read as belonging to the matrix rather than to this. */
    <div className={bare ? undefined : 'mt-6 border-t border-default pt-4'}>
      {!bare && <h4 className="text-sm font-semibold text-default">Each value it fills in</h4>}

      {/* The class's blend, which the table row carries and the panel did not
          — the detail behind a column has to contain the column. Labelled with
          the name of the column it summarises, and sitting directly above it,
          so there is no question what it is counting. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-xs font-medium text-muted">Comes from</span>
        <DriverSplit c={c} />
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-default text-left">
              <Th className="w-[32%]">Value</Th>
              <Th className="w-[10%]">Comes from</Th>
              <Th className="w-[28%]">Suggested</Th>
              <Th className="w-[10%] text-right">Used as-is</Th>
              <Th className="w-[14%] text-right">Trend</Th>
            </tr>
          </thead>
          <tbody>
            {c.touchpoints.map((t) => (
              <TouchpointRow key={t.id} t={t} />
            ))}
          </tbody>
        </table>
      </div>

      <CoverageLegend />
    </div>
  )
}

function TouchpointRow({ t }: { t: Touchpoint }) {
  return (
    <tr className="border-b border-subtle align-middle last:border-0">
      <td className="py-2 pr-3">
        <span className="flex items-center gap-1 font-medium text-default">
          {t.name}
          <InfoTip label={t.name}>
            {t.what}
            <span className="mt-1.5 block text-neutral-400">{t.rule}</span>
            <span className="mt-1.5 block">{t.note}</span>
          </InfoTip>
        </span>
        {/* The step it fires in, under the name rather than in a column of
            its own: in a panel this width a column of repeated step names
            costs more than it says. */}
        <span className="mt-0.5 block text-xs text-muted">{t.step}</span>
      </td>
      <td className="py-2 pr-3">
        <DriverTag t={t} />
      </td>
      <td className="py-2 pr-3">
        <CoverageBar t={t} />
      </td>
      <td className="py-2 pr-3 text-right font-mono text-default">{acceptRateAt(t)}%</td>
      {/* The trend alone. This cell also carried "68 not in docs", which is
          a second reading of the hatched segment two columns left and had
          nothing to do with the line beside it — two unrelated numbers in one
          cell is the clutter, not the count. */}
      <td className="py-2 text-right">
        <span className="flex justify-end">
          <Sparkline values={historyOf(t)} label={`${t.name} — used as-is`} />
        </span>
      </td>
    </tr>
  )
}

/**
 * Coverage as one bar with three meanings, only one of which is a defect.
 *
 * Proposed is the system doing its job. `added` is the blind spot — the value
 * was there to be had and a person supplied it. `absent` is nobody having it,
 * and it is drawn as an open hatch rather than a fill precisely so it does not
 * read as a third kind of failure. V1 computed this number and never showed
 * it, which meant a touchpoint at 78% coverage looked identical whether the
 * missing fifth was a blind spot or a document that does not exist.
 */
function CoverageBar({ t }: { t: Touchpoint }) {
  const { proposed, added, absent, coverage } = coverageParts(t)
  const pc = (n: number) => `${(n / t.expected) * 100}%`

  return (
    <span className="flex items-center gap-2">
      <span
        className="flex h-3 flex-1 overflow-hidden rounded-sm border border-default bg-surface-sunken"
        role="img"
        aria-label={`${proposed} suggested, ${added} added by a person, ${absent} not in the documents, of ${t.expected} needed.`}
      >
        <span className="bg-primary" style={{ width: pc(proposed) }} />
        {added > 0 && <span className="border-l border-neutral-0 bg-warning-400" style={{ width: pc(added) }} />}
        {absent > 0 && (
          <span
            className="border-l border-neutral-0"
            style={{
              width: pc(absent),
              backgroundImage: 'repeating-linear-gradient(45deg, #b0b0c4 0 1.5px, #f9f9fb 1.5px 5px)',
            }}
          />
        )}
      </span>
      <span className="w-9 shrink-0 text-right font-mono text-xs text-muted">{coverage}%</span>
    </span>
  )
}

function CoverageLegend() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5">
      <Key className="bg-primary" label="Suggested" />
      <Key className="bg-warning-400" label="A person added it" />
      <Key
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #b0b0c4 0 1.5px, #f9f9fb 1.5px 5px)' }}
        label="Not in the documents"
      />
    </div>
  )
}

function Key({ className, style, label }: { className?: string; style?: React.CSSProperties; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-subtle">
      <span aria-hidden className={cn('h-3 w-5 rounded-sm border border-default', className)} style={style} />
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */


function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn('pb-1.5 text-xs font-medium text-muted', className)}>
      {children}
    </th>
  )
}
