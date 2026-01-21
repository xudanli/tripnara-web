/**
 * 行程费用汇总卡片
 * 
 * 显示行程的费用统计信息，包括：
 * - 总预算、总预估费用、总实际费用
 * - 按分类汇总
 * - 按日期汇总
 * - 预算偏差分析
 */

import { useState, useEffect } from 'react';
import { useItineraryCost, formatCost, formatCostCategory } from '@/hooks';
import type { TripCostSummary, CostCategory } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TripCostSummaryCardProps {
  tripId: string;
  className?: string;
}

const COST_CATEGORY_COLORS: Record<CostCategory, string> = {
  ACCOMMODATION: 'bg-blue-100 text-blue-800',
  TRANSPORTATION: 'bg-green-100 text-green-800',
  FOOD: 'bg-orange-100 text-orange-800',
  ACTIVITIES: 'bg-purple-100 text-purple-800',
  SHOPPING: 'bg-pink-100 text-pink-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

export function TripCostSummaryCard({ tripId, className }: TripCostSummaryCardProps) {
  const { getCostSummary, summaryLoading, summaryError } = useItineraryCost();
  const [summary, setSummary] = useState<TripCostSummary | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<CostCategory | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const loadSummary = async () => {
    const result = await getCostSummary(tripId);
    if (result) {
      setSummary(result);
    } else if (summaryError) {
      toast.error(summaryError);
    }
  };

  useEffect(() => {
    if (tripId) {
      loadSummary();
    }
  }, [tripId]);

  if (summaryLoading && !summary) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner className="w-6 h-6" />
          <span className="ml-2 text-sm text-muted-foreground">加载费用汇总中...</span>
        </CardContent>
      </Card>
    );
  }

  if (summaryError && !summary) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-sm text-muted-foreground mb-4">{summaryError}</p>
            <Button variant="outline" size="sm" onClick={loadSummary}>
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const varianceStatus = summary.variance.status;
  const varianceColor =
    varianceStatus === 'OVER_BUDGET'
      ? 'text-red-600'
      : varianceStatus === 'UNDER_BUDGET'
      ? 'text-green-600'
      : 'text-gray-600';

  const VarianceIcon =
    varianceStatus === 'OVER_BUDGET'
      ? TrendingUp
      : varianceStatus === 'UNDER_BUDGET'
      ? TrendingDown
      : Minus;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              费用汇总
            </CardTitle>
            <CardDescription>行程费用统计与分析</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadSummary} disabled={summaryLoading}>
            <RefreshCw className={cn('w-4 h-4', summaryLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 总览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">总预算</p>
            <p className="text-lg font-semibold">{formatCost(summary.totalBudget, summary.currency)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">预估费用</p>
            <p className="text-lg font-semibold">{formatCost(summary.totalEstimated, summary.currency)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">实际费用</p>
            <p className="text-lg font-semibold">{formatCost(summary.totalActual, summary.currency)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">预算使用率</p>
            <p className="text-lg font-semibold">{summary.budgetUsagePercent.toFixed(1)}%</p>
          </div>
        </div>

        {/* 预算偏差 */}
        <div className="rounded-lg border p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VarianceIcon className={cn('w-5 h-5', varianceColor)} />
              <span className="text-sm font-medium">预算偏差</span>
            </div>
            <div className="text-right">
              <p className={cn('text-lg font-semibold', varianceColor)}>
                {summary.variance.amount >= 0 ? '+' : ''}
                {formatCost(summary.variance.amount, summary.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.variance.percentage >= 0 ? '+' : ''}
                {summary.variance.percentage.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-2">
            <Badge
              variant={
                varianceStatus === 'OVER_BUDGET'
                  ? 'destructive'
                  : varianceStatus === 'UNDER_BUDGET'
                  ? 'default'
                  : 'secondary'
              }
              className="text-xs"
            >
              {varianceStatus === 'OVER_BUDGET'
                ? '超出预算'
                : varianceStatus === 'UNDER_BUDGET'
                ? '低于预算'
                : '符合预算'}
            </Badge>
          </div>
        </div>

        {/* 支付状态 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3 bg-green-50">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-xs text-muted-foreground">已支付</p>
            </div>
            <p className="text-lg font-semibold text-green-700">
              {formatCost(summary.totalPaid, summary.currency)}
            </p>
          </div>
          <div className="rounded-lg border p-3 bg-yellow-50">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <p className="text-xs text-muted-foreground">待支付</p>
            </div>
            <p className="text-lg font-semibold text-yellow-700">
              {formatCost(summary.totalUnpaid, summary.currency)}
            </p>
          </div>
        </div>

        {/* 按分类汇总 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">按分类汇总</h3>
          <div className="space-y-2">
            {(Object.keys(summary.byCategory) as CostCategory[]).map((category) => {
              const categoryData = summary.byCategory[category];
              if (categoryData.count === 0) return null;

              const isExpanded = expandedCategory === category;
              const estimatedPercent =
                summary.totalEstimated > 0
                  ? (categoryData.estimated / summary.totalEstimated) * 100
                  : 0;
              const actualPercent =
                summary.totalActual > 0 ? (categoryData.actual / summary.totalActual) * 100 : 0;

              return (
                <div
                  key={category}
                  className="rounded-lg border p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={COST_CATEGORY_COLORS[category]}>
                        {formatCostCategory(category)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {categoryData.count} 项
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCost(categoryData.actual, summary.currency)}
                      </p>
                      {categoryData.estimated !== categoryData.actual && (
                        <p className="text-xs text-muted-foreground">
                          预估: {formatCost(categoryData.estimated, summary.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-16">实际费用</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${actualPercent}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-12 text-right">
                        {actualPercent.toFixed(0)}%
                      </span>
                    </div>
                    {categoryData.estimated > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground w-16">预估费用</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gray-400 h-2 rounded-full"
                            style={{ width: `${estimatedPercent}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-12 text-right">
                          {estimatedPercent.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 按日期汇总 */}
        {summary.byDay.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">按日期汇总</h3>
            <div className="space-y-2">
              {summary.byDay.map((day) => {
                const isExpanded = expandedDay === day.date;
                return (
                  <div
                    key={day.date}
                    className="rounded-lg border p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{day.date}</p>
                        <p className="text-xs text-muted-foreground">{day.itemCount} 项费用</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {formatCost(day.actual, summary.currency)}
                        </p>
                        {day.estimated !== day.actual && (
                          <p className="text-xs text-muted-foreground">
                            预估: {formatCost(day.estimated, summary.currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TripCostSummaryCard;
