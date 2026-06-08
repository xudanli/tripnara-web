/**
 * 优化仪表盘组件
 * 
 * 简化版：一键优化 + 结果展示 + 权重调整
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { PlanEvaluationCard } from './PlanEvaluationCard';
import { PlanComparisonView } from './PlanComparisonView';
import { RiskAssessmentCard } from './RiskAssessmentCard';
import { NegotiationResultCard } from './NegotiationResultCard';
import { RealtimeStatusBanner } from './RealtimeStatusBanner';

import {
  useEvaluatePlan,
  useComparePlans,
  useOptimizePlan,
  useNegotiation,
  useRiskAssessment,
  useRealtimeState,
  useFullOptimizationFlow,
} from '@/hooks/useOptimizationV2';

import type {
  RoutePlanDraft,
  EvaluatePlanResponse,
  OptimizePlanResponse,
  NegotiationResponse,
  RiskAssessmentResponse,
  ComparePlansResponse,
  ObjectiveFunctionWeights,
} from '@/types/optimization-v2';
import { DEFAULT_WEIGHTS, DIMENSION_LABELS } from '@/types/optimization-v2';
import type { WorldModelContext } from '@/types/optimization-v2';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Zap,
  RefreshCw,
  AlertCircle,
  GitCompare,
  Settings2,
} from 'lucide-react';
import { SmartOptimizationIllustration } from '@/components/illustrations';

// ==================== 类型 ====================

export interface OptimizationDashboardProps {
  /** 当前计划 */
  plan: RoutePlanDraft;
  /** 世界模型上下文 */
  world: WorldModelContext;
  /** 行程 ID（用于实时状态） */
  tripId?: string;
  /** 行程状态（只有 IN_PROGRESS 才显示实时状态） */
  tripStatus?: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  /** 优化完成回调 */
  onOptimized?: (optimizedPlan: RoutePlanDraft) => void;
  /** 自定义类名 */
  className?: string;
}

// ==================== 子组件 ====================

/** 加载骨架 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

/** 错误展示 */
function ErrorDisplay({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <p className="text-lg font-medium mb-2">发生错误</p>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          重试
        </Button>
      )}
    </div>
  );
}

// ==================== 主组件 ====================

