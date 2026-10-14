import { Switch } from '@/components/ui/Switch'
import { Region } from '@/components/workspace/Shell'
import { cn } from '@/lib/cn'
import { SelectMenu } from '@/routes/autonomous/queue/Menu'
import { OUTCOMES, type Outcome, type Rule } from './data'

/**
 * Routing rules, first match wins, on the canvas the Connectors detail uses:
 * a sunken region with one bordered list in the middle. Each rule can be
 * switched off and pointed at a different outcome; a change applies to items
 * routed after it. The fallback is always on and never a hold, so a released
 * item always lands somewhere.
 */
export function RoutingRules({
  rules,
  onChange,
}: {
  rules: Rule[]
  onChange: (id: number, patch: { enabled?: boolean; to?: Outcome }) => void
}) {
  const on = rules.filter((r) => r.enabled).length

  return (
    <Region title="Routing rules" meta={<span className="font-mono">{on} of {rules.length} on</span>} sunken>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <ol className="flex flex-col rounded-lg border border-default bg-surface-card">
          {rules.map((r) => (
            <li key={r.id} className="flex min-h-12 items-center gap-3 border-b border-subtle px-4 py-2 last:border-b-0">
              <span className="w-5 shrink-0 font-mono text-xs text-muted">{r.id}</span>
              <span className={cn('min-w-0 flex-1 text-sm', r.enabled ? 'text-default' : 'text-muted')}>
                {r.fallback ? r.when : <><span className="text-subtle">If </span>{r.when}</>}
              </span>
              <SelectMenu
                label={`Rule ${r.id} outcome`}
                value={r.to}
                options={(r.fallback ? OUTCOMES.filter((o) => o.id !== 'hold' && o.id !== 'reject') : OUTCOMES).map((o) => ({ key: o.id, label: o.label }))}
                onChange={(k) => onChange(r.id, { to: k as Outcome })}
                disabled={!r.enabled}
                className="w-[200px]"
              />
              {r.fallback ? (
                <span aria-hidden className="w-9 shrink-0" />
              ) : (
                <Switch checked={r.enabled} onChange={() => onChange(r.id, { enabled: !r.enabled })} label={`Rule ${r.id} on`} />
              )}
            </li>
          ))}
        </ol>
      </div>
    </Region>
  )
}
