import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ArrowRight, Sparkles } from 'lucide-react';
// PersonaMode 已移除 - 三人格现在是系统内部工具
import { tripsApi } from '@/api/trips';
import { itineraryOptimizationApi } from '@/api/itinerary-optimization';
import type { TripDetail } from '@/types/trip';
import type { OptimizeRouteRequest, OptimizeRouteResponse } from '@/types/itinerary-optimization';
import { toast } from 'sonner';
import { orchestrator } from '@/services/orchestrator';
import { useAuth } from '@/hooks/useAuth';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import { cn } from '@/lib/utils';
import {
  normalizeGateStatus,
  getGateStatusIcon,
  getGateStatusLabel,
  getGateStatusClasses,
} from '@/lib/gate-status';

interface OptimizeTabProps {
  tripId: string;
}

export default function OptimizeTab({ tripId }: OptimizeTabProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 审批相关状态
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  
  const handleApprovalComplete = async (approved: boolean) => {
    if (approved) {
      toast.success('审批已批准，系统正在继续执行...');
    } else {
      toast.info('审批已拒绝，系统将调整策略');
    }
    setApprovalDialogOpen(false);
    setPendingApprovalId(null);
  };
  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [result, setResult] = useState<OptimizeRouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 跳转到决策评估 Tab
  const handleGoToWorkbench = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'workbench');
    setSearchParams(newParams);
  };

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err) {
      console.error('Failed to load trip:', err);
    }
  };

  const handleOptimize = async () => {
    if (!trip || !trip.TripDay || trip.TripDay.length === 0) {
      toast.error(t('planStudio.optimizeTab.noTripData'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 收集所有地点的 ID
      const placeIds: number[] = [];
      for (const day of trip.TripDay) {
        if (day.ItineraryItem) {
          for (const item of day.ItineraryItem) {
            if (item.placeId && !placeIds.includes(item.placeId)) {
              placeIds.push(item.placeId);
            }
          }
        }
      }

      if (placeIds.length === 0) {
        toast.error(t('planStudio.optimizeTab.noPlaces'));
        return;
      }

      // 获取第一个日期作为配置基础
      const firstDay = trip.TripDay[0];
      const startDate = new Date(firstDay.date);
      const endDate = new Date(trip.endDate);

      // 构建优化请求
      const request: OptimizeRouteRequest = {
        placeIds,
        config: {
          date: firstDay.date,
          startTime: new Date(startDate.setHours(9, 0, 0, 0)).toISOString(),
          endTime: new Date(endDate.setHours(18, 0, 0, 0)).toISOString(),
          pacingFactor: 1.0, // 标准节奏
        },
      };

      // 1. 先调用优化接口
      const optimizeResult = await itineraryOptimizationApi.optimize(request);
      setResult(optimizeResult);

      // 2. 自动触发 LangGraph Orchestrator，系统会自动调用三人格进行检查和调整
      if (user) {
        try {
          const result = await orchestrator.optimizeRoute(user.id, tripId, {
            placeIds,
            config: request.config,
          });
          
          // 检查是否需要审批
          if (result.needsApproval && result.data?.approvalId) {
            const approvalId = result.data.approvalId;
            setPendingApprovalId(approvalId);
            setApprovalDialogOpen(true);
            toast.info('需要您的审批才能继续执行操作');
            return; // 等待审批，不继续执行后续逻辑
          }
          
          if (result.success && result.data) {
            if (result.data.personaAlerts && result.data.personaAlerts.length > 0) {
              toast.info(`系统已自动检查，发现 ${result.data.personaAlerts.length} 条提醒`);
            }
            if (result.data.autoAdjustments && result.data.autoAdjustments.length > 0) {
              toast.success(`系统已自动调整 ${result.data.autoAdjustments.length} 项`);
            }
            if (result.data.explanation) {
              toast.info(result.data.explanation);
            }
          }
        } catch (orchestratorError: any) {
          console.warn('Orchestrator execution failed:', orchestratorError);
          toast.warning('优化成功，但系统自动检查失败', {
            description: '建议手动检查行程是否需要调整',
          });
        }
      }

      toast.success(t('planStudio.optimizeTab.optimizeSuccess'));
    } catch (err: any) {
      console.error('Failed to optimize:', err);
      const errorMessage = err.message || t('planStudio.optimizeTab.optimizeFailed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('planStudio.optimizeTab.title')}</CardTitle>
          <CardDescription>{t('planStudio.optimizeTab.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleOptimize} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                {t('planStudio.optimizeTab.optimizing')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {t('planStudio.optimizeTab.generatePlan')}
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            {t('planStudio.optimizeTab.description')}
          </p>
          
          {/* 引导提示：前往决策评估 Tab */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    {t('planStudio.optimizeTab.workbenchHint.title')}
                  </p>
                  <p className="text-xs text-blue-700 mb-3">
                    {t('planStudio.optimizeTab.workbenchHint.description')}
                  </p>
                  <Button
                    onClick={handleGoToWorkbench}
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    {t('planStudio.optimizeTab.workbenchHint.action')}
                    <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Card className={cn('border', getGateStatusClasses('REJECT'))}>
              <CardContent className="pt-6">
                <div className={cn('flex items-center gap-2', getGateStatusClasses('REJECT').split(' ').find(cls => cls.startsWith('text-')))}>
                  {(() => {
                    const ErrorIcon = getGateStatusIcon('REJECT');
                    return <ErrorIcon className="h-5 w-5" />;
                  })()}
                  <span className="font-medium">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <div className="space-y-4 mt-6">
              <Card className={cn('border', getGateStatusClasses('ALLOW'))}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                      {(() => {
                        const SuccessIcon = getGateStatusIcon('ALLOW');
                        return <SuccessIcon className={cn('h-5 w-5', getGateStatusClasses('ALLOW').split(' ').find(cls => cls.startsWith('text-')))} />;
                      })()}
                    <span className="font-medium">{t('planStudio.optimizeTab.optimizeComplete')}</span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t('planStudio.optimizeTab.happinessScore')}: {result.happinessScore.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              {result.schedule && result.schedule.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('planStudio.optimizeTab.optimizedSchedule')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.schedule.map((item, idx) => {
                        const node = result.nodes[item.nodeIndex];
                        return (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <div className="font-medium">{node?.name || `Node ${item.nodeIndex}`}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(item.startTime).toLocaleTimeString()} - {new Date(item.endTime).toLocaleTimeString()}
                        </div>
                    </div>
                            {item.transportTime && (
                              <Badge variant="outline">{item.transportTime} min</Badge>
                            )}
                        </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {result.scoreBreakdown && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('planStudio.optimizeTab.scoreBreakdown')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t('planStudio.optimizeTab.interestScore')}</span>
                        <span className="font-medium">{result.scoreBreakdown.interestScore.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('planStudio.optimizeTab.distancePenalty')}</span>
                        <span className="font-medium">{result.scoreBreakdown.distancePenalty.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('planStudio.optimizeTab.clusteringBonus')}</span>
                        <span className="font-medium">{result.scoreBreakdown.clusteringBonus.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 审批对话框 */}
      {pendingApprovalId && (
        <ApprovalDialog
          approvalId={pendingApprovalId}
          open={approvalDialogOpen}
          onOpenChange={(open: boolean) => {
            setApprovalDialogOpen(open);
            if (!open) {
              setPendingApprovalId(null);
            }
          }}
          onDecision={handleApprovalComplete}
        />
      )}
    </div>
  );
}

