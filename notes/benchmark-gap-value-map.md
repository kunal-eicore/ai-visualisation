# Benchmark Gap — value map

Every value the screen holds, where it comes from, and which audit gap it
speaks to. 21 Sep 2026. Companion to `benchmark-gap-audit.md`: the audit argues,
this one accounts. Source of every figure below is
`src/routes/evaluation/gap/data.ts` unless a row says otherwise; the tables are
generated from that file rather than transcribed.

**Audit references** are to part 2 of `benchmark-gap-audit.md`:

| Ref | Gap |
|---|---|
| A1 | Accepted is not correct, and nothing guards it |
| A2 | The benchmark has no error bar |
| A3 | Every decision weighs 1 (no materiality) |
| A4 | Time and cost absent entirely |
| A5 | Handoff ageing |
| A6 | Nothing is versioned |
| A7 | Only one cut: decision class |
| A8 | Smaller: no touchpoint history, `stops` buried, `absent` unsurfaced |

**Origin codes** used in the "from" columns:

| Code | Meaning |
|---|---|
| `WT` | the group health walkthrough — `src/routes/quotation/group-health/data.ts` |
| `SVC` | the Onebuzz service — `workflow2/.../groupQuotation/health/configurableUiStepList.ts` and `./index.ts` |
| `FIG` | Figma *Quotation Builder - Retail*, page "Group Quotation screens" (the captured M/s Eicore tech LTD run) |
| `NS` | `../ai-research/north-star.png`, clause number given |
| `FIX` | a population figure invented for the prototype — no upstream source, chosen to make a specific finding legible |
| `DER` | derived in `data.ts` from other values here |

`FIX` is the honest label on most of the volumes. The walkthrough is one run; a
population of 3,719 decisions over 52 weeks cannot come from it, so those
numbers are constructed. What is *not* constructed is the shape: which class is
weakest, which touchpoint fails, and why — all of that is the walkthrough's.

---

## 1. Scope values

| Value | What it is | From | Audit |
|---|---|---|---|
| `wf-gh-quote` Group health quotation, journey Quotation, `modelled: true` | the only instrumented workflow | `WT` | — |
| `wf-uw-referral` UW referral triage, Underwriting, `modelled: false` | renders the not-instrumented state | the workbench route models this flow, so it is named rather than invented | — |
| `wf-quote-stp` Quotation STP fork, Policy builder, `false` | same | the policy-builder project in the hub | — |
| `wf-dedupe` Contact dedupe, Contact management, `false` | same | the contact-management project in the hub | — |
| `FLOW_STEPS` — Start Quotation, Business Details, Member Details, Cover Details, Claims and TPA, Summary, Process Sheet | the seven-step spine | `SVC` — five configurable UI steps plus two injected review checkpoints | — |
| `REFERENCE_RUN.quotation` = MAGM-400201-26-7000002-1 | the run every class's first trace replays | `FIG` | — |
| `REFERENCE_RUN.client` = M/s Eicore tech LTD | | `FIG` | — |
| `REFERENCE_RUN.summary` = 3,616 lives across 1,367 employees, three sum-insured bands | | `FIG` | — |
| `RANGES` = 30 days / 90 days / 6 months / 12 months | the range chips | prototype convention | **A6** — a range is a window, not a version; neither chip can isolate a release |
| `RANGE_WEEKS` = 5 / 13 / 26 / 52 | how many weekly points each chip slices off the end | `DER` convention | — |

**Not rendered anywhere:** `FLOW_STEPS`, `REFERENCE_RUN.client`,
`REFERENCE_RUN.summary`. Only the quotation number reaches the page, as a Badge
in the header.

---

## 2. The gap series

One 52-week series; the range chips slice its tail. Week commencing Monday,
ending on the reference run's own week (2026-09-21).

- **`benchmark`** — `FIX`. Deliberately noisy in 91-94 rather than a flat line,
  because a human baseline that never moves is one nobody re-measured. It has
  **no n, no provenance and no spread** → **A2**. This column is the single
  largest unsourced value on the screen.
- **`system`** — `FIX`, 51 rising to 88. The endpoint is anchored: 88 is the
  displayed "kept as generated", which is `DER` from the class totals.
- **`ci`** — `FIX`, 9 narrowing to 3. Half-width of the system's 90% interval,
  carried so that a 5-point gap at ci 3 is distinguishable from the same gap at
  ci 9. **Only the system has one** → **A2**.
- No point carries a model, prompt or config identity → **A6**.
- No point carries a cohort → **A7**.

| Range | Weeks | First week | Gap at first | Gap at last | Closed |
|---|---|---|---|---|---|
| 30 days | 5 | 2026-08-24 | 7 | 5 | 2 |
| 90 days | 13 | 2026-06-29 | 10 | 5 | 5 |
| 6 months | 26 | 2026-03-30 | 18 | 5 | 13 |
| 12 months | 52 | 2025-09-29 | 41 | 5 | 36 |

