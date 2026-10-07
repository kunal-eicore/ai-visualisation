import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ConnectorTile } from '@/components/workspace/ConnectorsMenu'
import { FIELD } from '@/components/workspace/field'
import { cn } from '@/lib/cn'
import {
  AUTH_FOR,
  CATALOG,
  CUSTOM,
  KIND_LABEL,
  slug,
  testConnection,
  type AuthMethod,
  type CatalogItem,
  type Connector,
  type ConnectorKind,
  type TestResult,
} from './data'
import { useLater } from './useLater'

const FOCUS = 'focus-visible:outline-none focus-visible:shadow-focus'

type Choice = { catalog: CatalogItem } | { custom: ConnectorKind }

/**
 * Adding a connector: the catalog first, then what that connector needs.
 *
 * A catalog connector already knows its URL and auth, so it needs only a
 * sign-in or a key. A custom one is a name, a URL and an auth method, and
 * has to pass a connection test before it can be added; for an MCP server
 * the test is also what finds its tools.
 */
export function AddConnector({
  taken,
  onCancel,
  onAdd,
}: {
  /** Ids already in the list, so a catalog connector cannot be added twice. */
  taken: string[]
  onCancel: () => void
  onAdd: (c: Connector) => void
}) {
  const [pick, setPick] = useState<Choice | null>(null)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCancel])

  if (!pick) {
    return (
      <Dialog title="Add connector" onClose={onCancel} width="max-w-[760px]">
        <Group label="Catalog">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATALOG.map((item) => {
              const added = taken.includes(item.id)
              return (
                <li key={item.id}>
                  <CatalogCard
                    icon={<ConnectorTile item={item} size="md" />}
                    label={item.label}
                    kind={item.kind}
                    added={added}
                    onClick={() => setPick({ catalog: item })}
                  />
                </li>
              )
            })}
          </ul>
        </Group>
        <Group label="Custom">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(['api', 'mcp'] as const).map((kind) => (
              <li key={kind}>
                <CatalogCard
                  icon={<ConnectorTile item={CUSTOM[kind]} size="md" />}
                  label={CUSTOM[kind].label}
                  kind={kind}
                  onClick={() => setPick({ custom: kind })}
                />
              </li>
            ))}
          </ul>
        </Group>
      </Dialog>
    )
  }

  return 'catalog' in pick ? (
    <CatalogSetup item={pick.catalog} onBack={() => setPick(null)} onCancel={onCancel} onAdd={onAdd} />
  ) : (
    <CustomSetup kind={pick.custom} taken={taken} onBack={() => setPick(null)} onCancel={onCancel} onAdd={onAdd} />
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-default">{label}</h3>
      {children}
    </section>
  )
}

function CatalogCard({
  icon,
  label,
  kind,
  added = false,
  onClick,
}: {
  icon: ReactNode
  label: string
  kind: ConnectorKind
  added?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={added}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg border border-default bg-surface-card px-3 py-2.5 text-left transition-colors duration-base',
        'hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:hover:border-default',
        FOCUS,
      )}
    >
      {icon}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('truncate text-sm font-medium', added ? 'text-subtle' : 'text-default')}>{label}</span>
        <span className="font-mono text-xs text-muted">{added ? 'Added' : KIND_LABEL[kind]}</span>
      </span>
    </button>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button size="sm" variant="text" onClick={onBack} icon={<ArrowLeft aria-hidden className="h-4 w-4" />} className="mr-auto">
      Back
    </Button>
  )
}

