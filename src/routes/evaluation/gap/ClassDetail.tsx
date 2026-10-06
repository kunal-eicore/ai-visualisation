import { useState } from 'react'
import { Ban, Check, ChevronDown, ChevronRight, CircleSlash, PencilLine, TriangleAlert, UserRound } from 'lucide-react'
import { InfoTip } from '@/components/InfoTip'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { cn } from '@/lib/cn'
import {
  DRIVER_FG,
  DRIVER_LABEL,
  OUTCOME_LABEL,
  OUTCOME_TONE,
  absentAt,
  accuracyOf,
  autonomyOf,
  coverageAt,
  modifiedAt,
  ruleShareOf,
  type DecisionClass,
  type Span,
  type Touchpoint,
  type Trace,
} from './data'

const TABS = ['Touchpoints', 'Traces'] as const
type Tab = (typeof TABS)[number]

/**
 * The open class, rendered as a REGION rather than a card.
 *
 * It already sits inside the matrix's card, in the row that opened it, so a
 * border of its own would be a box inside a box — and the tables inside that
 * would be a third. Regions here are divided by hairlines and separated by
 * ground, never by nested containers (the same rule the eval workbench runs
 * on). Nothing inside this file draws a rounded border.
 *
 * The class name and its rung are deliberately NOT repeated: they are on the
 * row directly above, and an expansion that restates its own header is the
 * other half of the same clutter.
 */
export function ClassDetail({ decisionClass: c }: { decisionClass: DecisionClass }) {
  const [tab, setTab] = useState<Tab>('Touchpoints')
  const pct = (n: number) => (n / c.decisions) * 100

  return (
    <div className="px-1">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 px-3">
        <Tabs aria-label={`${c.name} detail`} options={TABS} value={tab} onChange={setTab} />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 py-2">
          <Metric value={`${accuracyOf(c)}%`} label="accepted" tone="text-success-fg" />
          <Metric value={`${autonomyOf(c)}%`} label="unaided" tone="text-info-fg" />
          <Metric value={c.decisions.toLocaleString('en-IN')} label="decisions" tone="text-default" />
          <Metric value={`${ruleShareOf(c)}%`} label="by rule" tone="text-muted" />

          <span className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="flex h-1.5 overflow-hidden rounded-full bg-neutral-200">
              <span className="bg-success-500" style={{ width: `${pct(c.accepted)}%` }} />
              <span className="bg-danger-500" style={{ width: `${pct(c.modified)}%` }} />
              <span className="bg-info-400" style={{ width: `${pct(c.handed)}%` }} />
              <span className="bg-warning-400" style={{ width: `${pct(c.added)}%` }} />
            </span>
            <span className="flex flex-wrap items-center gap-x-3 font-mono text-xs">
              <Key className="bg-success-500" n={c.accepted} label="accepted" />
              <Key className="bg-danger-500" n={c.modified} label="modified" />
              <Key className="bg-info-400" n={c.handed} label="handed off" />
              <Key className="bg-warning-400" n={c.added} label="added" />
            </span>
          </span>
        </div>
      </div>

      <div className="border-t border-default">
        {tab === 'Touchpoints' ? <Touchpoints touchpoints={c.touchpoints} /> : <Traces traces={c.traces} />}
      </div>
    </div>
  )
}

