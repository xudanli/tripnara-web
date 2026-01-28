import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/format';
import { RefreshCw, GitCompare, CheckCircle2, Settings2, FileText, ChevronDown, Clock, MapPin, ExternalLink, Calendar, Eye, Mountain, TrendingUp, AlertTriangle, Activity, Sparkles } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import type {
  ExecutePlanningWorkbenchResponse,
  ConsolidatedDecisionStatus,
  UserAction,
  CommitPlanResponse,
  ComparePlansResponse,
  AdjustPlanResponse,
  TripPlansResponse,
  PlanDifference,
} from '@/api/planning-workbench';
import { tripsApi } from '@/api/trips';
import type { TripDetail, PlanBudgetEvaluationResponse } from '@/types/trip';
import { toast } from 'sonner';
import { useContextApi } from '@/hooks';
import type { ContextPackage } from '@/api/context';
import PersonaCard from '@/components/planning-workbench/PersonaCard';
import BudgetProgress from '@/components/planning-workbench/BudgetProgress';
import BudgetBreakdownChart from '@/components/planning-workbench/BudgetBreakdownChart';
import DecisionTimeline, { type DecisionLogEntry } from '@/components/planning-workbench/DecisionTimeline';
import ComplianceRulesCard from '@/components/trips/ComplianceRulesCard';
import EvidenceDrawer from '@/components/layout/EvidenceDrawer';
import type { RecommendationItem } from '@/api/planning-workbench';
import { cn } from '@/lib/utils';
import {
  getGateStatusIcon,
  getGateStatusLabel,
  getGateStatusClasses,
  normalizeGateStatus,
} from '@/lib/gate-status';
import {
  getPersonaIcon,
  getPersonaIconColorClasses,
} from '@/lib/persona-icons';
import ConfirmPanel from '@/components/planning-workbench/ConfirmPanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

interface PlanningWorkbenchTabProps {
  tripId: string;
}

