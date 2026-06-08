import { useState, useEffect, useMemo, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Sparkles, Zap, Settings2 } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import { itineraryOptimizationApi } from '@/api/itinerary-optimization';
import type { TripDetail } from '@/types/trip';
import type { OptimizeRouteRequest, OptimizeRouteResponse } from '@/types/itinerary-optimization';
import { INTENT_TRAVEL_MODE_MAP } from '@/constants/itinerary-optimization';
import { toast } from 'sonner';
import { orchestrator } from '@/services/orchestrator';
import { useAuth } from '@/hooks/useAuth';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import { cn } from '@/lib/utils';
import {
  getGateStatusIcon,
  getGateStatusClasses,
} from '@/lib/gate-status';
import { OptimizationWorkbench } from '@/components/optimization';
import { tripDetailToRoutePlanDraft } from '@/utils/plan-converters';
import { buildWorldModelContext } from '@/utils/world-context-builder';
import { useFitnessContext } from '@/contexts/FitnessContext';
import PlanStudioContext from '@/contexts/PlanStudioContext';

interface OptimizeTabProps {
  tripId: string;
}

export default function OptimizeTab({ tripId }: OptimizeTabProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'smart' | 'classic'>('smart');
  
  // 体能上下文
  const { profile: fitnessProfile } = useFitnessContext();
  
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
  
  // 转换为 V2 优化 API 格式
  const plan = useMemo(() => {
    if (!trip) return null;
    return tripDetailToRoutePlanDraft(trip);
  }, [trip]);
  
  const world = useMemo(() => {
    if (!trip) return null;
    return buildWorldModelContext(trip, {
      fitnessProfile,
    });
  }, [fitnessProfile, trip]);
  
  const planStudioContext = useContext(PlanStudioContext);

  // 打开方案预览与提交抽屉（原决策评估 Tab）
  const handleGoToWorkbench = () => {
    if (planStudioContext?.openPlanGate) {
      planStudioContext.openPlanGate();
      return;
    }
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'schedule');
    newParams.set('planGate', '1');
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

      // 从行程设置推导优化配置（与行程设置联动）
      const travelers = trip.pacingConfig?.travelers ?? [];
      const hasChildren = travelers.some((t) => t.type === 'CHILD');
      const hasElderly = travelers.some((t) => t.type === 'ELDERLY');
      let defaultTravelMode: 'TRANSIT' | 'WALKING' | 'DRIVING' | undefined;
      try {
        const intent = await tripsApi.getIntent(tripId);
        const rawMode = intent.pacingConfig?.travelMode;
        defaultTravelMode = rawMode ? INTENT_TRAVEL_MODE_MAP[String(rawMode)] : undefined;
      } catch {
        defaultTravelMode = undefined;
      }
      const transportPreferences = hasElderly ? { lessWalking: true } : undefined;

      // 构建优化请求
      const request: OptimizeRouteRequest = {
        placeIds,
        config: {
          date: firstDay.date,
          startTime: new Date(startDate.setHours(9, 0, 0, 0)).toISOString(),
          endTime: new Date(endDate.setHours(18, 0, 0, 0)).toISOString(),
          pacingFactor: 1.0, // 标准节奏
          hasChildren,
          hasElderly,
          defaultTravelMode,
          transportPreferences,
        },
        tripId,
        dayId: firstDay.id,
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


  // 处理优化完成
  const handleOptimized = () => {
    toast.success('已应用优化方案');
    loadTrip();
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'smart' | 'classic')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="smart" className="gap-2">
            <Zap className="h-4 w-4" />
            智能优化
          </TabsTrigger>
          <TabsTrigger value="classic" className="gap-2">
            <Settings2 className="h-4 w-4" />
            经典模式
          </TabsTrigger>
        </TabsList>
        
        {/* 智能优化 Tab - 使用新的 OptimizationWorkbench */}
        <TabsContent value="smart" className="mt-4">
          {trip && plan && world ? (
            <OptimizationWorkbench
              plan={plan}
              world={world}
              tripId={tripId}
              onOptimized={handleOptimized}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Spinner className="w-6 h-6 mx-auto mb-2" />
                <p>加载行程数据中...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* 经典优化 Tab - 保留原有功能 */}
        <TabsContent value="classic" className="mt-4">
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

          <Link to={`/dashboard/trips/optimize?tripId=${tripId}`}>
            <Button variant="outline" className="w-full" size="sm">
              前往完整优化页（可选地点、交通方式等）
            </Button>
          </Link>
          
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

