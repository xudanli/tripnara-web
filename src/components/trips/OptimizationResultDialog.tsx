/**
 * 优化结果展示弹窗
 * 显示Auto综合优化的结果（指标变化、变更摘要）
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tripsApi } from '@/api/trips';
import { formatCurrency } from '@/utils/format';

interface OptimizationResultDialogProps {
  tripId: string; // 🆕 添加 tripId 以获取货币信息
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: {
    success: boolean;
    appliedCount: number;
    suggestions: Array<{
      id: string;
      title: string;
      severity: 'blocker' | 'warn' | 'info';
      applied: boolean;
      error?: string;
    }>;
    impact?: {
      metrics?: {
        fatigue?: number;
        buffer?: number;
        cost?: number;
      };
      risks?: Array<{
        id: string;
        severity: string;
        title: string;
      }>;
    };
  };
}

export function OptimizationResultDialog({
  tripId,
  open,
  onOpenChange,
  result,
}: OptimizationResultDialogProps) {
  const [currency, setCurrency] = useState<string>('CNY'); // 🆕 货币状态
  
  // 🆕 加载货币信息：优先使用预算约束中的货币，其次使用目的地货币
  useEffect(() => {
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
        // 如果获取预算约束失败，保持默认值 CNY
      }
      setCurrency('CNY');
    };
    
    if (open) {
      loadCurrency();
    }
  }, [tripId, open]);
  const getMetricIcon = (value: number | undefined) => {
    if (value === undefined) return null;
    if (value > 0) return <TrendingUp className="w-4 h-4 text-gate-allow-foreground" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-gate-reject-foreground" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getMetricColor = (value: number | undefined) => {
    if (value === undefined) return 'text-gray-600';
    if (value > 0) return 'text-gate-allow-foreground';
    if (value < 0) return 'text-gate-reject-foreground';
    return 'text-gray-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-gate-allow-foreground" />
            优化完成
          </DialogTitle>
          <DialogDescription>
            成功应用 {result.appliedCount} 条高优先级建议
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 优化结果摘要 */}
          {result.impact?.metrics && (
            <div className="p-4 bg-gate-allow rounded-lg border border-gate-allow-border">
              <h3 className="text-sm font-semibold mb-3 text-gate-allow-foreground">优化结果</h3>
              <div className="space-y-2">
                {result.impact.metrics.fatigue !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gate-allow-foreground">疲劳指数</span>
                    <div className="flex items-center gap-2">
                      {getMetricIcon(result.impact.metrics.fatigue)}
                      <span className={cn('font-medium', getMetricColor(result.impact.metrics.fatigue))}>
                        {result.impact.metrics.fatigue > 0 ? '+' : ''}
                        {result.impact.metrics.fatigue}
                      </span>
                    </div>
                  </div>
                )}
                {result.impact.metrics.buffer !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gate-allow-foreground">缓冲时间</span>
                    <div className="flex items-center gap-2">
                      {getMetricIcon(result.impact.metrics.buffer)}
                      <span className={cn('font-medium', getMetricColor(result.impact.metrics.buffer))}>
                        {result.impact.metrics.buffer > 0 ? '+' : ''}
                        {result.impact.metrics.buffer} 分钟
                      </span>
                    </div>
                  </div>
                )}
                {result.impact.metrics.cost !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gate-allow-foreground">费用变化</span>
                    <div className="flex items-center gap-2">
                      {getMetricIcon(result.impact.metrics.cost)}
                      <span className={cn('font-medium', getMetricColor(result.impact.metrics.cost))}>
                        {result.impact.metrics.cost > 0 ? '+' : ''}
                        {formatCurrency(Math.abs(result.impact.metrics.cost), currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 应用的建议列表 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">应用的建议：</h3>
            <div className="space-y-2">
              {result.suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={cn(
                    'p-3 rounded-lg border text-sm',
                    suggestion.applied
                      ? 'bg-gate-allow border-gate-allow-border'
                      : 'bg-gate-reject border-gate-reject-border'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {suggestion.applied ? (
                      <CheckCircle2 className="w-4 h-4 text-gate-allow-foreground mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-gate-reject-foreground mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{suggestion.title}</span>
                        <Badge
                          variant={suggestion.severity === 'blocker' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {suggestion.severity === 'blocker' ? '红线' : suggestion.severity}
                        </Badge>
                      </div>
                      {suggestion.error && (
                        <p className="text-xs text-gate-reject-foreground mt-1">{suggestion.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 风险提示 */}
          {result.impact?.risks && result.impact.risks.length > 0 && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="text-sm font-semibold mb-2 text-yellow-900">风险提示</h3>
              <ul className="space-y-1">
                {result.impact.risks.map((risk) => (
                  <li key={risk.id} className="text-xs text-yellow-800">
                    • {risk.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