function Summary({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="flex flex-col rounded-lg border border-default">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline gap-4 border-b border-subtle px-3 py-2 last:border-b-0">
          <dt className="w-28 shrink-0 text-sm text-subtle">{k}</dt>
          <dd className="min-w-0 flex-1 truncate font-mono text-sm text-default" title={v}>
            {v}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function CatalogSetup({
  item,
  onBack,
  onCancel,
  onAdd,
}: {
  item: CatalogItem
  onBack: () => void
  onCancel: () => void
  onAdd: (c: Connector) => void
}) {
  const later = useLater()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const oauth = item.auth === 'OAuth'

  const add = () => {
    setBusy(true)
    later(() => {
      const result = testConnection(item.kind, item.url, item.tools)
      onAdd({
        id: item.id,
        label: item.label,
        icon: item.icon,
        tone: item.tone,
        kind: item.kind,
        status: 'connected',
        url: item.url,
        auth: item.auth,
        account: oauth ? 'uw-desk@eicore.in' : undefined,
        secret: oauth ? undefined : '•'.repeat(20) + key.slice(-4),
        lastCheck: 'Just now',
        tools: result.ok ? result.tools : undefined,
      })
    })
  }

  return (
    <Dialog
      title={`Add ${item.label}`}
      onClose={onCancel}
      footer={
        <>
          <BackButton onBack={onBack} />
          <Button size="sm" onClick={add} disabled={busy || (!oauth && !key.trim())}>
            {busy ? (oauth ? 'Signing in' : 'Connecting') : oauth ? `Sign in to ${item.label}` : 'Add connector'}
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-2.5">
        <ConnectorTile item={item} size="md" />
        <span className="text-md font-semibold text-default">{item.label}</span>
        <Badge>{KIND_LABEL[item.kind]}</Badge>
      </div>
      <Summary
        rows={[
          [item.kind === 'mcp' ? 'Server URL' : 'Base URL', item.url],
          ['Authentication', item.auth],
        ]}
      />
      {!oauth && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-default">API key</span>
          <input
            type="password"
            autoComplete="off"
            className={cn(FIELD, 'font-mono')}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </label>
      )}
    </Dialog>
  )
}

/** The credential fields each auth method asks for. */
const FIELDS_FOR: Record<AuthMethod, { label: string; secret: boolean }[]> = {
  'API key': [{ label: 'API key', secret: true }],
  'Bearer token': [{ label: 'Token', secret: true }],
  OAuth: [
    { label: 'Client ID', secret: false },
    { label: 'Client secret', secret: true },
  ],
  None: [],
}

function CustomSetup({
  kind,
  taken,
  onBack,
  onCancel,
  onAdd,
}: {
  kind: ConnectorKind
  taken: string[]
  onBack: () => void
  onCancel: () => void
  onAdd: (c: Connector) => void
}) {
  const later = useLater()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [auth, setAuth] = useState<AuthMethod>(AUTH_FOR[kind][0])
  const [values, setValues] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const fields = FIELDS_FOR[auth]
  const filled = name.trim() !== '' && url.trim() !== '' && fields.every((f) => (values[f.label] ?? '').trim() !== '')

  // Any edit makes the last test say nothing about what is on the form now.
  const edit = (fn: () => void) => {
    fn()
    setResult(null)
  }

  const test = () => {
    setTesting(true)
    setResult(null)
    later(() => {
      setTesting(false)
      setResult(testConnection(kind, url))
    })
  }

  const add = () => {
    if (!result?.ok) return
    const base = slug(name) || kind
    let id = base
    for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`
    const secret = fields.find((f) => f.secret)
    onAdd({
      id,
      label: name.trim(),
      icon: CUSTOM[kind].icon,
      tone: CUSTOM[kind].tone,
      kind,
      status: 'connected',
      url: url.trim(),
      auth,
      secret: secret ? '•'.repeat(20) + (values[secret.label] ?? '').slice(-4) : undefined,
      lastCheck: 'Just now',
      tools: result.tools,
    })
  }

  return (
    <Dialog
      title={kind === 'mcp' ? 'Add a custom MCP server' : 'Add a custom API'}
      onClose={onCancel}
      footer={
        <>
          <BackButton onBack={onBack} />
          <Button size="sm" variant="neutral" onClick={test} disabled={!filled || testing}>
            {testing ? 'Testing' : 'Test connection'}
          </Button>
          <Button size="sm" onClick={add} disabled={!result?.ok}>
            Add connector
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input className={FIELD} value={name} onChange={(e) => edit(() => setName(e.target.value))} />
        </Field>
        <Field label={kind === 'mcp' ? 'Server URL' : 'Base URL'}>
          <input
            className={cn(FIELD, 'font-mono')}
            value={url}
            placeholder="https://"
            onChange={(e) => edit(() => setUrl(e.target.value))}
          />
        </Field>
      </div>

      <div role="radiogroup" aria-label="Authentication" className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-default">Authentication</span>
        <div className="flex flex-wrap gap-2">
          {AUTH_FOR[kind].map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={auth === a}
              onClick={() =>
                edit(() => {
                  setAuth(a)
                  setValues({})
                })
              }
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm transition-colors duration-base',
                auth === a
                  ? 'border-brand bg-brand-bg font-medium text-brand-fg'
                  : 'border-strong bg-surface-card text-default hover:bg-brand-50',
                FOCUS,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex h-3.5 w-3.5 items-center justify-center rounded-full border',
                  auth === a ? 'border-brand' : 'border-strong',
                )}
              >
                {auth === a && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
              </span>
              {a}
            </button>
          ))}
        </div>
      </div>

      {fields.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <Field key={f.label} label={f.label}>
              <input
                type={f.secret ? 'password' : 'text'}
                autoComplete="off"
                className={cn(FIELD, 'font-mono')}
                value={values[f.label] ?? ''}
                onChange={(e) => edit(() => setValues((v) => ({ ...v, [f.label]: e.target.value })))}
              />
            </Field>
          ))}
        </div>
      )}

      {result && !result.ok && (
        <div role="alert" className="rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-fg">
          {result.reason}
        </div>
      )}

      {result?.ok && (
        <div className="flex animate-fade-up flex-col gap-2 rounded-md border border-success bg-success-bg px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-fg">
            <Check aria-hidden className="h-3.5 w-3.5" />
            {result.detail}
          </span>
          {result.tools && (
            <ul className="flex flex-wrap gap-1">
              {result.tools.map((t) => (
                <li key={t.name}>
                  <Badge tone="success">{t.name}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-default">{label}</span>
      {children}
    </label>
  )
}
