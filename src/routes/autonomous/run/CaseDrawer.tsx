import { useEffect, useRef, type ReactNode } from 'react'
import { Pause, Play, Square } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Throbber } from '@/components/ui/Throbber'
import { PanelSection, SidePanel } from '@/components/workspace/SidePanel'
import { cn } from '@/lib/cn'
import { formatInr } from '../queue/data'
import { stageProgress, stopReason, viewOf, type CaseState, type CaseView } from './engine'
import { clientOf } from './parts'
import { DONE, OUTCOME_OF, SCRIPT_BY_ID, STAGES, formatClock } from './script'

/**
 * One case, opened beside the run, on the house side panel.
 *
 * The run keeps going underneath, and the panel reads from the live state, so
 * the trace grows while it is open. Autonomous pauses a case; Hybrid stops it
 * instead (`onStop`), which hands it back off the line.
 */
export function CaseDrawer({
  c,
  running,
  onClose,
  onPause,
  onStop,
  onUnblock,
  onRetry,
  onApprove,
  onComplete,
}: {
  c: CaseState
  running: boolean
  onClose: () => void
  onPause?: () => void
  onStop?: () => void
  onUnblock: () => void
  onRetry: () => void
  onApprove: () => void
  onComplete: () => void
}) {
  const s = SCRIPT_BY_ID[c.id]
  const v = viewOf(c)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Follow the trace as it grows, unless the reader has scrolled up into it.
  const steps = c.trace.length
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [steps])

  const status = statusOf(c, v)
  const onLineStill = v === 'queued' || v === 'working' || v === 'paused'

  return (
    <SidePanel
      title={clientOf(c.id)}
      eyebrow={s.row.quotationNo}
      closeLabel="Close case"
      onClose={onClose}
      bodyRef={bodyRef}
      marker="data-case-drawer"
      footer={
        <>
          <Badge tone={status.tone} dot={v === 'blocked' || v === 'failed' || v === 'approval'}>
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
          {onLineStill && onStop && (
            <Button variant="neutral" size="sm" icon={<Square aria-hidden className="h-3.5 w-3.5" />} onClick={onStop}>
              Stop
            </Button>
          )}
          {onLineStill && !onStop && onPause && (
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
          {v === 'approval' && (
            <Button size="sm" onClick={onApprove}>
              Approve
            </Button>
          )}
          {v === 'manual' && (
            <Button size="sm" onClick={onComplete}>
              Mark step done
            </Button>
          )}
        </>
      }
    >
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
            const here = c.onLine && c.stage === i
            const fill = c.done.includes(i) || c.stage === DONE ? 1 : here ? stageProgress(c) : 0
            return (
              <li key={stage.id} className="flex flex-col gap-1.5">
                <span className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <span
                    className={cn(
                      'block h-full rounded-full transition-[width] duration-200 ease-linear',
                      here && (v === 'blocked' || v === 'manual')
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
              {stopReason(c)}
            </p>
          </div>
        </Section>
      )}

      {(v === 'blocked' || v === 'manual' || v === 'approval') && (
        <Section title="Needs your attention">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3',
              v === 'approval' ? 'border-info bg-info-bg' : 'border-warning bg-warning-bg',
            )}
          >
            <p className="min-w-0 flex-1 text-base text-default">{stopReason(c)}</p>
          </div>
        </Section>
      )}

      <Section title="Agent trace">
        {c.trace.length === 0 && (v === 'queued' || v === 'idle') ? (
          v === 'idle' ? (
            <p className="text-sm text-subtle">No agent has worked this case yet.</p>
          ) : (
          <p className="text-sm text-subtle">Waiting for the {STAGES[Math.min(c.stage, DONE - 1)].agent.toLowerCase()}.</p>
          )
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
                            : step.kind === 'approval'
                              ? 'font-medium text-info-fg'
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
    </SidePanel>
  )
}

function statusOf(c: CaseState, v: CaseView): { label: string; tone: Tone } {
  if (v === 'done') {
    const o = OUTCOME_OF[SCRIPT_BY_ID[c.id].outcome]
    return { label: o.label, tone: o.tone }
  }
  if (v === 'idle') return { label: 'With you', tone: 'neutral' }
  if (v === 'blocked') return { label: 'Needs your attention', tone: 'warning' }
  if (v === 'failed') return { label: 'Failed', tone: 'danger' }
  if (v === 'approval') return { label: 'Waiting for approval', tone: 'info' }
  if (v === 'manual') return { label: `${STAGES[c.stage].label} is yours`, tone: 'warning' }
  if (v === 'paused') return { label: `Paused at ${STAGES[c.stage].label}`, tone: 'neutral' }
  if (v === 'working') return { label: `In ${STAGES[c.stage].label}`, tone: 'brand' }
  return { label: `Waiting for ${STAGES[c.stage].label}`, tone: 'neutral' }
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <PanelSection title={title}>{children}</PanelSection>
)

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={cn('truncate text-sm text-default', mono && 'font-mono')}>{value}</dd>
    </div>
  )
}
