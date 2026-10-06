import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { FileText, ImageIcon, Paperclip, SendHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ConnectorsMenu, type ConnectorItem } from './ConnectorsMenu'
import { VoiceButton } from './VoiceButton'
import { useDictation } from './useDictation'

/**
 * The chat composer.
 *
 * A single field beside a Send button is enough to type into and nothing
 * else: there is no room for an attachment, no sign of what is already
 * attached, and a long prompt scrolls inside one line. Every tool that does
 * this job well — ChatGPT, Claude, Perplexity, Gemini, Mistral, Langdock —
 * draws one bordered card instead and puts the attachments, the text and the
 * controls inside it, so the card *is* the message being composed. That is
 * what this is. Both chat surfaces in this sandbox run on it — the copilot
 * panel and the group-health dock — so the two composers cannot drift.
 *
 * Three usability points it is built to answer:
 *   · Visibility of system status — an attached file is shown as a removable
 *     row before it is sent, never only as a filename in a toast.
 *   · Recognition over recall — the growing box shows the whole prompt, so a
 *     long ask can be re-read before it goes.
 *   · User control — every attachment carries its own Remove, and Send is a
 *     labelled control, not the Enter key alone.
 */

export type Attachment = {
  id: string
  name: string
  /** Bytes. Formatted for display only. */
  size: number
  image: boolean
}

type ComposerProps = {
  /** The transcript is busy: the whole composer goes inert. */
  busy: boolean
  /**
   * The draft leaves with whatever is clipped to it.
   *
   * Attachments are part of the message, not a side channel: a panel that
   * took the text and quietly dropped the file would be the worst version
   * of this, because the user watched the file appear in the card.
   */
  onSend: (text: string, files: Attachment[]) => void
  placeholder: string
  /** Accessible name for the box — what *this* assistant is being asked. */
  label: string
  /** Some surfaces take no documents at all; there the paperclip is absent
   *  rather than present-and-dead. */
  attach?: boolean
  /** The systems a request may reach, each switched on or off here. All
   *  start off. Absent, there is no connectors button. */
  connectors?: ConnectorItem[]
  /** Browser dictation. The mic is absent where the browser has none. */
  voice?: boolean
  /** Text put into the box from outside, e.g. a starter card. A new `n`
   *  replaces the draft, even with the same text. */
  fill?: { text: string; n: number }
  /** Focused, the card takes the brand glow agentic actions use
   *  (`--ring-flash`) in place of the field focus ring. */
  glow?: boolean
}

/** The textarea grows to this, then scrolls — roughly six lines. */
const MAX_HEIGHT = 148

export function Composer({ busy, onSend, placeholder, label, attach = true, connectors, voice = false, fill, glow = false }: ComposerProps) {
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const [linked, setLinked] = useState<string[]>([])
  /* What was in the box when dictation began; heard words go after it. */
  const base = useRef('')
  const dictation = useDictation((heard) => setDraft(base.current ? `${base.current} ${heard}` : heard))
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const pickerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!fill) return
    setDraft(fill.text)
    boxRef.current?.focus()
  }, [fill])

  useEffect(() => {
    if (!dictation.listening) return
    const esc = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && dictation.stop()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [dictation])

  function toggleDictation() {
    if (dictation.listening) return dictation.stop()
    base.current = draft.trim()
    void dictation.start()
  }

  /* Grow with the content. Height is reset to `auto` first so the box
     shrinks again when text is deleted, not just when it is added. */
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    box.style.height = 'auto'
    box.style.height = `${Math.min(box.scrollHeight, MAX_HEIGHT)}px`
  }, [draft])

  /* A file on its own is a message. Dropping a document into a run in
     flight is a complete request \u2014 "here, look at this" \u2014 and making the
     user type a word next to it before Send lights up is a toll on the one
     interaction the attachment exists for. */
  const ready = (draft.trim().length > 0 || files.length > 0) && !busy

  function send() {
    if (!ready) return
    if (dictation.listening) dictation.stop()
    onSend(draft.trim(), files)
    setDraft('')
    setFiles([])
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    /* Enter sends, Shift+Enter breaks the line — the convention every chat
       surface shares, and the reason this is a textarea at all. */
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      size: f.size,
      image: f.type.startsWith('image/'),
    }))
    setFiles((prev) => [...prev, ...picked])
    /* Reset, so picking the same file twice in a row still fires `change`. */
    e.target.value = ''
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-strong bg-surface-card transition-shadow duration-base',
        glow
          ? 'focus-within:border-brand focus-within:[box-shadow:var(--ring-flash)]'
          : 'focus-within:border-focus focus-within:shadow-focus-field',
      )}
    >
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 border-b border-default p-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-default bg-surface-sunken py-1 pl-2 pr-1"
            >
              {f.image ? (
                <ImageIcon aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted" />
              ) : (
                <FileText aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted" />
              )}
              <span className="truncate text-sm text-default">{f.name}</span>
              <span className="shrink-0 font-mono text-xs text-muted">{formatSize(f.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Borderless inside the card: the card carries the border and the
          focus ring, so the text sits on one continuous ground with the
          attachments above it and the controls below. */}
      <textarea
        ref={boxRef}
        rows={1}
        value={draft}
        disabled={busy}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={label}
        className="block w-full resize-none bg-transparent px-2.5 pt-2 text-base text-default placeholder:text-muted focus:outline-none disabled:cursor-not-allowed disabled:text-disabled"
      />

      <div className="flex items-center gap-2 p-1.5">
        {attach && (
          <>
            <input ref={pickerRef} type="file" multiple hidden onChange={onPick} />
            <button
              type="button"
              disabled={busy}
              aria-label="Attach files"
              title="Attach files"
              onClick={() => pickerRef.current?.click()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors duration-base hover:bg-neutral-100 hover:text-default focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:text-disabled disabled:hover:bg-transparent"
            >
              <Paperclip aria-hidden className="h-[18px] w-[18px]" />
            </button>
          </>
        )}
        {connectors && connectors.length > 0 && (
          <ConnectorsMenu
            items={connectors}
            on={linked}
            disabled={busy}
            onToggle={(id) => setLinked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))}
          />
        )}
        {/* Send is pinned right whether or not the paperclip is there. */}
        <span className="flex-1" />
        {voice && dictation.supported && (
          <VoiceButton
            listening={dictation.listening}
            analyser={dictation.analyser}
            disabled={busy}
            error={dictation.error}
            onClick={toggleDictation}
          />
        )}
        {/* Same 36px square and same 18px glyph as the clip — the geometry
            never changes. What changes is the fill: the moment there is
            something to send this takes the §4.1 primary treatment, so the
            rail has one lit action and the composer says it is ready. With an
            empty box it falls back to the clip's ghost, because a filled
            button you cannot press is a dead end, not an invitation. */}
        <button
          type="button"
          disabled={!ready}
          aria-label="Send"
          title="Send"
          onClick={send}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-base',
            'focus-visible:outline-none focus-visible:shadow-focus',
            ready
              ? 'bg-btn-primary text-inverse hover:bg-btn-primary-hover active:bg-btn-primary-pressed'
              : 'cursor-not-allowed text-disabled',
          )}
        >
          <SendHorizontal aria-hidden className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  )
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
