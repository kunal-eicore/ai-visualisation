import { InfoTip } from '@/components/InfoTip'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import {
  CLASSES,
  FLOW_STEPS,
  RUNG_TONE,
  accuracyOf,
  autonomyOf,
  settledOf,
  type DecisionClass,
} from '../data'
import { classBand, standingOf, type Standing } from '../v2/data'

/** The finding in the words somebody running the business would use. It is
 *  the only thing this block says about quality, so it says it in full. */
const STANDING_WORD: Record<Standing, string> = {
  inside: 'Matches the underwriters',
  below: 'Behind the underwriters',
  above: 'Ahead of the underwriters',
}

/*
 * The quotation, in the order it happens.
 *
 * WHY IT IS THE SECOND BAND AND NOT A SORT OPTION. Every other reading on
 * this page is organised by kind of measurement. That is how the instrument
 * is built and it is not how the business is run: the reader thinks in a
 * journey — a quotation arrives, it moves through seven steps, it goes out.
 * Putting their own model of the work behind a toggle is what made earlier
 * passes feel like an evaluation tool rather than a report on the work.
 *
 * TWO THINGS PER STEP, AND THEY ARE THE TWO HALVES OF ONE QUESTION. How far
 * the system gets through the step without stopping to ask, and whether what
 * it produced there is as good as the underwriters'. Either alone flatters: a
 * step it never asks about and gets wrong is worse than one it hands over.
 *
 * THE NUMBERS ARE NOT REPEATED HERE. The accuracy figure and the underwriter
 * spread are one band down, on the row this block opens. Printing them twice
 * put two percentages that look alike and mean different things a line apart,
 * and the reader has to work out which is which before either means anything.
 * So the bar carries reach, and quality is a sentence.
 *
 * NO CARDS. Columns split by hairlines on the band's own ground.
 */

type Block = { steps: string[]; c: DecisionClass }

/** The spine, folded so each class owns one block and no step is lost. */
function blocks(): Block[] {
  const out: Block[] = []
  for (const step of FLOW_STEPS) {
    const c = CLASSES.find((k) => k.steps.includes(step))
    if (!c) continue
    const last = out[out.length - 1]
    if (last && last.c.id === c.id) last.steps.push(step)
    else out.push({ steps: [step], c })
  }
  return out
}

export function Journey({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section className="border-t border-subtle bg-surface-card px-8 py-6">
      <div className="flex items-start gap-1.5">
        <h2 className="text-md font-semibold text-default">The quotation, start to finish</h2>
        <InfoTip label="The quotation, start to finish">
          The seven steps of a group health quotation, grouped by which kind of decision owns them. The bar
          is how much of the step the system gets through before it has to ask somebody; the line under it
          is how what it produced there compares with the underwriters doing the same work.
        </InfoTip>
      </div>

      {/* The rules only exist at `lg`, where the five blocks are genuinely one
          row. `divide-x` is not row-aware: in the two-column layout it draws a
          left border on blocks that start a row and have nothing to their left. */}
      <ol className="mt-5 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
        {blocks().map((b, i) => (
          <Step key={b.c.id} b={b} n={i + 1} onOpen={() => onOpen(b.c.id)} />
        ))}
      </ol>
    </section>
  )
}

function Step({ b, n, onOpen }: { b: Block; n: number; onOpen: () => void }) {
  const { c } = b
  const standing = standingOf(accuracyOf(c), classBand(c))
  const alone = autonomyOf(c)
  const asked = c.decisions - settledOf(c)

  return (
    <li className="flex flex-col lg:border-l lg:border-subtle lg:pl-6 lg:first:border-l-0 lg:first:pl-0">
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onOpen}
        className="flex h-full w-full flex-col rounded-sm text-left focus-visible:outline-none focus-visible:shadow-focus"
      >
        {/* Two of the five titles wrap and three do not, so the title box is
            two lines tall whether it needs them or not and the rung sits on
            `mt-auto`. The five blocks then line up top and bottom regardless
            of what each has to say in between. */}
        <span className="flex min-h-[2.5rem] items-baseline gap-2">
          <span className="font-mono text-xs text-muted">{n}</span>
          <span className="min-w-0 text-sm font-medium text-default">{b.steps.join(' · ')}</span>
        </span>

        {/* Ink against paper, not two fills. Drawing the remainder as a second
            solid put brand/500 beside neutral/600 — both clear 3:1 against the
            card and sit at 1.2:1 against each other, which is the one pairing
            that reads as a single muddy bar. */}
        <span
          aria-hidden
          className="mt-1 flex h-2.5 w-full overflow-hidden rounded-full border border-neutral-600 bg-surface-sunken"
        >
          <span className="h-full rounded-full bg-primary" style={{ width: `${alone}%` }} />
        </span>
        <span className="mt-1.5 block text-xs text-subtle">
          <span className="font-mono text-default">{alone}%</span> on its own ·{' '}
          <span className="font-mono">{asked.toLocaleString('en-IN')}</span> asked a person
        </span>

        <span
          className={cn(
            'mt-4 block text-sm',
            standing === 'below' ? 'font-medium text-warning-fg' : 'text-subtle',
          )}
        >
          {STANDING_WORD[standing]}
        </span>

        <span className="mt-auto flex items-center gap-2 pt-3">
          <Badge tone={RUNG_TONE[c.rung]}>{c.rung}</Badge>
          <span className="truncate text-xs text-muted">{c.name}</span>
        </span>
      </button>
    </li>
  )
}
