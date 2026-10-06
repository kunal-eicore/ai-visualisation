import { AnchoredCard, useAnchored } from '@/components/Anchored'
import { cn } from '@/lib/cn'
import { DRIVER_FG, type DecisionClass, type Driver, type Touchpoint } from '../data'
import { DRIVER_WORD, driverCountsOf, driverMixOf } from './data'

/*
 * What produced a value: a table somebody wrote, a judgement, or both.
 *
 * WHY THIS IS NOT A PERCENTAGE ANY MORE. V1 printed `ruleShare` on the canvas
 * as a bare figure — "78%", "53%" — next to the driver word. A percentage with
 * no stated denominator is a number a reader has to be told the meaning of
 * before they can use it, which is exactly the kind of copy this surface keeps
 * off the canvas. And the figure was doing two jobs at once: saying WHICH of
 * the three situations this is, and saying how lopsided the blend is.
 *
 * So the canvas carries the first job only — the word, or the composition —
 * and the second moves into the card, where there is room to say it in a
 * sentence and name the rule it is talking about.
 *
 * WHY IT IS LOAD-BEARING AT ALL. Accuracy cannot be read without it. A class
 * scoring 96% on touchpoints a table settles has demonstrated that its
 * configuration is correct, not that it can reason. It also points the fix: a
 * rule-driven shortfall is a config change, a model-driven one is not.
 */

/**
 * Pale grey, then indigo, then deep indigo.
 *
 * This is ordered data — rule to mixed to model is a spectrum of how much of
 * the answer was decided in advance — so it takes a sequential ramp and not
 * three unrelated hues. Rule is the quiet end because deterministic is the
 * unremarkable case (DESIGN.md's own note on the driver palette), and the
 * indigo deepens as the judgement grows.
 *
 * SEPARATED BY LIGHTNESS, NOT BY HUE. The ramp used to run neutral/600,
 * brand/500, brand/700. Each of those clears 3:1 against the CARD, and the
 * first two sit at 1.19:1 against EACH OTHER — the same lightness in two
 * different hues, which is the one pairing the eye reads as a single muddy
 * band, and colour-blind readers cannot separate at all. The ramp now steps
 * down in lightness: adjacent contrast goes to 2.8:1 and 2.2:1, and against
 * the 2px white divider between every pair the two dark steps are 3.5:1 and
 * 7.9:1.
 *
 * Rule's pale fill is the licence stated in `RangeStrip` — a pale fill is
 * allowed where its BOUNDARY carries the reading — so every bar built from
 * this ramp is outlined at neutral/600, and every loose swatch carries the
 * same outline. A pale pill floating on white with no edge would be the
 * failure that licence exists to prevent.
 *
 * An earlier pass drew `mixed` as a grey-and-indigo hatch, on the reasoning
 * that mixed literally is the other two at once. At an 8px bar height the two
 * stripes blended into a single muddy purple that read as a slightly different
 * shade of `model`, which is the one distinction the column exists to make.
 * Three flat steps of one ramp separate cleanly at any size; the hatch also
 * belongs to the trend chart, where it means a region rather than a series.
 */
const SEGMENT: Record<Driver, { className: string }> = {
  rule: { className: 'bg-neutral-300' },
  mixed: { className: 'bg-brand-500' },
  model: { className: 'bg-brand-800' },
}

/** Every bar built from the ramp, so the pale step has an edge. */
const TRACK = 'overflow-hidden rounded-full border border-neutral-600 bg-surface-sunken'

/** What the blend means at one touchpoint, in a sentence rather than a figure. */
function sentenceFor(t: Touchpoint): string {
  if (t.driver === 'model') return 'No rule stands behind this one, so a shortfall here is not a configuration change.'
  if (t.driver === 'rule')
    return t.ruleShare >= 100
      ? 'Every proposal here is deterministic: the same input returns the same answer, so a shortfall is a configuration change.'
      : `Almost entirely deterministic — about ${t.ruleShare}% of proposals come from the rule, and the remainder is judgement.`
  return `The rule settles what it covers, about ${t.ruleShare}% of proposals, and the model takes the rest.`
}

/** The driver at one touchpoint. The word is the reading; the card is the detail. */
export function DriverTag({ t }: { t: Touchpoint }) {
  const { anchorRef, pos, show, hide } = useAnchored({ align: 'left', width: 288 })

  return (
    <span
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <button
        type="button"
        aria-label={`Comes from ${DRIVER_WORD[t.driver]}. ${sentenceFor(t)}`}
        className={cn(
          'rounded-sm px-1 py-0.5 font-mono text-xs underline decoration-dotted underline-offset-2 transition-colors duration-base hover:bg-surface-sunken focus-visible:outline-none focus-visible:shadow-focus',
          DRIVER_FG[t.driver],
        )}
      >
        {DRIVER_WORD[t.driver]}
      </button>
      {pos && (
        <AnchoredCard pos={pos}>
          <span className="block rounded-md bg-neutral-900 px-2.5 py-2 text-xs leading-relaxed text-inverse shadow-classic">
            {sentenceFor(t)}
            <span className="mt-1.5 block text-neutral-400">{t.rule}</span>
          </span>
        </AnchoredCard>
      )}
    </span>
  )
}

/**
 * The same question at class level, as a composition.
 *
 * Weighted by proposals rather than by touchpoint count: a rule that settles
 * the busiest touchpoint in a class is not the same claim as one that settles
 * its rarest, and counting touchpoints states both identically.
 */
