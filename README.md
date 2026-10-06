# ai-visualisation

An **isolated sandbox for AI visualisation ideas**. Each exploration is a
self-contained route; nothing here feeds another project, and nothing here
depends on one.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # lint:glyphs + tsc -b + vite build
```

## What's in it

| Route | What it explores |
|---|---|
| `/overview` | Index of the explorations in this project |
| `/evaluation/benchmark-gap` | Whether the distance between the system and the human benchmark is closing, by decision class, down to the touchpoints and traces behind it (three versions: V1, `/v2`, `/v3`) |
| `/evaluation/shadow-parity` | Drift between an underwriter's decision and a shadow agent's on the same frozen input |
| `/evaluation/workbench` | A dedicated surface for building an agentic workflow against a recorded event stream and testing it |
| `/harness/setup` | Pointing a tenant's own model accounts at our MCP, intelligence and semantic layers — bring your own key |
| `/autonomous` | Fully Autonomous (intent-based workflows with little to no human intervention). Step one: the onebuzz underwriting queue, rebuilt for readability |
| `/copilot/uw-agent` | A chat window paired with the pricing surface it operates on, and the function calls between them |
| `/quotation/group-health` | The Onebuzz group health quotation run, rebuilt as a seven-step walkthrough, runnable at four autonomy modes |

`notes/` holds research written up ahead of a build — viability assessments
kept so the reasoning survives the conversation that produced it.

## The autonomy ladder

Every decision-class journey in this sandbox is run at one of **four autonomy
modes**, switched from the top bar and switchable mid-run:

| Mode | The machine may | You keep |
|---|---|---|
| **Manual** | Import a filled copy of a published workbook template — a script reading fixed sheets and fixed headers. Nothing is interpreted and nothing is inferred. | The whole run, and every value the template did not carry. |
| **AI-assisted** | All of the above, plus read documents nobody agreed the shape of — the client's own census layout, an RFQ, a claims dump — fill what it can evidence, and answer questions about that data. | Confirming every extracted value; the chat opens only when you open it. |
| **Hybrid** | All of the above, plus driving the form — uploading, editing, pulling prior-year data, moving between steps. | The Apply. Nothing reaches the quotation without one, and you can take the form back at any step. |
| **Autonomous** | Sequence the whole run on its own protocols where confidence holds, and stop where it does not. | Submission. The agent prepares; a person reviews and signs. |

The modes are not four feature levels with more switches turned on. They are
four **authority** settings, which is the distinction
`../ai-research/north-star.png` turns on — *"machine authority belongs to a
defined decision class, with clear conditions and intervention paths"* (04),
and *"autonomy grows only as accountability does"* (13). Four consequences are
built into the model (`src/lib/autonomy.tsx`) rather than left to each screen:

- **Every rung keeps a human gate** — the whole run in Manual, confirming each
  extracted value in AI-assisted, the Apply in Hybrid, the signature in
  Autonomous: *"the human intervention path never disappears"* (09). It is
  enforced in the screens rather than stated in a banner, which is why there is
  no mode strip under the top bar and no explanatory Callouts in the steps.
- **Manual is a real rung, not a failure state.** It is the mode the run falls
  back to when the model is unavailable, so it is built and reachable at any
  moment rather than kept as a disaster-recovery path nobody has opened —
  which is the only way *"loss of AI reduces speed, not control"* (10) is true
  rather than aspirational. It is also why Manual keeps the **template
  import**: a script walking known cells in a workbook whose shape was agreed
  before it was filled is plumbing, not authority, and withholding it would
  make the bottom rung cost usability rather than speed. The line the ladder
  actually draws is between a file whose shape was agreed in advance and one
  whose shape has to be interpreted — the first is a `templateImport`, the
  second is `extraction`, and they are separate capabilities in the model.
- **The mode is switchable mid-run, and the run keeps what it has.** An
  autonomy level you have to choose before you start is a commitment, and
  people commit to the safe one and never move.
- **The mode is part of the record.** What a quotation was prepared under is a
  fact about the decision, stored with it alongside the evidence behind each
  field and anything the agent left open (06, 14) — not a UI preference.

What the mode explicitly does **not** change is the workflow. The spine is the
same at every setting; autonomy changes who fills it in and how much is left to
confirm. A mode that changed the steps would be a second product wearing a
shared name.

The switch renders only on routes that claim it (`useAutonomyScope`). A mode is
a property of a decision-class journey, and a control standing above screens
that have no journey would be claiming to govern something that is not there.

**Benchmark Gap** answers one question — is the distance between the system and
the person who does this work today actually shrinking, and where is the
remainder of it. The unit is the **decision class**, because a class is already
the unit authority is granted over (north star 04), which makes it the only unit
a closing gap can justify moving authority on (15).

It exists in three versions, switched from the header and carried in the URL so
one can be sent to somebody. **V1** (`/evaluation/benchmark-gap`) is a bento of
cards that states the distance as points against a human drawn as a point.
**V2** (`/v2`) replaces the container with a full-bleed sheet and the claim with
a range — the underwriters as the spread they are — and adds the journey band.
Its class detail opens in a side panel, behind three tabs, from anywhere on the
row.
**V3** (`/v3`) is V2's claim in V1's formats: four bands, and the decision
classes back as V1's **retention grid** — five rows of twelve coloured months on
one scale — with V2's range strip where V1 printed a gap in points. The column
picker, the row-order toggle and the band subtitles are gone, because each was a
control standing in for a decision about what the band is for. Nothing they hid
was deleted: it is in the class side panel, behind three tabs, one click from
either the journey band or the grid, which share a single open class. V3 also
draws the underwriter range **once**, in the Standing band at the width it takes
to be read; the grid rows, the panel header and the cohort table print the
reading instead (`RangeReading`), because a 120px strip on a 50-100 axis gives a
nine-point spread about twenty pixels.

Everything on it is taken from the group health quotation walkthrough
(`src/routes/quotation/group-health/data.ts`): `AGENTS` for the five classes and
their rungs, `RUN_TASKS` for what each one decided on the M/s Eicore tech LTD
renewal, and `IMPORT_CHECKS`, `EXTRACTION_FILES`, `RECONCILE_ROWS`,
`COVERS_FROM_EXPIRING`, `QUOTE_SOURCES` and `PREMIUM` for the values. Quotation
`MAGM-400201-26-7000002-1` is the run the first trace of every class replays.

**A class spans the flow, not a screen.** Proposal documents is not "the upload
step" — it owns the entity, the policy period, the sector and the intermediary
on Business Details too, because those are the same kind of decision made from
the same documents. Premium rating spans the Summary checkpoint and the Process
Sheet.
Every class carries the `steps` it reaches and every touchpoint names the step
it fires in; a class whose scope stops at a screen boundary is a screen.

**How a touchpoint is scored: by what the person did with the generated value.**
There is no separate answer key to maintain, because the product already records
the four states that matter — the value was *proposed and accepted*, *proposed
and modified*, *never proposed and added by the person*, or *never proposed and
nobody had it* (absent from the pack). Only the last is not a defect, and it is
kept as its own column so the other three cannot quietly absorb it. `added` is
the important one: it is the blind spot, the case where the information was
there to be had and a person had to supply it.

**Handoffs are not failures.** The walkthrough settles five of its ten tasks and
hands off five — `question`, `escalation`, `delegation` — and the handoffs are
the ladder working. So accuracy is scored on what the class *proposed*, and the
handoff rate sits beside it, never inside it. Fold them together either way and
you get a lie: count handoffs as failures and a careful class looks incompetent;
count them as successes and a class that asks for help on everything scores
100%.

The calibration card runs the other way from the usual finding: every confidence
bucket is accepted *more* often than it claimed, which is what a system that
hands off 613 decisions looks like from the inside. Under-confidence is not a
harmless error in the safe direction — it is the direct cause of the handoff
column. The chart carries the system's 90% interval as a second band, because a
narrowing gap and a narrowing interval are two different claims. 

**Layout: a bento, with cards at exactly one level.** The page is a KPI strip
of four `MetricCard`s, a `Card` for the gap chart beside a `Card` for
calibration, and a `Card bare` for the class grid — seven cards, none of them
inside another. The complaint that started this was "way too many cards within
cards", and the mistake made in answering it was reading that as *remove the
cards*: a fully flat document on the evaluation-tool idiom (Adaline,
Braintrust, LangSmith) read worse, not better. The nesting was the problem.

So the rule is the nesting depth, not the container:

- one card per region, never a card inside a card;
- inside a card, regions are divided by hairlines, ground and type alone;
- the class expansion draws no border — it sits on sunken ground.

The audit worth keeping is on depth: every `.shadow-card` on the rendered page
must have no `.shadow-card` ancestor.

**The class detail opens inside the row that was clicked.** `ClassDetail` is an
expansion row *in* `ClassMatrix`'s table. Two earlier attempts failed the only
test that matters for a selector — that the thing which changed is where the
click was: a side-by-side panel stacked below the fold at 1440px, and a panel
directly underneath still put the change off-screen with only a highlighted row
to signal it. An expansion row cannot have that problem (measured delta: 0), and
it retires the selected-row marker, since an open row is self-evidently open.
The expansion sits on sunken ground rather than in a bordered box, and it does
not repeat the class name — that is on the row directly above it. One class at a
time: the point of a grid is comparing classes, and a table with three panels
wedged into it is not a grid. Opening a row scrolls it into view with
`block: 'nearest'`, so a row already on screen does not move — skipped on mount,
or arriving at the screen would scroll past the chart.

The **Decision classes** button opens the same five in journey order rather than
ranked by gap — same data, and the order is the only difference.

**Shadow Parity** is built from the sketch in `../ai-research/IMG_0133.jpeg`,
with domain content from `../ai-research/gap-data-shadow-regulatory.md` §B.
Accuracy over runs (the shaded band between the two lines is the drift), a run
table whose rows expand in place into a per-field decision diff, and the
execution trace that produced the shadow decision. Fixtures only — read-only,
no service layer. Every headline number, the chart and the per-run scores carry
an **"i"** (`src/components/InfoTip.tsx`) saying how they are calculated and
what they do not cover — a figure nobody can define is not one to promote a
model on.

**Eval Workbench** is built from the sketch in `../ai-research/Agentic flows.jpg`,
with domain content from `../ai-research/gap-usage.md`. The sketch weighs two
methods against each other — a *training mode* layered onto the live screens
(no new screens, permanently in the caseworker's way) and a *workbench* (a mode
switch, but it touches nothing in the journey). This route is the second.

Every step is the same shape: **full-bleed side panels around a canvas**, laid
out by `Shell.tsx`. The route runs full height (`h-full overflow-hidden`, inner
panels scroll) under a single 48px step band — no page header, no page padding,
no card around the panels; regions are divided by 1px hairlines. Anything that
would otherwise float as its own card — a hint, the run bar, the agents
palette, the context box — docks into a region's header or footer.

The canvas is deliberately **monochrome**: block type is named, not tinted, and
colour is reserved for results (a failing block is ringed, a passing one is left
alone). Standing explanation lives in the **"i" in each region header** — the shared
`InfoTip`, a dark tooltip on hover or keyboard focus — rather than as prose
competing with the data.

Three steps, in the sketch's order:

- **Select workflow** — the library as a rail, the selected workflow on the
  canvas beside it. Only *UW referral triage* is modelled end to end; the other five are rows
  on purpose, and the step says so rather than rendering the referral graph
  under someone else's name.
- **Workflow builder** — the recorded event stream on the left, the canvas in
  the middle with the agents palette docked into its footer, the inspector on
  the right. **Events are tagged into contexts**:
  select a run of the stream, name it, and blocks read the name rather than the
  raw events — which is what stops two workflows quietly disagreeing about what
  a loss ratio is. **Hovering a block reveals its relations** (the sketch's
  "hover on a node to see relations"): the block, its neighbours and their edges
  hold contrast while the rest drops back, and the events it consumes take a
  marker in the rail. A block carrying inner steps sits on a visible layer stack
  — "a single block can have many more layers within it".
- **Test** — the same graph with **each block showing what it emitted**
  ("output visualization within boxes": typed fields, a bounded score, or the
  branch split). The rail is PASS / FAIL / SKIP, each check labelled `AI` or
  `Manual`, because a suite of only generated checks drifts towards what the
  model finds easy to verify and a hand-written one never covers the paths
  nobody thought of. The context box under the canvas takes a new assertion in
  prose; it is queued for the next run, not scored against this one.

The canvas is hand-built — absolutely positioned blocks over an SVG edge layer,
coordinates declared in `data.ts`. No graph library, no physics, nothing to
re-run: the layout is deterministic and the dependency list stays closed.

**Agent Harness** is the setup surface for the other half of the stack: the
tenant's models, our layers, and the gate in between. It follows the workbench's
layout exactly — the shell is now shared (`components/workspace/Shell.tsx`), so
the two routes are the same three-region workspace under a 48px step band rather
than two lookalikes.

The premise drives every screen in it: **the product ships no model access.**
There is no bundled inference, no rate card of ours, no key of ours behind a
proxy. Calls leave the tenant for their own provider directly and bill to their
own account. So the route opens on *their* accounts, not on a catalogue, and the
standing caveat sits in the step band where it is true on all three steps rather
than in a Callout on one.

- **Providers** — the accounts they have brought, across **four auth shapes**,
  because an API key is only the easiest one: a key (Anthropic), workload
  identity with no secret at all (Bedrock, an assumed IAM role), endpoint + key
  where models arrive as *deployment* names (Azure), and a private mTLS endpoint
  for models on the tenant's own GPUs. Vertex is listed and **unconfigured** on
  purpose — it renders an empty catalogue that says nothing is bundled, rather
  than being hidden until it works. Anthropic model ids, context windows and
  list prices are the real published ones; non-first-party rows say *partner
  rate* instead of inventing a number, and the on-prem rows have no per-token
  cost to show.
- **Layers** — the bindings, grouped by layer rather than sorted alphabetically,
  because the semantic layer is not one MCP server among four: it is the reason
  the model never writes SQL. Each binding shows the tools it exposes
  (`list_metrics` / `query_metric` and friends), who the call **runs as**
  (identity passthrough, not a service account — otherwise row-level security is
  decorative), and what the layer enforces on the way through. Switching one off
  leaves a **cut wire** on the canvas instead of removing it.
- **Routing** — a role is a job, not a model. Each role binds to a primary and a
  fallback, and two roles deliberately have **no fallback**: a shadow evaluator
  that silently switched model would be measuring two things and reporting one,
  and an on-prem dedupe role whose records may not leave the data centre has no
  degraded mode, only a breach. The preflight checks the things that fail
  quietly — a floating model id under a measurement, a stale retrieval index, an
  on-prem model's measured tool-call reliability — and each row says what it
  means when it does not pass, because a red row with no explanation gets
  clicked past.

**How a provider gets connected** (`ConnectProvider.tsx`) takes over the whole
step rather than the inspector slot, because it is three pieces of work that each
need room: choose the shape, supply the credential, read back what the account
turned out to serve. The thing the form had to resist being is **one API-key
field** — that is the easiest build and wrong for three of the five shapes. Two
store no secret at all (a role assumed per call, a federated identity), and one
names models the vendor has never heard of. So the rail is a choice of
*transaction*, not a choice of logo.

The handshake is four steps for the same reason the model probe is: each fails
differently and "could not connect" is not a diagnosis. The one that catches
most real mistakes is the third — *permission to invoke* — because an identity
that can read the account but not call a model looks connected right up until
the first case needs it. On success, discovery lists what the account serves,
the tenant ticks what to import, and **everything imported arrives switched
off**. Connecting Vertex in the prototype moves it out of "not connected" and
its models into the catalogue, which is the path worth clicking.

**How a model gets added** (`AddModel.tsx`) is the one flow in the route that had
to be designed around the premise rather than decorated with it. Under BYOK
nobody *creates* a model here — the tenant's account either serves an id or it
does not — so adding one is **a claim that gets verified, not a form that gets
saved**:

1. **Source.** *Discovered* lists ids the provider's own list endpoint returned
   that are not in the catalogue yet. *By hand* exists because discovery cannot
   enumerate an Azure **deployment** (an arbitrary name the tenant chose), a
   pinned version, or whatever a self-hosted server happens to be serving.
2. **Probe.** Four steps, not one spinner, because each fails differently and
   the fix differs: credential accepted → id resolves → capabilities reported →
   limits reported. The probe is deterministic in the fixtures — the same id
   against the same account always answers the same way; randomising it would
   teach the wrong lesson. The failure paths are real: an unconnected account has
   no credential to probe with, an unknown id says the credential works but the
   account serves nothing at that name, and a duplicate is refused because two
   rows for one id is how a role ends up bound to the copy nobody is watching.
3. **The probe fills in the rest.** Context window, output cap, capabilities and
   latency are *reported*, never typed — a context window someone typed by hand
   is a number that will be wrong later.
4. **What the probe cannot answer is listed, not hidden** — which roles may use
   it, which model an Azure deployment actually serves and who may repoint it,
   an on-prem model's measured tool-call reliability.
5. **It lands switched off.** Enabling it is a second, deliberate act, and
   binding it to a role is a third. Nothing starts carrying traffic because
   somebody finished a form.

It takes over the inspector slot rather than opening a modal — the same gesture
as defining a context in the workbench, which is why the §0.5 primitive set
still has no dialog in it.

**Where the model-per-job mapping is actually visible** is the Routing step's
**Assignments** view (`Assignments.tsx`), which is what that step now opens on.
The per-role route answers "what can this one reach"; it cannot answer the
question a harness gets asked first — *which model is doing what, and why that
one* — because that is a comparison and a comparison needs the rows side by side.

**The assignment itself happens in that table** — the cell is the control. Each
bound model is a dashed chip; clicking it opens `RoleBinding.tsx` in the
inspector slot, the same slot the preflight occupies, because binding a model
and proving the binding works are two depths of one job. The slot is also
reachable from the per-role Route footer, so the place the assignment is read is
the place it is changed.

The picker **filters, it does not merely sort**: every model the tenant holds is
listed, and the ones this role cannot use say why on the row — switched off in
the catalogue, does not report vision when the documents are scans, or a cloud
model for a role whose records may not leave the data centre (not a degraded
mode, a breach). Two roles refuse a fallback outright, and the reason sits where
the control would have been, since a greyed-out picker with no explanation reads
as an oversight.

Changing a binding **invalidates the last preflight**. The previous result is
labelled rather than silently left standing next to a binding it never tested,
and the row reads *out of date* until it is re-run. Switching a bound model off
back on the Providers step marks the row **broken** with the reason, rather than
letting the table keep claiming ready.

The table is grouped by **decision class**, not by department and not by model,
because the class is what justifies the binding: judgement that is
customer-affecting and hard to reverse earns the most capable model at high
effort (low volume keeps that affordable); mechanical high-volume work takes the
cheapest model that holds accuracy, with low confidence going to a human rather
than to a bigger model; a measurement must be pinned above all else; and a
proposal a steward checks is constrained by residency, not capability. Grouping
by model would show the same data and argue nothing. Each row carries the
primary, the fallback (or the reason there is deliberately none), the layers it
may reach, the human gate, and its preflight standing.

The canvas is the explainer's round trip drawn as wiring: runtime, harness, MCP
adapters, the services behind them, the lakehouse at the end. The shape is the
argument — the model never reaches past the adapter column. Same hand-built
construction as the workbench graph, and it is reused across both steps
(traced route in one, a role's allowance in the other) rather than redrawn.

**Fully Autonomous** (`src/routes/autonomous/`) is a block for intent-based
workflows with little to no human intervention. Nothing autonomous is built yet.
A top-bar Mode switch (Manual / Hybrid / Autonomous / Intent based, held in
`?mode=`) appears only on this route. Manual is the queue below; Intent based
is a centred chat box with eight capability cards under it (`intent/`); Hybrid
and Autonomous are blank until their content is defined.
Manual docks the queue assistant on the right (closed behind the edge tab). It
answers eight approved prompts from the fixture, links every case it names to
its row, and only filters, sorts or assigns on Apply, with Undo on the reply.
Cases assigned to you carry a small mark by the ID.

**Chat is one component.** `components/workspace/chat/ChatPanel` is the whole
chat experience (transcript, thinking beat, bubbles, Apply/Undo strip,
suggestions, composer), configured from the parent in four sections:
`header`, `conversation`, `suggestions`, `composer`. `ChatDockHost` is the
sliding column plus edge tab. Group health's `ChatDock` and the queue's
`QueueChat` are both just configs on it; add a new chat the same way, never by
copying one. `layout="centre"` makes it the page instead of a dock (the
intent screen): the box floats mid-screen over `conversation.empty` until the
first message (`centreWidth` sets the column; intent uses 1200), and a
`newChat` config adds a confirmed "New chat" once it has started. Focused, the
centred box takes the agentic `--ring-flash` glow. The composer optionally
takes `connectors` (a menu of on/off switches, all off at load, each with an
icon tile; switched-on ones stack beside the plug as 3 tiles + "+N") and
`voice` (browser dictation; the mic widens into a square-cornered primary
block of white bars that rise and fall with the voice). `Dialog` and `Switch`
now live in `components/ui`.

Step one is the **underwriting queue** (`queue/`), recreated from onebuzz's
`features/underwriting-queue/default.tsx` with the same content and a cleaner
layout:

- The four counts sit in one strip, without the hardcoded captions.
- Retail/Group is the card's tab strip.
- Status chips sit in one band; search, priority and plan share another.
- The columns and their names match the onebuzz reference view: Quotation ID,
  Client, Product / Plan, SI / Premium, Created At, TAT, Priority, Status and
  Action (Review plus a menu).
- Ownership chips and assignee badges are left out. onebuzz shows them only to
  the underwriter role.
- Status tones split by who the case is waiting on, instead of all being amber.
  Pending rows carry their workflow state (Paused, Failed).
- A missing premium reads "—", where onebuzz prints "₹0.00/yr".

The rows are fictional, and the TAT and priority come from the onebuzz mock
generator. Review, Take and Reassign are not wired. The table takes its natural
width (`w-max min-w-full`) and scrolls sideways rather than squeezing columns,
because a squeezed auto-layout table wraps its status badges first.

**UW Agent** is a port of the rate-table screen and the "AI — UW Agent" panel
from `../ai-research/UW_flow_AI_with_sim.html` — a group health renewal running
at a 113% loss ratio. The chat is reproduced to the prototype's geometry;
colour resolves through the DS ramp instead of its raw hex. Its live Anthropic
call is replaced by scripted flows (`routes/copilot/data.ts`), because what is
being explored is the chat driving the table, not the model.

The skeleton is the point of the screen:

- **A turn is a sequence of beats**, not a block of prose — the agent narrates,
  calls a function, narrates what came back. Each beat sets the indicator state
  it belongs to.
- **The throbber says which kind of wait you are in.** `src/lib/throbber.js` is
  the house component, vendored from the hub root and wrapped in
  `components/ui/Throbber`. It **waves** through reasoning and **spins** while a
  tool call is out (`startThinking()` / `toolCall()` / `endThinking()`), and the
  answer is held back until the library reports it has settled to `idle` — the
  documented "hide the bubble only once the ring has reformed" pattern.
- **Every call shows its arguments and its result.** The prototype never did;
  a copilot that moves premium has to, or the underwriter is approving a
  sentence rather than a calculation.
- **The cells being repriced hold a skeleton for exactly the window the
  pricing call is out**, the recomputing rows pulse, and the new values land on
  a reveal. Holding a stale number in place while a new one is being priced is
  the one genuinely misleading option.
- **Every call names its inputs, and you can open them.** Each call row and
  each answer carries chips for the documents, rulebook sections and tables it
  read; clicking one opens it beside the table (`routes/copilot/SourceViewer`)
  with the exact place inside it and the values pulled out. An underwriter
  signing a loading needs to confirm the right claims dump was accessed, not
  merely that the sentence sounded confident.
- **Nothing is applied from the chat.** An answer ends in action buttons; the
  rate change lands only when one is pressed.
- **A surface the chat sends you to takes a brand ring for a beat.** On a
  screen this dense the scroll alone is too quiet to notice.

**Group Health Quotation** (`src/routes/quotation/group-health/`) rebuilds the
Onebuzz group health quotation run as a walkthrough, and is the first journey to
carry the autonomy ladder above. The goal is the *shape* of the flow, not the
functionality behind it — there is no calculator, no extraction and no
persistence.

The spine is taken from the service, not invented:
`onebuzz/packages/service/workflow2/src/workflow/groupQuotation/health/configurableUiStepList.ts`
lists five configurable UI steps, and `./index.ts` injects two review
checkpoints around the premium calculator. That gives the seven steps in the
rail:

> Start Quotation → Business Details → Member Details → Cover Details →
> Claims & TPA → **Summary** (checkpoint) → **Process Sheet** (checkpoint)

Screen content comes from the captured run of "M/s Eicore tech LTD" in the
Figma file *Quotation Builder - Retail*, page "Group Quotation screens" (21
frames, named `Group Health - NN[.n] <Step> (<state>)`). Every number in
`data.ts` is lifted from that run rather than invented — a census that did not
add up would undermine the one thing this exploration is for.

What the walkthrough is actually making a point about:

- **The run opens on a branch, not a form.** Step 1 either extracts from the
  client's workbooks or skips to a blank Business Details. Extraction is a
  two-second fake; what is being shown is the shape of the wait and what the
  user is asked to confirm at the end of it.
- **Auto-filled is a claim the UI has to keep making.** Almost every card
  header carries the badge, because the user's job in steps 2–3 is to correct
  extracted values, not to type them.
- **Read mode and edit mode are per-card, not per-screen.** Correcting two
  cells in the age-band matrix should not turn every number on the page into an
  input.
- **Covers are configured per group, and the tabs carry their own status.**
  `Configured` / `Missing Add-on Covers` on each tab, a counter in the header,
  and a primary action that stops saying "next" once there is no next group.
- **Prior claims is reference material.** Eight analytics tables, all
  collapsible, only the first open — available without being unavoidable.
- **The two checkpoints look different from the five forms on purpose.**
  Summary is the last cheap place to fix an input, so each card's Edit jumps
  back to the step that owns the data rather than editing in place. Process
  Sheet is the first screen showing a number nobody typed, so the premium is a
  three-card strip — current, previous, change — because a +69.9% renewal is
  the finding and a lone total hides it.
- **The rail carries the quotation steps only.** The source screen lists the
  underwriter's seven review steps beneath them; they are not reproduced,
  because this walkthrough is the broker-facing run.

**Where the four modes land in this journey.** The seven steps are identical at
every setting — only step 1 is rewritten, because that is where the modes differ
in kind rather than in degree:

- **Manual** gets its own first screen, not the AI screen with the buttons taken
  out: no chat, no model, and two ways to start — download the census template
  and import a filled copy, or go straight to a blank form. The template comes
  *above* the drop zone, because an import that accepts exactly one shape of
  file is unusable until you have that shape; publishing the template is the
  feature and the upload is its back half.

  The screen makes the constraint with its result rather than with a paragraph.
  The import lists what it took **and what it would not**, by name and reason —
  a workbook missing the `Active Members` sheet, a PDF that is not a workbook at
  all — and the rows it skipped carry a row number, a column and a cause
  (`412 · Date of Birth · Empty`). That address is the whole argument for a
  deterministic read: the fix is in the workbook, not in a conversation about
  the workbook. A file that is not the template is rejected, never guessed at;
  guessing is what the AI rungs are for.
- **AI-assisted** is the upload-or-skip branch the captured run has. The chat is
  a launcher; it answers questions about the data you uploaded and offers field
  writes you have to press. Skipping extraction drops the fill badges, since
  the claim follows what actually happened rather than the mode.
- **Hybrid** opens with the chat already there, because a control surface you
  have to summon is not the primary one. Documents can arrive through the
  conversation, and an Apply in the chat both writes and navigates — the form
  and the conversation are the same run.
- **Autonomous** has already run by the time you arrive, so step 1 is a report
  with two halves of equal weight: what the agent settled (with reported
  confidence) and what it would not. The three delegations are real disagreements
  in the inputs — the RFQ and the expiring schedule name different industry
  codes, the broker asks for a maternity add-on the rating table does not price,
  and a +69.9% renewal is customer-affecting and hard to reverse. The rail marks
  which steps are waiting on a person, so finding them is not the reviewer's
  search problem, and every step is unlocked from the start because reviewing is
  not the same act as filling.

Two things are the same in all four, and the shell is where they are enforced:
the last action is a person's — Submit is never automatic, not even in
Autonomous, where the action bar says *prepared by the agent, submitted by you* —
and **nothing the assistant proposes is applied until the Apply is pressed**,
with every answer carrying the documents it was read out of. An agent that
writes on its own account, or answers with no source, cannot be reconstructed
afterwards (06, 15).

The fill badge is a four-state claim, not a boolean — four standards of
evidence, kept apart: nothing where you typed it, *From template* where a
script read it out of an agreed cell, *Auto-filled* where a model read it out
of a document nobody agreed the shape of, *Agent filled* where the agent
concluded it. Collapsing them into one green badge is how a judgement ends up
wearing the authority of a census.

This is also what makes a mid-run switch behave correctly. Dropping from
AI-assisted to Manual withdraws an *Auto-filled* claim, because that rung
cannot read loose documents — but a **template import survives the drop**, since
the script that read those cells is still available at this rung and the
evidence is still good. Regions that are receipts for a file — the census
record on Member Details, the Documents dialog — disappear entirely on a run
that started blank, rather than rendering empty: a receipt for a file nobody
uploaded is a lie the screen tells.

**Upload areas use one recipe, and it is Onebuzz's, not this project's.** A
light-indigo ground inside a darker dashed indigo border — the kit's
`FileDropZone` (`border-brand-300 bg-brand-50`), contact-management's
`DROPZONE_CLASS`, the BRD extraction zone's inviting state and the POC's
`UploadDropzone` all draw the same pair, and DESIGN.md already names it
semantically (`brand/bg` + `brand/border`), so `DropZone` in `parts.tsx` spells
it with the tokens. Both upload branches share that one component: what changes
between the rungs is what the target will *accept*, not what an upload looks
like.

Three local primitives live in `parts.tsx` — a section card whose header band
carries the Auto-filled badge, a dense read/edit table, and a modal. They are
the idiom of this flow rather than a system-wide addition, the same call
`components/workspace/Shell.tsx` and `field.ts` already make.

## Stack

React 18 + TypeScript + Vite + Tailwind, React Router. `lucide-react` is the
only runtime UI dependency beyond React/Router, and the only icon set.

Hand-built primitives, no component library: variants are plain `Record<Variant,
string>` maps joined by `cn()`. Dumb UI in `components/`, state in `routes/`.

```
src/
  components/layout/   AppShell · Sidebar · TopBar · ModeSwitch · Breadcrumb · Logo · navConfig
  components/ui/       Badge · Button · Card · Callout · Chip · MetricCard · Progress · Tabs · Toast
  components/workspace/ Shell (Workspace · Region · RailRow) · field — the multi-pane tool layout,
                       shared by the workbench and the harness
  routes/              Overview, evaluation/, harness/, copilot/, quotation/
  lib/autonomy.tsx     the four autonomy modes, and the scope hook that claims the top-bar switch
  styles/index.css     semantic tokens as CSS variables
