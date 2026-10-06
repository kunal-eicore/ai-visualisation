import { CircleDashed } from 'lucide-react'
import { InfoTip } from '@/components/InfoTip'
import { cn } from '@/lib/cn'
import { TOTALS } from '../data'
import { RangeStrip, RangeLegend } from '../v2/RangeStrip'
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
} from '../v2/data'

/*
 * Where the system stands — four readings and nothing else.
 *
 * THE SAME FOUR AS V1, SAID THE WAY V2 SAYS THEM. V1 opened with a strip of
 * four tiles, which is the right amount to put above the fold and the right
 * amount to hold in the head. What was wrong with it was not the count, it
 * was what the tiles said: a gap in points against a human drawn as a point,
 * a confidence bias nobody on this side of the business can act on. So V3
 * keeps the count and replaces the contents — the headline is the range
 * reading, and the three beside it are where mistakes were caught, what was
 * never suggested at all, and what is still sitting with a person.
 *
 * ONE READING PER COLUMN, NO SECOND ROW. The headline gets its own half
 * because the strip needs the width to be a picture rather than a smudge; the
 * three supporting measures share the other half at a third each. Nothing
 * here expands, filters or reorders: it is the top of the page and the top of
 * the page is not a place to make somebody choose.
 */

export function Standing() {
  const standing = standingOf(SYSTEM_ACCURACY, HUMAN_ALL)

  return (
    <section className="border-t border-subtle bg-surface-card">
      <div className="grid grid-cols-1 gap-x-8 gap-y-7 px-8 py-7 xl:grid-cols-12">
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
            <Verdict standing={standing} band={HUMAN_ALL} />
          </div>

          {/* No interval whisker here. The week-by-week band below is where a
              reading's precision is argued; on the headline it added a third
              mark to a strip whose whole job is system-against-people. */}
          <RangeStrip system={SYSTEM_ACCURACY} band={HUMAN_ALL} size="page" className="mt-5" />
          <div className="mt-1 flex justify-between font-mono text-xs text-muted">
            <span>50%</span>
            <span>100%</span>
          </div>

          <div className="mt-4">
            <RangeLegend />
          </div>
        </div>

        {/* A share, the population it came out of, and the fragment of it that
            is bad news. A bare count has no size; a sentence explaining the
            denominator turns a verdict back into prose. */}
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
function Verdict({ standing, band }: { standing: ReturnType<typeof standingOf>; band: HumanBand }) {
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
  of: string
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
 * It survives the cut that took everything else off this band because it is
 * the one line that stops the headline above it from being read as accuracy.
 * Acceptance is not correctness, and nothing in the product records a
 * correction made after Apply.
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
        <span className="mt-1.5 block text-neutral-400">Affects: {INTEGRITY_CHECK.affects.join(', ')}.</span>
      </InfoTip>
    </div>
  )
}
