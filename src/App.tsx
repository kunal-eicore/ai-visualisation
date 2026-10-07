import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Overview } from '@/routes/Overview'
import { BenchmarkGap } from '@/routes/evaluation/gap/BenchmarkGap'
import { BenchmarkGapV2 } from '@/routes/evaluation/gap/BenchmarkGapV2'
import { BenchmarkGapV3 } from '@/routes/evaluation/gap/v3/BenchmarkGapV3'
import { ShadowParity } from '@/routes/evaluation/ShadowParity'
import { Workbench } from '@/routes/evaluation/workbench/Workbench'
import { UwAgent } from '@/routes/copilot/UwAgent'
import { Harness } from '@/routes/harness/Harness'
import { Connectors } from '@/routes/harness/connectors/Connectors'
import { Autonomous } from '@/routes/autonomous/Autonomous'
import { GroupHealthQuotation } from '@/routes/quotation/group-health/GroupHealthQuotation'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        {/* Group index redirects to the group's only built exploration. */}
        <Route path="evaluation" element={<Navigate to="/evaluation/benchmark-gap" replace />} />
        <Route path="evaluation/shadow-parity" element={<ShadowParity />} />
        {/* V1 keeps the bare path; the version lives in the URL so it can be
            linked. See routes/evaluation/gap/versions.ts. */}
        <Route path="evaluation/benchmark-gap" element={<BenchmarkGap />} />
        <Route path="evaluation/benchmark-gap/v2" element={<BenchmarkGapV2 />} />
        <Route path="evaluation/benchmark-gap/v3" element={<BenchmarkGapV3 />} />
        <Route path="evaluation/workbench" element={<Workbench />} />
        <Route path="harness" element={<Navigate to="/harness/setup" replace />} />
        <Route path="harness/setup" element={<Harness />} />
        <Route path="harness/connectors" element={<Connectors />} />
        <Route path="quotation" element={<Navigate to="/quotation/group-health" replace />} />
        <Route path="quotation/group-health" element={<GroupHealthQuotation />} />
        <Route path="autonomous" element={<Autonomous />} />
        <Route path="copilot" element={<Navigate to="/copilot/uw-agent" replace />} />
        <Route path="copilot/uw-agent" element={<UwAgent />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  )
}
