import type { RecsView } from './coverRecs'

export const RECS_PATH = '/knowledge-graph/recommendations'

export const RECS_VIEWS: { id: RecsView; label: string }[] = [
  { id: 'card', label: 'In card' },
  { id: 'inline', label: 'Inline' },
]

export const recsViewFrom = (params: URLSearchParams): RecsView =>
  params.get('recs') === 'inline' ? 'inline' : 'card'
