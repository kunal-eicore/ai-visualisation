import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, BarChart3, Bot, ChevronDown, ChevronRight, FileSearch, Undo2, UserRound, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Throbber } from '@/components/ui/Throbber'
import { Composer } from '@/components/workspace/Composer'
import { cn } from '@/lib/cn'
import { PILL_SCRIPTS, SOURCES, type Action, type FunctionName, type SourceId } from './data'

/**
 * The copilot panel, ported from the "AI — UW Agent" tab of
 * `../../ai-research/UW_flow_AI_with_sim.html`.
 *
 * The prototype's *information design* is kept exactly — a turn is beats, the
 * calls are shown with their arguments, the answer ends in actions — but the
 * chrome is DESIGN.md's, not its own. The prototype runs on a private scale
 * of 9.5 / 10.5 / 11.5 / 12.5px text and 12px radii; everything here resolves
 * through the §2.3 type scale and the §2.5 radii instead, the tab strip is
 * the §4.7 underline tab, the composer is a §4.2 Input beside a §4.1 Button,
 * and the quick actions are §4.6 Chips. Where those disagree with the
 * prototype, the design system wins (§0.4, §0.5).
 */

export type CallRecord = {
  id: string
  name: FunctionName
  args: Record<string, string | number>
  result?: string
  state: 'running' | 'done'
  /** What this call read. Shown once the call returns. */
  sources: SourceId[]
}

export type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | {
      id: string
      role: 'ai'
      text: string
      thoughts?: string[]
      calls?: CallRecord[]
      acts?: Action[]
      /** Every distinct source the turn read, collected onto the answer. */
      sources?: SourceId[]
      /** Wall-clock the turn took, for the disclosure label. */
      seconds?: number
    }

/** What the agent has revealed so far in the turn that is still running. */
export type Thinking = {
  steps: string[]
  calls: CallRecord[]
  /** Drives the throbber: wave while reasoning, spin while a call is out,
   *  and `ending` once the turn is done — the block stays mounted until the
   *  library reports it has settled back to the ring. */
  phase: 'thinking' | 'toolCall' | 'ending'
}

type ChatPanelProps = {
  messages: ChatMessage[]
  thinking: Thinking | null
  loading: boolean
  onSend: (text: string) => void
  onPill: (index: number) => void
  /** Id of the answer whose rate change is currently on the table, if any. */
  appliedFor: string | null
  /** Put the table back to its current rates. */
  onRevert: () => void
  onShowBreakup: () => void
  onGoRates: () => void
  /** Open a source in the work area beside the chat. `null` opens the
   *  index of every source on the case rather than one document. */
  onOpenSource: (id: SourceId | null, used: SourceId[]) => void
  /** Fires when the throbber has settled back to its resting ring. */
  onSettled: () => void
}

