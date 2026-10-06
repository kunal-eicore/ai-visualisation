import { useState } from 'react'
import { ChevronDown, ChevronRight, CircleCheck, CircleX, Info, ListChecks, MinusCircle, Play, Send } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { Graph } from './Graph'
import { Region, Workspace } from '@/components/workspace/Shell'
import { CHECKS, NODE_BY_ID, RUN_HISTORY, type Check, type CheckStatus } from './data'

const STATUS_TONE: Record<CheckStatus, Tone> = { pass: 'success', fail: 'danger', skipped: 'neutral' }
const STATUS_LABEL: Record<CheckStatus, string> = { pass: 'PASS', fail: 'FAIL', skipped: 'SKIP' }
const STATUS_ICON = { pass: CircleCheck, fail: CircleX, skipped: MinusCircle }

/** A check written in the context box this session. It has not run, and the
 *  screen says so rather than inventing a result for it. */
type Queued = { id: string; label: string }

type StepTestProps = {
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
}

/**
 * Step 3 — the test run. The rail is results, the canvas is the same graph
 * with each block showing what it actually emitted, and the context box docked
 * under the canvas is where a new assertion gets written in plain words.
 *
 * "AI + manual defined" on the sketch is the point: a suite made only of
 * generated checks drifts towards what the model finds easy to verify, and one
 * made only by hand never covers the paths nobody thought about. Every check
 * carries which it is.
 */
export function StepTest({ selectedNodeId, onSelectNode }: StepTestProps) {
  const [openCheck, setOpenCheck] = useState<string | null>('c3')
  const [hovered, setHovered] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [queued, setQueued] = useState<Queued[]>([])

  // The canvas reads outcome per block. A block with any failing check is a
  // failing block — the worst status wins, never the latest one.
  const statusByNode: Record<string, CheckStatus> = {}
  CHECKS.forEach((c) => {
    const prev = statusByNode[c.nodeId]
    if (prev === 'fail') return
    if (c.status === 'fail' || prev === undefined) statusByNode[c.nodeId] = c.status
  })

  const passed = CHECKS.filter((c) => c.status === 'pass').length
  const failed = CHECKS.filter((c) => c.status === 'fail').length
  const skipped = CHECKS.filter((c) => c.status === 'skipped').length

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    setQueued((q) => [...q, { id: `q-${q.length + 1}`, label: text }])
    setDraft('')
  }

  return (
    <Workspace cols="xl:grid-cols-[320px_minmax(0,1fr)]">
      <Region
        title="Checks"
        icon={<ListChecks aria-hidden className="h-4 w-4 text-muted" />}
        info="What correct means for this workflow, run against the recorded stream. Each check is labelled AI or Manual: a suite of only generated checks drifts towards what is easy to verify, and a hand-written one never covers the paths nobody thought of. Open a row for expected against actual."
        pad={false}
        actions={
          <>
            <Badge tone="success">{passed} pass</Badge>
            <Badge tone={failed ? 'danger' : 'neutral'}>{failed} fail</Badge>
          </>
        }
        footer={
          /* The sketch's "info" box at the foot of the rail. */
          <p className="flex items-start gap-2 text-xs text-subtle">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <span>
              <span className="font-mono">{skipped}</span> check skipped — the counter-offer block never ran
              on this path. A skip is not a pass, and the run is not green.
            </span>
          </p>
        }
      >
        <ul>
          {CHECKS.map((c) => (
            <CheckRow
              key={c.id}
              check={c}
              open={openCheck === c.id}
              onToggle={() => {
                setOpenCheck((prev) => (prev === c.id ? null : c.id))
                onSelectNode(c.nodeId)
              }}
              onHover={setHovered}
            />
          ))}

          {queued.map((q) => (
            <li key={q.id} className="flex items-start gap-2 border-b border-subtle bg-warning-bg px-3 py-2">
              <Badge tone="warning">QUEUED</Badge>
              <span className="text-xs text-warning-fg">{q.label}</span>
            </li>
          ))}
        </ul>
      </Region>

      <Region
        title="Run 114"
        icon={<Play aria-hidden className="h-4 w-4 text-muted" />}
        info="The same graph, showing what each block actually emitted on this run — extracted fields, the score with its band, the branch the gate took. A failing block is ringed in red; passing ones are left alone."
        meta="against the recorded stream, 2 hours ago"
        sunken
        pad={false}
        actions={
          <>
            <Badge tone="danger" dot>1 failing</Badge>
            {RUN_HISTORY.filter((r) => !r.current).map((r) => (
              <span key={r.id} className="hidden font-mono text-xs text-muted lg:inline">
                {r.label}: {r.passed}/{r.passed + r.failed + r.skipped}
              </span>
            ))}
            <Button size="sm" icon={<Play aria-hidden className="h-4 w-4" />}>Re-run</Button>
          </>
        }
        footer={
          /* Context box — "type away". Docked to the canvas, because what you
             type is scoped to what is selected on it. */
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
                }}
                placeholder="The risk score must name every contribution worth more than five points."
                className={cn(
                  'h-14 w-full resize-none rounded-md border border-strong bg-surface-card px-2.5 py-1.5 text-base text-default',
                  'placeholder:text-muted transition-shadow duration-base focus:border-focus focus:outline-none focus:shadow-focus-field',
                )}
              />
              <Button size="sm" onClick={submit} disabled={!draft.trim()} icon={<Send aria-hidden className="h-4 w-4" />}>
                Add check
              </Button>
            </div>
            <p className="text-xs text-muted">
              {selectedNodeId ? `Scoped to ${NODE_BY_ID[selectedNodeId].label}` : 'Scoped to the whole workflow'}
              {' '}— queued for the next run, not scored against this one.
            </p>
          </div>
        }
      >
        <Graph
          mode="test"
          selectedId={selectedNodeId}
          onSelect={(id) => onSelectNode(id === selectedNodeId ? null : id)}
          hoveredId={hovered}
          onHover={setHovered}
          statusByNode={statusByNode}
        />
      </Region>
    </Workspace>
  )
}

