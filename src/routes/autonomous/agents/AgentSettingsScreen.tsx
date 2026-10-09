import { type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, Lock, Minus, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Chip } from '@/components/ui/Chip'
import { Switch } from '@/components/ui/Switch'
import { ConnectorTile } from '@/components/workspace/ConnectorsMenu'
import { RailRow } from '@/components/workspace/Shell'
import { FIELD } from '@/components/workspace/field'
import { cn } from '@/lib/cn'
import { CONNECTORS, KIND_LABEL, STATUS, type Connector } from '@/routes/harness/connectors/data'
import { Menu } from '../queue/Menu'
import { STAGES } from '../run/script'
import {
  MAX_CONCURRENT,
  RETRY_OPTIONS,
  TIMEOUT_OPTIONS,
  connectorsOf,
  stageIndexOf,
  useAgentSettings,
  type AgentConfig,
  type AgentSettings,
  type StageId,
} from './settings'

const GLOBAL = 'global'

/**
 * Agent settings: the Underwriting workflow's agents and what each runs
 * with. Hybrid and Autonomous both read these.
 *
 * A list on the left in workflow order, with the shared connectors on top;
 * the picked item's settings on the right. One place to change each thing:
 * the on/off switch lives in the detail header, not on the list rows. Every
 * change applies at once and is kept across reloads; there is no save step.
 *
 * The selection is in `?agent=` (the station panel links straight to one).
 */