export default function PlanningWorkbenchTab({ tripId }: PlanningWorkbenchTabProps) {
  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [result, setResult] = useState<ExecutePlanningWorkbenchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 获取货币单位
  const currency = trip?.budgetConfig?.currency || 'CNY';
  
  // Context API Hook
  const {
    buildContextWithCompress,
    // contextPackage, // 可用于显示 Context Package 信息
    // loading: contextLoading, // 可用于显示加载状态
    // error: contextError, // 可用于显示错误信息
  } = useContextApi();
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [allConfirmationsChecked, setAllConfirmationsChecked] = useState(false);
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const [evidenceDrawerTab, setEvidenceDrawerTab] = useState<'evidence' | 'risk' | 'decision'>('decision');
  const [comparingPlans, setComparingPlans] = useState<ExecutePlanningWorkbenchResponse[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<ComparePlansResponse | null>(null);
  const [availablePlans, setAvailablePlans] = useState<TripPlansResponse | null>(null);
  const [budgetEvaluation, setBudgetEvaluation] = useState<PlanBudgetEvaluationResponse | null>(null);
  const [loadingBudgetEvaluation, setLoadingBudgetEvaluation] = useState(false);
  const [budgetDecisionLog, setBudgetDecisionLog] = useState<import('@/types/trip').BudgetDecisionLogResponse | null>(null);
  const [budgetLogDialogOpen, setBudgetLogDialogOpen] = useState(false);
  const [loadingBudgetLog, setLoadingBudgetLog] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  // 加载预算评估结果
  const loadBudgetEvaluation = async (planId: string) => {
    if (!planId) return;
    try {
      setLoadingBudgetEvaluation(true);
      const evaluation = await planningWorkbenchApi.getPlanBudgetEvaluation(planId);
      setBudgetEvaluation(evaluation);
      // 加载预算评估后，自动加载决策日志
      if (evaluation.planId && tripId) {
        await loadBudgetDecisionLog(evaluation.planId);
      }
    } catch (err: any) {
      // 对于"未找到"类型的错误，静默处理（不记录错误日志）
      // 因为预算评估是可选的，方案可能还没有进行预算评估
      const errorMessage = err?.message || '';
      const isNotFoundError = 
        errorMessage.includes('未找到') || 
        errorMessage.includes('not found') ||
        errorMessage.includes('不存在') ||
        err?.code === 'NOT_FOUND' ||
        err?.response?.status === 404;
      
      if (!isNotFoundError) {
        // 只有非"未找到"的错误才记录警告日志
        console.warn('⚠️ [Planning Workbench] 加载预算评估失败（非资源不存在错误）:', {
          planId,
          error: errorMessage,
          code: err?.code,
        });
      } else {
        // "未找到"错误静默处理，只记录调试信息
        console.log('ℹ️ [Planning Workbench] 预算评估结果不存在（方案可能尚未进行预算评估）:', planId);
      }
      // 清空预算评估状态
      setBudgetEvaluation(null);
      // 不显示错误提示，因为预算评估是可选的
    } finally {
      setLoadingBudgetEvaluation(false);
    }
  };

  // 加载预算决策日志
  const loadBudgetDecisionLog = async (planId: string) => {
    if (!planId || !tripId) return;
    try {
      setLoadingBudgetLog(true);
      const log = await planningWorkbenchApi.getBudgetDecisionLog(planId, tripId, {
        limit: 20,
        offset: 0,
      });
      setBudgetDecisionLog(log);
    } catch (err: any) {
      console.error('Failed to load budget decision log:', err);
      toast.error('加载预算决策日志失败');
    } finally {
      setLoadingBudgetLog(false);
    }
  };

  const loadTrip = async () => {
    if (!tripId) return;
    try {
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err) {
      console.error('Failed to load trip:', err);
      toast.error('加载行程信息失败');
    }
  };

  // 构建规划上下文的通用函数
  const buildPlanningContext = () => {
    if (!trip) return null;

    const destinationParts = trip.destination?.split(',') || [];
    const country = destinationParts[0]?.trim().toUpperCase() || '';
    const city = destinationParts.length > 1 ? destinationParts.slice(1).join(',').trim() : undefined;

    const days = trip.TripDay?.length || 0;
    if (days === 0) {
      toast.error('行程天数不能为0，请先设置行程日期');
      return null;
    }

    const constraints: any = {};
    if (trip.totalBudget) {
      constraints.budget = {
        total: trip.totalBudget,
        currency: 'CNY',
      };
    }

    return {
      destination: {
        country,
        city,
      },
      days,
      travelMode: 'mixed' as const,
      constraints: Object.keys(constraints).length > 0 ? constraints : undefined,
    };
  };

  // 构建 Context Package（使用 Context API）
  const buildContextPackage = async (userQuery: string): Promise<ContextPackage | null> => {
    if (!trip) return null;

    try {
      // 根据用户操作确定 phase 和 agent
      const phase = 'planning'; // 规划工作台固定为 planning 阶段
      const agent = 'PLANNER'; // 规划工作台使用 PLANNER agent

      // 构建 Context Package
      const contextPkg = await buildContextWithCompress(
        {
          tripId,
          phase,
          agent,
          userQuery,
          tokenBudget: 3600, // 默认 Token 预算
          requiredTopics: ['VISA', 'ROAD_RULES', 'SAFETY'], // 规划阶段需要的主题
          useCache: true, // 启用缓存
        },
        {
          strategy: 'balanced', // 使用平衡的压缩策略
          preserveKeys: [], // 可以根据需要保留关键块
        }
      );

      if (contextPkg) {
        console.log('[Planning Workbench] Context Package 构建成功:', {
          id: contextPkg.id,
          totalTokens: contextPkg.totalTokens,
          blocksCount: contextPkg.blocks.length,
          compressed: contextPkg.compressed,
        });
      }

      return contextPkg;
    } catch (err: any) {
      console.error('[Planning Workbench] Context Package 构建失败:', err);
      // 不阻止后续流程，只记录错误
      return null;
    }
  };

  // 执行规划工作台操作的通用函数
  const executeWorkbenchAction = async (userAction: UserAction, existingPlanState?: any) => {
    if (!trip) {
      toast.error('请先加载行程信息');
      return;
    }

    const context = buildPlanningContext();
    if (!context) return;

    setLoading(true);
    setError(null);

    try {
      // 🆕 构建用户查询文本（根据操作类型）
      const userQueryMap: Record<UserAction, string> = {
        generate: `帮我规划${trip.destination || ''}的${trip.TripDay?.length || 0}天行程`,
        compare: '对比当前方案与其他方案',
        commit: '提交当前方案到行程',
        adjust: '调整当前方案',
      };
      const userQuery = userQueryMap[userAction] || '执行规划操作';

      // 🆕 构建 Context Package（可选，如果后端支持可以传递）
      const contextPkg = await buildContextPackage(userQuery);
      
      // 如果构建成功，可以在这里记录或传递给后端
      if (contextPkg) {
        console.log('[Planning Workbench] 使用 Context Package:', {
          id: contextPkg.id,
          blocksCount: contextPkg.blocks.length,
          totalTokens: contextPkg.totalTokens,
        });
        // TODO: 如果后端 API 支持，可以将 contextPkg.id 或 blocks 传递给后端
        // 例如：contextPackageId: contextPkg.id
      }

      const response = await planningWorkbenchApi.execute({
        context,
        tripId,
        existingPlanState: existingPlanState || result?.planState,
        userAction,
      });

      setResult(response);
      toast.success(`规划工作台${getActionLabel(userAction)}成功`);
      
      // 如果生成了新方案，自动加载预算评估结果
      if (userAction === 'generate' && response.planState?.plan_id) {
        loadBudgetEvaluation(response.planState.plan_id);
      }
      
      return response;
    } catch (err: any) {
      console.error(`Planning workbench ${userAction} failed:`, err);
      const errorMessage = err.message || `${getActionLabel(userAction)}失败，请稍后重试`;
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 获取操作标签
  const getActionLabel = (action: UserAction): string => {
    const labels: Record<UserAction, string> = {
      generate: '生成',
      compare: '对比',
      commit: '提交',
      adjust: '调整',
    };
    return labels[action] || action;
  };

  // 生成方案
  const handleGenerate = async () => {
    await executeWorkbenchAction('generate');
  };

  // 加载可用方案列表
  const loadAvailablePlans = async () => {
    if (!tripId) return;
    try {
      const plansData = await planningWorkbenchApi.getTripPlans(tripId, {
        limit: 20,
        offset: 0,
      });
      setAvailablePlans(plansData);
    } catch (err) {
      console.error('Failed to load available plans:', err);
      // 不显示错误提示，因为可能还没有方案
    }
  };

  // 对比方案
  const handleCompare = async () => {
    if (!result?.planState) {
      toast.error('请先生成方案后再进行对比');
      return;
    }
    
    // 加载可用方案列表
    await loadAvailablePlans();
    
    // 准备对比数据：当前方案
    const plansToCompare: ExecutePlanningWorkbenchResponse[] = [];
    if (result) {
      plansToCompare.push(result);
      setSelectedPlanIds([result.planState.plan_id]);
    }
    
    setComparingPlans(plansToCompare);
    setCompareResult(null);
    setCompareDialogOpen(true);
  };

  // 执行方案对比
  const handleExecuteCompare = async () => {
    if (selectedPlanIds.length < 2) {
      toast.error('请至少选择 2 个方案进行对比');
      return;
    }

    setLoading(true);
    try {
      const compareResult = await planningWorkbenchApi.comparePlans({
        planIds: selectedPlanIds,
      });
      
      setCompareResult(compareResult);
      
      // 将对比结果转换为 ExecutePlanningWorkbenchResponse 格式以便显示
      const plansForDisplay: ExecutePlanningWorkbenchResponse[] = compareResult.plans.map(p => ({
        planState: p.planState,
        uiOutput: p.uiOutput,
      }));
      setComparingPlans(plansForDisplay);
      
      toast.success('方案对比完成');
    } catch (err: any) {
      console.error('Compare plans failed:', err);
      const errorMessage = err.message || '对比方案失败，请稍后重试';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 提交方案
  const handleCommit = async () => {
    if (!result?.planState) {
      toast.error('请先生成方案后再提交');
      return;
    }
    setCommitDialogOpen(true);
  };

  // 确认提交方案
  const handleConfirmCommit = async () => {
    if (!result?.planState || !tripId) return;

    setCommitting(true);
    try {
      // 使用专门的 commit 接口
      const commitResult: CommitPlanResponse = await planningWorkbenchApi.commitPlan(
        result.planState.plan_id,
        {
          tripId,
          // 可以添加选项，例如部分提交
          // options: {
          //   partialCommit: false,
          //   commitDays: undefined,
          // },
        }
      );

      setCommitDialogOpen(false);
      toast.success(
        `方案已提交到行程！新增 ${commitResult.changes.added} 项，修改 ${commitResult.changes.modified} 项，删除 ${commitResult.changes.removed} 项`
      );
      
      // 刷新行程数据
      await loadTrip();
      
      // 可选：清空当前结果，让用户重新生成
      // setResult(null);
    } catch (err: any) {
      console.error('Commit plan failed:', err);
      const errorMessage = err.message || '提交方案失败，请稍后重试';
      toast.error(errorMessage);
    } finally {
      setCommitting(false);
    }
  };

  // 调整方案
  const handleAdjust = async () => {
    if (!result?.planState) {
      toast.error('请先生成方案后再调整');
      return;
    }
    setAdjustDialogOpen(true);
  };

  // 确认调整方案
  const handleConfirmAdjust = async () => {
    if (!result?.planState) return;

    setLoading(true);
    try {
      // 使用专门的 adjust 接口
      // 这里可以根据实际需求添加具体的调整项
      // 目前使用一个简单的预算调整示例
      const adjustResult: AdjustPlanResponse = await planningWorkbenchApi.adjustPlan(
        result.planState.plan_id,
        {
          adjustments: [
            // 示例：可以根据用户输入添加具体的调整项
            // {
            //   type: 'modify_budget',
            //   data: { total: 10000 }
            // }
          ],
          regenerate: true, // 重新生成方案
        }
      );

      // 将调整结果转换为 ExecutePlanningWorkbenchResponse 格式
      const newResult: ExecutePlanningWorkbenchResponse = {
        planState: adjustResult.planState,
        uiOutput: adjustResult.uiOutput,
      };
      
      setResult(newResult);
      setAdjustDialogOpen(false);
      toast.success(`方案调整成功！生成了 ${adjustResult.changes.length} 项变更`);
    } catch (err: any) {
      console.error('Adjust plan failed:', err);
      const errorMessage = err.message || '调整方案失败，请稍后重试';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getConsolidatedDecisionStyle = (status: ConsolidatedDecisionStatus) => {
    // 标准化状态（支持旧状态映射）
    const normalizedStatus = normalizeGateStatus(status);
    
    // 获取状态配置
    const StatusIcon = getGateStatusIcon(normalizedStatus);
    const label = getGateStatusLabel(normalizedStatus);
    const className = getGateStatusClasses(normalizedStatus);
    
    return {
      icon: <StatusIcon className="w-5 h-5" />,
      label,
      className,
    };
  };

  return (
    <div className="space-y-6">
      {/* 空状态 - 重新设计 */}
      {!result && !loading && !error && (
        <div className="space-y-6">
          {/* 规划工作台说明 */}
          <Card>
            <CardHeader>
              <CardTitle>决策评估</CardTitle>
              <CardDescription>
                做决策与做取舍的地方。三人格（Abu/Dr.Dre/Neptune）将评估您的行程方案。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 行程信息 */}
              <div className="border-b pb-4">
                <p className="text-sm text-muted-foreground">
                  {trip
                    ? `行程：${trip.destination || '未设置'}，${trip.TripDay?.length || 0} 天`
                    : '请先加载行程信息'}
                </p>
              </div>

              {/* 三人格介绍 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-2">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      {(() => {
                        const AbuIcon = getPersonaIcon('ABU');
                        return (
                          <AbuIcon className={cn('w-8 h-8 mx-auto', getPersonaIconColorClasses('ABU'))} />
                        );
                      })()}
                      <h4 className="font-semibold mt-2">Abu</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        我负责：这条路，真的能走吗？
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        评估路线的安全性与可达性
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-2">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      {(() => {
                        const DrDreIcon = getPersonaIcon('DR_DRE');
                        return (
                          <DrDreIcon className={cn('w-8 h-8 mx-auto', getPersonaIconColorClasses('DR_DRE'))} />
                        );
                      })()}
                      <h4 className="font-semibold mt-2">Dr.Dre</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        别太累，我会让每一天刚刚好。
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        评估节奏与体感，确保行程舒适
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-2">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      {(() => {
                        const NeptuneIcon = getPersonaIcon('NEPTUNE');
                        return (
                          <NeptuneIcon className={cn('w-8 h-8 mx-auto', getPersonaIconColorClasses('NEPTUNE'))} />
                        );
                      })()}
                      <h4 className="font-semibold mt-2">Neptune</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        如果行不通，我会给你一个刚刚好的替代。
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        提供空间结构修复与替代方案
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* 决策流程说明 */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">决策流程</h4>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                      1
                    </span>
                    <div>
                      <p className="font-medium">生成方案</p>
                      <p className="text-muted-foreground mt-1">
                        触发 Should-Exist Gate 评估，系统将检查路线的安全性与可达性
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                      2
                    </span>
                    <div>
                      <p className="font-medium">三人格独立评估</p>
                      <p className="text-muted-foreground mt-1">
                        Abu、Dr.Dre、Neptune 分别从安全、节奏、修复角度提供决策依据
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                      3
                    </span>
                    <div>
                      <p className="font-medium">综合决策</p>
                      <p className="text-muted-foreground mt-1">
                        系统综合三人格评估结果，决定是否允许、需要调整或拒绝方案
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
          
          {/* 主操作按钮 */}
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={loading || !trip}
              size="lg"
              className="min-w-[200px]"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              生成方案
            </Button>
          </div>
        </div>
      )}

      {/* 🆕 合规规则卡片 */}
      {trip && trip.destination && (
        <ComplianceRulesCard
          tripId={tripId}
          countryCodes={(() => {
            const parts = trip.destination?.split(',') || [];
            const countryCode = parts[0]?.trim().toUpperCase();
            return countryCode ? [countryCode] : [];
          })()}
          ruleTypes={['VISA', 'TRANSPORT', 'ENTRY']}
        />
      )}

      {/* 操作区域 - 仅在生成后显示 */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>操作</CardTitle>
            <CardDescription>
              基于当前评估结果进行操作
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 次要操作 */}
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  onClick={handleCompare}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  对比方案
                </Button>
                <Button
                  onClick={handleAdjust}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  调整方案
                </Button>
              </div>
              
              {/* 提交操作 - 仅在决策允许时显示 */}
              {result.uiOutput.consolidatedDecision?.status !== 'REJECT' && (
                <div className="flex justify-center pt-2 border-t">
                  <Button
                    onClick={handleCommit}
                    variant="default"
                    size="lg"
                    className="min-w-[200px]"
                    disabled={loading || committing}
                  >
                    {committing ? (
                      <>
                        <Spinner className="w-5 h-5 mr-2" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        提交方案到行程
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 错误提示 */}
      {error && (
        <Card className={cn('border', getGateStatusClasses('REJECT'))}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {(() => {
                const ErrorIcon = getGateStatusIcon('REJECT');
                return <ErrorIcon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', getGateStatusClasses('REJECT').split(' ').find(cls => cls.startsWith('text-')))} />;
              })()}
              <div className="flex-1">
                <p className={cn('text-sm font-medium', getGateStatusClasses('REJECT').split(' ').find(cls => cls.startsWith('text-')))}>执行失败</p>
                <p className={cn('text-sm mt-1', getGateStatusClasses('REJECT').split(' ').find(cls => cls.startsWith('text-')))}>{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 结果展示 - 增强信息层次 */}
      {result && (
        <div className="space-y-6">
          {/* 第一层：综合决策（最显眼） */}
          {result.uiOutput.consolidatedDecision && (
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">综合决策</CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1',
                      getConsolidatedDecisionStyle(result.uiOutput.consolidatedDecision.status)
                        .className
                    )}
                  >
                    {getConsolidatedDecisionStyle(result.uiOutput.consolidatedDecision.status).icon}
                    {getConsolidatedDecisionStyle(result.uiOutput.consolidatedDecision.status).label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {result.uiOutput.consolidatedDecision.summary}
                </p>
                {result.uiOutput.consolidatedDecision.nextSteps &&
                  result.uiOutput.consolidatedDecision.nextSteps.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">下一步：</p>
                      <ul className="space-y-1">
                        {result.uiOutput.consolidatedDecision.nextSteps.map((step, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setEvidenceDrawerTab('decision');
                    setEvidenceDrawerOpen(true);
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  查看决策日志
                </Button>
              </CardFooter>
            </Card>
          )}

              {/* 第二层：方案预览（新增） */}
          {result.planState?.itinerary && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    方案预览
                  </CardTitle>
                  <Badge variant="outline">版本 {result.planState.plan_version}</Badge>
                </div>
                <CardDescription>
                  查看方案包含的行程项和可执行性验证
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlanPreviewContent 
                  planState={result.planState} 
                  trip={trip}
                  currentTrip={trip}
                  budgetEvaluation={budgetEvaluation}
                  tripId={tripId}
                  onLoadBudgetEvaluation={loadBudgetEvaluation}
                  onLoadBudgetDecisionLog={loadBudgetDecisionLog}
                  onOpenBudgetLogDialog={() => {
                    if (budgetEvaluation?.planId) {
                      loadBudgetDecisionLog(budgetEvaluation.planId);
                      setBudgetLogDialogOpen(true);
                    }
                  }}
                  budgetDecisionLog={budgetDecisionLog}
                  currency={currency}
                />
              </CardContent>
            </Card>
          )}

          {/* DEM 地形与体力模型（新增） */}
          {result.planState && (
            <DEMTerrainAndFatigueView planState={result.planState} trip={trip} />
          )}

          {/* 三人格输出 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PersonaCard persona={result.uiOutput.personas.abu} />
            <PersonaCard persona={result.uiOutput.personas.drdre} />
            <PersonaCard 
              persona={result.uiOutput.personas.neptune}
              showApplyButton={true}
              onApplyRecommendation={async (rec: RecommendationItem) => {
                try {
                  // 调用调整方案 API 应用 Neptune 的建议
                  // 使用 modify_constraint 类型，在 data 中传递 Neptune 建议详情
                  const adjustResult = await planningWorkbenchApi.adjustPlan(
                    result.planState.plan_id,
                    {
                      adjustments: [{
                        type: 'modify_constraint',
                        data: {
                          source: 'neptune_recommendation',
                          action: rec.action,
                          reason: rec.reason,
                          impact: rec.impact,
                        },
                      }],
                      regenerate: true,
                    }
                  );
                  
                  toast.success('替代方案已应用，正在重新生成规划...');
                  
                  // 刷新方案数据
                  if (adjustResult.newPlanId) {
                    await loadAvailablePlans();
                    loadBudgetEvaluation(adjustResult.newPlanId);
                  }
                } catch (err: any) {
                  console.error('Failed to apply Neptune recommendation:', err);
                  toast.error(err.message || '应用替代方案失败，请稍后重试');
                  throw err;
                }
              }}
            />
          </div>

          {/* 第三层：技术信息（可折叠） */}
          {result.planState && (
            <Collapsible defaultOpen={false}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">规划状态</CardTitle>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">规划 ID</p>
                        <p className="font-medium mt-1 font-mono text-xs">{result.planState.plan_id}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">版本</p>
                        <p className="font-medium mt-1">{result.planState.plan_version}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">状态</p>
                        <Badge variant="outline" className="mt-1">
                          {result.planState.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">时间戳</p>
                        <p className="font-medium mt-1 text-xs">
                          {new Date(result.uiOutput.timestamp).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </div>
      )}


      {/* 提交方案对话框 */}
      <Dialog open={commitDialogOpen} onOpenChange={setCommitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交方案</DialogTitle>
            <DialogDescription>
              确认将当前规划方案提交到行程吗？提交后方案将保存到行程中。
            </DialogDescription>
          </DialogHeader>
          {result && (
            <div className="space-y-4 py-4">
              <div className="text-sm">
                <p className="font-medium">方案信息：</p>
                <p className="text-muted-foreground">规划 ID: {result.planState.plan_id}</p>
                <p className="text-muted-foreground">版本: {result.planState.plan_version}</p>
                <p className="text-muted-foreground">状态: {result.planState.status}</p>
              </div>
              
              {/* 根据决策状态显示不同的确认流程 */}
              {result.uiOutput.consolidatedDecision && (
                <>
                  <div className="text-sm">
                    <p className="font-medium">综合决策：</p>
                    <p className="text-muted-foreground">
                      {result.uiOutput.consolidatedDecision.summary}
                    </p>
                  </div>
                  
                  {/* NEED_CONFIRM 状态：显示确认点清单 */}
                  {normalizeGateStatus(result.uiOutput.consolidatedDecision.status) === 'NEED_CONFIRM' && (
                    <ConfirmPanel
                      confirmations={
                        result.uiOutput.personas.abu?.confirmations || []
                      }
                      riskExplanation={result.uiOutput.consolidatedDecision.summary}
                      decisionStatus="NEED_CONFIRM"
                      onConfirmChange={setAllConfirmationsChecked}
                    />
                  )}
                  
                  {/* SUGGEST_REPLACE 状态：显示建议替换提示 */}
                  {normalizeGateStatus(result.uiOutput.consolidatedDecision.status) === 'SUGGEST_REPLACE' && (
                    <ConfirmPanel
                      confirmations={[]}
                      riskExplanation={result.uiOutput.consolidatedDecision.summary}
                      decisionStatus="SUGGEST_REPLACE"
                      onConfirmChange={setAllConfirmationsChecked}
                    />
                  )}
                  
                  {/* REJECT 状态：显示拒绝提示 */}
                  {normalizeGateStatus(result.uiOutput.consolidatedDecision.status) === 'REJECT' && (
                    <ConfirmPanel
                      confirmations={[]}
                      riskExplanation={result.uiOutput.consolidatedDecision.summary}
                      decisionStatus="REJECT"
                      onConfirmChange={setAllConfirmationsChecked}
                    />
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCommitDialogOpen(false);
                setAllConfirmationsChecked(false);
              }}
              disabled={committing}
            >
              取消
            </Button>
            <Button 
              onClick={handleConfirmCommit} 
              disabled={
                committing || 
                (result?.uiOutput.consolidatedDecision && 
                 normalizeGateStatus(result.uiOutput.consolidatedDecision.status) === 'NEED_CONFIRM' &&
                 !allConfirmationsChecked)
              }
            >
              {committing ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  提交中...
                </>
              ) : (
                '确认提交'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 调整方案对话框 */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>调整方案</DialogTitle>
            <DialogDescription>
              基于当前方案进行调整。系统将重新评估调整后的方案。
            </DialogDescription>
          </DialogHeader>
          {result && (
            <div className="space-y-2 py-4">
              <div className="text-sm">
                <p className="font-medium">当前方案：</p>
                <p className="text-muted-foreground">规划 ID: {result.planState.plan_id}</p>
                <p className="text-muted-foreground">版本: {result.planState.plan_version}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                调整功能将基于当前方案进行优化，系统会自动重新评估并生成新方案。
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdjustDialogOpen(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button onClick={handleConfirmAdjust} disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  调整中...
                </>
              ) : (
                '确认调整'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 对比方案对话框 */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              方案对比
            </DialogTitle>
            <DialogDescription>
              对比多个规划方案，查看不同方案的差异和优劣
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* 方案选择区域 */}
            {!compareResult && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">选择要对比的方案（至少选择 2 个）：</p>
                  
                  {/* 当前方案 */}
                  {result && (
                    <div className="mb-2">
                      <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                        <input
                          type="checkbox"
                          checked={selectedPlanIds.includes(result.planState.plan_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlanIds([...selectedPlanIds, result.planState.plan_id]);
                            } else {
                              setSelectedPlanIds(selectedPlanIds.filter(id => id !== result.planState.plan_id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium">当前方案 v{result.planState.plan_version}</p>
                          <p className="text-xs text-muted-foreground">规划 ID: {result.planState.plan_id}</p>
                        </div>
                        <Badge variant="outline">{result.planState.status}</Badge>
                      </label>
                    </div>
                  )}
                  
                  {/* 历史方案列表 */}
                  {availablePlans && availablePlans.plans.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {availablePlans.plans
                        .filter(p => !result || p.planId !== result.planState.plan_id)
                        .map((plan) => (
                          <label
                            key={plan.planId}
                            className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPlanIds.includes(plan.planId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPlanIds([...selectedPlanIds, plan.planId]);
                                } else {
                                  setSelectedPlanIds(selectedPlanIds.filter(id => id !== plan.planId));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <div className="flex-1">
                              <p className="font-medium">方案 v{plan.planVersion}</p>
                              <p className="text-xs text-muted-foreground">
                                创建于 {new Date(plan.createdAt).toLocaleString('zh-CN')}
                                {plan.summary && ` • ${plan.summary.itemCount} 项 • ${plan.summary.days} 天`}
                              </p>
                            </div>
                            <Badge variant="outline">{plan.status}</Badge>
                          </label>
                        ))}
                    </div>
                  )}
                  
                  {availablePlans && availablePlans.plans.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      暂无其他方案可对比
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* 对比结果展示 */}
            {compareResult && comparingPlans.length > 0 ? (
              <PlanComparisonView
                plans={comparingPlans}
                currentTrip={trip}
                onSelectPlan={(planId) => {
                  // 切换选中方案
                  setSelectedPlanIds([planId]);
                }}
                selectedPlanIds={selectedPlanIds}
                compareResult={compareResult}
                currency={currency}
              />
            ) : comparingPlans.length === 0 && !compareResult ? (
              <div className="text-center py-8 text-muted-foreground">
                <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">请选择要对比的方案</p>
                <p className="text-xs mt-1">至少需要选择 2 个方案</p>
              </div>
            ) : null}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCompareDialogOpen(false);
                setCompareResult(null);
                setSelectedPlanIds(result ? [result.planState.plan_id] : []);
              }}
            >
              关闭
            </Button>
            {!compareResult && selectedPlanIds.length >= 2 && (
              <Button
                onClick={handleExecuteCompare}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    对比中...
                  </>
                ) : (
                  <>
                    <GitCompare className="w-4 h-4 mr-2" />
                    执行对比
                  </>
                )}
              </Button>
            )}
            {compareResult && comparingPlans.length > 0 && (
              <Button
                onClick={async () => {
                  // 应用选中的方案
                  const selectedPlan = comparingPlans.find(p => selectedPlanIds.includes(p.planState.plan_id));
                  if (selectedPlan) {
                    setResult(selectedPlan);
                    setCompareDialogOpen(false);
                    setCompareResult(null);
                    toast.success('已切换到选中的方案');
                  }
                }}
              >
                应用选中方案
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 证据抽屉 - 决策日志 */}
      <EvidenceDrawer
        open={evidenceDrawerOpen}
        onClose={() => setEvidenceDrawerOpen(false)}
        tripId={tripId}
        activeTab={evidenceDrawerTab}
      />

      {/* 预算决策日志对话框 - 使用时间线组件 */}
      <Dialog open={budgetLogDialogOpen} onOpenChange={setBudgetLogDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>预算决策日志</DialogTitle>
            <DialogDescription>
              查看预算评估的完整决策演进历史
            </DialogDescription>
          </DialogHeader>
          {loadingBudgetLog ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-8 h-8" />
            </div>
          ) : budgetDecisionLog && budgetDecisionLog.items.length > 0 ? (
            <DecisionTimeline
              entries={budgetDecisionLog.items.map((item): DecisionLogEntry => ({
                id: item.id,
                timestamp: item.timestamp,
                persona: item.persona || 'ABU',
                action: `预算评估 - ${item.verdict === 'ALLOW' ? '通过' : item.verdict === 'NEED_ADJUST' ? '需调整' : '拒绝'}`,
                verdict: item.verdict,
                reason: `${item.reason} (预估: ${formatCurrency(item.estimatedCost, currency)} / 预算: ${item.budgetConstraint.total ? formatCurrency(item.budgetConstraint.total, currency) : '-'})`,
                evidenceRefs: item.evidenceRefs,
              }))}
              defaultVisibleCount={10}
              onEvidenceClick={(ref) => {
                // 可以在这里打开证据抽屉
                console.log('Evidence clicked:', ref);
              }}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">暂无预算决策日志</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetLogDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 方案预览内容组件
function PlanPreviewContent({ 
  planState, 
  trip,
  currentTrip,
  budgetEvaluation,
  tripId,
  onLoadBudgetEvaluation,
  onLoadBudgetDecisionLog,
  onOpenBudgetLogDialog,
  budgetDecisionLog,
  currency = 'CNY'
}: { 
  planState: any; 
  trip: TripDetail | null;
  currentTrip: TripDetail | null;
  budgetEvaluation?: PlanBudgetEvaluationResponse | null;
  tripId: string;
  onLoadBudgetEvaluation?: (planId: string) => void;
  onLoadBudgetDecisionLog?: (planId: string) => void;
  onOpenBudgetLogDialog?: () => void;
  budgetDecisionLog?: import('@/types/trip').BudgetDecisionLogResponse | null;
  currency?: string;
}) {
  // 解析方案数据
  const itinerary = planState.itinerary;
  
  // 如果没有行程数据，显示提示
  if (!itinerary || (typeof itinerary === 'object' && Object.keys(itinerary).length === 0)) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">方案数据加载中或暂无行程项</p>
        <p className="text-xs mt-1">方案提交后将显示详细的行程安排</p>
      </div>
    );
  }

  // 尝试解析行程数据（根据实际数据结构调整）
  let planItems: any[] = [];
  
  if (Array.isArray(itinerary)) {
    planItems = itinerary;
  } else if (itinerary.items && Array.isArray(itinerary.items)) {
    planItems = itinerary.items;
  } else if (itinerary.days && Array.isArray(itinerary.days)) {
    // 如果是按天组织的结构
    planItems = itinerary.days.flatMap((day: any) => day.items || []);
  }

  // 如果没有解析到数据，显示原始数据结构
  if (planItems.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">方案数据结构：</p>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
            {JSON.stringify(itinerary, null, 2)}
          </pre>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>提示：方案数据结构可能与预期不同，提交方案后可在行程详情中查看。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 方案统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-2xl font-bold">{planItems.length}</p>
          <p className="text-xs text-muted-foreground mt-1">行程项</p>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-2xl font-bold">
            {planState.constraints?.days || trip?.TripDay?.length || '-'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">天数</p>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-2xl font-bold">
            {planState.budget?.total ? formatCurrency(planState.budget.total, currency) : '-'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">预算</p>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <Badge variant={planState.status === 'PROPOSED' ? 'default' : 'outline'}>
            {planState.status}
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">状态</p>
        </div>
      </div>

      {/* 预算评估结果 - 增强版 */}
      {budgetEvaluation && (
        <Card className={cn(
          'border-l-4',
          budgetEvaluation.budgetEvaluation.verdict === 'ALLOW' && 'border-l-green-500',
          budgetEvaluation.budgetEvaluation.verdict === 'NEED_ADJUST' && 'border-l-yellow-500',
          budgetEvaluation.budgetEvaluation.verdict === 'REJECT' && 'border-l-red-500',
          !budgetEvaluation.budgetEvaluation.verdict && 'border-l-blue-500'
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className={cn(
                    'w-5 h-5',
                    budgetEvaluation.budgetEvaluation.verdict === 'ALLOW' && 'text-green-600',
                    budgetEvaluation.budgetEvaluation.verdict === 'NEED_ADJUST' && 'text-yellow-600',
                    budgetEvaluation.budgetEvaluation.verdict === 'REJECT' && 'text-red-600'
                  )} />
                  预算评估结果
                </CardTitle>
                <CardDescription>
                  置信度: {(budgetEvaluation.budgetEvaluation.confidence * 100).toFixed(0)}%
                </CardDescription>
              </div>
              {budgetEvaluation.budgetEvaluation.recommendations &&
                budgetEvaluation.budgetEvaluation.recommendations.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        // 获取优化建议 ID（这里需要根据实际数据结构调整）
                        const optimizationIds = budgetEvaluation.budgetEvaluation.recommendations?.map(
                          (_, index) => `rec-${budgetEvaluation.planId}-${index}`
                        ) || [];

                        const result = await planningWorkbenchApi.applyBudgetOptimization({
                          planId: budgetEvaluation.planId,
                          tripId: tripId,
                          optimizationIds,
                          autoCommit: false,
                        });

                        toast.success(
                          `已应用优化建议，预计节省 ${formatCurrency(result.totalSavings, currency)}`,
                          {
                            duration: 5000,
                          }
                        );

                        // 重新加载预算评估
                        if (budgetEvaluation.planId && onLoadBudgetEvaluation) {
                          onLoadBudgetEvaluation(budgetEvaluation.planId);
                        }
                      } catch (err: any) {
                        console.error('Failed to apply budget optimizations:', err);
                        toast.error(err.message || '应用优化建议失败，请稍后重试');
                      }
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    应用优化建议
                  </Button>
                )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 评估裁决 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">评估结果</span>
              <Badge
                variant={
                  budgetEvaluation.budgetEvaluation.verdict === 'ALLOW'
                    ? 'default'
                    : budgetEvaluation.budgetEvaluation.verdict === 'NEED_ADJUST'
                    ? 'secondary'
                    : 'destructive'
                }
              >
                {budgetEvaluation.budgetEvaluation.verdict === 'ALLOW'
                  ? '✓ 通过'
                  : budgetEvaluation.budgetEvaluation.verdict === 'NEED_ADJUST'
                  ? '⚠️ 需调整'
                  : '✗ 拒绝'}
              </Badge>
            </div>

            {/* 预算进度（使用新组件） */}
            {planState.budget?.total && (() => {
              // 从预算决策日志中获取预计成本，如果没有则从 planState 中获取
              const estimatedCost = budgetDecisionLog?.items?.[0]?.estimatedCost || planState.budget?.estimatedCost || 0;
              const alertThreshold = planState.budget?.alertThreshold || 0.8;
              
              return (
                <div className="p-4 bg-muted rounded-lg">
                  <BudgetProgress
                    spent={estimatedCost}
                    total={planState.budget.total}
                    alertThreshold={alertThreshold}
                    currency={currency}
                    showDetails={true}
                  />
                </div>
              );
            })()}
            
            {/* 预算分类占比图表 */}
            {planState.budget?.categoryLimits && (() => {
              const categories = [
                { name: '住宿', key: 'accommodation' as const, value: planState.budget.categoryLimits?.accommodation || 0 },
                { name: '交通', key: 'transportation' as const, value: planState.budget.categoryLimits?.transportation || 0 },
                { name: '餐饮', key: 'food' as const, value: planState.budget.categoryLimits?.food || 0 },
                { name: '活动', key: 'activities' as const, value: planState.budget.categoryLimits?.activities || 0 },
                { name: '其他', key: 'other' as const, value: planState.budget.categoryLimits?.other || 0 },
              ].filter(c => c.value > 0);
              
              if (categories.length === 0) return null;
              
              return (
                <div className="p-4 bg-muted rounded-lg">
                  <h5 className="text-sm font-semibold mb-3">预算分配</h5>
                  <BudgetBreakdownChart
                    categories={categories}
                    totalBudget={planState.budget.total || 0}
                    currency={currency}
                    size="sm"
                  />
                </div>
              );
            })()}

            {/* 评估原因 */}
            <div className="text-sm text-muted-foreground">
              {budgetEvaluation.budgetEvaluation.reason}
            </div>

            {/* 违规项 */}
            {budgetEvaluation.budgetEvaluation.violations && budgetEvaluation.budgetEvaluation.violations.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  违规项
                </h5>
                {budgetEvaluation.budgetEvaluation.violations.map((violation, i) => (
                  <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <div className="font-medium text-red-900 mb-1">{violation.category}</div>
                    <div className="text-red-700">
                      超出 {formatCurrency(violation.exceeded, currency)} ({violation.percentage.toFixed(1)}%)
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 优化建议 */}
            {budgetEvaluation.budgetEvaluation.recommendations && budgetEvaluation.budgetEvaluation.recommendations.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  优化建议
                </h5>
                {budgetEvaluation.budgetEvaluation.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <div className="font-medium text-blue-900 mb-1">{rec.action}</div>
                    <div className="text-blue-700 mb-1">{rec.impact}</div>
                    <div className="text-blue-600 font-medium">
                      预计节省: {formatCurrency(rec.estimatedSavings, currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 三人格预算评估展示 */}
            {budgetDecisionLog && budgetDecisionLog.items && budgetDecisionLog.items.length > 0 && (() => {
              // 根据 persona 字段查找对应的评估项
              // 注意：当前类型定义中 persona 只支持 'ABU'，但实际数据可能包含其他值
              const abuItem = budgetDecisionLog.items.find(item => 
                item.persona === 'ABU' || (item as any).persona === 'abu'
              );
              const dreItem = budgetDecisionLog.items.find(item => 
                (item as any).persona === 'DRDRE' || (item as any).persona === 'drdre' || (item as any).persona === 'DR_DRE'
              );
              const neptuneItem = budgetDecisionLog.items.find(item => 
                (item as any).persona === 'NEPTUNE' || (item as any).persona === 'neptune'
              );

              // 如果没有任何匹配项，显示所有项
              const hasPersonaItems = abuItem || dreItem || neptuneItem;
              const itemsToShow: typeof budgetDecisionLog.items = hasPersonaItems 
                ? [abuItem, dreItem, neptuneItem].filter((item): item is typeof budgetDecisionLog.items[0] => !!item)
                : budgetDecisionLog.items.slice(0, 3);

              if (itemsToShow.length === 0) return null;

              return (
                <div className="space-y-3 pt-2 border-t">
                  <h5 className="text-sm font-semibold">三人格预算评估</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {itemsToShow.map((item, index) => {
                      const personaName = abuItem && abuItem.id === item.id ? 'Abu' :
                                        dreItem && dreItem.id === item.id ? 'Dr.Dre' :
                                        neptuneItem && neptuneItem.id === item.id ? 'Neptune' :
                                        `评估 ${index + 1}`;
                      return (
                        <div key={item.id || index} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{personaName}</Badge>
                            <Badge
                              variant={
                                item.verdict === 'ALLOW' ? 'default' :
                                item.verdict === 'NEED_ADJUST' ? 'secondary' : 'destructive'
                              }
                              className="text-xs"
                            >
                              {item.verdict === 'ALLOW' ? '✓' : item.verdict === 'NEED_ADJUST' ? '⚠️' : '✗'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.reason || `${personaName} 预算评估通过`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Abu 的解释 */}
            {budgetEvaluation.personaOutput && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Abu</Badge>
                  的解释
                </div>
                <div className="text-sm">{budgetEvaluation.personaOutput.explanation}</div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              {onOpenBudgetLogDialog && budgetEvaluation && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenBudgetLogDialog}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  查看决策日志
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 行程项列表 */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">行程项预览</h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {planItems.slice(0, 20).map((item: any, index: number) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.name || item.placeName || item.title || `行程项 ${index + 1}`}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {item.startTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {typeof item.startTime === 'string' 
                            ? item.startTime.includes('T') 
                              ? format(new Date(item.startTime), 'HH:mm')
                              : item.startTime
                            : item.startTime}
                          {item.endTime && ` - ${typeof item.endTime === 'string' 
                            ? item.endTime.includes('T') 
                              ? format(new Date(item.endTime), 'HH:mm')
                              : item.endTime
                            : item.endTime}`}
                        </span>
                      )}
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location.name || item.location.address || '位置信息'}
                        </span>
                      )}
                    </div>
                    {item.type && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {item.type}
                      </Badge>
                    )}
                  </div>
                  {/* 可执行性验证标记 */}
                  <div className="flex flex-col gap-1">
                    {item.bookingLink && (
                      <a
                        href={item.bookingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        title="预订链接"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {planItems.length > 20 && (
            <div className="text-center text-sm text-muted-foreground py-2">
              还有 {planItems.length - 20} 个行程项，提交方案后可在行程详情中查看完整列表
            </div>
          )}
        </div>
      </div>

      {/* 可执行性验证 */}
      <ExecutabilityValidation planState={planState} />

      {/* 方案差异对比 */}
      {currentTrip && (
        <PlanComparison planState={planState} currentTrip={currentTrip} />
      )}
    </div>
  );
}

// 可执行性验证组件
function ExecutabilityValidation({ planState }: { planState: any }) {
  const evidenceRefs = planState.evidence_refs || [];
  const hasEvidence = evidenceRefs.length > 0;

  return (
    <div className="mt-4 space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        可执行性验证
      </h4>
      
      {hasEvidence ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {evidenceRefs.slice(0, 6).map((evidence: any, index: number) => (
              <div
                key={index}
                className="p-2 bg-green-50 border border-green-200 rounded text-xs"
              >
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  <span className="font-medium text-green-900">
                    {evidence.type || '验证项'}
                  </span>
                </div>
                <p className="text-green-700">
                  {evidence.description || evidence.source || '已验证'}
                </p>
              </div>
            ))}
          </div>
          {evidenceRefs.length > 6 && (
            <p className="text-xs text-muted-foreground">
              还有 {evidenceRefs.length - 6} 项验证结果，提交方案后可在行程详情中查看
            </p>
          )}
        </div>
      ) : (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            <strong>可执行性验证：</strong>
            方案提交后，系统将验证交通班次、开放时间、预订链接等可执行性要素。
            您可以在行程详情中查看完整的验证结果。
          </p>
        </div>
      )}
    </div>
  );
}

// 方案差异对比组件
function PlanComparison({ 
  planState, 
  currentTrip 
}: { 
  planState: any; 
  currentTrip: TripDetail;
}) {
  const planItems = extractPlanItems(planState);
  const currentItems = currentTrip.TripDay?.flatMap(day => day.ItineraryItem || []) || [];
  
  // 简单的差异对比（实际应该更复杂）
  const planItemCount = planItems.length;
  const currentItemCount = currentItems.length;
  const difference = planItemCount - currentItemCount;

  if (difference === 0 && planItemCount === 0) {
    return null; // 没有差异且都没有数据，不显示
  }

  return (
    <div className="mt-4 space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <GitCompare className="w-4 h-4" />
        方案差异对比
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">当前行程</p>
          <p className="text-2xl font-bold">{currentItemCount}</p>
          <p className="text-xs text-muted-foreground mt-1">行程项</p>
        </div>
        <div className="p-3 bg-primary/10 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">新方案</p>
          <p className="text-2xl font-bold">{planItemCount}</p>
          <p className="text-xs text-muted-foreground mt-1">行程项</p>
        </div>
      </div>

      {difference !== 0 && (
        <div className={cn(
          "p-3 rounded-lg border",
          difference > 0 ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"
        )}>
          <p className="text-xs">
            {difference > 0 ? (
              <>
                <strong>新增 {difference} 个行程项</strong>
                <span className="text-muted-foreground ml-2">
                  方案将添加 {difference} 个新的行程项到当前行程
                </span>
              </>
            ) : (
              <>
                <strong>减少 {Math.abs(difference)} 个行程项</strong>
                <span className="text-muted-foreground ml-2">
                  方案将移除 {Math.abs(difference)} 个行程项
                </span>
              </>
            )}
          </p>
        </div>
      )}

      {difference === 0 && planItemCount > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            方案行程项数量与当前行程相同，但内容可能有调整。提交方案后可在行程详情中查看具体变更。
          </p>
        </div>
      )}
    </div>
  );
}

// 辅助函数：从 planState 中提取行程项
function extractPlanItems(planState: any): any[] {
  // 安全检查：确保 planState 存在
  if (!planState) return [];
  
  const itinerary = planState.itinerary;
  
  if (!itinerary) return [];
  
  if (Array.isArray(itinerary)) {
    return itinerary;
  } else if (itinerary.items && Array.isArray(itinerary.items)) {
    return itinerary.items;
  } else if (itinerary.days && Array.isArray(itinerary.days)) {
    return itinerary.days.flatMap((day: any) => day.items || []);
  }
  
  return [];
}

// DEM 地形与体力模型展示组件
function DEMTerrainAndFatigueView({
  planState,
  trip,
}: {
  planState: any;
  trip: TripDetail | null;
}) {
  // 安全检查：确保 planState 存在
  if (!planState) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mountain className="w-5 h-5" />
            DEM 地形与体力模型
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <Mountain className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">方案数据加载中</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 从 planState 中提取 DEM 数据
  const demEvidence = (planState.evidence_refs && Array.isArray(planState.evidence_refs))
    ? planState.evidence_refs.filter((ref: any) => 
        ref.type === 'DEM' || ref.category === 'terrain' || ref.source?.includes('DEM')
      )
    : [];

  // 从行程项中提取体力相关数据
  const planItems = extractPlanItems(planState);
  const currentItems = trip?.TripDay?.flatMap(day => day.ItineraryItem || []) || [];
  
  // 计算累计数据
  let totalAscent = 0;
  let maxSlope = 0;
  let totalDistance = 0;
  let fatigueScore = 0;
  
  // 从行程项中提取物理元数据
  // 确保 planItems 和 currentItems 都是数组
  const allItems = [
    ...(Array.isArray(planItems) ? planItems : []),
    ...(Array.isArray(currentItems) ? currentItems : [])
  ];
  
  // 安全检查：确保 allItems 是数组
  if (Array.isArray(allItems)) {
    allItems.forEach((item: any) => {
      if (!item) return; // 跳过 null 或 undefined 项
      const physicalMetadata = item.physicalMetadata || item.Place?.metadata?.physicalMetadata || {};
      totalAscent += physicalMetadata.elevationGainM || 0;
      maxSlope = Math.max(maxSlope, physicalMetadata.slopePct || 0);
      totalDistance += physicalMetadata.distanceKm || 0;
      fatigueScore += (physicalMetadata.base_fatigue_score || 0) * (physicalMetadata.intensity_factor || 1);
    });
  }

  // 如果没有 DEM 数据，显示提示
  if (demEvidence.length === 0 && totalAscent === 0 && maxSlope === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mountain className="w-5 h-5" />
            DEM 地形与体力模型
          </CardTitle>
          <CardDescription>
            地形是旅行计划的真相层
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <Mountain className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">DEM 地形数据加载中</p>
            <p className="text-xs mt-1">
              系统将分析路线的坡度、爬升、海拔和体力消耗，确保方案的可执行性
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mountain className="w-5 h-5" />
          DEM 地形与体力模型
        </CardTitle>
        <CardDescription>
          地形是旅行计划的真相层 - 坡度、爬升、海拔、疲劳模型
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 地形指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">累计爬升</p>
            </div>
            <p className="text-xl font-bold">{totalAscent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">米</p>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Mountain className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">最大坡度</p>
            </div>
            <p className="text-xl font-bold">{maxSlope.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">%</p>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">总距离</p>
            </div>
            <p className="text-xl font-bold">{totalDistance.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">公里</p>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">疲劳指数</p>
            </div>
            <p className="text-xl font-bold">{fatigueScore.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">总分</p>
          </div>
        </div>

        {/* DEM 证据展示 */}
        {demEvidence.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">DEM 证据</h4>
            <div className="space-y-2">
              {demEvidence.slice(0, 3).map((evidence: any, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-blue-900">
                      {evidence.segmentId || evidence.id || `证据 ${index + 1}`}
                    </span>
                    {evidence.violation && evidence.violation !== 'NONE' && (
                      <Badge
                        variant={evidence.violation === 'HARD' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {evidence.violation === 'HARD' ? '硬约束违反' : '软约束警告'}
                      </Badge>
                    )}
                  </div>
                  {evidence.explanation && (
                    <p className="text-blue-700 mt-1">{evidence.explanation}</p>
                  )}
                  <div className="grid grid-cols-3 gap-2 mt-2 text-blue-600">
                    {evidence.cumulativeAscent !== undefined && (
                      <div>
                        <span className="text-muted-foreground">爬升: </span>
                        <span className="font-medium">{evidence.cumulativeAscent}m</span>
                      </div>
                    )}
                    {evidence.maxSlopePct !== undefined && (
                      <div>
                        <span className="text-muted-foreground">坡度: </span>
                        <span className="font-medium">{evidence.maxSlopePct}%</span>
                      </div>
                    )}
                    {evidence.fatigueIndex !== undefined && (
                      <div>
                        <span className="text-muted-foreground">疲劳: </span>
                        <span className="font-medium">{evidence.fatigueIndex.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {demEvidence.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  还有 {demEvidence.length - 3} 项 DEM 证据，提交方案后可在行程详情中查看
                </p>
              )}
            </div>
          </div>
        )}

        {/* 风险提示 */}
        {(maxSlope > 20 || totalAscent > 2000 || fatigueScore > 100) && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-orange-900 mb-1">地形风险提示</p>
                <ul className="text-xs text-orange-700 space-y-1">
                  {maxSlope > 20 && (
                    <li>• 最大坡度 {maxSlope.toFixed(1)}% 较高，请注意体力消耗</li>
                  )}
                  {totalAscent > 2000 && (
                    <li>• 累计爬升 {totalAscent.toLocaleString()}m 较大，建议增加休息时间</li>
                  )}
                  {fatigueScore > 100 && (
                    <li>• 疲劳指数 {fatigueScore.toFixed(0)} 较高，建议调整行程节奏</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 提示信息 */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            <strong>DEM 地形数据：</strong>
            系统基于数字高程模型（DEM）分析路线的物理可行性。
            提交方案后可在行程详情中查看完整的地形剖面图和体力消耗曲线。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// 方案对比视图组件
function PlanComparisonView({
  plans,
  currentTrip,
  onSelectPlan,
  selectedPlanIds,
  compareResult,
  currency = 'CNY',
}: {
  plans: ExecutePlanningWorkbenchResponse[];
  currentTrip: TripDetail | null;
  onSelectPlan: (planId: string) => void;
  selectedPlanIds: string[];
  compareResult?: ComparePlansResponse | null;
  currency?: string;
}) {
  if (plans.length === 0) return null;

  // 对比指标
  const comparisonMetrics = plans.map((plan) => {
    const planItems = extractPlanItems(plan.planState);
    const currentItems = currentTrip?.TripDay?.flatMap(day => day.ItineraryItem || []) || [];
    
    return {
      planId: plan.planState.plan_id,
      planVersion: plan.planState.plan_version,
      planStatus: plan.planState.status,
      itemCount: planItems.length,
      currentItemCount: currentItems.length,
      difference: planItems.length - currentItems.length,
      budget: plan.planState.budget?.total || 0,
      decision: plan.uiOutput.consolidatedDecision?.status || 'UNKNOWN',
      abuVerdict: plan.uiOutput.personas.abu?.verdict || 'UNKNOWN',
      drdreVerdict: plan.uiOutput.personas.drdre?.verdict || 'UNKNOWN',
      neptuneVerdict: plan.uiOutput.personas.neptune?.verdict || 'UNKNOWN',
    };
  });

  return (
    <div className="space-y-6">
      {/* 对比表格 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-semibold">对比项</th>
              {comparisonMetrics.map((metric) => (
                <th
                  key={metric.planId}
                  className={cn(
                    "text-center p-3 font-semibold border-l min-w-[200px] cursor-pointer transition-colors",
                    selectedPlanIds.includes(metric.planId)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => onSelectPlan(metric.planId)}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>方案 v{metric.planVersion}</span>
                    <Badge variant="outline" className="text-xs">
                      {metric.planStatus}
                    </Badge>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 行程项数量 */}
            <tr className="border-b">
              <td className="p-3 font-medium">行程项数量</td>
              {comparisonMetrics.map((metric) => (
                <td
                  key={metric.planId}
                  className={cn(
                    "text-center p-3 border-l",
                    selectedPlanIds.includes(metric.planId) && "bg-primary/5"
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg font-bold">{metric.itemCount}</span>
                    {metric.difference !== 0 && (
                      <span className={cn(
                        "text-xs",
                        metric.difference > 0 ? "text-green-600" : "text-orange-600"
                      )}>
                        {metric.difference > 0 ? '+' : ''}{metric.difference}
                      </span>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* 预算 */}
            <tr className="border-b">
              <td className="p-3 font-medium">预算</td>
              {comparisonMetrics.map((metric) => (
                <td
                  key={metric.planId}
                  className={cn(
                    "text-center p-3 border-l",
                    selectedPlanIds.includes(metric.planId) && "bg-primary/5"
                  )}
                >
                  {metric.budget > 0 ? formatCurrency(metric.budget, currency) : '-'}
                </td>
              ))}
            </tr>

            {/* 综合决策 */}
            <tr className="border-b">
              <td className="p-3 font-medium">综合决策</td>
              {comparisonMetrics.map((metric) => {
                const status = normalizeGateStatus(metric.decision);
                const StatusIcon = getGateStatusIcon(status);
                const label = getGateStatusLabel(status);
                const className = getGateStatusClasses(status);
                
                return (
                  <td
                    key={metric.planId}
                    className={cn(
                      "text-center p-3 border-l",
                      selectedPlanIds.includes(metric.planId) && "bg-primary/5"
                    )}
                  >
                    <Badge className={cn("flex items-center gap-1.5 px-3 py-1", className)}>
                      <StatusIcon className="w-3 h-3" />
                      {label}
                    </Badge>
                  </td>
                );
              })}
            </tr>

            {/* 三人格评估 */}
            <tr className="border-b">
              <td className="p-3 font-medium">Abu 评估</td>
              {comparisonMetrics.map((metric) => {
                const status = normalizeGateStatus(metric.abuVerdict);
                const label = getGateStatusLabel(status);
                
                return (
                  <td
                    key={metric.planId}
                    className={cn(
                      "text-center p-3 border-l text-xs",
                      selectedPlanIds.includes(metric.planId) && "bg-primary/5"
                    )}
                  >
                    {label}
                  </td>
                );
              })}
            </tr>

            <tr className="border-b">
              <td className="p-3 font-medium">Dr.Dre 评估</td>
              {comparisonMetrics.map((metric) => {
                const status = normalizeGateStatus(metric.drdreVerdict);
                const label = getGateStatusLabel(status);
                
                return (
                  <td
                    key={metric.planId}
                    className={cn(
                      "text-center p-3 border-l text-xs",
                      selectedPlanIds.includes(metric.planId) && "bg-primary/5"
                    )}
                  >
                    {label}
                  </td>
                );
              })}
            </tr>

            <tr className="border-b">
              <td className="p-3 font-medium">Neptune 评估</td>
              {comparisonMetrics.map((metric) => {
                const status = normalizeGateStatus(metric.neptuneVerdict);
                const label = getGateStatusLabel(status);
                
                return (
                  <td
                    key={metric.planId}
                    className={cn(
                      "text-center p-3 border-l text-xs",
                      selectedPlanIds.includes(metric.planId) && "bg-primary/5"
                    )}
                  >
                    {label}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 方案详情对比 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.planState.plan_id}
            className={cn(
              "cursor-pointer transition-all",
              selectedPlanIds.includes(plan.planState.plan_id)
                ? "border-2 border-primary shadow-lg"
                : "hover:border-primary/50"
            )}
            onClick={() => onSelectPlan(plan.planState.plan_id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">方案 v{plan.planState.plan_version}</CardTitle>
                <Badge variant="outline">{plan.planState.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {plan.uiOutput.consolidatedDecision && (
                <div>
                  <p className="text-xs font-medium mb-1">综合决策：</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {plan.uiOutput.consolidatedDecision.summary}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">行程项</p>
                  <p className="font-semibold">{extractPlanItems(plan.planState).length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">预算</p>
                  <p className="font-semibold">
                    {plan.planState.budget?.total ? formatCurrency(plan.planState.budget.total, currency) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">状态</p>
                  <Badge variant="outline" className="text-xs">
                    {plan.planState.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 对比差异详情 */}
      {compareResult && compareResult.differences && compareResult.differences.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">详细差异对比</h4>
          <div className="space-y-2">
            {compareResult.differences.map((diff: PlanDifference, index: number) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg border",
                  diff.impact === 'high' ? "bg-red-50 border-red-200" :
                  diff.impact === 'medium' ? "bg-orange-50 border-orange-200" :
                  "bg-blue-50 border-blue-200"
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-sm">{diff.field}</p>
                  <Badge
                    variant={diff.impact === 'high' ? 'destructive' : diff.impact === 'medium' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {diff.impact === 'high' ? '高影响' : diff.impact === 'medium' ? '中影响' : '低影响'}
                  </Badge>
                </div>
                {diff.description && (
                  <p className="text-xs text-muted-foreground mt-1">{diff.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">方案 1:</p>
                    <p className="font-medium">{String(diff.plan1Value)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">方案 2:</p>
                    <p className="font-medium">{String(diff.plan2Value)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 对比摘要 */}
      {compareResult && compareResult.summary && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">对比摘要</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {compareResult.summary.bestBudget && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">最佳预算</p>
                <p className="font-medium">{compareResult.summary.bestBudget}</p>
              </div>
            )}
            {compareResult.summary.bestRoute && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">最佳路线</p>
                <p className="font-medium">{compareResult.summary.bestRoute}</p>
              </div>
            )}
            {compareResult.summary.bestTime && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">最佳时间</p>
                <p className="font-medium">{compareResult.summary.bestTime}</p>
              </div>
            )}
          </div>
          {compareResult.summary.recommendations && compareResult.summary.recommendations.length > 0 && (
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium mb-2">推荐建议：</p>
              <ul className="space-y-1">
                {compareResult.summary.recommendations.map((rec, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 提示信息 */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900">
          <strong>提示：</strong>
          点击方案列标题或卡片可以选中方案，然后点击"应用选中方案"按钮切换到该方案。
          {plans.length === 1 && ' 当前只有一个方案，建议先生成多个方案后再进行对比。'}
        </p>
      </div>
    </div>
  );
}
