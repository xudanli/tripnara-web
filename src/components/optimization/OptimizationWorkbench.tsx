/**
 * 智能优化工作台
 * 
 * 整合评估、优化、对比、风险、协商的一站式入口
 */

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { PlanComparisonView } from './PlanComparisonView';
import { RiskAssessmentCard } from './RiskAssessmentCard';
import { NegotiationResultCard } from './NegotiationResultCard';
import { 
  OptimizeProgressStepper, 
  DEFAULT_OPTIMIZE_STEPS,
  updateStepsFromOptimizeResponse,
  type OptimizeStep,
} from './OptimizeProgressStepper';
import { JudgmentPointDialog } from './JudgmentPointDialog';
import { FatiguePredictionChart } from './FatiguePredictionChart';

import {
  useEvaluatePlan,
  useOptimizePlan,
  useComparePlans,
  useRiskAssessment,
  useNegotiation,
} from '@/hooks/useOptimizationV2';

import type {
  RoutePlanDraft,
  WorldModelContext,
  EvaluatePlanResponse,
  OptimizePlanResponse,
  ComparePlansResponse,
  RiskAssessmentResponse,
  NegotiationResponse,
} from '@/types/optimization-v2';
import { DEFAULT_WEIGHTS } from '@/types/optimization-v2';
import { submitGuardianHumanChoice } from '@/lib/guardian-choose-submit';
import { useAuth } from '@/hooks/useAuth';

