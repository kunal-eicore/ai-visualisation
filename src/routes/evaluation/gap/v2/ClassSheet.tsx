import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { RUNG_TONE, accuracyOf, type DecisionClass } from '../data'
import { ClassPanel } from './ClassPanel'
import { RangeReading } from './RangeReading'
import { RangeStrip } from './RangeStrip'
import { classBand, standingOf, STANDING_LABEL } from './data'

/*
 * A class, opened beside the table rather than inside it.
 *
 * WHY IT MOVED OUT OF THE ROW. The expansion was a table inside a table: two
 * more tables and a trace list wedged into one cell of the first, which pushed
 * every row below it a screen and a half down and left the two nested grids
 * competing for the same column rhythm. At this depth of content the row
 * expansion had stopped being a disclosure and become a second page drawn in
 * the worst place for one.
 *
 * WHAT THE ROW EXPANSION WAS RIGHT ABOUT, AND HOW THAT SURVIVES. The reason
 * it was chosen over a panel in the first place still holds: the thing that
 * changed has to be findable from the click. So this takes half the width and
 * not all of it, the table stays on screen next to it, and the row that opened
 * it keeps its outline — the panel is always readable against the row it came
 * from. A full-screen overlay would have lost that, which is the failure the
 * original note was written about.
 *
 * The scrim is deliberately faint. It is there to catch the click that closes
 * the sheet, not to put the table behind a wash: the reader is meant to keep
 * comparing the open class against the ones above and below it.
 */

export function ClassSheet({
  c,
  onClose,
  strips = true,
}: {
  c: DecisionClass
  onClose: () => void
  /** Draw the range strip in the header and the cohort table, or print the
   *  reading instead. V3 prints it: there is one strip on that page, in the
   *  band with the width to draw it at. */
  strips?: boolean
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const band = classBand(c)
  const accuracy = accuracyOf(c)
  const standing = standingOf(accuracy, band)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    /* Focus moves into the sheet and comes back to the row that opened it.
       Without the second half, closing leaves a keyboard reader at the top of
       the document with no idea which class they had just been reading. */
    if (!openerRef.current) openerRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      /* After the frame, not during it: React runs this cleanup before it
         removes the sheet, and removing the focused node resets focus to the
         document — which would undo a focus call made here.
         And only if the sheet is actually gone: in StrictMode this cleanup
         also runs on the development double-mount, where restoring focus
         would yank it straight back out of a sheet that is still open. */
      setTimeout(() => {
        if (!document.querySelector('[role=dialog]')) openerRef.current?.focus?.()
      }, 0)
    }
  }, [onClose])

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close class detail"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-neutral-900/10"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${c.name} detail`}
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-strong bg-surface-card shadow-popover animate-fade-in sm:w-[600px] lg:w-[56vw] lg:min-w-[760px] lg:max-w-[1040px]"
      >
        <header className="flex items-start gap-4 border-b border-default px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-md font-semibold text-default">{c.name}</h3>
              <Badge tone={RUNG_TONE[c.rung]}>{c.rung}</Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              {c.agent} · {c.steps.join(' · ')}
            </p>
          </div>

          {/* The one reading that must not need scrolling to: it is why the
              row was clicked, and it is the only claim the page makes. */}
          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            {strips ? (
              <>
                <RangeStrip system={accuracy} band={band} size="row" />
                <div className="text-right">
                  <div className="font-mono text-md leading-none text-default">{accuracy}%</div>
                  <div
                    className={standing === 'below' ? 'mt-1 text-xs text-warning-fg' : 'mt-1 text-xs text-muted'}
                  >
                    {STANDING_LABEL[standing]}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-right">
                <div className="font-mono text-lg leading-none text-default">{accuracy}%</div>
                <RangeReading system={accuracy} band={band} className="mt-1 justify-end" />
              </div>
            )}
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-muted transition-colors duration-base hover:bg-surface-sunken hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Keyed on the class, so opening a second one does not inherit the
              first one's tab — or land the reader in a run log they opened for
              a different class. */}
          <ClassPanel key={c.id} c={c} strips={strips} />
        </div>
      </div>
    </>,
    document.body,
  )
}
