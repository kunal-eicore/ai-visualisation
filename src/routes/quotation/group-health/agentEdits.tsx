import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ring } from '@/lib/ring'
import type { Step } from './data'

/**
 * The write path from the assistant to the form.
 *
 * The dock and the steps are siblings — the panel cannot reach into
 * `StepBusiness`'s `useState`, and the step cannot know what was asked for in
 * the transcript. This is the bus between them, and it exists so that a
 * proposal in the chat and the field it would change are demonstrably the
 * same event rather than two screens that happen to agree.
 *
 * Three rules are built into its shape rather than left to callers:
 *
 * - **Nothing writes without an Apply.** `run` is only ever called from a
 *   pressed button. A proposal sitting in the transcript has changed nothing,
 *   which is what makes it safe to leave one unanswered.
 * - **A write is visible where it lands, not where it was asked for.** The
 *   run navigates to the step it touches, rings the section, and holds a
 *   skeleton on the exact fields being recomputed. A confirmation in the
 *   chat saying "done" would ask the user to take the change on trust.
 * - **The value the machine wrote stays editable.** `useAgentField` hands
 *   back a setter, and a user edit after the fact simply wins — the agent
 *   does not own the field afterwards, it just filled it once.
 *
 * The delay is a fake, like the rest of this walkthrough. It is not there to
 * manufacture effort: it is the window in which the skeleton and the ring can
 * be read at all, and it is short enough not to be a wait.
 */

/** How long fields hold a skeleton before the new value lands. */
const WRITE_MS = 1500

export type FieldEdit = {
  /** Namespaced id, e.g. `business.industry`. Matches `useAgentField`. */
  field: string
  value: string
}

export type EditRun = {
  /** Identifies the write, so it can be taken back. */
  token: string
  /** The step to navigate to before the write is shown. */
  step: Step
  /** The SectionCard to ring — the "area being modified". */
  section: string
  edits: FieldEdit[]
}

type AgentEditsValue = {
  run: (run: EditRun) => void
  /** Put a write's fields back the way they were. */
  undo: (token: string) => void
  /** Writes that can still be taken back. */
  undoable: string[]
  /** A write is in flight. The dock uses it to hold its composer. */
  busy: boolean
  values: Record<string, string>
  pending: string[]
  /** Fields whose value landed within the last beat — they animate in. */
  landed: string[]
  registerSection: (id: string, el: HTMLElement | null) => void
  registerInitial: (id: string, value: string) => void
}

/* A working default rather than a throw: SectionCard is used on every step of
   this flow, and a step rendered outside the provider (a test, a future
   standalone view) should render a plain card, not crash. */
const AgentEditsContext = createContext<AgentEditsValue>({
  run: () => {},
  undo: () => {},
  undoable: [],
  busy: false,
  values: {},
  pending: [],
  landed: [],
  registerSection: () => {},
  registerInitial: () => {},
})

