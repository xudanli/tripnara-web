import { useState, useEffect, useContext, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/utils/format';
import { RefreshCw, GitCompare, CheckCircle2, Settings2, FileText, ChevronDown, Clock, MapPin, ExternalLink, Calendar, Eye, Mountain, TrendingUp, AlertTriangle, Activity, Sparkles, Cloud, Shield, Route, HelpCircle, ChevronUp, Zap, Users, BarChart3 } from 'lucide-react';
// V2 优化组件
import { 
  PlanEvaluationCard, 
  NegotiationResultCard,
  RiskAssessmentCard,
} from '@/components/optimization';
import { 
  useEvaluatePlan, 
  useNegotiation, 
  useRiskAssessment,
} from '@/hooks/useOptimizationV2';
import type { RoutePlanDraft } from '@/types/optimization-v2';
import { tripDetailToRoutePlanDraft } from '@/utils/plan-converters';
import { buildWorldModelContext } from '@/utils/world-context-builder';
import { useFitnessContext } from '@/contexts/FitnessContext';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { demApi } from '@/api/dem';
import type { GetElevationProfileResponse, Coordinate } from '@/api/dem';
import type { TripDetail, PlanBudgetEvaluationResponse } from '@/types/trip';
import { toast } from 'sonner';
import { useContextApi, useIcelandInfo, useIsIcelandTrip } from '@/hooks';
import { inferIcelandInfoParams } from '@/utils/iceland-info-inference';
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
import { DecisionCardsGrid } from '@/components/decision-draft';
import PlanStudioContext from '@/contexts/PlanStudioContext';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingBudgetEvaluation, setLoadingBudgetEvaluation] = useState(false);
  const [budgetDecisionLog, setBudgetDecisionLog] = useState<import('@/types/trip').BudgetDecisionLogResponse | null>(null);
  const [budgetLogDialogOpen, setBudgetLogDialogOpen] = useState(false);
  const [loadingBudgetLog, setLoadingBudgetLog] = useState(false);
  
  // 🆕 首次使用引导
  const [showGuide, setShowGuide] = useState(false);
  
  // 🆕 加载进度状态
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState<string>('');

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  // 🆕 检查是否需要显示首次使用引导
  useEffect(() => {
    if (!result && !loading && trip) {
      const hasSeenGuide = localStorage.getItem('hasSeenWorkbenchGuide');
      if (!hasSeenGuide) {
        // 延迟显示，让页面先加载完成
        const timer = setTimeout(() => {
          setShowGuide(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [result, loading, trip]);

  // 🆕 冰岛信息源集成
  const isIceland = useIsIcelandTrip(trip?.destination);
  
  // 🆕 动态推断冰岛信息源查询参数（避免硬编码）
  const icelandInfoParams = inferIcelandInfoParams(trip);
  
  const icelandInfo = useIcelandInfo({
    autoFetch: false, // 不自动获取，手动触发
    refreshInterval: 0,
  });
  
  // 🆕 自动获取冰岛信息（使用推断的参数）
  useEffect(() => {
    if (isIceland && trip && icelandInfoParams) {
      // 延迟执行，避免阻塞页面加载
      const timer = setTimeout(() => {
        icelandInfo.fetchAll(icelandInfoParams);
      }, 2000); // 延迟2秒，让行程数据先加载
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIceland, trip?.id]);

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
      
      // ✅ 对于 500 错误，记录警告但不显示错误提示（因为预算评估是可选的）
      const isServerError = err?.response?.status === 500;
      
      if (!isNotFoundError && !isServerError) {
        // 只有非"未找到"和非服务器错误的错误才记录警告日志
        console.warn('⚠️ [Planning Workbench] 加载预算评估失败（非资源不存在错误）:', {
          planId,
          error: errorMessage,
          code: err?.code,
        });
      } else if (isNotFoundError) {
        // "未找到"错误静默处理，只记录调试信息
        console.log('ℹ️ [Planning Workbench] 预算评估结果不存在（方案可能尚未进行预算评估）:', planId);
      } else if (isServerError) {
        // 服务器错误记录警告但不显示错误提示
        console.warn('⚠️ [Planning Workbench] 预算评估加载失败（服务器错误）:', planId);
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
      // ✅ 根据错误类型处理
      const errorMessage = err?.message || '';
      const isNotFoundError = 
        errorMessage.includes('未找到') || 
        errorMessage.includes('not found') ||
        errorMessage.includes('不存在') ||
        err?.code === 'NOT_FOUND' ||
        err?.response?.status === 404;
      
      if (isNotFoundError) {
        // 404错误静默处理，因为决策日志是可选的
        console.log('ℹ️ [Planning Workbench] 预算决策日志不存在:', planId);
        setBudgetDecisionLog(null);
      } else if (err?.response?.status === 500) {
        // 500错误记录警告但不显示错误提示（因为决策日志是可选的）
        console.warn('⚠️ [Planning Workbench] 预算决策日志加载失败（服务器错误）:', planId);
        setBudgetDecisionLog(null);
      } else {
        // 其他错误显示友好提示
        console.error('Failed to load budget decision log:', err);
        toast.error('加载预算决策日志失败');
      }
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
    
    // 🆕 初始化加载进度
    setLoadingProgress(0);
    setLoadingStage('准备中...');

    try {
      // 🆕 模拟进度更新（实际应该从后端获取）
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      // 🆕 构建用户查询文本（根据操作类型）
      const userQueryMap: Record<UserAction, string> = {
        generate: `帮我规划${trip.destination || ''}的${trip.TripDay?.length || 0}天行程`,
        compare: '对比当前方案与其他方案',
        commit: '提交当前方案到行程',
        adjust: '调整当前方案',
      };
      const userQuery = userQueryMap[userAction] || '执行规划操作';

      setLoadingStage('构建上下文...');
      setLoadingProgress(20);

      // 🆕 构建 Context Package（可选，如果后端支持可以传递）
      const contextPkg = await buildContextPackage(userQuery);
      
      setLoadingProgress(40);
      setLoadingStage('执行规划操作...');
      
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

      clearInterval(progressInterval);
      setLoadingProgress(100);
      setLoadingStage('完成');

      setResult(response);
      toast.success(`规划工作台${getActionLabel(userAction)}成功`);
      
      // 如果生成了新方案，自动加载预算评估结果
      if (userAction === 'generate' && response.planState?.plan_id) {
        loadBudgetEvaluation(response.planState.plan_id);
      }
      
      // 延迟重置进度
      setTimeout(() => {
        setLoadingProgress(0);
        setLoadingStage('');
      }, 500);
      
      return response;
    } catch (err: any) {
      console.error(`Planning workbench ${userAction} failed:`, err);
      const errorMessage = err.message || `${getActionLabel(userAction)}失败，请稍后重试`;
      setError(errorMessage);
      toast.error(errorMessage);
      setLoadingProgress(0);
      setLoadingStage('');
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

  // 🆕 快速对比：与当前方案对比
  const handleQuickCompare = async (planId: string) => {
    if (!result?.planState) {
      toast.error('请先生成方案后再进行对比');
      return;
    }
    
    setLoading(true);
    try {
      const quickSelectedIds = [result.planState.plan_id, planId];
      await handleExecuteCompare(quickSelectedIds);
    } catch (err) {
      console.error('Quick compare failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 自动对比：选择方案后自动执行对比
  const handleAutoCompare = async (planId: string) => {
    const newSelectedIds = selectedPlanIds.includes(planId)
      ? selectedPlanIds.filter(id => id !== planId)
      : [...selectedPlanIds, planId];
    
    setSelectedPlanIds(newSelectedIds);
    
    // 如果选择了至少2个方案，自动执行对比
    if (newSelectedIds.length >= 2) {
      await handleExecuteCompare(newSelectedIds);
    } else {
      // 如果少于2个，清除对比结果
      setCompareResult(null);
      setComparingPlans([]);
    }
  };

  // 执行方案对比
  const handleExecuteCompare = async (planIds?: string[]) => {
    const idsToCompare = planIds || selectedPlanIds;
    
    if (idsToCompare.length < 2) {
      toast.error('请至少选择 2 个方案进行对比');
      return;
    }

    setLoading(true);
    try {
      // ✅ 验证方案ID是否有效
      const validPlanIds: string[] = [];
      const invalidPlanIds: string[] = [];
      
      for (const planId of idsToCompare) {
        try {
          await planningWorkbenchApi.getState(planId);
          validPlanIds.push(planId);
        } catch (err: any) {
          console.warn(`方案 ${planId} 不存在或无法访问:`, err);
          invalidPlanIds.push(planId);
        }
      }

      if (invalidPlanIds.length > 0) {
        toast.warning(`已跳过 ${invalidPlanIds.length} 个无效方案`);
      }

      if (validPlanIds.length < 2) {
        toast.error('至少需要 2 个有效方案才能进行对比。请刷新方案列表后重试。', {
          duration: 5000,
          action: {
            label: '刷新列表',
            onClick: () => loadAvailablePlans(),
          },
        });
        return;
      }

      const compareResult = await planningWorkbenchApi.comparePlans({
        planIds: validPlanIds,
      });
      
      setCompareResult(compareResult);
      setSelectedPlanIds(validPlanIds);
      
      // 将对比结果转换为 ExecutePlanningWorkbenchResponse 格式以便显示
      const plansForDisplay: ExecutePlanningWorkbenchResponse[] = compareResult.plans.map(p => ({
        planState: p.planState,
        uiOutput: p.uiOutput,
      }));
      setComparingPlans(plansForDisplay);
      
      toast.success(`成功对比 ${validPlanIds.length} 个方案`);
    } catch (err: any) {
      console.error('Compare plans failed:', err);
      const errorMessage = err.message || '对比方案失败';
      
      // 🆕 提供更友好的错误提示和恢复建议
      if (errorMessage.includes('找不到') || errorMessage.includes('not found') || errorMessage.includes('不存在')) {
        toast.error('部分方案不存在或已被删除', {
          description: '请刷新方案列表，然后重新选择方案进行对比',
          duration: 5000,
          action: {
            label: '刷新列表',
            onClick: () => loadAvailablePlans(),
          },
        });
      } else if (err.response?.status === 500) {
        toast.error('服务器错误', {
          description: '服务器暂时无法处理请求，请稍后重试。如果问题持续，请联系技术支持。',
          duration: 6000,
        });
      } else if (err.response?.status === 429) {
        toast.error('请求过于频繁', {
          description: '请稍等片刻后再试',
          duration: 4000,
        });
      } else {
        toast.error(errorMessage, {
          description: '请检查网络连接或稍后重试',
          duration: 5000,
        });
      }
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
      
      // 🆕 清空当前结果，让标签消失，用户可以重新生成
      setResult(null);
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

  // 🆕 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + G: 生成方案
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (!loading && trip) {
          handleGenerate();
        }
      }
      // Ctrl/Cmd + C: 对比方案
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && result) {
        e.preventDefault();
        handleCompare();
      }
      // Ctrl/Cmd + Enter: 提交方案
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && result) {
        e.preventDefault();
        if (result.uiOutput.consolidatedDecision?.status !== 'REJECT') {
          handleCommit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, trip, result]);

  // 🆕 检查是否有未提交的方案或未保存的时间轴改动
  const planStudioContext = useContext(PlanStudioContext);
  const hasUncommittedPlan = !!result;
  const hasUnsavedScheduleChanges = planStudioContext?.hasUnsavedScheduleChanges || false;
  
  // 显示标签的条件：有未提交的方案 或 有时间轴数据改动未提交生成方案
  const shouldShowBadge = hasUncommittedPlan || hasUnsavedScheduleChanges;

  return (
    <div className="space-y-6">
      {/* 🆕 未提交方案/未保存改动提示标签 */}
      {shouldShowBadge && (
        <div className="flex items-center justify-center">
          <Badge 
            variant="outline" 
            className="bg-gray-50 text-gray-700 border-gray-200 px-3 py-1.5 rounded-full text-sm font-normal shadow-sm"
          >
            {hasUnsavedScheduleChanges && !hasUncommittedPlan ? '有方案未提交' : '有方案未提交'}
          </Badge>
        </div>
      )}
      
      {/* 🆕 加载状态 - 骨架屏和进度指示 */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LogoLoading size={48} />
                  <div>
                    <p className="font-medium">{loadingStage || '正在处理...'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      请稍候，这可能需要一些时间
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{Math.round(loadingProgress)}%</Badge>
              </div>
              <Progress value={loadingProgress} className="h-2" />
              
              {/* 🆕 骨架屏预览 */}
              <div className="space-y-4 pt-4 border-t">
                <Skeleton className="h-32 w-full" />
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空状态 - 优化设计 */}
      {!result && !loading && !error && (
        <div className="space-y-6">
          {/* 🆕 简化的说明卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>决策评估</CardTitle>
              <CardDescription>
                三人格（Abu/Dr.Dre/Neptune）将评估您的行程方案
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 🆕 简化的三人格介绍（只显示图标和一句话，移动端优化） */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="text-center">
                  {(() => {
                    const AbuIcon = getPersonaIcon('ABU');
                    return (
                      <AbuIcon className={cn('w-10 h-10 mx-auto mb-2', getPersonaIconColorClasses('ABU'))} />
                    );
                  })()}
                  <p className="text-xs font-medium">Abu</p>
                  <p className="text-xs text-muted-foreground mt-1">安全评估</p>
                </div>
                <div className="text-center">
                  {(() => {
                    const DrDreIcon = getPersonaIcon('DR_DRE');
                    return (
                      <DrDreIcon className={cn('w-10 h-10 mx-auto mb-2', getPersonaIconColorClasses('DR_DRE'))} />
                    );
                  })()}
                  <p className="text-xs font-medium">Dr.Dre</p>
                  <p className="text-xs text-muted-foreground mt-1">节奏评估</p>
                </div>
                <div className="text-center">
                  {(() => {
                    const NeptuneIcon = getPersonaIcon('NEPTUNE');
                    return (
                      <NeptuneIcon className={cn('w-10 h-10 mx-auto mb-2', getPersonaIconColorClasses('NEPTUNE'))} />
                    );
                  })()}
                  <p className="text-xs font-medium">Neptune</p>
                  <p className="text-xs text-muted-foreground mt-1">替代方案</p>
                </div>
              </div>
              
              {/* 🆕 添加"了解更多"链接 */}
              <div className="text-center pt-2 border-t">
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setShowGuide(true)}
                  className="text-xs"
                >
                  了解更多决策流程 →
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* 🆕 提升"生成方案"按钮优先级 */}
          <div className="flex flex-col items-center gap-4">
            {trip && (
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {trip.destination || '未设置目的地'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {trip.TripDay?.length || 0} 天行程
                </p>
              </div>
            )}
            <Button
              onClick={handleGenerate}
              disabled={loading || !trip}
              size="lg"
              className="min-w-[240px] h-12 text-base shadow-lg hover:shadow-xl transition-shadow"
            >
              <RefreshCw className={cn('w-5 h-5 mr-2', loading && 'animate-spin')} />
              {loading ? '生成中...' : '生成方案'}
            </Button>
            {!trip && (
              <p className="text-xs text-muted-foreground">
                请先加载行程信息
              </p>
            )}
          </div>
        </div>
      )}

      {/* 🆕 合规规则卡片 - 仅在生成方案后显示 */}
      {result && trip && trip.destination && (
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

      {/* 🆕 冰岛官方信息源（仅冰岛行程）- 仅在生成方案后显示 */}
      {result && isIceland && trip && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">冰岛官方信息源</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const params = inferIcelandInfoParams(trip);
                  icelandInfo.fetchAll(params);
                }}
                disabled={
                  icelandInfo.weather.loading ||
                  icelandInfo.safety.loading ||
                  icelandInfo.roadConditions.loading
                }
                className="h-8 text-xs"
              >
                {(icelandInfo.weather.loading ||
                  icelandInfo.safety.loading ||
                  icelandInfo.roadConditions.loading) ? (
                  <>
                    <Spinner className="mr-2 h-3 w-3" />
                    刷新中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    刷新
                  </>
                )}
              </Button>
            </div>
            <CardDescription className="text-xs">
              实时获取冰岛官方天气、安全和路况信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 天气信息 */}
            {icelandInfo.weather.loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                <span>加载天气数据...</span>
              </div>
            )}
            {icelandInfo.weather.error && (
              <div className="text-sm text-red-500">
                天气数据加载失败: {icelandInfo.weather.error}
              </div>
            )}
            {icelandInfo.weather.data && (
              <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                <Cloud className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-700 mb-1">高地天气预报</div>
                  <div className="text-xs text-gray-600">
                    {icelandInfo.weather.data.station.name}: {Math.round(icelandInfo.weather.data.current.temperature)}°C
                    {icelandInfo.weather.data.current.windSpeedKmh && (
                      <span className="ml-2">
                        ，风速 {Math.round(icelandInfo.weather.data.current.windSpeedKmh)} km/h
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 安全警报 */}
            {icelandInfo.safety.loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                <span>加载安全信息...</span>
              </div>
            )}
            {icelandInfo.safety.error && (
              <div className="text-sm text-red-500">
                安全信息加载失败: {icelandInfo.safety.error}
              </div>
            )}
            {icelandInfo.safety.data && icelandInfo.safety.data.alerts.length > 0 && (
              <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg">
                <Shield className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-700 mb-1">安全警报</div>
                  <div className="space-y-1">
                    {icelandInfo.safety.data.alerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="text-xs flex items-center gap-1">
                        <Badge
                          variant={
                            alert.severity === 'critical' || alert.severity === 'high'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {alert.severity === 'critical'
                            ? '严重'
                            : alert.severity === 'high'
                            ? '高'
                            : alert.severity === 'medium'
                            ? '中'
                            : '低'}
                        </Badge>
                        <span className="text-gray-700">{alert.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* F路路况 */}
            {icelandInfo.roadConditions.loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                <span>加载路况信息...</span>
              </div>
            )}
            {icelandInfo.roadConditions.error && (
              <div className="text-sm text-red-500">
                路况信息加载失败: {icelandInfo.roadConditions.error}
              </div>
            )}
            {icelandInfo.roadConditions.data &&
              icelandInfo.roadConditions.data.fRoads.length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg">
                  <Route className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-700 mb-1">F路路况</div>
                    <div className="space-y-1">
                      {icelandInfo.roadConditions.data.fRoads.slice(0, 3).map((road) => (
                        <div key={road.id} className="text-xs flex items-center gap-1">
                          <Badge
                            variant={
                              road.status === 'closed'
                                ? 'destructive'
                                : road.status === 'caution'
                                ? 'secondary'
                                : 'default'
                            }
                            className="text-xs"
                          >
                            {road.fRoadNumber}
                          </Badge>
                          <span
                            className={cn(
                              'text-gray-700',
                              road.status === 'closed' && 'text-red-600',
                              road.status === 'caution' && 'text-yellow-600'
                            )}
                          >
                            {road.status === 'closed'
                              ? '封闭'
                              : road.status === 'caution'
                              ? '谨慎'
                              : '开放'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* 🆕 统一操作区域 - 固定在顶部（移动端优化） */}
      {result && (
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm -mx-6 px-6 py-3">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">
                  方案 v{result.planState.plan_version}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                  {result.planState.plan_id.substring(0, 8)}...
                </span>
                {result.uiOutput?.timestamp && (
                  <span className="text-xs text-muted-foreground hidden md:inline">
                    | {(() => {
                      try {
                        const date = new Date(result.uiOutput.timestamp);
                        if (!isNaN(date.getTime())) {
                          return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        }
                      } catch {}
                      return '';
                    })()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <Button
                  onClick={handleCompare}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="flex-1 sm:flex-initial"
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">对比方案</span>
                  <span className="sm:hidden">对比</span>
                </Button>
                <Button
                  onClick={handleAdjust}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="flex-1 sm:flex-initial"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">调整方案</span>
                  <span className="sm:hidden">调整</span>
                </Button>
                {result.uiOutput.consolidatedDecision?.status !== 'REJECT' && (
                  <Button
                    onClick={handleCommit}
                    variant="default"
                    size="sm"
                    disabled={loading || committing}
                    className="flex-1 sm:flex-initial"
                  >
                    {committing ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">提交中...</span>
                        <span className="sm:hidden">提交中</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">提交方案</span>
                        <span className="sm:hidden">提交</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            {/* 🆕 快捷键提示（桌面端） */}
            <div className="hidden sm:flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>快捷键：</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+G</kbd>
              <span>生成</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+C</kbd>
              <span>对比</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Enter</kbd>
              <span>提交</span>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 优化的错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>执行失败</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">{error}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  if (trip) {
                    handleGenerate();
                  }
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  loadTrip();
                }}
              >
                刷新行程信息
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 结果展示 - 重新设计的布局 */}
      {result && (
        <div className="space-y-6">
          {/* 🆕 第一层：决策结果区 - 综合决策和方案概览并排 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 综合决策卡片 */}
            {result.uiOutput.consolidatedDecision && (() => {
              const status = result.uiOutput.consolidatedDecision.status;
              const statusStyle = getConsolidatedDecisionStyle(status);
              const normalizedStatus = normalizeGateStatus(status);
              const isAllow = normalizedStatus === 'ALLOW';
              const isNeedConfirm = normalizedStatus === 'NEED_CONFIRM';
              const isReject = normalizedStatus === 'REJECT';
              
              return (
                <Card className={cn(
                  'border-4 shadow-xl relative overflow-hidden',
                  isAllow && 'border-green-500 bg-green-50/30',
                  isNeedConfirm && 'border-amber-500 bg-amber-50/30',
                  isReject && 'border-red-500 bg-red-50/30'
                )}>
                  {/* 装饰性背景 */}
                  <div className={cn(
                    'absolute top-0 right-0 w-40 h-40 opacity-10 rounded-full -mr-20 -mt-20',
                    isAllow && 'bg-green-500',
                    isNeedConfirm && 'bg-amber-500',
                    isReject && 'bg-red-500'
                  )} />
                  
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-3">
                        {statusStyle.icon}
                        综合决策
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1 text-sm font-semibold',
                          statusStyle.className
                        )}
                      >
                        {statusStyle.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 relative z-10">
                    <p className="text-sm text-foreground leading-relaxed font-medium">
                      {result.uiOutput.consolidatedDecision.summary}
                    </p>
                    {result.uiOutput.consolidatedDecision.nextSteps &&
                      result.uiOutput.consolidatedDecision.nextSteps.length > 0 && (
                        <div className="space-y-1 pt-2 border-t">
                          <p className="text-xs font-semibold text-foreground">下一步：</p>
                          <ul className="space-y-1">
                            {result.uiOutput.consolidatedDecision.nextSteps.map((step, index) => (
                              <li key={index} className="text-xs text-foreground flex items-start gap-2">
                                <span className={cn(
                                  'mt-1',
                                  isAllow && 'text-green-600',
                                  isNeedConfirm && 'text-amber-600',
                                  isReject && 'text-red-600'
                                )}>•</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </CardContent>
                  <CardFooter className="border-t pt-4 relative z-10">
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
              );
            })()}

            {/* 🆕 方案概览卡片 */}
            {result.planState && (
              <PlanSummaryCard 
                planState={result.planState} 
                trip={trip}
                currency={currency}
              />
            )}
          </div>

          {/* 🆕 三人格评估 - 横向卡片布局 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PersonaCard persona={result.uiOutput.personas.abu} />
            <PersonaCard persona={result.uiOutput.personas.drdre} />
            <PersonaCard 
              persona={result.uiOutput.personas.neptune}
              showApplyButton={true}
              onApplyRecommendation={async (rec: RecommendationItem) => {
                try {
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

          {/* 🆕 详细信息区 - 标签页化 */}
          <div id="plan-details-section">
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="preview">方案预览</TabsTrigger>
                <TabsTrigger value="terrain">地形分析</TabsTrigger>
                <TabsTrigger value="budget">预算评估</TabsTrigger>
                <TabsTrigger value="technical">技术信息</TabsTrigger>
              </TabsList>
              
              {/* 方案预览标签页 */}
              <TabsContent value="preview" className="mt-4">
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
              </TabsContent>
              
              {/* 地形分析标签页 */}
              <TabsContent value="terrain" className="mt-4">
                {result.planState && (
                  <DEMTerrainAndFatigueView planState={result.planState} trip={trip} />
                )}
              </TabsContent>
              
              {/* 预算评估标签页 */}
              <TabsContent value="budget" className="mt-4">
                {budgetEvaluation && result.planState && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">预算评估</CardTitle>
                      <CardDescription>
                        预算合理性评估结果
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
                {!budgetEvaluation && (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <p className="text-sm">预算评估结果不存在</p>
                      <p className="text-xs mt-1">方案可能尚未进行预算评估</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              {/* 技术信息标签页 */}
              <TabsContent value="technical" className="mt-4">
                {result.planState && (
                  <Collapsible defaultOpen={true}>
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
                                {(() => {
                                  const timestamp = result.uiOutput?.timestamp;
                                  if (!timestamp) { return '-'; }
                                  try {
                                    const date = new Date(timestamp);
                                    if (isNaN(date.getTime())) { return '-'; }
                                    return date.toLocaleString('zh-CN');
                                  } catch { return '-'; }
                                })()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
              </TabsContent>
            </Tabs>
          </div>

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
            {/* 🆕 简化的方案选择区域 */}
            {!compareResult && (
              <div className="space-y-4">
                {/* 🆕 提示信息 */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>快速对比</AlertTitle>
                  <AlertDescription className="text-xs">
                    选择方案后会自动对比，或点击"快速对比"按钮与当前方案对比
                  </AlertDescription>
                </Alert>
                
                <div>
                  <p className="text-sm font-medium mb-3">
                    选择要对比的方案（已选择 {selectedPlanIds.length} 个）：
                  </p>
                  
                  {/* 🆕 当前方案 - 使用 Checkbox 组件 */}
                  {result && (
                    <div className="mb-3">
                      <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <Checkbox
                          checked={selectedPlanIds.includes(result.planState.plan_id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleAutoCompare(result.planState.plan_id);
                            } else {
                              setSelectedPlanIds(selectedPlanIds.filter(id => id !== result.planState.plan_id));
                              setCompareResult(null);
                              setComparingPlans([]);
                            }
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">当前方案 v{result.planState.plan_version}</p>
                          <p className="text-xs text-muted-foreground">
                            规划 ID: {result.planState.plan_id.substring(0, 8)}...
                          </p>
                        </div>
                        <Badge variant="outline">{result.planState.status}</Badge>
                      </div>
                    </div>
                  )}
                  
                  {/* 🆕 历史方案列表 - 使用 Checkbox 组件和快速对比按钮 */}
                  {availablePlans && availablePlans.plans.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {availablePlans.plans
                        .filter(p => !result || p.planId !== result.planState.plan_id)
                        .map((plan) => (
                          <div
                            key={plan.planId}
                            className={cn(
                              "flex items-center gap-3 p-3 border rounded-lg transition-colors",
                              selectedPlanIds.includes(plan.planId)
                                ? "bg-primary/5 border-primary"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <Checkbox
                              checked={selectedPlanIds.includes(plan.planId)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleAutoCompare(plan.planId);
                                } else {
                                  setSelectedPlanIds(selectedPlanIds.filter(id => id !== plan.planId));
                                  setCompareResult(null);
                                  setComparingPlans([]);
                                }
                              }}
                            />
                            <div className="flex-1">
                              <p className="font-medium">方案 v{plan.planVersion}</p>
                              <p className="text-xs text-muted-foreground">
                                创建于 {new Date(plan.createdAt).toLocaleString('zh-CN')}
                                {plan.summary && ` • ${plan.summary.itemCount} 项 • ${plan.summary.days} 天`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{plan.status}</Badge>
                              {result && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuickCompare(plan.planId)}
                                  disabled={loading}
                                  className="text-xs"
                                >
                                  快速对比
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  
                  {availablePlans && availablePlans.plans.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">暂无其他方案可对比</p>
                      <p className="text-xs mt-1">请先生成更多方案</p>
                    </div>
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
            {/* 🆕 手动执行对比按钮（如果自动对比未触发） */}
            {!compareResult && selectedPlanIds.length >= 2 && (
              <Button
                onClick={() => handleExecuteCompare()}
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
                    执行对比 ({selectedPlanIds.length})
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
            <div className="space-y-4">
              {/* 🆕 时间轴骨架屏 */}
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="relative space-y-6">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="relative pl-6">
                    {/* 时间线连接线 */}
                    {index < 3 && (
                      <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-border" />
                    )}
                    {/* 时间点标记 */}
                    <div className="absolute left-0 w-[18px] h-[18px] rounded-full border-2 bg-background border-blue-300">
                      <Skeleton className="w-full h-full rounded-full" />
                    </div>
                    {/* 内容区域 */}
                    <div className="space-y-2">
                      {/* 头部：时间 + 徽章 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      {/* 动作描述 */}
                      <Skeleton className="h-4 w-3/4" />
                      {/* 原因说明 */}
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                      {/* 证据引用 */}
                      <div className="flex items-center gap-1 mt-1">
                        <Skeleton className="h-3 w-8" />
                        <Skeleton className="h-3 w-6 rounded" />
                        <Skeleton className="h-3 w-6 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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

      {/* 🆕 首次使用引导对话框 */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>欢迎使用决策评估</DialogTitle>
            <DialogDescription>
              三人格系统将帮助您评估行程方案
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                  1
                </span>
                <div>
                  <p className="text-sm font-medium">生成方案</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    点击"生成方案"按钮，系统将自动评估您的行程
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                  2
                </span>
                <div>
                  <p className="text-sm font-medium">查看评估结果</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Abu、Dr.Dre、Neptune 将分别从安全、节奏、修复角度提供评估
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                  3
                </span>
                <div>
                  <p className="text-sm font-medium">做出决策</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    根据评估结果决定是否提交、对比或调整方案
                  </p>
                </div>
              </div>
            </div>
            
            {/* 三人格快速介绍 */}
            <div className="pt-4 border-t">
              <p className="text-xs font-medium mb-2">三人格介绍：</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  {(() => {
                    const AbuIcon = getPersonaIcon('ABU');
                    return (
                      <AbuIcon className={cn('w-6 h-6 mx-auto mb-1', getPersonaIconColorClasses('ABU'))} />
                    );
                  })()}
                  <p className="font-medium">Abu</p>
                  <p className="text-muted-foreground">安全评估</p>
                </div>
                <div className="text-center">
                  {(() => {
                    const DrDreIcon = getPersonaIcon('DR_DRE');
                    return (
                      <DrDreIcon className={cn('w-6 h-6 mx-auto mb-1', getPersonaIconColorClasses('DR_DRE'))} />
                    );
                  })()}
                  <p className="font-medium">Dr.Dre</p>
                  <p className="text-muted-foreground">节奏评估</p>
                </div>
                <div className="text-center">
                  {(() => {
                    const NeptuneIcon = getPersonaIcon('NEPTUNE');
                    return (
                      <NeptuneIcon className={cn('w-6 h-6 mx-auto mb-1', getPersonaIconColorClasses('NEPTUNE'))} />
                    );
                  })()}
                  <p className="font-medium">Neptune</p>
                  <p className="text-muted-foreground">替代方案</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                localStorage.setItem('hasSeenWorkbenchGuide', 'true');
                setShowGuide(false);
              }}
            >
              开始使用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* V2 优化评估区域 */}
      {trip && result && (
        <V2OptimizeSection tripId={tripId} trip={trip} result={result} />
      )}
    </div>
  );
}

// V2 优化评估区域组件
function V2OptimizeSection({ 
  tripId, 
  trip, 
  result 
}: { 
  tripId: string; 
  trip: TripDetail;
  result: ExecutePlanningWorkbenchResponse;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const evaluateMutation = useEvaluatePlan();
  const negotiationMutation = useNegotiation();
  const riskMutation = useRiskAssessment();
  const { profile: fitnessProfile } = useFitnessContext();

  // 使用转换工具构建 plan / world
  const planDraft = useMemo(
    () => tripDetailToRoutePlanDraft(trip),
    [trip]
  );
  const worldContext = useMemo(
    () => buildWorldModelContext(trip, { fitnessProfile }),
    [trip, fitnessProfile]
  );

  const handleEvaluate = async () => {
    try {
      await evaluateMutation.mutateAsync({ plan: planDraft, world: worldContext });
      toast.success('V2 评估完成');
    } catch (error) {
      toast.error('评估失败');
    }
  };

  const handleNegotiate = async () => {
    try {
      await negotiationMutation.mutateAsync({ plan: planDraft, world: worldContext });
      toast.success('协商完成');
    } catch (error) {
      toast.error('协商失败');
    }
  };

  const handleRiskAssess = async () => {
    try {
      await riskMutation.mutateAsync({ plan: planDraft, world: worldContext });
      toast.success('风险评估完成');
    } catch (error) {
      toast.error('风险评估失败');
    }
  };

  const isLoading = evaluateMutation.isPending || negotiationMutation.isPending || riskMutation.isPending;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="border-dashed border-primary/30">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                V2 优化引擎
                <Badge variant="outline" className="text-xs">Beta</Badge>
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <CardDescription>
              使用 8 维效用函数评估当前方案
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleEvaluate} disabled={isLoading} size="sm">
                {evaluateMutation.isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    评估中...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    评估方案
                  </>
                )}
              </Button>
              <Button onClick={handleNegotiate} disabled={isLoading} variant="outline" size="sm">
                {negotiationMutation.isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    协商中...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    三守护者协商
                  </>
                )}
              </Button>
              <Button onClick={handleRiskAssess} disabled={isLoading} variant="outline" size="sm">
                {riskMutation.isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    评估中...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    风险评估
                  </>
                )}
              </Button>
            </div>

            {/* 评估结果 */}
            {evaluateMutation.data && (
              <PlanEvaluationCard
                evaluation={evaluateMutation.data}
                showRadar
                compact
              />
            )}

            {/* 协商结果 */}
            {negotiationMutation.data && (
              <NegotiationResultCard
                result={negotiationMutation.data}
                tripId={tripId}
                compact
              />
            )}

            {/* 风险评估结果 */}
            {riskMutation.data && (
              <RiskAssessmentCard
                assessment={riskMutation.data}
                compact
              />
            )}

            {/* 空状态 */}
            {!evaluateMutation.data && !negotiationMutation.data && !riskMutation.data && !isLoading && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                点击上方按钮开始 V2 优化分析
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onLoadBudgetDecisionLog, // 传递给 PlanPreviewContent，可能被使用
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
  const [decisionVisualizationOpen, setDecisionVisualizationOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  // 获取决策草案ID
  useEffect(() => {
    const loadDraftId = async () => {
      try {
        // 尝试从 planState 中获取 decision_draft_id
        const draftIdFromState = (planState as any).decision_draft_id;
        if (draftIdFromState) {
          setDraftId(draftIdFromState);
          return;
        }

        // 如果没有，尝试使用 plan_id
        const planId = (planState as any).plan_id;
        if (planId) {
          // 尝试获取方案状态
          try {
            const planStateData = await planningWorkbenchApi.getState(planId);
            const draftIdFromPlanState = (planStateData as any).decision_draft_id;
            if (draftIdFromPlanState) {
              setDraftId(draftIdFromPlanState);
            } else {
              // 使用 plan_id 作为 draftId（假设后端支持）
              setDraftId(planId);
            }
          } catch {
            // 如果获取失败，使用 plan_id
            setDraftId(planId);
          }
        }
      } catch (err) {
        console.warn('Failed to load draft ID:', err);
      }
    };

    if (planState) {
      loadDraftId();
    }
  }, [planState]);
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
                          {(() => {
                            // ✅ 安全地处理 startTime
                            if (!item.startTime) return '-';
                            const startTimeStr = typeof item.startTime === 'string' 
                              ? item.startTime 
                              : item.startTime instanceof Date 
                                ? item.startTime.toISOString()
                                : String(item.startTime);
                            return startTimeStr.includes('T') 
                              ? format(new Date(startTimeStr), 'HH:mm')
                              : startTimeStr;
                          })()}
                          {item.endTime && ` - ${(() => {
                            // ✅ 安全地处理 endTime
                            const endTimeStr = typeof item.endTime === 'string' 
                              ? item.endTime 
                              : item.endTime instanceof Date 
                                ? item.endTime.toISOString()
                                : String(item.endTime);
                            return endTimeStr.includes('T') 
                              ? format(new Date(endTimeStr), 'HH:mm')
                              : endTimeStr;
                          })()}`}
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

          {/* 决策可视化入口 - 仅对自然语言创建的行程显示 */}
          {/* 注意：决策草案只在自然语言创建流程中生成，因此只有自然语言创建的行程才有决策可视化 */}
          {draftId && (
            <Collapsible open={decisionVisualizationOpen} onOpenChange={setDecisionVisualizationOpen}>
              <Card className="border-t">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <HelpCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">为什么这样安排？</CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            点击查看系统如何做出决策
                          </CardDescription>
                        </div>
                      </div>
                      {decisionVisualizationOpen ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <DecisionCardsGrid draftId={draftId} userMode="toc" />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
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

// 🆕 方案概览卡片组件
function PlanSummaryCard({
  planState,
  trip,
  currency = 'CNY',
}: {
  planState: any;
  trip: TripDetail | null;
  currency?: string;
}) {
  const planItems = extractPlanItems(planState);
  const itemCount = planItems.length;
  const days = planState.constraints?.days || trip?.TripDay?.length || 0;
  const totalBudget = planState.budget?.total || 0;
  
  // 计算累计爬升（从行程项中提取）
  let totalAscent = 0;
  planItems.forEach((item: any) => {
    const physicalMetadata = item.physicalMetadata || item.Place?.metadata?.physicalMetadata || {};
    totalAscent += physicalMetadata.elevationGainM || 0;
  });
  
  // 难度评估（基于累计爬升）
  const getDifficulty = () => {
    if (totalAscent === 0) return { label: '-', color: 'text-muted-foreground' };
    if (totalAscent < 500) return { label: '简单', color: 'text-green-600' };
    if (totalAscent < 1000) return { label: '中等', color: 'text-blue-600' };
    if (totalAscent < 2000) return { label: '困难', color: 'text-orange-600' };
    return { label: '极难', color: 'text-red-600' };
  };
  
  const difficulty = getDifficulty();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="w-5 h-5" />
          方案概览
        </CardTitle>
        <CardDescription>
          关键指标一览
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-2xl font-bold">{itemCount}</p>
              <p className="text-xs text-muted-foreground mt-1">行程项</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-2xl font-bold">{days}</p>
              <p className="text-xs text-muted-foreground mt-1">天数</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-2xl font-bold">{totalAscent > 0 ? totalAscent.toLocaleString() : '-'}</p>
              <p className="text-xs text-muted-foreground mt-1">累计爬升 (m)</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Mountain className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className={cn('text-2xl font-bold', difficulty.color)}>{difficulty.label}</p>
              <p className="text-xs text-muted-foreground mt-1">难度</p>
            </div>
          </div>
        </div>
        
        {totalBudget > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">总预算</span>
              <span className="text-lg font-bold">{formatCurrency(totalBudget, currency)}</span>
            </div>
          </div>
        )}
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full"
          onClick={() => {
            // 滚动到详细信息区
            const detailSection = document.getElementById('plan-details-section');
            if (detailSection) {
              detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        >
          查看详情 →
        </Button>
      </CardContent>
    </Card>
  );
}

// 🆕 辅助函数：从 planState 提取路线点（polyline）
function extractPolylineFromPlanState(planState: any, trip: TripDetail | null): Coordinate[] {
  const polyline: Coordinate[] = [];
  
  // 方法1：从 planState.itinerary.segments 提取
  if (planState?.itinerary?.segments && Array.isArray(planState.itinerary.segments)) {
    planState.itinerary.segments.forEach((segment: any) => {
      // 尝试从 segment 的 metadata 或 geometry 中提取坐标
      if (segment.geometry?.coordinates) {
        segment.geometry.coordinates.forEach((coord: number[]) => {
          if (coord.length >= 2) {
            polyline.push({ lng: coord[0], lat: coord[1] });
          }
        });
      } else if (segment.fromLat && segment.fromLng) {
        polyline.push({ lat: segment.fromLat, lng: segment.fromLng });
      }
      if (segment.toLat && segment.toLng) {
        polyline.push({ lat: segment.toLat, lng: segment.toLng });
      }
    });
  }
  
  // 方法2：从行程项（ItineraryItem）提取 POI 坐标
  if (polyline.length === 0 && trip?.TripDay) {
    trip.TripDay.forEach((day) => {
      if (day.ItineraryItem && Array.isArray(day.ItineraryItem)) {
        day.ItineraryItem.forEach((item: any) => {
          const place = item.Place || item.place;
          if (place) {
            const lat = place.latitude || place.lat || place.metadata?.location?.lat;
            const lng = place.longitude || place.lng || place.metadata?.location?.lng;
            if (lat && lng) {
              polyline.push({ lat: Number(lat), lng: Number(lng) });
            }
          }
        });
      }
    });
  }
  
  // 方法3：从 planItems 提取
  if (polyline.length === 0) {
    const planItems = extractPlanItems(planState);
    planItems.forEach((item: any) => {
      const place = item.Place || item.place;
      if (place) {
        const lat = place.latitude || place.lat || place.metadata?.location?.lat;
        const lng = place.longitude || place.lng || place.metadata?.location?.lng;
        if (lat && lng) {
          polyline.push({ lat: Number(lat), lng: Number(lng) });
        }
      }
    });
  }
  
  return polyline;
}

// DEM 地形与体力模型展示组件
function DEMTerrainAndFatigueView({
  planState,
  trip,
}: {
  planState: any;
  trip: TripDetail | null;
}) {
  const [terrainData, setTerrainData] = useState<GetElevationProfileResponse | null>(null);
  const [loadingTerrain, setLoadingTerrain] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [terrainError, setTerrainError] = useState<string | null>(null); // 保留用于未来错误显示

  // 🆕 从 planState 提取路线点并获取 DEM 数据
  useEffect(() => {
    if (!planState || !trip) return;

    const loadTerrainData = async () => {
      try {
        // 提取路线点
        const polyline = extractPolylineFromPlanState(planState, trip);
        
        // 至少需要 2 个点才能生成剖面
        if (polyline.length < 2) {
          console.debug('[DEM] 路线点不足，无法生成地形剖面:', polyline.length);
          return;
        }

        setLoadingTerrain(true);
        setTerrainError(null);

        // 🆕 调用 DEM API 获取地形数据
        const data = await demApi.getElevationProfile({
          polyline,
          samples: 100, // 默认采样间隔 100 米
          activityType: 'walking', // 默认活动类型为步行
        });

        setTerrainData(data);
      } catch (err: any) {
        console.error('[DEM] 获取地形数据失败:', err);
        setTerrainError(err.message || '获取地形数据失败');
        // 不显示错误提示，因为 DEM 数据是可选的
      } finally {
        setLoadingTerrain(false);
      }
    };

    loadTerrainData();
  }, [planState, trip]);

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

  // 🆕 优先使用 API 返回的地形数据，否则从行程项中提取
  let totalAscent = terrainData?.cumulativeAscent ?? 0;
  let maxSlope = terrainData?.maxSlope ?? 0;
  let totalDistance = terrainData ? terrainData.totalDistance / 1000 : 0; // 转换为公里
  let fatigueScore = terrainData?.fatigueIndex ?? 0;
  const difficulty = terrainData?.difficulty;
  const effortScore = terrainData?.effortScore ?? 0;

  // 如果没有 API 数据，从行程项中提取
  if (!terrainData) {
    const planItems = extractPlanItems(planState);
    const currentItems = trip?.TripDay?.flatMap(day => day.ItineraryItem || []) || [];
    const allItems = [
      ...(Array.isArray(planItems) ? planItems : []),
      ...(Array.isArray(currentItems) ? currentItems : [])
    ];
    
    if (Array.isArray(allItems)) {
      allItems.forEach((item: any) => {
        if (!item) return;
        const physicalMetadata = item.physicalMetadata || item.Place?.metadata?.physicalMetadata || {};
        totalAscent += physicalMetadata.elevationGainM || 0;
        maxSlope = Math.max(maxSlope, physicalMetadata.slopePct || 0);
        totalDistance += physicalMetadata.distanceKm || 0;
        fatigueScore += (physicalMetadata.base_fatigue_score || 0) * (physicalMetadata.intensity_factor || 1);
      });
    }
  }

  // 如果没有 DEM 数据，显示加载状态或提示
  if (loadingTerrain) {
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
            <Spinner className="w-12 h-12 mx-auto mb-3" />
            <p className="text-sm">DEM 地形数据加载中</p>
            <p className="text-xs mt-1">
              系统将分析路线的坡度、爬升、海拔和体力消耗，确保方案的可执行性
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!terrainData && demEvidence.length === 0 && totalAscent === 0 && maxSlope === 0) {
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
        {/* 🆕 地形指标（优先使用 API 数据） */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">累计爬升</p>
            </div>
            <p className="text-xl font-bold">{totalAscent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">米</p>
            {terrainData && (
              <p className="text-xs text-muted-foreground mt-1">
                下降 {terrainData.totalDescent.toLocaleString()}m
              </p>
            )}
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Mountain className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">最大坡度</p>
            </div>
            <p className="text-xl font-bold">{maxSlope.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">%</p>
            {terrainData && (
              <p className="text-xs text-muted-foreground mt-1">
                海拔 {terrainData.minElevation.toFixed(0)}-{terrainData.maxElevation.toFixed(0)}m
              </p>
            )}
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
            <p className="text-xs text-muted-foreground mt-1">
              {difficulty ? (
                <Badge variant="outline" className="text-xs">
                  {difficulty === 'easy' ? '简单' : 
                   difficulty === 'moderate' ? '中等' :
                   difficulty === 'hard' ? '困难' : '极难'}
                </Badge>
              ) : (
                '总分'
              )}
            </p>
            {terrainData && effortScore > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                体力消耗 {effortScore.toFixed(1)}
              </p>
            )}
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