import {
  Zap,
  BarChart3,
  GitCompare,
  AlertTriangle,
  Shield,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ==================== 类型 ====================

export interface OptimizationWorkbenchProps {
  plan: RoutePlanDraft;
  world: WorldModelContext;
  tripId?: string;
  onOptimized?: (plan: RoutePlanDraft) => void;
  onPlanSelected?: (plan: 'original' | 'optimized') => void;
  className?: string;
}

type WorkbenchPhase = 
  | 'idle'
  | 'evaluating'
  | 'optimizing'
  | 'comparing'
  | 'assessing'
  | 'negotiating'
  | 'complete'
  | 'error';

interface WorkbenchState {
  phase: WorkbenchPhase;
  steps: OptimizeStep[];
  currentStepId?: string;
  evaluation?: EvaluatePlanResponse;
  optimized?: OptimizePlanResponse;
  comparison?: ComparePlansResponse;
  risk?: RiskAssessmentResponse;
  negotiation?: NegotiationResponse;
  error?: Error;
}

// ==================== 子组件 ====================

function PhaseIndicator({ phase }: { phase: WorkbenchPhase }) {
  const config: Record<WorkbenchPhase, { label: string; color: string; icon: React.ElementType }> = {
    idle: { label: '待优化', color: 'bg-gray-100 text-gray-700', icon: Info },
    evaluating: { label: '评估中', color: 'bg-muted/15 text-muted-foreground', icon: BarChart3 },
    optimizing: { label: '优化中', color: 'bg-amber-100 text-amber-700', icon: Zap },
    comparing: { label: '对比中', color: 'bg-muted/15 text-muted-foreground', icon: GitCompare },
    assessing: { label: '风险评估', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
    negotiating: { label: '协商中', color: 'bg-gate-allow text-gate-allow-foreground', icon: Shield },
    complete: { label: '完成', color: 'bg-gate-allow text-gate-allow-foreground', icon: CheckCircle2 },
    error: { label: '错误', color: 'bg-gate-reject text-gate-reject-foreground', icon: XCircle },
  };
  
  const { label, color, icon: Icon } = config[phase];
  
  return (
    <Badge variant="outline" className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function ScoreSummary({
  original,
  optimized,
  improvement,
  utilityDecreased,
}: {
  original: number;
  optimized?: number;
  improvement?: number;
  /** improvementPct < 0 时为 true */
  utilityDecreased?: boolean;
}) {
  const decreased = utilityDecreased ?? (improvement != null && improvement < 0);
  return (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <p className="text-xs text-muted-foreground">原计划</p>
        <p className="text-2xl font-bold tabular-nums">{Math.round(original * 100)}</p>
      </div>

      {optimized !== undefined && (
        <>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">优化后</p>
            <p className={cn(
              'text-2xl font-bold tabular-nums',
              decreased ? 'text-amber-600' : 'text-gate-allow-foreground'
            )}>
              {Math.round(optimized * 100)}
            </p>
          </div>

          {improvement !== undefined && (
            <Badge
              variant="outline"
              className={cn(
                'gap-1',
                decreased
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                  : 'bg-gate-allow text-gate-allow-foreground dark:bg-gate-allow/30 dark:text-gate-allow-foreground'
              )}
            >
              <TrendingUp className={cn('h-3 w-3', decreased && 'rotate-180')} />
              {improvement >= 0 ? `+${improvement.toFixed(1)}%` : `${improvement.toFixed(1)}%`}
            </Badge>
          )}
        </>
      )}
    </div>
  );
}

function LoadingCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 主组件 ====================

export function OptimizationWorkbench({
  plan,
  world,
  tripId,
  onOptimized,
  onPlanSelected,
  className,
}: OptimizationWorkbenchProps) {
  const { user } = useAuth();
  // ==================== 状态 ====================
  const [state, setState] = React.useState<WorkbenchState>({
    phase: 'idle',
    steps: DEFAULT_OPTIMIZE_STEPS,
  });
  
  const [judgmentDialogOpen, setJudgmentDialogOpen] = React.useState(false);
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);
  const [tradeoffCorrelationId, setTradeoffCorrelationId] = React.useState<string | null>(null);
  
  const compareFingerprint = React.useMemo(() => {
    if (!state.comparison) return '';
    return `${state.comparison.preferredPlan}-${state.comparison.utilityDifference}-${Object.keys(state.comparison.dimensionComparison).sort().join(',')}`;
  }, [state.comparison]);

  React.useEffect(() => {
    if (!tripId || !compareFingerprint) return;
    setTradeoffCorrelationId(
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `tradeoff-${Date.now()}`
    );
  }, [tripId, compareFingerprint]);

  // ==================== Mutations ====================
  const evaluateMutation = useEvaluatePlan();
  const optimizeMutation = useOptimizePlan();
  const compareMutation = useComparePlans();
  const riskMutation = useRiskAssessment();
  const negotiationMutation = useNegotiation();
  
  // ==================== 更新步骤状态 ====================
  const updateStep = React.useCallback((
    stepId: string, 
    status: OptimizeStep['status'],
    result?: OptimizeStep['result']
  ) => {
    setState(prev => ({
      ...prev,
      currentStepId: stepId,
      steps: prev.steps.map(s => 
        s.id === stepId ? { ...s, status, result } : s
      ),
    }));
  }, []);
  
  // ==================== 一键优化流程 ====================
  const runOptimization = React.useCallback(async () => {
    setState(prev => ({
      ...prev,
      phase: 'evaluating',
      steps: DEFAULT_OPTIMIZE_STEPS,
      error: undefined,
    }));
    
    try {
      // 1. 评估原计划
      updateStep('evaluate', 'running');
      const evaluation = await evaluateMutation.mutateAsync({ plan, world });
      updateStep('evaluate', 'completed', { 
        score: evaluation.totalUtility,
        message: `总效用 ${Math.round(evaluation.totalUtility * 100)}%`,
      });
      setState(prev => ({ ...prev, evaluation }));
      
      // 2. Abu 安全检查 + Dre 优化 + Neptune 修复（一次 optimize 调用）
      setState(prev => ({ ...prev, phase: 'optimizing' }));
      updateStep('abu', 'running');
      
      const optimized = await optimizeMutation.mutateAsync({
        plan,
        world,
        ...(tripId && { tripId, trip_id: tripId }),
      });
      
      // 根据返回结果更新各步骤
      const updatedSteps = updateStepsFromOptimizeResponse(
        state.steps,
        optimized
      );
      setState(prev => ({ 
        ...prev, 
        steps: updatedSteps.map(s => ({ ...s, status: 'completed' as const })),
        optimized,
      }));
      
      // 3. 对比（如果有优化结果）
      let comparison: ComparePlansResponse | undefined;
      if (optimized.plan) {
        setState(prev => ({ ...prev, phase: 'comparing' }));
        comparison = await compareMutation.mutateAsync({
          planA: plan,
          planB: optimized.plan,
          world,
        });
        setState(prev => ({ ...prev, comparison }));
      }
      
      // 4. 风险评估
      setState(prev => ({ ...prev, phase: 'assessing' }));
      const targetPlan = optimized.plan ?? plan;
      const risk = await riskMutation.mutateAsync({
        plan: targetPlan,
        world,
        ...(tripId && { tripId, trip_id: tripId }),
      });
      setState(prev => ({ ...prev, risk }));
      
      // 5. 协商
      setState(prev => ({ ...prev, phase: 'negotiating' }));
      const negotiation = await negotiationMutation.mutateAsync({
        plan: targetPlan,
        world,
        ...(tripId && { tripId, trip_id: tripId }),
      });
      setState(prev => ({ ...prev, negotiation }));
      
      // 完成
      setState(prev => ({ ...prev, phase: 'complete' }));
      
      // 如果有需要用户确认的点，显示弹窗
      if (optimized.userJudgmentPoints?.length) {
        setJudgmentDialogOpen(true);
      }
      
      const pct = optimized.summary?.improvementPct;
      const desc = pct != null
        ? pct >= 0
          ? `效用提升 ${pct.toFixed(1)}%`
          : `效用 ${pct.toFixed(1)}%。本次以满足约束为主，综合评分略有下降。`
        : '优化完成';
      toast.success('优化完成', { description: desc });
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        phase: 'error',
        error: error as Error,
      }));
      toast.error('优化失败', {
        description: (error as Error).message,
      });
    }
  }, [
    plan, 
    world, 
    tripId, 
    updateStep,
    evaluateMutation,
    optimizeMutation,
    compareMutation,
    riskMutation,
    negotiationMutation,
    state.steps,
  ]);
  
  // ==================== 处理用户决策 ====================
  const handleJudgmentConfirm = React.useCallback(async (decisions: Record<string, string>) => {
    setJudgmentDialogOpen(false);

    if (user?.id && tripId && state.optimized?.userJudgmentPoints?.length) {
      const points = state.optimized.userJudgmentPoints;
      const firstPoint = points[0];
      const selectedText = decisions[firstPoint.id] ?? firstPoint.recommendation;
      const selectedIndex = Math.max(
        0,
        firstPoint.options.findIndex((o) => o === selectedText),
      );
      try {
        await submitGuardianHumanChoice({
          userId: user.id,
          tripId,
          source: 'optimize_judgment',
          selectedIndex,
          selectedText,
          decisionPoints: points.map((p) => p.question),
        });
        toast.success('已记录优化决策选择');
      } catch (err) {
        console.error('[OptimizationWorkbench] judgment submit failed', err);
      }
    }

    if (state.optimized?.plan) {
      onOptimized?.(state.optimized.plan);
      onPlanSelected?.('optimized');
    }
  }, [state.optimized, onOptimized, onPlanSelected, tripId, user?.id]);
  
  // ==================== 选择方案 ====================
  const handleSelectPlan = React.useCallback((selection: 'A' | 'B') => {
    if (selection === 'B' && state.optimized?.plan) {
      onOptimized?.(state.optimized.plan);
      onPlanSelected?.('optimized');
      toast.success('已应用优化方案');
    } else {
      onPlanSelected?.('original');
      toast.info('保持原方案');
    }
  }, [state.optimized, onOptimized, onPlanSelected]);
  
  // ==================== 计算进度 ====================
  const progress = React.useMemo(() => {
    const completedSteps = state.steps.filter(s => s.status === 'completed').length;
    return (completedSteps / state.steps.length) * 100;
  }, [state.steps]);
  
  const isRunning = ['evaluating', 'optimizing', 'comparing', 'assessing', 'negotiating'].includes(state.phase);
  
  // ==================== 渲染 ====================
  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部：状态 + 操作 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                智能优化工作台
              </CardTitle>
              <CardDescription>
                一键优化您的旅行计划，获得安全、体验、节奏的最佳平衡
              </CardDescription>
            </div>
            <PhaseIndicator phase={state.phase} />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 进度条 */}
          {isRunning && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <OptimizeProgressStepper 
                steps={state.steps}
                currentStep={state.currentStepId}
                showLabels
              />
            </div>
          )}
          
          {/* 分数摘要 */}
          {state.evaluation && (
            <div className="flex items-center justify-between">
              <ScoreSummary
                original={state.evaluation.totalUtility}
                optimized={state.optimized?.summary?.finalUtility}
                improvement={state.optimized?.summary?.improvementPct}
                utilityDecreased={state.optimized?.summary?.utilityDecreased}
              />
              
              {state.phase === 'complete' && state.optimized?.plan && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectPlan('A')}
                  >
                    保持原方案
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSelectPlan('B')}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    应用优化
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* 主操作按钮 */}
          {state.phase === 'idle' && (
            <Button
              onClick={runOptimization}
              className="w-full gap-2"
              size="lg"
            >
              <Zap className="h-5 w-5" />
              一键优化
            </Button>
          )}
          
          {state.phase === 'complete' && (
            <Button
              variant="outline"
              onClick={runOptimization}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              重新优化
            </Button>
          )}
          
          {state.phase === 'error' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gate-reject border border-gate-reject-border text-gate-reject-foreground text-sm">
                {state.error?.message || '优化过程中发生错误'}
              </div>
              <Button
                variant="outline"
                onClick={runOptimization}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                重试
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 详细结果 */}
      {state.phase === 'complete' && (
        <Collapsible open={detailsExpanded} onOpenChange={setDetailsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>查看详细分析</span>
              <ChevronRight className={cn(
                'h-4 w-4 transition-transform',
                detailsExpanded && 'rotate-90'
              )} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 pt-4">
            {/* 方案对比 */}
            {state.comparison && state.evaluation && (
              <PlanComparisonView
                comparison={state.comparison}
                evaluationA={state.evaluation}
                evaluationB={state.optimized?.summary ? {
                  ...state.evaluation,
                  totalUtility: state.optimized.summary.finalUtility,
                } : undefined}
                labelA="原方案"
                labelB="优化方案"
                tradeoffTelemetry={
                  tripId && tradeoffCorrelationId
                    ? {
                        tripId,
                        correlationId: tradeoffCorrelationId,
                        utilityWeights: DEFAULT_WEIGHTS,
                        contextSnapshot: {
                          schema: 'optimization.planComparison/v1',
                          surface: 'OptimizationWorkbench',
                          routeDirectionId: world.routeDirection?.id,
                          planTripId: plan.tripId,
                          dimensionKeys: Object.keys(state.comparison.dimensionComparison),
                        },
                      }
                    : undefined
                }
                onSelectPlan={handleSelectPlan}
                compact
              />
            )}
            
            {/* 风险评估 */}
            {state.risk && (
              <RiskAssessmentCard
                assessment={state.risk}
                compact
                showFactors
              />
            )}
            
            {/* 协商结果 */}
            {state.negotiation && (
              <NegotiationResultCard
                result={state.negotiation}
                tripId={tripId}
                userId={user?.id}
              />
            )}
            
            {/* 疲劳预测 */}
            {state.negotiation?.fatiguePrediction?.length && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">疲劳预测</CardTitle>
                </CardHeader>
                <CardContent>
                  <FatiguePredictionChart
                    predictions={state.negotiation.fatiguePrediction}
                  />
                </CardContent>
              </Card>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
      
      {/* 加载占位 */}
      {isRunning && (
        <div className="grid gap-4 md:grid-cols-2">
          <LoadingCard title="评估分析" />
          <LoadingCard title="风险评估" />
        </div>
      )}
      
      {/* 用户决策弹窗 */}
      {state.optimized?.userJudgmentPoints && (
        <JudgmentPointDialog
          open={judgmentDialogOpen}
          onOpenChange={setJudgmentDialogOpen}
          judgmentPoints={state.optimized.userJudgmentPoints}
          onConfirm={handleJudgmentConfirm}
        />
      )}
    </div>
  );
}

// ==================== 导出 ====================

export default OptimizationWorkbench;
