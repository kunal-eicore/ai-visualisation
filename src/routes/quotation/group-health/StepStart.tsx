import { useEffect, useState, type ReactNode } from 'react'
import { Download, FileUp, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Mode } from '@/lib/autonomy'
import { ActionSlot, DropZone, FileList, FileRow, Table, Td, Th } from './parts'
import { cn } from '@/lib/cn'
import type { FileState, Provenance } from './parts'
import {
  AVG_FAMILY_SIZE,
  DROPPED_FILES,
  EXTRACTION,
  EXTRACTION_FILES,
  IMPORT_CHECKS,
  IMPORT_FILES,
  IMPORT_RESULT,
  MEMBER_GROUPS,
  TEMPLATES,
  formatInr,
} from './data'

/**
 * Step 1 — Start Quotation. The one step the autonomy mode rewrites.
 *
 * It has to be rewritten, because this is where the modes differ in kind
 * rather than in degree: Manual imports the published template or starts
 * blank; AI-assisted, Hybrid and Autonomous can additionally read documents
 * nobody agreed the shape of.
 *
 * **Autonomous uses the same upload as the two rungs below it.** An earlier
 * version skipped it and opened on a finished report, which quietly said the
 * run begins when you flip a switch. It does not: it begins when you give it
 * the pack and then tell it what it may do. Handing over the documents is
 * the same act at every rung that can read them, so it is the same screen —
 * what Autonomous adds comes after Continue, on the board.
 *
 * **Manual is not "no files".** It reads a filled copy of the census template
 * — a script walking fixed sheets and fixed headers — and rejects anything
 * that is not that template instead of guessing at it. That is the whole
 * distinction the two upload branches draw, and it is drawn with the import
 * result rather than with a paragraph: the Manual branch lists what it would
 * not take and why, next to what it took.
 *
 * Every branch ends the same way — a person pressing Continue. That is not
 * ceremony: it is the property the whole ladder is built on, and the step
 * that starts the run is the first place it has to be visible.
 *
 * The import, the extraction and the agent run are all two-second fakes.
 * Nothing is read and nothing is parsed; the numbers that come back are the
 * fixtures. What is being shown is the shape of the wait and what the user is
 * asked to confirm at the end of it.
 */
export function StepStart({
  mode,
  onContinue,
}: {
  mode: Mode
  /** Where the next steps' values came from, which is the claim every section
   *  card then makes about its own contents. */
  onContinue: (source: Provenance) => void
}) {
  if (!mode.extraction) return <ManualStart onContinue={onContinue} />
  return <ExtractionStart onContinue={onContinue} />
}

/* ----------------------------------------------------------------- manual */

type UploadPhase = 'select' | 'overview'

/**
 * Manual — the template import, or a blank form.
 *
 * No chat, no model, no field arrives with a guess in it. What it does have is
 * the import, because refusing a 1,367-row workbook would not make the mode
 * safer, only slower — and the ladder's bottom rung is meant to cost speed,
 * not usability.
 *
 * Two screens, the same two the AI branch uses: drop the files and watch each
 * one get a verdict, then read what they yielded. The progress screen that
 * used to sit between them is gone — the five checks still run and are still
 * named, but they are named on the row being checked, where the name has an
 * owner.
 *
 * The template strip comes before the drop zone, because an import that only
 * accepts one shape of file is unusable until you have that shape. Publishing
 * the template IS the feature; the upload is the back half of it.
 */
