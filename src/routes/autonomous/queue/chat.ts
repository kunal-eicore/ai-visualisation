import type { QueueAction } from './state'

/**
 * The queue assistant's script — the eight prompts approved for Manual, and
 * nothing else.
 *
 * Every fact in a reply is read off the fixture in `data.ts`; change a row
 * there and the matching reply has to change with it. A prompt that matches
 * none of these gets `NO_MATCH_REPLY` rather than an invented answer.
 *
 * Order matters: the action entries come first, because "take the unassigned
 * high-priority cases" also contains the words the A2 question matches on.
 */
export type QueueTurn = {
  text: string
  /** Rows the reply is about, by id. Each one is a link that shows the row. */
  cases?: string[]
  /** What Apply does, and the label on the offer. */
  action?: QueueAction
  apply?: string
}

type Entry = { suggest: string; match: RegExp[]; reply: QueueTurn }

/** Named because the intent screen's underwriting card answers with it too. */
export const TAT_PROMPT = 'Which cases are closest to breaching TAT?'
export const TAT_MATCH = [/breach/, /\btat\b/, /closest/, /\bsla\b/, /deadline/]
export const TAT_REPLY: QueueTurn = {
  text:
    'None have breached, and none are past 75%. Closest: Eicore tech with 27h left (21h of 48h used), ' +
    'Northwind Logistics with 55h left (41h of 96h), and Ananya Krishnan and Rohit Malhotra with 44h left each (28h of 72h).',
  cases: ['q-0002', 'q-0402', 'q-0412', 'q-0415'],
}

export const QUEUE_REPLIES: Entry[] = [
  {
    suggest: 'Take the unassigned high-priority cases',
    match: [/\btake\b/],
    reply: {
      text: "I'll assign Sanjay Kulkarni's and Harish Menon's cases to you.",
      cases: ['q-0371', 'q-0341'],
      action: { kind: 'assign', ids: ['q-0371', 'q-0341'] },
      apply: 'Assign 2 cases to you',
    },
  },
  {
    suggest: "Reassign Kavya Iyer's case to me",
    match: [/reassign/, /kavya/],
    reply: {
      text: "It's with R. Bose now. I'll reassign it to you.",
      cases: ['q-0379'],
      action: { kind: 'assign', ids: ['q-0379'] },
      apply: "Reassign Kavya Iyer's case to you",
    },
  },
  {
    suggest: TAT_PROMPT,
    match: TAT_MATCH,
    reply: TAT_REPLY,
  },
  {
    suggest: "What's high priority and unassigned?",
    match: [/unassigned/, /no one/, /nobody/],
    reply: {
      text:
        'Two cases: Sanjay Kulkarni, Health Shield Plus, Underwriting; and Harish Menon, Family Floater Silver, Partial accepted.',
      cases: ['q-0371', 'q-0341'],
    },
  },
  {
    suggest: 'Summarise the Eicore case',
    match: [/eicore/, /summar/],
    reply: {
      text:
        'MAGM-400201-26-7000002-1, Group Health Enhanced at ₹1,64,77,850/yr. Under review, referred, created 27 Sep, 1d 3h left, assigned to you.',
      cases: ['q-0002'],
    },
  },
  {
    suggest: 'Show high-priority group cases',
    match: [/group.*high|high.*group/],
    reply: {
      text: "I'll switch to the Group tab and set Priority to High. That leaves 3 cases.",
      action: { kind: 'view', patch: { segment: 'Group', priority: 'High' } },
      apply: 'Group tab · Priority High',
    },
  },
  {
    suggest: 'Sort by premium, highest first',
    match: [/sort/, /premium/],
    reply: {
      text: "I'll sort SI / Premium from highest to lowest.",
      action: { kind: 'view', patch: { sort: { key: 'premium', dir: 'desc' } } },
      apply: 'Sort SI / Premium, highest first',
    },
  },
  {
    suggest: 'Show Senior Care Classic cases',
    match: [/senior care/],
    reply: {
      text: "I'll set Plan to Senior Care Classic. That leaves 4 cases.",
      action: { kind: 'view', patch: { plan: 'Senior Care Classic' } },
      apply: 'Plan · Senior Care Classic',
    },
  },
]

export const QUEUE_SUGGESTIONS = QUEUE_REPLIES.map((e) => e.suggest)

export function matchQueue(text: string): QueueTurn | null {
  const q = text.toLowerCase()
  return QUEUE_REPLIES.find((e) => e.match.some((re) => re.test(q)))?.reply ?? null
}

export const NO_MATCH_REPLY: QueueTurn = {
  text: "Nothing in this queue answers that, and I won't guess. Ask about cases, TAT, priority or ownership, or ask me to filter or sort the list.",
}
