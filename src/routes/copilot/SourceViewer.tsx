import { useState } from 'react'
import { ChevronDown, FileSpreadsheet, FileText, Scale, Table2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { ALL_SOURCE_IDS, SOURCES, type Source, type SourceId } from './data'

/**
 * What the agent read, opened from any source chip in the transcript.
 *
 * The chat can say "maternity is running +34% over expected" with complete
 * confidence and still be quoting the wrong sheet. This is the check on
 * that: the document it came from, the exact place inside it, and the values
 * it pulled out — enough for an underwriter to confirm the right thing was
 * accessed before signing a loading, which is the only reading of the answer
 * that is worth anything.
 *
 * The index underneath answers the other half of the question. A chip only
 * ever shows what one call happened to read, and "did it look at the right
 * file" is not answerable from that alone — you also have to see what was on
 * the case and *not* consulted. So the index lists everything, and marks what
 * this turn touched.
 *
 * It sits above the rate table, like the premium build-up, rather than in an
 * overlay: verifying a number and looking at the number it moved are the
 * same act.
 */

const FORMAT_ICON: Record<Source['format'], LucideIcon> = {
  PDF: FileText,
  XLSX: FileSpreadsheet,
  Rulebook: Scale,
  'Live table': Table2,
}

export function SourceViewer({
  id, used, onSelect, onClose,
}: {
  /** The source on show. `null` opens straight onto the index. */
  id: SourceId | null
  /** Everything the turn this was opened from read. */
  used: SourceId[]
  onSelect: (id: SourceId) => void
  onClose: () => void
}) {
  // Opened from "All sources" rather than from one chip: start on the index.
  const [indexOpen, setIndexOpen] = useState(id === null)
  const source = id ? SOURCES[id] : null
  const Icon = source ? FORMAT_ICON[source.format] : null

  return (
    <section className="animate-fade-up overflow-hidden rounded-lg border border-default bg-surface-card shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-default bg-neutral-50 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">
          Source — what the agent read
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close source"
          className="rounded-sm p-0.5 text-muted transition-colors duration-base hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
        >
          <X aria-hidden className="h-3.5 w-3.5" />
        </button>
      </header>

      {source && Icon && (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-subtle px-4 py-3">
            <Icon aria-hidden className="h-4 w-4 shrink-0 text-brand" />
            <span className="text-sm font-semibold text-default">{source.name}</span>
            <Badge tone="brand">{source.format}</Badge>
            <Badge tone="neutral">{source.category}</Badge>
            <span className="ml-auto text-xs text-muted">{source.dated}</span>
          </div>

          <p className="border-b border-subtle px-4 py-2 font-mono text-xs text-muted">
            Read from: <span className="text-default">{source.location}</span>
          </p>

          <div className="flex flex-col">
            {source.extract.map((e) => (
              <div
                key={e.label}
                className="flex items-center justify-between gap-3 border-b border-subtle px-4 py-2 last:border-b-0"
              >
                <span className="text-sm text-default">{e.label}</span>
                <span className="font-mono text-sm text-default">{e.value}</span>
              </div>
            ))}
          </div>

          {/* §0.6 — a status surface is a bg + border + fg triple, never a tint. */}
          {source.note && (
            <p className="border-t border-subtle bg-brand-bg px-4 py-2.5 text-xs leading-normal text-brand-fg">
              {source.note}
            </p>
          )}
        </>
      )}

      {/* ── The index ─────────────────────────────────────────────────── */}
      <div className="border-t border-default bg-neutral-50">
        <button
          type="button"
          aria-expanded={indexOpen}
          onClick={() => setIndexOpen((o) => !o)}
          className="flex w-full items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted transition-colors duration-base hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
        >
          <span>All case sources ({ALL_SOURCE_IDS.length})</span>
          <span className="text-disabled">·</span>
          <span>{used.length} read this turn</span>
          <ChevronDown
            aria-hidden
            className={cn('h-3 w-3 transition-transform duration-base', indexOpen && 'rotate-180')}
            strokeWidth={1.5}
          />
        </button>

        {indexOpen && (
          <ul className="border-t border-subtle">
            {ALL_SOURCE_IDS.map((other) => {
              const s = SOURCES[other]
              const RowIcon = FORMAT_ICON[s.format]
              const wasRead = used.includes(other)
              return (
                <li key={other}>
                  <button
                    type="button"
                    onClick={() => onSelect(other)}
                    aria-current={other === id ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-center gap-2.5 border-b border-subtle px-4 py-2 text-left last:border-b-0',
                      'transition-colors duration-base hover:bg-brand-50',
                      'focus-visible:outline-none focus-visible:shadow-focus',
                      other === id && 'bg-brand-bg',
                    )}
                  >
                    <RowIcon
                      aria-hidden
                      className={cn('h-3.5 w-3.5 shrink-0', wasRead ? 'text-brand' : 'text-disabled')}
                      strokeWidth={1.5}
                    />
                    <span className={cn('text-sm', wasRead ? 'text-default' : 'text-subtle')}>{s.name}</span>
                    <span className="text-xs text-muted">{s.format}</span>
                    <span className="ml-auto shrink-0">
                      {wasRead ? (
                        <Badge tone="brand">Read this turn</Badge>
                      ) : (
                        <span className="text-xs text-disabled">Not consulted</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
