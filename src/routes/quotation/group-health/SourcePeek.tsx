import { useEffect, useRef, useState } from 'react'
import { FileSpreadsheet, FileText, Maximize2, Table2, X, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { QUOTE_SOURCES, type QuoteSource } from './data'

/**
 * The evidence chips under an answer, and the document behind whichever one
 * you press.
 *
 * **It opens as a card anchored to the chips, and nothing else moves.** That
 * is the whole design constraint. The dock is 440px of a screen whose other
 * half is the form being filled, and the reason to open a source at all is
 * to check a claim against the field it is about — so a viewer that covered
 * the form, or squeezed it, would take away the thing you opened the source
 * to look at. The industry splits on this: Dropbox Dash, Dovetail, Coda and
 * Copilot give the document its own half of the window, which is right when
 * the document IS the work; Perplexity and Customer.io anchor a small card
 * to the citation and leave the layout alone, which is right when the
 * document is a receipt for something else. This is the second case.
 *
 * It opens IN THE FLOW, directly under the chips, rather than floating over
 * them. The first build floated it and it was clipped: the feed is a
 * scrolling container, and once `overflow-y` is not `visible` the browser
 * computes the other axis as `auto` too, so an absolutely positioned child
 * is cut off on BOTH axes and cannot escape upwards past the top of the
 * scroll port. Floating it properly from inside a scroller means a portal,
 * fixed coordinates, and re-measuring on every scroll and resize — a lot of
 * machinery, still able to collide with the viewport edge, to avoid a shift
 * inside a feed where new content pushes things down constantly anyway.
 * In flow it cannot be clipped, it scrolls with the turn it belongs to, and
 * it stays inside the dock without any positioning maths at all.
 *
 * It spans the full width of the turn rather than lining up with the chip
 * that opened it, for the same reason: at this width there is nothing to be
 * gained from the precision.
 *
 * What it shows is the point: not that a file was consulted, but the values
 * read out of it. A citation you cannot open is a claim you have to take on
 * trust, and one that opens onto nothing but a filename is barely better.
 */

const FORMAT_ICON: Record<QuoteSource['format'], LucideIcon> = {
  XLSX: FileSpreadsheet,
  PDF: FileText,
  'Rate table': Table2,
}

export function Evidence({
  sources,
  onOpenFile,
}: {
  sources: string[]
  onOpenFile: (fileKey: string, focus?: string) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const wrap = useRef<HTMLDivElement>(null)

  /* Dismissed by anything that means "I am done with this": a click outside,
     Escape, or pressing the same chip again. A card that can only be closed
     by its own X is a card people leave open. */
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const source = open ? QUOTE_SOURCES[open] : null

  return (
    <div ref={wrap} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
      {sources.map((label) => {
        const known = QUOTE_SOURCES[label]
        /* A chip with no document behind it stays a label. Making it look
           pressable and then opening nothing is worse than not offering it. */
        if (!known) {
          return (
            <Badge key={label} tone="neutral" icon={<FileText aria-hidden className="h-3 w-3" />}>
              {label}
            </Badge>
          )
        }
        const Icon = FORMAT_ICON[known.format]
        const isOpen = open === label
        return (
          <button
            key={label}
            type="button"
            aria-expanded={isOpen}
            onClick={() => setOpen(isOpen ? null : label)}
            className={cn(
              'inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5',
              'text-sm transition-colors duration-base',
              'focus-visible:outline-none focus-visible:shadow-focus',
              isOpen
                ? 'border-brand bg-brand-bg text-brand-fg'
                : 'border-default bg-surface-sunken text-muted hover:border-brand-300 hover:bg-brand-50 hover:text-brand',
            )}
          >
            <Icon aria-hidden className="h-3 w-3 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        )
      })}
      </div>

      {source && (
        <Peek
          label={open as string}
          source={source}
          onClose={() => setOpen(null)}
          onOpenFile={() => {
            setOpen(null)
            onOpenFile(source.fileKey, source.focus)
          }}
        />
      )}
    </div>
  )
}

function Peek({
  label,
  source,
  onClose,
  onOpenFile,
}: {
  label: string
  source: QuoteSource
  onClose: () => void
  onOpenFile: () => void
}) {
  const Icon = FORMAT_ICON[source.format]
  const card = useRef<HTMLDivElement>(null)

  /* Opening one near the bottom of the feed would otherwise put most of it
     below the fold. `nearest` scrolls only as far as it has to, so a card
     that already fits does not move the feed at all. */
  useEffect(() => {
    card.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  return (
    <div
      ref={card}
      role="dialog"
      aria-label={`Source: ${source.name}`}
      className={cn(
        'animate-fade-up',
        'overflow-hidden rounded-lg border border-default bg-surface-card shadow-panel',
      )}
    >
      <header className="flex items-center gap-2 border-b border-default bg-surface-sunken px-3 py-2">
        <Icon aria-hidden className="h-4 w-4 shrink-0 text-brand" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-default">
          {source.name}
        </span>
        <Badge tone="neutral">{source.format}</Badge>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${label}`}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
        >
          <X aria-hidden className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-subtle px-3 py-2">
        <span className="text-sm text-subtle">{source.location}</span>
        <span className="font-mono text-xs uppercase tracking-wide text-muted">{source.dated}</span>
      </div>

      {/* The read itself. Label left, value right, hairline between — the
          §4.20 key-value row, because that is what this is. */}
      <dl className="flex flex-col">
        {source.extract.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline gap-3 border-b border-subtle px-3 py-1.5 last:border-b-0"
          >
            <dt className="min-w-0 flex-1 text-sm text-muted">{row.label}</dt>
            <dd className="shrink-0 font-mono text-sm tabular-nums text-default">{row.value}</dd>
          </div>
        ))}
      </dl>

      {source.note && (
        <p className="border-t border-default bg-surface-sunken px-3 py-2 text-xs text-subtle">
          {source.note}
        </p>
      )}

      {/* The extract is a sliver by design. This is the way to the rest of
          it, for the question the sliver cannot answer: what ELSE is in
          here. It opens onto the sheet or page that was cited. */}
      <div className="border-t border-default p-2">
        <Button size="sm" variant="text" onClick={onOpenFile} icon={<Maximize2 aria-hidden className="h-3.5 w-3.5" />}>
          Open the full file
        </Button>
      </div>
    </div>
  )
}
