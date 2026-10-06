import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bot, SquarePen, UserRound, X, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Throbber } from '@/components/ui/Throbber'
import { Composer, type Attachment } from '@/components/workspace/Composer'
import type { ConnectorItem } from '@/components/workspace/ConnectorsMenu'
import type { Tone } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

/**
 * The chat experience, configured section by section from the parent.
 *
 * The panel owns everything that is the same wherever a chat is docked: the
 * transcript, the one short "thinking" beat before a reply, keeping the feed
 * scrolled to the newest turn, the bubbles, the Apply / Applied / Undo strip,
 * the suggestion buttons and the composer. The parent owns what the chat is
 * ABOUT, through four configs:
 *
 * - `header` — what the panel is called and how it closes.
 * - `conversation` — how a message is answered (`respond`), what happens
 *   after (`onReply`), what renders under an agent turn (`renderExtras`),
 *   and the state of its Apply strip (`apply`).
 * - `suggestions` — the prompts offered as buttons.
 * - `composer` — the box's placeholder, label, and whether it takes files,
 *   connectors and dictation.
 *
 * Two layouts. `dock` is a panel beside the work, with a header. `centre` is
 * the page itself: before the first message the box floats mid-screen with
 * `conversation.empty` under it, and after it the transcript fills a centred
 * column with the box pinned below.
 *
 * Group health, the underwriting queue and the intent screen all run on
 * this, so the chats cannot drift.
 */

/** The least an agent turn must carry. `apply` is the label of the offer. */
export type AgentTurnBase = { text: string; apply?: string }

export type ChatEntry<T extends AgentTurnBase> =
  | { role: 'user'; text: string; file?: string }
  | { role: 'agent'; turn: T }

export type ChatHeaderConfig = {
  title: string
  icon?: LucideIcon
  badge?: { label: string; tone: Tone }
  onClose: () => void
}

export type ChatApplyConfig<T> = {
  /** `index` is the turn's position in the transcript, for per-turn tokens. */
  state: (turn: T, index: number) => { applied: boolean; undoable: boolean }
  onApply: (turn: T, index: number) => void
  onUndo: (turn: T, index: number) => void
}

export type ChatConversationConfig<T extends AgentTurnBase> = {
  respond: (text: string, files: Attachment[]) => T
  onReply?: (turn: T, index: number) => void
  renderExtras?: (turn: T, index: number) => ReactNode
  apply?: ChatApplyConfig<T>
  /** Rendered above the transcript, e.g. a run log. */
  before?: ReactNode
  pendingLabel: string
  /** A change clears the transcript, e.g. switching mode. */
  resetKey?: unknown
  /** Held busy from outside too, e.g. while the canvas is being written to. */
  busy?: boolean
  delayMs?: number
  /** `centre` only: shown under the box until the first message. `fill`
   *  puts text in the box. */
  empty?: (fill: (text: string) => void) => ReactNode
}

/** `centre` only: a control that clears the conversation, shown once it
 *  has started. With `confirm`, it asks first. */
export type ChatNewChatConfig = {
  label: string
  confirm?: { title: string; body: string; action: string }
}

export type ChatSuggestionsConfig = { items: string[] }

export type ChatComposerConfig = {
  placeholder: string
  label: string
  attach?: boolean
  connectors?: ConnectorItem[]
  voice?: boolean
}

