import { useSearchParams } from 'react-router-dom'
import { GroupHealthQuotation } from '@/routes/quotation/group-health/GroupHealthQuotation'
import { CoverRecsProvider } from './coverRecs'
import { recsViewFrom } from './views'

/**
 * Knowledge Graph Recommendations: cover recommendations for group insurance
 * quotations, derived from the knowledge graph and historical quotations,
 * each one explainable back through the graph.
 *
 * The journey is the group health quotation itself, mounted here rather than
 * copied, and pinned to Deterministic + AI. This route adds one thing to it:
 * recommendations on Cover Details, in the view the top bar selects. Source
 * data for the graph: ../ai-research/knowledge-graph-dump.
 */
export function Recommendations() {
  const [params] = useSearchParams()
  return (
    <CoverRecsProvider view={recsViewFrom(params)}>
      <GroupHealthQuotation lockedMode="assisted" />
    </CoverRecsProvider>
  )
}
