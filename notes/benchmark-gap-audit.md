# Benchmark Gap — what the screen measures, and what it does not

Audit notes, 21 Sep 2026. Scope: `/evaluation/benchmark-gap`
(`src/routes/evaluation/gap/`), the group health quotation benchmark.

Companion document: `benchmark-gap-value-map.md` accounts for every value on
the screen, its origin, and which gap below it lands on (A1-A8 there are 2.1-2.8
here).

Written against the question *"does this show system performance and build
confidence in the intelligence layer"*. Part 1 records what is on the screen and
the reasoning behind it, so the argument survives without re-reading the source.
Part 2 is the gap list. Part 3 records which of it V2 built, on 21 Sep 2026.

---

# Part 1 — what exists

## 1.1 The question the screen answers

One question, deliberately narrow: **is the distance between the system and the
person who does this work today shrinking, and where is the remainder of it.**

The unit is the **decision class**, not the screen and not the model. A class is
already the unit authority is granted over (north star 04), which makes it the
only unit a closing gap can justify moving authority on (15). A class that stops
at a screen boundary is a screen, so every class carries the `steps` it reaches
and every touchpoint names the step it fires in.

Three things are held apart all the way down, because merging any two produces a
number that flatters:

- **the gap** — how far behind;
- **the confidence** — whether the system knows how far behind it is;
- **what the person did with the value** — the only ground truth there is.

## 1.2 Where the data comes from

Nothing on the screen invents a class, a step or a number. It is all lifted from
the group health quotation walkthrough:

| Source | What it supplies |
|---|---|
| `src/routes/quotation/group-health/data.ts` → `AGENTS` | the five classes and their authority rungs |
| … → `RUN_TASKS` | what each class decided on the M/s Eicore tech LTD renewal |
| … → `IMPORT_CHECKS`, `EXTRACTION_FILES`, `RECONCILE_ROWS`, `COVERS_FROM_EXPIRING`, `AGE_WISE_CLAIMS`, `QUOTE_SOURCES`, `PREMIUM` | the values inside the touchpoint notes and traces |
| `onebuzz/packages/service/workflow2/src/workflow/groupQuotation/health/configurableUiStepList.ts` (+ `./index.ts`) | the seven-step spine, via the walkthrough |
| Figma *Quotation Builder - Retail*, page "Group Quotation screens" | the captured run the walkthrough was built from |
| `../ai-research/north-star.png` | clauses 04, 09, 13, 15 — the authority argument under the class model |

The reference run is quotation **MAGM-400201-26-7000002-1** — M/s Eicore tech
LTD, group health renewal, 3,616 lives across 1,367 employees, three sum-insured
bands. It is the run the **first trace of every class replays**, which is what
lets a reader carry one case across all five classes instead of learning five.

The spine (`FLOW_STEPS`): Start Quotation, Business Details, Member Details,
Cover Details, Claims and TPA, Summary, Process Sheet.

## 1.3 The measurement model (the important part)

**A touchpoint is scored by what the person did with the generated value.** Four
observable states, and they are the whole model:

| State | Meaning |
|---|---|
| proposed + accepted | the value stood as generated |
| proposed + modified | put forward, and the person changed it |
| not proposed + added | the person supplied a value the system never offered |
| not proposed, not added | nobody had it — genuinely absent from the pack |

Only the last is not a defect, and it is kept as its own column so the other
three cannot quietly absorb it. `added` is the one that matters most: it is the
blind spot — the information was there to be had and a person had to supply it.

**There is no separate answer key**, on purpose. The product already records all
four: every Apply, every edit over a generated value, every field filled into a
blank. An oracle nobody maintains is an oracle that rots.

**Handoffs are not failures.** The walkthrough settles five of its ten tasks and
hands off five (`question`, `escalation`, `delegation`). Accuracy is therefore
scored on what the class *proposed*, and the handoff rate sits beside it, never
inside it. Fold them together either way and you get a lie: count handoffs as
failures and a careful class looks incompetent; count them as successes and a
class that asks for help on everything scores 100%.

Derived measures (`data.ts` roll-ups):

```
settled  = accepted + modified
accuracy = accepted / settled          (handoffs excluded)
unaided  = settled / decisions
gap      = benchmark - accuracy
coverage = proposed / expected         (per touchpoint)
blank    = expected - proposed
absent   = blank - added               (the non-defect remainder)
ruleShare = proposal-weighted mean of per-touchpoint ruleShare
```

