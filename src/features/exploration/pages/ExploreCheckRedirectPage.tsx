/**
 * 旧 /check 路径 — 执行检查后重定向到修复方案页
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExploreFlowLayout } from '@/features/exploration/components/ExploreFlowLayout';
import { exploreBasePath } from '@/features/exploration/constants';
import { runExplorationCheckFlow } from '@/features/exploration/lib/exploration-check-flow.util';
import { toApiRouteId } from '@/features/exploration/lib/route-id.util';
import { useExplorationFlow } from '@/features/exploration/hooks/useExplorationFlow';
import { useExplorationTravelContext } from '@/features/exploration/context/ExplorationTravelContext';

export default function ExploreCheckRedirectPage() {
  const { scenarioId = '', routeId = 'highland-south' } = useParams<{
    scenarioId: string;
    routeId: string;
  }>();
  const navigate = useNavigate();
  const base = exploreBasePath(scenarioId);
  const { flow } = useExplorationFlow(scenarioId);
  const travelContext = useExplorationTravelContext();
  const apiRouteId = toApiRouteId(flow.selectedRouteId ?? routeId);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await runExplorationCheckFlow({
          scenarioId,
          apiRouteId,
          base,
          navigate,
          flow,
          replace: true,
          travelContextProvider: travelContext.enabled ? travelContext.getProvider() : null,
        });
      } catch (err) {
        if (cancelled) return;
        setFailed(true);
        toast.error(err instanceof Error ? err.message : '检查失败');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scenarioId, apiRouteId, base, navigate, flow.sessionId, flow.researchProtocolId, flow.assignedVariant, flow.tripId, flow.selectedRouteId]);

  return (
    <ExploreFlowLayout
      scenarioId={scenarioId}
      currentStep="decision"
      title={failed ? '检查未完成' : '正在检查路线…'}
      subtitle={failed ? '请返回路线详情重试。' : '即将进入风险与修复方案。'}
      onBack={() => navigate(`${base}/routes/${encodeURIComponent(apiRouteId)}`)}
    >
      {!failed && (
        <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在核对道路通行、时间与旅行条件…
        </p>
      )}
    </ExploreFlowLayout>
  );
}
