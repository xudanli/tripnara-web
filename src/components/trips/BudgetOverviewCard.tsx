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

  useEffect(() => {
    loadBudget();
  }, [tripId]);

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              预算概览
            </CardTitle>
            <CardDescription className="mt-1">
              总预算与支出情况
            </CardDescription>
          </div>
          {onSetConstraint && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSetConstraint}
              className="h-8"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 预算总额和已支出 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">总预算</span>
            <span className="text-lg font-bold">
              {formatCurrencyAmount(budget.totalBudget, budget.currency || 'CNY')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">已支出</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {formatCurrencyAmount(budget.totalSpent, budget.currency || 'CNY')}
              </span>
              <Badge variant="outline" className={cn('text-xs', status.color)}>
                {usagePercent.toFixed(1)}%
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">剩余</span>
            <span className={cn(
              'text-lg font-semibold',
              remaining < 0 ? status.textColor : 'text-foreground'
            )}>
              {formatCurrencyAmount(Math.max(remaining, 0), budget.currency || 'CNY')}
            </span>
          </div>
        </div>

        {/* 进度条（使用更克制的颜色） */}
        <div className="space-y-1">
          <Progress
            value={usagePercent}
            className={cn('h-2.5', {
              'bg-budget-safe/20': status.statusColor === 'budget-safe',
              'bg-budget-warning/20': status.statusColor === 'budget-warning',
              'bg-budget-critical/20': status.statusColor === 'budget-critical',
            })}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">使用率: {usagePercent.toFixed(1)}%</span>
            <Badge variant="outline" className={cn('text-xs border', status.borderColor, status.bgColor, status.textColor)}>
              {status.label}
            </Badge>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <div className="text-xs text-muted-foreground mb-1">日均支出</div>
            <div className="text-sm font-semibold">
              {formatCurrencyAmount(dailyAverage, budget.currency || 'CNY')}
            </div>
          </div>
          {budget.todaySpent !== undefined && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">今日支出</div>
              <div className="text-sm font-semibold">
                {formatCurrencyAmount(budget.todaySpent, budget.currency || 'CNY')}
              </div>
            </div>
          )}
        </div>

        {/* 预算预警提示（使用设计 Token，克制呈现） */}
        {usagePercent >= 80 && (
          <div className={cn(
            'p-3 rounded-lg border flex items-start gap-2.5',
            status.bgColor,
            status.borderColor
          )}>
            <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', status.textColor)} />
            <div className="flex-1 space-y-1">
              <div className={cn('text-sm font-semibold', status.textColor)}>
                {usagePercent >= 100 ? '预算已超支' : '预算使用率较高'}
              </div>
              <div className={cn('text-xs leading-relaxed', status.textColor, 'opacity-90')}>
                {usagePercent >= 100
                  ? `已超出预算 ${formatCurrencyAmount(Math.abs(remaining), budget.currency || 'CNY')}，建议检查预算明细或调整预算约束。`
                  : `当前预算使用率已达 ${usagePercent.toFixed(1)}%，建议关注预算使用情况。`}
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {onViewDetails && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onViewDetails}
          >
            查看详情
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