function CheckRow({
  check: c,
  open,
  onToggle,
  onHover,
}: {
  check: Check
  open: boolean
  onToggle: () => void
  onHover: (id: string | null) => void
}) {
  const Icon = STATUS_ICON[c.status]
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <li
      onMouseEnter={() => onHover(c.nodeId)}
      onMouseLeave={() => onHover(null)}
      className="border-b border-subtle"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors duration-base',
          'focus-visible:outline-none focus-visible:shadow-focus',
          open ? 'bg-neutral-50' : 'hover:bg-neutral-50',
        )}
      >
        <Chevron aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Badge tone={STATUS_TONE[c.status]} icon={<Icon aria-hidden className="h-3 w-3" />}>
              {STATUS_LABEL[c.status]}
            </Badge>
            <span className="ml-auto truncate font-mono text-xs text-muted">
              {c.origin} · {NODE_BY_ID[c.nodeId].label}
            </span>
          </div>
          <span className="text-xs font-medium text-default">{c.label}</span>
        </div>
      </button>

      {/* Expands in place, the way a run row does on Shadow Parity. */}
      {open && (
        <div className="flex animate-fade-up flex-col gap-2 border-t border-subtle bg-neutral-50 px-3 py-2.5 pl-8">
          <Field label="Expected" value={c.expected} />
          <Field label="Actual" value={c.actual} tone={c.status === 'fail' ? 'danger' : undefined} />
          {c.note && <p className="border-t border-subtle pt-2 text-xs text-subtle">{c.note}</p>}
        </div>
      )}
    </li>
  )
}

function Field({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span className={cn('text-xs', tone === 'danger' ? 'text-danger' : 'text-subtle')}>{value}</span>
    </div>
  )
}