`ruleShare` is weighted by how often each touchpoint fires, not averaged across
touchpoints: a rule that settles the busiest touchpoint is not the same claim as
one that settles the rarest, and an unweighted mean states both identically.

## 1.4 What is on the screen, region by region

**Scope controls.** Workflow chips and a range selector. Four workflows are
listed; only *Group health quotation* is `modelled`. The other three (UW referral
triage, Quotation STP fork, Contact dedupe) render an explicit
*"not instrumented"* state rather than an average — volume without touchpoints
would be a number with no trace behind it. Ranges are 30 days / 90 days /
6 months / 12 months, slicing 5 / 13 / 26 / 52 weekly points off the end of one
52-week series.

**The KPI strip — four numbers, each with an "i" defining it.** A figure nobody
can define is not one to promote a model on.

| KPI | Latest value | Why it is there |
|---|---|---|
| Gap to benchmark | 5 pts (88 system, 93 human), 36 pts closed over 12 months | the headline question |
| Kept as generated | 88% (344 edited instead) | the ground truth, stated as such |
| Settled unaided | 80% (613 handed off) | so accuracy cannot be raised by asking more |
| Confidence bias | -0.05, under-confident | whether the system knows what it knows |

**The gap over time.** 52 weekly points, both lines measured on the same
decisions. Two deliberate choices in the fixture: the benchmark is **flat and
noisy (91-94) rather than a straight line**, because a human baseline that never
moves is a baseline nobody re-measured; and the system carries a **90% interval
that narrows from 9 pts to 3** as volume accumulates, because a gap of 5 with an
interval of 9 is not the same claim as a gap of 5 with an interval of 3, and a
chart drawing only the lines would state both identically.

**Confidence against outcome.** Five stated-confidence buckets, each scored on
how often the value was then kept, with the volume on the row.

| Band | Stated | Kept | n |
|---|---|---|---|
| 0.5-0.6 | 55 | 62 | 168 |
| 0.6-0.7 | 65 | 71 | 287 |
| 0.7-0.8 | 75 | 83 | 566 |
| 0.8-0.9 | 85 | 91 | 894 |
| 0.9-1.0 | 96 | 97 | 1,060 |

It runs the *other way* from the usual eval finding: every bucket is accepted
more often than it claimed. That is what a system handing off 613 decisions
looks like from the inside, and it is the point of the tile — **under-confidence
is not a harmless error in the safe direction**, it is the direct cause of the
handoff column. Bucket volumes total 2,975, i.e. exactly the settled decisions;
a handed-off decision has no outcome to score.

**The class grid.** Five rows, ranked by gap, each with twelve monthly
acceptance readings and `accuracy of benchmark`. The *Decision classes* button
opens the same five in **journey order** — same data, the order is the only
difference, because ranked-by-gap is the finding and journey order is how the
workflow is explained to someone who has not seen it.

| Class | Rung | Steps | Decisions | Accuracy | Unaided | Benchmark | Gap |
|---|---|---|---|---|---|---|---|
| Document extraction | Autonomous | Start Quotation, Business Details | 1,284 | 95% | 88% | 96 | 1 |
| Census normalisation | Autonomous | Member Details | 962 | 92% | 87% | 94 | 2 |
| Cover mapping | Hybrid | Cover Details | 618 | 82% | 74% | 90 | 8 |
| Claims interpretation | Hybrid | Claims and TPA | 544 | 78% | 69% | 88 | 10 |
| Pricing | AI-assisted | Summary, Process Sheet | 311 | 72% | 59% | 87 | 15 |

Totals: 3,719 decisions — 2,631 accepted, 344 modified, 613 handed off, 131
added by the person.

The ordering is the argument: **authority tracks the gap**. The two classes
running Autonomous are the two inside 2 points of a human; Pricing, 15 points
behind and customer-affecting, sits at the lowest rung. Each class also carries
what it `decides` and where it `stops` — the half of north star 04 that is not
the verb (e.g. Pricing: *"the quotation is prepared, never submitted"*).

**Opening a class** expands in place, inside the row that was clicked, and shows:

