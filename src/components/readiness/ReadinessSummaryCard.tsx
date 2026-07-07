import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoading } from '@/components/common/LogoLoading';
import CascadeImpactPanel from '@/components/readiness/CascadeImpactPanel';
import { readinessApi, type RiskWarningsResponse, type ScoreBreakdownResponse } from '@/api/readiness';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export interface ReadinessSummaryCardProps {
  tripId: string;
  onOpenDrawer?: () => void;
  /** 卡片点击是否打开抽屉（默认 true） */
  openDrawerOnCardClick?: boolean;
  className?: string;
}

export default function ReadinessSummaryCard({
  tripId,
  onOpenDrawer,
  openDrawerOnCardClick = true,
  className,
}: ReadinessSummaryCardProps) {
  const { user } = useAuth();
  const [readinessData, setReadinessData] = useState<ScoreBreakdownResponse | null>(null);
  const [tripRiskWarnings, setTripRiskWarnings] = useState<RiskWarningsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReadiness = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const lang = (typeof navigator !== 'undefined' && navigator.language.startsWith('zh')) ? 'zh' : 'en';
      const [readiness, riskWarn] = await Promise.all([
        readinessApi.getScoreBreakdown(tripId),
        readinessApi.getRiskWarnings(tripId, {
          lang,
          userId: user?.id,
          includeCapabilityPackHazards: true,
        }).catch(() => null),
      ]);
      setReadinessData(readiness);
      setTripRiskWarnings(riskWarn);
    } catch (err) {
      console.error('[ReadinessSummaryCard] load failed:', err);
      setReadinessData(null);
      setTripRiskWarnings(null);
    } finally {
      setLoading(false);
    }
  }, [tripId, user?.id]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  const score = readinessData?.score?.overall ?? 0;
  const blockers = readinessData?.summary?.blockers ?? 0;
  const must = readinessData?.summary?.must ?? readinessData?.summary?.warnings ?? 0;
  const should = readinessData?.summary?.should ?? readinessData?.summary?.suggestions ?? 0;
  const totalRisks =
    tripRiskWarnings != null
      ? tripRiskWarnings.summary?.totalRisks ?? tripRiskWarnings.risks?.length ?? 0
      : null;

  const isBlocked = blockers > 0 || score < 60;
  const hasWarnings = must > 0 || (score >= 60 && score < 80);

  return (
    <Card
      data-tour="readiness-summary"
      className={cn(
        openDrawerOnCardClick && onOpenDrawer ? 'cursor-pointer hover:shadow-md transition-all' : '',
        isBlocked
          ? 'border-l-4 border-l-gate-reject-foreground'
          : hasWarnings
            ? 'border-l-4 border-l-warning'
            : readinessData
              ? 'border-l-4 border-l-gate-allow-foreground'
              : '',
        className,
      )}
      onClick={openDrawerOnCardClick && onOpenDrawer ? onOpenDrawer : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck
              className={cn(
                'h-4 w-4',
                isBlocked
                  ? 'text-error'
                  : hasWarnings
                    ? 'text-warning'
                    : readinessData
                      ? 'text-success'
                      : 'text-muted-foreground',
              )}
            />
            准备度检查
          </CardTitle>
          {readinessData ? (
            <div
              className={cn(
                'text-lg font-bold',
                score < 60 ? 'text-error' : score < 80 ? 'text-warning' : 'text-success',
              )}
            >
              {score}
              <span className="text-xs font-normal text-gray-400">/100</span>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <LogoLoading size={24} />
          </div>
        ) : readinessData ? (
          <div className="space-y-3">
            <div
              className={cn(
                'text-sm px-3 py-2 rounded-md text-center font-medium',
                isBlocked
                  ? 'bg-muted text-error'
                  : hasWarnings
                    ? 'bg-muted text-warning'
                    : 'bg-muted text-success',
              )}
            >
              {isBlocked
                ? '需要解决问题才能出发'
                : hasWarnings
                  ? '有待处理的事项'
                  : '✓ 准备就绪'}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded',
                  blockers > 0 ? 'bg-muted text-error' : 'bg-gray-50 text-gray-600',
                )}
              >
                <span className="font-medium">{blockers}</span>
                <span>阻塞</span>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded',
                  must > 0 ? 'bg-muted text-warning' : 'bg-gray-50 text-gray-600',
                )}
              >
                <span className="font-medium">{must}</span>
                <span>必须</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-gray-50 text-gray-600">
                <span className="font-medium">{should}</span>
                <span>建议</span>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded',
                  (totalRisks ?? 0) > 0 ? 'bg-muted text-warning' : 'bg-gray-50 text-gray-600',
                )}
              >
                <span className="font-medium">{totalRisks !== null ? totalRisks : '—'}</span>
                <span>风险</span>
              </div>
            </div>

            {readinessData.cascadeUiHints && readinessData.cascadeUiHints.length > 0 ? (
              <CascadeImpactPanel
                hints={readinessData.cascadeUiHints}
                causalPreAnalysis={readinessData.causalPreAnalysis}
                compact
                showCardActions={false}
              />
            ) : null}

            <div className="flex gap-2">
              {onOpenDrawer ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDrawer();
                  }}
                >
                  快速检查
                </Button>
              ) : null}
              <Button
                variant={onOpenDrawer ? 'default' : 'outline'}
                className="flex-1"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/dashboard/readiness?tripId=${tripId}`;
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                详细页面
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">暂无准备度数据</div>
        )}
      </CardContent>
    </Card>
  );
}
