import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Wallet, Settings2, ExternalLink, AlertTriangle } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import type { BudgetSummary } from '@/types/trip';
import { cn } from '@/lib/utils';
import { formatCurrency as formatCurrencyAmount } from '@/utils/format';

interface BudgetOverviewCardProps {
  tripId: string;
  onViewDetails?: () => void;
  onSetConstraint?: () => void;
}

export default function BudgetOverviewCard({
  tripId,
  onViewDetails,
  onSetConstraint,
}: BudgetOverviewCardProps) {
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('CNY'); // 🆕 货币状态

  useEffect(() => {
    loadBudget();
    loadCurrency(); // 🆕 加载货币信息
  }, [tripId]);

  // 🆕 加载货币信息：优先使用预算约束中的货币，其次使用目的地货币
  const loadCurrency = async () => {
    if (!tripId) return;
    try {
      // 优先从预算约束获取货币
      const constraint = await tripsApi.getBudgetConstraint(tripId);
      if (constraint.budgetConstraint.currency) {
        setCurrency(constraint.budgetConstraint.currency);
        return;
      }
    } catch {
      // 如果获取预算约束失败，尝试从目的地获取
    }
    
    // 其次从目的地获取货币策略
    try {
      const trip = await tripsApi.getById(tripId);
      if (trip.destination) {
        const { countriesApi } = await import('@/api/countries');
        const currencyStrategy = await countriesApi.getCurrencyStrategy(trip.destination);
        if (currencyStrategy?.currencyCode) {
          setCurrency(currencyStrategy.currencyCode);
          return;
        }
      }
    } catch {
      // 如果获取失败，保持默认值 CNY
    }
    
    setCurrency('CNY');
  };

  const loadBudget = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tripsApi.getBudgetSummary(tripId);
      setBudget(data);
    } catch (err: any) {
      console.error('Failed to load budget summary:', err);
      setError(err.message || '加载预算信息失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            预算概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !budget) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            预算概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-sm text-muted-foreground">
            <p>{error || '暂无预算信息'}</p>
            {onSetConstraint && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={onSetConstraint}
              >
                <Settings2 className="w-4 h-4 mr-2" />
                设置预算约束
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const usagePercent = budget.totalBudget > 0
    ? Math.min((budget.totalSpent / budget.totalBudget) * 100, 100)
    : 0;

  const remaining = budget.totalBudget - budget.totalSpent;
  const dailyAverage = budget.totalDays > 0
    ? budget.totalSpent / budget.totalDays
    : 0;

  // 判断预算状态（使用设计 Token，克制、中性）
  const getBudgetStatus = () => {
    if (usagePercent >= 100) {
      return {
        label: '超支',
        statusColor: 'budget-critical',
        textColor: 'text-budget-critical-foreground',
        borderColor: 'border-budget-critical-border',
        bgColor: 'bg-budget-critical',
      };
    }
    if (usagePercent >= 80) {
      return {
        label: '警告',
        statusColor: 'budget-warning',
        textColor: 'text-budget-warning-foreground',
        borderColor: 'border-budget-warning-border',
        bgColor: 'bg-budget-warning',
      };
    }
    return {
      label: '正常',
      statusColor: 'budget-safe',
      textColor: 'text-budget-safe-foreground',
      borderColor: 'border-budget-safe-border',
      bgColor: 'bg-budget-safe',
    };
  };

  const status = getBudgetStatus();

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="p-3 sm:p-4 pb-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 flex-shrink-0 text-gray-700" />
              <span className="truncate">预算概览</span>
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs text-gray-500">
              总预算与支出情况
            </CardDescription>
          </div>
          {onSetConstraint && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSetConstraint}
              className="h-7 w-7 flex-shrink-0 p-0 hover:bg-gray-100"
            >
              <Settings2 className="w-3.5 h-3.5 text-gray-600" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-1 space-y-2.5">
        {/* 🎯 紧凑布局：预算总额和已支出合并显示 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">总预算</span>
            <span className="text-sm sm:text-base font-bold truncate">
              {formatCurrencyAmount(budget.totalBudget, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">已支出</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm sm:text-base font-semibold truncate">
                {formatCurrencyAmount(budget.totalSpent, currency)}
              </span>
              <Badge variant="outline" className={cn('text-xs flex-shrink-0 px-1.5 py-0', status.color)}>
                {usagePercent.toFixed(1)}%
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">剩余</span>
            <span className={cn(
              'text-sm sm:text-base font-semibold truncate',
              remaining < 0 ? status.textColor : 'text-foreground'
            )}>
              {formatCurrencyAmount(Math.max(remaining, 0), currency)}
            </span>
          </div>
        </div>

        {/* 🎯 进度条和状态合并在一行 */}
        <div className="space-y-1">
          <Progress
            value={usagePercent}
            className={cn('h-2', {
              'bg-budget-safe/20': status.statusColor === 'budget-safe',
              'bg-budget-warning/20': status.statusColor === 'budget-warning',
              'bg-budget-critical/20': status.statusColor === 'budget-critical',
            })}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">使用率 {usagePercent.toFixed(1)}%</span>
            <Badge variant="outline" className={cn('text-xs border px-1.5 py-0', status.borderColor, status.bgColor, status.textColor)}>
              {status.label}
            </Badge>
          </div>
        </div>

        {/* 🎯 统计信息：更紧凑的布局 */}
        <div className="grid grid-cols-2 gap-3 pt-1.5 border-t">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">日均支出</div>
            <div className="text-xs sm:text-sm font-semibold">
              {formatCurrencyAmount(dailyAverage, currency)}
            </div>
          </div>
          {budget.todaySpent !== undefined && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">今日支出</div>
              <div className="text-xs sm:text-sm font-semibold">
                {formatCurrencyAmount(budget.todaySpent, currency)}
              </div>
            </div>
          )}
        </div>

        {/* 🎯 预算预警提示：更紧凑的显示 */}
        {usagePercent >= 80 && (
          <div className={cn(
            'p-2 rounded-md border flex items-start gap-2',
            status.bgColor,
            status.borderColor
          )}>
            <AlertTriangle className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', status.textColor)} />
            <div className="flex-1">
              <div className={cn('text-xs font-semibold leading-tight', status.textColor)}>
                {usagePercent >= 100 
                  ? `已超支 ${formatCurrencyAmount(Math.abs(remaining), currency)}`
                  : `使用率 ${usagePercent.toFixed(1)}%，建议关注`}
              </div>
            </div>
          </div>
        )}

        {/* 🎯 操作按钮：更小的尺寸 */}
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={onViewDetails}
          >
            查看详情
            <ExternalLink className="w-3 h-3 ml-1.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
