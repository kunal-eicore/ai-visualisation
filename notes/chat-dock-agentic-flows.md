# Chat dock — agentic flows, extraction effort, mid-flow uploads

Research notes, 19 Sep 2026. Scope: the AI-assisted and Hybrid rungs of the
group health quotation chat dock (`src/routes/quotation/group-health/ChatDock.tsx`).
Nothing here is built yet — this is the viability assessment behind the four
questions raised, kept so the reasoning survives the conversation.

---

## 1. Where an agentic flow fits

**It fits as a task object inside the thread, not as a mode.** Near-universal in
what ships: Google Gemini posts a persistent research card into the thread,
Microsoft Copilot posts a working card with a Cancel, Lindy posts a checklist
that grows as the agent discovers work.

**The unit of agentic work is one STEP, not one run.** "Fill Business Details
from these three workbooks" is a bounded scope, a bounded blast radius, one
Apply. Autonomous is then not a different mechanism — it is the same run card
fired seven times without being asked. This keeps the existing argument intact
(the mode does not change the spine) and satisfies north-star 04: authority
scoped to a decision class rather than to a session.

Implementation note: `RunLog` already exists but lives on the Autonomous start
screen as a post-hoc report. Moving it into the thread as a live card makes it
the agentic primitive at all three authorities — one component, three triggers
(on request / default / pre-fired).

## 2. File extraction and perceived effort

The labor illusion is real (Buell & Norton 2011): users can prefer a longer wait
with visible work to an instant identical result. Two caveats decide the design:

- **Fake effort collapses at length and on interpretation.** An agent has no
  denominator — it discovers its remaining work — so timer-based bars and
  cycling status text are small lies that get caught past a few minutes. Worse,
  showing reasoning inflates trust *even when the reasoning is hollow*, to the
  point users stop checking. That is the worst failure mode for an underwriter.
- **Split the treatment the way the capability model already splits.**
  `templateImport` is a script reading known cells — it should be fast and read
  as fast. `extraction` is an interpretation — that is where visible labour is
  honest and earns trust. Making both look equally effortful destroys the signal.

Viable for extraction:

- **Count real things, not percent.** "Sheet 2 of 4 · 1,367 rows · 38 fields
  found". Files x sheets x fields is genuinely knowable, so this is the rare
  case where the indicator can be both honest and specific.
- **Named checks cycling under the row being read** — `IMPORT_CHECKS` already
  does this; it is the Relevance AI / Customer.io pattern. Keep it.
- **Per-file verdicts resolving one at a time** — already built, and correct
  because one file can fail while the rest carry on.
- **The Extraction Overview table is the real labour illusion.** Per-file
  seconds and fields-read, inspectable *after* the wait. Evidence rather than
  theatre, so it survives a second look.