tailwind.config.js     the token layer
scripts/lint-glyphs.mjs
```

## Design system

The shell (sidebar pin + hover-peek, topbar, breadcrumb) is ported from
`onebuzz-poc`, but **the token layer is built from `../DESIGN.md`, not from the
POC's `tailwind.config.js`** — the POC is looser, and DESIGN.md §9 documents its
own deviations. Class names match the DS vocabulary one-to-one (`text-default`,
`bg-surface-card`, `border-strong`), which is why the Tailwind scales are split
across `textColor` / `backgroundColor` / `borderColor`.

Things that bite when porting POC code into here:

- **Status colour is a `bg` + `border` + `fg` triple** (§0.6). The POC's bare
  `bg-success-100 text-success-700` badge is non-compliant.
- **Badge labels are Regular 400, 12px, Geist Mono** (§4.11) — not semibold sans.
- **Tabs are underline tabs** (§4.7), not the POC's segmented pill.
- **Filter bars use Chips** (§4.6), never Buttons.
- **Cards are radius 8** (§2.5). `rounded-2xl` is a defect.
- **Buttons are 32 / 40 / 48** with Medium 500 labels (§4.1). The POC's `h-9` is
  off-scale.
- **No emoji, no glyph icons** (§0.1, §0.2) — including in fixture data and
  comments. `npm run lint:glyphs` enforces it and runs as part of `build`.

### Dark mode is deliberately off

DESIGN.md §2.2/§7: the status tone triples, `brand/bg`, `brand/text`, `primary`,
`ring` and `border/focus` have **no Dark value**. A theme toggle today would
render a success badge as pale mint on a near-black card, and §7 calls patching
that with inline `dark:` hex "a defect". So the §8 checklist's other branch
applies — dark mode is *explicitly deferred*.

To enable it: add Dark values to those tokens in the Figma Color collection,
regenerate the `:root` / `.dark` variable block in `src/styles/index.css`, add
`darkMode: 'class'` to `tailwind.config.js`, then restore the `useTheme` hook and
the Sun/Moon toggle in `TopBar`. Not before.

## Adding an exploration

1. Build the route under `src/routes/<area>/`.
2. Register it in `src/App.tsx`.
3. Add it to `PRIMARY_NAV` in `src/components/layout/navConfig.ts` — the nav
   lists only routes that exist.
4. Add a card to `IDEAS` in `src/routes/Overview.tsx`.
5. Reuse `components/ui/` before adding anything. Most "new" status widgets are
   a Badge with different props (§4.11). Compose, don't create.
