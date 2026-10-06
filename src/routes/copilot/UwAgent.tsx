import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ring, scrollTo } from '@/lib/ring'
import { ChatPanel, type CallRecord, type ChatMessage, type Thinking } from './ChatPanel'
import { PremiumBreakup } from './PremiumBreakup'
import { RateTable, type RateState } from './RateTable'
import { SourceViewer } from './SourceViewer'
import {
  OPENING_MESSAGE, PILL_SCRIPTS, multiplierFor, parseActions, scriptedReply, sourcesOf, stepsOf,
  type PillScript, type SourceId,
} from './data'

/*
 * Turn choreography, in ms.
 *
 * The throbber's own transitions are part of the budget: leaving the wave
 * damps and settles before a spin can start, so a beat has to be long enough
 * for the state change to read. These are tuned against the tightened phase
 * timings in `components/ui/Throbber`.
 */
const STEP_MS = 900
/** How long a call stays out before its result lands. Deliberately unhurried:
 *  the spin, the skeleton and the arguments being read are the demonstration,
 *  and at a realistic latency they flash past before any of it registers. */
const CALL_MS = 1800
/** Breath after a result, before the next beat. */
const CALL_TAIL = 250
/** The 700ms settle on the table once new values land. */
const REVEAL_HOLD = 700
/** A rate change fired straight from an action button, with no turn around it. */
const ACTION_SKELETON = 2600

let seq = 0
const nextId = () => `m-${++seq}`

/**
 * UW Agent — the rate-table screen with the copilot that drives it, ported
 * from `ai-research/UW_flow_AI_with_sim.html`.
 *
 * Three things are happening at once, and the screen exists to show that they
 * are the same event: the agent narrates a step, a function call goes out and
 * the throbber switches from its wave to a spin, and the cells that call is
 * repricing hold a skeleton until it returns. Nothing is applied from the
 * chat — an answer ends in buttons, and a rate change lands only when one is
 * pressed. Flows are scripted (`./data`); no model is called.
 */