export function ChatPanel({
  messages, thinking, loading, onSend, onPill, appliedFor, onRevert, onShowBreakup,
  onGoRates, onOpenSource, onSettled,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const busy = thinking !== null || loading

  // The prototype pins the transcript to the bottom on every render.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, thinking, loading])

  return (
    /* A full-height rail, not a card: it runs from under the top bar to the
       bottom of the viewport with a single border on its left edge.

       The chrome is the group-health ChatDock's — a 48px header, a flat
       transcript in an avatar gutter, and a footer welded to the bottom. The
       panel's own content (the tabs, the working, the calls, the actions) is
       untouched; only the way it is dressed changed. */
    <div className="flex h-full min-h-0 flex-col bg-surface-card">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-default px-4">
        <Bot aria-hidden className="h-4 w-4 shrink-0 text-brand" />
        <h2 className="shrink-0 text-base font-semibold text-default">Pricing panel</h2>
      </header>

      {/* §4.7 — an underline tab strip. Only the copilot tab is built on this
          screen, so the other two are inert rather than faked. */}
      <div className="flex shrink-0 border-b border-default" role="tablist" aria-label="Pricing panel">
        <PanelTab>Premium Build-Up</PanelTab>
        <PanelTab>Simulator</PanelTab>
        <PanelTab active>AI — UW Agent</PanelTab>
      </div>

      {/* The transcript, flat. Bubbles put the agent and the underwriter in
          two different containers and then stack cards inside the agent's
          one; an avatar gutter says the same thing with no box at all, and
          leaves the full width for the calls and their sources. */}
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <Turn key={m.id} role="user">
              {/* The underwriter's own words get a border on the card
                  ground, not a fill — it separates the ask from the answer
                  without wearing a tint of its own. The top-left corner stays
                  square, so the box reads as hung off the avatar beside it. */}
              <p className="rounded-lg rounded-tl-none border border-default bg-surface-card px-3 py-2 text-base text-default">
                {m.text}
              </p>
            </Turn>
          ) : (
            <Turn key={m.id} role="ai">
              <p className="text-base text-subtle">
                <Emphasised text={m.text} />
              </p>
              {/* Provenance sits on the answer, not inside the working.
                  Every tool that does this well — ChatGPT's "23 Sources",
                  Mistral's source count, Perplexity's Sources rail, Dash's
                  file list — keeps it one click from the claim and never
                  buries it a disclosure deep. */}
              {m.sources && m.sources.length > 0 && (
                <SourceSummary ids={m.sources} onOpenSource={onOpenSource} />
              )}
              {/* The working, on the other hand, is opt-in. */}
              <TurnDetail
                thoughts={m.thoughts ?? []}
                calls={m.calls ?? []}
                seconds={m.seconds ?? 0}
                onOpenSource={onOpenSource}
              />
              {/* The action row stays tied to the answer that proposed it. */}
              {i > 0 && (
                <ActionRow
                  acts={m.acts ?? []}
                  applied={appliedFor === m.id ? (m.acts ?? []).find((a) => a.type !== 'breakup') ?? null : null}
                  onRevert={onRevert}
                  onShowBreakup={onShowBreakup}
                  onGoRates={onGoRates}
                />
              )}
            </Turn>
          ),
        )}

        {thinking && (
          <ThinkingBlock thinking={thinking} onSettled={onSettled} onOpenSource={onOpenSource} />
        )}

        {loading && (
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">
              <Throbber phase="thinking" size={22} label="Thinking" />
            </span>
            <span className="text-sm text-muted">Reading the case</span>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-default p-3">
        {/* Suggestions are a way in, not a permanent strip of furniture: they
            stand down while the agent is working, where they would otherwise
            advertise four actions that cannot be taken. They are Buttons, not
            §4.6 Chips — a chip says "this filter is on", and these fire a
            request. */}
        {!busy && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {PILL_SCRIPTS.map((p, i) => (
              <Button key={p.prompt} variant="neutral" size="sm" onClick={() => onPill(i)}>
                {p.prompt}
              </Button>
            ))}
          </div>
        )}

        <Composer busy={busy} onSend={onSend} placeholder="Ask anything..." label="Ask the UW agent" />
      </div>

    </div>
  )
}

/* ── Turns ───────────────────────────────────────────────────────────── */

/**
 * One turn: a 24px avatar in the gutter and everything the turn carries in a
 * single column beside it. The agent's circle is brand, the underwriter's is
 * sunken — that difference is the whole speaker distinction, and it costs no
 * container.
 */
