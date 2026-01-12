import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
// PersonaMode 已移除 - 三人格现在是系统内部工具
import { tripsApi } from '@/api/trips';
import { itineraryOptimizationApi } from '@/api/itinerary-optimization';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import type { TripDetail } from '@/types/trip';
import type { OptimizeRouteRequest, OptimizeRouteResponse } from '@/types/itinerary-optimization';
import type { ExecutePlanningWorkbenchResponse, ConsolidatedDecisionStatus } from '@/api/planning-workbench';
import { toast } from 'sonner';
import { orchestrator } from '@/services/orchestrator';
import { useAuth } from '@/hooks/useAuth';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import PersonaCard from '@/components/planning-workbench/PersonaCard';
import { cn } from '@/lib/utils';

interface OptimizeTabProps {
  tripId: string;
}

export default function OptimizeTab({ tripId }: OptimizeTabProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
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
  
  // 规划工作台相关状态
  const [workbenchResult, setWorkbenchResult] = useState<ExecutePlanningWorkbenchResponse | null>(null);
  const [loadingWorkbench, setLoadingWorkbench] = useState(false);
  const [workbenchError, setWorkbenchError] = useState<string | null>(null);
  const [showWorkbench, setShowWorkbench] = useState(false);

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
        }
      }

      toast.success(t('planStudio.optimizeTab.optimizeSuccess'));
      
      // 优化成功后，自动触发规划工作台评估（可选）
      // 用户也可以手动点击"执行规划"按钮
    } catch (err: any) {
      console.error('Failed to optimize:', err);
      const errorMessage = err.message || t('planStudio.optimizeTab.optimizeFailed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePlanning = async () => {
    if (!trip) {
      toast.error('请先加载行程信息');
      return;
    }

    setLoadingWorkbench(true);
    setWorkbenchError(null);

    try {
      // 构建规划上下文
      const destinationParts = trip.destination?.split(',') || [];
      const country = destinationParts[0]?.trim().toUpperCase() || '';
      const city = destinationParts.length > 1 ? destinationParts.slice(1).join(',').trim() : undefined;

      const days = trip.TripDay?.length || 0;
      if (days === 0) {
        toast.error('行程天数不能为0，请先设置行程日期');
        return;
      }

      const constraints: any = {};
      if (trip.totalBudget) {
        constraints.budget = {
          total: trip.totalBudget,
          currency: 'CNY',
        };
      }

      // 调用规划工作台 API
      const response = await planningWorkbenchApi.execute({
        context: {
          destination: {
            country,
            city,
          },
          days,
          travelMode: 'mixed',
          constraints: Object.keys(constraints).length > 0 ? constraints : undefined,
        },
        tripId,
        userAction: 'generate',
      });

      setWorkbenchResult(response);
      setShowWorkbench(true);
      toast.success('规划工作台执行成功');
    } catch (err: any) {
      console.error('Planning workbench execution failed:', err);
      const errorMessage = err.message || '执行规划工作台失败，请稍后重试';
      setWorkbenchError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingWorkbench(false);
    }
  };

  const getConsolidatedDecisionStyle = (status: ConsolidatedDecisionStatus) => {
    switch (status) {
      case 'ALLOW':
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          label: '通过',
          className: 'bg-green-50 text-green-700 border-green-200',
        };
      case 'NEED_CONFIRM':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          label: '需确认',
          className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        };
      case 'REJECT':
        return {
          icon: <XCircle className="w-5 h-5" />,
          label: '拒绝',
          className: 'bg-red-50 text-red-700 border-red-200',
        };
      default:
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          label: status,
          className: 'bg-gray-50 text-gray-700 border-gray-200',
        };
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={handleOptimize} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  {t('planStudio.optimizeTab.optimizing')}
                </>
              ) : (
                t('planStudio.optimizeTab.generatePlan')
              )}
            </Button>
            <Button 
              onClick={handleExecutePlanning} 
              disabled={loadingWorkbench || !trip}
              variant="outline"
              className="w-full"
            >
              {loadingWorkbench ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  执行中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  执行规划
                </>
              )}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            优化路线顺序后，可点击"执行规划"让三人格（Abu/Dr.Dre/Neptune）评估行程方案的可行性
          </p>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-800">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <div className="space-y-4 mt-6">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
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

      {/* 规划工作台错误提示 */}
      {workbenchError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">规划工作台执行失败</p>
                <p className="text-sm text-red-700 mt-1">{workbenchError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 规划工作台结果展示 */}
      {workbenchResult && showWorkbench && (
        <div className="space-y-6">
          {/* 综合决策 */}
          {workbenchResult.uiOutput.consolidatedDecision && (
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>规划工作台 - 综合决策</CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1',
                      getConsolidatedDecisionStyle(workbenchResult.uiOutput.consolidatedDecision.status)
                        .className
                    )}
                  >
                    {getConsolidatedDecisionStyle(workbenchResult.uiOutput.consolidatedDecision.status).icon}
                    {getConsolidatedDecisionStyle(workbenchResult.uiOutput.consolidatedDecision.status).label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {workbenchResult.uiOutput.consolidatedDecision.summary}
                </p>
                {workbenchResult.uiOutput.consolidatedDecision.nextSteps &&
                  workbenchResult.uiOutput.consolidatedDecision.nextSteps.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">下一步：</p>
                      <ul className="space-y-1">
                        {workbenchResult.uiOutput.consolidatedDecision.nextSteps.map((step, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {/* 三人格输出 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PersonaCard persona={workbenchResult.uiOutput.personas.abu} />
            <PersonaCard persona={workbenchResult.uiOutput.personas.drdre} />
            <PersonaCard persona={workbenchResult.uiOutput.personas.neptune} />
          </div>
        </div>
      )}
      
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

