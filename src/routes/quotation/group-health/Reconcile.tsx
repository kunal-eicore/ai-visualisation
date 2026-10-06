import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { ReconcileRow } from './data'

/**
 * A document disagreed with the form. This is the choosing.
 *
 * Deliberately NOT a modal. The obvious build for "the upload conflicts with
 * what is on screen" is a dialog that blocks the run until every row is
 * settled, and it is wrong three times over: it hides the form the values
 * are claims about, it forces a decision on rows the user may not be ready
 * to take, and it makes an upload — a helpful act — punish you with a queue.
 * This sits in the transcript, changes nothing until Apply, and can be left
 * unanswered for the rest of the session. An ignored proposal is an
 * acceptable outcome; an ignored modal is not a thing that exists.
 *
 * Three properties carry the argument:
 *
 * - **Both sides are shown with their source.** The form's value is not "the
 *   old one" — it came out of a document too, and a user deciding between
 *   the expiring schedule and a new RFQ needs to know that is the choice
 *   they are making.
 * - **The default is whichever side costs nothing to be wrong about.** A
 *   blank field takes the document; a contested one stays on the form. Doing
 *   nothing therefore never overwrites a value that was already there.
 * - **The footer counts what will actually change**, not how many rows were
 *   found. "Apply 2 changes" against four rows is the honest number, and it
 *   goes to zero — and the button with it — if the user keeps everything.
 */
export function Reconcile({
  file,
  rows,
  applied,
  undoable,
  onApply,
  onUndo,
}: {
  file?: string
  rows: ReconcileRow[]
  applied: boolean
  /** The write can still be taken back. */
  undoable: boolean
  /** The rows the user chose to take from the document. */
  onApply: (chosen: ReconcileRow[]) => void
  onUndo: () => void
}) {
  /* Keyed by field id: true means take the document value. Seeded per kind. */
  const [take, setTake] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((r) => [r.field, r.kind === 'fill'])),
  )

  const chosen = rows.filter((r) => take[r.field])

  return (
    <section className="overflow-hidden rounded-lg border border-brand-200">
      <header className="flex items-center gap-2 border-b border-brand-200 bg-brand-50 px-3 py-2">
        <FileText aria-hidden className="h-4 w-4 shrink-0 text-brand" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand">{file}</span>
        <Badge tone="warning">{rows.filter((r) => r.kind === 'conflict').length} differ</Badge>
      </header>

      <ul className="flex flex-col">
        {rows.map((row) => {
          const takes = Boolean(take[row.field])
          return (
            <li key={row.field} className="border-b border-subtle px-3 py-2.5 last:border-b-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="min-w-0 flex-1 text-sm font-medium text-default">{row.label}</span>
                {row.kind === 'fill' && <Badge tone="info">Was empty</Badge>}
              </div>

              {/* Two sides, same geometry, one selected. Radios rather than a
                  toggle: a toggle would make one side the "off" state of the
                  other, and neither of these is the absence of the other. */}
              <div role="radiogroup" aria-label={row.label} className="grid gap-1.5 sm:grid-cols-2">
                <Side
                  heading="On the form"
                  value={row.current.value}
                  source={row.current.source}
                  selected={!takes}
                  disabled={applied}
                  onSelect={() => setTake((t) => ({ ...t, [row.field]: false }))}
                />
                <Side
                  heading="In this file"
                  value={row.incoming.value}
                  source={row.incoming.source}
                  selected={takes}
                  disabled={applied}
                  onSelect={() => setTake((t) => ({ ...t, [row.field]: true }))}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center gap-2 border-t border-brand-200 bg-brand-50 px-3 py-2">
        <span className="min-w-0 flex-1 text-sm text-brand">
          {applied
            ? `${chosen.length} of ${rows.length} taken from the file`
            : `${chosen.length} of ${rows.length} will change`}
        </span>
        {applied ? (
          <>
            <Badge tone="success">Applied</Badge>
            {/* Same counterpart as every other write in the dock. Taking a
                document's side is exactly the kind of act somebody changes
                their mind about once they see it in the form. */}
            {undoable && (
              <Button size="sm" variant="text" onClick={onUndo}>
                Undo
              </Button>
            )}
          </>
        ) : (
          <Button size="sm" variant="outline" disabled={chosen.length === 0} onClick={() => onApply(chosen)}>
            {chosen.length === 0 ? 'Keep everything' : `Apply ${chosen.length}`}
          </Button>
        )}
      </div>
    </section>
  )
}

/** One of the two claims about a field. */
function Side({
  heading,
  value,
  source,
  selected,
  disabled,
  onSelect,
}: {
  heading: string
  value: string
  source: string
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex flex-col items-start gap-0.5 rounded-md border px-2.5 py-1.5 text-left transition-colors duration-base',
        'focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed',
        selected
          ? 'border-brand bg-brand-bg'
          : 'border-default bg-surface-card hover:border-strong disabled:hover:border-default',
      )}
    >
      <span className="font-mono text-xs uppercase tracking-wide text-muted">{heading}</span>
      {/* An empty field is shown as empty, not as a dash pretending to be a
          value — "—" reads as a value somebody entered. */}
      <span
        className={cn(
          'w-full break-words text-sm',
          value ? (selected ? 'text-brand-fg' : 'text-default') : 'italic text-muted',
        )}
      >
        {value || 'Empty'}
      </span>
      <span className="w-full break-words text-xs text-muted">{source}</span>
    </button>
  )
}
