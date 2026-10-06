import type { ReactNode } from 'react'
import { InfoTip } from '@/components/InfoTip'
import { cn } from '@/lib/cn'
import type { Tone } from './Badge'

/** §4.15 — the tone's border comes from the Badge palette and the value
 *  takes the tone's /fg. */
const BORDER: Record<Tone, string> = {
  brand: 'border-brand', neutral: 'border-neutral', success: 'border-success',
  info: 'border-info', warning: 'border-warning', alert: 'border-alert', danger: 'border-danger',
}
const FG: Record<Tone, string> = {
  brand: 'text-brand-fg', neutral: 'text-neutral-fg', success: 'text-success-fg',
  info: 'text-info-fg', warning: 'text-warning-fg', alert: 'text-alert-fg', danger: 'text-danger-fg',
}

type MetricCardProps = {
  label: string
  value: string
  tone?: Tone
  /** A Trend Indicator — which is just a Badge (§4.11). */
  trend?: ReactNode
  note?: string
  /** How the number is calculated, shown in the label's "i" tooltip. */
  info?: ReactNode
  /** Flip the tooltip for a card at the right edge of the strip. */
  infoAlign?: 'left' | 'right'
}

/**
 * §4.15 Metric / Stat Card — radius 8, padding 16, gap 6, 1px border.
 * Composes into a KPI strip (gap 12). Pair the value with a Trend
 * Indicator, which carries a lucide trend icon, never an arrow glyph.
 */
export function MetricCard({ label, value, tone = 'neutral', trend, note, info, infoAlign }: MetricCardProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-lg border bg-surface-card p-4 shadow-card', BORDER[tone])}>
      <div className="flex items-center gap-1">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {info && (
          <InfoTip label={label} align={infoAlign}>
            {info}
          </InfoTip>
        )}
      </div>
      <p className={cn('font-mono text-2xl font-bold', FG[tone])}>{value}</p>
      {(trend || note) && (
        <div className="flex flex-wrap items-center gap-2">
          {trend}
          {note && <span className="text-xs text-muted">{note}</span>}
        </div>
      )}
    </div>
  )
}
