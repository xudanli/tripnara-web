import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wallet, Settings2, ExternalLink } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import type { BudgetSummary, BudgetConstraint } from '@/types/trip';
import { cn } from '@/lib/utils';
import { formatCurrency as formatCurrencyAmount } from '@/utils/format';

interface BudgetAlertBannerProps {
  tripId: string;
  onViewDetails?: () => void;
  onSetConstraint?: () => void;
  className?: string;
}

export default function BudgetAlertBanner({
  tripId,
  onViewDetails,
  onSetConstraint,
  className,
}: BudgetAlertBannerProps) {
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [constraint, setConstraint] = useState<BudgetConstraint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tripId]);

  const loadData = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const [budgetData, constraintData] = await Promise.all([
        tripsApi.getBudgetSummary(tripId).catch(() => null),
        tripsApi.getBudgetConstraint(tripId).catch(() => null),
      ]);
      setBudget(budgetData);
      setConstraint(constraintData?.budgetConstraint || null);
    } catch (err) {
      console.error('Failed to load budget data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !budget) {
    return null;
  }

  // 检查是否需要显示预警
  const usagePercent = budget.totalBudget > 0
    ? (budget.totalSpent / budget.totalBudget) * 100
    : 0;

  const remaining = budget.totalBudget - budget.totalSpent;
  const hasConstraint = constraint !== null;
  const isOverBudget = usagePercent >= 100;
  const isNearBudget = usagePercent >= 80 && usagePercent < 100;
  const isUnderBudget = remaining < 0 && budget.totalBudget > 0;
  const projectedOverBudget = false; // TODO: 需要从预算趋势接口获取预计总支出

  // 如果没有需要预警的情况，不显示
  if (!isOverBudget && !isNearBudget && !isUnderBudget && hasConstraint) {
    return null;
  }

  // 预算约束未设置（使用设计 Token）
  if (!hasConstraint) {
    return (
      <Alert className={cn('border-budget-warning-border bg-budget-warning', className)}>
        <Wallet className="h-4 w-4 text-budget-warning-foreground" />
        <AlertTitle className="text-budget-warning-foreground font-semibold">预算约束未设置</AlertTitle>
        <AlertDescription className="text-budget-warning-foreground/90">
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">
              建议设置预算约束以便更好地管理旅行支出。
            </span>
            <div className="flex items-center gap-2 ml-4">
              {onSetConstraint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSetConstraint}
                  className="border-budget-warning-border text-budget-warning-foreground hover:bg-budget-warning/80"
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  设置预算约束
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // 预算已超支（使用设计 Token）
  if (isOverBudget) {
    return (
      <Alert className={cn('border-budget-critical-border bg-budget-critical', className)}>
        <AlertTriangle className="h-4 w-4 text-budget-critical-foreground" />
        <AlertTitle className="text-budget-critical-foreground font-semibold">预算已超支</AlertTitle>
        <AlertDescription className="text-budget-critical-foreground/90">
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">
              已超出预算 {formatCurrencyAmount(Math.abs(remaining), budget.currency || 'CNY')}，
              建议检查预算明细或调整预算约束。
            </span>
            <div className="flex items-center gap-2 ml-4">
              {onViewDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewDetails}
                  className="border-budget-critical-border text-budget-critical-foreground hover:bg-budget-critical/80"
                >
                  查看预算详情
                  <ExternalLink className="w-4 h-4 ml-1" />
                </Button>
              )}
              {onSetConstraint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSetConstraint}
                  className="border-budget-critical-border text-budget-critical-foreground hover:bg-budget-critical/80"
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  调整预算
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // 预算使用率较高（使用设计 Token）
  if (isNearBudget) {
    return (
      <Alert className={cn('border-budget-warning-border bg-budget-warning', className)}>
        <AlertTriangle className="h-4 w-4 text-budget-warning-foreground" />
        <AlertTitle className="text-budget-warning-foreground font-semibold">预算使用率较高</AlertTitle>
        <AlertDescription className="text-budget-warning-foreground/90">
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">
              当前预算使用率已达 {usagePercent.toFixed(1)}%，
              剩余预算 {formatCurrencyAmount(remaining, budget.currency || 'CNY')}。
              建议关注预算使用情况。
            </span>
            <div className="flex items-center gap-2 ml-4">
              {onViewDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewDetails}
                  className="border-budget-warning-border text-budget-warning-foreground hover:bg-budget-warning/80"
                >
                  查看预算详情
                  <ExternalLink className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
