import { useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Chip } from '@/components/ui/Chip'
import { InfoTip } from '@/components/InfoTip'
import { cn } from '@/lib/cn'
import { OUTCOME_ATTENTION, OUTCOME_TONE, type DecisionClass } from '../data'
import { DriverTag } from './Driver'
import { SpanList } from './Traces'
import {
  OUTCOMES,
  RUN_SAMPLE,
  STATE_LABEL,
  STATE_TONE,
  USE_LABEL,
  USE_SHORT,
  isDefect,
  runsFor,
  tallyOf,
  type Run,
} from './runs'

/*
 * Every run in the class, and what became of the system's work on it.
 *
 * WHERE IT SITS. The last of the panel's four tabs. The first three are the
 * class — what it fills in, a few example cases, where it holds up — and this
 * is the population underneath them: the thing an auditor opens and a manager
 * never does. It was briefly a takeover reached from a button at the foot of
 * `Example cases`, which put the reader in a view the tab bar no longer
 * described and made a breadcrumb the only way back out. A tab costs nothing
 * until it is clicked and is its own way back.
 *
 * TWO LEVELS, NOT A NESTED EXPANSION. The log is a table and the breakdown is
 * a table, and putting the second inside a row of the first is the mistake
 * the class expansion already made once — every column of the outer table
 * breaks around it. Selecting a run replaces the log with the run, and the
 * breadcrumb goes back. One thing on screen at a time, full width.
 */