export function DriverBar({ c, className }: { c: DecisionClass; className?: string }) {
  const mix = driverMixOf(c)
  const counts = driverCountsOf(c)
  const { anchorRef, pos, show, hide } = useAnchored({ align: 'right', width: 264 })

  const order: Driver[] = ['rule', 'mixed', 'model']
  const words = order
    .filter((d) => mix[d] > 0)
    .map((d) => `${Math.round(mix[d] * 100)}% ${DRIVER_WORD[d]}`)
    .join(', ')

  return (
    <span
      ref={anchorRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <button
        type="button"
        aria-label={`Comes from: ${words}.`}
        className="rounded-sm p-0.5 focus-visible:outline-none focus-visible:shadow-focus"
      >
        <span aria-hidden className={cn('flex h-2.5 w-14', TRACK)}>
          {order.map((d) =>
            mix[d] > 0 ? (
              /* A 2px surface gap between adjacent fills, so two steps of
                 one ramp never touch and read as a gradient. */
              <span
                key={d}
                className={cn(SEGMENT[d].className, 'border-r-2 border-surface-card last:border-r-0')}
                style={{ width: `${mix[d] * 100}%` }}
              />
            ) : null,
          )}
        </span>
      </button>

      {pos && (
        <AnchoredCard pos={pos}>
          <span className="block rounded-md bg-neutral-900 px-2.5 py-2 text-inverse shadow-classic">
            <span className="block text-xs font-semibold">What produced these proposals</span>
            <span className="mt-1.5 block space-y-1">
              {order.map((d) =>
                mix[d] > 0 ? (
                  <span key={d} className="flex items-center gap-2 text-xs">
                    <span aria-hidden className={cn('h-2 w-4 shrink-0 rounded-sm', SEGMENT[d].className)} />
                    <span className="capitalize">{DRIVER_WORD[d]}</span>
                    <span className="ml-auto font-mono">{Math.round(mix[d] * 100)}%</span>
                    <span className="w-16 text-right text-neutral-400">
                      {counts[d]} of {counts.all}
                    </span>
                  </span>
                ) : null,
              )}
            </span>
            <span className="mt-2 block border-t border-neutral-700 pt-1.5 text-xs text-neutral-400">
              A rule-driven shortfall is a configuration change. A model-driven one is not.
            </span>
          </span>
        </AnchoredCard>
      )}
    </span>
  )
}

/**
 * The class's own blend, for the panel.
 *
 * The table gives every row this as a bar and the panel gave it only as a word
 * per value — so the one reading the column exists to make, how much of this
 * class is decided in advance, was on the table and missing from the detail
 * the table opens. Same bar, wider, with the shares written out: there is room
 * here, and a reader who has clicked in is asking for exactly this.
 */
/**
 * The class's blend, as one horizontal run.
 *
 * WHY IT IS NOT A STACKED BLOCK ANY MORE. It used to be a bar with its legend
 * underneath, placed opposite a heading in a `justify-between` row. Being two
 * lines tall against a one-line heading, it sat higher than the heading it
 * belonged to — far enough up to read as part of the section ABOVE it, which
 * in the panel is a matrix of defect counts it has nothing to do with. A bar
 * whose owner is ambiguous is worse than no bar. Laid out in a line and given
 * a label of its own by the caller, it reads as the caption it is.
 *
 * It is also `shrink-0`: as a shrinkable flex child it got squeezed until the
 * legend wrapped mid-item — swatch, word and count each on their own line,
 * three fragments where three labels were meant.
 *
 * The "of 5" is gone from each entry. It was printed three times to state one
 * denominator, and the denominator is already both the bar — which is the
 * whole of the class — and the table of values directly underneath.
 */
export function DriverSplit({ c }: { c: DecisionClass }) {
  const mix = driverMixOf(c)
  const counts = driverCountsOf(c)
  const order: Driver[] = ['rule', 'mixed', 'model']
  const shown = order.filter((d) => mix[d] > 0)

  return (
    <span className="inline-flex shrink-0 items-center gap-x-3">
      <span aria-hidden className={cn('flex h-2.5 w-28 shrink-0', TRACK)}>
        {shown.map((d) => (
          <span
            key={d}
            className={cn(SEGMENT[d].className, 'border-r-2 border-surface-card last:border-r-0')}
            style={{ width: `${mix[d] * 100}%` }}
          />
        ))}
      </span>
      <span className="flex items-center gap-x-3 whitespace-nowrap text-xs">
        {shown.map((d) => (
          <span key={d} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn('h-2.5 w-3 shrink-0 rounded-sm border border-neutral-600', SEGMENT[d].className)}
            />
            <span className="text-subtle">{DRIVER_WORD[d]}</span>
            <span className="font-mono text-muted">{counts[d]}</span>
          </span>
        ))}
      </span>
    </span>
  )
}

/** Rendered once, under the class table. Three words beat three repeated labels. */
export function DriverLegend() {
  const order: Driver[] = ['rule', 'mixed', 'model']
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
      {order.map((d) => (
        <span key={d} className="inline-flex items-center gap-2 text-xs text-subtle">
          <span aria-hidden className={cn('h-2.5 w-5 rounded-full border border-neutral-600', SEGMENT[d].className)} />
          <span className="capitalize">{DRIVER_WORD[d]}</span>
        </span>
      ))}
    </div>
  )
}
