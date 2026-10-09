import { Bot, Check, ChevronDown, Send, Stamp, Workflow } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Throbber } from '@/components/ui/Throbber'
import { cn } from '@/lib/cn'
import { isStationOn, type AgentSettings } from '../agents/settings'
import { Menu, type MenuItem } from '../queue/Menu'
import { canTrigger, nextStation, viewOf, type CaseState } from '../run/engine'
import { DONE, OUTCOME_OF, SCRIPT_BY_ID, STAGES } from '../run/script'

/**
 * What a queue row shows of its agent work, under the onebuzz status badge.
 * Nothing until an agent has touched the case. The badge opens the case, so
 * the trace behind it is one click away.
 */
export function AgentStatus({ c, onOpen }: { c: CaseState | undefined; onOpen: (id: string) => void }) {
  if (!c) return null
  const v = viewOf(c)
  // The last station an agent finished, read off the trace: seeded steps
  // were done by people and say nothing here.
  const lastAgentDone = [...c.trace].reverse().find((t) => t.kind === 'done')
  if (v === 'idle' && !lastAgentDone) return null
  if (v === 'done' && c.resolvedAt === undefined) return null

  const station = STAGES[Math.min(c.stage, DONE - 1)]
  // The badges are short to fit the column; the button says it in full.
  let said: string
  let badge
  if (v === 'done') {
    const o = OUTCOME_OF[SCRIPT_BY_ID[c.id].outcome]
    said = `Decided by the agent: ${o.label}`
    badge = (
      <Badge tone={o.tone} icon={<Stamp aria-hidden className="h-3 w-3" />}>
        {o.label}
      </Badge>
    )
  } else if (v === 'idle') {
    const last = STAGES[lastAgentDone!.stage]
    said = `${last.agent} finished ${last.label.toLowerCase()}`
    badge = (
      <Badge tone="success" icon={<Check aria-hidden className="h-3 w-3" />}>
        {last.label} done
      </Badge>
    )
  } else if (v === 'working') {
    said = `${station.agent} is working`
    badge = (
      <Badge tone="brand" icon={<Throbber phase="thinking" size={12} />}>
        {station.label}
      </Badge>
    )
  } else if (v === 'blocked' || v === 'manual') {
    said = `${station.agent} needs you`
    badge = (
      <Badge tone="warning" dot>
        {station.label}: you
      </Badge>
    )
  } else if (v === 'failed') {
    said = `${station.agent} failed`
    badge = (
      <Badge tone="danger" dot>
        {station.label}: failed
      </Badge>
    )
  } else if (v === 'approval') {
    said = `${station.agent} is waiting for your approval`
    badge = (
      <Badge tone="info" dot>
        {station.label}: approve
      </Badge>
    )
  } else {
    said = `Waiting for the ${station.agent.toLowerCase()}`
    badge = (
      <Badge tone="neutral" icon={<Bot aria-hidden className="h-3 w-3" />}>
        {station.label}
      </Badge>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onOpen(c.id)
      }}
      aria-label={`${said}. Open case`}
      title={said}
      className="rounded-md focus-visible:outline-none focus-visible:shadow-focus"
    >
      {badge}
    </button>
  )
}

/** The row menu's agent item: send the case to its next station. Absent when
 *  the case has none (an agent has it, or it is decided). */
export function rowAgentItems(c: CaseState | undefined, settings: AgentSettings): MenuItem[] {
  const next = c ? nextStation(c) : undefined
  if (next === undefined) return []
  const on = isStationOn(settings, next)
  return [{ key: `send:${next}`, label: `Send to ${STAGES[next].agent.toLowerCase()}`, disabled: !on, meta: on ? undefined : 'Off' }]
}

/**
 * Toolbar: send cases to a station in one batch. With rows selected it acts
 * on them; with none, on the whole queue. Only cases whose earlier steps are
 * done can go, so each item counts the eligible ones.
 */
export function SendMenu({
  cases,
  scope,
  settings,
  onRun,
}: {
  cases: CaseState[]
  scope: 'all' | 'selected'
  settings: AgentSettings
  onRun: (stage: number) => void
}) {
  const items: MenuItem[] = STAGES.map((st, i) => {
    const on = isStationOn(settings, i)
    const ready = cases.filter((c) => canTrigger(c, i)).length
    return { key: String(i), label: st.agent, disabled: !on || ready === 0, meta: on ? String(ready) : 'Off' }
  })
  return (
    <Menu
      label={scope === 'selected' ? 'Send selected to' : 'Send eligible cases to'}
      align="right"
      items={items}
      onSelect={(k) => onRun(Number(k))}
      trigger={({ open, toggle }) => (
        <Button
          size="sm"
          variant="secondary"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
          icon={<Send aria-hidden className="h-3.5 w-3.5" />}
        >
          {scope === 'selected' ? 'Send selected' : 'Send to agent'}
          <ChevronDown aria-hidden className={cn('h-3.5 w-3.5 transition-transform duration-base', open && 'rotate-180')} />
        </Button>
      )}
    />
  )
}

/** Toolbar: the steps agents take on their own. Each switch automates one
 *  station; the menu stays open so several can be set in one go. */
export function AutomateMenu({
  auto,
  settings,
  onToggle,
}: {
  auto: number[]
  settings: AgentSettings
  onToggle: (stage: number, on: boolean) => void
}) {
  const items: MenuItem[] = STAGES.map((st, i) => {
    const on = isStationOn(settings, i)
    return { key: String(i), label: st.label, disabled: !on, meta: on ? undefined : 'Off', checked: on && auto.includes(i) }
  })
  const count = auto.filter((i) => isStationOn(settings, i)).length
  return (
    <Menu
      label="Automate steps"
      align="right"
      items={items}
      onSelect={(k) => onToggle(Number(k), !auto.includes(Number(k)))}
      trigger={({ open, toggle }) => (
        <Button
          size="sm"
          variant="neutral"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
          icon={<Workflow aria-hidden className="h-3.5 w-3.5" />}
        >
          Automate
          {count > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-brand-100 px-1 font-mono text-xs font-semibold text-brand-fg">
              {count}
            </span>
          )}
          <ChevronDown aria-hidden className={cn('h-3.5 w-3.5 transition-transform duration-base', open && 'rotate-180')} />
        </Button>
      )}
    />
  )
}
