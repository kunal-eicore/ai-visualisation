import { Ban, Check, Play, TriangleAlert, X } from 'lucide-react'
import { InfoTip } from '@/components/InfoTip'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Tabs } from '@/components/ui/Tabs'
import { cn } from '@/lib/cn'
import { detailFor, type Run, type RunDetail, type Span } from './data'

export const DETAIL_TABS = ['Metrics', 'Trace'] as const
export type DetailTab = (typeof DETAIL_TABS)[number]

const SCORE_TONE: Record<'good' | 'bad' | 'muted', string> = {
  good: 'text-success-fg',
  bad: 'text-danger-fg',
  muted: 'text-default',
}

type RunDetailPanelProps = {
  run: Run
  tab: DetailTab
  onTabChange: (next: DetailTab) => void
  onRunTest: () => void
}

/**
 * The per-run drill-down, rendered inside the table's expansion row
 * (§4.19 lists an expansion row as a table atom). A Card (§4.8) with an
 * underline Tab strip (§4.7) as its header.
 */
export function RunDetailPanel({ run, tab, onTabChange, onRunTest }: RunDetailPanelProps) {
  const detail = detailFor(run)

  return (
    <div className="animate-fade-up overflow-hidden rounded-lg border border-default bg-surface-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle px-4">
        <Tabs aria-label="Run detail view" options={DETAIL_TABS} value={tab} onChange={onTabChange} />
        <div className="flex items-center gap-3 py-2">
          <span className="text-sm text-subtle">
            Run <span className="font-mono font-semibold text-default">{run.no}</span> ·{' '}
            <span className="font-mono">{run.caseRef}</span>
          </span>
          <Button size="sm" icon={<Play aria-hidden className="h-3.5 w-3.5" />} onClick={onRunTest}>
            Run test
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-subtle">{detail.summary}</p>
        {tab === 'Metrics' ? <Metrics detail={detail} /> : <Trace spans={detail.spans} />}
        <Callout>Side effects are suppressed at the tool layer — a re-run writes nothing.</Callout>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/* The four per-run scores are the same four on every run, so their
 * definitions live here rather than in each fixture. */
const SCORE_INFO: Record<string, string> = {
  'Field agreement':
    'How many of the six gating fields the agent matched the underwriter on. Only these six count towards the corpus agreement rate; free-text wording is compared in the table below but never gates.',
  'Model confidence':
    "The agent's own stated confidence in this decision, 0 to 1. On its own it means nothing — it is worth reading against whether the run was actually right, which is what the corpus calibration error aggregates.",
  'Evidence sufficiency':
    'How much retrieved material the decision actually rested on, in chunks. Thin evidence with high confidence is the pattern behind most of the Edge-tier disagreements.',
  'Input parity':
    'Whether the agent ran on byte-identical input to the human. If this ever says anything but matched, the comparison is void — the two were not answering the same question.',
}

/** §4.20 field composition — label column, value columns, verdict Badge. */
function Metrics({ detail }: { detail: RunDetail }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {detail.scores.map((s) => (
          <div key={s.label} className="flex flex-col gap-1.5 rounded-lg border border-default bg-surface-card p-4">
            <div className="flex items-center gap-1">
              <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</p>
              {SCORE_INFO[s.label] && <InfoTip label={s.label}>{SCORE_INFO[s.label]}</InfoTip>}
            </div>
            <p className={cn('font-mono text-md font-semibold', SCORE_TONE[s.tone])}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-default">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-subtle bg-surface-sunken text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="w-48 px-4 py-2.5 font-semibold">Field</th>
              <th className="px-4 py-2.5 font-semibold">Human</th>
              <th className="px-4 py-2.5 font-semibold">AI (shadow)</th>
              <th className="w-28 px-4 py-2.5 text-right font-semibold">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {detail.fields.map((f) => (
              <tr key={f.field} className="border-b border-subtle last:border-0">
                <td className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted">{f.field}</td>
                <td className="px-4 py-2.5 text-base text-default">{f.human}</td>
                <td className={cn('px-4 py-2.5 text-base', f.agree ? 'text-default' : 'font-medium text-danger-fg')}>
                  {f.ai}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {f.agree ? (
                    <Badge tone="success" icon={<Check aria-hidden className="h-3 w-3" />}>Agree</Badge>
                  ) : (
                    <Badge tone="danger" icon={<X aria-hidden className="h-3 w-3" />}>Differ</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

const SPAN_STATUS: Record<Span['status'], { fg: string; Icon: typeof Check; bar: string }> = {
  ok:         { fg: 'text-success-fg', Icon: Check,         bar: 'bg-primary/70' },
  warn:       { fg: 'text-warning-fg', Icon: TriangleAlert, bar: 'bg-warning-400' },
  suppressed: { fg: 'text-muted',      Icon: Ban,           bar: 'bg-neutral-400' },
}

/**
 * Suppressed tool calls stay as first-class spans — struck through, no
 * duration. Tool-layer suppression is the guarantee the whole shadow
 * product rests on, so the trace is where you verify it held.
 */
function Trace({ spans }: { spans: Span[] }) {
  const max = Math.max(...spans.map((s) => s.ms), 1)
  const total = spans.reduce((sum, s) => sum + s.ms, 0)
  const flagged = spans.filter((s) => s.status === 'warn').length
  const blocked = spans.filter((s) => s.status === 'suppressed').length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Execution trace</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">
            <span className="font-mono">{spans.length}</span> spans ·{' '}
            <span className="font-mono">{total}ms</span> total
          </span>
          {flagged > 0 && (
            <Badge tone="warning" icon={<TriangleAlert aria-hidden className="h-3 w-3" />}>{`${flagged} flagged`}</Badge>
          )}
          {blocked > 0 && (
            <Badge tone="neutral" icon={<Ban aria-hidden className="h-3 w-3" />}>{`${blocked} suppressed`}</Badge>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-default">
        {spans.map((s) => {
          const status = SPAN_STATUS[s.status]
          const suppressed = s.status === 'suppressed'
          return (
            <div
              key={s.label}
              className="flex items-center gap-3 border-b border-subtle px-4 py-2 last:border-0 hover:bg-surface-sunken"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2" style={{ paddingLeft: `${s.depth * 20}px` }}>
                <status.Icon aria-hidden className={cn('h-3.5 w-3.5 shrink-0', status.fg)} />
                <span className={cn('truncate font-mono text-sm', suppressed ? 'text-muted line-through' : 'text-default')}>
                  {s.label}
                </span>
                <span className="truncate text-xs text-muted">{s.detail}</span>
              </div>

              <div className="hidden w-40 shrink-0 items-center sm:flex">
                <div className="h-1 w-full rounded-full bg-neutral-200">
                  <div
                    className={cn('h-1 rounded-full', status.bar)}
                    style={{ width: `${Math.max((s.ms / max) * 100, s.ms > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-xs text-muted">
                {suppressed ? '—' : `${s.ms}ms`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
