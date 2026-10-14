import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Throbber } from '@/components/ui/Throbber'
import { PanelSection, SidePanel } from '@/components/workspace/SidePanel'
import { cn } from '@/lib/cn'
import { formatInr } from '@/routes/autonomous/queue/data'
import { STAGES, outcomeLabel, sourceOf } from './data'
import { ACTIONS, ACTION_LABEL, ATTENTION_OF, Progress, StateBadge, type ActionKey } from './parts'
import { ATTENTION_KIND, type AttentionKind } from '@/routes/autonomous/run/parts'
import type { Detail, RuleEval } from './decisionLog'
import { clockOf, type Item, type TrailStep } from './useIntake'

/**
 * One intake task, on the house side panel, laid out as the Fully Agentic
 * case drawer is: the case, its progress, what needs attention, then the
 * trail. Here the trail is the decision itself: every context-layer call the
 * task made (named as the Harness bindings name them) and every rule it was
 * checked against, so the reason it did or did not reach the agentic flow is
 * on the record. Each step folds to one line; the step that decided the
 * outcome (or failed it) opens by default. The log keeps running underneath
 * and the panel reads live.
 *
 * Footer: status on the left, then secondary, then primary right-most.
 */
export function IntakeDetail({ item, onAct, onClose }: { item: Item; onAct: (a: ActionKey) => void; onClose: () => void }) {
  const t = item.task
  const bodyRef = useRef<HTMLDivElement>(null)

  // Follow the trail as it grows, unless the reader has scrolled up into it.
  const steps = item.trail.length
  useEffect(() => {
    const el = bodyRef.current
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [steps])

  const { primary, secondary } = ACTIONS[item.state]
  const last = item.trail[item.trail.length - 1]

  return (
    <SidePanel
      title={t.case.clientName ?? item.ref}
      eyebrow={item.ref}
      closeLabel="Close task"
      onClose={onClose}
      bodyRef={bodyRef}
      footer={
        <>
          <StateBadge state={item.state} />
          <span className="font-mono text-xs text-muted">
            {item.decidedAt !== undefined
              ? `Decided in ${((item.decidedAt - item.arrivedAt) / 1000).toFixed(1)}s`
              : `Arrived at ${clockOf(item.arrivedAt)}`}
          </span>
          <span className="flex-1" />
          {secondary && (
            <Button variant="outline" size="sm" onClick={() => onAct(secondary)}>
              {ACTION_LABEL[secondary]}
            </Button>
          )}
          {primary && (
            <Button size="sm" onClick={() => onAct(primary)}>
              {ACTION_LABEL[primary]}
            </Button>
          )}
        </>
      }
    >
      <PanelSection title="Case">
        <dl className="grid grid-cols-3 gap-x-6 gap-y-3.5">
          <Field label="Plan" value={t.case.plan ?? '—'} />
          <Field label="Business type" value={t.case.businessType} />
          <Field label="Segment" value={t.case.segment === 'group' ? 'Group' : 'Retail'} />
          <Field label="Sum insured" value={formatInr(t.case.sumInsured ?? 0)} mono />
          <Field label="Premium" value={formatInr(t.case.premium)} mono />
          <Field label="Source" value={sourceOf(t.source).label} />
          <Field label="Source ref" value={t.sourceRef} mono wide />
        </dl>
      </PanelSection>

      <PanelSection title="Progress">
        <Progress item={item} labels />
      </PanelSection>

      {item.state === 'Failed' && last && (
        <PanelSection title="Error">
          <Band kind="error">{last.text}</Band>
        </PanelSection>
      )}

      {(item.state === 'Held' || item.state === 'Rejected') && (
        <PanelSection title="Needs your attention">
          <Band kind={ATTENTION_OF[item.state]!}>
            {item.state === 'Rejected'
              ? `Rejected: ${item.rule?.when}`
              : last?.kind === 'person'
                ? last.text
                : `Held: ${item.rule?.when}`}
          </Band>
        </PanelSection>
      )}

      <PanelSection title="Decision log">
        <Trail item={item} />
      </PanelSection>
    </SidePanel>
  )
}

const KIND: Record<TrailStep['kind'], string> = {
  info: 'text-default',
  block: 'font-medium text-warning-fg',
  error: 'font-medium text-danger-fg',
  person: 'text-brand',
}

/** The drawer's agent trace, grouped by stage, each step opening onto what it asked, what came back, and what that decided. */
function Trail({ item }: { item: Item }) {
  if (item.trail.length === 0 && item.state !== 'Processing') return <p className="text-sm text-subtle">Waiting for its source to resume.</p>
  return (
    <ol className="flex flex-col">
      {item.trail.map((step, i) => {
        const first = i === 0 || item.trail[i - 1].stage !== step.stage
        return (
          <li key={i} className="flex animate-fade-up flex-col">
            {first && <span className="pb-1.5 pt-3 text-xs font-semibold text-subtle first:pt-0">{STAGES[step.stage]}</span>}
            <Step step={step} />
          </li>
        )
      })}
      {item.state === 'Processing' && (
        <li className="grid grid-cols-[16px_64px_1fr] items-center gap-2 py-1.5">
          <span />
          <Throbber phase="thinking" size={18} />
          <span className="text-sm text-subtle">{STAGES[item.stage]} in progress</span>
        </li>
      )}
    </ol>
  )
}

function Step({ step }: { step: TrailStep }) {
  const opens = !!step.detail || !!step.evals
  const [open, setOpen] = useState(!!step.deciding)
  // A step that becomes the deciding one (a release re-routes) opens itself.
  useEffect(() => {
    if (step.deciding) setOpen(true)
  }, [step.deciding])

  const head = (
    <>
      {opens ? (
        <ChevronRight aria-hidden className={cn('mt-0.5 h-4 w-4 text-muted transition-transform duration-base', open && 'rotate-90')} />
      ) : (
        <span />
      )}
      <span className="font-mono text-xs leading-5 text-muted">{clockOf(step.at)}</span>
      <span className="flex min-w-0 flex-col">
        <span className={cn('text-sm', KIND[step.kind])}>{step.text}</span>
        {step.call && (
          <span className="font-mono text-xs text-muted">
            {step.call.layer}
            {step.call.tool && ` · ${step.call.tool}`}
          </span>
        )}
      </span>
      <span className="font-mono text-xs leading-5 text-muted">{step.ms !== undefined && `${step.ms} ms`}</span>
    </>
  )

  const grid = 'grid w-full grid-cols-[16px_64px_minmax(0,1fr)_auto] items-start gap-2 rounded-md px-1 py-1.5 text-left'
  return (
    <div className="flex flex-col">
      {opens ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(grid, 'transition-colors duration-base hover:bg-surface-sunken focus-visible:outline-none focus-visible:shadow-focus')}
        >
          {head}
        </button>
      ) : (
        <div className={grid}>{head}</div>
      )}
      {open && step.detail && <DetailBox d={step.detail} />}
      {open && step.evals && <Evals evals={step.evals} />}
    </div>
  )
}