- four figures — accuracy, unaided, decisions, **% by rule**;
- the outcome split (accepted / modified / handed off / added);
- **touchpoints**, each with its step, its driver, coverage and accept rate;
- **traces** — three per class, the first replaying the reference run.

**Driver (`rule` / `model` / `mixed`) with a rule share per touchpoint.** This is
the quietest thing on the screen and one of the most load-bearing: *accuracy
alone cannot be read without it*. A class scoring 96% on touchpoints that are
100% rule-driven has demonstrated that its configuration is correct, not that it
can reason — and the gap it closed was closed by a table. It also points the
fix: a rule-driven shortfall is a config change, a model-driven one is not.

**Traces** are recorded spans at depth, each with a status —
`ok` / `warn` / `failed` / `missed` / `handoff` / `suppressed`. The two that
carry the argument are `missed` (**never ran** — the defect is the check that did
not fire, not the check) and `suppressed` (**held** — written but deliberately not
committed, e.g. a delegation e-mail drafted and left unsent, because a task
crossing out of the building is the one place an undo cannot reach).

## 1.5 The findings the fixtures are built to produce

These are not decoration; the numbers were chosen so the screen says something.

- **The weakest touchpoints are missing checks, not bad reads.** *Unpriceable
  component* (Pricing) — 62 runs stated a premium without checking every
  component had a rate behind it. *Unpriced add-on* (Cover mapping) — 139 runs
  proposed a cover table without consulting rating table GH-2026. Both are
  100% rule-driven, so both are config defects, and the detail says so.
- **Sector classification is the weakest model-driven read** — 0% rule share, no
  default that is safe. On the reference run the RFQ said IT services and the
  expiring schedule said ITES; they price differently, nothing in the pack
  settles it, so it escalated with no fallback.
- **A reported confidence can hide a margin.** `tr-cov-3`: two candidates at
  0.61 and 0.58 were bound to the first and reported to the user at 0.86.
- **An unanswered handoff poisons downstream.** `tr-prc-3`: a sector escalation
  nobody answered, and the unpriceable-component check never ran because an
  unanswered escalation upstream is not something that step knows to look for.
- **Never-proposed is not always a defect.** `tr-cov-3`'s base-cover carry-over
  is `missed` because it is fresh business with no expiring schedule — correctly
  out of scope, and the screen distinguishes that from a blind spot.

## 1.6 Layout rules that were fought for (do not undo)

- **A bento with cards at exactly one level.** The complaint that started it was
  "way too many cards within cards"; the mistake in answering it was reading
  that as *remove the cards* — a fully flat document on the eval-tool idiom read
  worse. The nesting was the problem, so: one card per region, never a card
  inside a card, hairlines and ground inside. The audit is on depth — no
  `.shadow-card` may have a `.shadow-card` ancestor.
- **The class detail opens inside the row that was clicked** (measured delta 0).
  A side panel and a panel underneath both failed the only test that matters for
  a selector: the thing that changed must be where the click was.
- **Standing explanation lives in `InfoTip`, never as prose on the canvas**
  (DESIGN.md hard rule 8).

---

# Part 2 — the gaps

Ranked by what they do to the stated goal: show system performance, and build
confidence in the intelligence layer. Two groups — holes that **undermine the
numbers already on screen**, and the **axis the screen does not measure at all**.

## 2.1 Accepted is not correct, and nothing guards it

The whole screen rests on *the person kept it*. That is gameable from both
sides: by a system that is agreeable, and by a reviewer who rubber-stamps.
**Automation bias is the single most predictable failure of a surface like
this**, and 97% acceptance in the 0.9+ bucket is exactly what it looks like from
the inside.

