import { useEffect, useMemo, useState } from 'react'
import { ChevronsDownUp, ChevronsUpDown, Download, TrendingDown, TrendingUp } from 'lucide-react'
import { InfoTip } from '@/components/InfoTip'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeading } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { MetricCard } from '@/components/ui/MetricCard'
import { Progress } from '@/components/ui/Progress'
import { Toast } from '@/components/ui/Toast'
import { AccuracyChart } from './AccuracyChart'
import { RunTable } from './RunTable'
import type { DetailTab } from './RunDetail'
import { ACCURACY, BY_TIER, RUNS, STATS, type Stat, type Tier } from './data'

const TIER_FILTERS = ['All tiers', 'Routine', 'Complex', 'Edge'] as const
type TierFilter = (typeof TIER_FILTERS)[number]

/**
 * Shadow parity — where a reviewer sees the drift between what the
 * underwriter decided and what the shadow agent would have decided on the
 * same frozen input. Read-only; fixtures live in `./data`.
 */
export function ShadowParity() {
  const [tier, setTier] = useState<TierFilter>('All tiers')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([RUNS[0].id]))
  const [tabs, setTabs] = useState<Record<string, DetailTab>>({})
  const [toast, setToast] = useState<number | null>(null)

  useEffect(() => {
    if (toast === null) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const runsFor = (t: TierFilter) => (t === 'All tiers' ? RUNS : RUNS.filter((r) => r.tier === (t as Tier)))
  const runs = useMemo(() => runsFor(tier), [tier])

  const allOpen = runs.length > 0 && runs.every((r) => expanded.has(r.id))

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () =>
    setExpanded((prev) => {
      const next = new Set(prev)
      runs.forEach((r) => (allOpen ? next.delete(r.id) : next.add(r.id)))
      return next
    })

  return (
    <div className="px-8 py-7">
      {toast !== null && (
        <Toast
          tone="loading"
          title="Shadow run queued"
          description={`Run ${toast} re-executes off-peak against the same input snapshot.`}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* §5 Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-default">Shadow Parity</h1>
            <Badge tone="brand">Underwriting referrals</Badge>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            Human decisions against the shadow agent's, on the same case and the same frozen input.
            Effects suppressed — nothing here was written to a policy.
          </p>
        </div>
        <Button variant="neutral" icon={<Download aria-hidden className="h-4 w-4" />}>
          Export pairs
        </Button>
      </div>

      {/* §4.15 KPI strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <MetricCard
            key={s.label}
            label={s.label}
            value={s.value}
            tone={s.tone}
            note={s.note}
            trend={trendFor(s)}
            info={s.info}
            /* The last card in the strip sits on the right edge — its
               tooltip opens inwards or it opens off-screen. */
            infoAlign={i === STATS.length - 1 ? 'right' : 'left'}
          />
        ))}
      </div>

      {/* §5 two-column body: primary content 2fr + side panel 1fr */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AccuracyChart points={ACCURACY} />
        </div>
        <TierParity />
      </div>

      {/* §4.19 filter bar — Chips, counter type. Chips, not Buttons (§4.6). */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Difficulty tier</span>
        <div role="group" aria-label="Difficulty tier" className="flex flex-wrap items-center gap-2">
          {TIER_FILTERS.map((opt) => (
            <Chip
              key={opt}
              label={opt}
              count={runsFor(opt).length}
              selected={tier === opt}
              // Re-selecting the active chip clears back to "All tiers" (§4.6).
              onClick={() => setTier(tier === opt ? 'All tiers' : opt)}
            />
          ))}
        </div>
        <Button
          variant="text"
          size="sm"
          className="ml-auto"
          onClick={toggleAll}
          icon={
            allOpen ? (
              <ChevronsDownUp aria-hidden className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown aria-hidden className="h-3.5 w-3.5" />
            )
          }
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </Button>
      </div>

      <Card bare className="mt-3 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle px-4 py-3">
          <div className="flex items-start gap-1.5">
            <CardHeading title="Run comparison" subtitle="Open a run to inspect its metrics and trace in place." />
            <InfoTip label="Run comparison">
              One row per pair: the underwriter's decision and the shadow agent's, taken on the same case
              and the same frozen input snapshot. Open a row for the field-by-field diff and the agent's
              execution trace — writes it would have made are kept in the trace as suppressed spans, so
              you can see what it tried to do without anything reaching a policy.
            </InfoTip>
          </div>
          <span className="font-mono text-xs text-muted">
            {runs.length} run{runs.length === 1 ? '' : 's'}
          </span>
        </div>
        <RunTable
          runs={runs}
          expanded={expanded}
          tabs={tabs}
          onToggle={toggle}
          onTabChange={(id, t) => setTabs((prev) => ({ ...prev, [id]: t }))}
          onRunTest={(id) => setToast(RUNS.find((r) => r.id === id)?.no ?? null)}
        />
      </Card>
    </div>
  )
}

/** §4.11 — a Trend Indicator is the Badge with a lucide trend icon. */
function trendFor(s: Stat) {
  if (!s.trend) return undefined
  const Icon = s.trend.dir === 'up' ? TrendingUp : TrendingDown
  return (
    <Badge tone={s.trend.tone} icon={<Icon aria-hidden className="h-3 w-3" />}>
      {s.trend.label}
    </Badge>
  )
}

/**
 * Parity split by difficulty tier. Sits beside the aggregate deliberately —
 * a headline agreement rate routinely hides a failing tier, and promotion
 * decisions are made per tier, not on the average.
 */
function TierParity() {
  return (
    <Card>
      <div className="flex items-center gap-1.5">
        <h2 className="text-md font-semibold text-default">Parity by tier</h2>
        <InfoTip label="Parity by tier" align="right">
          The same agreement rate, computed inside each difficulty tier instead of across the corpus.
          Tiers are assigned on the case before the run, so the split is not drawn after the fact. A bar
          turns red below the 80% promotion gate. Read this before the headline: 62.5% aggregate here is
          three tiers — one at parity, one failing in both directions, and one with too few runs to gate
          on at all.
        </InfoTip>
      </div>
      <p className="-mt-2 text-sm text-subtle">Promote on a tier, never on the aggregate.</p>

      <div className="flex flex-col gap-4">
        {BY_TIER.map((row) => (
          <div key={row.tier} className="flex flex-col gap-1">
            <Progress label={row.tier} value={row.agreement} tone={row.agreement < 80 ? 'danger' : 'success'} />
            <p className="text-xs text-muted">
              <span className="font-mono">{row.runs}</span> runs · {row.note}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
