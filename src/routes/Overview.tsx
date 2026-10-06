import { Link } from 'react-router-dom'
import { ArrowRight, Bot, Cable, FlaskConical, GitCompareArrows, Orbit, ScrollText, Target, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

type Idea = {
  title: string
  description: string
  icon: LucideIcon
  to?: string
  status: 'Built' | 'Idea'
}

/**
 * The index of explorations living in this project. Add a row when an idea
 * lands — `status: 'Idea'` entries are parked here deliberately so the nav
 * only ever lists routes that actually exist.
 */
const IDEAS: Idea[] = [
  {
    title: 'Benchmark Gap',
    description:
      'Whether the distance between the system and the people doing this work is closing — the gap and its interval over time, confidence read against what was actually right, and the five decision classes of a group health quotation opened down to the touchpoints each one missed.',
    icon: Target,
    to: '/evaluation/benchmark-gap',
    status: 'Built',
  },
  {
    title: 'Shadow Parity',
    description:
      'Drift between an underwriter’s decision and a shadow agent’s on the same frozen input — accuracy over runs, a per-run decision diff, and the execution trace that produced it.',
    icon: GitCompareArrows,
    to: '/evaluation/shadow-parity',
    status: 'Built',
  },
  {
    title: 'Eval Workbench',
    description:
      'A dedicated surface for agentic workflows — pick one, build it against a recorded event stream with the events tagged into named contexts, then test it with checks written by hand and by the model.',
    icon: FlaskConical,
    to: '/evaluation/workbench',
    status: 'Built',
  },
  {
    title: 'Agent Harness',
    description:
      'Where a tenant points their own provider accounts at our layers — bring-your-own-key across four auth shapes, the MCP, intelligence and semantic bindings behind one gate, and a preflight per agent role.',
    icon: Cable,
    to: '/harness/setup',
    status: 'Built',
  },
  {
    title: 'Fully Autonomous',
    description:
      'Intent-based workflows with little to no human intervention at any point.',
    icon: Orbit,
    to: '/autonomous',
    status: 'Built',
  },
  {
    title: 'UW Agent',
    description:
      'A group health rate table and the copilot that reprices it — the throbber waves through reasoning and spins on a tool call, and the cells hold a skeleton for exactly as long as that call is out.',
    icon: Bot,
    to: '/copilot/uw-agent',
    status: 'Built',
  },
  {
    title: 'Group Health Quotation',
    description:
      'The Onebuzz group health quotation run, rebuilt as a walkthrough — seven steps from document extraction to the two review checkpoints either side of the premium calculation, runnable at four autonomy modes from manual through to an agentic run a person still has to sign.',
    icon: ScrollText,
    to: '/quotation/group-health',
    status: 'Built',
  },
]

export function Overview() {
  return (
    <div className="px-8 py-7">
      <h1 className="text-2xl font-bold text-default">AI Visualisation</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-muted">
        An isolated sandbox for AI visualisation ideas. Each exploration is a self-contained route
        built on the OneBuzz design system.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {IDEAS.map((idea) => {
          const Icon = idea.icon
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-300 bg-brand-50 text-brand">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <Badge tone={idea.status === 'Built' ? 'success' : 'neutral'}>{idea.status}</Badge>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-md font-semibold text-default">{idea.title}</h2>
                <p className="text-sm text-subtle">{idea.description}</p>
              </div>
              {idea.to && (
                <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                  Open
                  <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-base group-hover:translate-x-0.5" />
                </span>
              )}
            </>
          )

          // §4.8 — hover lift on an interactive card goes surface to classic.
          return idea.to ? (
            <Link key={idea.title} to={idea.to} className="group rounded-lg focus-visible:outline-none focus-visible:shadow-focus">
              <Card className="h-full transition-shadow duration-base hover:shadow-classic">{body}</Card>
            </Link>
          ) : (
            <Card key={idea.title} className="h-full">{body}</Card>
          )
        })}
      </div>
    </div>
  )
}