The screen half-admits it (*"neither side is graded against an oracle nobody
maintains"*) and then leans on the metric anyway. One signal that acceptance was
real would carry it: values corrected **after** Apply, amendments after the quote
went out, re-quote deltas, or a sampled audit lane scored by a second
underwriter. Without one, every number below the KPI strip inherits the doubt.

Needs a data-model decision first: **is there a post-Apply correction record to
hang it on?** If there is not, the honest version is a sampled audit lane with
its own, smaller n — not a silent extension of the four-state model.

## 2.2 The benchmark has no error bar

The system line carries a 90% interval. The human line is flat 91-94 with no
provenance — whose accuracy, how many people, measured how, over what sample.

Two underwriters disagree with each other on sector and loading far more than
5 points. **"5 points behind the human" is not interpretable until the human's
own spread is on the chart** — and the moment it is, the likely finding becomes
*the system sits inside inter-rater variance*, which is a far stronger claim than
a closing line. Inter-rater variance on the same frozen input is also already the
premise of Shadow Parity, so the instrument exists.

## 2.3 Every decision weighs 1

A wrong sector moves premium by tens of percent; a missed TPA code moves
nothing. There is no materiality anywhere on the screen:

- no exposure (rupees, or premium movement) attached to the `modified` column;
- no split between an error **caught at the Summary checkpoint** and one that
  **reached a bound quotation**;
- no reversibility marker, although the walkthrough already reasons in those
  terms (*"customer-affecting and hard to reverse"* is literally why Pricing is
  at the lowest rung).

Confidence comes from *the mistakes are small and caught*, not from a
percentage. This is also the fix for the gap reading as failure: a 5-point gap
made entirely of cheap, caught, reversible misses is a buy. Note the fixtures
already contain the raw material — `tr-cen-3`'s 96 mother-in-law rows had to be
corrected **before pricing ran**, which is a caught error with a named blast
radius.

## 2.4 Time and cost are absent entirely

Nothing on this page says the run is faster or cheaper. A person takes hours on
an Eicore-sized census; the traces show the system doing the same work in
seconds of span time.

As it stands the benchmark shows **only the dimension where the system is
behind** and hides the two where it is ahead by an order of magnitude. Missing:
minutes per run against the human baseline, reviewer touches per run, inference
cost per quotation. The span timings in every trace are already the per-step
half of this.

## 2.5 Handoff ageing

613 handoffs are correctly not scored as failures — but `tr-prc-3` is literally
*"sector escalation never answered"*, and the screen cannot see one. An
unanswered handoff is a stalled quotation.

Time-to-answer and an unanswered count belong beside the handoff rate, or
*"handoffs are the ladder working"* is unfalsifiable. The three kinds already
differ in who they wait on (`question` / `escalation` internal, `delegation`
often out of the building, and `tr-cen-2` is drafted-not-sent), so they should
age on different clocks.

## 2.6 Nothing is versioned

No deploy markers on the curve; no model, prompt or rule-config identity behind
a reading. The first question a risk function asks is *"did your last release
make it worse, and how fast did you know"*, and a smooth 52-week climb with no
change events reads as a drawn curve rather than a measured one.

Determinism belongs here too: same input twice, same answer? For the
rule-driven touchpoints the claim is trivially yes, and saying so is free —
which is another reason the driver split is worth surfacing higher.

## 2.7 Only one cut: decision class

No cohort by document quality (scanned against native), group size, fresh
against renewal, broker, or sector. The class says **which capability** is weak;
the buyer asks **will it hold on my messy pack**. The fixtures already gesture at
this — *"strong on renewal, weak on fresh business"* sits in a touchpoint note
where nothing can filter on it, and `tr-cov-3` is the fresh-business case.

## 2.8 Smaller ones

- **No touchpoint-level history.** The class carries twelve months; the
  touchpoint carries one reading, so *which fix worked* is unanswerable at the
  level the fixes are made.
- **`stops` is buried in the side panel.** What the system refuses to do is a
  confidence asset and it is the hardest thing to see on the screen.
- **The `absent` column is computed and never surfaced on its own.** It is the
  one honest non-defect, and it currently only exists inside a coverage figure.

## 2.9 If picking three

**2.3 (materiality), 2.4 (time and cost), 2.2 (benchmark spread).** Together
they turn the page from *"we are 5 points behind a human"* into *"we are inside
human variance, on cheap reversible decisions, in a twentieth of the time"* —
which is the confidence argument.

**2.1** is the one to want most for intellectual honesty, and it is blocked on
the data-model question above.

---

# Part 3 — what V2 built

`/evaluation/benchmark-gap/v2` (`src/routes/evaluation/gap/v2/`). V1 is
untouched and still lives at the bare path. `../data.ts` — the measurement
model — is untouched too; everything V2 adds sits in `v2/data.ts`.

**The reframing.** V1 asked how far behind the system is and answered it
against a human rendered as a point. V2 draws the human as the range they
actually are, and the finding inverts: **system 88, underwriters 87-96 — inside
the range**, not five points adrift of an average. Same decisions, same
measurement model, a different and more defensible claim.

## Closed

| Gap | How |
|---|---|
| **A2** benchmark had no error bar | `HUMAN_RATERS = 7`; a per-week and per-class spread; the trend chart draws the people as a hatched region with their mean inside it. The `RangeStrip` renders that comparison at three scales — page, class row, cohort row — and is the page's signature. |
| **A3** every decision weighed 1 | A 3x3 containment matrix: **where the defect was caught** (before pricing / at the Summary checkpoint / after the quotation was prepared) against **what it touched** (a field / the premium / cover terms). 475 defects, **80% caught before the quotation**, 93 that reached one. |
| **A5** handoff ageing | Open count, median time to answer, oldest open, and a count past three days — split by kind, because a question comes back in 2.1h and a delegation in 31.4h. |
| **A6** nothing was versioned | Four release markers on the curve with rule-config and model identities; the crosshair names the build live that week. |
| **A7** one cut only | A **By document quality** block inside the row expansion. Native packs score **93%**, scanned **78%** — and the underwriters degrade less than the system does, which is the whole reason the cut is worth drawing. It started as a page-level `Split by` control and moved into the expansion: it is not a different scope for the screen, it is a second reading of one row, and it should cost nothing until somebody asks for it. |
| **A8** the smaller ones | Touchpoint history (12 months each, seeded from the touchpoint id) with a median + min-max hover card; `absent` surfaced as its own segment of a three-part coverage bar; `stops` promoted out of a tooltip into the panel. |

## Narrowed on purpose

**A4 — time and cost.** Latency is on the page as p50 / p95 per class plus the
slowest span, because that points at a fix. The hours-saved comparison and the
cost per quotation are **not**, and will not be: this surface reports system
performance, not the value the system drives. A money figure here answers a
different question for a different audience.

## Stated, not faked

**A1 — accepted is not correct.** Rendered as a named check in an `unknown`
state, in the same shape as one that passed: *"not enough recorded history to
separate a value that was right from one that was waved through."* It converts
into a real measure the day a post-Apply correction record exists. Inventing a
number here would have been the one dishonest thing on the page.

## Also now rendered

`class.confidence` and `class.calibration` (section 9 listed both as stored and
never shown) appear in the class panel. Calibration itself is demoted from a
headline tile to a slim band, because it is not a third measure of quality — it
is the explanation for the handoff column.

## Corrections made after the first pass

- **Selection is an outline, not a fill.** The opened class row and its panel
  were washed in `surface/sunken`, which reads as a disabled region. They are
  now one box drawn in `border/strong` on white ground.
- **The driver stopped being a percentage.** `ruleShare` was printed bare on
  the canvas — "78%", "53%" — a number with no stated denominator. The canvas
  now carries the word (`rule` / `mixed` / `model`) at touchpoint level and a
  three-step composition bar at class level; the split, the counts and the
  named rule moved into the card. Its palette is one sequential ramp — grey,
  light indigo, indigo — after a grey-and-indigo hatch for `mixed` blended at
  8px into a second shade of `model`.
- **Tooltips are portalled.** Every dense table here sits in an
  `overflow-x-auto` wrapper, and `overflow-x: auto` clips the other axis too,
  so tips on the first and last rows were cut off. `components/Anchored.tsx`
  renders them to `document.body`, positions `fixed` against the anchor's
  rect, and flips above the anchor after measuring its own height — a rect
  alone cannot say whether a card fits. Audited by focusing all 51 anchors:
  51 opened, 0 clipped, 0 residual.
- **Traces came back.** The first V2 pass reduced a trace to one summary line
  — reference, outcome, confidence, total time — which threw away the spans.
  That was the wrong cut: every finding in §1.5 lives in them (`tr-cov-3`'s
  0.86 covering two candidates at 0.61 and 0.58; `tr-prc-3`'s unanswered
  escalation and the check that never fired downstream), and V2 was quoting
  p50/p95 at the top of the same panel from exactly that data. `v2/Traces.tsx`
  restores the full vocabulary — ok / flagged / edited / never ran / asked /
  held — as a waterfall against a stated scale, with the explainability line
  under each span. Spans are NOT laid end to end: a root's duration is not the
  sum of its children in this fixture, so a cumulative axis would draw a
  structure nobody measured. Each bar is its own duration on a shared scale.
  Zero-duration spans draw a stated pill instead of a bar, because a 2px stub
  is indistinguishable from a fast step — the same confusion `absent` exists
  to prevent one level up.
- **Time came off the screen entirely.** Latency was carried for one pass on
  the argument that speed is system performance rather than a value claim. It
  is — but it is not performance at the thing this screen measures: a decision
  is right or wrong at any speed, nothing else on the page moves when the
  milliseconds move, and it kept inviting the one comparison the scope rules
  out (that a person would have taken longer). Gone: `LATENCY`,
  `LATENCY_TOTAL`, the `p50` column, the *Time to decide* / *Slowest span*
  figures, the *Time to a decision* verdict tile, and the duration bars in the
  traces. Handoff **ageing** went with it — median hours to an answer measured
  how fast people reply, not what the system did.
  - **A4 is answered by COVERAGE instead**, which is the honest pair to the
    headline: every accuracy figure here is scored on values the system PUT
    FORWARD, and coverage is that measure's denominator. 1,135 of 21,152
    occasions got no proposal at all — 743 a blind spot a person filled from
    the pack, 392 absent from the pack and not a defect. A class can hold 95%
    kept while staying silent on a twelfth of what it was asked for, and until
    this was drawn the two were indistinguishable.
  - **A5 is now counted rather than clocked.** The handoff band is the 613
    split by what was asked for, each bar's length its volume and its leading
    block what has not come back: questions 24 open of 307, escalations 31 of
    195, delegations 43 of 111. Two in five delegations are still waiting
    because they leave the building, which is the same finding the hours were
    making, stated as something the system is accountable for.
  - **Traces lost their bars, not their spans.** Durations were the loudest
    thing in the list and pointed at the one axis nothing is scored against.
    Each step now reads label → status word (ok / flagged / edited / never ran
    / asked / held) with the explainability line under it. The sequence, the
    verdict and the reasoning survive; the stopwatch does not.
- **The row expansion became a side sheet.** It had grown into a table inside
  a table — two grids and a trace list wedged into one cell of the first —
  which pushed every row below it a screen and a half down. `v2/ClassSheet.tsx`
  opens it at 46vw on the right, portalled, Escape and scrim to close, focus
  in on open and back to the originating row on close. The reason the panel was
  originally rejected still held and is answered by geometry: it takes half the
  width, the table stays beside it, and the row keeps its `border/strong`
  outline, so the panel is always readable against the row it came from.

- **Contrast, and a token-layer gap it exposed.** The box-and-whisker marks were
  light grey on white: the underwriter band's edge sat at 1.4:1 and its fill at
  1.1:1, the calibration track at 1.1:1, the trend hatch at 1.4:1, the sparkline
  at 2.1:1. WCAG 1.4.11 asks 3:1 of any graphic that carries a reading. Every
  mark that states a value now clears it — band edge and axis at neutral/600
  (4.2:1), the average tick at neutral/800, the system's interval at brand/500
  (3.6:1) — while pale FILLS survive where their boundary is what carries the
  reading. The gap this found is real: `border/strong` tops out at `#d0d0de`,
  1.43:1, so the token layer had no border a chart could legally draw with.
  `tailwind.config.js` now exposes neutral/500-600-800 and brand/500 as border
  colours, charts only, under the same licence the chart accents already had.
- **The chevron came off the class row.** It promised a disclosure that opened
  in place, and what opens is a sheet beside the table.
- **The calibration dumbbell became a drift bar.** Two round handles joined by a
  line is the drawing of a range slider — it read as a control to drag and as a
  selection rather than a measurement. A bar growing out of a fixed tick is
  directional, and the length is the drift. (The band itself came off the page
  shortly after; the reasoning is kept because the shape will recur.)
- **The verbosity cut.** Measured before: 559 words of visible copy over 2,087px,
  five analytic bands, and 24 tooltips. The problem was not prose, it was
  VOCABULARY — thirteen coined terms (put forward, blind spot, settled unaided,
  containment, kept as generated, absent from the pack, waiting outside the
  building…) that the tooltips existed to define. Every label on the canvas is
  now ordinary English, which deleted most of the tooltips as a side effect: six
  remain on the page. The confidence-calibration band went too — the most
  technical reading on the page and the one an underwriting manager can act on
  least.
- **An open trace is an outline on white, not a grey wash.** Same rule as the
  class row. A fill reads as disabled and dulls every status word printed on it.
- **The human benchmark is asserted, and the two sides of the chart are not the
  same measure.** The system's figure is scored BY the underwriter (used as-is),
  so an underwriter scored the same way is 100% by construction. Options, in
  order of cost: leave-one-out peer agreement (cheap, weekly, measures agreement
  not truth), an adjudicated gold set scoring both sides on the same yardstick
  (the only honest version), downstream outcome truth (re-rating, QA amendments,
  referrals overturned — external but slow and partial), and the deterministic
  subset where a rate table defines the answer exactly. Until one of these is
  wired in, the y-axis is agreement, not accuracy.

## The CEO pass

Read as the person running the business rather than the evaluation. Four bands
went in, and only two of them answered a question that reader asks.

- **The page was organised by kind of measurement, not by the work.** Accuracy,
  then where defects were caught, then what was asked of people. That is how
  the instrument is built. The reader thinks in a journey — a quotation
  arrives, moves through seven steps, goes out — and that ordering existed only
  as a secondary sort toggle on a table three screens down. Their own model of
  the work was behind a control.
- **New band 2, `The quotation, start to finish`** (`v2/Flow.tsx`). Five blocks
  tiling the seven-step spine, hairline-split, no cards. Each says the two
  halves of "can it run this part of my flow": how much of the step it settles
  without asking, and whether what it produced there is as good as the
  underwriters. Either half alone misleads — a step it never asks about and
  gets wrong is worse than one it hands over honestly. Clicking a block opens
  the same class sheet the table does.
  The staircase is the finding and it is now one glance: 88 / 87 / 74 / 69 / 59
  on its own, with the authority rung descending in lockstep.
- **The containment matrix moved into the class panel** (`ClassContainment`).
  Nine numbers about which internal gate fired is a QA reading — true, useful,
  and not a question anybody asks before they have decided they care about one
  decision. It was the heaviest section on the page (214 words) and is now
  free until somebody opens a row.
- **The handoff-by-kind bars were cut, not moved.** Their finding — an ask that
  leaves the building is the one that does not come back — is already in the
  verdict's `Waiting on a person` tile, and the panel carries the same three
  counts per class. Two drawings of one fact is how the page got long.
- **The table opens in journey order with five columns**, not gap order with
  ten. Gap order is still the sharper argument about the rung system and is one
  click away; journey order matches the flow band row for row, so the two read
  as one thing.
- **`Benchmark Gap` → `Where the system stands`** on V2's H1 only. The old
  title is an eval-team phrase; a business reader expects a chart about
  competitors. The route, the nav entry and V1 are untouched.

Measured before / after: 523 → 433 words, four bands → four bands but 2,087 →
1,780px, and the first two screens now answer "which parts of my flow can it
run" instead of "where did the defects get caught".

## Declutter pass

- **Counts became ratios, then ratios became prose, then both got fixed.**
  `Suggested nothing: 1,204` was a true number with no size — no denominator,
  so nothing in it to decide from. The first fix wrote the denominator out as a
  sentence under each tile and three sentences under three tiles turned the
  verdict back into prose. What stands is one line: a share, the population it
  came from, and the one fragment that is bad news, `·`-separated like every
  other meta line on the page.
  `80% · 382 of 475 mistakes · 93 reached the quote`
  `4% · 743 of 21,152 needed · 392 in no document`
  `16% · 98 of 613 asks · 43 outside the business`
  The `Line`/`dl` machinery under each tile is gone with them.
- **Flow band alignment.** Two of five step titles wrap and three do not, which
  put every bar in the row at a different height. The title box is two lines
  tall whether it needs them or not and the rung sits on `mt-auto`; at 1600px
  all five bars are at 663, all five strips at 714, all five rungs at 750.
- **The standing word in a flow block prints only when it is bad news.** The
  dot inside the band already says "as good as the underwriters"; writing it
  out five times made the one block that is NOT fine harder to find.
- **Panel figures: five to three, all shares.** `Used as-is` was already in the
  sheet header and in the row that opened it. `Suggested` and `A person had to
  add it` were two halves of one reading, and the actionable half is the one a
  person supplied, so they are one figure.
- **Two duplicate columns cut.** The cohort table's `Difference` (the strip and
  the two accuracy readings carry it), and the `N not in docs` text sharing a
  cell with the touchpoint sparkline — two unrelated numbers in one cell.