export function AgentEditsProvider({
  onNavigate,
  children,
}: {
  onNavigate: (step: Step) => void
  children: ReactNode
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<string[]>([])
  const [landed, setLanded] = useState<string[]>([])
  const sections = useRef(new Map<string, HTMLElement>())
  /* What each field held before any agent write, so a write can be undone
     even when it was the first thing to touch that field. Registered by the
     field itself, because the value it starts with is the step's business,
     not the bus's. */
  const initials = useRef(new Map<string, string>())
  const [history, setHistory] = useState<Record<string, FieldEdit[]>>({})
  /**
   * Mirrors of the two state atoms, for reading inside timeouts.
   *
   * Everything below reads these OUTSIDE the state updaters and never from
   * within one. Under StrictMode an updater is invoked twice, and the second
   * invocation happens on a later render where these refs have already moved
   * on — so a value captured inside an updater is the value AFTER the write,
   * not before it, and Undo restores the thing it was meant to remove.
   */
  const valuesRef = useRef(values)
  valuesRef.current = values
  const historyRef = useRef(history)
  historyRef.current = history
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout)
    },
    [],
  )

  const registerSection = useCallback((id: string, el: HTMLElement | null) => {
    if (el) sections.current.set(id, el)
    else sections.current.delete(id)
  }, [])

  const registerInitial = useCallback((id: string, value: string) => {
    if (!initials.current.has(id)) initials.current.set(id, value)
  }, [])

  const run = useCallback(
    ({ token, step, section, edits }: EditRun) => {
      onNavigate(step)
      setPending(edits.map((e) => e.field))
      setLanded([])

      /* Two frames, not one. The step swaps on this render, so the section
         being rung does not exist until the next commit; asking for its
         position in the same frame scrolls to wherever the previous step's
         node was. */
      requestAnimationFrame(() =>
        requestAnimationFrame(() => ring(sections.current.get(section) ?? null, WRITE_MS + 200)),
      )

      timers.current.push(
        window.setTimeout(() => {
          /* Capture what is being replaced at the moment of replacing it.
             Doing this when the run STARTS reads the outgoing values off a
             step that has not mounted yet — the navigation is the same tick
             — so Undo would restore a blank instead of the value that was
             actually on screen. By now the step is mounted and has
             registered what it came up with. */
          const previous = edits.map((e) => ({
            field: e.field,
            value: valuesRef.current[e.field] ?? initials.current.get(e.field) ?? '',
          }))
          setHistory((h) => ({ ...h, [token]: previous }))
          setValues((v) => {
            const next = { ...v }
            for (const e of edits) next[e.field] = e.value
            return next
          })
          setPending([])
          setLanded(edits.map((e) => e.field))
        }, WRITE_MS),
      )

      /* Release the reveal class, or a field that animated in once keeps the
         class and never animates again. */
      timers.current.push(window.setTimeout(() => setLanded([]), WRITE_MS + 900))
    },
    [onNavigate],
  )

  /**
   * Take a write back.
   *
   * The counterpart to executing a named request without a confirmation
   * step: an action that happens on one click has to be reversible on one
   * click, or the click is a trap. It restores through the same skeleton the
   * write used, because putting a value back is the same kind of event as
   * putting it there — and a value that snapped back with no signal would be
   * the one change on the screen nobody saw happen.
   */
  const undo = useCallback((token: string) => {
    const previous = historyRef.current[token]
    if (!previous) return

    setHistory((h) => {
      const { [token]: _spent, ...rest } = h
      return rest
    })
    setPending(previous.map((e) => e.field))
    setLanded([])

    timers.current.push(
      window.setTimeout(() => {
        setValues((v) => {
          const next = { ...v }
          for (const e of previous) next[e.field] = e.value
          return next
        })
        setPending([])
        setLanded(previous.map((e) => e.field))
      }, WRITE_MS),
    )
    timers.current.push(window.setTimeout(() => setLanded([]), WRITE_MS + 900))
  }, [])

  const value = useMemo<AgentEditsValue>(
    () => ({
      run,
      undo,
      undoable: Object.keys(history),
      busy: pending.length > 0,
      values,
      pending,
      landed,
      registerSection,
      registerInitial,
    }),
    [run, undo, history, values, pending, landed, registerSection, registerInitial],
  )

  return <AgentEditsContext.Provider value={value}>{children}</AgentEditsContext.Provider>
}

export function useAgentEdits() {
  return useContext(AgentEditsContext)
}

/**
 * A form field the assistant can write to.
 *
 * Drop-in for the `useState` it replaces: same `[value, setValue]` shape,
 * plus the two flags the field needs to render its own state. The agent's
 * value wins over the local one only once it has landed, so a field the user
 * edited before a write still shows their text until the write commits.
 */
export function useAgentField(id: string, initial: string) {
  const { values, pending, landed, registerInitial } = useAgentEdits()
  const [local, setLocal] = useState(initial)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    registerInitial(id, initial)
  }, [id, initial, registerInitial])

  const written = values[id]
  /* A user edit after the write wins: the agent filled the field once, it
     does not own it. */
  const value = dirty ? local : (written ?? local)

  const setValue = useCallback((next: string) => {
    setLocal(next)
    setDirty(true)
  }, [])

  /* A fresh write clears the dirty flag, so the next agent value shows. */
  useEffect(() => {
    if (written !== undefined) setDirty(false)
  }, [written])

  return {
    value,
    setValue,
    /** Being recomputed — hold a skeleton. */
    busy: pending.includes(id),
    /** Just landed — animate in. */
    landed: landed.includes(id),
  }
}

/** Ref callback that makes a SectionCard ringable by `run`. */
export function useSectionRef(id: string | undefined) {
  const { registerSection } = useAgentEdits()
  return useCallback(
    (el: HTMLElement | null) => {
      if (id) registerSection(id, el)
    },
    [id, registerSection],
  )
}
