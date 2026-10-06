import { CircleDashed } from 'lucide-react'
import { InfoTip } from '@/components/InfoTip'
import { cn } from '@/lib/cn'
import { TOTALS } from '../data'
import { RangeStrip, RangeLegend } from './RangeStrip'
import {
  CONTAINED_SHARE,
  COVERAGE_TOTAL,
  HUMAN_ALL,
  HUMAN_RATERS,
  HANDOFF_TOTAL,
  INTEGRITY_CHECK,
  STANDING_LABEL,
  SETTLED_ALL,
  SYSTEM_ACCURACY,
  standingOf,
  type HumanBand,
} from './data'

/*
 * The verdict, which is the whole reframing of V2 in one band.
 *
 * V1 opened with four equal tiles, the first of which read "Gap to benchmark:
 * 5 pts". That sentence has a hidden premise — that the human is a point — and
 * once the premise is drawn rather than assumed, the reading changes: the
 * system is inside the range of the people doing the same work. Same data,
 * same decisions, different and more defensible claim.
 *
 * The three measures beside it are the axes V1 could not see at all. None of
 * them is a value claim and none of them is a clock: where a mistake was
 * caught, what the system never suggested at all, and whether the questions it
 * asked people were ever answered. What this page does not say anywhere is
 * what any of it is worth, because that is a different question with a
 * different audience.
 *
 * All three are labelled in the words the reader already uses. The precise
 * house terms — containment, coverage, handoff — are what made the tiles need
 * a paragraph each to be legible at all.
 *
 * Underneath, the one thing that cannot be measured yet, stated as a check
 * that has not got its data rather than quietly left out.
 */

export function Verdict({ ci }: { ci: number }) {
  const standing = standingOf(SYSTEM_ACCURACY, HUMAN_ALL)

  return (
    <section className="border-t border-subtle bg-surface-card">
      <div className="grid grid-cols-1 gap-x-8 gap-y-7 px-8 py-7 xl:grid-cols-12">
        {/* The verdict itself. */}
        <div className="xl:col-span-5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Used as-is</h2>
            <InfoTip label="Used as-is">
              Of everything the system suggested, how often the underwriter kept it without changing it. The
              same measure, on the same decisions, for {HUMAN_RATERS} underwriters.
            </InfoTip>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-mono text-4xl font-medium leading-none text-default">{SYSTEM_ACCURACY}%</span>
            <Standing standing={standing} band={HUMAN_ALL} />
          </div>

          <RangeStrip system={SYSTEM_ACCURACY} ci={ci} band={HUMAN_ALL} size="page" className="mt-5" />
          <div className="mt-1 flex justify-between font-mono text-xs text-muted">
            <span>50%</span>
            <span>100%</span>
          </div>

          <div className="mt-4">
            <RangeLegend />
          </div>
        </div>

        {/* The three axes V1 had no reading for.
            A RATIO, ITS DENOMINATOR, AND THE ONE FRAGMENT THAT MATTERS. Two
            passes got this wrong in opposite directions. A bare count —
            "Suggested nothing: 1,204" — has no size, so there is nothing in
            it to decide from. Then the fix wrote the denominator out as a
            sentence, and three sentences under three tiles turned a verdict
            back into prose. What is left is a share, the population it came
            out of, and the fragment that is bad news, separated the way every
            other meta line on this page separates things. */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-3 xl:col-span-7">
          {/* WHY THE THIRD MEASURE IS NOT THE HANDOFF QUEUE.
              This column used to read `Waiting on a person` — open handoffs
              over handoffs made — and it was the weakest thing on the band.
              It is a property of STAFFING, not of the system: a red 14% there
              means somebody has not answered, and nothing the system does
              moves it. And it is a share of a share, so it quietly shrinks
              its own denominator — 98 open out of 613 asks says nothing about
              the five thousand decisions the rest of the band is about.

              What replaces it is the throughput claim, and it is the only
              reading here that answers "how much of this work did it take off
              the desk": everything the classes put a value on, over
              everything they were asked to decide. It shares its denominator
              with the run log's labels — every run is settled, asked, or done
              by a person instead — so the band and the log count the same
              population. The queue is not lost; it is the flag line
              underneath, which is where a number nobody on this screen can
              act on belongs. */}
          <Measure
            label="Finished on its own"
            value={`${Math.round((SETTLED_ALL / TOTALS.decisions) * 100)}%`}
            of={`${SETTLED_ALL.toLocaleString('en-IN')} of ${TOTALS.decisions.toLocaleString('en-IN')} decisions`}
            flag={`${HANDOFF_TOTAL.open.toLocaleString('en-IN')} asks still open`}
            tone="danger"
          />

          {/* COVERAGE SAID FORWARD, NOT AS A SHORTFALL.
              This was `Values it missed` at 4% — the same measurement read
              from its bad end. A band of three readings where one is a defect
              rate makes the reader change direction mid-scan: two figures
              where high is good, one where high is bad, and no mark to say
              which is which. It is also the wrong claim to lead with, because
              the number being small is the finding and a small number reads
              as a small achievement.

              So the headline is what it put forward, and the blind spot — the
              value that was there to be had and a person supplied instead —
              is the flag underneath, where every other bad fragment on this
              band sits. Nothing is hidden: 743 is still printed, and the
              coverage bar in the class panel still splits it three ways. */}
          <Measure
            label="Values it filled in"
            value={`${COVERAGE_TOTAL.coverage}%`}
            of={`${COVERAGE_TOTAL.proposed.toLocaleString('en-IN')} of ${COVERAGE_TOTAL.expected.toLocaleString('en-IN')} needed`}
            flag={`${COVERAGE_TOTAL.added.toLocaleString('en-IN')} a person had to supply`}
            tone="warning"
          />

          <Measure
            label="Caught early"
            value={`${CONTAINED_SHARE.share}%`}
            of={`${(CONTAINED_SHARE.total - CONTAINED_SHARE.after).toLocaleString('en-IN')} of ${CONTAINED_SHARE.total.toLocaleString('en-IN')} mistakes`}
            flag={`${CONTAINED_SHARE.after.toLocaleString('en-IN')} reached the quote`}
            tone="warning"
          />
        </div>
      </div>

      <IntegrityRow />
    </section>
  )
}

/** In range or out of it, said the way a lab result says it. */
function Standing({ standing, band }: { standing: ReturnType<typeof standingOf>; band: HumanBand }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span
        className={cn(
          'rounded-md border px-1.5 py-0.5 text-xs font-medium',
          standing === 'inside'
            ? 'border-success bg-success-bg text-success-fg'
            : 'border-warning bg-warning-bg text-warning-fg',
        )}
      >
        {STANDING_LABEL[standing]}
      </span>
      <span className="text-sm text-subtle">
        underwriters{' '}
        <span className="font-mono text-default">
          {band.lo}-{band.hi}%
        </span>
        , average <span className="font-mono text-default">{band.mid}%</span>
      </span>
    </span>
  )
}

