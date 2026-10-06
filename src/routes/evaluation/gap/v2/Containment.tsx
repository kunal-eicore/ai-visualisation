import { cn } from '@/lib/cn'
import type { DecisionClass } from '../data'
import { CAUGHT, TOUCHED, cellTone, containmentOf } from './data'

/*
 * Where this class's mistakes were caught, and how far they had travelled.
 *
 * WHY IT IS IN THE PANEL AND NOT ON THE PAGE. It was a band of its own for
 * several passes — a 3x3 of every class's defects summed, beside a set of
 * handoff bars — and it was the heaviest thing on a screen whose first reader
 * is running the business rather than the evaluation. Nine numbers about which
 * internal gate fired is a QA reading: true, useful, and not a question anybody
 * asks before they have decided they care about one particular decision. So it
 * moved to where that decision is already open, and the page above it now goes
 * claim, flow, trend, decisions with nothing between them.
 *
 * The handoff bars did not come with it. Their finding — an ask that leaves
 * the building is the one that does not come back — is already stated in the
 * verdict's `Waiting on a person` tile, and the panel carries the same three
 * counts per class in its figures. Two drawings of one fact is how the page
 * got long in the first place.
 *
 * WHY IT IS STILL A MATRIX. The two axes are genuinely independent. WHEN is
 * about the system's own gates; WHAT is about how far the value had gone. An
 * error can be caught early and still have moved the premium, and a cover term
 * can be wrong and found late — neither axis predicts the other, so all nine
 * cells carry something two bars would have averaged away.
 */

export function ClassContainment({ c, bare }: { c: DecisionClass; bare?: boolean }) {
  const grid = containmentOf([c])
  const total = grid.flat().reduce((a, n) => a + n, 0)
  if (total === 0) return null

  return (
    <div className={bare ? undefined : 'mt-6 border-t border-default pt-4'}>
      {!bare && <h4 className="text-sm font-semibold text-default">Where its mistakes were caught</h4>}
      <p className="mt-0.5 text-sm text-subtle">
        The {total.toLocaleString('en-IN')} values an underwriter had to change or fill in, by when it was
        caught and what it affected. Later and further down costs more to put right.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[440px] border-separate border-spacing-0">
          <caption className="sr-only">
            {c.name} mistakes by when they were caught and what they affected, {total} in total.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-28 pb-2 text-left align-bottom text-xs font-medium text-muted">
                What it affected
              </th>
              {CAUGHT.map((k) => (
                <th
                  key={k.id}
                  scope="col"
                  className="px-1 pb-2 text-left align-bottom text-xs font-semibold text-subtle"
                >
                  {k.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TOUCHED.map((t, r) => (
              <tr key={t.id}>
                <th scope="row" className="py-1 pr-3 text-left align-middle text-sm font-medium text-default">
                  {t.label}
                </th>
                {CAUGHT.map((k, col) => (
                  <Cell
                    key={k.id}
                    n={grid[r][col]}
                    total={total}
                    tone={cellTone(r, col)}
                    what={`${t.label}, ${k.label.toLowerCase()}`}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Cell({
  n,
  total,
  tone,
  what,
}: {
  n: number
  total: number
  tone: 'neutral' | 'warning' | 'danger'
  what: string
}) {
  const share = Math.round((n / total) * 100)
  return (
    <td className="px-1 py-1">
      <div
        className={cn(
          'flex h-12 flex-col justify-between rounded-md border p-2',
          tone === 'danger'
            ? 'border-danger bg-danger-bg'
            : tone === 'warning'
              ? 'border-warning bg-warning-bg'
              : 'border-subtle bg-surface-sunken',
        )}
      >
        <span
          className={cn(
            'font-mono text-md leading-none',
            tone === 'danger' ? 'text-danger-fg' : tone === 'warning' ? 'text-warning-fg' : 'text-default',
          )}
        >
          {n.toLocaleString('en-IN')}
        </span>
        <span className="sr-only">{what}</span>
        {/* The share is the second reading, so it is quiet and sits under the
            count rather than beside it competing for the same glance. */}
        <span
          className={cn(
            'font-mono text-xs',
            tone === 'danger' ? 'text-danger-fg/70' : tone === 'warning' ? 'text-warning-fg/70' : 'text-muted',
          )}
        >
          {share}%
        </span>
      </div>
    </td>
  )
}