export function ChatPanel<T extends AgentTurnBase>({
  ariaLabel,
  layout = 'dock',
  centreWidth = 720,
  width,
  header,
  conversation,
  suggestions,
  composer,
  newChat,
}: {
  ariaLabel: string
  layout?: 'dock' | 'centre'
  /** `centre` only: the column the box, the empty state and the
   *  conversation share. */
  centreWidth?: number
  /** `dock` only. */
  width?: number
  /** `dock` only. */
  header?: ChatHeaderConfig
  conversation: ChatConversationConfig<T>
  suggestions?: ChatSuggestionsConfig
  composer: ChatComposerConfig
  newChat?: ChatNewChatConfig
}) {
  const [entries, setEntries] = useState<ChatEntry<T>[]>([])
  const [pending, setPending] = useState(false)
  const [fill, setFill] = useState<{ text: string; n: number }>()
  const [confirming, setConfirming] = useState(false)
  const feed = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const { respond, onReply, delayMs = 1100 } = conversation

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  const clear = () => {
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    setEntries([])
    setPending(false)
  }

  // Switching what the chat is about starts a new conversation rather than
  // carrying answers given under another setting.
  useEffect(clear, [conversation.resetKey])

  const startNew = () => {
    setConfirming(false)
    clear()
  }

  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight })
  }, [entries, pending])

  const busy = pending || !!conversation.busy

  /* The wait is a fake, but not padding: the throbber switching to its
     thinking wave is how the panel says it is working on something rather
     than having ignored the key press. One short beat, the same for an answer
     and a proposal. */
  const send = (text: string, files: Attachment[] = []) => {
    if (pending) return
    const doc = files[0]?.name
    if (!text && !doc) return
    // The reply lands one after the user turn; its index is fixed here so a
    // side effect keyed on it agrees with what renders.
    const index = entries.length + 1
    setEntries((e) => [...e, { role: 'user', text: text || `Read ${doc}`, ...(doc ? { file: doc } : {}) }])
    setPending(true)
    timers.current.push(
      window.setTimeout(() => {
        const turn = respond(text, files)
        setPending(false)
        setEntries((e) => [...e, { role: 'agent', turn }])
        onReply?.(turn, index)
      }, delayMs),
    )
  }

  const feedItems = (
    <>
      {conversation.before}

      {entries.map((entry, i) => (
        <Bubble key={i} user={entry.role === 'user'} text={entry.role === 'user' ? entry.text : entry.turn.text}>
          {entry.role === 'agent' && (
            <>
              {conversation.renderExtras?.(entry.turn, i)}
              {entry.turn.apply && conversation.apply && (
                <ApplyStrip
                  label={entry.turn.apply}
                  {...conversation.apply.state(entry.turn, i)}
                  onApply={() => conversation.apply!.onApply(entry.turn, i)}
                  onUndo={() => conversation.apply!.onUndo(entry.turn, i)}
                />
              )}
            </>
          )}
        </Bubble>
      ))}

      {pending && (
        <div className="flex items-center gap-2">
          <Throbber phase="thinking" size={22} label="Working" />
          <span className="text-sm text-muted">{conversation.pendingLabel}</span>
        </div>
      )}
    </>
  )

  const composerBox = (
    <Composer
      busy={busy}
      onSend={send}
      attach={composer.attach ?? false}
      connectors={composer.connectors}
      voice={composer.voice}
      fill={fill}
      glow={layout === 'centre'}
      placeholder={composer.placeholder}
      label={composer.label}
    />
  )

  if (layout === 'centre') {
    const started = entries.length > 0 || pending
    // The px-6 gutters sit inside the column on the padded rows, so those
    // rows take the gutters on top of the width.
    const column = { maxWidth: centreWidth + 48 }
    const columnInner = { maxWidth: centreWidth }
    /* One tree for both states, so the composer is never remounted: a
       connector switched on before the first message is still on after it.
       Before, two equal flex halves put the box on the vertical middle with
       the empty-state content starting under it. */
    return (
      <section aria-label={ariaLabel} className={cn('relative flex h-full flex-col', !started && 'overflow-y-auto')}>
        {started && newChat && (
          <div className="mx-auto flex w-full shrink-0 justify-end px-6 pt-4" style={column}>
            <Button
              variant="neutral"
              size="sm"
              icon={<SquarePen aria-hidden className="h-3.5 w-3.5" />}
              onClick={() => (newChat.confirm ? setConfirming(true) : startNew())}
            >
              {newChat.label}
            </Button>
          </div>
        )}
        {started ? (
          <div ref={feed} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full flex-col gap-4 px-6 py-8" style={column}>{feedItems}</div>
          </div>
        ) : (
          <div className="min-h-[40px] flex-1" />
        )}
        <div className={cn('shrink-0 px-6', started && 'pb-6')}>
          <div className="mx-auto w-full rounded-lg shadow-classic" style={columnInner}>{composerBox}</div>
        </div>
        {!started && conversation.empty && (
          <div className="flex-1 px-6 pb-10 pt-8">
            <div className="mx-auto w-full" style={columnInner}>
              {conversation.empty((text) => setFill((f) => ({ text, n: (f?.n ?? 0) + 1 })))}
            </div>
          </div>
        )}
        {confirming && newChat?.confirm && (
          <Dialog
            title={newChat.confirm.title}
            onClose={() => setConfirming(false)}
            width="max-w-[420px]"
            footer={
              <>
                <Button variant="neutral" size="sm" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={startNew}>
                  {newChat.confirm.action}
                </Button>
              </>
            }
          >
            <p className="text-base text-subtle">{newChat.confirm.body}</p>
          </Dialog>
        )}
      </section>
    )
  }

  const HeaderIcon = header?.icon ?? Bot

  return (
    <aside
      aria-label={ariaLabel}
      style={{ width }}
      className="flex h-full shrink-0 flex-col border-l border-default bg-surface-card"
    >
      {header && (
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-default px-4">
          <HeaderIcon aria-hidden className="h-4 w-4 shrink-0 text-brand" />
          <h2 className="shrink-0 text-base font-semibold text-default">{header.title}</h2>
          {header.badge && (
            <Badge className="ml-1" tone={header.badge.tone}>
              {header.badge.label}
            </Badge>
          )}
          <button
            type="button"
            onClick={header.onClose}
            aria-label={`Close ${header.title.toLowerCase()}`}
            className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </header>
      )}

      <div ref={feed} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {feedItems}
      </div>

      <div className="shrink-0 border-t border-default p-3">
        {/* The way in. They persist rather than disappearing after the first
            turn, and go DISABLED while a turn or a write is in flight rather
            than unmounting, because a row of buttons that vanishes under the
            pointer reads as a click that missed. Buttons rather than §4.6
            Chips: a chip says "this filter is on", these fire a request. */}
        {suggestions && suggestions.items.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {suggestions.items.map((s) => (
              <Button key={s} variant="neutral" size="sm" disabled={busy} onClick={() => send(s)}>
                {s}
              </Button>
            ))}
          </div>
        )}

        {composerBox}
      </div>
    </aside>
  )
}

function Bubble({ user, text, children }: { user: boolean; text: string; children?: ReactNode }) {
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
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className={cn('text-base', user ? 'text-default' : 'text-subtle')}>{text}</p>
        {children}
      </div>
    </div>
  )
}

/**
 * One row, two jobs: the offer of a change, or the receipt for one. A receipt
 * carries the way back — an action that took one click is not finished being
 * safe until it can be undone in one.
 */
function ApplyStrip({
  label,
  applied,
  undoable,
  onApply,
  onUndo,
}: {
  label: string
  applied: boolean
  undoable: boolean
  onApply: () => void
  onUndo: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
      <span className="min-w-0 flex-1 text-sm text-brand">{label}</span>
      {applied ? (
        <>
          <Badge tone="success">Applied</Badge>
          {undoable && (
            <Button size="sm" variant="text" onClick={onUndo}>
              Undo
            </Button>
          )}
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={onApply}>
          Apply
        </Button>
      )}
    </div>
  )
}