export function RunLog({ c }: { c: DecisionClass }) {
  const runs = useMemo(() => runsFor(c), [c])
  const [filter, setFilter] = useState<'all' | (typeof OUTCOMES)[number]>('all')
  const [open, setOpen] = useState<Run | null>(null)

  const counts = useMemo(
    () => Object.fromEntries(OUTCOMES.map((o) => [o, runs.filter((r) => r.outcome === o).length])),
    [runs],
  ) as Record<(typeof OUTCOMES)[number], number>

  const shown = filter === 'all' ? runs : runs.filter((r) => r.outcome === filter)

  return (
    <div>
      {open ? (
        <RunDetail run={open} onBack={() => setOpen(null)} />
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold text-default">Was the system&rsquo;s work used</h4>
              <InfoTip label="Was the system's work used">
                Every run is scored on whether what the system produced carried it, which is a different
                question from whether the quotation was right. A run that asked a person is not counted
                against it; a run where a person supplied the value it never offered is.
              </InfoTip>
            </div>
            <span className="font-mono text-xs text-muted">
              {RUN_SAMPLE} of {c.decisions.toLocaleString('en-IN')} runs
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Chip label="All" count={runs.length} selected={filter === 'all'} onClick={() => setFilter('all')} />
            {OUTCOMES.filter((o) => counts[o] > 0).map((o) => (
              <Chip
                key={o}
                label={USE_SHORT[o]}
                count={counts[o]}
                selected={filter === o}
                onClick={() => setFilter(filter === o ? 'all' : o)}
              />
            ))}
          </div>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-default text-left">
                <Th className="w-[19%]">When</Th>
                <Th className="w-[17%]">Reference</Th>
                <Th className="w-[24%]">Client</Th>
                <Th className="w-[18%]">Values it produced</Th>
                <Th className="w-[22%]">Was it used</Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <RunRow key={r.id} r={r} onOpen={() => setOpen(r)} />
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

/*
 * One way back, and it is a button all the way across.
 *
 * The first version of this was a breadcrumb trail — a decorative chevron,
 * then two text links, then the current reference. The chevron was the thing
 * that looked like the control and was the one part of it that did nothing,
 * and each link was a word-sized target. This is the whole row: the arrow is
 * inside the button, the label names where it goes, and the run's own
 * reference sits outside it as a heading, not as a link to itself.
 */
function BackTo({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-subtle transition-colors duration-base hover:bg-surface-sunken hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
    >
      <ChevronLeft aria-hidden className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  )
}

function RunRow({ r, onOpen }: { r: Run; onOpen: () => void }) {
  const t = tallyOf(r)

  return (
    <tr
      onClick={onOpen}
      className="group cursor-pointer border-b border-subtle transition-colors duration-base last:border-0 hover:bg-surface-sunken"
    >
      <td className="py-2 pr-3 font-mono text-xs text-muted">{r.at}</td>
      <td className="py-2 pr-3">
        <button
          type="button"
          aria-haspopup="true"
          onClick={(e) => {
            e.stopPropagation()
            onOpen()
          }}
          className="rounded-sm font-mono text-xs text-default underline-offset-2 group-hover:underline focus-visible:outline-none focus-visible:shadow-focus"
        >
          {r.ref}
        </button>
      </td>
      <td className="py-2 pr-3 text-default">{r.client}</td>
      {/* The count, not a bar. Six values with one changed is a reading a
          reader takes in whole; a six-segment bar at this width is not. */}
      <td className="py-2 pr-3">
        <span className="font-mono text-xs text-subtle">
          {t.kept} of {t.total} kept
        </span>
        {t.defects > 0 && (
          <span className="ml-2 font-mono text-xs text-warning-fg">
            {t.defects} {t.defects === 1 ? 'defect' : 'defects'}
          </span>
        )}
      </td>
      <td className="py-2">
        {/* The dot is for the rows that are asking for something — see
            `OUTCOME_ATTENTION`. Thirty-two dotted badges mark nothing. */}
        <Badge tone={OUTCOME_TONE[r.outcome]} dot={OUTCOME_ATTENTION[r.outcome]}>
          {USE_LABEL[r.outcome]}
        </Badge>
      </td>
    </tr>
  )
}

/* ------------------------------------------------------------------ */

function RunDetail({ run, onBack }: { run: Run; onBack: () => void }) {
  const t = tallyOf(run)

  return (
    <div>
      <BackTo label="All runs" onBack={onBack} />

      <div className="mt-2 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h4 className="text-md font-semibold text-default">{run.client}</h4>
          <p className="mt-0.5 font-mono text-xs text-muted">
            {run.ref} · {run.at}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-mono text-xs text-muted">conf {run.confidence.toFixed(2)}</span>
          <Badge tone={OUTCOME_TONE[run.outcome]} dot={OUTCOME_ATTENTION[run.outcome]}>
            {USE_LABEL[run.outcome]}
          </Badge>
        </div>
      </div>

      {/* The run in one line of figures, so the table below is a breakdown of
          something rather than the only place the answer is. */}
      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-y border-default py-3">
        <Fig k="Used as-is" v={`${t.kept} of ${t.total}`} />
        <Fig k="A person acted" v={`${t.defects}`} tone={t.defects > 0 ? 'danger' : undefined} />
        <Fig k="Not in pack" v={`${t.absent}`} />
        <Fig k="Settled at" v={run.decidedAt} mono={false} />
      </dl>

      <h5 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">
        Each value, and what became of it
      </h5>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="border-b border-subtle text-left">
            <Th className="w-[38%]">Value</Th>
            <Th className="w-[16%]">Comes from</Th>
            <Th className="w-[46%]">What happened</Th>
          </tr>
        </thead>
        <tbody>
          {run.values.map((v) => (
            <tr key={v.t.id} className="border-b border-subtle align-top last:border-0">
              <td className="py-2 pr-3">
                <span className="flex items-center gap-1 font-medium text-default">
                  {v.t.name}
                  <InfoTip label={v.t.name}>
                    {v.t.what}
                    <span className="mt-1.5 block text-neutral-400">{v.t.rule}</span>
                  </InfoTip>
                </span>
                <span className="mt-0.5 block text-xs text-muted">{v.t.step}</span>
              </td>
              <td className="py-2 pr-3">
                <DriverTag t={v.t} />
              </td>
              <td className="py-2">
                <Badge tone={STATE_TONE[v.state]} dot={isDefect(v.state)}>
                  {STATE_LABEL[v.state]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {run.trace && (
        <>
          <h5 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Steps, in order</h5>
          <p className="mt-1 text-sm text-default">{run.trace.summary}</p>
          <SpanList spans={run.trace.spans} />
        </>
      )}
    </div>
  )
}

function Fig({ k, v, tone, mono = true }: { k: string; v: string; tone?: 'danger'; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd
        className={cn(
          'mt-0.5 text-md leading-none',
          mono && 'font-mono',
          tone === 'danger' ? 'text-danger-fg' : 'text-default',
        )}
      >
        {v}
      </dd>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn('pb-1.5 text-xs font-medium text-muted', className)}>
      {children}
    </th>
  )
}