export function UwAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: 'ai', text: OPENING_MESSAGE },
  ])
  const [thinking, setThinking] = useState<Thinking | null>(null)
  const [loading, setLoading] = useState(false)
  const [breakupOpen, setBreakupOpen] = useState(false)
  const [rate, setRate] = useState<RateState>({ mult: 1, mode: 'calculated', skeleton: false, reveal: false })
  /** Id of the answer whose rate change is on the table. Only one can be: the
   *  table carries a single multiplier. */
  const [appliedFor, setAppliedFor] = useState<string | null>(null)
  /** The source opened from a chip in the transcript, with its turn's siblings. */
  const [source, setSource] = useState<{ id: SourceId | null; used: SourceId[] } | null>(null)

  /** The answer waiting on the throbber to settle back to its ring. */
  const pending = useRef<{ script: PillScript; calls: CallRecord[]; seconds: number } | null>(null)
  const ratesRef = useRef<HTMLDivElement>(null)
  const breakupRef = useRef<HTMLDivElement>(null)
  const sourceRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => clearTimers, [])
  const after = (ms: number, fn: () => void) => void timers.current.push(window.setTimeout(fn, ms))

  const busy = thinking !== null || loading

  /* Clicked: the scroll alone is too quiet to notice on a screen this dense —
     by the time it lands you have lost which of three cards moved — so the
     target takes a brand ring for a beat as well. */
  const goRates = useCallback(() => ring(ratesRef.current), [])
  const goBreakup = useCallback(() => {
    setBreakupOpen(true)
    // The card may be mounting this frame; let it exist before ringing it.
    requestAnimationFrame(() => ring(breakupRef.current))
  }, [])
  const openSource = useCallback((id: SourceId | null, used: SourceId[]) => {
    setSource({ id, used })
    requestAnimationFrame(() => ring(sourceRef.current))
  }, [])

  /* Agent-driven: bring the surface into view and let the skeleton do the
     talking. No ring — see `ring` above. */
  const showRates = useCallback(() => scrollTo(ratesRef.current), [])
  const showBreakup = useCallback(() => {
    setBreakupOpen(true)
    requestAnimationFrame(() => scrollTo(breakupRef.current))
  }, [])

  /** `chatModifyRates` — skeleton, then the new values on a reveal. */
  const modifyRates = useCallback((mult: number) => {
    goRates()
    setRate({ mult, mode: 'flat', skeleton: true, reveal: false })
    after(ACTION_SKELETON, () => {
      setRate((r) => ({ ...r, skeleton: false, reveal: true }))
      after(REVEAL_HOLD, () => setRate((r) => ({ ...r, reveal: false })))
    })
  }, [goRates])

  /** Undo the applied rate change and put the table back to current rates. */
  const revert = () => {
    setAppliedFor(null)
    goRates()
    setRate((r) => ({ ...r, skeleton: true, reveal: false }))
    after(ACTION_SKELETON, () => {
      setRate({ mult: 1, mode: 'calculated', skeleton: false, reveal: true })
      after(REVEAL_HOLD, () => setRate((r) => ({ ...r, reveal: false })))
    })
  }

  /**
   * `pillAct` — walk a scripted turn beat by beat.
   *
   * Each beat sets the throbber phase it belongs to, so the indicator is
   * never guessing: it waves through narration and spins for exactly the
   * window a call is out.
   */
  const runPill = (index: number) => {
    if (busy) return
    const script = PILL_SCRIPTS[index]
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: script.prompt }])
    setThinking({ steps: [], calls: [], phase: 'thinking' })

    const calls: CallRecord[] = []
    let t = 0

    script.beats.forEach((beat) => {
      if (beat.kind === 'step') {
        const text = beat.text
        after(t, () =>
          setThinking((s) => (s ? { ...s, phase: 'thinking', steps: [...s.steps, text] } : s)),
        )
        t += STEP_MS
        return
      }

      const record: CallRecord = {
        id: nextId(), name: beat.name, args: beat.args, state: 'running', sources: beat.sources,
      }
      calls.push(record)

      after(t, () => {
        setThinking((s) => (s ? { ...s, phase: 'toolCall', calls: [...s.calls, record] } : s))
        // The table skeletonises for the window the pricing call is out —
        // that link is the whole point of showing both panes at once.
        if (beat.name === 'model_rate_change' && script.rateMult) {
          showRates()
          setRate({ mult: script.rateMult, mode: 'flat', skeleton: true, reveal: false })
        }
      })

      t += CALL_MS

      after(t, () => {
        setThinking((s) =>
          s
            ? {
                ...s,
                phase: 'thinking',
                calls: s.calls.map((c) => (c.id === record.id ? { ...c, state: 'done', result: beat.result } : c)),
              }
            : s,
        )
        if (beat.name === 'model_rate_change') {
          setRate((r) => ({ ...r, skeleton: false, reveal: true }))
          after(REVEAL_HOLD, () => setRate((r) => ({ ...r, reveal: false })))
        }
        if (beat.name === 'get_premium_breakup') showBreakup()
      })

      t += CALL_TAIL
    })

    // `done` — hand the throbber its exit. The answer waits for `onSettled`.
    after(t, () => {
      pending.current = {
        script,
        calls: calls.map((c) => ({ ...c, state: 'done' as const })),
        seconds: Math.max(1, Math.round(t / 1000)),
      }
      setThinking((s) => (s ? { ...s, phase: 'ending' } : s))
    })
  }

  /** The ring has reformed — release the answer the turn was holding. */
  const onSettled = () => {
    const p = pending.current
    if (!p) return
    pending.current = null
    setThinking(null)
    const beatResults = p.script.beats.filter((b) => b.kind === 'call')
    const id = nextId()
    // The turn priced the change onto the table as it ran; this answer is the
    // one that can take it back.
    if (p.script.rateMult) setAppliedFor(id)
    setMessages((prev) => [
      ...prev,
      {
        id,
        role: 'ai',
        text: p.script.answer,
        thoughts: stepsOf(p.script.beats),
        calls: p.calls.map((c, i) => ({
          ...c,
          result: beatResults[i] && 'result' in beatResults[i] ? beatResults[i].result : c.result,
        })),
        acts: p.script.acts,
        sources: sourcesOf(p.script.beats),
        seconds: p.seconds,
      },
    ])
  }

  /** `sC` — a typed message. The prototype called an API here; this routes
   *  through `parseActions` so the answer still carries real buttons. */
  const send = (text: string) => {
    if (busy) return
    const pill = PILL_SCRIPTS.findIndex((p) => p.prompt.toLowerCase() === text.toLowerCase())
    if (pill >= 0) {
      runPill(pill)
      return
    }

    const acts = parseActions(text)
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }])
    setLoading(true)
    // Breakup is immediate in the prototype; a rate change waits for a button.
    if (acts.some((a) => a.type === 'breakup')) showBreakup()

    const rateAct = acts.find((a) => a.type !== 'breakup')
    after(900, () => {
      setLoading(false)
      const id = nextId()
      if (rateAct) {
        setAppliedFor(id)
        modifyRates(multiplierFor(rateAct))
      }
      setMessages((prev) => [...prev, { id, role: 'ai', text: scriptedReply(acts), acts }])
    })
  }

  const reset = () => {
    clearTimers()
    pending.current = null
    setMessages([{ id: nextId(), role: 'ai', text: OPENING_MESSAGE }])
    setThinking(null)
    setLoading(false)
    setBreakupOpen(false)
    setSource(null)
    setAppliedFor(null)
    setRate({ mult: 1, mode: 'calculated', skeleton: false, reveal: false })
  }

  return (
    /* The prototype's `.bw` split: the work area is the only thing that
       scrolls, and the agent rail is pinned full height beside it. */
    <div className="flex h-full overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 py-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-default">UW Agent</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-subtle">
              K D Supply Chain Solutions, group health renewal. Ask the copilot to reprice the book
              and watch the rate table skeletonise for exactly as long as its pricing call is out.
            </p>
          </div>
          <Button
            variant="neutral"
            onClick={reset}
            disabled={messages.length <= 1 && rate.mode === 'calculated' && !busy}
            icon={<RotateCcw aria-hidden className="h-4 w-4" />}
          >
            Reset
          </Button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {source && (
            <div ref={sourceRef} className="rounded-lg transition-shadow duration-slow">
              <SourceViewer
                id={source.id}
                used={source.used}
                onSelect={(id) => setSource((s) => (s ? { ...s, id } : s))}
                onClose={() => setSource(null)}
              />
            </div>
          )}
          {breakupOpen && (
            <div ref={breakupRef} className="rounded-lg transition-shadow duration-slow">
              <PremiumBreakup onClose={() => setBreakupOpen(false)} />
            </div>
          )}
          <div ref={ratesRef} className="rounded-lg transition-shadow duration-slow">
            <RateTable state={rate} />
          </div>
        </div>
      </div>

      {/* `.ap` — flush to the viewport edge, full height. Wider than the
          prototype's 360: the call rows now carry their own source chips
          under the signature, and at 360 those wrapped onto four lines. */}
      <aside className="flex w-[420px] shrink-0 flex-col border-l border-default">
        <ChatPanel
          messages={messages}
          thinking={thinking}
          loading={loading}
          onSend={send}
          onPill={runPill}
          appliedFor={appliedFor}
          onRevert={revert}
          onShowBreakup={goBreakup}
          onGoRates={goRates}
          onOpenSource={openSource}
          onSettled={onSettled}
        />
      </aside>
    </div>
  )
}
