import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'

/** Human labels for known path segments; falls back to title-casing. */
const SEGMENT_LABELS: Record<string, string> = {
  overview: 'Overview',
  evaluation: 'Evaluation',
  'shadow-parity': 'Shadow Parity',
  workbench: 'Eval Workbench',
  copilot: 'Copilot',
  'uw-agent': 'UW Agent',
  autonomous: 'Fully Autonomous',
  settings: 'Agent settings',
}

function labelFor(segment: string) {
  return (
    SEGMENT_LABELS[segment] ??
    segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

/** §5 Breadcrumb — derived from URL segments. Root crumb is the product
 *  name; the current crumb is brand-coloured and semibold. */
export function Breadcrumb() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs = [
    { label: 'AI Visualisation', to: '/overview' },
    ...segments.map((seg, i) => ({
      label: labelFor(seg),
      to: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ]

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <Fragment key={crumb.to}>
            {i > 0 && <span className="text-muted">/</span>}
            <Link
              to={crumb.to}
              className={cn(
                'truncate rounded-sm transition-colors focus-visible:outline-none focus-visible:shadow-focus',
                isLast ? 'font-semibold text-brand' : 'text-muted hover:text-default',
              )}
            >
              {crumb.label}
            </Link>
          </Fragment>
        )
      })}
    </nav>
  )
}
