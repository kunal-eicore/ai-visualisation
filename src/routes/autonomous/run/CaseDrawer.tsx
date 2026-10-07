import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, X } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Throbber } from '@/components/ui/Throbber'
import { cn } from '@/lib/cn'
import { formatInr } from '../queue/data'
import { stageProgress, viewOf, type CaseState, type CaseView } from './engine'
import { clientOf } from './parts'
import { DONE, OUTCOME_OF, SCRIPT_BY_ID, STAGES, formatClock } from './script'

/**
 * One case, opened beside the run. Geometry follows the Company profile edit
 * panel (Figma giNrgEoSsSwLA1K5Aob8JK, 22:1362): 720 wide over a scrim, a
 * bordered header with a 32px neutral close, titled sections in the body, and
 * a bordered footer with the meta on the left and the actions on the right.
 *
 * The run keeps going underneath, and the panel reads from the live state, so
 * the trace grows while it is open.
 */
export function CaseDrawer({
  c,
  running,
  onClose,
  onPause,
  onUnblock,
  onRetry,
}: {
  c: CaseState
  running: boolean
  onClose: () => void
  onPause: () => void
  onUnblock: () => void
  onRetry: () => void
}) {
  const s = SCRIPT_BY_ID[c.id]
  const v = viewOf(c)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    if (!openerRef.current) openerRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      // After the frame, and only if the panel is really gone (StrictMode
      // runs this cleanup on its development double-mount too).
      setTimeout(() => {
        if (!document.querySelector('[data-case-drawer]')) openerRef.current?.focus?.()
      }, 0)
    }
  }, [onClose])

  // Follow the trace as it grows, unless the reader has scrolled up into it.
  const steps = c.trace.length
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [steps])

  const status = statusOf(c, v)

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close case"
        onClick={onClose}
        className="fixed inset-0 z-40 animate-fade-in cursor-default bg-neutral-900/40"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={clientOf(c.id)}
        data-case-drawer
        className="fixed inset-y-0 right-0 z-50 flex w-[720px] max-w-full animate-sheet-in flex-col border-l border-default bg-surface-card shadow-panel"
      >
        <header className="flex items-center gap-3 border-b border-default py-[18px] pl-6 pr-5">
          <div className="min-w-0">
            <p className="font-mono text-xs text-subtle">{s.row.quotationNo}</p>
            <h2 className="truncate text-md font-semibold text-default">{clientOf(c.id)}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close case"
            className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-btn-neutral bg-btn-neutral text-default transition-colors duration-base hover:border-btn-neutral-hover hover:bg-btn-neutral-hover focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </header>

        <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          <Section title="Case">
            <dl className="grid grid-cols-3 gap-x-6 gap-y-3.5">
              <Field label="Plan" value={s.row.plan ?? '—'} />
              <Field label="Business type" value={s.row.businessType} />
              <Field label="Segment" value={s.row.segment === 'group' ? 'Group' : 'Retail'} />
              <Field label="Sum insured" value={formatInr(s.row.sumInsured ?? 0)} mono />
              <Field label="Premium" value={formatInr(s.row.premium)} mono />
              <Field label="Priority" value={s.row.priority} />
            </dl>
          </Section>

          <Section title="Progress">
            <ol className="grid grid-cols-5 gap-1.5">
              {STAGES.map((stage, i) => {
                const fill = c.stage > i ? 1 : c.stage === i ? stageProgress(c) : 0
                const here = c.stage === i
                return (
                  <li key={stage.id} className="flex flex-col gap-1.5">
                    <span className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                      <span
                        className={cn(
                          'block h-full rounded-full transition-[width] duration-200 ease-linear',
                          here && v === 'blocked'
                            ? 'bg-warning-400'
                            : here && v === 'failed'
                              ? 'bg-danger-400'
                              : here && v === 'paused'
                                ? 'bg-neutral-500'
                                : 'bg-brand-500',
                        )}
                        style={{ width: `${fill * 100}%` }}
                      />
                    </span>
                    <span className={cn('text-xs', here ? 'font-semibold text-default' : 'text-subtle')}>{stage.label}</span>
                  </li>
                )
              })}
            </ol>
          </Section>

          {v === 'failed' && (
            <Section title="Error">
              <div className="flex items-center gap-3 rounded-lg border border-danger bg-danger-bg px-4 py-3">
                <p className="min-w-0 flex-1 text-base text-danger-fg">
                  {[...c.trace].reverse().find((t) => t.kind === 'error')?.text}
                </p>
              </div>
            </Section>
          )}

          {v === 'blocked' && (
            <Section title="Needs your attention">
              <div className="flex items-center gap-3 rounded-lg border border-warning bg-warning-bg px-4 py-3">
                <p className="min-w-0 flex-1 text-base text-default">{s.block?.reason}</p>
              </div>
            </Section>
          )}

          <Section title="Agent trace">
            {c.trace.length === 0 && v === 'queued' ? (
              <p className="text-sm text-subtle">Waiting for the {STAGES[Math.min(c.stage, DONE - 1)].agent.toLowerCase()}.</p>
            ) : (
              <ol className="flex flex-col">
                {c.trace.map((step, i) => {
                  const first = i === 0 || c.trace[i - 1].stage !== step.stage
                  return (
                    <li key={i} className="flex animate-fade-up flex-col">
                      {first && (
                        <span className="pb-1.5 pt-3 text-xs font-semibold text-subtle first:pt-0">
                          {STAGES[step.stage].agent}
                        </span>
                      )}
                      <span className="grid grid-cols-[48px_1fr] gap-3 py-1">
                        <span className="font-mono text-xs leading-5 text-muted">{formatClock(step.at)}</span>
                        <span
                          className={cn(
                            'text-sm',
                            step.kind === 'block'
                              ? 'font-medium text-warning-fg'
                              : step.kind === 'error'
                                ? 'font-medium text-danger-fg'
                                : step.kind === 'resume'
                                  ? 'text-brand'
                                  : 'text-default',
                          )}
                        >
                          {step.text}
                        </span>
                      </span>
                    </li>
                  )
                })}
                {v === 'working' && running && (
                  <li className="grid grid-cols-[48px_1fr] items-center gap-3 py-1">
                    <Throbber phase="thinking" size={18} />
                    <span className="text-sm text-subtle">{STAGES[c.stage].agent} is working</span>
                  </li>
                )}
              </ol>
            )}
          </Section>
        </div>

        <footer className="flex items-center gap-2.5 border-t border-default px-6 py-3.5">
          <Badge tone={status.tone} dot={v === 'blocked' || v === 'failed'}>
            {status.label}
          </Badge>
          {c.startedAt !== undefined && (
            <span className="font-mono text-xs text-muted">
              {c.resolvedAt !== undefined
                ? `Decided in ${formatClock(c.resolvedAt - c.startedAt)}`
                : `Started at ${formatClock(c.startedAt)}`}
            </span>
          )}
          <span className="flex-1" />
          {v !== 'done' && v !== 'blocked' && v !== 'failed' && (
            <Button
              variant="outline"
              size="sm"
              icon={c.paused ? <Play aria-hidden className="h-3.5 w-3.5" /> : <Pause aria-hidden className="h-3.5 w-3.5" />}
              onClick={onPause}
            >
              {c.paused ? 'Resume case' : 'Pause case'}
            </Button>
          )}
          {v === 'failed' && (
            <Button size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
          {v === 'blocked' && (
            <Button size="sm" onClick={onUnblock}>
              Unblock
            </Button>
          )}
        </footer>
      </aside>
    </>,
    document.body,
  )
}

function statusOf(c: CaseState, v: CaseView): { label: string; tone: Tone } {
  if (v === 'done') {
    const o = OUTCOME_OF[SCRIPT_BY_ID[c.id].outcome]
    return { label: o.label, tone: o.tone }
  }
  if (v === 'blocked') return { label: 'Needs your attention', tone: 'warning' }
  if (v === 'failed') return { label: 'Failed', tone: 'danger' }
  if (v === 'paused') return { label: `Paused at ${STAGES[c.stage].label}`, tone: 'neutral' }
  if (v === 'working') return { label: `In ${STAGES[c.stage].label}`, tone: 'brand' }
  return { label: `Waiting for ${STAGES[c.stage].label}`, tone: 'neutral' }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5">
      <h3 className="text-sm font-semibold text-default">{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={cn('truncate text-sm text-default', mono && 'font-mono')}>{value}</dd>
    </div>
  )
}