| Week | Human benchmark | System | CI half-width | Gap |
|---|---|---|---|---|
| 2025-09-29 | 92 | 51 | 9 | 41 |
| 2025-10-06 | 93 | 53 | 9 | 40 |
| 2025-10-13 | 92 | 52 | 8 | 40 |
| 2025-10-20 | 91 | 55 | 9 | 36 |
| 2025-10-27 | 93 | 56 | 8 | 37 |
| 2025-11-03 | 92 | 55 | 8 | 37 |
| 2025-11-10 | 94 | 58 | 8 | 36 |
| 2025-11-17 | 93 | 59 | 7 | 34 |
| 2025-11-24 | 92 | 58 | 8 | 34 |
| 2025-12-01 | 93 | 61 | 7 | 32 |
| 2025-12-08 | 91 | 62 | 7 | 29 |
| 2025-12-15 | 92 | 61 | 7 | 31 |
| 2025-12-22 | 93 | 64 | 7 | 29 |
| 2025-12-29 | 94 | 65 | 6 | 29 |
| 2026-01-05 | 92 | 64 | 7 | 28 |
| 2026-01-12 | 93 | 66 | 6 | 27 |
| 2026-01-19 | 92 | 67 | 6 | 25 |
| 2026-01-26 | 91 | 66 | 6 | 25 |
| 2026-02-02 | 93 | 69 | 6 | 24 |
| 2026-02-09 | 92 | 70 | 6 | 22 |
| 2026-02-16 | 93 | 69 | 5 | 24 |
| 2026-02-23 | 94 | 71 | 6 | 23 |
| 2026-03-02 | 92 | 72 | 5 | 20 |
| 2026-03-09 | 93 | 71 | 5 | 22 |
| 2026-03-16 | 92 | 73 | 5 | 19 |
| 2026-03-23 | 93 | 74 | 5 | 19 |
| 2026-03-30 | 91 | 73 | 5 | 18 |
| 2026-04-06 | 92 | 75 | 4 | 17 |
| 2026-04-13 | 94 | 76 | 5 | 18 |
| 2026-04-20 | 93 | 75 | 4 | 18 |
| 2026-04-27 | 92 | 77 | 4 | 15 |
| 2026-05-04 | 93 | 78 | 4 | 15 |
| 2026-05-11 | 92 | 77 | 4 | 15 |
| 2026-05-18 | 94 | 79 | 4 | 15 |
| 2026-05-25 | 93 | 80 | 4 | 13 |
| 2026-06-01 | 92 | 79 | 4 | 13 |
| 2026-06-08 | 91 | 81 | 3 | 10 |
| 2026-06-15 | 93 | 82 | 4 | 11 |
| 2026-06-22 | 92 | 81 | 3 | 11 |
| 2026-06-29 | 93 | 83 | 4 | 10 |
| 2026-07-06 | 94 | 84 | 3 | 10 |
| 2026-07-13 | 92 | 83 | 3 | 9 |
| 2026-07-20 | 93 | 84 | 3 | 9 |
| 2026-07-27 | 92 | 85 | 3 | 7 |
| 2026-08-03 | 93 | 84 | 3 | 9 |
| 2026-08-10 | 91 | 86 | 3 | 5 |
| 2026-08-17 | 92 | 85 | 3 | 7 |
| 2026-08-24 | 93 | 86 | 3 | 7 |
| 2026-08-31 | 94 | 87 | 3 | 7 |
| 2026-09-07 | 93 | 86 | 3 | 7 |
| 2026-09-14 | 92 | 87 | 3 | 5 |
| 2026-09-21 | 93 | 88 | 3 | 5 |

---

## 3. Calibration

Bucketed by the confidence the system stated at the time; scored on how often
the value was then kept.

- `stated` / `actual` / `n` — all `FIX`, but the **direction** is `WT`: the
  walkthrough's settled tasks carry 0.93-0.99 and its handoffs 0.58-0.74, and
  that shape across a population is a system that under-states what it knows.
- Bucket volumes total **2,975**, which is exactly `SETTLED`. Consistent by
  construction: a handed-off decision has no outcome to score.
- `actual` is *kept*, i.e. acceptance — so every number in this tile inherits
  **A1**. A well-calibrated bucket here means "the system predicted how often it
  would be agreed with", not "how often it was right".

| Band | Stated | Kept | Drift | n |
|---|---|---|---|---|
| 0.5 to 0.6 | 55 | 62 | +7 | 168 |
| 0.6 to 0.7 | 65 | 71 | +6 | 287 |
| 0.7 to 0.8 | 75 | 83 | +8 | 566 |
| 0.8 to 0.9 | 85 | 91 | +6 | 894 |
| 0.9 to 1.0 | 96 | 97 | +1 | 1060 |

