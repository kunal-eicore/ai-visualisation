import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PanelSection, SidePanel } from '@/components/workspace/SidePanel'
import { Table, Td, Th } from '@/routes/quotation/group-health/parts'
import { recChange, recScopeLabel, useRec } from './coverRecs'
import { CLIENT, graphFor, type CoverRec, type Derivation, type GraphNodeId } from './data'
import { GraphView } from './GraphView'

/**
 * How one recommendation was derived, in the order a reader would challenge
 * it: the graph slice it was read off, what the cohort's history says, and
 * three of the actual quotations behind those figures.
 *
 * The node the panel opens on is the cohort, because it is the one derived
 * step on the path — the stored edges are records, the similarity match is a
 * judgement, and the judgement is what should be inspected first.
 */
export function WhyPanel({
  rec,
  sumInsured,
  onClose,
}: {
  rec: CoverRec
  sumInsured: number
  onClose: () => void
}) {
  const { state, apply, undo } = useRec(rec)
  const change = recChange(rec, sumInsured)
  const graph = graphFor(rec, change.to)
  const [selected, setSelected] = useState<GraphNodeId>('cohort')
  const node = graph.nodes.find((n) => n.id === selected)!

  return (
    <SidePanel
      title={rec.cover}
      eyebrow={`${recScopeLabel(rec.scope)} · ${Math.round(rec.confidence * 100)}% confidence`}
      closeLabel="Close explanation"
      half
      onClose={onClose}
      footer={
        <>
          <Button size="sm" variant="neutral" onClick={onClose}>
            Close
          </Button>
          <span className="ml-auto" />
          {state === 'open' && (
            <Button size="sm" onClick={apply}>
              Apply
            </Button>
          )}
          {state === 'working' && (
            <Button size="sm" disabled>
              Applying
            </Button>
          )}
          {state === 'applied' && (
            <Button size="sm" variant="outline" onClick={undo}>
              Undo
            </Button>
          )}
        </>
      }
    >
      <div className="flex items-center gap-2 text-md">
        <span className="text-muted">{change.from}</span>
        <ArrowRight aria-hidden className="h-4 w-4 text-muted" />
        <span className="font-semibold text-default">{change.to}</span>
        {state === 'applied' && (
          <Badge tone="success" className="ml-2">
            Applied
          </Badge>
        )}
      </div>

      <PanelSection
        title="Knowledge graph"
        aside={
          <span className="flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <svg width="20" height="2" aria-hidden>
                <line x1="0" y1="1" x2="20" y2="1" strokeWidth="2" className="stroke-neutral-600" />
              </svg>
              Stored
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="20" height="2" aria-hidden>
                <line x1="0" y1="1" x2="20" y2="1" strokeWidth="2" strokeDasharray="5 4" className="stroke-neutral-600" />
              </svg>
              Derived
            </span>
          </span>
        }
      >
        <GraphView nodes={graph.nodes} edges={graph.edges} selected={selected} onSelect={setSelected} />

        <div className="rounded-lg border border-default">
          <div className="flex flex-col gap-0.5 border-b border-default px-4 py-3">
            <span className="font-mono text-xs text-muted">{node.type}</span>
            <span className="text-base font-semibold text-default">{node.name}</span>
          </div>
          <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-3 text-sm">
            <dt className="text-muted">ARN</dt>
            <dd className="break-all font-mono text-xs leading-5 text-subtle">
              {node.arn ?? 'Derived, not stored'}
            </dd>
            {!node.derivation &&
              Object.entries(node.attributes).map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="font-mono text-xs leading-5 text-muted">{key}</dt>
                  <dd className="text-default">{value}</dd>
                </div>
              ))}
            {node.derivation?.kind === 'count' && <CountRows derivation={node.derivation} />}
          </dl>
          {node.derivation?.kind === 'funnel' && <Funnel steps={node.derivation.steps} />}
        </div>
      </PanelSection>

      <PanelSection title="Historical insights" aside={<span className="text-xs text-muted">{rec.cohort.match}</span>}>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-default bg-neutral-200">
          {rec.insights.map((insight) => (
            <div key={insight.label} className="flex flex-col gap-1 bg-surface-card px-4 py-3">
              <span className="text-lg font-semibold text-default">{insight.value}</span>
              <span className="text-sm text-subtle">{insight.label}</span>
            </div>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Examples">
        <div className="overflow-hidden rounded-lg border border-default">
          <Table>
            <thead>
              <tr>
                <Th>Quotation</Th>
                <Th>Client</Th>
                <Th align="right">Employees</Th>
                <Th>{rec.cover}</Th>
                <Th>Outcome</Th>
              </tr>
            </thead>
            <tbody>
              {rec.examples.map((ex) => (
                <tr key={ex.number}>
                  <Td>
                    <span className="flex flex-col">
                      <span className="font-mono text-xs text-default">{ex.number}</span>
                      <span className="text-xs text-muted">{ex.decidedOn}</span>
                    </span>
                  </Td>
                  <Td>
                    <span className="flex flex-col">
                      <span className="text-default">{ex.client}</span>
                      <span className="text-xs text-muted">{ex.industry}</span>
                    </span>
                  </Td>
                  <Td align="right">{ex.employees.toLocaleString('en-IN')}</Td>
                  <Td strong>{ex.value}</Td>
                  <Td>
                    <Badge tone={ex.status === 'APPROVED' ? 'success' : 'alert'}>
                      {ex.status === 'APPROVED' ? 'Approved' : 'Declined'}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </PanelSection>
    </SidePanel>
  )
}

/** A cohort's matching rules, applied in order, narrowing to the cohort. */
function Funnel({ steps }: { steps: Extract<Derivation, { kind: 'funnel' }>['steps'] }) {
  return (
    <div className="border-t border-default">
      <Table>
        <thead>
          <tr>
            <Th>Rule</Th>
            <Th>Field</Th>
            <Th>{CLIENT.name}</Th>
            <Th align="right">Quotations left</Th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => {
            const last = i === steps.length - 1
            return (
              <tr key={step.rule}>
                <Td strong={last}>{step.rule}</Td>
                <Td>
                  <span className="font-mono text-xs text-subtle">{step.field}</span>
                </Td>
                <Td>{step.client ?? <span className="text-muted">–</span>}</Td>
                <Td align="right" strong={last}>
                  {step.left}
                </Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </div>
  )
}

/** An outcome's tally: which field was read, over what, and the counts. */
function CountRows({ derivation }: { derivation: Extract<Derivation, { kind: 'count' }> }) {
  return (
    <>
      <dt className="text-muted">Read from</dt>
      <dd className="font-mono text-xs leading-5 text-subtle">{derivation.field}</dd>
      <dt className="text-muted">Counted over</dt>
      <dd className="text-default">{derivation.over}</dd>
      {derivation.counts.map((c) => (
        <div key={c.value} className="contents">
          <dt className="font-mono text-xs leading-5 text-muted">{c.value}</dt>
          <dd className="font-semibold text-default">{c.n}</dd>
        </div>
      ))}
    </>
  )
}