function DetailBox({ d }: { d: Detail }) {
  return (
    <dl className="mb-2 ml-[90px] flex flex-col gap-2.5 rounded-lg border border-default bg-surface-sunken px-3.5 py-3">
      <Pairs label="Asked" pairs={d.asked} />
      <Pairs label="Returned" pairs={d.returned} />
      {d.usedFor && (
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Used for</dt>
          <dd className="text-sm text-default">{d.usedFor}</dd>
        </div>
      )}
    </dl>
  )
}

function Pairs({ label, pairs }: { label: string; pairs: [string, string][] }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="flex flex-col gap-0.5">
        {pairs.map(([k, v]) => (
          <span key={k} className="grid grid-cols-[136px_minmax(0,1fr)] gap-2 text-sm">
            <span className="text-subtle">{k}</span>
            <span className="font-mono text-default">{v}</span>
          </span>
        ))}
      </dd>
    </div>
  )
}

/** Every rule, with what it read and what it came to. Rules after the match fold into one line. */
function Evals({ evals }: { evals: RuleEval[] }) {
  const shown = evals.filter((e) => e.result !== 'not evaluated')
  const skipped = evals.length - shown.length
  return (
    <ol className="mb-2 ml-[90px] flex flex-col rounded-lg border border-default bg-surface-card">
      {shown.map(({ rule, reads, result }) => (
        <li
          key={rule.id}
          className={cn(
            'grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-3 border-b border-subtle px-3.5 py-2.5 last:border-b-0',
            result === 'yes' && 'bg-brand-50',
          )}
        >
          <span className="font-mono text-xs leading-5 text-muted">{rule.id}</span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className={cn('text-sm', result === 'off' ? 'text-muted' : 'text-default')}>{rule.when}</span>
            <span className="font-mono text-xs text-subtle">{reads}</span>
          </span>
          <span className={cn('font-mono text-xs leading-5', result === 'yes' ? 'font-semibold text-brand' : 'text-muted')}>
            {result === 'yes' ? `yes, ${outcomeLabel(rule.to)}` : result}
          </span>
        </li>
      ))}
      {skipped > 0 && (
        <li className="px-3.5 py-2 font-mono text-xs text-muted">
          {skipped} not evaluated
        </li>
      )}
    </ol>
  )
}

/** The case drawer's attention band, with the run's icon for its kind. */
function Band({ kind, children }: { kind: AttentionKind; children: ReactNode }) {
  const { icon: Icon, surface, iconClass } = ATTENTION_KIND[kind]
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border px-4 py-3', surface)}>
      <Icon aria-hidden className={cn('h-4 w-4 shrink-0', iconClass)} />
      <p className={cn('min-w-0 flex-1 text-base', kind === 'error' ? 'text-danger-fg' : 'text-default')}>{children}</p>
    </div>
  )
}

function Field({ label, value, mono, wide }: { label: string; value: string; mono?: boolean; wide?: boolean }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', wide && 'col-span-3')}>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={cn('truncate text-sm text-default', mono && 'font-mono')} title={value}>
        {value}
      </dd>
    </div>
  )
}