n total 2975 · CALIBRATION_BIAS -0.0466 · CALIBRATION_ERROR 0.0466

| Derived | Value | Where it shows |
|---|---|---|
| `CALIBRATION_BIAS` | -0.0466, rendered as **-0.05, under-confident** | KPI 4 |
| `CALIBRATION_ERROR` | 0.0466 | **computed and never rendered** |

Bias and error are equal in magnitude because every bucket misses the same way;
the absolute and the signed mean coincide. That is a property of the fixture,
not of the formula.

---

## 4. Roll-ups and the KPI strip

```
{
  "decisions": 3719,
  "accepted": 2631,
  "modified": 344,
  "handed": 613,
  "added": 131,
  "expected": 21152,
  "proposed": 20017,
  "userAdded": 743
}
SETTLED 2975
```

**Two grains live in `TOTALS`, and only one of them reaches the screen.**
`decisions`, `accepted`, `modified`, `handed`, `added` are summed over
*classes*. `expected`, `proposed`, `userAdded` are summed over *touchpoints* —
and since every touchpoint in a class carries `expected == class.decisions`
(each touchpoint fires once per decision), those three are decision-count
multiples, not a second count of the same thing:

| Class | decisions | every touchpoint's `expected` | sum of touchpoint `added` | class `added` |
|---|---|---|---|---|
| Document extraction | 1,284 | 1,284 | 281 | 21 |
| Census normalisation | 962 | 962 | 120 | 17 |
| Cover mapping | 618 | 618 | 157 | 32 |
| Claims interpretation | 544 | 544 | 117 | 39 |
| Pricing | 311 | 311 | 68 | 22 |

So `TOTALS.userAdded` (743) and the class-level `added` (131) are counting
different things — an added *field* against an added *decision*. Neither is
displayed, so nothing on the screen is wrong today, but any future tile that
reaches for `TOTALS.expected` or `TOTALS.userAdded` has to say which grain it
means.

The four KPIs:

| KPI | Rendered | Formula | Audit |
|---|---|---|---|
| Gap to benchmark | **5 pts**, note `88% system, 93% human`, trend `36 pts closed` | last point of the selected range; trend is first-to-last across the range | **A2** on the human half |
| Kept as generated | **88%**, note `344 edited instead` | `TOTALS.accepted / SETTLED` = 2631 / 2975 | **A1** directly; **A3** on the 344 |
| Settled unaided | **80%**, note `613 handed off` | `SETTLED / TOTALS.decisions` = 2975 / 3719 | **A5** on the 613 |
| Confidence bias | **-0.05**, note `under-confident` | `CALIBRATION_BIAS` | **A1** inherited |

The trend value changes with the range chip: 2 / 5 / 13 / 36 points closed. The
headline gap is 5 in every range, because they all end on the same week.

---

## 5. The classes

`decisions`, `accepted`, `modified`, `handed`, `added` and `benchmark` are all
`FIX`. Everything structural — the class list, the rung, the owning agent, the
steps, `decides`, `stops` — is `WT` and `NS 04`.

The ordering is the argument, and it is built into the fixture:
**authority tracks the gap.** The two Autonomous classes are the two inside
2 points of a human; Pricing, 15 behind and customer-affecting, is at the lowest
rung.

| Class | id | Rung | Agent | Steps | Decisions | accepted | modified | handed | added | benchmark | confidence | calibration |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Document extraction | `docs` | Autonomous | Document reader | Start Quotation + Business Details | 1284 | 1064 | 61 | 138 | 21 | 96 | 0.93 | -0.02 |
| Census normalisation | `census` | Autonomous | Census | Member Details | 962 | 772 | 67 | 106 | 17 | 94 | 0.9 | -0.02 |
| Cover mapping | `covers` | Hybrid | Cover mapping | Cover Details | 618 | 372 | 83 | 131 | 32 | 90 | 0.78 | -0.04 |
| Claims interpretation | `claims` | Hybrid | Claims | Claims and TPA | 544 | 291 | 82 | 132 | 39 | 88 | 0.74 | -0.04 |
| Pricing | `pricing` | AI-assisted | Pricing | Summary + Process Sheet | 311 | 132 | 51 | 106 | 22 | 87 | 0.69 | -0.03 |

| Class | settled | accuracy | unaided | gap | ruleShare | touchpoints | traces |
|---|---|---|---|---|---|---|---|
| Document extraction | 1125 | 95% | 88% | 1 | 53% | 6 | 3 |
| Census normalisation | 839 | 92% | 87% | 2 | 79% | 6 | 3 |
| Cover mapping | 455 | 82% | 74% | 8 | 69% | 5 | 3 |
| Claims interpretation | 373 | 78% | 69% | 10 | 71% | 5 | 3 |
| Pricing | 183 | 72% | 59% | 15 | 91% | 6 | 3 |

