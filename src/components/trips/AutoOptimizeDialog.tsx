/**
 * Auto综合优化确认弹窗
 * 显示将应用的高优先级建议列表，用户确认后执行优化
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import { tripsApi } from '@/api/trips';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Suggestion } from '@/types/suggestion';
import { formatCurrency } from '@/utils/format';

interface AutoOptimizeDialogProps {
  tripId: string;
  suggestions: Suggestion[]; // 只包含高优先级建议（blocker）
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: {
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
  }) => void;
}

export function AutoOptimizeDialog({
  tripId,
  suggestions,
  open,
  onOpenChange,
  onSuccess,
}: AutoOptimizeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
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

  // 预览优化结果
  const handlePreview = async () => {
    setLoading(true);
    try {
      const result = await planningWorkbenchApi.autoOptimize({
        tripId,
        preview: true,
        limit: suggestions.length,
      });
      setPreviewResult(result);
      setShowPreview(true);
    } catch (err: any) {
      console.error('Failed to preview auto optimize:', err);
      toast.error('预览失败：' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 确认执行优化
  const handleConfirm = async () => {
    setLoading(true);
    try {
      // 通知父组件显示加载遮罩
      const result = await planningWorkbenchApi.autoOptimize({
        tripId,
        preview: false,
        limit: suggestions.length,
      });
      
      onSuccess(result);
      onOpenChange(false);
      
      // 成功提示由父组件处理
    } catch (err: any) {
      console.error('Failed to auto optimize:', err);
      toast.error('优化失败：' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Auto 综合优化
          </DialogTitle>
          <DialogDescription>
            将应用 {suggestions.length} 条高优先级建议（严重程度：红线）
          </DialogDescription>
        </DialogHeader>

        {showPreview && previewResult ? (
          <div className="space-y-4">
            {/* 预览结果 */}
            <div className="p-4 bg-muted/15 rounded-lg border border-border">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">预览结果</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">将应用的建议数量</span>
                  <span className="font-medium text-muted-foreground">{previewResult.appliedCount}</span>
                </div>
                {previewResult.impact?.metrics && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">预期影响：</p>
                    {previewResult.impact.metrics.fatigue !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span>疲劳指数</span>
                        <span className={cn(
                          'font-medium',
                          previewResult.impact.metrics.fatigue < 0 ? 'text-gate-allow-foreground' : 'text-gate-reject-foreground'
                        )}>
                          {previewResult.impact.metrics.fatigue > 0 ? '+' : ''}
                          {previewResult.impact.metrics.fatigue}
                        </span>
                      </div>
                    )}
                    {previewResult.impact.metrics.buffer !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span>缓冲时间</span>
                        <span className={cn(
                          'font-medium',
                          previewResult.impact.metrics.buffer > 0 ? 'text-gate-allow-foreground' : 'text-gate-reject-foreground'
                        )}>
                          {previewResult.impact.metrics.buffer > 0 ? '+' : ''}
                          {previewResult.impact.metrics.buffer} 分钟
                        </span>
                      </div>
                    )}
                    {previewResult.impact.metrics.cost !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span>费用变化</span>
                        <span className={cn(
                          'font-medium',
                          previewResult.impact.metrics.cost < 0 ? 'text-gate-allow-foreground' : 'text-gate-reject-foreground'
                        )}>
                          {previewResult.impact.metrics.cost > 0 ? '+' : ''}
                          {formatCurrency(Math.abs(previewResult.impact.metrics.cost), currency)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 建议列表 */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">将应用的建议：</h3>
              {previewResult.suggestions.map((suggestion: any) => (
                <div
                  key={suggestion.id}
                  className={cn(
                    'p-3 rounded-lg border text-sm',
                    suggestion.applied
                      ? 'bg-gate-allow border-gate-allow-border'
                      : 'bg-gate-reject border-gate-reject-border'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {suggestion.applied ? (
                          <CheckCircle2 className="w-4 h-4 text-gate-allow-foreground" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-gate-reject-foreground" />
                        )}
                        <span className="font-medium">{suggestion.title}</span>
                        <Badge variant="destructive" className="text-xs">
                          红线
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
        ) : (
          <div className="space-y-4">
            {/* 建议列表 */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">将应用的建议：</h3>
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-3 rounded-lg border border-gate-reject-border bg-gate-reject"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-gate-reject-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{suggestion.title}</span>
                        <Badge variant="destructive" className="text-xs">
                          红线
                        </Badge>
                      </div>
                      {suggestion.description && (
                        <p className="text-xs text-muted-foreground">
                          {suggestion.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 提示信息 */}
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-800">
                💡 Auto综合优化将自动应用所有高优先级建议，优化过程可能需要几秒钟时间。
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setShowPreview(false);
              setPreviewResult(null);
            }}
            disabled={loading}
          >
            取消
          </Button>
          {!showPreview ? (
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  预览中...
                </>
              ) : (
                '预览结果'
              )}
            </Button>
          ) : null}
          <Button
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                优化中...
              </>
            ) : (
              '确认优化'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