function Metric({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={cn('font-mono text-md font-semibold', tone)}>{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </span>
  )
}

function Key({ className, n, label }: { className: string; n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', className)} />
      {n} {label}
    </span>
  )
}

/* ------------------------------------------------------------------ *
 * Touchpoints
 * ------------------------------------------------------------------ */

/**
 * Four count columns because there are four outcomes and they take four
 * different fixes. Accepted is working. Modified is capability. Added is a
 * blind spot — the value was there and a person had to supply it. Absent is
 * the only one that is not a defect, and it stays visible so the other three
 * cannot quietly absorb it.
 *
 * Driven by sits before them because it changes what all four mean. A
 * touchpoint that is 100% rule and 98% kept is a correct table; the same
 * numbers at 0% rule are a capable reader, and only the second is evidence
 * about the model. It is a word and a percentage rather than a bar: the row
 * already spends its one bar on coverage, and a second would read as another
 * measure of the same thing.
 */
const n = (v: number) => v.toLocaleString('en-IN')

/**
 * The driver word, and the split behind it on hover.
 *
 * The word alone is a summary and the summary rounds: `rule` at 96% and
 * `rule` at 100% read identically in the cell, and the difference between
 * them is 38 values a person had to think about. So the breakdown is one
 * hover away rather than absent — and it is a split BAR plus counts, not a
 * second percentage. The row already carries a percentage one column over on
 * a different denominator, and two ratios side by side that do not divide by
 * the same thing is a misreading waiting to happen. Counts cannot be confused
 * with the ratio beside them.
 *
 * Built on the InfoTip hover pattern rather than the component, because the
 * trigger has to be the word itself: an "i" here would be the third icon in
 * a row that already has two. The word takes a dotted underline and a help
 * cursor so the hover is discoverable, which the native title it replaced
 * was not.
 */
function DriverCell({ touchpoint: t }: { touchpoint: Touchpoint }) {
  const byRule = Math.round((t.proposed * t.ruleShare) / 100)
  const byModel = t.proposed - byRule

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`${DRIVER_LABEL[t.driver]} — ${n(byRule)} of ${n(t.proposed)} values from the rule`}
        className={cn(
          'cursor-help font-mono text-xs font-medium underline decoration-dotted underline-offset-4',
          'rounded-sm focus-visible:outline-none focus-visible:shadow-focus',
          DRIVER_FG[t.driver],
        )}
      >
        {DRIVER_LABEL[t.driver]}
      </button>

      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute top-7 left-0 z-30 w-60 rounded-md bg-neutral-900 px-2.5 py-2 shadow-classic',
          'opacity-0 transition-opacity duration-base group-hover:opacity-100 group-focus-within:opacity-100',
        )}
      >
        <span className="mb-2 block text-xs leading-relaxed text-inverse">
          Of {n(t.proposed)} values proposed here:
        </span>

        {/* One track, split where the rule stops — the same shape the row's
            other bars use, so the proportion is read the same way. */}
        <span className="mb-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
          <span className="bg-neutral-400" style={{ width: `${t.ruleShare}%` }} />
          <span className="flex-1 bg-brand-400" />
        </span>

        <span className="flex flex-col gap-1 font-mono text-xs text-inverse">
          <SplitKey className="bg-neutral-400" n={byRule} label="from the rule" />
          <SplitKey className="bg-brand-400" n={byModel} label="from the model" />
        </span>
      </span>
    </span>
  )
}

function SplitKey({ className, n: count, label }: { className: string; n: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', className)} />
      <span className="w-12 shrink-0 text-right">{n(count)}</span>
      <span className="text-neutral-400">{label}</span>
    </span>
  )
}

/** The named rule, for the touchpoint's own tip. */
function driverLine(t: Touchpoint) {
  if (t.driver === 'model') return `No rule stands behind it. ${t.rule}`
  return `Rule: ${t.rule}`
}

