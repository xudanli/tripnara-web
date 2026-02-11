/**
 * 优化仪表盘组件
 * 
 * 整合计划评估、协商结果、团队管理、实时状态的完整视图
 */

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { PlanEvaluationCard } from './PlanEvaluationCard';
import { NegotiationResultCard } from './NegotiationResultCard';
import { TeamManagementPanel } from './TeamManagementPanel';
import { RealtimeStatusBanner } from './RealtimeStatusBanner';

import {
  useEvaluatePlan,
  useOptimizePlan,
  useNegotiation,
  useRiskAssessment,
  useTeam,
  useTeamConstraints,
  useTeamWeights,
  useRealtimeState,
  useFullOptimizationFlow,
} from '@/hooks/useOptimizationV2';

import type {
  RoutePlanDraft,
  EvaluatePlanResponse,
  OptimizePlanResponse,
  NegotiationResponse,
  RiskAssessmentResponse,
} from '@/types/optimization-v2';
import type { WorldModelContext } from '@/types/strategy';

import {
  Play,
  Zap,
  BarChart3,
  Users,
  Radio,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

// ==================== 类型 ====================

export interface OptimizationDashboardProps {
  /** 当前计划 */
  plan: RoutePlanDraft;
  /** 世界模型上下文 */
  world: WorldModelContext;
  /** 行程 ID（用于实时状态） */
  tripId?: string;
  /** 团队 ID（可选） */
  teamId?: string;
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
  teamId,
  onOptimized,
  className,
}: OptimizationDashboardProps) {
  // ==================== 状态 ====================
  const [evaluation, setEvaluation] = React.useState<EvaluatePlanResponse | null>(null);
  const [optimized, setOptimized] = React.useState<OptimizePlanResponse | null>(null);
  const [negotiation, setNegotiation] = React.useState<NegotiationResponse | null>(null);
  const [riskAssessment, setRiskAssessment] = React.useState<RiskAssessmentResponse | null>(null);
  const [activeTab, setActiveTab] = React.useState('evaluation');

  // ==================== Hooks ====================
  const evaluateMutation = useEvaluatePlan();
  const optimizeMutation = useOptimizePlan();
  const negotiationMutation = useNegotiation();
  const riskMutation = useRiskAssessment();
  const { runFullFlow, isLoading: isFullFlowLoading } = useFullOptimizationFlow();

  // 团队数据
  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const { data: teamConstraints } = useTeamConstraints(teamId);
  const { data: teamWeights } = useTeamWeights(teamId);

  // 实时状态
  const { 
    data: realtimeState, 
    refetch: refetchRealtime,
    isLoading: realtimeLoading,
    isFetching: realtimeFetching,
  } = useRealtimeState(tripId, { enabled: !!tripId });

  // ==================== 操作 ====================
  
  /** 执行评估 */
  const handleEvaluate = async () => {
    try {
      const result = await evaluateMutation.mutateAsync({ plan, world });
      setEvaluation(result);
      toast.success('评估完成');
    } catch (error) {
      toast.error('评估失败');
    }
  };

  /** 执行优化 */
  const handleOptimize = async () => {
    try {
      const result = await optimizeMutation.mutateAsync({ plan, world });
      setOptimized(result);
      onOptimized?.(result.optimizedPlan);
      toast.success(`优化完成，效用提升 ${Math.round((result.finalUtility - (evaluation?.totalUtility ?? 0)) * 100)}%`);
    } catch (error) {
      toast.error('优化失败');
    }
  };

  /** 执行协商 */
  const handleNegotiate = async () => {
    try {
      const targetPlan = optimized?.optimizedPlan ?? plan;
      const result = await negotiationMutation.mutateAsync({ plan: targetPlan, world });
      setNegotiation(result);
      toast.success('协商完成');
    } catch (error) {
      toast.error('协商失败');
    }
  };

  /** 执行风险评估 */
  const handleRiskAssessment = async () => {
    try {
      const targetPlan = optimized?.optimizedPlan ?? plan;
      const result = await riskMutation.mutateAsync({ plan: targetPlan, world });
      setRiskAssessment(result);
      toast.success('风险评估完成');
    } catch (error) {
      toast.error('风险评估失败');
    }
  };

  /** 一键完整流程 */
  const handleFullFlow = async () => {
    try {
      const result = await runFullFlow(plan, world);
      setEvaluation(result.originalEvaluation);
      setOptimized(result.optimization);
      setRiskAssessment(result.riskAssessment);
      setNegotiation(result.negotiation);
      onOptimized?.(result.optimization.optimizedPlan);
      toast.success('完整优化流程完成');
    } catch (error) {
      toast.error('优化流程失败');
    }
  };

  // ==================== 渲染 ====================

  const isAnyLoading = evaluateMutation.isPending || 
                       optimizeMutation.isPending || 
                       negotiationMutation.isPending ||
                       riskMutation.isPending ||
                       isFullFlowLoading;

  return (
    <div className={cn('space-y-6', className)}>
      {/* 实时状态横幅 */}
      {tripId && (
        <RealtimeStatusBanner
          state={realtimeState}
          connected={!realtimeLoading}
          onRefresh={() => refetchRealtime()}
          refreshing={realtimeFetching}
          collapsible
        />
      )}

      {/* 操作按钮 */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleFullFlow}
          disabled={isAnyLoading}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          一键优化
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEvaluate}
            disabled={isAnyLoading}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            评估
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOptimize}
            disabled={isAnyLoading || !evaluation}
          >
            <Play className="h-4 w-4 mr-1" />
            优化
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNegotiate}
            disabled={isAnyLoading}
          >
            <Users className="h-4 w-4 mr-1" />
            协商
          </Button>
        </div>
      </div>

      {/* 主内容 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="evaluation" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">评估</span>
          </TabsTrigger>
          <TabsTrigger value="negotiation" className="gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">协商</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1" disabled={!teamId}>
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">团队</span>
          </TabsTrigger>
          <TabsTrigger value="realtime" className="gap-1" disabled={!tripId}>
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">实时</span>
          </TabsTrigger>
        </TabsList>

        {/* 评估 Tab */}
        <TabsContent value="evaluation" className="mt-4">
          {evaluateMutation.isPending ? (
            <LoadingSkeleton />
          ) : evaluateMutation.error ? (
            <ErrorDisplay 
              error={evaluateMutation.error as Error} 
              onRetry={handleEvaluate} 
            />
          ) : evaluation ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <PlanEvaluationCard
                evaluation={evaluation}
                compareEvaluation={optimized ? {
                  ...evaluation,
                  totalUtility: optimized.finalUtility,
                  // 简化示例，实际需要完整的 breakdown
                } : undefined}
                title="原计划评估"
                showWeights
              />
              {optimized && (
                <PlanEvaluationCard
                  evaluation={{
                    totalUtility: optimized.finalUtility,
                    breakdown: evaluation.breakdown, // 简化
                    weightsUsed: evaluation.weightsUsed,
                    timestamp: new Date().toISOString(),
                  }}
                  title="优化后计划"
                  description={`优化耗时 ${optimized.processingTimeMs || 0}ms，共 ${(optimized.changes || []).length} 项变更`}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              点击「评估」按钮开始分析计划
            </div>
          )}
        </TabsContent>

        {/* 协商 Tab */}
        <TabsContent value="negotiation" className="mt-4">
          {negotiationMutation.isPending ? (
            <LoadingSkeleton />
          ) : negotiationMutation.error ? (
            <ErrorDisplay 
              error={negotiationMutation.error as Error} 
              onRetry={handleNegotiate} 
            />
          ) : negotiation ? (
            <NegotiationResultCard result={negotiation} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              点击「协商」按钮获取三守护者评估
            </div>
          )}
        </TabsContent>

        {/* 团队 Tab */}
        <TabsContent value="team" className="mt-4">
          {teamLoading ? (
            <LoadingSkeleton />
          ) : (
            <TeamManagementPanel
              team={team}
              constraints={teamConstraints}
              weights={teamWeights}
              readonly
            />
          )}
        </TabsContent>

        {/* 实时状态 Tab */}
        <TabsContent value="realtime" className="mt-4">
          {realtimeLoading ? (
            <LoadingSkeleton />
          ) : realtimeState ? (
            <div className="space-y-4">
              <RealtimeStatusBanner
                state={realtimeState}
                connected
                onRefresh={() => refetchRealtime()}
                refreshing={realtimeFetching}
              />
              {riskAssessment && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm font-medium mb-2">期望效用</p>
                    <p className="text-3xl font-bold">
                      {Math.round(riskAssessment.expectedUtility * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      95% CI: [{Math.round(riskAssessment.confidenceInterval.lower * 100)}%, 
                      {Math.round(riskAssessment.confidenceInterval.upper * 100)}%]
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm font-medium mb-2">可行概率</p>
                    <p className="text-3xl font-bold">
                      {Math.round(riskAssessment.feasibilityProbability * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      下行风险: {Math.round(riskAssessment.downsideRisk * 100)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              无实时状态数据
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== 导出 ====================

export default OptimizationDashboard;
