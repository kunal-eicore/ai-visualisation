/**
 * The two versions of the Benchmark Gap screen, and the paths they live at.
 *
 * The version is carried in the URL rather than in a provider, which is the
 * one place it differs from the autonomy mode. A mode is transient session
 * state on a run in progress; a version is which screen you are looking at,
 * and the whole reason two of them exist at once is so one can be sent to
 * somebody. A toggle whose state cannot be linked to would defeat that.
 *
 * V1 keeps the bare path so nothing that already points at the screen breaks,
 * and so the version that is not an experiment is the one with no suffix.
 */
export const GAP_BASE = '/evaluation/benchmark-gap'

export type GapVersionId = 'v1' | 'v2' | 'v3'

export type GapVersion = {
  id: GapVersionId
  label: string
  to: string
}

export const GAP_VERSIONS: GapVersion[] = [
  { id: 'v1', label: 'V1', to: GAP_BASE },
  { id: 'v2', label: 'V2', to: `${GAP_BASE}/v2` },
  { id: 'v3', label: 'V3', to: `${GAP_BASE}/v3` },
]

/**
 * Which version a path is on, or null when it is not this screen at all.
 *
 * Longest path first, so `/benchmark-gap/v2` is not claimed by V1's prefix.
 */
export function gapVersionFor(pathname: string): GapVersion | null {
  const ranked = [...GAP_VERSIONS].sort((a, b) => b.to.length - a.to.length)
  return ranked.find((v) => pathname === v.to || pathname.startsWith(`${v.to}/`)) ?? null
}