function Touchpoints({ touchpoints }: { touchpoints: Touchpoint[] }) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-subtle text-xs font-semibold uppercase tracking-wide text-muted">
          <th className="w-[38%] px-3 py-2 font-semibold">Touchpoint</th>
          <th className="w-40 px-3 py-2 font-semibold">Step</th>
          <th className="w-32 px-3 py-2 font-semibold">
            <span className="inline-flex items-center gap-1">
              Driven by
              <InfoTip label="Driven by">
                What produced the value. A rule is a lookup, a mapping, a validation or arithmetic —
                configuration somebody wrote, returning the same answer for the same input. A model
                reads or judges. Mixed means the rule covers part of the input and the model takes
                the rest. It changes what the counts beside it mean: a high Kept on a rule is a
                correct table, the same figure on a model is a capable reader, and the two take
                different fixes. Open a touchpoint for the rule itself.
              </InfoTip>
            </span>
          </th>
          <th className="w-36 px-3 py-2 font-semibold">
            <span className="inline-flex items-center gap-1">
              Proposed
              <InfoTip label="Proposed">
                How often the system put a value forward, out of the times one was needed. The
                shortfall is not a wrong answer, it is no answer — and the last two columns split it
                into the part a person then filled in, which is a blind spot, and the part nobody
                had, which is simply absent from the pack.
              </InfoTip>
            </span>
          </th>
          <th className="w-20 px-3 py-2 text-right font-semibold">Kept</th>
          <th className="w-20 px-3 py-2 text-right font-semibold">Edited</th>
          <th className="w-20 px-3 py-2 text-right font-semibold">Added</th>
          <th className="w-20 px-3 py-2 text-right font-semibold">Absent</th>
        </tr>
      </thead>
      <tbody>
        {touchpoints.map((t) => {
          const coverage = coverageAt(t)
          return (
            <tr key={t.id} className="border-b border-subtle last:border-0">
              <td className="px-3 py-2">
                <span className="flex items-center gap-1.5">
                  <span className="text-base font-medium text-default">{t.name}</span>
                  <InfoTip label={t.name}>
                    {t.what} {t.note} {driverLine(t)}
                  </InfoTip>
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">{t.step}</td>
              <td className="whitespace-nowrap px-3 py-2">
                <DriverCell touchpoint={t} />
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <span className="flex items-center gap-2" title={`${t.proposed} of ${t.expected} proposed`}>
                  <span className="h-1 w-12 shrink-0 rounded-full bg-neutral-200">
                    <span
                      className={cn(
                        'block h-1 rounded-full',
                        coverage >= 95 ? 'bg-success-500' : coverage >= 85 ? 'bg-warning-400' : 'bg-danger-400',
                      )}
                      style={{ width: `${coverage}%` }}
                    />
                  </span>
                  <span className="font-mono text-xs text-muted">{coverage}%</span>
                </span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-sm text-default">{t.accepted}</td>
              <td className="px-3 py-2 text-right font-mono text-sm text-danger-fg">{modifiedAt(t)}</td>
              <td className="px-3 py-2 text-right font-mono text-sm text-warning-fg">{t.added}</td>
              <td className="px-3 py-2 text-right font-mono text-sm text-disabled">{absentAt(t)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/* ------------------------------------------------------------------ *
 * Traces
 * ------------------------------------------------------------------ */

const SPAN_STATUS: Record<Span['status'], { fg: string; bar: string; Icon: typeof Check; label: string }> = {
  ok:         { fg: 'text-success-fg', bar: 'bg-primary/70',  Icon: Check,         label: 'ok' },
  warn:       { fg: 'text-warning-fg', bar: 'bg-warning-400', Icon: TriangleAlert, label: 'flagged' },
  failed:     { fg: 'text-danger-fg',  bar: 'bg-danger-500',  Icon: PencilLine,    label: 'edited' },
  missed:     { fg: 'text-warning-fg', bar: 'bg-neutral-300', Icon: CircleSlash,   label: 'never ran' },
  handoff:    { fg: 'text-info-fg',    bar: 'bg-info-400',    Icon: UserRound,     label: 'asked' },
  suppressed: { fg: 'text-muted',      bar: 'bg-neutral-400', Icon: Ban,           label: 'held' },
}

/**
 * One recorded execution per hairline-divided row, opening in place. A span
 * that never ran stays in the trace at zero duration rather than being
 * omitted — omitting it would make an unobserved step indistinguishable from
 * one that passed, which is the confusion the Added and Absent columns exist
 * to prevent.
 */
function Traces({ traces }: { traces: Trace[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set([traces[0]?.id]))

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div>
      {traces.map((t) => {
        const isOpen = open.has(t.id)
        const Chevron = isOpen ? ChevronDown : ChevronRight
        return (
          <div key={t.id} className="border-b border-subtle last:border-0">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggle(t.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-base hover:bg-surface-card focus-visible:outline-none focus-visible:shadow-focus"
            >
              <Chevron aria-hidden className="h-4 w-4 shrink-0 text-muted" />
              <span className="shrink-0 font-mono text-sm font-semibold text-default">{t.ref}</span>
              <Badge tone={OUTCOME_TONE[t.outcome]}>{OUTCOME_LABEL[t.outcome]}</Badge>
              {t.handoff && <Badge tone="info">{`${t.handoff.kind} to ${t.handoff.to}`}</Badge>}
              <span className="min-w-0 flex-1 truncate text-sm text-subtle">{t.subject}</span>
              <span className="shrink-0 font-mono text-xs text-muted">{t.confidence.toFixed(2)}</span>
              <span className="hidden shrink-0 font-mono text-xs text-muted lg:inline">{t.at}</span>
            </button>

            {isOpen && (
              <div className="animate-fade-up">
                <p className="flex flex-wrap items-baseline gap-x-2 pb-2 pl-10 pr-3 text-sm text-subtle">
                  {t.summary}
                  <span className="font-mono text-xs text-muted">settled at {t.decidedAt}</span>
                </p>
                <SpanList spans={t.spans} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SpanList({ spans }: { spans: Span[] }) {
  const max = Math.max(...spans.map((s) => s.ms), 1)
  return (
    <div className="pb-1 pl-10 pr-3">
      {spans.map((s, i) => {
        const meta = SPAN_STATUS[s.status]
        const Icon = meta.Icon
        return (
          <div
            key={`${s.label}-${i}`}
            /* The trace's own rule, drawn once down the left of the spans —
               it groups them to their trace without boxing them. */
            className="grid grid-cols-[1.2fr_2fr_0.5fr] items-start gap-3 border-l border-subtle py-1.5 pl-3"
          >
            <span className="flex min-w-0 items-center gap-2" style={{ paddingLeft: s.depth * 12 }}>
              <Icon aria-hidden className={cn('h-3.5 w-3.5 shrink-0', meta.fg)} />
              <span
                className={cn(
                  'truncate text-sm font-medium',
                  s.status === 'suppressed' ? 'text-muted line-through' : 'text-default',
                )}
              >
                {s.label}
              </span>
              <span className={cn('shrink-0 font-mono text-xs', meta.fg)}>{meta.label}</span>
            </span>

            <span className="text-xs text-subtle">{s.detail}</span>

            <span className="flex items-center justify-end gap-2">
              <span className="h-1 w-12 rounded-full bg-neutral-100">
                <span className={cn('block h-1 rounded-full', meta.bar)} style={{ width: `${(s.ms / max) * 100}%` }} />
              </span>
              <span className="w-12 shrink-0 text-right font-mono text-xs text-muted">
                {s.ms === 0 ? 'none' : `${s.ms}ms`}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