Avoid the consumer register (HubSpot "Baking fresh ideas", Magnific "On a
mission to find the best images") — it reads as evasive to someone signing off
a premium.

## 3. Mid-flow upload — neither "override" nor "resolve each conflict"

Eight products that stage machine-made changes over human work were checked —
Semrush, Replit, v0, Mistral, ElevenLabs, Mintlify, Figma, Cofounder.
**None does per-field conflict resolution, and none silently overwrites.** All
do the same third thing: stage the whole change as one reviewable diff, with a
batch accept and per-row inspection. Semrush is the cleanest — full side-by-side,
then "Keep original version" / "Continue with new version".

**The upload never writes — it produces a changeset.** That is the existing
Apply primitive scaled from one field to N. Partition it by consequence, not by
field:

| Partition | Treatment | Default |
|---|---|---|
| Empty -> filled | Collapsed, counted | Accepted |
| Filled -> different | Expanded, yours vs theirs, with source | **Keep yours** |
| Unreadable / rejected | Named, with a reason | — |

Defaulting conflicts to *keep yours* dissolves the pro/con tradeoff: the user's
work is never lost by default, and they need touch nothing to proceed. One
button — "Apply 34 changes" — plus a per-row override. Because it lands as a
single changeset it is **one undo**, which kills the "user could lose their
work" objection outright.

Two refinements that do most of the work:

- **Diff against provenance, not just value.** A field the user *typed* outranks
  a field a *document* filled. A conflict against a manual value is loud; a
  conflict against an earlier auto-filled value is quiet — take the newer
  document and re-badge it. The `Provenance` type
  (`manual | imported | extracted | agent`) already carries this. It removes
  most conflict volume, including the "uploaded a template with changed values"
  false signal.
- **Scope the read to open fields when the intent is "fill the gaps".** Answers
  the compute objection, and the result should say so — "read for 12 open
  fields" — rather than silently re-deriving the whole form.

**Do not build a "Resolve all conflicts" button.** It is where model self-bias
enters and it hides which way each field went. A bulk action must be explicitly
directional ("Take theirs for all 6") and undoable.

Uploading a file as a *correction* needs no new UI: same changeset, with the
current form as its base.

## 4. Prompting, then leaving the screen

**Leaving is free once the run is a task object.** The run lives server-side,
the card is its view, navigating away does not cancel it, returning re-attaches,
completion is a toast plus a badge on the dock launcher. The load-bearing reason
this is safe here is that **a run completes into a proposal, never into applied
data** — so an absent user cannot return to a changed form. Do not relax that
constraint; it is what makes background autonomy safe by construction.

Bug-in-waiting: `ChatDock` today clears the thread on `mode.id` change. If a run
can outlive the user's presence it must outlive a mode switch too, or be
cancelled explicitly with a stated reason. Silently dropping an in-flight run on
a chip click costs trust once and never regains it.

**Chat history: yes, scoped to the quotation, not the user.** The thread is part
of how the decision is reconstructable (north-star 06/14) — every Apply in it is
an audit entry, and the mode should be recorded per turn so it is later visible
that a value was proposed under Hybrid. A global cross-quotation history would
be actively wrong: it invites an answer grounded in another client's census.

## Open questions

1. **Is the dock per-quotation or global?** Everything above assumes
   per-quotation. A global assistant that can see every open quote is a
   different product with different evidence rules.
2. **Does an Apply need to name a person?** If this goes near regulatory audit,
   the changeset should carry who pressed it, not just that it was pressed —
   which turns Apply from a button into a signed action.

## Sources

- Buell & Norton, *The Labor Illusion: How Operational Transparency Increases
  Perceived Value*, Management Science 57(9), 2011 —
  https://www.hbs.edu/ris/Publication%20Files/Norton_Michael_The%20labor%20illusion%20How%20operational_f4269b70-3732-4fc4-8113-72d0c47533e0.pdf
- *Why You Can't Put a Progress Bar on an Agent*, 2026 —
  https://tianpan.co/blog/2026/07/02/why-you-cant-put-a-progress-bar-on-an-agent
- Mobbin, agent run / background task cards: Relevance AI
  https://mobbin.com/screens/d0dc629f-1593-4454-bc1c-2f759c5777ff · Lindy
  https://mobbin.com/screens/9f4affd5-f387-4149-860e-95c83f9bbba5 · Google Gemini
  https://mobbin.com/screens/d90bc856-6175-43cd-965e-d27cf51ed088 · Microsoft
  Copilot https://mobbin.com/screens/c2cad8e4-77eb-4cd8-ae5e-26748339323c ·
  Customer.io https://mobbin.com/screens/507233fa-1da3-404e-b6eb-014bc1cc0aa7 ·
  HubSpot https://mobbin.com/screens/31e81c29-fe8e-4b63-887d-cebaf478f701 ·
  Magnific https://mobbin.com/screens/084264dc-8d2d-4a7a-b3a1-084ddc5b06de
- Mobbin, staged-change review: Semrush
  https://mobbin.com/screens/ed82aafc-c4dc-442d-87fc-359f7347f940 · ElevenLabs
  https://mobbin.com/screens/ff16450b-9de9-4c60-8738-770be8df0a5c · Replit
  https://mobbin.com/screens/0dae0a10-7c42-4e0e-8716-6f5fb0f1b54e · v0
  https://mobbin.com/screens/3dd95168-b620-4c77-a80f-1d3e26dd8140 · Mistral AI
  https://mobbin.com/screens/782f5257-54b5-44df-aac7-4ffd42aa1d3c · Mintlify
  https://mobbin.com/screens/75a194a1-ad5f-44e0-b8eb-6f78bd5598ee · Figma
  https://mobbin.com/screens/ebb90bf9-735a-4f5f-968a-8152ff58dde8 · Cofounder
  https://mobbin.com/screens/c50251b3-860c-4f81-be1d-2795eae0182b
