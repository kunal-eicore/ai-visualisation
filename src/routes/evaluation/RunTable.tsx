import { Fragment } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, Equal } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { RunDetailPanel, type DetailTab } from './RunDetail'
import type { Drift, Run, Tier } from './data'

/* §3.2 — direction beside a value is ArrowUp/ArrowDown, never an arrow
 * glyph. The three outcomes read as one status family because they are all
 * the Badge primitive (§4.11), not a second chip style. */
const DRIFT: Record<Drift, { label: string; tone: Tone; Icon: typeof ArrowUp }> = {
  match:    { label: 'Match',       tone: 'success', Icon: Equal },
  stricter: { label: 'AI stricter', tone: 'warning', Icon: ArrowUp },
  looser:   { label: 'AI looser',   tone: 'danger',  Icon: ArrowDown },
}

const TIER_TONE: Record<Tier, Tone> = { Routine: 'neutral', Complex: 'info', Edge: 'brand' }

const COLSPAN = 7

type RunTableProps = {
  runs: Run[]
  expanded: Set<string>
  tabs: Record<string, DetailTab>
  onToggle: (id: string) => void
  onTabChange: (id: string, tab: DetailTab) => void
  onRunTest: (id: string) => void
}

/**
 * Human decision, drift, then shadow decision, so a row reads left-to-right as
 * one sentence. Rows expand in place into a detail card, which keeps the
 * detail anchored to the run it belongs to.
 *
 * §4.19 table kit: column headers Semibold 12 uppercase on a sunken band,
 * 1px border/subtle between rows, hover `brand/bg` for a selectable row.
 */
export function RunTable({ runs, expanded, tabs, onToggle, onTabChange, onRunTest }: RunTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-subtle bg-surface-sunken text-xs font-semibold uppercase tracking-wide text-muted">
            <th className="w-20 px-4 py-2.5 font-semibold">Run #</th>
            <th className="px-4 py-2.5 font-semibold">Case</th>
            <th className="px-4 py-2.5 font-semibold">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="h-0.5 w-3 rounded-full bg-success-500" />
                Human
              </span>
            </th>
            <th className="w-36 px-4 py-2.5 text-center font-semibold">Drift</th>
            <th className="px-4 py-2.5 font-semibold">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="h-0.5 w-3 rounded-full bg-primary" />
                AI (shadow)
              </span>
            </th>
            <th className="px-4 py-2.5 font-semibold">Largest gap</th>
            <th className="w-10 px-4 py-2.5">
              <span className="sr-only">Expand</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const drift = DRIFT[run.drift]
            const open = expanded.has(run.id)
            return (
              <Fragment key={run.id}>
                <tr
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => onToggle(run.id)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    onToggle(run.id)
                  }}
                  className={cn(
                    'group cursor-pointer transition-colors duration-base focus-visible:outline-none focus-visible:shadow-focus',
                    open ? 'bg-brand-bg' : 'border-b border-subtle hover:bg-brand-bg',
                  )}
                >
                  <td className="px-4 py-3">
                    <span className={cn('font-mono text-base font-semibold', open ? 'text-brand' : 'text-default')}>
                      {run.no}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-medium text-default">{run.caseRef}</span>
                      <Badge tone={TIER_TONE[run.tier]}>{run.tier}</Badge>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted">{run.subject}</div>
                  </td>
                  <td className="px-4 py-3 text-base font-medium text-success-fg">{run.human}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={drift.tone} icon={<drift.Icon aria-hidden className="h-3 w-3" />}>
                      {drift.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-base font-medium text-brand">{run.ai}</td>
                  <td className="px-4 py-3 text-sm text-subtle">{run.delta}</td>
                  <td className="px-4 py-3 text-muted">
                    <ChevronRight
                      aria-hidden
                      className={cn(
                        'h-4 w-4 transition-transform duration-base',
                        open ? 'rotate-90 text-brand' : 'group-hover:translate-x-0.5 group-hover:text-default',
                      )}
                    />
                  </td>
                </tr>

                {/* §4.19 expansion row */}
                {open && (
                  <tr className="border-b border-subtle bg-brand-bg">
                    <td colSpan={COLSPAN} className="px-4 pb-4 pt-0">
                      <RunDetailPanel
                        run={run}
                        tab={tabs[run.id] ?? 'Metrics'}
                        onTabChange={(t) => onTabChange(run.id, t)}
                        onRunTest={() => onRunTest(run.id)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