Page 442 → 418 words. Panel 571 → 542 words, 2,196 → 1,867px.

## Section-by-section, as the business reader

Three questions per band: does it give me confidence in the system, does it
give me information I do not need, does it say what it means to say.

| Band | px | words | Verdict |
|---|---|---|---|
| Used as-is | 301 | 79 | Confidence: yes, the only band that makes the claim. Keep whole. |
| The quotation, start to finish | 284 | 128 | Confidence: yes, the staircase. **Two things cut** — below. |
| Where the system sits, week by week | 577 | 83 | Confidence: yes, it is the "is it improving" proof. Now the tallest band on the page for one reading; the 90% interval ribbon is the one element a business reader cannot act on. Left in — it is what keeps the system line honest. |
| The decisions it makes | 437 | 80 | The detail. Five of its seven tooltip buttons are the sparklines' own aria-labels, not copy. Fine. |

**The flow band's quality reading failed twice, both times by showing the
evidence instead of the finding.**

1. As a range strip at `size="cell"` — 72px over a 50-100 axis is 1.44px per
   point, so a whole underwriter spread drew about ten pixels wide. What it
   told a reader was "there is a chart here".
2. As the exact pair `95% · underwriters 93-98` — correct, and it still leaves
   the comparison to be done in the reader's head, while putting a second
   percentage immediately under `88% on its own`: two figures that look alike
   and mean different things.

