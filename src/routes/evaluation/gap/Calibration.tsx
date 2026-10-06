import { InfoTip } from '@/components/InfoTip'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeading } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { CALIBRATION, type CalibrationBucket } from './data'

/** A bucket is over-confident when it states more than it delivers. A
 *  three-point tolerance keeps small buckets from reading as a defect. */
const drift = (b: CalibrationBucket) => b.actual - b.stated

/**
 * Stated confidence against what was kept.
 *
 * Sits beside the gap chart rather than under it because the two are read
 * together: a system that closes the gap while its confidence is wrong has
 * become harder to supervise, not easier. The confidence is the reviewer's
 * only triage signal, so where it is wrong decides where attention goes.
 */
export function Calibration() {
  return (
    /* h-full and a distributing body: this tile and the gap chart are one
       bento row, and whichever of the two is shorter absorbs the slack across
       its five buckets rather than leaving a dead band under the last one. */
    <Card className="h-full">
      <div className="flex items-start gap-1.5">
        <CardHeading
          title="Confidence against outcome"
          subtitle="Where the system says it is sure, and whether it was."
        />
        <InfoTip label="Confidence against outcome" align="right">
          Every decision carries the confidence the system stated at the time. Those decisions are
          bucketed by that number, and each bucket is scored on how often the person kept the value
          as generated. A well-calibrated bucket sits on its own band: 0.9 stated should be kept
          about 90% of the time. The bar is what was kept; the marker is what was claimed. Read the
          volume alongside it, since a wide miss on 168 decisions and a narrow one on 1,060 are not
          the same finding.
        </InfoTip>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3.5">
        {CALIBRATION.map((b) => {
          const d = drift(b)
          const off = d < -3
          return (
            <div key={b.band} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xs text-subtle">{b.band}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted">{b.n} decisions</span>
                  <Badge tone={off ? 'danger' : 'success'}>
                    {`${d > 0 ? '+' : ''}${d} pts`}
                  </Badge>
                </span>
              </div>

              {/* What was kept as the fill, stated confidence as the marker
                  sitting on it — one track, so the distance between the claim
                  and the result is the thing you see. */}
              <div className="relative h-2 w-full rounded-full bg-neutral-200">
                <div
                  className={cn('h-2 rounded-full', off ? 'bg-danger-500' : 'bg-success-500')}
                  style={{ width: `${b.actual}%` }}
                />
                <span
                  aria-hidden
                  className="absolute top-[-3px] h-[14px] w-0.5 rounded-full bg-neutral-800"
                  style={{ left: `calc(${b.stated}% - 1px)` }}
                />
              </div>

              <p className="text-xs text-muted">
                stated <span className="font-mono text-subtle">{b.stated}%</span>, kept{' '}
                <span className="font-mono text-subtle">{b.actual}%</span>
              </p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
