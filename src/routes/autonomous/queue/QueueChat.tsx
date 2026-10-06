import { ArrowUpRight } from 'lucide-react'
import { ChatPanel } from '@/components/workspace/chat/ChatPanel'
import { NO_MATCH_REPLY, QUEUE_SUGGESTIONS, matchQueue, type QueueTurn } from './chat'
import type { Queue } from './state'

/**
 * The queue assistant — `ChatPanel` configured for the underwriting queue in
 * Manual.
 *
 * It answers from the queue rows, and every case it names is a link that
 * shows the row. A filter, sort or assignment is only ever an offer: nothing
 * changes until Apply is pressed, and the receipt carries the Undo. A prompt
 * outside the approved script is refused rather than answered.
 */
export function QueueChat({ q, width, onClose }: { q: Queue; width: number; onClose: () => void }) {
  // Per turn, so asking the same thing twice gives two separate offers.
  const token = (i: number) => `turn:${i}`

  return (
    <ChatPanel<QueueTurn>
      ariaLabel="Queue assistant"
      width={width}
      header={{ title: 'Assistant', onClose }}
      conversation={{
        pendingLabel: 'Reading the queue',
        respond: (text) => matchQueue(text) ?? NO_MATCH_REPLY,
        renderExtras: (turn) => turn.cases && <CaseLinks ids={turn.cases} q={q} />,
        apply: {
          state: (_, i) => {
            const on = q.undoable.includes(token(i))
            return { applied: on, undoable: on }
          },
          onApply: (turn, i) => turn.action && q.apply(token(i), turn.action),
          onUndo: (_, i) => q.undo(token(i)),
        },
      }}
      suggestions={{ items: QUEUE_SUGGESTIONS }}
      composer={{
        placeholder: 'Ask about the queue, or ask me to filter or assign',
        label: 'Message the assistant',
      }}
    />
  )
}

/** The cases a reply is about. Each one shows its row in the table. */
function CaseLinks({ ids, q }: { ids: string[]; q: Queue }) {
  return (
    <ul className="flex flex-col overflow-hidden rounded-lg border border-default">
      {ids.map((id) => {
        const row = q.rows.find((r) => r.id === id)
        if (!row) return null
        return (
          <li key={id} className="border-b border-subtle last:border-b-0">
            <button
              type="button"
              onClick={() => q.show(id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-base hover:bg-brand-50 focus-visible:outline-none focus-visible:shadow-focus"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-default">{row.clientName}</span>
                <span className="block truncate font-mono text-xs text-subtle">{row.quotationNo}</span>
              </span>
              <ArrowUpRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
