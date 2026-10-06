# ai-visualisation

Isolated sandbox for **AI visualisation ideas**. Self-contained: it does not
import from, or get imported by, any sibling project in this hub.

## Before changing anything here

- **`README.md`** — what exists, how to run it, how to add an exploration.
- **`../DESIGN.md`** — the design spec this project follows. It is the source of
  truth for tokens and component geometry, **not** `onebuzz-poc/tailwind.config.js`
  (which is looser; DESIGN.md §9 lists its deviations). The README's "Things that
  bite" section is the short version.

## Rules

- **Tokens, not hex.** Every colour/radius/space/size resolves through a token.
  A raw hex in a component is a defect (§0.4).
- **Status surfaces are `bg` + `border` + `fg` triples** (§0.6). Never a bare
  tinted fill.
- **The primitive set is closed** (§0.5). Before adding a component, check
  whether it is a Badge, Chip, Card or Callout with different props.
- **No emoji, no glyph icons, lucide only** (§0.1–0.3). Applies to fixture data
  and comments too. `npm run lint:glyphs` runs inside `npm run build`.
- **No unrequested explanatory UI.** Do not add banners, callouts, helper
  paragraphs, tips, captions, disclaimers, "how this works" copy or mode/status
  strips that were not asked for. If a screen needs a paragraph to be understood,
  fix the screen. Copy earns its place only when it is data, a label on a control,
  or a consequence the user cannot otherwise see. Rationale belongs in the doc or
  a code comment, never on the canvas. (DESIGN.md hard rule 8)
- **Dark mode stays off** until the status triples gain Dark values in Figma —
  see the README. Do not add `dark:` classes.

## Verification

`npm run build` (lint + `tsc -b` + vite). Do **not** shell out to headless
Chrome for screenshots — it is unreliable in this environment. Let the user
check visuals via `npm run dev`.

Driving the running dev server over the **Chrome DevTools Protocol** does work,
and is the way to verify behaviour (clicks, state, timing) rather than
appearance. Node 24 has a global `WebSocket`, so it needs no dependencies:
launch Chrome with `--headless=new --remote-debugging-port=9222`, read
`http://127.0.0.1:9222/json/list` for the page target, connect, and use
`Runtime.evaluate`. Assert on the DOM — `[aria-busy]`, `.animate-skeleton`,
`section[style*=box-shadow]`, input values — not on pixels.
