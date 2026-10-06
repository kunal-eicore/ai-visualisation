import { X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { CLASSES, RUNG_TONE, accuracyOf, autonomyOf, gapOf } from './data'

/**
 * The five decision classes, in the order the run reaches them.
 *
 * The list on the page is ranked by gap because that is the finding; this
 * one is in journey order because that is how the workflow is explained to
 * someone who has not seen it. Same data, two orders, and the order is the
 * only difference between them.
 */
export function ClassesPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close decision classes"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/20"
      />

      <aside
        role="dialog"
        aria-label="Decision classes in the group health quotation"
        className="animate-fade-in relative flex h-full w-full max-w-[520px] flex-col overflow-hidden border-l border-default bg-surface-card shadow-panel"
      >
        <div className="flex items-start justify-between gap-3 border-b border-subtle px-5 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-default">Decision classes</h2>
            <p className="text-sm text-subtle">
              Group health quotation, in the order the run reaches them.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          {CLASSES.map((c, i) => (
            <div key={c.id} className="flex gap-3 rounded-lg border border-default bg-surface-card p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-100 font-mono text-xs font-semibold text-subtle">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-default">{c.name}</h3>
                  <Badge tone={RUNG_TONE[c.rung]}>{c.rung}</Badge>
                  <span className="font-mono text-xs text-muted">{c.steps.join(', ')}</span>
                </div>

                <dl className="flex flex-col gap-1.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">Decides</dt>
                    <dd className="text-subtle">{c.decides}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">Stops at</dt>
                    <dd className="text-subtle">{c.stops}</dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
                  <span>{c.touchpoints.length} touchpoints</span>
                  <span>{c.decisions} decisions</span>
                  <span className="text-success-fg">{accuracyOf(c)}% accepted</span>
                  <span className="text-info-fg">{autonomyOf(c)}% unaided</span>
                  <span className="text-warning-fg">{gapOf(c)} pts to benchmark</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