| Field | Status |
|---|---|
| `accuracy`, `unaided`, `gap`, `ruleShare` | `DER`, all rendered |
| `settledOf` | `DER`, used only inside the others — never rendered on its own |
| `agent` | `WT`, **stored and never rendered** |
| `confidence` (class mean) | `FIX`, **stored and never rendered** |
| `calibration` (class) | `FIX`, **stored and never rendered**. Reproducible as `confidence - accuracy/100` for all five, so it is redundant as well as unused |
| `decides` | `WT`, rendered in the row InfoTip and the panel |
| `stops` | `WT` + `NS 04`, rendered in the panel and the row InfoTip → **A8** (it is the clearest confidence asset on the screen and the hardest to find) |

`ruleShare` is worth reading against accuracy: **Pricing is 91% rule-driven and
still the worst class**, which says its remaining gap is arithmetic sitting on
bad inputs, not bad arithmetic. Document extraction is the most model-driven at
53% and the best. That inversion is the strongest single argument on the screen
and it is currently one small figure inside an expansion.

### Monthly history

Twelve readings per class, oldest first, `FIX`. Rendered as the row's month
cells; `HISTORY_MONTHS` supplies the labels.

| Class | Oct | Nov | Dec | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Document extraction | 78 | 81 | 84 | 86 | 88 | 89 | 91 | 92 | 93 | 94 | 94 | 95 |
| Census normalisation | 71 | 74 | 77 | 80 | 82 | 84 | 86 | 88 | 89 | 90 | 91 | 92 |
| Cover mapping | 52 | 56 | 59 | 63 | 66 | 69 | 72 | 74 | 76 | 78 | 80 | 82 |
| Claims interpretation | 46 | 50 | 54 | 57 | 61 | 64 | 67 | 70 | 72 | 74 | 76 | 78 |
| Pricing | 38 | 42 | 45 | 49 | 52 | 56 | 59 | 62 | 65 | 68 | 70 | 72 |

Every class rises monotonically apart from flat steps. There are **no deploy
markers** to explain any step → **A6**, and no equivalent series one level down
→ **A8** (the fixes are made at touchpoint level and cannot be seen there).

---

## 6. Touchpoints

28 touchpoints. Columns: `expected`, `proposed`, `accepted`, `added` are stored
(`FIX` for the counts, `WT` for which touchpoint exists and how it behaves);
`modified`, `blank`, `absent`, `coverage` and `accept rate` are `DER`.

- `modified = proposed - accepted`
- `blank = expected - proposed`
- `absent = blank - added` — the only shortfall that is not a defect.
  **Computed, and surfaced only inside the coverage figure** → **A8**
- `coverage = proposed / expected`, `accept rate = accepted / proposed`
  (`acceptRateAt` is exported and **never called** — the detail renders the
  split as a bar instead)
- `driver` / `ruleShare` / `rule` — `WT`. The reasoning behind carrying them:
  accuracy cannot be read without knowing whether a table or a model produced
  the value, and it points the fix (`rule` shortfall = config change).
- `note` — `WT`/`FIG`, the reference-run values in prose.

Every touchpoint weighs the same as every other, whatever it moves → **A3**.
None carries a duration or a cost → **A4**.

### Document extraction

| id | Touchpoint | Step | Driver | ruleShare | expected | proposed | accepted | modified | added | blank | absent | coverage | accept rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tp-docs-1` | Workbook verdict | Start Quotation | rule | 100% | 1284 | 1284 | 1266 | 18 | 0 | 0 | 0 | 100% | 99% |
| `tp-docs-2` | Field read | Start Quotation | mixed | 78% | 1284 | 1258 | 1192 | 66 | 19 | 26 | 7 | 98% | 95% |
| `tp-docs-3` | Company match | Business Details | mixed | 44% | 1284 | 1251 | 1207 | 44 | 26 | 33 | 7 | 97% | 96% |
| `tp-docs-4` | Policy period | Business Details | mixed | 35% | 1284 | 1198 | 1084 | 114 | 61 | 86 | 25 | 93% | 90% |
| `tp-docs-5` | Sector classification | Business Details | model | 0% | 1284 | 1102 | 948 | 154 | 104 | 182 | 78 | 86% | 86% |
| `tp-docs-6` | Intermediary and source | Business Details | mixed | 52% | 1284 | 1171 | 1093 | 78 | 71 | 113 | 42 | 91% | 93% |

### Census normalisation

| id | Touchpoint | Step | Driver | ruleShare | expected | proposed | accepted | modified | added | blank | absent | coverage | accept rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tp-cen-1` | Row acceptance | Member Details | rule | 96% | 962 | 962 | 948 | 14 | 0 | 0 | 0 | 100% | 99% |
| `tp-cen-2` | Date of birth resolution | Member Details | mixed | 41% | 962 | 907 | 841 | 66 | 41 | 55 | 14 | 94% | 93% |
| `tp-cen-3` | Relationship classification | Member Details | mixed | 63% | 962 | 953 | 899 | 54 | 6 | 9 | 3 | 99% | 94% |
| `tp-cen-4` | Sum insured banding | Member Details | rule | 100% | 962 | 950 | 918 | 32 | 8 | 12 | 4 | 99% | 97% |
| `tp-cen-5` | Member group build | Member Details | mixed | 71% | 962 | 944 | 902 | 42 | 11 | 18 | 7 | 98% | 96% |
| `tp-cen-6` | Dependent age flagging | Member Details | rule | 100% | 962 | 879 | 796 | 83 | 54 | 83 | 29 | 91% | 91% |

