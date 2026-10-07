import { Bot, Cable, GitCompareArrows, LayoutDashboard, Orbit, ScrollText, type LucideIcon } from 'lucide-react'

export type NavChild = {
  label: string
  to: string
  /** Keep the row marked on the screen's sub-paths too. Set it where a route
   *  has versions or steps below it, so the nav does not go blank on a screen
   *  you are still standing in. Defaults to an exact match. */
  deep?: boolean
}
export type NavItem = { label: string; icon: LucideIcon; to: string; children?: NavChild[] }

/*
 * The nav model is the app-specific part of the chrome (DESIGN.md §02) —
 * keep the shape, replace the contents.
 *
 * This project is a sandbox for AI visualisation ideas, so the nav lists
 * only what actually exists. To add an idea: build the route, then add an
 * entry here. Group related explorations under `children` once a second
 * one lands, the way `Evaluation` does.
 */
export const PRIMARY_NAV: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard, to: '/overview' },
  {
    label: 'Evaluation',
    icon: GitCompareArrows,
    to: '/evaluation',
    children: [
      { label: 'Benchmark Gap', to: '/evaluation/benchmark-gap', deep: true },
      { label: 'Shadow Parity', to: '/evaluation/shadow-parity' },
      { label: 'Workbench', to: '/evaluation/workbench' },
    ],
  },
  {
    label: 'Harness',
    icon: Cable,
    to: '/harness',
    children: [
      { label: 'Model Setup', to: '/harness/setup' },
      { label: 'Connectors', to: '/harness/connectors' },
    ],
  },
  {
    label: 'Quotation',
    icon: ScrollText,
    to: '/quotation',
    children: [{ label: 'Group Health', to: '/quotation/group-health' }],
  },
  { label: 'Fully Autonomous', icon: Orbit, to: '/autonomous' },
  {
    label: 'Copilot',
    icon: Bot,
    to: '/copilot',
    children: [{ label: 'UW Agent', to: '/copilot/uw-agent' }],
  },
]

/** Secondary nav, separated by a divider. Empty for now — the divider and
 *  block render only when this has entries. */
export const SECONDARY_NAV: NavItem[] = []
