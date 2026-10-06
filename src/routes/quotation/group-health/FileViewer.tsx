import { useEffect, useState } from 'react'
import { ArrowLeft, FileSpreadsheet, FileText, Table2, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { SOURCE_FILES, type SourceFile } from './data'

/**
 * A cited document, in full.
 *
 * **It takes the canvas, not the screen.** The step rail stays, so you can
 * see where you will be returned to; the dock stays, so the citation that
 * sent you here is still on screen and you can read the claim and the
 * document at the same time. A modal over everything would hide both and
 * turn "check this number" into "leave, look, come back and remember".
 *
 * This is the other half of the split the chips make. The peek card answers
 * *is this claim sound* and is sized for it — four values, in the flow of the
 * turn, nothing moved. This answers *what else is in here*, which needs the
 * room and is worth the interruption because you asked for it explicitly.
 * The industry draws the same line: Dropbox Dash, Dovetail and Coda give a
 * document its own region when the document is the work.
 *
 * The anatomy is the settled one for tabular files — Rows, Airtable, Clay and
 * v0 all draw it: tabs across the sheets, a row-number gutter, and a footer
 * that states the range on show. Three details are deliberate:
 *
 * - **Row numbers are the file's, not the list's.** A cited row keeps the
 *   number an underwriter would find it under when they open the workbook
 *   themselves, which is the only number worth printing.
 * - **It says how much it is showing.** "8 of 3,616 rows" — a preview that
 *   implied the sheet was eight rows long would be a worse lie than not
 *   showing the rows at all.
 * - **Cited rows are marked** where the citation pointed at specific ones,
 *   so the trail from the claim to the cells does not stop at the filename.
 */

const FORMAT_ICON: Record<SourceFile['format'], LucideIcon> = {
  XLSX: FileSpreadsheet,
  PDF: FileText,
  'Rate table': Table2,
}

export function FileViewer({
  fileKey,
  focus,
  onClose,
}: {
  fileKey: string
  /** Sheet name, or page number as a string. */
  focus?: string
  onClose: () => void
}) {
  const file = SOURCE_FILES[fileKey]
  const [tab, setTab] = useState(focus ?? '')

  useEffect(() => setTab(focus ?? ''), [focus, fileKey])

  /* Escape returns to the form. The viewer is a detour, and a detour needs
     the way back on the key people already press. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!file) return null
  const Icon = FORMAT_ICON[file.format]
  const tabs = file.sheets?.map((s) => s.name) ?? file.pages?.map((p) => String(p.page)) ?? []
  const current = tabs.includes(tab) ? tab : tabs[0]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant="neutral"
          onClick={onClose}
          icon={<ArrowLeft aria-hidden className="h-4 w-4" />}
        >
          Back to the form
        </Button>
        <Icon aria-hidden className="h-5 w-5 shrink-0 text-brand" />
        <h2 className="min-w-0 text-lg font-semibold text-default">{file.name}</h2>
        <Badge tone="neutral">{file.format}</Badge>
        <span className="font-mono text-xs uppercase tracking-wide text-muted">{file.dated}</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-default bg-surface-card shadow-card">
        {/* §4.11 underline tabs — the sheets of the workbook, or its pages. */}
        {tabs.length > 1 && (
          <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-default px-3">
            {tabs.map((name) => (
              <button
                key={name}
                role="tab"
                type="button"
                aria-selected={current === name}
                onClick={() => setTab(name)}
                className={cn(
                  'shrink-0 border-b-2 px-3 py-2.5 text-base transition-colors duration-base',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  current === name
                    ? 'border-brand font-semibold text-brand'
                    : 'border-transparent font-medium text-muted hover:text-default',
                )}
              >
                {file.pages ? `Page ${name}` : name}
              </button>
            ))}
          </div>
        )}

        {file.sheets && <SheetGrid sheet={file.sheets.find((s) => s.name === current) ?? file.sheets[0]} />}
        {file.pages && (
          <PageText page={file.pages.find((p) => String(p.page) === current) ?? file.pages[0]} />
        )}
      </div>
    </div>
  )
}

function SheetGrid({ sheet }: { sheet: NonNullable<SourceFile['sheets']>[number] }) {
  const cited = new Set(sheet.cited ?? [])
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-default bg-surface-sunken">
              <th className="w-12 px-3 py-2 text-right font-mono text-xs font-medium uppercase tracking-wide text-muted">
                #
              </th>
              {sheet.columns.map((c) => (
                <th
                  key={c}
                  className="px-3 py-2 text-left font-mono text-xs font-medium uppercase tracking-wide text-muted"
                >
                  {c}
                </th>
              ))}
              <th className="w-24 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row) => {
              const [n, ...cells] = row
              const isCited = cited.has(n as number)
              return (
                <tr
                  key={String(n)}
                  className={cn('border-b border-subtle last:border-b-0', isCited && 'bg-brand-50')}
                >
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted">
                    {n}
                  </td>
                  {cells.map((cell, i) => (
                    <td
                      key={i}
                      className={cn(
                        'px-3 py-2 text-sm text-default',
                        typeof cell === 'number' && 'tabular-nums',
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    {isCited && <Badge tone="brand">Read</Badge>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {/* What is on show against what is in the file. */}
      <div className="flex items-center justify-between border-t border-default bg-surface-sunken px-3 py-2">
        <span className="font-mono text-xs uppercase tracking-wide text-muted">
          {sheet.rows.length} of {sheet.total.toLocaleString('en-IN')} rows
        </span>
        {cited.size > 0 && (
          <span className="font-mono text-xs uppercase tracking-wide text-brand">
            {cited.size} read by the assistant
          </span>
        )}
      </div>
    </>
  )
}

function PageText({ page }: { page: NonNullable<SourceFile['pages']>[number] }) {
  const cited = new Set(page.cited ?? [])
  return (
    <div className="flex flex-col gap-3 p-5">
      <h3 className="text-base font-semibold text-default">{page.heading}</h3>
      <ol className="flex flex-col gap-1.5">
        {page.lines.map((line, i) => (
          <li
            key={i}
            className={cn(
              'rounded-md px-2 py-1 text-base',
              cited.has(i) ? 'bg-brand-50 text-default' : 'text-subtle',
            )}
          >
            {line}
          </li>
        ))}
      </ol>
      {cited.size > 0 && (
        <span className="font-mono text-xs uppercase tracking-wide text-brand">
          Highlighted lines were read by the assistant
        </span>
      )}
    </div>
  )
}
