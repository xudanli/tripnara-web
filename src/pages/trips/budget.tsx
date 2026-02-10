import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import { countriesApi } from '@/api/countries';
import type {
  BudgetSummary,
  BudgetOptimizationSuggestion,
  BudgetDetailsResponse,
  BudgetTrendsResponse,
  BudgetStatisticsResponse,
  BudgetMonitorResponse,
  TripDetail,
} from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, TrendingUp, List, BarChart3, Activity, CheckCircle2, Sparkles, Settings, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BudgetConstraint } from '@/api/planning-workbench';
import { formatCurrency } from '@/utils/format';
import { formatCostCategory } from '@/hooks/useItineraryCost';

interface TripBudgetPageProps {
  tripId?: string;  // 可选：如果作为子组件传入，使用传入的 tripId
  embedded?: boolean;  // 是否嵌入在其他页面中（如标签页）
}

export default function TripBudgetPage({ tripId: propTripId, embedded = false }: TripBudgetPageProps = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = propTripId || routeId;  // 优先使用传入的 tripId
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [optimizations, setOptimizations] = useState<BudgetOptimizationSuggestion[]>([]);
  const [details, setDetails] = useState<BudgetDetailsResponse | null>(null);
  const [trends, setTrends] = useState<BudgetTrendsResponse | null>(null);
  const [statistics, setStatistics] = useState<BudgetStatisticsResponse | null>(null);
  const [monitor, setMonitor] = useState<BudgetMonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [destinationCurrency, setDestinationCurrency] = useState<string>('CNY'); // 🆕 目的地货币
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedOptimizations, setSelectedOptimizations] = useState<string[]>([]);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [constraintDialogOpen, setConstraintDialogOpen] = useState(false);
  const [constraint, setConstraint] = useState<BudgetConstraint | null>(null);
  
  // 🆕 获取货币单位：优先使用预算约束中的货币，其次使用目的地货币，最后默认CNY
  // 注意：必须在 constraint 状态声明之后才能使用
  const currency = budget?.currency || constraint?.currency || destinationCurrency || 'CNY';
  const [loadingConstraint, setLoadingConstraint] = useState(false);
  const [savingConstraint, setSavingConstraint] = useState(false);
  const [deletingConstraint, setDeletingConstraint] = useState(false);
  const [constraintForm, setConstraintForm] = useState<{
    total: string;
    currency: string;
    dailyBudget: string;
    categoryLimits: {
      accommodation: string;
      transportation: string;
      food: string;
      activities: string;
      other: string;
    };
    alertThreshold: string;
  }>({
    total: '',
    currency: 'CNY', // 默认值，会在加载行程和预算约束后更新
    dailyBudget: '',
    categoryLimits: {
      accommodation: '',
      transportation: '',
      food: '',
      activities: '',
      other: '',
    },
    alertThreshold: '0.8',
  });

  // 🆕 加载行程信息以获取目的地和货币
  const loadTrip = async () => {
    if (!id) return;
    try {
      const tripData = await tripsApi.getById(id);
      setTrip(tripData);
      
      // 根据目的地获取货币策略
      if (tripData.destination) {
        try {
          const currencyStrategy = await countriesApi.getCurrencyStrategy(tripData.destination);
          if (currencyStrategy?.currencyCode) {
            setDestinationCurrency(currencyStrategy.currencyCode);
            // 如果还没有设置预算约束，使用目的地货币作为默认值
            // 注意：这里使用函数式更新，避免直接访问 constraint 状态
            setConstraintForm(prev => {
              // 检查当前是否已有预算约束（通过 constraint 状态）
              // 如果没有，则使用目的地货币
              return {
                ...prev,
                currency: prev.currency === 'CNY' ? currencyStrategy.currencyCode : prev.currency,
              };
            });
          }
        } catch (err) {
          console.warn('Failed to load currency strategy:', err);
          // 如果获取失败，保持默认值
        }
      }
    } catch (err) {
      console.error('Failed to load trip:', err);
    }
  };

  useEffect(() => {
    if (id) {
      // 🆕 先加载行程信息以获取目的地货币
      loadTrip().then(() => {
        // 行程加载完成后再加载预算约束（需要目的地货币作为默认值）
        loadBudgetConstraint();
      });
      loadBudget();
      loadOptimizations();
      loadStatistics();
      loadMonitor();
      loadCurrentPlanId();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // loadBudget 等函数是稳定的，不需要加入依赖

  // 🆕 检测URL参数，如果openConstraintDialog=true，打开预算约束对话框
  useEffect(() => {
    const openConstraintDialog = searchParams.get('openConstraintDialog');
    if (openConstraintDialog === 'true' && id) {
      setConstraintDialogOpen(true);
      // 清除URL参数
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openConstraintDialog');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, id, setSearchParams]);

  // 加载当前行程的最新方案 ID
  const loadCurrentPlanId = async () => {
    if (!id) return;
    try {
      const plans = await planningWorkbenchApi.getTripPlans(id, {
        limit: 1,
        offset: 0,
      });
      if (plans.plans.length > 0) {
        setCurrentPlanId(plans.plans[0].planId);
      }
    } catch (err) {
      console.error('Failed to load current plan ID:', err);
      // 不显示错误，因为可能还没有方案
    }
  };

  // 加载预算约束
  const loadBudgetConstraint = async () => {
    if (!id) return;
    try {
      setLoadingConstraint(true);
      const data = await tripsApi.getBudgetConstraint(id);
      setConstraint(data.budgetConstraint);
      // 填充表单：优先使用已设置的货币，否则使用目的地货币
      setConstraintForm({
        total: data.budgetConstraint.total?.toString() || '',
        currency: data.budgetConstraint.currency || destinationCurrency || 'CNY',
        dailyBudget: data.budgetConstraint.dailyBudget?.toString() || '',
        categoryLimits: {
          accommodation: data.budgetConstraint.categoryLimits?.accommodation?.toString() || '',
          transportation: data.budgetConstraint.categoryLimits?.transportation?.toString() || '',
          food: data.budgetConstraint.categoryLimits?.food?.toString() || '',
          activities: data.budgetConstraint.categoryLimits?.activities?.toString() || '',
          other: data.budgetConstraint.categoryLimits?.other?.toString() || '',
        },
        alertThreshold: data.budgetConstraint.alertThreshold?.toString() || '0.8',
      });
    } catch (err: any) {
      // 如果没有预算约束，不显示错误
      if (err.message && !err.message.includes('404')) {
        console.error('Failed to load budget constraint:', err);
      }
      setConstraint(null);
      // 🆕 如果没有预算约束，使用目的地货币作为默认值
      if (destinationCurrency && destinationCurrency !== 'CNY') {
        setConstraintForm(prev => ({
          ...prev,
          currency: destinationCurrency,
        }));
      }
    } finally {
      setLoadingConstraint(false);
    }
  };

  // 保存预算约束
  const handleSaveConstraint = async () => {
    if (!id) return;

    // 🆕 如果已有约束且行程不是PLANNING状态，显示确认提示
    if (constraint && trip && trip.status !== 'PLANNING') {
      const hasActualSpending = budget && budget.totalActual > 0;
      if (hasActualSpending) {
        const confirmed = window.confirm(
          '修改预算约束可能会影响现有的预算监控和方案。如果修改了货币单位，历史支出数据可能无法正确显示。\n\n确定要继续吗？'
        );
        if (!confirmed) {
          return;
        }
      } else {
        const confirmed = window.confirm(
          '修改预算约束可能会影响现有的规划方案。确定要继续吗？'
        );
        if (!confirmed) {
          return;
        }
      }
    }

    // 验证总预算
    const total = parseFloat(constraintForm.total);
    if (isNaN(total) || total < 100 || total > 1000000) {
      toast.error('总预算必须在 100 - 1,000,000 之间');
      return;
    }

    // 验证分类预算总和
    const categoryTotal = Object.values(constraintForm.categoryLimits).reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);
    if (categoryTotal > total) {
      toast.error('分类预算总和不能超过总预算');
      return;
    }

    setSavingConstraint(true);
    try {
      const constraintData: BudgetConstraint = {
        total,
        currency: constraintForm.currency,
        dailyBudget: constraintForm.dailyBudget ? parseFloat(constraintForm.dailyBudget) : undefined,
        categoryLimits: Object.values(constraintForm.categoryLimits).some((v) => v)
          ? {
              accommodation: constraintForm.categoryLimits.accommodation
                ? parseFloat(constraintForm.categoryLimits.accommodation)
                : undefined,
              transportation: constraintForm.categoryLimits.transportation
                ? parseFloat(constraintForm.categoryLimits.transportation)
                : undefined,
              food: constraintForm.categoryLimits.food
                ? parseFloat(constraintForm.categoryLimits.food)
                : undefined,
              activities: constraintForm.categoryLimits.activities
                ? parseFloat(constraintForm.categoryLimits.activities)
                : undefined,
              other: constraintForm.categoryLimits.other
                ? parseFloat(constraintForm.categoryLimits.other)
                : undefined,
            }
          : undefined,
        alertThreshold: constraintForm.alertThreshold
          ? parseFloat(constraintForm.alertThreshold)
          : undefined,
      };

      await tripsApi.setBudgetConstraint(id, constraintData);
      toast.success('预算约束设置成功');
      setConstraintDialogOpen(false);
      await loadBudgetConstraint();
      await loadBudget();
    } catch (err: any) {
      console.error('Failed to save budget constraint:', err);
      toast.error(err.message || '保存预算约束失败，请稍后重试');
    } finally {
      setSavingConstraint(false);
    }
  };

  // 删除预算约束
  const handleDeleteConstraint = async () => {
    if (!id) return;
    if (!confirm('确定要删除预算约束吗？删除后将不再限制预算。')) {
      return;
    }

    setDeletingConstraint(true);
    try {
      await tripsApi.deleteBudgetConstraint(id);
      toast.success('预算约束已删除');
      setConstraintDialogOpen(false);
      setConstraint(null);
      await loadBudget();
    } catch (err: any) {
      console.error('Failed to delete budget constraint:', err);
      toast.error(err.message || '删除预算约束失败，请稍后重试');
    } finally {
      setDeletingConstraint(false);
    }
  };

  // 实时监控轮询
  useEffect(() => {
    if (!id || activeTab !== 'monitor') return;

    const interval = setInterval(() => {
      loadMonitor();
    }, 5000); // 每5秒刷新一次

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeTab]); // loadMonitor 函数是稳定的，不需要加入依赖

  // 当切换到明细或趋势标签页时加载数据
  useEffect(() => {
    if (!id) return;
    
    if (activeTab === 'details' && !details) {
      loadDetails();
    } else if (activeTab === 'trends' && !trends) {
      loadTrends();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id, details, trends]); // 包含所有使用的状态，但只在为空时加载

  const loadBudget = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tripsApi.getBudgetSummary(id);
      setBudget(data);
    } catch (err: any) {
      setError(err.message || '加载预算信息失败');
    } finally {
      setLoading(false);
    }
  };

  const loadOptimizations = async () => {
    if (!id) return;
    try {
      const data = await tripsApi.getBudgetOptimization(id);
      setOptimizations(data);
    } catch (err) {
      console.error('Failed to load optimizations:', err);
    }
  };

  const loadDetails = async (category?: string) => {
    if (!id) return;
    try {
      setDetailsLoading(true);
      const data = await tripsApi.getBudgetDetails(id, {
        category,
        limit: 50,
        offset: 0,
      });
      setDetails(data);
    } catch (err) {
      console.error('Failed to load budget details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const loadTrends = async () => {
    if (!id) return;
    try {
      setTrendsLoading(true);
      const data = await tripsApi.getBudgetTrends(id, {
        granularity: 'daily',
      });
      setTrends(data);
    } catch (err) {
      console.error('Failed to load budget trends:', err);
    } finally {
      setTrendsLoading(false);
    }
  };

  const loadStatistics = async () => {
    if (!id) return;
    try {
      setStatisticsLoading(true);
      const data = await tripsApi.getBudgetStatistics(id);
      setStatistics(data);
    } catch (err) {
      console.error('Failed to load budget statistics:', err);
    } finally {
      setStatisticsLoading(false);
    }
  };

  const loadMonitor = async () => {
    if (!id) return;
    try {
      setMonitorLoading(true);
      const data = await tripsApi.getBudgetMonitor(id, true);
      setMonitor(data);
    } catch (err) {
      console.error('Failed to load budget monitor:', err);
    } finally {
      setMonitorLoading(false);
    }
  };

  // 应用优化建议
  const handleApplyOptimizations = async () => {
    if (!id || !currentPlanId || selectedOptimizations.length === 0) {
      toast.error('请先选择要应用的优化建议');
      return;
    }

    setApplying(true);
    try {
      const result = await planningWorkbenchApi.applyBudgetOptimization({
        planId: currentPlanId,
        tripId: id,
        optimizationIds: selectedOptimizations,
        autoCommit: false,
      });

      toast.success(
        `已应用 ${result.appliedOptimizations.filter((opt) => opt.status === 'success').length} 条优化建议，预计节省 ${formatCurrency(result.totalSavings, currency)}`,
        {
          duration: 5000,
        }
      );

      // 重新加载预算数据
      await Promise.all([
        loadBudget(),
        loadOptimizations(),
        loadStatistics(),
      ]);

      // 清空选择
      setSelectedOptimizations([]);
      setApplyDialogOpen(false);

      // 提示用户前往规划工作台查看新方案
      toast.info('优化已应用，请前往规划工作台查看新方案', {
        duration: 5000,
        action: {
          label: '前往查看',
          onClick: () => navigate(`/plan-studio/${id}?tab=planning-workbench`),
        },
      });
    } catch (err: any) {
      console.error('Failed to apply optimizations:', err);
      toast.error(err.message || '应用优化建议失败，请稍后重试');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error || '预算信息不存在'}</p>
        </div>
      </div>
    );
  }

  const usagePercent = budget ? (budget.totalSpent / budget.totalBudget) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error || '预算信息不存在'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "p-6 space-y-6"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">预算管理</h1>
          <p className="text-muted-foreground mt-1">查看和管理您的行程预算</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            loadBudgetConstraint();
            setConstraintDialogOpen(true);
          }}
        >
          <Settings className="w-4 h-4 mr-2" />
          设置预算约束
        </Button>
      </div>

      {budget.warnings.length > 0 && (
        <div className="space-y-2">
          {budget.warnings.map((warning, i) => (
            <Alert
              key={i}
              variant={warning.severity === 'error' ? 'destructive' : 'default'}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>预算警告</AlertTitle>
              <AlertDescription>{warning.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* 预算概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">总预算</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget.totalBudget ?? 0, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">已使用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget.totalSpent ?? 0, currency)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {usagePercent.toFixed(1)}% 已使用
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">剩余</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget.remaining ?? 0, currency)}</div>
          </CardContent>
        </Card>
      </div>

      {/* 标签页内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary">
            <BarChart3 className="w-4 h-4 mr-2" />
            概览
          </TabsTrigger>
          <TabsTrigger value="details">
            <List className="w-4 h-4 mr-2" />
            明细
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="w-4 h-4 mr-2" />
            趋势
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <BarChart3 className="w-4 h-4 mr-2" />
            统计
          </TabsTrigger>
          <TabsTrigger value="monitor">
            <Activity className="w-4 h-4 mr-2" />
            监控
          </TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>预算使用情况</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>预算使用率</span>
                  <span>{usagePercent.toFixed(1)}%</span>
                </div>
                <Progress value={usagePercent} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>类别消费</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(budget.categoryBreakdown)
                  .filter(([_, amount]) => amount > 0) // 🆕 只显示有金额的类别
                  .map(([category, amount]) => {
                    // 🐛 修复：后端返回的是小写键名（accommodation, transportation等），需要转换为大写
                    // 映射关系：accommodation -> ACCOMMODATION, transportation -> TRANSPORTATION, food -> FOOD, activities -> ACTIVITIES, other -> OTHER
                    const categoryMapping: Record<string, string> = {
                      'accommodation': 'ACCOMMODATION',
                      'transportation': 'TRANSPORTATION',
                      'food': 'FOOD',
                      'activities': 'ACTIVITIES',
                      'other': 'OTHER',
                    };
                    const categoryUpper = categoryMapping[category.toLowerCase()] || category.toUpperCase();
                    const categoryLabel = formatCostCategory(categoryUpper);
                    const percent = budget.totalBudget > 0 ? (amount / budget.totalBudget) * 100 : 0;
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{categoryLabel}</span>
                          <span>{formatCurrency(amount ?? 0, currency)}</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    );
                  })}
                {/* 🆕 如果所有类别都是0，显示提示 */}
                {Object.values(budget.categoryBreakdown).every(amount => amount <= 0) && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    暂无类别消费数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {optimizations.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>优化建议</CardTitle>
                    <CardDescription>以下建议可以帮助您节省预算</CardDescription>
                  </div>
                  {selectedOptimizations.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setApplyDialogOpen(true)}
                      disabled={!currentPlanId}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      应用选中 ({selectedOptimizations.length})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {optimizations.map((opt, i) => {
                    const optId = opt.itemId || `opt-${i}`;
                    const isSelected = selectedOptimizations.includes(optId);
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedOptimizations(selectedOptimizations.filter((id) => id !== optId));
                          } else {
                            setSelectedOptimizations([...selectedOptimizations, optId]);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedOptimizations(selectedOptimizations.filter((id) => id !== optId));
                            } else {
                              setSelectedOptimizations([...selectedOptimizations, optId]);
                            }
                          }}
                          className="mt-1 w-4 h-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{opt.message}</div>
                          {opt.itemName && (
                            <div className="text-sm text-muted-foreground mt-1">
                              相关项目: {opt.itemName}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-4">
                          节省 {formatCurrency(opt.estimatedSavings ?? 0, currency)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                {!currentPlanId && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>提示</AlertTitle>
                    <AlertDescription>
                      需要先创建规划方案才能应用优化建议。请前往{' '}
                      <button
                        onClick={() => navigate(`/plan-studio/${id}?tab=planning-workbench`)}
                        className="text-primary underline"
                      >
                        规划工作台
                      </button>{' '}
                      生成方案。
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 明细标签页 */}
        <TabsContent value="details" className="space-y-4">
          {detailsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner className="w-8 h-8" />
            </div>
          ) : details ? (
            <Card>
              <CardHeader>
                <CardTitle>预算明细</CardTitle>
                <CardDescription>详细的支出记录</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {details.items.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">暂无支出记录</p>
                  ) : (
                    details.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{item.itemName}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {format(new Date(item.date), 'yyyy-MM-dd')} · {item.category}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(item.amount ?? 0, item.currency || currency)}</div>
                          <div className="text-xs text-muted-foreground">{item.currency}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {details.total > details.items.length && (
                  <div className="mt-4 text-sm text-muted-foreground text-center">
                    显示 {details.items.length} / {details.total} 条记录
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* 趋势标签页 */}
        <TabsContent value="trends" className="space-y-4">
          {trendsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner className="w-8 h-8" />
            </div>
          ) : trends ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>每日支出趋势</CardTitle>
                  <CardDescription>预算与实际支出的对比</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trends.dailySpending.map((day) => (
                      <div key={day.date} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{format(new Date(day.date), 'yyyy-MM-dd')}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">预算: {formatCurrency(day.budget ?? 0, currency)}</span>
                            <span className={(day.spent ?? 0) > (day.budget ?? 0) ? 'text-red-600' : 'text-green-600'}>
                              实际: {formatCurrency(day.spent ?? 0, currency)}
                            </span>
                            <span className="text-muted-foreground">
                              {((day.ratio ?? 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <Progress
                          value={Math.min((day.ratio ?? 0) * 100, 100)}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {trends.forecast && (
                <Card>
                  <CardHeader>
                    <CardTitle>预算预测</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>预计总支出</span>
                        <span className="font-bold">{formatCurrency(trends.forecast.projectedTotal ?? 0, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>预计剩余</span>
                        <span className="font-bold">{formatCurrency(trends.forecast.projectedRemaining ?? 0, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>预测置信度</span>
                        <span className="font-bold">{((trends.forecast.confidence ?? 0) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>

        {/* 统计标签页 */}
        <TabsContent value="statistics" className="space-y-4">
          {statisticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner className="w-8 h-8" />
            </div>
          ) : statistics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>完成度</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {(statistics.completionRate * 100).toFixed(1)}%
                    </div>
                    <Progress value={statistics.completionRate * 100} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>超支率</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${statistics.overspendRate > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {statistics.overspendRate > 0 ? '+' : ''}
                      {(statistics.overspendRate * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {statistics.overspendRate > 0 ? '超出预算' : '节省预算'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>日均支出</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(statistics.dailyAverage ?? 0, currency)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>风险等级</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge
                      variant={
                        statistics.riskLevel === 'high'
                          ? 'destructive'
                          : statistics.riskLevel === 'medium'
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-lg px-4 py-2"
                    >
                      {statistics.riskLevel === 'high' ? '高风险' : statistics.riskLevel === 'medium' ? '中风险' : '低风险'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>分类占比</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(statistics.categoryPercentages).map(([category, percentage]) => (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{category}</span>
                          <span>{(percentage * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={percentage * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* 监控标签页 */}
        <TabsContent value="monitor" className="space-y-4">
          {monitorLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner className="w-8 h-8" />
            </div>
          ) : monitor ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>实时预算监控</CardTitle>
                  <CardDescription>最后更新: {format(new Date(monitor.lastUpdated), 'yyyy-MM-dd HH:mm:ss')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">当前支出</div>
                      <div className="text-2xl font-bold mt-1">
                        {formatCurrency(monitor.currentSpent ?? 0, currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">剩余预算</div>
                      <div className="text-2xl font-bold mt-1">
                        {formatCurrency(monitor.remaining ?? 0, currency)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {monitor.alerts.length > 0 && (
                <div className="space-y-2">
                  {monitor.alerts.map((alert, i) => (
                    <Alert
                      key={i}
                      variant={alert.severity === 'error' ? 'destructive' : 'default'}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>预算预警</AlertTitle>
                      <AlertDescription>{alert.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>每日支出</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(monitor.dailySpent).map(([date, amount]) => (
                      <div key={date} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{format(new Date(date), 'yyyy-MM-dd')}</span>
                        <span className="font-medium">{formatCurrency(amount ?? 0, currency)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      {/* 预算约束设置对话框 */}
      <Dialog open={constraintDialogOpen} onOpenChange={setConstraintDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>设置预算约束</DialogTitle>
            <DialogDescription>
              设置行程的总预算、分类预算限制和预警阈值
            </DialogDescription>
          </DialogHeader>

          {loadingConstraint ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-8 h-8" />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* 总预算 */}
              <div className="space-y-2">
                <Label htmlFor="total">总预算 *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="total"
                    type="number"
                    value={constraintForm.total}
                    onChange={(e) =>
                      setConstraintForm({ ...constraintForm, total: e.target.value })
                    }
                    placeholder="100 - 1,000,000"
                    min={100}
                    max={1000000}
                    required
                  />
                  <Select
                    value={constraintForm.currency}
                    onValueChange={(value) =>
                      setConstraintForm({ ...constraintForm, currency: value })
                    }
                    disabled={
                      // 🆕 如果行程不是PLANNING状态，或有实际支出，禁用货币单位修改
                      (trip && trip.status !== 'PLANNING') ||
                      (budget && budget.totalActual > 0)
                    }
                  >
                    <SelectTrigger className="w-[140px] min-w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNY">CNY (人民币)</SelectItem>
                      <SelectItem value="USD">USD (美元)</SelectItem>
                      <SelectItem value="EUR">EUR (欧元)</SelectItem>
                      <SelectItem value="JPY">JPY (日元)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  预算范围：100 - 1,000,000 {constraintForm.currency}
                  {(trip && trip.status !== 'PLANNING') || (budget && budget.totalActual > 0) ? (
                    <span className="block mt-1 text-amber-600">
                      {trip && trip.status !== 'PLANNING'
                        ? '行程已开始，货币单位不可修改'
                        : '已有实际支出，货币单位不可修改'}
                    </span>
                  ) : null}
                </p>
              </div>

              {/* 日均预算（可选） */}
              <div className="space-y-2">
                <Label htmlFor="dailyBudget">日均预算（可选）</Label>
                <Input
                  id="dailyBudget"
                  type="number"
                  value={constraintForm.dailyBudget}
                  onChange={(e) =>
                    setConstraintForm({ ...constraintForm, dailyBudget: e.target.value })
                  }
                  placeholder="自动计算或手动设置"
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  留空将自动计算：总预算 ÷ 天数
                </p>
              </div>

              {/* 分类预算限制（可选） */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>分类预算限制（可选）</Label>
                  <p className="text-xs text-muted-foreground">
                    总和不能超过总预算
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accommodation" className="text-sm">住宿</Label>
                    <Input
                      id="accommodation"
                      type="number"
                      value={constraintForm.categoryLimits.accommodation}
                      onChange={(e) =>
                        setConstraintForm({
                          ...constraintForm,
                          categoryLimits: {
                            ...constraintForm.categoryLimits,
                            accommodation: e.target.value,
                          },
                        })
                      }
                      placeholder="住宿预算"
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transportation" className="text-sm">交通</Label>
                    <Input
                      id="transportation"
                      type="number"
                      value={constraintForm.categoryLimits.transportation}
                      onChange={(e) =>
                        setConstraintForm({
                          ...constraintForm,
                          categoryLimits: {
                            ...constraintForm.categoryLimits,
                            transportation: e.target.value,
                          },
                        })
                      }
                      placeholder="交通预算"
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="food" className="text-sm">餐饮</Label>
                    <Input
                      id="food"
                      type="number"
                      value={constraintForm.categoryLimits.food}
                      onChange={(e) =>
                        setConstraintForm({
                          ...constraintForm,
                          categoryLimits: {
                            ...constraintForm.categoryLimits,
                            food: e.target.value,
                          },
                        })
                      }
                      placeholder="餐饮预算"
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="activities" className="text-sm">活动</Label>
                    <Input
                      id="activities"
                      type="number"
                      value={constraintForm.categoryLimits.activities}
                      onChange={(e) =>
                        setConstraintForm({
                          ...constraintForm,
                          categoryLimits: {
                            ...constraintForm.categoryLimits,
                            activities: e.target.value,
                          },
                        })
                      }
                      placeholder="活动预算"
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="other" className="text-sm">其他</Label>
                    <Input
                      id="other"
                      type="number"
                      value={constraintForm.categoryLimits.other}
                      onChange={(e) =>
                        setConstraintForm({
                          ...constraintForm,
                          categoryLimits: {
                            ...constraintForm.categoryLimits,
                            other: e.target.value,
                          },
                        })
                      }
                      placeholder="其他预算"
                      min={0}
                    />
                  </div>
                </div>
              </div>

              {/* 预警阈值 */}
              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="alertThreshold">预警阈值</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  step="0.1"
                  value={constraintForm.alertThreshold}
                  onChange={(e) =>
                    setConstraintForm({ ...constraintForm, alertThreshold: e.target.value })
                  }
                  placeholder="0.8"
                  min={0}
                  max={1}
                />
                <p className="text-xs text-muted-foreground">
                  当预算使用率达到此阈值时触发预警（0-1，默认 0.8 即 80%）
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <div>
              {constraint && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteConstraint}
                  disabled={deletingConstraint}
                >
                  {deletingConstraint ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      删除中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除约束
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setConstraintDialogOpen(false)}
                disabled={savingConstraint || deletingConstraint}
              >
                取消
              </Button>
              <Button
                onClick={handleSaveConstraint}
                disabled={savingConstraint || deletingConstraint || !constraintForm.total}
              >
                {savingConstraint ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 应用优化建议确认对话框 */}
      <AlertDialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>应用优化建议</AlertDialogTitle>
            <AlertDialogDescription>
              您即将应用 {selectedOptimizations.length} 条优化建议。这将生成一个新的规划方案，预计可节省{' '}
              <span className="font-semibold text-primary">
                {formatCurrency(
                  optimizations
                    .filter((opt, i) => selectedOptimizations.includes(opt.itemId || `opt-${i}`))
                    .reduce((sum, opt) => sum + (opt.estimatedSavings || 0), 0) ?? 0,
                  currency
                )}
              </span>
              。应用后请前往规划工作台查看新方案。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApplyOptimizations}
              disabled={applying || !currentPlanId}
            >
              {applying ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  应用中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  确认应用
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


