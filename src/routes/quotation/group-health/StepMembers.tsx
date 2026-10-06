import { useState } from 'react'
import {
  CircleCheck,
  CircleMinus,
  Copy,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  RefreshCw,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { FIELD } from '@/components/workspace/field'
import { cn } from '@/lib/cn'
import {
  BarCell,
  Dialog,
  Figure,
  RowAction,
  RowActions,
  SectionCard,
  Table,
  Td,
  Th,
  TotalRow,
  useProvenance,
} from './parts'
import {
  AGE_BANDS,
  AVG_FAMILY_SIZE,
  DOCUMENTS,
  DROPPED_FILES,
  EXTRACTION,
  IMPORT_RESULT,
  FAMILY_TYPES,
  MEMBER_GROUPS,
  RELATIONSHIPS,
  RELATIONSHIP_BREAKUP,
  formatInr,
  type MemberGroup,
} from './data'
import { useHandoffProps } from './Handoffs'

const SI_TYPES = ['Individual', 'Family Floater', 'Multi-Individual'] as const

/**
 * Step 3 — Member Details (Demographic Data).
 *
 * The densest step in the flow, and the one that carries the most state.
 * Three stacked cards: the group bands read out of the census, the age-band
 * matrix, and the relationship breakup.
 *
 * Both matrices have a read mode and an edit mode, and the toggle is per-card
 * rather than per-screen. That is deliberate and comes from the source: an
 * underwriter correcting two cells in the age matrix should not be dropped
 * into a screen where every number on the page has become an input.
 *
 * The rule the whole step is tuned to: **weight and alignment carry the
 * hierarchy, colour is reserved for state.** Before this, a member count and
 * a sum insured were each a Badge — and once numbers wear the status
 * vocabulary, nothing on the page reads as status any more.
 */
export function StepMembers() {
  const ageBandHandoff = useHandoffProps('members.ageBands')

  const [groups, setGroups] = useState<MemberGroup[]>(MEMBER_GROUPS)
  const [editingGroup, setEditingGroup] = useState<MemberGroup | null>(null)
  const [showDocuments, setShowDocuments] = useState(false)
  const [editMatrix, setEditMatrix] = useState(false)
  const [editBreakup, setEditBreakup] = useState(false)
  const provenance = useProvenance()

  // A run that started on a blank form has no census file behind it, so the
  // receipt and the documents list are not "empty" here — they do not exist.
  const imported = provenance === 'imported'
  const hasFile = provenance !== 'manual'
  const files = imported ? DROPPED_FILES.filter((f) => f.verdict === 'accepted') : DOCUMENTS

  const totalMembers = groups.reduce((sum, g) => sum + g.members, 0)
  const bandTotals = AGE_BANDS.map((_, i) =>
    RELATIONSHIPS.reduce((sum, rel) => sum + RELATIONSHIP_BREAKUP[rel][i], 0),
  )

  // Bars are scaled against the largest cell in the WHOLE matrix, so 18 and
  // 1402 stay different lengths. Rescaling per row would flatten the one
  // thing the matrix exists to show.
  const matrixMax = Math.max(...groups.flatMap((g) => g.byAgeBand))
  const breakupMax = Math.max(...RELATIONSHIPS.flatMap((rel) => RELATIONSHIP_BREAKUP[rel]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-lg font-semibold text-default">Demographic Data</h2>
          <p className="text-base text-subtle">
            {imported
              ? 'Imported from the census template. Edit any band or cell below.'
              : 'Upload member data or demographic data, or add manually.'}
          </p>
        </div>
        {hasFile && (
          <Button size="sm" variant="neutral" onClick={() => setShowDocuments(true)}>
            <FileSpreadsheet aria-hidden className="h-4 w-4" />
            Documents
          </Button>
        )}
      </div>

      {/* The census receipt. Not a Callout — it is the source file the rest of
          the step is derived from, so it reads as a record.

          One line, and the figures are quoted inline rather than stacked into
          four centred stat columns: stacked columns read as a KPI strip, and
          these numbers are here to identify a file, not to be the headline.
          Step 1's overview already gave the pool its hero. The attention
          count is the only figure that takes a tone. */}
      {hasFile && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-default bg-surface-card px-4 py-3 shadow-card">
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <CircleCheck aria-hidden className="h-4 w-4 shrink-0 text-success-500" />
            <span className="truncate text-base font-medium text-default">
              {imported ? `${IMPORT_RESULT.template} (Sheet: Active Members)` : EXTRACTION.sheet}
            </span>
          </span>
          <Figure value={totalMembers.toLocaleString('en-IN')} label="lives" />
          <Figure value={EXTRACTION.employees.toLocaleString('en-IN')} label="employees" />
          <Figure
            value={String(imported ? IMPORT_RESULT.skipped : EXTRACTION.errors)}
            label={imported ? 'rows skipped' : 'errors'}
            tone="warning"
          />
          <span className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="text">
              <Download aria-hidden className="h-4 w-4" />
              Download
            </Button>
            <Button size="sm" variant="text">
              <RefreshCw aria-hidden className="h-4 w-4" />
              Replace
            </Button>
          </span>
        </div>
      )}

      {/* The bands, as a table rather than a list of pills. A member count and
          a sum insured are quantities: they belong in right-aligned tabular
          columns you can compare down, not in badges that make every value on
          the row look like a status. */}
      <SectionCard
        title="Group Bands"
        autoFilled
        meta={<span className="text-sm text-muted">{groups.length} groups</span>}
        actions={
          <Button size="sm" variant="outline">
            <Plus aria-hidden className="h-4 w-4" />
            Add group
          </Button>
        }
        pad={false}
      >
        <Table>
          <thead>
            <tr>
              <Th>Group</Th>
              <Th>SI type</Th>
              <Th align="right">Sum insured</Th>
              <Th align="right">Members</Th>
              <Th align="right">Share</Th>
              <Th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id} className="group hover:bg-neutral-50">
                <Td strong>{group.name}</Td>
                <Td>{group.siType}</Td>
                <Td align="right" strong>
                  {formatInr(group.sumInsured)}
                </Td>
                <Td align="right">{group.members.toLocaleString('en-IN')}</Td>
                <Td align="right" className="text-muted">
                  {((group.members / totalMembers) * 100).toFixed(1)}%
                </Td>
                <Td align="right" className="py-1.5">
                  <RowActions>
                    <RowAction label={`Duplicate ${group.name}`} icon={Copy} />
                    <RowAction
                      label={`Edit ${group.name}`}
                      icon={Pencil}
                      onClick={() => setEditingGroup(group)}
                    />
                    <RowAction label={`Remove ${group.name}`} icon={X} tone="danger" />
                  </RowActions>
                </Td>
              </tr>
            ))}
            <TotalRow>
              <Td strong>Total</Td>
              <Td />
              <Td />
              <Td align="right" strong>
                {totalMembers.toLocaleString('en-IN')}
              </Td>
              <Td align="right">100%</Td>
              <Td />
            </TotalRow>
          </tbody>
        </Table>
      </SectionCard>

      {/* The age matrix. Column heads carry the group and its sum insured and
          nothing else — the reconciliation that used to sit up here as
          `3435/3435` with a green check was the same number twice, and it
          lives in the total row, where a mismatch is what it is checking. */}
      <SectionCard
        id="members.ageBands"
        title="Members by Age Band"
        autoFilled
        {...ageBandHandoff}
        meta={<span className="text-sm text-muted">Age bands down, groups across</span>}
        actions={<EditToggle editing={editMatrix} onToggle={() => setEditMatrix((v) => !v)} />}
        pad={false}
      >
        <Table>
          <thead>
            <tr>
              <Th>Age band</Th>
              {groups.map((g) => (
                <Th key={g.id} align="right">
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="text-base font-semibold normal-case tracking-normal text-default">
                      {formatInr(g.sumInsured)}
                    </span>
                    <span className="font-sans text-xs normal-case tracking-normal text-muted">
                      {g.members.toLocaleString('en-IN')} members
                    </span>
                  </span>
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AGE_BANDS.map((band, row) => (
              <tr key={band}>
                <Td strong>{band}</Td>
                {groups.map((g) =>
                  editMatrix ? (
                    <Td key={g.id} align="right">
                      <input
                        aria-label={`${g.name}, age band ${band}`}
                        className={cn(FIELD, 'ml-auto max-w-[96px] text-right')}
                        value={g.byAgeBand[row]}
                        onChange={(e) =>
                          setGroups((prev) =>
                            prev.map((p) =>
                              p.id === g.id
                                ? {
                                    ...p,
                                    byAgeBand: p.byAgeBand.map((v, i) =>
                                      i === row ? Number(e.target.value) || 0 : v,
                                    ),
                                  }
                                : p,
                            ),
                          )
                        }
                      />
                    </Td>
                  ) : (
                    <BarCell key={g.id} value={g.byAgeBand[row]} max={matrixMax} />
                  ),
                )}
              </tr>
            ))}
            <TotalRow>
              <Td strong>Total</Td>
              {groups.map((g) => (
                <Td key={g.id} align="right" strong>
                  <BandReconciliation
                    allocated={g.byAgeBand.reduce((a, b) => a + b, 0)}
                    expected={g.members}
                  />
                </Td>
              ))}
            </TotalRow>
          </tbody>
        </Table>
      </SectionCard>

      <SectionCard
        title="Relationship &amp; Age-band Breakup"
        autoFilled
        meta={<Figure value={AVG_FAMILY_SIZE} label="avg family size" />}
        actions={<EditToggle editing={editBreakup} onToggle={() => setEditBreakup((v) => !v)} />}
        pad={false}
      >
        <Table>
          <thead>
            <tr>
              <Th>Relationship</Th>
              {AGE_BANDS.map((band) => (
                <Th key={band} align="right">
                  {band}
                </Th>
              ))}
              <Th align="right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {RELATIONSHIPS.map((rel) => {
              const row = RELATIONSHIP_BREAKUP[rel]
              return (
                <tr key={rel}>
                  <Td strong>{rel}</Td>
                  {row.map((count, i) =>
                    editBreakup ? (
                      <Td key={AGE_BANDS[i]} align="right">
                        <input
                          aria-label={`${rel}, age band ${AGE_BANDS[i]}`}
                          className={cn(FIELD, 'ml-auto max-w-[88px] text-right')}
                          defaultValue={count}
                        />
                      </Td>
                    ) : (
                      <BarCell key={AGE_BANDS[i]} value={count} max={breakupMax} />
                    ),
                  )}
                  <Td align="right" strong>
                    {row.reduce((a, b) => a + b, 0).toLocaleString('en-IN')}
                  </Td>
                </tr>
              )
            })}
            <TotalRow>
              <Td strong>Total</Td>
              {bandTotals.map((total, i) => (
                <Td key={AGE_BANDS[i]} align="right" strong>
                  {total.toLocaleString('en-IN')}
                </Td>
              ))}
              <Td align="right" strong>
                {bandTotals.reduce((a, b) => a + b, 0).toLocaleString('en-IN')}
              </Td>
            </TotalRow>
          </tbody>
        </Table>
      </SectionCard>

      {editingGroup && (
        <EditGroupDialog group={editingGroup} onClose={() => setEditingGroup(null)} />
      )}

      {showDocuments && (
        <Dialog title="Uploaded Documents" onClose={() => setShowDocuments(false)} width="max-w-[720px]">
          <Table>
            <thead>
              <tr>
                <Th>Document</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th align="right" />
              </tr>
            </thead>
            <tbody>
              {files.map((doc) => (
                <tr key={doc.name}>
                  <Td strong>{doc.name}</Td>
                  <Td>{'type' in doc ? doc.type : 'Template'}</Td>
                  <Td>
                    <Badge tone="success">{'status' in doc ? doc.status : 'Imported'}</Badge>
                  </Td>
                  <Td align="right">
                    <Button size="sm" variant="text">
                      View
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Dialog>
      )}
    </div>
  )
}

function EditGroupDialog({ group, onClose }: { group: MemberGroup; onClose: () => void }) {
  const [siType, setSiType] = useState<string>(group.siType)

  return (
    <Dialog
      title="Edit Group"
      onClose={onClose}
      footer={
        <>
          <Button variant="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose}>Save changes</Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DialogField label="Group name" required>
          <input className={FIELD} defaultValue={group.name} />
        </DialogField>
        <DialogField label="Sum insured">
          <select className={FIELD} defaultValue={formatInr(group.sumInsured)}>
            {MEMBER_GROUPS.map((g) => (
              <option key={g.id}>{formatInr(g.sumInsured)}</option>
            ))}
          </select>
        </DialogField>
      </div>

      <DialogField label="SI type">
        <div className="flex flex-wrap gap-2">
          {SI_TYPES.map((t) => (
            <Chip key={t} label={t} selected={siType === t} onClick={() => setSiType(t)} />
          ))}
        </div>
      </DialogField>

      <DialogField label="Family type">
        <select className={FIELD} defaultValue="">
          <option value="" disabled>
            Select family type
          </option>
          {FAMILY_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </DialogField>

      <DialogField label="Location">
        <input className={FIELD} placeholder="e.g. Mumbai, Delhi NCR, Pan India" />
      </DialogField>

      <div className="grid gap-4 md:grid-cols-2">
        <DialogField label="Total members">
          <input className={FIELD} defaultValue={group.members} />
        </DialogField>
        <DialogField label="Designation">
          <input className={FIELD} placeholder="e.g. Manager" />
        </DialogField>
      </div>
    </Dialog>
  )
}

function DialogField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-base text-default">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

/**
 * Does the age matrix add up to the group's head count?
 *
 * Four states, as `MatrixGroupHeader` has them in the source — and the two
 * failures are genuinely different jobs, which is why one colour for "wrong"
 * was not enough: `over` means more members allocated across the bands than
 * the group holds, so something has to come OUT; `under` means the
 * allocation is unfinished, so something has to go IN. An empty group is
 * neither, and shows nothing rather than a zero against a zero.
 *
 * It sits in the total row rather than in the column head, which is where
 * the source puts it: it is a statement about a column of numbers, so it
 * belongs at the foot of that column, and on a match it does not repeat the
 * head count — the row above already is it.
 */
function BandReconciliation({ allocated, expected }: { allocated: number; expected: number }) {
  if (expected === 0) return null

  const total = allocated.toLocaleString('en-IN')
  if (allocated === expected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-success-600">
        <CircleCheck aria-hidden className="h-3.5 w-3.5" />
        {total}
      </span>
    )
  }

  const over = allocated > expected
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        over ? 'text-warning-fg' : 'text-danger',
      )}
    >
      {over ? (
        <TriangleAlert aria-hidden className="h-3.5 w-3.5" />
      ) : (
        <CircleMinus aria-hidden className="h-3.5 w-3.5" />
      )}
      {total}
      <span className="text-xs font-normal text-muted">
        of {expected.toLocaleString('en-IN')}
      </span>
    </span>
  )
}

function EditToggle({ editing, onToggle }: { editing: boolean; onToggle: () => void }) {
  return (
    <Button size="sm" variant={editing ? 'primary' : 'outline'} onClick={onToggle}>
      {editing ? (
        <>
          <CircleCheck aria-hidden className="h-4 w-4" />
          Done
        </>
      ) : (
        <>
          <Pencil aria-hidden className="h-4 w-4" />
          Edit
        </>
      )}
    </Button>
  )
}
