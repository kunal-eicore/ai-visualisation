import { useSearchParams } from 'react-router-dom'
import { Chip } from '@/components/ui/Chip'
import { RECS_VIEWS, recsViewFrom } from '@/routes/knowledge-graph/views'

/**
 * Which of the two recommendation treatments the covers step shows. Held in
 * the URL like the other top-bar switches, so a view can be sent to someone;
 * In card is the bare URL. TopBar decides where it renders.
 */
export function RecsViewSwitch() {
  const [params, setParams] = useSearchParams()
  const active = recsViewFrom(params)

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 font-mono text-xs uppercase tracking-wide text-muted">Recommendations</span>
      <div role="group" aria-label="Recommendations view" className="flex items-center gap-1.5">
        {RECS_VIEWS.map((v) => (
          <Chip
            key={v.id}
            label={v.label}
            selected={v.id === active}
            onClick={() => {
              const next = new URLSearchParams(params)
              if (v.id === 'card') next.delete('recs')
              else next.set('recs', v.id)
              setParams(next)
            }}
          />
        ))}
      </div>
    </div>
  )
}
