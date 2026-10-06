import { useLocation, useNavigate } from 'react-router-dom'
import { Chip } from '@/components/ui/Chip'
import { GAP_VERSIONS, gapVersionFor } from '@/routes/evaluation/gap/versions'

/**
 * V1 / V2 of the Benchmark Gap screen — two Chips, the same gesture as the
 * autonomy switch beside it (§4.6 owns this: one of a small closed set is on,
 * and §0.5 says compose before you create, so there is still no
 * SegmentedControl).
 *
 * It renders only on that screen, and it decides that itself rather than
 * being gated from `TopBar`: the chrome should not have to know which routes
 * have versions. Where `ModeSwitch` is claimed by the route through a
 * provider, this one reads the URL, because the version IS the URL — see
 * `routes/evaluation/gap/versions.ts`.
 */
export function VersionSwitch() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const active = gapVersionFor(pathname)

  if (!active) return null

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 font-mono text-xs uppercase tracking-wide text-muted">Version</span>
      <div role="group" aria-label="Screen version" className="flex items-center gap-1.5">
        {GAP_VERSIONS.map((v) => (
          <Chip
            key={v.id}
            label={v.label}
            selected={v.id === active.id}
            onClick={() => navigate(v.to)}
          />
        ))}
      </div>
    </div>
  )
}