### Cover mapping

| id | Touchpoint | Step | Driver | ruleShare | expected | proposed | accepted | modified | added | blank | absent | coverage | accept rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tp-cov-1` | Base cover carry-over | Cover Details | rule | 92% | 618 | 614 | 541 | 73 | 2 | 4 | 2 | 99% | 88% |
| `tp-cov-2` | Family structure | Cover Details | rule | 85% | 618 | 607 | 549 | 58 | 7 | 11 | 4 | 98% | 90% |
| `tp-cov-3` | Add-on selection | Cover Details | model | 12% | 618 | 561 | 448 | 113 | 34 | 57 | 23 | 91% | 80% |
| `tp-cov-4` | Cover limit derivation | Cover Details | mixed | 58% | 618 | 588 | 502 | 86 | 18 | 30 | 12 | 95% | 85% |
| `tp-cov-5` | Unpriced add-on | Cover Details | rule | 100% | 618 | 479 | 341 | 138 | 96 | 139 | 43 | 78% | 71% |

### Claims interpretation

| id | Touchpoint | Step | Driver | ruleShare | expected | proposed | accepted | modified | added | blank | absent | coverage | accept rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tp-clm-1` | Claims load and band | Claims and TPA | rule | 88% | 544 | 544 | 509 | 35 | 0 | 0 | 0 | 100% | 94% |
| `tp-clm-2` | Incurred ratio | Claims and TPA | rule | 100% | 544 | 538 | 498 | 40 | 4 | 6 | 2 | 99% | 93% |
| `tp-clm-3` | Burn concentration | Claims and TPA | rule | 94% | 544 | 521 | 424 | 97 | 14 | 23 | 9 | 96% | 81% |
| `tp-clm-4` | Maternity split | Claims and TPA | mixed | 46% | 544 | 490 | 359 | 131 | 31 | 54 | 23 | 90% | 73% |
| `tp-clm-5` | Servicing continuity | Claims and TPA | model | 18% | 544 | 452 | 331 | 121 | 68 | 92 | 24 | 83% | 73% |

### Pricing

