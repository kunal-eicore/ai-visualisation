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
import { useAutonomy } from './autonomy'

/**
 * The autonomous run — the agent's own work queue, hoisted above the routes.
 *
 * Below this rung the human holds the queue and the agent is a thing they
 * call. Autonomous is the first rung where that inverts: the agent holds the
 * queue and the person is one of the resources it schedules. Two consequences
 * shape this module.
 *
 * **The documents are the go.** Switching the rung on sets nothing running;
 * confirming the pack on step 1 does. There is no plan to approve in
 * between, because approving a plan is not a decision anybody at this rung
 * is equipped to make — nothing has been read yet when it would be shown,
 * and the allocation it describes is the orchestration's own job. What the
 * person is owed is not a preview of the work but a live account of it while
 * it happens and an honest one when it stops, which is what the board is.
 *
 * **It lives in the shell, not in the route.** A run that paused because you
 * opened another screen would not be a run; it would be an animation that
 * needs an audience. So the state and its timers sit above the outlet, which
 * is also what makes a system-level indicator possible at all — the top bar
 * can only report a run it is not inside of.
 *
 * **A handoff is not one thing.** The three kinds below look identical in a
 * UI and behave completely differently when nobody answers, and collapsing
 * them into a single "needs you" inbox is how an agent turns into an
 * interrogation. The difference is carried in the data rather than in the
 * wording of a card.
 */

/** Why a task left the agent, and what happens if nobody comes back to it. */
export type HandoffKind =
  /**
   * The agent owns the task and is missing one fact. It has somewhere safe to
   * land if the answer never comes, and `fallback` says where.
   */
  | 'question'
  /**
   * The task is outside the agent's decision class. It does not own this and
   * should not; no confidence score changes that. It blocks, correctly.
   */
  | 'delegation'
  /**
   * The agent could normally settle this and cannot settle this instance.
   * Blocks, and is the number that should fall as a class earns its rung.
   */
  | 'escalation'

/**
 * Who the task went to. Not one person: these differ by what they hold.
 * `you` holds attention, `underwriter` holds authority, `broker` holds
 * information nobody inside the company has.
 */
export type HandoffTo = 'you' | 'underwriter' | 'broker'

export type Handoff = {
  kind: HandoffKind
  to: HandoffTo
  /** Named where the task went, when it went somewhere with a name. */
  who?: string
  /**
   * The task as it reads to whoever picks it up — an instruction written for
   * a person who is not in this conversation and did not watch the run.
   *
   * This is the default voice for a reason. Most of what an autonomous run
   * hands out is not yours: it goes to the underwriter, or out to the broker.
   * Writing all of it at the reader is how a queue of five open items starts
   * feeling like five things you personally owe, and the two states a person
   * most needs to tell apart are "mine" and "not mine".
   */
  ask: string
  /**
   * The same task in second person, used only when `to` is `you`.
   *
   * Not a politeness setting. Addressing the reader is a claim that this one
   * is theirs, so it has to be false for the other four.
   */
  yours?: string
  /**
   * What the reader can actually do about it, when it is theirs.
   *
   * An obligation with no stated move is just an alarm. Where the options
   * below settle it in place this names the alternative route; where there
   * are none, this is the only thing telling you what the move is.
   */
  can?: string
  /**
   * The SectionCard the handoff concerns, so the step can light that surface
   * rather than making its own banner at the top of the page.
   */
  section?: string
  /** Answerable in place. Absent means it can only be settled in the step. */
  options?: string[]
  /**
   * What choosing each option actually writes into the form, by option.
   *
   * Recording an answer without writing it would leave the run reporting one
   * thing and the field showing another, which is the exact dishonesty this
   * whole flow is built to avoid. The write goes through the ordinary edit
   * bus, so it skeletons, rings and undoes like any other.
   */
  writes?: Record<string, { field: string; value: string }[]>
  /** Questions only. A delegation that had one would be a question. */
  fallback?: string
  /**
   * A task that leaves the building. The agent writes it; a person sends it.
   * Inside the company the agent assigns freely — crossing the boundary is
   * where the cost of being wrong stops being ours.
   */
  outbound?: { to: string; subject: string; body: string }
}

export type RunTask = {
  id: string
  /** Kept as a plain string so this module does not depend on a route. */
  step: string
  title: string
  /** Which agent ran it, and the decision class that routed it there. */
  agent: string
  decisionClass: string
  /** The rung that class runs at. Not every class earns the same one. */
  classRung: string
  confidence: number
  note: string
  handoff?: Handoff
}