function Turn({ role, children }: { role: 'user' | 'ai'; children: ReactNode }) {
  const user = role === 'user'
  const Icon = user ? UserRound : Bot
  return (
    <div className="flex gap-2.5">
      <span
        aria-hidden
        className={cn(
          'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
          user ? 'border-default bg-surface-sunken text-muted' : 'border-brand bg-brand-bg text-brand-fg',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
    </div>
  )
}

/* ── Panel chrome ────────────────────────────────────────────────────── */

/** §4.7 — underline tab. Active takes `text/default` over a `primary` rule;
 *  the two inert tabs read as disabled rather than merely quiet. */
function PanelTab({ children, active }: { children: string; active?: boolean }) {
  return (
    <span
      role="tab"
      aria-selected={!!active}
      aria-disabled={!active}
      className={cn(
        'flex-1 border-b-2 px-2 py-3 text-center text-sm font-semibold',
        active ? '-mb-px border-b-primary text-default' : 'border-b-transparent text-disabled',
      )}
    >
      {children}
    </span>
  )
}

/* ── The agent working ───────────────────────────────────────────────── */

/**
 * The agent working, outside a bubble on purpose: this is not the agent
 * talking, and the prototype is careful to keep those distinct.
 *
 * The label follows the throbber rather than the other way round. While a
 * call is out it reads "Calling", and the ring spins; while the agent is
 * reasoning it reads "Thinking", and the ring waves.
 */
function ThinkingBlock({
  thinking, onSettled, onOpenSource,
}: {
  thinking: Thinking
  onSettled: () => void
  onOpenSource: (id: SourceId | null, used: SourceId[]) => void
}) {
  const calling = thinking.phase === 'toolCall'
  const ending = thinking.phase === 'ending'
  const label = ending ? 'Wrapping up' : calling ? 'Calling' : 'Thinking'
  return (
    /* The throbber stands where an avatar would, so the working lines up
       with the answers on either side of it. */
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        {/* Boxed to 24px — the avatar's footprint — so the label and the
            reasoning below it start on the same vertical as every answer. */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center">
          <Throbber
            phase={thinking.phase}
            size={22}
            // The docs pair the mark with your own live status text; the SVG
            // carries role="progressbar", this carries the words.
            onPhase={(p) => p === 'idle' && onSettled()}
          />
        </span>
        {/* Plain text, not a swept gradient: the scales here are split
            (textColor / backgroundColor / borderColor), so `from-disabled`
            resolved to no gradient at all and the transparent fill left the
            label invisible — which is what made the throbber read as
            floating loose in the gutter. */}
        <span role="status" className="text-sm font-semibold text-muted">
          {label}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 pl-[34px]">
        {thinking.steps.map((s, i) => (
          <Step key={i} className="animate-fade-up">{s}</Step>
        ))}
        {thinking.calls.length > 0 && (
          <div className="mt-0.5 flex flex-col gap-1">
            {thinking.calls.map((c) => (
              <CallRow key={c.id} call={c} onOpenSource={onOpenSource} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** One line of reasoning, with a 6px brand dot in the gutter (§3.4). */
function Step({ children, className }: { children: string; className?: string }) {
  return (
    <p className={cn('relative pl-4 text-xs leading-normal text-subtle', className)}>
      <span aria-hidden className="absolute left-0.5 top-[6px] h-1.5 w-1.5 rounded-full bg-brand-400" />
      {children}
    </p>
  )
}

/**
 * One function call: a single quiet line that opens.
 *
 * The record itself — name, arguments, result, what it read — is the part the
 * prototype never showed, and an underwriter approving a repriced book needs
 * it. But every tool that shows tool calls well (Perplexity, Descript,
 * Dropbox Dash, Customer.io) shows them as one collapsed line each and lets
 * you open the one you doubt, rather than stacking full code blocks. A call
 * that is still out stays open, because that one you are meant to watch.
 */
function CallRow({
  call, onOpenSource,
}: {
  call: CallRecord
  onOpenSource: (id: SourceId | null, used: SourceId[]) => void
}) {
  const running = call.state === 'running'
  const [open, setOpen] = useState(false)
  const shown = running || open
  const args = Object.entries(call.args)

  return (
    <div
      className={cn(
        'animate-fade-up rounded-md',
        running && 'animate-row-pulse border border-brand-300 px-2 py-1.5',
      )}
    >
      <button
        type="button"
        aria-expanded={shown}
        disabled={running}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-sm text-left font-mono text-xs text-brand',
          'transition-colors duration-base focus-visible:outline-none focus-visible:shadow-focus',
          !running && 'hover:text-default',
        )}
      >
        <Wrench aria-hidden className="h-3 w-3 shrink-0 text-disabled" strokeWidth={1.5} />
        <span className="truncate">{call.name}</span>
        {!running && (
          <ChevronRight
            aria-hidden
            className={cn('h-3 w-3 shrink-0 text-disabled transition-transform duration-base', open && 'rotate-90')}
            strokeWidth={1.5}
          />
        )}
      </button>

      {shown && (
        <div className={cn('flex flex-col gap-1', running ? 'mt-1' : 'mt-1 pl-[18px]')}>
          {args.length > 0 && (
            <code className="block font-mono text-xs leading-normal text-muted">
              (
              {args.map(([k, v], i) => (
                <Fragment key={k}>
                  {i > 0 && ', '}
                  <span className="text-subtle">{k}</span>
                  {': '}
                  <span className="text-default">{typeof v === 'string' ? `"${v}"` : v}</span>
                </Fragment>
              ))}
              )
            </code>
          )}
          {call.result && (
            <p className="font-mono text-xs leading-normal text-muted">{call.result}</p>
          )}
          {!running && call.sources.length > 0 && (
            <SourceRow ids={call.sources} onOpenSource={onOpenSource} />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * The count of what the answer stands on, always visible, one click from the
 * full index. The chips beside it are the shortcut to a specific document;
 * the count is the way in when you do not yet know which one you want.
 */
function SourceSummary({
  ids, onOpenSource,
}: {
  ids: SourceId[]
  onOpenSource: (id: SourceId | null, used: SourceId[]) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onOpenSource(null, ids)}
        className={cn(
          'inline-flex h-5 shrink-0 items-center gap-1 rounded-md border border-brand bg-brand-bg px-2 py-px font-mono text-xs text-brand-fg',
          'transition-colors duration-base hover:border-focus hover:bg-brand-50',
          'focus-visible:outline-none focus-visible:shadow-focus',
        )}
      >
        <FileSearch aria-hidden className="h-3 w-3" strokeWidth={1.5} />
        {ids.length} source{ids.length === 1 ? '' : 's'}
      </button>
      {ids.map((id) => (
        <SourceChip key={id} id={id} used={ids} onOpenSource={onOpenSource} />
      ))}
    </div>
  )
}

/** The documents, rulebook sections and tables one call read. */
function SourceRow({
  ids, onOpenSource,
}: {
  ids: SourceId[]
  onOpenSource: (id: SourceId | null, used: SourceId[]) => void
}) {
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
      <FileSearch aria-hidden className="h-3 w-3 text-disabled" strokeWidth={1.5} />
      {ids.map((id) => (
        <SourceChip key={id} id={id} used={ids} onOpenSource={onOpenSource} />
      ))}
    </div>
  )
}

function SourceChip({
  id, used, onOpenSource,
}: {
  id: SourceId
  used: SourceId[]
  onOpenSource: (id: SourceId | null, used: SourceId[]) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenSource(id, used)}
      title={SOURCES[id].name}
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-md border border-neutral bg-neutral-bg px-2 py-px font-mono text-xs text-neutral-fg',
        'transition-colors duration-base hover:border-focus hover:text-brand',
        'focus-visible:outline-none focus-visible:shadow-focus',
      )}
    >
      {SOURCES[id].short}
    </button>
  )
}

/**
 * The whole working of a turn behind one line.
 *
 * A settled answer is three things: the answer, what it wants you to do, and
 * the working. Only the first two are load-bearing on every read, so the
 * working — the reasoning, the calls, the documents each call read — is
 * collapsed by default and opens as flat hairline-separated rows rather than
 * a stack of cards inside a card. It is there when an underwriter wants to
 * audit the number and out of the way when they do not.
 */
function TurnDetail({
  thoughts, calls, seconds, onOpenSource,
}: {
  thoughts: string[]
  calls: CallRecord[]
  seconds: number
  onOpenSource: (id: SourceId | null, used: SourceId[]) => void
}) {
  const [open, setOpen] = useState(false)
  if (thoughts.length === 0 && calls.length === 0) return null

  const summary = [
    seconds > 0 && `Thought for ${seconds} second${seconds === 1 ? '' : 's'}`,
    calls.length > 0 && `${calls.length} call${calls.length === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' · ')

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-sm text-xs font-medium text-muted transition-colors duration-base hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Throbber phase="idle" size={14} />
        <span>{summary}</span>
        <ChevronDown aria-hidden className={cn('h-3 w-3 transition-transform duration-base', open && 'rotate-180')} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2 border-t border-subtle pt-2">
          {thoughts.map((t, i) => (
            <Step key={i}>{t}</Step>
          ))}
          {calls.map((c) => (
            <CallRow key={c.id} call={c} onOpenSource={onOpenSource} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Actions ─────────────────────────────────────────────────────────── */

/**
 * What is still open to you once the answer has landed.
 *
 * Not "Apply 8% Loading" — you asked for the 8% loading, and the turn priced
 * it onto the table while you watched the skeleton resolve. Offering it again
 * as a Primary button asks you to authorise something already done, and a
 * button that does nothing you can perceive is worse than no button. The only
 * move the answer actually leaves open is taking it back, so that is the only
 * thing here, and it is deliberately quiet: reverting is a correction, not
 * the expected next step.
 *
 * The rest are navigation — they change nothing, so nothing here is Primary.
 */
function ActionRow({
  acts, applied, onRevert, onShowBreakup, onGoRates,
}: {
  acts: Action[]
  /** The rate change from this answer is the one currently on the table. */
  applied: Action | null
  onRevert: () => void
  onShowBreakup: () => void
  onGoRates: () => void
}) {
  const revertLabel = applied && 'val' in applied
    ? `Revert ${applied.val}% ${applied.type === 'loading' ? 'loading' : applied.type === 'discount' ? 'discount' : 'reduction'}`
    : 'Revert'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {applied && (
        <Button
          size="sm"
          variant="text"
          onClick={onRevert}
          icon={<Undo2 aria-hidden className="h-4 w-4" />}
        >
          {revertLabel}
        </Button>
      )}
      {acts.some((a) => a.type === 'breakup') && (
        <Button
          size="sm"
          variant="secondary"
          onClick={onShowBreakup}
          icon={<BarChart3 aria-hidden className="h-4 w-4" />}
        >
          View Full Breakup
        </Button>
      )}
      <Button
        size="sm"
        variant="neutral"
        onClick={onGoRates}
        icon={<ArrowUpRight aria-hidden className="h-4 w-4" />}
      >
        Rate Table
      </Button>
      <Button
        size="sm"
        variant="neutral"
        onClick={onShowBreakup}
        icon={<ArrowUpRight aria-hidden className="h-4 w-4" />}
      >
        Breakup
      </Button>
    </div>
  )
}

/** The one piece of markup an answer carries: `<em>` on the figures. */
function Emphasised({ text }: { text: string }) {
  const parts = text.split(/(<em>.*?<\/em>)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('<em>') ? (
          <strong key={i} className="font-semibold">{p.slice(4, -5)}</strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  )
}