export function OptimizationDashboard({
  plan,
  world,
  tripId,
  tripStatus,
  onOptimized,
  className,
}: OptimizationDashboardProps) {
  // ==================== 状态 ====================
  const [evaluation, setEvaluation] = React.useState<EvaluatePlanResponse | null>(null);
  const [optimized, setOptimized] = React.useState<OptimizePlanResponse | null>(null);
  const [negotiation, setNegotiation] = React.useState<NegotiationResponse | null>(null);
  const [riskAssessment, setRiskAssessment] = React.useState<RiskAssessmentResponse | null>(null);
  const [comparison, setComparison] = React.useState<ComparePlansResponse | null>(null);
  const [compareDialogOpen, setCompareDialogOpen] = React.useState(false);
  const [compareCorrelationId, setCompareCorrelationId] = React.useState<string | null>(null);
  const [customWeights, setCustomWeights] = React.useState<ObjectiveFunctionWeights | null>(null);
  const [weightsPopoverOpen, setWeightsPopoverOpen] = React.useState(false);

  // ==================== Hooks ====================
  const evaluateMutation = useEvaluatePlan();
  const compareMutation = useComparePlans();
  const optimizeMutation = useOptimizePlan();
  const negotiationMutation = useNegotiation();
  const riskMutation = useRiskAssessment();
  const { runFullFlow, isLoading: isFullFlowLoading } = useFullOptimizationFlow();

  // 实时状态
  const { 
    data: realtimeState, 
    refetch: refetchRealtime,
    isLoading: realtimeLoading,
    isFetching: realtimeFetching,
  } = useRealtimeState(tripId, { enabled: !!tripId });

  // ==================== 操作 ====================

  /** 方案对比（原计划 vs 优化后） */
  const handleCompare = async () => {
    if (!optimized?.plan) return;
    try {
      const result = await compareMutation.mutateAsync({
        planA: plan,
        planB: optimized.plan,
        world,
      });
      const cid =
        typeof globalThis.crypto?.randomUUID === 'function'
          ? globalThis.crypto.randomUUID()
          : `tradeoff-${Date.now()}`;
      setCompareCorrelationId(cid);
      setComparison(result);
      setCompareDialogOpen(true);
    } catch (error) {
      toast.error('方案对比失败');
    }
  };

  /** 一键完整流程 */
  const handleFullFlow = async () => {
    try {
      const result = await runFullFlow(plan, world, tripId);
      setEvaluation(result.originalEvaluation);
      setOptimized(result.optimization);
      setRiskAssessment(result.riskAssessment);
      setNegotiation(result.negotiation);
      if (result.optimization.plan) {
        onOptimized?.(result.optimization.plan);
      }
      toast.success('完整优化流程完成');
    } catch (error) {
      toast.error('优化流程失败');
    }
  };

  // ==================== 渲染 ====================

  const isAnyLoading = evaluateMutation.isPending || 
                       compareMutation.isPending ||
                       optimizeMutation.isPending || 
                       negotiationMutation.isPending ||
                       riskMutation.isPending ||
                       isFullFlowLoading;

  // 是否有结果数据
  const hasResults = evaluation || optimized || negotiation;

  return (
    <div className={cn('space-y-4', className)}>
      {/* 实时状态横幅 - 只在执行阶段显示 */}
      {tripId && tripStatus === 'IN_PROGRESS' && (
        <RealtimeStatusBanner
          state={realtimeState}
          connected={!realtimeLoading}
          onRefresh={() => refetchRealtime()}
          refreshing={realtimeFetching}
          collapsible
        />
      )}

      {/* ==================== 空状态：引导用户开始 ==================== */}
      {!hasResults && !isAnyLoading && (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto flex items-center justify-center text-foreground">
                <SmartOptimizationIllustration
                  size={80}
                  strokeColor="currentColor"
                  highlightColor="#DC2626"
                />
              </div>
              <div>
                <h3 className="font-semibold text-lg">智能优化行程</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  AI 将自动评估当前计划，并生成更优的行程方案
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                {/* 调整权重（放在开始优化上方） */}
                <Popover open={weightsPopoverOpen} onOpenChange={setWeightsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isAnyLoading}
                      className={cn('gap-1', customWeights && 'border-primary text-primary')}
                    >
                      <Settings2 className="h-4 w-4" />
                      {customWeights ? '已自定义权重' : '调整权重'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="center">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">自定义评估权重</h4>
                      <p className="text-xs text-muted-foreground">调整各维度权重后重新优化生效</p>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {(Object.keys(DEFAULT_WEIGHTS) as (keyof ObjectiveFunctionWeights)[]).map((key) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-xs flex justify-between">
                              <span>{DIMENSION_LABELS[key]}</span>
                              <span className="tabular-nums">
                                {Math.round((customWeights ?? DEFAULT_WEIGHTS)[key] * 100)}%
                              </span>
                            </Label>
                            <Slider
                              value={[(customWeights ?? DEFAULT_WEIGHTS)[key] * 100]}
                              onValueChange={([v]) =>
                                setCustomWeights((prev) => ({
                                  ...(prev ?? DEFAULT_WEIGHTS),
                                  [key]: v / 100,
                                }))
                              }
                              min={0}
                              max={100}
                              step={5}
                              className="py-2"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCustomWeights(null);
                            setWeightsPopoverOpen(false);
                          }}
                        >
                          重置默认
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setWeightsPopoverOpen(false)}
                        >
                          确定
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {/* 开始优化按钮 */}
                <Button
                  onClick={handleFullFlow}
                  size="lg"
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  开始优化
                </Button>
                <p className="text-xs text-muted-foreground">
                  预计耗时 10-30 秒
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== 加载状态 ==================== */}
      {isAnyLoading && !hasResults && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto flex items-center justify-center animate-pulse text-foreground">
                <SmartOptimizationIllustration
                  size={80}
                  strokeColor="currentColor"
                  highlightColor="#DC2626"
                />
              </div>
              <div>
                <h3 className="font-semibold">正在分析优化...</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {evaluateMutation.isPending && '评估当前计划...'}
                  {optimizeMutation.isPending && '生成优化方案...'}
                  {negotiationMutation.isPending && '三守护者协商中...'}
                  {riskMutation.isPending && '评估风险...'}
                </p>
              </div>
              <LoadingSkeleton />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== 有结果：显示对比和操作 ==================== */}
      {hasResults && (
        <>
          {/* 三人格协商结果 */}
          {negotiation && (
            <NegotiationResultCard
              result={negotiation}
              tripId={tripId}
              compact
              title="三守护者协商"
            />
          )}

          {/* 评估结果对比 */}
          <div className="grid gap-3 lg:grid-cols-2">
            {evaluation && (
              <PlanEvaluationCard
                evaluation={evaluation}
                compareEvaluation={optimized ? {
                  ...evaluation,
                  totalUtility: optimized.summary?.finalUtility ?? evaluation.totalUtility,
                } : undefined}
                title="原计划评估"
                showWeights
                compact
              />
            )}
            {optimized && (
              <>
                {!optimized.plan ? (
                  <Card>
                    <CardContent className="py-6 text-center">
                      <div className="w-8 h-8 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                        <RefreshCw className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="font-medium text-sm">当前计划已较优</p>
                      <p className="text-xs text-muted-foreground">无需额外优化</p>
                    </CardContent>
                  </Card>
                ) : (() => {
                  const improvementPct = optimized.summary?.improvementPct;
                  const pctStr = improvementPct != null ? improvementPct.toFixed(1) : '—';
                  const changeCount = optimized.summary?.changeCount ?? optimized.logs?.length ?? 0;
                  const utilityDecreased = optimized.summary?.utilityDecreased ?? (improvementPct != null && improvementPct < 0);
                  let desc = `效用提升 ${pctStr}%，共 ${changeCount} 项变更`;
                  if (utilityDecreased) {
                    desc += '。本次以满足约束为主，综合评分略有下降。';
                  }
                  return (
                    <PlanEvaluationCard
                      evaluation={{
                        totalUtility: optimized.summary?.finalUtility ?? (evaluation?.totalUtility ?? 0),
                        breakdown: evaluation?.breakdown ?? {} as any,
                        weightedScores: evaluation?.weightedScores ?? {} as any,
                        weightsUsed: evaluation?.weightsUsed ?? {} as any,
                      }}
                      title="优化后计划"
                      description={desc}
                      compact
                    />
                  );
                })()}
              </>
            )}
          </div>

          {/* 风险评估 */}
          {riskAssessment && (
            <RiskAssessmentCard
              assessment={riskAssessment}
              compact
              showFactors
              maxFactors={3}
              title="风险评估"
            />
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {optimized?.plan && (
              <Button
                size="sm"
                onClick={() => optimized.plan && onOptimized?.(optimized.plan)}
                className="gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" />
                应用优化
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullFlow}
              disabled={isAnyLoading}
              className="gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isAnyLoading && "animate-spin")} />
              重新优化
            </Button>
            {optimized?.plan && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCompare}
                disabled={compareMutation.isPending}
                className="gap-1.5"
              >
                <GitCompare className="h-3.5 w-3.5" />
                {compareMutation.isPending ? '对比中...' : '详细对比'}
              </Button>
            )}
          </div>

          {/* 方案对比弹窗 */}
          <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>原计划 vs 优化方案</DialogTitle>
              </DialogHeader>
              {comparison && evaluation && optimized && (
                <PlanComparisonView
                  comparison={comparison}
                  evaluationA={evaluation}
                  evaluationB={{
                    ...evaluation,
                    totalUtility: optimized.summary?.finalUtility ?? evaluation.totalUtility,
                  }}
                  labelA="原计划"
                  labelB="优化后"
                  tradeoffTelemetry={
                    tripId && compareCorrelationId
                      ? {
                          tripId,
                          correlationId: compareCorrelationId,
                          utilityWeights: customWeights ?? DEFAULT_WEIGHTS,
                          contextSnapshot: {
                            schema: 'optimization.planComparison/v1',
                            surface: 'OptimizationDashboard',
                            routeDirectionId: world.routeDirection?.id,
                            planTripId: plan.tripId,
                            dimensionKeys: Object.keys(comparison.dimensionComparison),
                          },
                        }
                      : undefined
                  }
                  onSelectPlan={(p) => {
                    if (p === 'B' && optimized.plan) onOptimized?.(optimized.plan);
                    setCompareDialogOpen(false);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

    </div>
  );
}

// ==================== 导出 ====================

export default OptimizationDashboard;