export type TaskState =
  | 'queued'
  | 'running'
  | 'done'
  /** Settled by a person, in place. */
  | 'answered'
  /** Waiting on a person. */
  | 'waiting'
  /**
   * An outbound draft a person released. Still with a person, and
   * deliberately NOT counted as done: the request has left the building and
   * the answer has not come back. A run that ticked this off would be
   * reporting the act of asking as though it were the thing it asked for.
   */
  | 'sent'

/** How long each task is held in `running` before it settles. */
const TICK_MS = 1200

/**
 * Where the run is as a whole.
 *
 * `idle` is every rung below Autonomous, and Autonomous before the documents
 * are in. There is no state between that and `running`: the confirmation on
 * step 1 is the mandate, and a rung that asked for a second one would be
 * charging twice for the same decision.
 */
export type RunPhase = 'idle' | 'running' | 'settled'

type RunValue = {
  tasks: RunTask[]
  state: Record<string, TaskState>
  answers: Record<string, string>
  phase: RunPhase
  /** Let it go. Called when the person confirms the documents. */
  start: () => void
  /** True while any task is still queued or running. */
  working: boolean
  /** True once the run has actually been started — never while planning. */
  started: boolean
  done: number
  /** Handoffs nobody has settled yet. */
  waiting: RunTask[]
  answer: (id: string, choice: string) => void
  send: (id: string) => void
  /** The top-bar indicator asking the route to show the board. */
  boardRequested: boolean
  requestBoard: () => void
  clearBoardRequest: () => void
}

const RunContext = createContext<RunValue | null>(null)

export function AgentRunProvider({ tasks, children }: { tasks: RunTask[]; children: ReactNode }) {
  const { mode } = useAutonomy()
  const agentic = mode.agentic

  const [state, setState] = useState<Record<string, TaskState>>({})
  const [phase, setPhase] = useState<RunPhase>('idle')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [boardRequested, setBoardRequested] = useState(false)
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
  }, [])

  /* Dropping out of Autonomous tears the run down rather than parking it. A
     mode is an authority setting, so leaving the rung withdraws the mandate;
     resuming later from a plan the person can no longer see would be the
     opposite of what the plan is for. */
  useEffect(() => {
    if (agentic) return
    clearTimers()
    setState({})
    setAnswers({})
    setPhase('idle')
    setBoardRequested(false)
  }, [agentic, clearTimers])

  useEffect(() => clearTimers, [clearTimers])

  const start = useCallback(() => {
    clearTimers()
    setPhase('running')
    setState(Object.fromEntries(tasks.map((t) => [t.id, 'queued' as TaskState])))

    tasks.forEach((task, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setState((s) => ({ ...s, [task.id]: 'running' }))
        }, i * TICK_MS),
      )
      timers.current.push(
        window.setTimeout(
          () => {
            setState((s) => ({ ...s, [task.id]: task.handoff ? 'waiting' : 'done' }))
            if (i === tasks.length - 1) setPhase('settled')
          },
          i * TICK_MS + TICK_MS - 120,
        ),
      )
    })

  }, [tasks, clearTimers])

  const answer = useCallback((id: string, choice: string) => {
    setAnswers((a) => ({ ...a, [id]: choice }))
    setState((s) => ({ ...s, [id]: 'answered' }))
  }, [])

  const send = useCallback((id: string) => {
    setState((s) => ({ ...s, [id]: 'sent' }))
  }, [])

  const value = useMemo<RunValue>(() => {
    const started = phase === 'running' || phase === 'settled'
    const working = tasks.some((t) => state[t.id] === 'queued' || state[t.id] === 'running')
    const done = tasks.filter((t) => {
      const s = state[t.id]
      return s === 'done' || s === 'answered'
    }).length
    const waiting = tasks.filter((t) => {
      const s = state[t.id]
      return s === 'waiting' || s === 'sent'
    })

    return {
      tasks,
      state,
      answers,
      phase,
      start,
      working,
      started,
      done,
      waiting,
      answer,
      send,
      boardRequested,
      requestBoard: () => setBoardRequested(true),
      clearBoardRequest: () => setBoardRequested(false),
    }
  }, [
    tasks,
    state,
    answers,
    phase,
    start,
    boardRequested,
    answer,
    send,
  ])

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>
}

export function useAgentRun() {
  const value = useContext(RunContext)
  if (!value) throw new Error('useAgentRun must be used inside <AgentRunProvider>')
  return value
}