function ManualStart({ onContinue }: { onContinue: (source: Provenance) => void }) {
  const [phase, setPhase] = useState<UploadPhase>('select')
  const upload = useUpload(DROPPED_FILES.map((f) => f.name))
  const kept = DROPPED_FILES.filter((f) => upload.kept.includes(f.name))

  if (phase === 'overview') {
    return (
      <ImportOverview onBack={() => setPhase('select')} onContinue={() => onContinue('imported')} />
    )
  }

  return (
    <UploadScreen
      title="Start Quotation"
      subtitle="Import a filled census template, or start from a blank form."
      before={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">Templates</span>
          {TEMPLATES.map((template) => (
            <Button key={template.name} size="sm" variant="neutral">
              <Download aria-hidden className="h-4 w-4" />
              {template.name} {template.version}
            </Button>
          ))}
        </div>
      }
      drop={
        <DropZone
          icon={<FileUp aria-hidden className="h-5 w-5" />}
          title="Drop the filled template here"
          accepts="Template workbooks only — .xlsx matching Member Census v4.2 or Prior Claims v2.1."
          action={
            <Button size="sm" variant="outline" onClick={upload.start}>
              Choose files
            </Button>
          }
        />
      }
      files={kept.map((file) => {
        const state = upload.stateOf(file.name, file.verdict === 'accepted' ? 'ok' : 'error')
        const result = IMPORT_FILES.find((r) => r.name === file.name)
        return (
          <FileRow
            key={file.name}
            state={state}
            name={file.name}
            meta={
              state === 'checking'
                ? upload.checkLabel(file.name)
                : state === 'error'
                  ? file.detail
                  : result
                    ? `${file.detail} · ${result.imported.toLocaleString('en-IN')} rows`
                    : file.detail
            }
            action={
              /* Only the read that failed. A rejection is deterministic —
                 the same file reads the same way every time — so the move
                 there is to take it out, not to ask again. */
              state === 'error' && file.verdict === 'failed' ? (
                <Button size="sm" variant="neutral">
                  <RefreshCw aria-hidden className="h-4 w-4" />
                  Retry
                </Button>
              ) : undefined
            }
            onRemove={state === 'checking' ? undefined : () => upload.remove(file.name)}
          />
        )
      })}
      started={upload.started}
      busy={upload.busy}
      count={kept.filter((f) => f.verdict === 'accepted').length}
      skip={
        <Button size="sm" variant="neutral" onClick={() => onContinue('manual')}>
          Start with a blank form
        </Button>
      }
      onContinue={() => setPhase('overview')}
    />
  )
}

