import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TravelStatusSection from '@/components/travel-status/TravelStatusSection';
import TravelStatusMonitoringSection from '@/components/travel-status/TravelStatusMonitoringSection';
import TravelStatusEffectivePlanCard from '@/components/travel-status/TravelStatusEffectivePlanCard';
import TravelStatusAiWorkTimeline from '@/components/travel-status/TravelStatusAiWorkTimeline';
import TravelStatusAutomationSummary from '@/components/travel-status/TravelStatusAutomationSummary';
import { TripCtreStructuredProgressSection, shouldShowTripCtrePanel } from '@/features/agent/ctre';
import { useTravelStatusSurface } from '@/hooks/useTravelStatusSurface';
import { buildTripAiActivityLogPath, buildTripContextSnapshotPath } from '@/lib/travel-status-navigation.util';
import { TripDetailTwoColumn } from '../trip-detail-ui';

interface TripDetailMonitoringCenterTabProps {
  tripId: string;
}

/** 监控中心 — 持续监控 + 有效行程 + AI 活动 */
export default function TripDetailMonitoringCenterTab({ tripId }: TripDetailMonitoringCenterTabProps) {
  const navigate = useNavigate();

  const {
    status,
    isLoading,
    error,
    isUnavailable,
    monitoringAlerts,
    isScanning,
    handleRefreshMonitoring,
    refresh,
  } = useTravelStatusSurface(tripId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LogoLoading />
      </div>
    );
  }

  if (error && isUnavailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">监控中心暂不可用</CardTitle>
          <CardDescription>travel-status 接口尚未就绪。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error || !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">加载失败</CardTitle>
          <CardDescription>{(error as Error)?.message ?? '无法获取旅行状态'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" onClick={() => void refresh()}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  const aiWorkCount = status.aiCompletedWork?.items?.length ?? 0;

  return (
    <TripDetailTwoColumn
      main={
        <div className="space-y-4">
          <TravelStatusSection
            id="travel-monitoring"
            title="TripNARA 正在持续关注"
            description={
              monitoringAlerts > 0
                ? `${monitoringAlerts} 项活跃监控 · 变化时会通知你`
                : '天气、路况等变化时自动跟踪'
            }
          >
            <TravelStatusMonitoringSection
              items={status.monitoring?.items ?? []}
              activeCount={monitoringAlerts}
              onRefresh={() => void handleRefreshMonitoring()}
              isRefreshing={isScanning}
            />
          </TravelStatusSection>

          <TravelStatusSection title="当前可执行行程">
            <TravelStatusEffectivePlanCard
              plan={status.effectivePlan}
              onOpenPlanStudio={() => navigate(`/dashboard/plan-studio?tripId=${tripId}`)}
            />
          </TravelStatusSection>
        </div>
      }
      sidebar={
        <div className="space-y-4 lg:sticky lg:top-4">
          {shouldShowTripCtrePanel(tripId) ? (
            <TravelStatusSection
              title="CTRE 行程结构化"
              description="最近一次旅行编译进度"
            >
              <TripCtreStructuredProgressSection
                tripId={tripId}
                compact
                onOpenPlanStudio={() =>
                  navigate(`/dashboard/plan-studio?tripId=${encodeURIComponent(tripId)}`)
                }
              />
            </TravelStatusSection>
          ) : null}

          <TravelStatusSection
            title="AI 已完成的工作"
            description="自动处理与您的确认记录"
            action={
              aiWorkCount > 0 ? (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-[11px] text-muted-foreground"
                  onClick={() => navigate(buildTripAiActivityLogPath(tripId))}
                >
                  查看全部
                </Button>
              ) : undefined
            }
          >
            <TravelStatusAiWorkTimeline items={status.aiCompletedWork?.items ?? []} />
          </TravelStatusSection>

          <TravelStatusAutomationSummary automation={status.automation} tripId={tripId} />

          {status.contextSnapshot?.revision != null ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full text-xs text-muted-foreground"
              onClick={() => navigate(buildTripContextSnapshotPath(tripId))}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              决策依据 · 上下文 v{status.contextSnapshot.revision}
            </Button>
          ) : null}
        </div>
      }
    />
  );
}
