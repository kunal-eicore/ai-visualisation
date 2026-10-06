import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import {
  CLASSES,
  FLOW_STEPS,
  RUNG_TONE,
  accuracyOf,
  autonomyOf,
  settledOf,
  type DecisionClass,
} from '../data'
import { cn } from '@/lib/cn'
import { ClassSheet } from './ClassSheet'
import { classBand, standingOf, type Standing } from './data'

/** The finding, in the words somebody running the business would use. The
 *  shared `STANDING_LABEL` is written for the verdict band, where it sits
 *  next to the numbers it is about; here it is the only thing said. */
const STANDING_WORD: Record<Standing, string> = {
  inside: 'Matches the underwriters',
  below: 'Behind the underwriters',
  above: 'Ahead of the underwriters',
}

/*
 * The quotation, in the order it happens.
 *
 * WHY THIS BAND EXISTS. Every other reading on this page is organised by kind
 * of measurement — accuracy, then where defects were caught, then what was
 * asked of people. That is how the instrument is built and it is not how the
 * business is run. The reader thinks in a journey: a quotation arrives, it
 * moves through seven steps, it goes out. Until this band, that ordering
 * existed only as a secondary sort option on the table three screens down,
 * which put the reader's own model of the work behind a toggle.
 *
 * WHAT EACH BLOCK SAYS, AND WHY ONLY THIS MUCH. How much of the step the
 * system gets through without stopping to ask, and whether what it produced
 * there is as good as the underwriters'. Those are the two halves of "can it
 * run this part of my flow" — reach and quality — and either one alone is
 * misleading: a step it never asks about and gets wrong is worse than one it
 * hands over honestly.
 *
 * THE STEPS ARE GROUPED, THE JOURNEY IS NOT SHORTENED. Five classes cover
 * seven steps, so consecutive steps owned by the same class share a block and
 * the block is titled with both. Nothing is dropped: the blocks tile the whole
 * spine, left to right, in the order the work happens.
 *
 * NO CARDS. Columns split by hairlines on the band's own ground, the same
 * device as the scope pair in the panel. A row of five bordered tiles is the
 * cards-inside-cards failure this page was rebuilt to get away from.
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

export function Flow() {
  const [open, setOpen] = useState<string | null>(null)
  const selected = open ? (CLASSES.find((c) => c.id === open) ?? null) : null

  return (
    <section className="border-t border-subtle bg-surface-card px-8 py-6">
      <h2 className="text-md font-semibold text-default">The quotation, start to finish</h2>
      <p className="mt-0.5 text-sm text-subtle">
        How much of each step the system gets through on its own, and how what it produced there compares
        with the underwriters.
      </p>

      {/* The rules only exist at `lg`, where the five blocks are genuinely one
          row. `divide-x` is not row-aware: in the two-column layout it drew a
          left border on blocks 3 and 5, which start a row and have nothing to
          their left. Below `lg` the gap separates them and nothing is drawn. */}
      <ol className="mt-5 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
        {blocks().map((b, i) => (
          <Step key={b.c.id} b={b} n={i + 1} onOpen={() => setOpen(b.c.id)} />
        ))}
      </ol>

      {selected && <ClassSheet c={selected} onClose={() => setOpen(null)} />}
    </section>
  )
}

function Step({ b, n, onOpen }: { b: Block; n: number; onOpen: () => void }) {
  const { c } = b
  const band = classBand(c)
  const accuracy = accuracyOf(c)
  const standing = standingOf(accuracy, band)
  const alone = autonomyOf(c)
  const asked = c.decisions - settledOf(c)

  return (
    <li
      /* Rule and inset together on the left, dropped together on the first
         block, so block one starts flush with the heading above it. An earlier
         pass expressed this as competing `nth-child` arbitrary variants at two
         breakpoints; those carry equal specificity, Tailwind decides the order
         between them, and the one that won indented the first column past the
         heading with no rule beside it to explain why. `first:` is a real
         variant and beats the base utility outright. */
      className="flex flex-col lg:border-l lg:border-subtle lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
    >
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onOpen}
        className="flex h-full w-full flex-col rounded-sm text-left focus-visible:outline-none focus-visible:shadow-focus"
      >
        {/* ALIGNMENT. Two of the five titles wrap to a second line and three
            do not, which put every bar in the row at a different height and
            was the first thing the eye caught. The title box is two lines
            tall whether it needs them or not, and the rung sits on `mt-auto`,
            so the five blocks line up top and bottom regardless of what each
            one has to say in between. */}
        <span className="flex min-h-[2.5rem] items-baseline gap-2">
          <span className="font-mono text-xs text-muted">{n}</span>
          <span className="min-w-0 text-sm font-medium text-default">{b.steps.join(' · ')}</span>
        </span>

        {/* Reach. Ink against paper, not two fills.
            An earlier pass drew the remainder as a second solid — brand/500
            beside neutral/600 — and those two clear 3:1 against the CARD while
            sitting at 1.2:1 against EACH OTHER: same lightness, different hue,
            which is the one pairing that reads as a single muddy bar. So the
            step it got through is filled and the part it handed over is left
            open, and the bar's own outline at neutral/600 states the full
            length. Fill against empty cannot be confused at any size, and the
            two numbers are printed underneath regardless. */}
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

        {/* Quality, as the conclusion and nothing else.
            This has now failed twice by showing the reader the evidence
            instead of the finding. First as a 72px range strip — on a 50-100
            axis that is a pixel and a half per point, so a whole underwriter
            spread came out about ten pixels wide and said only "there is a
            chart here". Then as the pair `95% · underwriters 93-98`, which is
            exact and still leaves the comparison to be done in the reader's
            head — and puts a second percentage directly under `88% on its
            own`, two figures that look alike and mean different things.
            What a block is for is: how much of this step can it do, and is it
            as good as my people. The first is the bar. The second is a
            sentence. The accuracy figure and the underwriters' spread are
            both one row down in the table and in the panel, which is where
            somebody checking the arithmetic will go for them. */}
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
