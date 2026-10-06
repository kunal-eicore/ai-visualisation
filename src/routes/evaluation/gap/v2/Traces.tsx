import { useState } from 'react'
import { Ban, Check, ChevronRight, CircleSlash, PencilLine, TriangleAlert, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import {
  OUTCOME_ATTENTION,
  OUTCOME_LABEL,
  OUTCOME_TONE,
  type DecisionClass,
  type Span,
  type Trace,
} from '../data'

/*
 * One recorded decision, at the depth it was recorded.
 *
 * WHY THIS IS BACK. A first pass at V2 reduced a trace to a single summary
 * line — reference, outcome, confidence, total time. That threw away the most
 * load-bearing thing on the screen. Every argument the fixtures were built to
 * make lives in the spans: a reported confidence of 0.86 covering two
 * candidates at 0.61 and 0.58; an escalation nobody answered, and the check
 * downstream that therefore never fired. None of that is visible in a total.
 *
 * WHAT THE SPANS ARE NOT. They are not a timeline. A first restoration drew
 * each one as a bar scaled by its duration, and the durations were the loudest
 * thing in the list — which put the reader's attention on the one axis this
 * screen does not score anything against. A step is right or wrong at any
 * speed; nothing else on the page moves when the milliseconds move. (It was
 * not even a sound timeline: a root span's duration is not the sum of its
 * children here, so end-to-end bars would have drawn a nesting nobody
 * measured.) What is left is the sequence, what each step concluded, and how
 * it ended — which is the whole of what a trace is for.
 *
 * THE TWO STATUSES THAT CARRY THE ARGUMENT. `missed` means the step NEVER RAN
 * — the defect is the check that did not fire, not the check — and
 * `suppressed` means it was written and deliberately not committed, such as a
 * delegation e-mail drafted and left unsent, because a task that crosses out
 * of the building is the one place an undo cannot reach. Neither is a failure
 * of the step beside it, and both are the reason every span is kept in the
 * list rather than dropped: an omitted step and a passing one look identical
 * once they are gone.
 */

const SPAN_STATUS: Record<Span['status'], { fg: string; Icon: typeof Check; label: string }> = {
  ok: { fg: 'text-success-fg', Icon: Check, label: 'ok' },
  warn: { fg: 'text-warning-fg', Icon: TriangleAlert, label: 'flagged' },
  failed: { fg: 'text-danger-fg', Icon: PencilLine, label: 'edited' },
  missed: { fg: 'text-warning-fg', Icon: CircleSlash, label: 'never ran' },
  handoff: { fg: 'text-info-fg', Icon: UserRound, label: 'asked a person' },
  suppressed: { fg: 'text-muted', Icon: Ban, label: 'not sent' },
}

export function Traces({ c, bare }: { c: DecisionClass; bare?: boolean }) {
  /* The reference run opens by default: it is the one every class replays, so
   * it is the case a reader can carry across all five. */
  const [open, setOpen] = useState<string | null>(c.traces[0]?.id ?? null)

  return (
    <div className={bare ? undefined : 'mt-6 border-t border-default pt-4'}>
      {!bare && <h4 className="text-sm font-semibold text-default">Example cases</h4>}

      <ul className="mt-2">
        {c.traces.map((t) => (
          <TraceRow
            key={t.id}
            t={t}
            open={open === t.id}
            onToggle={() => setOpen((p) => (p === t.id ? null : t.id))}
          />
        ))}
      </ul>
    </div>
  )
}

function TraceRow({ t, open, onToggle }: { t: Trace; open: boolean; onToggle: () => void }) {
  const held = t.spans.filter((s) => s.status === 'missed' || s.status === 'suppressed')

  return (
    <li
      className={cn(
        /* Open is an OUTLINE on the card's own white, never a grey fill:
           a wash reads as disabled, and it dulls every status word and
           figure printed on top of it. Same rule as the table row. */
        open
          ? 'my-1 rounded-md border border-strong bg-surface-card px-3 shadow-control'
          : 'border-b border-subtle last:border-0',
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 py-2 text-left focus-visible:outline-none focus-visible:shadow-focus"
      >
        <ChevronRight
          aria-hidden
          className={cn('h-4 w-4 shrink-0 text-muted transition-transform duration-base', open && 'rotate-90')}
        />
        <span className="font-mono text-xs text-subtle">{t.ref}</span>
        <span className="text-xs text-muted">{t.subject}</span>
        <Badge tone={OUTCOME_TONE[t.outcome]} dot={OUTCOME_ATTENTION[t.outcome]}>
          {OUTCOME_LABEL[t.outcome]}
        </Badge>
        {t.handoff && (
          <span className="text-xs text-muted">
            {t.handoff.kind} to {t.handoff.to}
          </span>
        )}
        <span className="ml-auto flex items-center gap-4 font-mono text-xs text-muted">
          <span>conf {t.confidence.toFixed(2)}</span>
          <span>{t.spans.length} steps</span>
          {held.length > 0 && (
            <span className="text-warning-fg">{held.length} skipped</span>
          )}
        </span>
      </button>

      {open && (
        <div className="pb-4 pl-7 pr-1">
          <p className="text-sm text-default">{t.summary}</p>
          <p className="mt-1 text-xs text-muted">
            Decided at <span className="text-subtle">{t.decidedAt}</span> · {t.at}
          </p>

          <div className="mt-3 flex items-center justify-between border-b border-default pb-1">
            <span className="text-xs font-medium text-muted">Steps, in order</span>
            <span className="text-xs text-muted">How it ended</span>
          </div>

          <SpanList spans={t.spans} />
        </div>
      )}
    </li>
  )
}

/** The recorded steps of one run, in order. Shared with the run log, where
 *  the same list is the breakdown of a run picked out of the population
 *  rather than one chosen as an example. */
export function SpanList({ spans }: { spans: Span[] }) {
  return (
    <ol className="mt-1">
      {spans.map((s, i) => (
        <SpanRow key={`${s.label}-${i}`} s={s} />
      ))}
    </ol>
  )
}

function SpanRow({ s }: { s: Span }) {
  const meta = SPAN_STATUS[s.status]

  return (
    /*
     * ONE GRID, SO NOTHING CAN DRIFT. The icon, the label and the detail line
     * used to be a flex row with the detail underneath it on a hand-counted
     * `pl-[22px]` — and the label alone carried a `pl-3` for a nested span.
     * The result was a child's label sitting twelve pixels right of its own
     * detail, and the root's label twelve pixels left of every other label,
     * with one icon column running through the middle of it regardless. Three
     * columns declared once fix all of that by construction.
     *
     * AND THE NESTING IS GONE, because there is none to draw. Every trace in
     * the fixtures is a single root span followed by flat children — no tree,
     * just the run and its steps — so an indent on all but the first row was
     * reporting a hierarchy that does not exist while breaking the alignment
     * of the one that does. The list is a sequence; it reads as one.
     */
    <li className="grid grid-cols-[0.875rem_1fr_auto] items-baseline gap-x-2 border-b border-subtle py-1.5 last:border-0">
      <meta.Icon aria-hidden className={cn('col-start-1 h-3.5 w-3.5 shrink-0 self-center', meta.fg)} />
      <span
        className={cn(
          'col-start-2 min-w-0 text-sm',
          s.status === 'suppressed' ? 'text-muted line-through' : 'text-default',
        )}
      >
        {s.label}
      </span>
      {/* The word, not a bar. Six of these read down the list as the shape
          of the run: where it was flagged, where it was edited, where it
          asked, and where it never fired at all. */}
      <span className={cn('col-start-3 shrink-0 font-mono text-xs', meta.fg)}>{meta.label}</span>
      {/* What the step read and what it concluded — the explainability line.
          This is data, not commentary, and it is the reason a trace is kept.
          It starts under the label, not under the icon, because it belongs to
          the label. */}
      <p className="col-span-2 col-start-2 mt-0.5 text-xs leading-relaxed text-subtle">{s.detail}</p>
    </li>
  )
}
