/**
 * 优化仪表盘组件
 * 
 * 整合计划评估、协商结果、团队管理、实时状态的完整视图
 */

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { PlanEvaluationCard } from './PlanEvaluationCard';
import { NegotiationResultCard } from './NegotiationResultCard';
import { PlanComparisonView } from './PlanComparisonView';
import { RiskAssessmentCard } from './RiskAssessmentCard';
import { TeamManagementPanel } from './TeamManagementPanel';
import { CreateTeamDialog } from './CreateTeamDialog';
import { RealtimeStatusBanner } from './RealtimeStatusBanner';

import { useAuth } from '@/hooks/useAuth';
import { tripsApi } from '@/api/trips';
import {
  useEvaluatePlan,
  useComparePlans,
  useOptimizePlan,
  useNegotiation,
  useRiskAssessment,
  useCreateTeam,
  useTeam,
  useAddTeamMember,
  useRemoveTeamMember,
  useTeamNegotiation,
  useTeamConstraints,
  useTeamWeights,
  useRealtimeState,
  useFullOptimizationFlow,
} from '@/hooks/useOptimizationV2';

import type {
  TeamMember,
  RoutePlanDraft,
  EvaluatePlanResponse,
  OptimizePlanResponse,
  NegotiationResponse,
  RiskAssessmentResponse,
  ComparePlansResponse,
  ObjectiveFunctionWeights,
  TeamNegotiationResponse,
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
  Play,
  Zap,
  BarChart3,
  Users,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  GitCompare,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// ==================== 类型 ====================

export interface OptimizationDashboardProps {
  /** 当前计划 */
  plan: RoutePlanDraft;
  /** 世界模型上下文 */
  world: WorldModelContext;
  /** 行程 ID（用于实时状态） */
  tripId?: string;
  /** 团队 ID（可选，来自 trip.metadata.teamId） */
  teamId?: string;
  /** 行程当前 metadata（用于更新时合并） */
  tripMetadata?: Record<string, unknown>;
  /** 行程更新后回调（用于父组件刷新数据） */
  onTripUpdated?: () => void | Promise<void>;
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
  tripMetadata,
  onTripUpdated,
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
  const [localTeamId, setLocalTeamId] = React.useState<string | null>(null);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = React.useState(false);

  // 从 localStorage 恢复团队 ID（创建团队后刷新页面不丢失）
  React.useEffect(() => {
    if (!tripId) return;
    if (teamId) {
      setLocalTeamId(null);
      return;
    }
    try {
      const stored = localStorage.getItem(`trip_team_id:${tripId}`);
      setLocalTeamId(stored || null);
    } catch (_) {
      setLocalTeamId(null);
    }
  }, [tripId, teamId]);
  const [customWeights, setCustomWeights] = React.useState<ObjectiveFunctionWeights | null>(null);
  const [weightsPopoverOpen, setWeightsPopoverOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('evaluation');
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = React.useState(false); // PRD：专业模式默认隐藏

  // ==================== Hooks ====================
  const evaluateMutation = useEvaluatePlan();
  const compareMutation = useComparePlans();
  const optimizeMutation = useOptimizePlan();
  const negotiationMutation = useNegotiation();
  const riskMutation = useRiskAssessment();
  const { runFullFlow, isLoading: isFullFlowLoading } = useFullOptimizationFlow();

  const { user } = useAuth();
  const effectiveTeamId = localTeamId ?? teamId;
  const createTeamMutation = useCreateTeam();

  // 团队数据
  const { data: team, isLoading: teamLoading } = useTeam(effectiveTeamId);
  const addMemberMutation = useAddTeamMember(effectiveTeamId ?? '');
  const removeMemberMutation = useRemoveTeamMember(effectiveTeamId ?? '');
  const teamNegotiationMutation = useTeamNegotiation(effectiveTeamId ?? '');
  const { data: teamConstraints } = useTeamConstraints(effectiveTeamId);
  const { data: teamWeights } = useTeamWeights(effectiveTeamId);
  const [teamNegotiationResult, setTeamNegotiationResult] = React.useState<TeamNegotiationResponse | null>(null);

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
      const result = await evaluateMutation.mutateAsync({
        plan,
        world,
        weights: customWeights ?? undefined,
      });
      setEvaluation(result);
      toast.success('评估完成');
    } catch (error) {
      toast.error('评估失败');
    }
  };

  /** 执行优化 */
  const handleOptimize = async () => {
    try {
      const result = await optimizeMutation.mutateAsync({
        plan,
        world,
        ...(tripId && { tripId, trip_id: tripId }),
      });
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
      const result = await negotiationMutation.mutateAsync({
        plan: targetPlan,
        world,
        ...(tripId && { tripId, trip_id: tripId }),
      });
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
      const result = await riskMutation.mutateAsync({
        plan: targetPlan,
        world,
        ...(tripId && { tripId, trip_id: tripId }),
      });
      setRiskAssessment(result);
      toast.success('风险评估完成');
    } catch (error) {
      toast.error('风险评估失败');
    }
  };

  /** 添加成员 */
  const handleAddMember = async (
    member: Omit<TeamMember, 'userId' | 'personalWeights'>
  ) => {
    if (!effectiveTeamId) return;
    try {
      const fullMember: TeamMember = {
        ...member,
        userId: `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        personalWeights: DEFAULT_WEIGHTS,
      };
      await addMemberMutation.mutateAsync(fullMember);
      toast.success(`已添加成员 ${member.displayName}`);
    } catch (error: any) {
      toast.error(error?.message || '添加成员失败');
    }
  };

  /** 移除成员 */
  const handleRemoveMember = async (userId: string) => {
    if (!effectiveTeamId) return;
    try {
      await removeMemberMutation.mutateAsync(userId);
      toast.success('已移除成员');
    } catch (error: any) {
      toast.error(error?.message || '移除成员失败');
    }
  };

  /** 团队协商 */
  const handleTeamNegotiate = async () => {
    if (!effectiveTeamId) return;
    try {
      const targetPlan = optimized?.optimizedPlan ?? plan;
      const result = await teamNegotiationMutation.mutateAsync({
        plan: targetPlan,
        world,
        tripId: tripId ?? targetPlan.tripId ?? plan.tripId,
      });
      setTeamNegotiationResult(result);
      toast.success('团队协商完成');
    } catch (error) {
      toast.error('团队协商失败');
    }
  };

  /** 方案对比（原计划 vs 优化后） */
  const handleCompare = async () => {
    if (!optimized) return;
    try {
      const result = await compareMutation.mutateAsync({
        planA: plan,
        planB: optimized.optimizedPlan,
        world,
      });
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
      onOptimized?.(result.optimization.optimizedPlan);
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
                       teamNegotiationMutation.isPending ||
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

      {/* 主操作：AI 助手模式，单主按钮 */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleFullFlow}
          disabled={isAnyLoading}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          一键优化
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAdvancedSettingsOpen(!advancedSettingsOpen)}
          className="text-muted-foreground gap-1"
        >
          {advancedSettingsOpen ? (
            <>
              <ChevronUp className="h-4 w-4" />
              收起高级设置
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              高级设置
            </>
          )}
        </Button>
      </div>

      {/* 高级设置：评估/权重/优化/协商 + Tab 切换（默认收起） */}
      {advancedSettingsOpen && (
        <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEvaluate}
            disabled={isAnyLoading}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            评估
          </Button>
          <Popover open={weightsPopoverOpen} onOpenChange={setWeightsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isAnyLoading}
                className={customWeights ? 'border-primary' : ''}
              >
                <Settings2 className="h-4 w-4 mr-1" />
                权重
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">自定义评估权重</h4>
                <p className="text-xs text-muted-foreground">调整各维度权重后点击评估生效</p>
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

      {/* 步骤指引：评估 → 优化 → 协商 → 团队 */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>流程：</span>
        {[
          { key: 'evaluation' as const, label: '1. 评估' },
          { key: 'evaluation' as const, label: '2. 优化', done: !!optimized },
          { key: 'negotiation' as const, label: '3. 协商' },
          { key: 'team' as const, label: '4. 团队' },
        ].map((step, i) => {
          const isActive = step.key === activeTab;
          return (
            <span key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab(step.key)}
                className={cn(
                  'hover:text-foreground transition-colors',
                  isActive && 'text-primary font-medium',
                  step.done && !isActive && 'text-green-600'
                )}
              >
                {step.label}
          </button>
          {i < 3 && <span className="text-muted-foreground/50">›</span>}
            </span>
          );
        })}
      </div>
        </div>
      )}

      {/* 主内容：默认仅展示评估结果，展开高级设置后可切换协商/团队 */}
      <Tabs 
        value={advancedSettingsOpen ? activeTab : 'evaluation'} 
        onValueChange={(v) => advancedSettingsOpen && setActiveTab(v)}
      >
        <TabsList className={cn('grid w-full grid-cols-3', !advancedSettingsOpen && 'hidden')}>
          <TabsTrigger value="evaluation" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">评估</span>
          </TabsTrigger>
          <TabsTrigger value="negotiation" className="gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">协商</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">团队</span>
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
            <div className="space-y-4">
              {/* 协商返回的 criticalConcerns 在主结果区展示，避免藏在折叠的协商 Tab 内 */}
              {(negotiation?.evaluationSummary?.criticalConcerns?.length ?? 0) > 0 && (
                <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>需要关注的问题</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-1">
                      {negotiation.evaluationSummary.criticalConcerns.map((concern, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-700 dark:text-amber-400">•</span>
                          <span>{concern}</span>
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
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
                <>
                  {(optimized.changes || []).length === 0 ? (
                    <Card className="lg:col-span-2">
                      <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">当前计划已较优</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <PlanEvaluationCard
                      evaluation={{
                        totalUtility: optimized.finalUtility ?? evaluation.totalUtility,
                        breakdown: evaluation.breakdown,
                        weightsUsed: evaluation.weightsUsed,
                        timestamp: new Date().toISOString(),
                      }}
                      title="优化后计划"
                      description={`优化耗时 ${optimized.processingTimeMs || 0}ms，共 ${(optimized.changes || []).length} 项变更`}
                    />
                  )}
                  {(optimized.changes || []).length > 0 && (
                  <div className="lg:col-span-2 flex flex-wrap justify-center gap-3">
                    <Button
                      onClick={() => onOptimized?.(optimized.optimizedPlan)}
                      className="gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      应用优化
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCompare}
                      disabled={compareMutation.isPending}
                    >
                      <GitCompare className="h-4 w-4 mr-2" />
                      {compareMutation.isPending ? '对比中...' : '方案详细对比'}
                    </Button>
                    <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>原计划 vs 优化方案</DialogTitle>
                        </DialogHeader>
                        {comparison && evaluation && (
                          <PlanComparisonView
                            comparison={comparison}
                            evaluationA={evaluation}
                            evaluationB={{
                              ...evaluation,
                              totalUtility: optimized.finalUtility,
                            }}
                            labelA="原计划"
                            labelB="优化后"
                            onSelectPlan={(p) => {
                              if (p === 'B') onOptimized?.(optimized.optimizedPlan);
                              setCompareDialogOpen(false);
                            }}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                  )}
                </>
              )}
              {riskAssessment && (
                <RiskAssessmentCard
                  assessment={riskAssessment}
                  compact
                  showFactors
                  maxFactors={3}
                  title="风险评估"
                  className="lg:col-span-2"
                />
              )}
            </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <p className="text-muted-foreground">点击下方按钮开始分析计划</p>
              <Button
                onClick={handleEvaluate}
                disabled={isAnyLoading}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                评估计划
              </Button>
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
            <NegotiationResultCard result={negotiation} tripId={tripId} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              点击「协商」按钮获取三守护者评估
            </div>
          )}
        </TabsContent>

        {/* 团队 Tab */}
        <TabsContent value="team" className="mt-4 space-y-4">
          {!effectiveTeamId ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="font-medium mb-1">暂无关联团队</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    创建团队后可使用团队协商、权重聚合等功能
                  </p>
                  <Button
                    onClick={() => setCreateTeamDialogOpen(true)}
                    disabled={!user?.id}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    创建团队
                  </Button>
                  {!user?.id && (
                    <p className="text-xs text-muted-foreground mt-2">请先登录</p>
                  )}
                  <CreateTeamDialog
                    open={createTeamDialogOpen}
                    onOpenChange={setCreateTeamDialogOpen}
                    onSubmit={async (req) => {
                      const team = await createTeamMutation.mutateAsync(req);
                      setLocalTeamId(team.teamId);
                      if (tripId) {
                        try {
                          localStorage.setItem(`trip_team_id:${tripId}`, team.teamId);
                          await tripsApi.update(tripId, {
                            metadata: { ...(tripMetadata || {}), teamId: team.teamId },
                          });
                          await onTripUpdated?.();
                        } catch (err: any) {
                          toast.error(err?.message || '团队已创建，但写入行程失败');
                        }
                      }
                    }}
                    currentUserId={user?.id ?? ''}
                    currentUserDisplayName={user?.name ?? user?.email ?? '我'}
                    isSubmitting={createTeamMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
          {effectiveTeamId && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTeamNegotiate}
                disabled={isAnyLoading}
              >
                <Users className="h-4 w-4 mr-1" />
                {teamNegotiationMutation.isPending ? '协商中...' : '团队协商'}
              </Button>
            </div>
          )}
          {teamNegotiationResult && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">协商结论</h4>
                    <Badge variant={teamNegotiationResult.teamConstraintsSatisfied ? 'default' : 'destructive'}>
                      {teamNegotiationResult.teamConstraintsSatisfied ? '约束满足' : '存在冲突'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    共识度: {Math.round(teamNegotiationResult.consensusLevel * 100)}%
                  </p>
                  <div>
                    <h5 className="text-sm font-medium mb-2">成员评估</h5>
                    <div className="space-y-2">
                      {teamNegotiationResult.memberEvaluations.map((m) => (
                        <div key={m.userId} className="flex justify-between text-sm">
                          <span>{m.displayName}</span>
                          <span>效用: {Math.round(m.utility * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {teamNegotiationResult.conflicts.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-2 text-destructive">冲突</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {teamNegotiationResult.conflicts.map((c, i) => (
                          <li key={i}>
                            {c.description} ({c.members.join(', ')})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {teamLoading ? (
            <LoadingSkeleton />
          ) : (
            <TeamManagementPanel
              team={team}
              constraints={teamConstraints}
              weights={teamWeights}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              readonly={!effectiveTeamId}
              loading={addMemberMutation.isPending || removeMemberMutation.isPending}
            />
          )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== 导出 ====================

export default OptimizationDashboard;