function Measure({
  label,
  value,
  of,
  flag,
  tone,
}: {
  label: string
  value: string
  /** The population the share came out of. A ratio without one has no size. */
  of: string
  /** The fragment of it that is bad news, where there is one. */
  flag?: string
  tone?: 'warning' | 'danger'
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</h3>
      <p className="mt-2 font-mono text-2xl font-medium leading-none text-default">{value}</p>
      <p className="mt-1.5 text-xs text-muted">
        {of}
        {flag && (
          <>
            {' · '}
            <span className={tone === 'danger' ? 'text-danger-fg' : tone === 'warning' ? 'text-warning-fg' : ''}>
              {flag}
            </span>
          </>
        )}
      </p>
    </div>
  )
}

/**
 * The check that has not got its data.
 *
 * Rendered in the same shape as one that passed, because the alternative —
 * leaving it off — is what let V1 rest its whole argument on "the person kept
 * it" without ever saying that acceptance and correctness are not the same
 * thing. An `unknown` here is not a gap in the build, it is the honest state
 * of the instrument.
 */
function IntegrityRow() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-subtle bg-surface-sunken px-8 py-3">
      <CircleDashed aria-hidden className="h-4 w-4 shrink-0 text-muted" />
      <span className="text-sm font-medium text-default">{INTEGRITY_CHECK.name}</span>
      <span className="rounded-md border border-neutral bg-neutral-bg px-1.5 py-0.5 font-mono text-xs text-neutral-fg">
        unknown
      </span>
      <span className="text-sm text-subtle">{INTEGRITY_CHECK.says}</span>
      <InfoTip label={INTEGRITY_CHECK.name} align="right">
        {INTEGRITY_CHECK.needs}
        <span className="mt-1.5 block text-neutral-400">
          Affects: {INTEGRITY_CHECK.affects.join(', ')}.
        </span>
      </InfoTip>
    </div>
  )
}