export function AgentSettingsScreen() {
  const { settings, updateAgent, toggleGlobal } = useAgentSettings()
  const [params, setParams] = useSearchParams()
  const picked = params.get('agent')
  const selectedId = picked === GLOBAL || settings.agents.some((a) => a.id === picked) ? picked! : settings.agents[0].id
  const select = (id: string) => setParams({ agent: id }, { replace: true })
  const agent = settings.agents.find((a) => a.id === selectedId)
  const on = settings.agents.filter((a) => a.active).length

  return (
    <div className="grid h-full grid-cols-[280px_minmax(0,1fr)] overflow-hidden bg-surface-card">
      <nav aria-label="Agents" className="flex min-h-0 flex-col border-r border-default">
        <div className="shrink-0 border-b border-default px-4 py-4">
          <h1 className="text-md font-semibold text-default">Agent settings</h1>
          <p className="font-mono text-xs text-subtle">
            Underwriting · {on} of {settings.agents.length} on
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <RailRow selected={selectedId === GLOBAL} onClick={() => select(GLOBAL)}>
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-default">Shared connectors</span>
              <span className="font-mono text-xs text-subtle">{settings.global.length}</span>
            </span>
          </RailRow>
          {settings.agents.map((a) => (
            <RailRow key={a.id} selected={selectedId === a.id} onClick={() => select(a.id)}>
              <span className="flex items-center justify-between gap-2">
                <span className={cn('truncate text-sm font-medium', a.active ? 'text-default' : 'text-subtle')}>{a.name}</span>
                {!a.active && <Badge tone="neutral">Off</Badge>}
              </span>
              <span className="font-mono text-xs text-subtle">
                {STAGES[stageIndexOf(a.role)].label} · {a.maxConcurrent} at once
              </span>
            </RailRow>
          ))}
        </div>
      </nav>

      <div className="min-h-0 overflow-y-auto">
        {/* Keyed, so switching agents replays the entrance. */}
        <div key={selectedId} className="animate-view-in">
          {agent ? (
            <AgentForm agent={agent} settings={settings} onChange={(patch) => updateAgent(agent.id, patch)} />
          ) : (
            <GlobalForm settings={settings} onToggle={toggleGlobal} />
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- forms

function Page({ title, eyebrow, trailing, children }: { title: string; eyebrow: string; trailing?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-8 px-8 py-8">
      <header className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-subtle">{eyebrow}</p>
          <h2 className="truncate text-xl font-semibold text-default">{title}</h2>
        </div>
        {trailing}
      </header>
      {children}
    </div>
  )
}

function AgentForm({
  agent,
  settings,
  onChange,
}: {
  agent: AgentConfig
  settings: AgentSettings
  onChange: (patch: Partial<AgentConfig>) => void
}) {
  return (
    <Page
      title={agent.name}
      eyebrow={STAGES[stageIndexOf(agent.role)].label}
      trailing={
        <label className="flex items-center gap-2.5 text-sm font-medium text-default">
          {agent.active ? 'On' : 'Off'}
          <Switch checked={agent.active} onChange={() => onChange({ active: !agent.active })} label={`${agent.name} on`} />
        </label>
      }
    >
      <Group title="Work">
        <Row label="Role" htmlFor="agent-role">
          <RoleMenu value={agent.role} onChange={(role) => onChange({ role })} />
        </Row>
        <Row label="Cases at once">
          <Stepper
            value={agent.maxConcurrent}
            min={1}
            max={MAX_CONCURRENT}
            label="Cases at once"
            onChange={(maxConcurrent) => onChange({ maxConcurrent })}
          />
        </Row>
        <Row label="Approve before moving on">
          <Switch
            checked={agent.humanApproval}
            onChange={() => onChange({ humanApproval: !agent.humanApproval })}
            label="Approve before moving on"
          />
        </Row>
        <Row label="Retries on tool failure">
          <ChipRow
            label="Retries on tool failure"
            options={RETRY_OPTIONS}
            value={agent.retries}
            format={(n) => String(n)}
            onChange={(retries) => onChange({ retries })}
          />
        </Row>
        <Row label="Timeout per case">
          <ChipRow
            label="Timeout per case"
            options={TIMEOUT_OPTIONS}
            value={agent.timeoutMin}
            format={(n) => `${n} min`}
            onChange={(timeoutMin) => onChange({ timeoutMin })}
          />
        </Row>
      </Group>

      <Group title="Instructions">
        <label className="sr-only" htmlFor="agent-instructions">
          Instructions
        </label>
        <textarea
          id="agent-instructions"
          rows={3}
          value={agent.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
          className={cn(FIELD, 'resize-y')}
        />
      </Group>

      <Group title="Connectors" aside={`${connectorsOf(settings, agent).length} of ${CONNECTORS.length}`}>
        <ul className="flex flex-col">
          {CONNECTORS.map((c) => {
            const shared = settings.global.includes(c.id)
            const own = agent.connectors.includes(c.id)
            return (
              <ConnectorRow key={c.id} c={c}>
                {shared ? (
                  <span title="Shared with every agent" className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <Lock aria-hidden className="h-3 w-3" />
                    Shared
                  </span>
                ) : (
                  <Switch
                    checked={own}
                    onChange={() =>
                      onChange({ connectors: own ? agent.connectors.filter((x) => x !== c.id) : [...agent.connectors, c.id] })
                    }
                    label={`Connect ${c.label} to ${agent.name}`}
                  />
                )}
              </ConnectorRow>
            )
          })}
        </ul>
      </Group>
    </Page>
  )
}

function GlobalForm({ settings, onToggle }: { settings: AgentSettings; onToggle: (id: string) => void }) {
  return (
    <Page title="Shared connectors" eyebrow="Every agent">
      <Group title="Connectors" aside={`${settings.global.length} of ${CONNECTORS.length}`}>
        <ul className="flex flex-col">
          {CONNECTORS.map((c) => (
            <ConnectorRow key={c.id} c={c}>
              <Switch checked={settings.global.includes(c.id)} onChange={() => onToggle(c.id)} label={`Share ${c.label} with every agent`} />
            </ConnectorRow>
          ))}
        </ul>
      </Group>
    </Page>
  )
}

// ------------------------------------------------------------ form parts

function Group({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between border-b border-default pb-2">
        <h3 className="text-sm font-semibold text-default">{title}</h3>
        {aside && <span className="font-mono text-xs text-subtle">{aside}</span>}
      </div>
      <div className="flex flex-col pt-2">{children}</div>
    </section>
  )
}

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-12 grid-cols-[220px_minmax(0,1fr)] items-center gap-4 border-b border-subtle py-1.5 last:border-0">
      <label htmlFor={htmlFor} className="text-sm text-default">
        {label}
      </label>
      <div className="flex min-w-0 items-center">{children}</div>
    </div>
  )
}

function ConnectorRow({ c, children }: { c: Connector; children: ReactNode }) {
  const status = STATUS[c.status]
  return (
    <li className="flex h-12 items-center gap-3 border-b border-subtle last:border-0">
      <ConnectorTile item={c} />
      <span className="min-w-0 truncate text-sm text-default">{c.label}</span>
      <span className="font-mono text-xs text-muted">{KIND_LABEL[c.kind]}</span>
      {c.status !== 'connected' && (
        <Badge tone={status.tone} dot={c.status === 'error'}>
          {status.label}
        </Badge>
      )}
      <span className="ml-auto flex shrink-0 justify-end">{children}</span>
    </li>
  )
}

function RoleMenu({ value, onChange }: { value: StageId; onChange: (v: StageId) => void }) {
  return (
    <Menu
      label="Role"
      value={value}
      items={STAGES.map((s) => ({ key: s.id, label: s.label }))}
      onSelect={(k) => onChange(k as StageId)}
      trigger={({ open, toggle }) => (
        <button
          id="agent-role"
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
          className={cn(
            FIELD.replace('w-full ', ''),
            'flex h-8 w-[200px] items-center justify-between gap-2 py-0 text-left',
            open && 'border-focus shadow-focus-field',
          )}
        >
          <span className="truncate">{STAGES[stageIndexOf(value)].label}</span>
          <ChevronDown aria-hidden className={cn('h-4 w-4 shrink-0 text-muted transition-transform duration-base', open && 'rotate-180')} />
        </button>
      )}
    />
  )
}

function Stepper({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number
  min: number
  max: number
  label: string
  onChange: (n: number) => void
}) {
  const btn =
    'inline-flex h-8 w-8 items-center justify-center text-default transition-colors duration-base hover:bg-surface-sunken focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:text-disabled disabled:hover:bg-transparent'
  return (
    <div role="group" aria-label={label} className="inline-flex items-center overflow-hidden rounded-md border border-strong">
      <button type="button" aria-label="Fewer" disabled={value <= min} onClick={() => onChange(value - 1)} className={btn}>
        <Minus aria-hidden className="h-3.5 w-3.5" />
      </button>
      <output aria-live="polite" className="w-10 border-x border-strong text-center font-mono text-sm leading-8 text-default">
        {value}
      </output>
      <button type="button" aria-label="More" disabled={value >= max} onClick={() => onChange(value + 1)} className={btn}>
        <Plus aria-hidden className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function ChipRow({
  label,
  options,
  value,
  format,
  onChange,
}: {
  label: string
  options: number[]
  value: number
  format: (n: number) => string
  onChange: (n: number) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1.5">
      {options.map((n) => (
        <Chip key={n} label={format(n)} selected={value === n} onClick={() => onChange(n)} />
      ))}
    </div>
  )
}
