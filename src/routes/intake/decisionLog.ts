import { formatInr } from '@/routes/autonomous/queue/data'
import { refOf, sourceOf, type Rule, type Task } from './data'

/*
 * The decision log: what each stage asked the context layer, what came back,
 * and what that answer decided. Layer and tool names are the Harness
 * bindings' own (harness/data.ts). Values are illustrative but derived from
 * the task's own facts, so a held task shows the 62% that held it and a
 * duplicate shows the task it matched.
 */

export type Pair = [string, string]

export type Detail = {
  asked: Pair[]
  returned: Pair[]
  /** The fact this answer set, and the rule that reads it. */
  usedFor?: string
}

export type RuleEval = {
  rule: Rule
  /** What the rule read, with the value it read. */
  reads: string
  result: 'yes' | 'no' | 'off' | 'not evaluated' | 'skipped on release'
}

/** A stable 0..1 per task and salt, so every load shows the same numbers. */
export function unit(id: string, salt: number): number {
  let h = salt * 2654435761
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 2246822519)
  return ((h >>> 0) % 1000) / 1000
}

export const msFor = (t: Task, salt: number) => 300 + Math.round(unit(t.id, salt) * 1100)

/** Confidence the extraction reports: the task's own when it has one, else a clean 88–97. */
export const confidenceOf = (t: Task) => t.facts.extractionConfidence ?? 88 + Math.floor(unit(t.id, 1) * 10)

/** Proposer age as read off a retail proposal; a group proposal has none. */
export const ageOf = (t: Task) => (t.case.segment === 'group' ? undefined : (t.facts.proposerAge ?? 26 + Math.floor(unit(t.id, 2) * 36)))

const documentOf = (t: Task) =>
  t.source === 'forms' ? 'OneBuzz form (structured)' : t.case.segment === 'group' ? 'Proposal form.pdf + Census.xlsx' : 'Proposal form.pdf'

const fieldsOf = (t: Task) => (t.case.segment === 'group' ? 24 : 18)

const LOW_FIELD = ['date of birth', 'nominee relation', 'pre-existing conditions', 'height']

export function extractDetail(t: Task, error?: string): Detail {
  const asked: Pair[] = [
    ['document', documentOf(t)],
    ['fields requested', String(fieldsOf(t))],
  ]
  if (error) return { asked, returned: [['error', error]] }
  const conf = confidenceOf(t)
  const low = LOW_FIELD[Math.floor(unit(t.id, 3) * LOW_FIELD.length)]
  return {
    asked,
    returned: [
      ['fields extracted', `${fieldsOf(t)} of ${fieldsOf(t)}, each with its source page`],
      ['extraction confidence', `${conf}% (lowest: ${low}, p.${1 + Math.floor(unit(t.id, 4) * 3)})`],
    ],
    usedFor: 'extraction confidence, read by rule 4',
  }
}

export function matchDetail(t: Task): Detail {
  const dup = t.facts.duplicateOf
  return {
    asked: [
      ['client', t.case.clientName ?? '—'],
      ['plan', t.case.plan ?? '—'],
    ],
    returned: dup ? [['candidates', `1 · ${refOf(dup)} · score 0.97`]] : [['candidates', '0 above the 0.85 threshold']],
    usedFor: 'duplicate of, read by rule 2',
  }
}

const policyNo = (t: Task) => (t.source === 'renewal-job' ? t.sourceRef.replace('Policy ', '') : `POL-${200000 + Math.floor(unit(t.id, 5) * 700000)}`)

export function policyDetail(t: Task, error?: string): Detail {
  return {
    asked: [['previous policy', policyNo(t)]],
    returned: error ? [['error', `${error} after 8,000 ms`]] : [['status', 'Found · in force until 31 Oct 2026']],
  }
}

export function claimsDetail(t: Task, error?: string): Detail {
  return {
    asked: [
      ['policy', policyNo(t)],
      ['window', 'last 3 years'],
    ],
    returned: error
      ? [
          ['claims', `1 · 2024 · ${formatInr(182000)}`],
          ['declared on proposal', 'none'],
        ]
      : [['claims', unit(t.id, 6) < 0.7 ? '0' : `1 · 2023 · ${formatInr(46000)}, declared`]],
  }
}

export function ageDetail(t: Task): Detail {
  return {
    asked: [['query', `entry age limit, ${t.case.plan}`]],
    returned: [['passage', 'Entry age 18 to 65 · Underwriting rulebook, p.12']],
    usedFor: 'entry-age limit, read by rule 3',
  }
}

export function metricDetail(t: Task): Detail {
  return {
    asked: [
      ['metric', 'sum_insured_per_employee'],
      ['group', t.case.clientName ?? '—'],
    ],
    returned: [['value', formatInr(t.case.sumInsured ?? 0)]],
    usedFor: 'sum insured per employee, read by rule 6',
  }
}

export function deviationDetail(t: Task): Detail {
  return {
    asked: [['rulebook', 'Health underwriting v3']],
    returned: [['deviations', t.facts.deviation ? '1 · loading above the table limit' : '0']],
    usedFor: 'deviations, read by rule 5',
  }
}

/** What each rule read for this task. Keyed by rule id: the condition is fixed, only the outcome is editable. */
export function readsFor(rule: Rule, t: Task): string {
  switch (rule.id) {
    case 1:
      return `intake type: ${sourceOf(t.source).type}`
    case 2:
      return `duplicate of: ${t.facts.duplicateOf ? refOf(t.facts.duplicateOf) : 'none'}`
    case 3: {
      const age = ageOf(t)
      return `proposer age: ${age ?? 'none on a group proposal'}`
    }
    case 4:
      return `extraction confidence: ${confidenceOf(t)}%`
    case 5:
      return `deviations: ${t.facts.deviation ? 1 : 0}`
    case 6:
      return t.case.segment === 'group' ? `sum insured per employee: ${formatInr(t.case.sumInsured ?? 0)}` : 'retail, not applicable'
    default:
      return 'always'
  }
}