What is there now is the conclusion and nothing else — `Matches the
underwriters` / `Behind the underwriters`, the second in warning weight. A
block answers two questions: how much of this step can it do (the bar), and is
it as good as my people (the sentence). The accuracy figure and the spread are
one row down in the table and in the panel, where somebody checking the
arithmetic goes for them.

**Bars: separated by lightness, not by hue.** `brand/500` beside `neutral/600`
clears 3:1 against the card and sits at **1.19:1 against each other** — same
lightness, different hue, which reads as one muddy band and is invisible to a
colour-blind reader. Two fixes:

- The flow reach bar is now ink against paper: `primary` fill in an outlined
  empty track. Fill vs track 5.96:1, outline vs card 4.21:1.
- The driver ramp steps down in lightness — `neutral/300`, `brand/500`,
  `brand/800` — taking adjacent contrast from 1.19 and 1.77 to **2.80 and
  2.23**. Rule keeps the quiet end, as DESIGN.md's palette note intends. Its
  pale fill is the licence `RangeStrip` already states — a pale fill is allowed
  where its BOUNDARY carries the reading — so every bar built from the ramp is
  outlined at `neutral/600` and every loose swatch carries the same outline.

**Two alignment defects, both structural rather than cosmetic.**

- The flow grid used competing `nth-child` arbitrary variants at two
  breakpoints to drop the first column's inset. Those carry equal specificity,
  Tailwind decides the order between them, and the one that won indented block
  one past the heading with no rule beside it to explain why. Rule and inset
  are one `lg:border-l lg:pl-6` now, dropped together by `lg:first:` — a real
  variant, higher specificity, deterministic. `divide-x` went with it: it is
  not row-aware and was drawing a left border on blocks 3 and 5 in the
  two-column layout, where nothing is to their left.
- `DriverSplit` was a shrinkable flex child in a `justify-between` row, so it
  was squeezed until the legend wrapped mid-item — swatch, word and count each
  on their own line. It is `shrink-0` now, and laid out in a LINE rather than
  stacked: two lines tall against a one-line heading, it sat higher than the
  heading it belonged to, far enough up to read as part of the section above
  it — which in the panel is a matrix of defect counts it has nothing to do
  with. A bar whose owner is ambiguous is worse than no bar. It now sits under
  the heading, labelled `Comes from` after the table column it summarises and
  directly above that table. The "of 5" is gone from each entry — printed
  three times to state one denominator the bar already is.
- **The touchpoints section had no top rule** while every other section in the
  panel has one, so it ran straight on out of the defect matrix. Six sections,
  six hairlines now.