function ImportOverview({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const skipped = IMPORT_FILES.reduce((n, f) => n + f.skipped, 0)

  return (
    <div className="flex flex-col gap-4">
      <Heading title="Import Overview" subtitle={`Read from ${IMPORT_RESULT.template}.`} />

      <CensusFigure
        attention={{ value: String(skipped), label: 'Rows skipped', tone: 'danger' }}
      />

      <div className="overflow-hidden rounded-lg border border-default bg-surface-card shadow-card">
        <Table>
          <thead>
            <tr>
              <Th>File</Th>
              <Th align="right">Rows read</Th>
              <Th align="right">Time</Th>
              <Th>Result</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {IMPORT_FILES.map((file) => (
              <tr key={file.name}>
                <Td strong>{file.name}</Td>
                <Td align="right">{file.read.toLocaleString('en-IN')}</Td>
                <Td align="right">{file.seconds.toFixed(1)}s</Td>
                <Td>
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone="success">
                      {file.imported.toLocaleString('en-IN')} imported
                    </Badge>
                    {file.skipped > 0 && (
                      <Badge tone="danger">
                        {file.skipped} skipped
                      </Badge>
                    )}
                  </span>
                </Td>
                {/* The exceptions workbook is per file, because that is the
                    file the rows get fixed in and re-imported from. */}
                <Td align="right">
                  {file.skipped > 0 && (
                    <Button size="sm" variant="neutral">
                      <Download aria-hidden className="h-4 w-4" />
                      Exceptions
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <ActionSlot>
        <Button size="sm" variant="neutral" onClick={onBack}>
          Replace files
        </Button>
        <Button size="sm" onClick={onContinue}>
          Continue with {IMPORT_RESULT.rows.toLocaleString('en-IN')} rows
        </Button>
      </ActionSlot>
    </div>
  )
}

/* ---------------------------------------------- AI-assisted / hybrid */

function ExtractionStart({ onContinue }: { onContinue: (source: Provenance) => void }) {
  const [phase, setPhase] = useState<UploadPhase>('select')
  const upload = useUpload(EXTRACTION_FILES.map((f) => f.name), 900)

  if (phase === 'overview') {
    return (
      <ExtractionOverview
        onBack={() => setPhase('select')}
        onContinue={() => onContinue('extracted')}
      />
    )
  }

  return (
    <UploadScreen
      title="Start Quotation"
      subtitle="Upload the client's census, claims and RFQ workbooks, or start from a blank form."
      drop={
        /* The same drop target as the Manual branch, and deliberately so:
           what changes between the rungs is what the target will ACCEPT, not
           what an upload looks like. Here it takes the client's own layouts;
           in Manual it takes the template and nothing else. */
        <DropZone
          icon={<FileUp aria-hidden className="h-5 w-5" />}
          title="Drop the documents here"
          accepts="Member census, prior claims and the broker RFQ — any layout. XLSX, CSV or PDF."
          action={
            <Button size="sm" variant="outline" onClick={upload.start}>
              Choose files
            </Button>
          }
        />
      }
      files={EXTRACTION_FILES.filter((f) => upload.kept.includes(f.name)).map((file) => {
        const state = upload.stateOf(file.name, 'ok')
        return (
          <FileRow
            key={file.name}
            state={state}
            name={file.name}
            meta={
              state === 'checking'
                ? 'Reading'
                : `${file.found} of ${file.fields} fields read`
            }
            onRemove={state === 'checking' ? undefined : () => upload.remove(file.name)}
          />
        )
      })}
      started={upload.started}
      busy={upload.busy}
      count={upload.kept.length}
      skip={
        <Button size="sm" variant="neutral" onClick={() => onContinue('manual')}>
          Skip extraction, fill manually
        </Button>
      }
      onContinue={() => setPhase('overview')}
    />
  )
}

function ExtractionOverview({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const missing = EXTRACTION_FILES.reduce((n, f) => n + f.missing, 0)
  const found = EXTRACTION_FILES.reduce((n, f) => n + f.found, 0)

  return (
    <div className="flex flex-col gap-4">
      <Heading
        title="Extraction Overview"
        subtitle={`Read from ${EXTRACTION_FILES.length} documents.`}
      />

      <CensusFigure
        attention={{ value: String(missing), label: 'Fields left for you', tone: 'warning' }}
      />

      <div className="overflow-hidden rounded-lg border border-default bg-surface-card shadow-card">
        <Table>
          <thead>
            <tr>
              <Th>Document</Th>
              <Th align="right">Fields</Th>
              <Th align="right">Time</Th>
              <Th>Result</Th>
            </tr>
          </thead>
          <tbody>
            {EXTRACTION_FILES.map((file) => (
              <tr key={file.name}>
                <Td strong>{file.name}</Td>
                <Td align="right">{file.fields}</Td>
                <Td align="right">{file.seconds.toFixed(1)}s</Td>
                <Td>
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone="success">
                      {file.found} read
                    </Badge>
                    {file.missing > 0 && (
                      <Badge tone="warning">
                        {file.missing} left for you
                      </Badge>
                    )}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <ActionSlot>
        <Button size="sm" variant="neutral" onClick={onBack}>
          Re-upload
        </Button>
        <Button size="sm" onClick={onContinue}>
          Confirm {found} fields
        </Button>
      </ActionSlot>
    </div>
  )
}

/* ----------------------------------------------------------- census figure */

/**
 * What the file actually contained, as a figure rather than as four boxed
 * numbers.
 *
 * The form follows the data's job. Three sum-insured bands compared by size
 * is a magnitude question, so it is a ranked horizontal bar — one series, one
 * hue, values at the tip, a recessive track, no legend (there is nothing to
 * tell apart). The four equal stat cells this replaces gave a headline number
 * and a rounding error the same weight, and repeated the employee count the
 * table below already carried.
 *
 * The band split is the point. An underwriter reading a census wants to know
 * where the pool sits before anything else, and this one is 95% in the lowest
 * band — a fact that decides how the quote behaves and that no arrangement of
 * totals would have shown. It is the imported data, not an ornament on it.
 */
function CensusFigure({
  attention,
}: {
  /** The one count with work behind it — rows the import would not take, or
   *  fields the read left empty. Colour is reserved for this cell. */
  attention: { value: string; label: string; tone: 'warning' | 'danger' }
}) {
  const lives = MEMBER_GROUPS.reduce((n, g) => n + g.members, 0)

  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-default bg-neutral-200 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex flex-col gap-4 bg-surface-card p-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-3xl font-semibold tabular-nums leading-none text-default">
            {lives.toLocaleString('en-IN')}
          </span>
          <span className="font-mono text-xs uppercase tracking-wide text-muted">
            Lives covered
          </span>
        </div>

        <ul className="flex flex-col gap-2.5">
          {MEMBER_GROUPS.map((group) => (
            <li key={group.id} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-right text-sm tabular-nums text-subtle">
                {formatInr(group.sumInsured)}
              </span>
              <span className="h-2.5 min-w-0 flex-1 rounded-r-[4px] bg-neutral-100">
                <span
                  className="block h-full rounded-r-[4px] bg-brand-700"
                  style={{ width: `${(group.members / lives) * 100}%` }}
                />
              </span>
              <span className="w-28 shrink-0 text-right text-sm tabular-nums text-default">
                {group.members.toLocaleString('en-IN')}
                <span className="pl-1.5 text-muted">
                  {Math.round((group.members / lives) * 100)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col divide-y divide-default bg-surface-card">
        <Figure value={EXTRACTION.employees.toLocaleString('en-IN')} label="Employees" />
        <Figure value={AVG_FAMILY_SIZE.toFixed(2)} label="Average family size" />
        <Figure value={attention.value} label={attention.label} tone={attention.tone} />
      </div>
    </div>
  )
}

function Figure({
  value,
  label,
  tone,
}: {
  value: string
  label: string
  tone?: 'warning' | 'danger'
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-0.5 px-5 py-3">
      <span
        className={cn(
          'text-xl font-semibold tabular-nums',
          tone === 'warning' ? 'text-warning-fg' : tone === 'danger' ? 'text-danger-fg' : 'text-default',
        )}
      >
        {value}
      </span>
      <span className="truncate font-mono text-xs uppercase tracking-wide text-muted">{label}</span>
    </div>
  )
}

/* ------------------------------------------------------- upload screen */

/**
 * One screen for both upload branches: the drop target, the files under it
 * resolving one by one, and the two things a person can do next.
 *
 * The files are not wrapped in a card. A drop zone followed by its own
 * results is one thought, and the card around each half was drawing a box
 * between them for no reason a reader could name.
 */
function UploadScreen({
  title,
  subtitle,
  before,
  drop,
  files,
  started,
  busy,
  count,
  skip,
  onContinue,
}: {
  title: string
  subtitle: string
  before?: ReactNode
  drop: ReactNode
  files: ReactNode
  started: boolean
  busy: boolean
  count: number
  skip: ReactNode
  onContinue: () => void
}) {
  return (
    /* Full canvas width, like every other step. A narrower measure suits a
       drop target on its own, but this one sits in a seven-step form with a
       fixed rail and a fixed bar: a column that stops short of the right
       edge reads as a layout fault, not as a measure. The target is kept in
       proportion by its height instead. */
    <div className="flex flex-col gap-4">
      <Heading title={title} subtitle={subtitle} />
      {before}
      {drop}
      {started && count > 0 && <FileList>{files}</FileList>}
      <ActionSlot>
        {skip}
        {/* The count is what will actually be imported, not what was
            dropped. "Continue with 4 files" over two accepted ones is the
            kind of number people stop reading. */}
        <Button size="sm" disabled={!started || busy || count === 0} onClick={onContinue}>
          {started && count > 0 ? `Continue with ${count} file${count === 1 ? '' : 's'}` : 'Continue'}
        </Button>
      </ActionSlot>
    </div>
  )
}

/**
 * The upload's own state: which files are still in the list, and which have
 * had their verdict.
 *
 * A verdict arrives per file rather than per upload, which is the whole
 * reason the rows resolve one at a time — a rejected file can be retried, or
 * taken back out, while the rest carry on. The wait itself is a fake.
 */
function useUpload(names: string[], step = 700) {
  const [started, setStarted] = useState(false)
  const [done, setDone] = useState(0)
  const [tick, setTick] = useState(0)
  const [removed, setRemoved] = useState<string[]>([])

  useEffect(() => {
    if (!started || done >= names.length) return
    const next = window.setTimeout(() => setDone((n) => n + 1), step)
    const cycle = window.setInterval(() => setTick((t) => t + 1), 320)
    return () => {
      window.clearTimeout(next)
      window.clearInterval(cycle)
    }
  }, [started, done, names.length, step])

  const kept = names.filter((n) => !removed.includes(n))

  return {
    started,
    kept,
    busy: done < names.length,
    start: () => {
      setDone(0)
      setRemoved([])
      setStarted(true)
    },
    remove: (name: string) => setRemoved((r) => [...r, name]),
    stateOf: (name: string, verdict: FileState): FileState =>
      names.indexOf(name) < done ? verdict : 'checking',
    /** The five checks, cycled under the row being read. Named rather than
     *  summarised as "validating", because the step an import failed at is a
     *  fact the reader is entitled to. */
    checkLabel: (name: string) =>
      IMPORT_CHECKS[(tick + names.indexOf(name)) % IMPORT_CHECKS.length],
  }
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold text-default">{title}</h2>
      <p className="text-base text-subtle">{subtitle}</p>
    </div>
  )
}
