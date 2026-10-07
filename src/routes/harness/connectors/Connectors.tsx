import { useState } from 'react'
import { Check, Plus, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { ConnectorTile } from '@/components/workspace/ConnectorsMenu'
import { FIELD } from '@/components/workspace/field'
import { RailRow, Region, Workspace } from '@/components/workspace/Shell'
import { cn } from '@/lib/cn'
import { AddConnector } from './AddConnector'
import { CONNECTORS, KIND_LABEL, STATUS, type Connector } from './data'
import { useLater } from './useLater'

/**
 * Harness › Connectors — the systems agents can reach, over an API or an MCP
 * server.
 *
 * Same shell as Model Setup: a 48px band, then a rail and a canvas split by
 * hairlines. The rail is every connector with its state; the canvas is the
 * selected one. "Add connector" opens the catalog in a dialog over the
 * screen.
 */
export function Connectors() {
  const [connectors, setConnectors] = useState<Connector[]>(CONNECTORS)
  const [selectedId, setSelectedId] = useState(CONNECTORS[0].id)
  const [adding, setAdding] = useState(false)
  const selected = connectors.find((c) => c.id === selectedId) ?? connectors[0]
  const connected = connectors.filter((c) => c.status === 'connected').length

  const update = (id: string, patch: Partial<Connector>) =>
    setConnectors((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-surface-page">
      <div className="flex h-12 shrink-0 items-center gap-4 border-b border-default bg-surface-card px-4">
        <h1 className="shrink-0 text-sm font-semibold text-default">Connectors</h1>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setAdding(true)} icon={<Plus aria-hidden className="h-4 w-4" />}>
            Add connector
          </Button>
        </div>
      </div>

      <Workspace cols="xl:grid-cols-[320px_minmax(0,1fr)]">
        <Region
          title="All connectors"
          meta={
            <span className="font-mono">
              {connected} of {connectors.length} connected
            </span>
          }
          pad={false}
        >
          <ul>
            {connectors.map((c) => (
              <li key={c.id} className="animate-fade-up">
                <RailRow selected={c.id === selected.id} onClick={() => setSelectedId(c.id)}>
                  <span className="flex items-center gap-2.5">
                    <ConnectorTile item={c} size="md" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-semibold text-default">{c.label}</span>
                      <span className="truncate font-mono text-xs text-muted">
                        {KIND_LABEL[c.kind]} · {c.auth}
                      </span>
                    </span>
                    <Badge tone={STATUS[c.status].tone} dot={c.status === 'error'}>
                      {STATUS[c.status].label}
                    </Badge>
                  </span>
                </RailRow>
              </li>
            ))}
          </ul>
        </Region>

        <Detail
          key={selected.id}
          c={selected}
          onChange={(patch) => update(selected.id, patch)}
        />
      </Workspace>

      {adding && (
        <AddConnector
          taken={connectors.map((c) => c.id)}
          onCancel={() => setAdding(false)}
          onAdd={(c) => {
            setConnectors((prev) => [...prev, c])
            setSelectedId(c.id)
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}

function Detail({ c, onChange }: { c: Connector; onChange: (patch: Partial<Connector>) => void }) {
  const later = useLater()
  const [busy, setBusy] = useState<'test' | 'connect' | null>(null)
  const [tested, setTested] = useState(false)
  const [key, setKey] = useState('')

  const test = () => {
    setBusy('test')
    setTested(false)
    later(() => {
      setBusy(null)
      setTested(true)
      onChange({ lastCheck: 'Just now' })
    })
  }

  // Signing in again, or supplying the missing key, is the same round trip.
  const connect = () => {
    setBusy('connect')
    later(() => {
      setBusy(null)
      onChange({
        status: 'connected',
        error: undefined,
        lastCheck: 'Just now',
        ...(c.auth === 'OAuth' && { account: c.account ?? 'uw-desk@eicore.in' }),
        ...(key && { secret: '•'.repeat(20) + key.slice(-4) }),
      })
    })
  }

  const disconnect = () =>
    onChange({ status: 'unconfigured', error: undefined, account: undefined, secret: undefined, lastCheck: 'Never' })

  const needsKey = c.auth === 'API key' || c.auth === 'Bearer token'
  const credentialLabel = c.auth === 'Bearer token' ? 'Token' : 'API key'

  const rows: [string, string][] = [
    ['Type', c.kind === 'mcp' ? 'MCP server' : 'API'],
    [c.kind === 'mcp' ? 'Server URL' : 'Base URL', c.url],
    ['Authentication', c.auth],
    ...(c.account ? [['Signed in as', c.account] as [string, string]] : []),
    ...(c.secret ? [[credentialLabel, c.secret] as [string, string]] : []),
    ['Last checked', c.lastCheck],
  ]

  const on = c.tools?.filter((t) => t.enabled).length ?? 0

  return (
    <Region
      title={c.label}
      icon={<ConnectorTile item={c} />}
      meta={KIND_LABEL[c.kind]}
      actions={
        <Badge tone={STATUS[c.status].tone} dot={c.status === 'error'}>
          {STATUS[c.status].label}
        </Badge>
      }
      sunken
      footer={
        c.status === 'unconfigured' ? undefined : (
          <div className="flex items-center gap-2">
            {c.status === 'error' ? (
              <Button size="sm" onClick={connect} disabled={busy !== null}>
                {busy === 'connect' ? 'Signing in' : c.auth === 'OAuth' ? 'Sign in again' : 'Reconnect'}
              </Button>
            ) : (
              <Button size="sm" variant="neutral" onClick={test} disabled={busy !== null}>
                {busy === 'test' ? 'Testing' : 'Test connection'}
              </Button>
            )}
            {tested && busy === null && c.status === 'connected' && (
              <span className="inline-flex animate-fade-up items-center gap-1 text-xs text-success-fg">
                <Check aria-hidden className="h-3.5 w-3.5" />
                Connection works
              </span>
            )}
            <Button size="sm" variant="text" onClick={disconnect} disabled={busy !== null} className="ml-auto">
              Disconnect
            </Button>
          </div>
        )
      }
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {c.status === 'error' && c.error && (
          <div className="rounded-md border border-danger bg-danger-bg px-3 py-2.5 text-sm text-danger-fg">{c.error}</div>
        )}

        <dl className="flex flex-col rounded-lg border border-default bg-surface-card">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-4 border-b border-subtle px-4 py-2.5 last:border-b-0">
              <dt className="w-32 shrink-0 text-sm text-subtle">{k}</dt>
              <dd className="min-w-0 flex-1 truncate font-mono text-sm text-default" title={v}>
                {v}
              </dd>
            </div>
          ))}
        </dl>

        {c.status === 'unconfigured' && (
          <section aria-label={`Set up ${c.label}`} className="flex flex-col gap-3 rounded-lg border border-default bg-surface-card p-4">
            <h2 className="text-sm font-semibold text-default">Set up</h2>
            {needsKey && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-default">{credentialLabel}</span>
                <input
                  type="password"
                  className={cn(FIELD, 'font-mono')}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  autoComplete="off"
                />
              </label>
            )}
            <div>
              <Button size="sm" onClick={connect} disabled={busy !== null || (needsKey && !key.trim())}>
                {busy === 'connect'
                  ? 'Connecting'
                  : c.auth === 'OAuth'
                    ? `Sign in to ${c.label}`
                    : 'Connect'}
              </Button>
            </div>
          </section>
        )}

        {c.tools && (
          <section aria-label="Tools" className="flex flex-col rounded-lg border border-default bg-surface-card">
            <header className="flex items-center gap-2 border-b border-default px-4 py-2.5">
              <Wrench aria-hidden className="h-3.5 w-3.5 text-muted" />
              <h2 className="text-sm font-semibold text-default">Tools</h2>
              <span className="ml-auto font-mono text-xs text-muted">
                {on} of {c.tools.length} on
              </span>
            </header>
            <ul>
              {c.tools.map((t) => (
                <li key={t.name} className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-b-0">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-mono text-sm text-default">{t.name}</span>
                    <span className="truncate text-xs text-subtle">{t.description}</span>
                  </span>
                  <Switch
                    checked={t.enabled}
                    label={`Allow ${t.name}`}
                    onChange={() =>
                      onChange({
                        tools: c.tools!.map((x) => (x.name === t.name ? { ...x, enabled: !x.enabled } : x)),
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Region>
  )
}
