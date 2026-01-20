import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, ExternalLink, Settings2, AlertTriangle } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import type { BudgetMonitorResponse } from '@/types/trip';
import { cn } from '@/lib/utils';
import { formatCurrency as formatCurrencyAmount } from '@/utils/format';

interface BudgetMonitorCardProps {
  tripId: string;
  onViewDetails?: () => void;
  onSetConstraint?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // 毫秒
}

export default function BudgetMonitorCard({
  tripId,
  onViewDetails,
  onSetConstraint,
  autoRefresh = true,
  refreshInterval = 5000, // 默认5秒
}: BudgetMonitorCardProps) {
  const [monitor, setMonitor] = useState<BudgetMonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMonitor();
  }, [tripId]);

  useEffect(() => {
    if (!autoRefresh || !tripId) return;

    const interval = setInterval(() => {
      loadMonitor();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, tripId]);

  const loadMonitor = async () => {
    if (!tripId) return;
    try {
      setError(null);
      const data = await tripsApi.getBudgetMonitor(tripId, true);
      setMonitor(data);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load budget monitor:', err);
      setError(err.message || '加载预算监控数据失败');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            实时预算监控
          </CardTitle>
          <CardDescription>今日支出与预算使用情况</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !monitor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            实时预算监控
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-sm text-muted-foreground">
            <p>{error || '暂无监控数据'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const todayUsagePercent = monitor.todayBudget > 0
    ? Math.min((monitor.currentSpent / monitor.todayBudget) * 100, 100)
    : 0;

  const remaining = monitor.remaining;
  const projectedTotal = monitor.projectedTotal || monitor.currentSpent;
  const isOverProjected = projectedTotal > (monitor.totalBudget || 0);
  const projectedOverBudget = isOverProjected
    ? projectedTotal - (monitor.totalBudget || 0)
    : 0;

  // 判断今日预算状态（使用设计 Token）
  const getTodayStatus = () => {
    if (todayUsagePercent >= 100) {
      return {
        label: '已超支',
        statusColor: 'budget-critical',
        textColor: 'text-budget-critical-foreground',
        borderColor: 'border-budget-critical-border',
        bgColor: 'bg-budget-critical',
      };
    }
    if (todayUsagePercent >= 80) {
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

  const todayStatus = getTodayStatus();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              实时预算监控
            </CardTitle>
            <CardDescription>今日支出与预算使用情况</CardDescription>
          </div>
          {autoRefresh && (
            <Badge variant="outline" className="text-xs">
              自动刷新
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 今日支出 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">今日已支出</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {formatCurrencyAmount(monitor.currentSpent, monitor.currency || 'CNY')}
              </span>
              <Badge variant="outline" className={cn('text-xs', todayStatus.textColor, todayStatus.borderColor)}>
                {todayUsagePercent.toFixed(1)}%
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">今日预算</span>
            <span className="text-sm font-medium">
              {formatCurrencyAmount(monitor.todayBudget, monitor.currency || 'CNY')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">剩余</span>
            <span className={cn(
              'text-sm font-semibold',
              remaining < 0 ? todayStatus.textColor : 'text-foreground'
            )}>
              {formatCurrencyAmount(Math.max(remaining, 0), monitor.currency || 'CNY')}
            </span>
          </div>
        </div>

        {/* 今日预算进度条（使用设计 Token） */}
        <div className="space-y-1">
          <Progress
            value={todayUsagePercent}
            className={cn('h-2.5', {
              'bg-budget-safe/20': todayStatus.statusColor === 'budget-safe',
              'bg-budget-warning/20': todayStatus.statusColor === 'budget-warning',
              'bg-budget-critical/20': todayStatus.statusColor === 'budget-critical',
            })}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">今日使用率: {todayUsagePercent.toFixed(1)}%</span>
            <Badge variant="outline" className={cn('text-xs border', todayStatus.borderColor, todayStatus.bgColor, todayStatus.textColor)}>
              {todayStatus.label}
            </Badge>
          </div>
        </div>

        {/* 预计总支出 */}
        {monitor.projectedTotal !== undefined && (
          <div className="pt-2 border-t space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">预计今日总支出</span>
              <span className="font-semibold">
                {formatCurrencyAmount(projectedTotal, monitor.currency || 'CNY')}
              </span>
            </div>
            {isOverProjected && (
              <Alert className="border-budget-critical-border bg-budget-critical py-2">
                <AlertTriangle className="h-4 w-4 text-budget-critical-foreground" />
                <AlertDescription className="text-budget-critical-foreground text-xs">
                  预计超支 {formatCurrencyAmount(projectedOverBudget, monitor.currency || 'CNY')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onViewDetails}
            >
              查看明细
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          )}
          {onSetConstraint && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onSetConstraint}
            >
              <Settings2 className="w-4 h-4 mr-2" />
              调整预算
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