| id | Touchpoint | Step | Driver | ruleShare | expected | proposed | accepted | modified | added | blank | absent | coverage | accept rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tp-prc-1` | Pre-calculation check | Summary | rule | 100% | 311 | 311 | 278 | 33 | 0 | 0 | 0 | 100% | 89% |
| `tp-prc-2` | Age-band loading | Process Sheet | rule | 100% | 311 | 311 | 271 | 40 | 0 | 0 | 0 | 100% | 87% |
| `tp-prc-3` | Claims loading | Process Sheet | mixed | 64% | 311 | 306 | 241 | 65 | 3 | 5 | 2 | 98% | 79% |
| `tp-prc-4` | Group premium split | Process Sheet | rule | 100% | 311 | 299 | 224 | 75 | 7 | 12 | 5 | 96% | 75% |
| `tp-prc-5` | Movement against expiring | Process Sheet | mixed | 82% | 311 | 288 | 198 | 90 | 14 | 23 | 9 | 93% | 69% |
| `tp-prc-6` | Unpriceable component | Process Sheet | rule | 100% | 311 | 249 | 161 | 88 | 44 | 62 | 18 | 80% | 65% |

### The values that carry the findings

| Touchpoint | Figure | Why it is that number |
|---|---|---|
| Unpriceable component (Pricing) | 249 of 311 proposed, 44 added → **62 runs** | the weakest on the screen, and 100% rule-driven: a check that never fired, so a config defect |
| Unpriced add-on (Cover mapping) | 479 of 618, 96 added → **139 runs** | same shape one class earlier; on the reference run the check *did* run, which is why maternity was delegated instead of priced |
| Sector classification (Document extraction) | 1,102 of 1,284, 104 added, `ruleShare: 0` | the weakest model-driven read. No rule stands behind it, which is why the RFQ-vs-schedule disagreement had no safe default |
| Dependent age flagging (Census) | 879 of 962, 54 added | the 83 blanks all sit downstream of an unresolved date of birth — a dependency, not an independent failure |
| Servicing continuity (Claims) | 452 of 544, 68 added, `ruleShare: 18` | the mode carries forward by rule; whether experience is comparable across a change of it is judgement |
| Workbook verdict / Pre-calculation check / Claims load and band / Age-band loading | `proposed == expected` | always reached: they are the entry conditions of their steps |

---

## 7. Traces

15 traces, three per class, the first of each replaying the reference run.
Stored values per trace: `ref`, `subject`, `at`, `outcome`, `handoff`,
`confidence`, `decidedAt`, `summary`, and the spans.

| Tally | Value |
|---|---|
| Outcomes | accepted 4, modified 4, handed 4, added 3 |
| Handoff kinds | delegation 3, escalation 1 (`question` is typed but never used in a trace) |
| Span statuses | ok 60, warn 10, missed 8, failed 5, handoff 4, suppressed 4 |
| Span time, all traces | 96,960 ms |
| Span time, the five reference-run traces | 45,050 ms |

**45 seconds of machine work across the five classes of one quotation** is the
whole of the time evidence on this screen, and it is not surfaced anywhere —
span durations render as bars inside an expansion, never summed, never set
against a person doing the same run → **A4**. This is the cheapest of the audit
gaps to close: the data is already here.

`confidence` per trace is the only place a stated confidence is visible at
decision level; the class-level mean is stored and unused (§5).

Outcome dates span 17-21 Sep 2026. No trace carries a **time-to-answer** for its
handoff, and `tr-prc-3` is a run whose escalation was never answered at all →
**A5**.

### Document extraction

**`tr-docs-1`** · ref MAGM-400201-26-7000002-1 · 21 Sep 2026, 09:14 · outcome **accepted** · confidence 0.98 · decided at *Field read*

| Span | depth | ms | status |
|---|---|---|---|
| Read pack | 0 | 4120 | ok |
| Workbook verdict | 1 | 210 | ok |
| Field read | 1 | 9700 | ok |
| Company match | 1 | 340 | ok |
| Intermediary and source | 1 | 300 | ok |
| Reconcile the pack against itself | 1 | 480 | warn |

Span total: 15150 ms across 6 spans (0 never ran or held)

**`tr-docs-2`** · ref MAGM-400201-26-7000002-1 / sector · 21 Sep 2026, 09:15 · outcome **handed** (escalation to you) · confidence 0.61 · decided at *Sector classification*

| Span | depth | ms | status |
|---|---|---|---|
| Classify sector | 0 | 1240 | ok |
| Read RFQ | 1 | 380 | ok |
| Read expiring schedule | 1 | 360 | ok |
| Rank the sources | 1 | 420 | warn |
| Settle sector | 1 | 0 | handoff |
| Write to Business Details | 1 | 0 | suppressed |

Span total: 2400 ms across 6 spans (2 never ran or held)

**`tr-docs-3`** · ref QTN-40077 · 17 Sep 2026, 11:41 · outcome **added** · confidence 0 · decided at *Company match*

| Span | depth | ms | status |
|---|---|---|---|
| Read pack | 0 | 2870 | ok |
| Workbook verdict | 1 | 180 | ok |
| Field read | 1 | 1940 | ok |
| Company match | 1 | 0 | missed |
| Sector classification | 1 | 0 | missed |
| Write to Business Details | 1 | 0 | suppressed |

Span total: 4990 ms across 6 spans (3 never ran or held)


### Census normalisation

**`tr-cen-1`** · ref MAGM-400201-26-7000002-1 · 21 Sep 2026, 09:21 · outcome **accepted** · confidence 0.97 · decided at *Member group build*

| Span | depth | ms | status |
|---|---|---|---|
| Normalise census | 0 | 3980 | ok |
| Row acceptance | 1 | 620 | ok |
| Date of birth resolution | 1 | 1240 | ok |
| Relationship classification | 1 | 780 | ok |
| Sum insured banding | 1 | 540 | ok |
| Member group build | 1 | 600 | ok |
| Dependent age flagging | 1 | 800 | ok |

Span total: 8560 ms across 7 spans (0 never ran or held)

**`tr-cen-2`** · ref MAGM-400201-26-7000002-1 / 23 lives · 21 Sep 2026, 09:23 · outcome **handed** (delegation to Marsh India) · confidence 0.74 · decided at *Date of birth resolution*

| Span | depth | ms | status |
|---|---|---|---|
| Resolve dates | 0 | 1860 | ok |
| Search the census | 1 | 640 | ok |
| Search the rest of the pack | 1 | 720 | ok |
| Derive from band | 1 | 500 | warn |
| Resolve date of birth | 1 | 0 | handoff |
| Send the request | 1 | 0 | suppressed |

Span total: 3720 ms across 6 spans (2 never ran or held)

**`tr-cen-3`** · ref QTN-40104 · 20 Sep 2026, 14:35 · outcome **modified** · confidence 0.89 · decided at *Relationship classification*

| Span | depth | ms | status |
|---|---|---|---|
| Normalise census | 0 | 3110 | ok |
| Row acceptance | 1 | 480 | ok |
| Date of birth resolution | 1 | 1020 | ok |
| Relationship classification | 1 | 910 | failed |
| Sum insured banding | 1 | 460 | ok |
| Dependent age flagging | 1 | 520 | warn |

Span total: 6500 ms across 6 spans (0 never ran or held)


### Cover mapping

**`tr-cov-1`** · ref MAGM-400201-26-7000002-1 · 21 Sep 2026, 09:33 · outcome **accepted** · confidence 0.93 · decided at *Base cover carry-over*

| Span | depth | ms | status |
|---|---|---|---|
| Map covers | 0 | 2980 | ok |
| Base cover carry-over | 1 | 880 | ok |
| Family structure | 1 | 420 | ok |
| Add-on selection | 1 | 610 | ok |
| Cover limit derivation | 1 | 530 | ok |
| Apply to Cover Details | 1 | 0 | suppressed |

Span total: 5420 ms across 6 spans (1 never ran or held)

**`tr-cov-2`** · ref MAGM-400201-26-7000002-1 / maternity · 21 Sep 2026, 09:35 · outcome **handed** (delegation to S. Raghavan) · confidence 0.58 · decided at *Unpriced add-on*

| Span | depth | ms | status |
|---|---|---|---|
| Evaluate maternity | 0 | 2240 | ok |
| Read the RFQ | 1 | 420 | ok |
| Read the expiring annexure | 1 | 400 | ok |
| Look up the rating table | 1 | 520 | warn |
| Price maternity | 1 | 0 | handoff |

Span total: 3580 ms across 5 spans (1 never ran or held)

**`tr-cov-3`** · ref QTN-40110 · 20 Sep 2026, 12:19 · outcome **modified** · confidence 0.86 · decided at *Add-on selection*

| Span | depth | ms | status |
|---|---|---|---|
| Map covers | 0 | 3320 | ok |
| Base cover carry-over | 1 | 0 | missed |
| Family structure | 1 | 400 | ok |
| Add-on selection | 1 | 740 | failed |
| Cover limit derivation | 1 | 480 | ok |
| Unpriced add-on | 1 | 0 | missed |

Span total: 4940 ms across 6 spans (2 never ran or held)


### Claims interpretation

**`tr-clm-1`** · ref MAGM-400201-26-7000002-1 · 21 Sep 2026, 09:44 · outcome **accepted** · confidence 0.95 · decided at *Burn concentration*

| Span | depth | ms | status |
|---|---|---|---|
| Read claims pack | 0 | 3410 | ok |
| Claims load and band | 1 | 1180 | ok |
| Incurred ratio | 1 | 380 | ok |
| Burn concentration | 1 | 920 | ok |
| Maternity split | 1 | 660 | ok |
| Servicing continuity | 1 | 440 | warn |

Span total: 6990 ms across 6 spans (0 never ran or held)

**`tr-clm-2`** · ref QTN-40113 · 20 Sep 2026, 17:26 · outcome **modified** · confidence 0.88 · decided at *Servicing continuity*

| Span | depth | ms | status |
|---|---|---|---|
| Read claims pack | 0 | 3760 | ok |
| Claims load and band | 1 | 1090 | ok |
| Incurred ratio | 1 | 360 | ok |
| Burn concentration | 1 | 880 | warn |
| Maternity split | 1 | 600 | ok |
| Servicing continuity | 1 | 470 | failed |

Span total: 7160 ms across 6 spans (0 never ran or held)

**`tr-clm-3`** · ref QTN-40088 · 18 Sep 2026, 13:55 · outcome **added** · confidence 0.57 · decided at *Burn concentration*

| Span | depth | ms | status |
|---|---|---|---|
| Read claims pack | 0 | 1980 | ok |
| Claims load and band | 1 | 520 | warn |
| Incurred ratio | 1 | 340 | ok |
| Burn concentration | 1 | 0 | missed |
| Maternity split | 1 | 0 | missed |
| Servicing continuity | 1 | 400 | ok |

Span total: 3240 ms across 6 spans (2 never ran or held)


### Pricing

**`tr-prc-1`** · ref MAGM-400201-26-7000002-1 · 21 Sep 2026, 09:58 · outcome **handed** (delegation to you) · confidence 0.99 · decided at *Movement against expiring*

| Span | depth | ms | status |
|---|---|---|---|
| Calculate premium | 0 | 4630 | ok |
| Pre-calculation check | 1 | 620 | warn |
| Age-band loading | 1 | 980 | ok |
| Claims loading | 1 | 1140 | ok |
| Group premium split | 1 | 1040 | ok |
| Movement against expiring | 1 | 520 | ok |
| Submit quotation | 1 | 0 | handoff |

Span total: 8930 ms across 7 spans (1 never ran or held)

**`tr-prc-2`** · ref QTN-40109 · 20 Sep 2026, 11:03 · outcome **modified** · confidence 0.83 · decided at *Claims loading*

| Span | depth | ms | status |
|---|---|---|---|
| Calculate premium | 0 | 4180 | ok |
| Pre-calculation check | 1 | 580 | ok |
| Age-band loading | 1 | 860 | ok |
| Claims loading | 1 | 1020 | failed |
| Group premium split | 1 | 910 | ok |
| Movement against expiring | 1 | 480 | warn |

Span total: 8030 ms across 6 spans (0 never ran or held)

**`tr-prc-3`** · ref QTN-40099 · 19 Sep 2026, 09:12 · outcome **added** · confidence 0.61 · decided at *Age-band loading*

| Span | depth | ms | status |
|---|---|---|---|
| Calculate premium | 0 | 3890 | ok |
| Pre-calculation check | 1 | 600 | failed |
| Age-band loading | 1 | 900 | missed |
| Claims loading | 1 | 1080 | ok |
| Group premium split | 1 | 880 | ok |
| Unpriceable component | 1 | 0 | missed |

Span total: 7350 ms across 6 spans (1 never ran or held)

---

## 8. Reverse index — audit gap to the values that expose it

| Gap | The values already here that it lands on | What is missing |
|---|---|---|
| **A1** accepted ≠ correct | every `accepted`, every `CALIBRATION.actual`, KPI 2, every class accuracy | a post-Apply correction record, or a sampled audit lane with its own n |
| **A2** no error bar on the human | `SERIES.benchmark` (52 values), every `class.benchmark`, the `x of y` cell in the class row | n, provenance, and a spread per benchmark reading — `SERIES.ci` is the model to copy |
| **A3** every decision weighs 1 | all 344 `modified`, all 131 `added`, all 28 touchpoints | exposure per decision, and caught-at-checkpoint against reached-the-quotation. `tr-cen-3` (96 rows corrected before pricing ran) is the worked example already in the fixture |
| **A4** no time or cost | 90 span `ms` values; 45,050 ms on the reference run | a human baseline per run, reviewer touches, inference cost. Nothing new needs inventing for the machine half |
| **A5** handoff ageing | 613 handed off; 4 handoff traces; `tr-prc-3`'s unanswered escalation; the drafted-not-sent span in `tr-cen-2` | answered-at, and an unanswered count. The three kinds should age on different clocks |
| **A6** nothing is versioned | 52 series points, 60 monthly class readings | a model / prompt / rule-config identity per reading, and change markers on both series |
| **A7** one cut only | `ruleShare` per touchpoint is the only non-class dimension; "strong on renewal, weak on fresh business" sits in a `note` where nothing can filter on it | cohorts: scanned against native, group size, fresh against renewal, broker, sector |
| **A8** smaller | `absentAt` (computed, folded into coverage); `stops` (panel only); one reading per touchpoint against twelve per class | surface `absent`, raise `stops`, give the touchpoint a history |

---

## 9. Values that exist in the data and never reach the screen

Checked against all six components of the screen plus the V2 shell.

| Value | Note |
|---|---|
| `FLOW_STEPS` | the spine is implied by the per-touchpoint `step` labels instead |
| `REFERENCE_RUN.client`, `.summary` | only the quotation number renders |
| `CALIBRATION_ERROR` | the signed bias is shown; the absolute is not |
| `blankAt`, `acceptRateAt`, `settledOf` | exported helpers, no call site |
| `TOTALS.expected`, `.proposed`, `.userAdded` | touchpoint-grain sums, see §4 |
| `class.agent` | the owning agent from the walkthrough |
| `class.confidence`, `class.calibration` | per-class confidence never rendered; only the population buckets are |
| `Outcome` = `question` | typed as a handoff kind, no trace uses it |

None of these is a bug. The list is here so that anything built on V2 knows what
it can reach for without adding a fixture — and because three of them
(`absentAt` at the edge of rendering, `CALIBRATION_ERROR`, `class.confidence`)
are exactly the kind of computed-but-hidden value the audit is about.
