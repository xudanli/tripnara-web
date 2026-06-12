import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { agentApi } from '@/api/agent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, History, Shield } from 'lucide-react';
import { RobustnessDashboardPanel } from '@/components/agent/RobustnessDashboardPanel';
import RevisionTimelineDialog from '@/components/agent/RevisionTimelineDialog';
import type { TripRobustnessDashboardResponse } from '@/types/robustness-dashboard';
import { discardReasonLabel } from '@/lib/robustness-dashboard';

export interface TripRobustnessTabPanelProps {
  tripId: string;
}

function statusMessage(status: TripRobustnessDashboardResponse['status']): string {
  switch (status) {
    case 'empty_itinerary':
      return '暂无日程，无法评估鲁棒性。';
    case 'computation_failed':
      return '计算失败，请稍后重试或强制重算。';
    case 'trip_not_found':
      return '行程不存在。';
    case 'cached':
      return '以下为缓存结果。';
    default:
      return '';
  }
}

export function TripRobustnessTabPanel({ tripId }: TripRobustnessTabPanelProps) {
  const queryClient = useQueryClient();
  const [timelineOpen, setTimelineOpen] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['agent', 'robustness_dashboard', tripId],
    queryFn: () => agentApi.getTripRobustnessDashboard(tripId),
    enabled: Boolean(tripId),
  });

  const handleRecompute = async () => {
    try {
      const fresh = await agentApi.getTripRobustnessDashboard(tripId, { recompute: true });
      queryClient.setQueryData(['agent', 'robustness_dashboard', tripId], fresh);
      toast.success('已触发重算');
    } catch {
      toast.error('重算失败');
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">加载鲁棒性数据…</div>;
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-3">
          <p className="text-sm text-destructive">加载失败</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  const res = data as TripRobustnessDashboardResponse | undefined;
  const status = res?.status ?? 'computation_failed';
  const rollout = res?.rollout;
  const alignment = res?.alignment;
  const statusHint = statusMessage(status);

  const canRender = (status === 'ready' || status === 'cached') && rollout;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            行程鲁棒性
          </h2>
          {statusHint ? <p className="text-xs text-muted-foreground mt-0.5">{statusHint}</p> : null}
          {res?.cached_at ? (
            <p className="text-[10px] text-muted-foreground">缓存于 {res.cached_at}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTimelineOpen(true)}>
            <History className="h-4 w-4 mr-1.5" />
            决策时间轴
          </Button>
          <Button variant="outline" size="sm" disabled={isFetching} onClick={handleRecompute}>
            <RefreshCw className={isFetching ? 'h-4 w-4 mr-1.5 animate-spin' : 'h-4 w-4 mr-1.5'} />
            强制重算
          </Button>
        </div>
      </div>

      {canRender ? (
        <RobustnessDashboardPanel
          rollout={rollout}
          dualCurves={res?.dual_curves}
          alignment={alignment}
        />
      ) : status === 'empty_itinerary' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">暂无评估</CardTitle>
            <CardDescription>行程尚无日程节点，完成规划后再查看鲁棒性。</CardDescription>
          </CardHeader>
        </Card>
      ) : status === 'computation_failed' ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">鲁棒性计算未完成</p>
            <Button variant="outline" size="sm" onClick={handleRecompute}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {alignment?.recent_tuples && alignment.recent_tuples.length > 0 ? (
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">近期因果对齐</CardTitle>
            <CardDescription className="text-xs">
              改行程后自动捕获的偏差记录
              {alignment.last_discard_reason
                ? ` · 最近原因：${discardReasonLabel(alignment.last_discard_reason)}`
                : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {alignment.recent_tuples.slice(0, 5).map((t) => (
              <div key={t.tuple_id} className="rounded-md border px-3 py-2 text-xs">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="font-medium">{discardReasonLabel(t.discard_reason)}</span>
                  {t.revision_id ? (
                    <span className="text-muted-foreground font-mono">{t.revision_id.slice(0, 8)}…</span>
                  ) : null}
                  <span className="text-muted-foreground">
                    组织 {Math.round(t.organizational_penalty * 100)}% · 物理{' '}
                    {Math.round(t.physical_penalty * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <RevisionTimelineDialog open={timelineOpen} onOpenChange={setTimelineOpen} tripId={tripId} />
    </div>
  );
}

export default TripRobustnessTabPanel;
