/**
 * 建议预览对话框
 * 显示应用建议后的预览结果，允许用户确认或取消
 */

import { useState, useEffect } from 'react';
import type { Suggestion, ApplySuggestionResponse } from '@/types/suggestion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, AlertTriangle, TrendingUp, Activity, Clock, DollarSign, Shield, Info } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/format';

interface SuggestionPreviewDialogProps {
  tripId: string;
  suggestion: Suggestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>; // 🆕 支持异步回调，确保数据刷新完成
  /** 可选：指定要预览/应用的 actionId；不传则自动选择 primary/apply */
  actionId?: string | null;
}

export function SuggestionPreviewDialog({
  tripId,
  suggestion,
  open,
  onOpenChange,
  onConfirm,
  actionId,
}: SuggestionPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<ApplySuggestionResponse | null>(null);
  const [applying, setApplying] = useState(false);
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

  const pickActionId = (): string | null => {
    if (!suggestion?.actions?.length) return null;
    if (actionId && suggestion.actions.some((a) => a.id === actionId)) return actionId;
    const primary = suggestion.actions.find((a) => a.primary);
    if (primary) return primary.id;
    const apply = suggestion.actions.find((a) => a.type === 'apply');
    if (apply) return apply.id;
    return suggestion.actions[0]?.id ?? null;
  };

  const loadPreview = async () => {
    if (!suggestion || !suggestion.actions || suggestion.actions.length === 0) {
      return;
    }

    const effectiveActionId = pickActionId();
    if (!effectiveActionId) return;
    setLoading(true);

    try {
      const result = await tripsApi.applySuggestion(tripId, suggestion.id, {
        actionId: effectiveActionId,
        preview: true,
      });
      setPreviewResult(result);
    } catch (err: any) {
      console.error('Failed to load preview:', err);
      toast.error(err.message || '获取预览失败');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  // 当对话框打开时，加载预览
  useEffect(() => {
    if (open && suggestion) {
      loadPreview();
    } else {
      setPreviewResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suggestion?.id]);

  const handleConfirm = async () => {
    if (!suggestion || !suggestion.actions || suggestion.actions.length === 0) {
      return;
    }

    const effectiveActionId = pickActionId();
    if (!effectiveActionId) return;
    setApplying(true);

    try {
      const result = await tripsApi.applySuggestion(tripId, suggestion.id, {
        actionId: effectiveActionId,
        preview: false,
      });

      toast.success('建议已成功应用');
      
      // 如果有触发的建议，提示用户
      if (result.triggeredSuggestions && result.triggeredSuggestions.length > 0) {
        toast.info(`应用建议后产生了 ${result.triggeredSuggestions.length} 个新建议`);
      }

      // 🐛 修复：等待 onConfirm 完成后再关闭对话框，确保数据刷新完成
      await onConfirm();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to apply suggestion:', err);
      toast.error(err.message || '应用建议失败');
    } finally {
      setApplying(false);
    }
  };

  if (!suggestion) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>预览建议：{suggestion.title}</DialogTitle>
          <DialogDescription>
            {suggestion.summary}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-6 h-6" />
            <span className="ml-2 text-sm text-muted-foreground">正在加载预览...</span>
          </div>
        ) : previewResult ? (
          <div className="space-y-6">
            {/* 变更内容 */}
            {previewResult.appliedChanges && previewResult.appliedChanges.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gate-allow-foreground" />
                  变更内容
                </h4>
                <ul className="space-y-2">
                  {previewResult.appliedChanges.map((change, index) => (
                    <li key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-gate-allow-foreground flex-shrink-0" />
                      <span className="text-sm">{change.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 影响分析 */}
            {previewResult.impact && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  影响分析
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {previewResult.impact.metrics && (
                    <>
                      {previewResult.impact.metrics.fatigue !== undefined && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-orange-600" />
                            <span className="text-xs font-medium text-orange-900">疲劳指数</span>
                          </div>
                          <div className={`text-lg font-semibold ${
                            previewResult.impact.metrics.fatigue > 0 ? 'text-orange-600' : 'text-gate-allow-foreground'
                          }`}>
                            {previewResult.impact.metrics.fatigue > 0 ? '+' : ''}
                            {previewResult.impact.metrics.fatigue}
                          </div>
                        </div>
                      )}
                      {previewResult.impact.metrics.buffer !== undefined && (
                        <div className="p-3 bg-muted/15 border border-border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">缓冲时间</span>
                          </div>
                          <div className={`text-lg font-semibold ${
                            previewResult.impact.metrics.buffer > 0 ? 'text-gate-allow-foreground' : 'text-gate-reject-foreground'
                          }`}>
                            {previewResult.impact.metrics.buffer > 0 ? '+' : ''}
                            {previewResult.impact.metrics.buffer} 分钟
                          </div>
                        </div>
                      )}
                      {previewResult.impact.metrics.cost !== undefined && (
                        <div className="p-3 bg-muted/15 border border-border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">成本变化</span>
                          </div>
                          <div className={`text-lg font-semibold ${
                            previewResult.impact.metrics.cost > 0 ? 'text-gate-reject-foreground' : 'text-gate-allow-foreground'
                          }`}>
                            {previewResult.impact.metrics.cost > 0 ? '+' : ''}
                            {formatCurrency(Math.abs(previewResult.impact.metrics.cost), currency)}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 风险提示 */}
                {previewResult.impact.risks && previewResult.impact.risks.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gate-reject-foreground">
                      <Shield className="w-4 h-4" />
                      可能产生的风险
                    </div>
                    {previewResult.impact.risks.map((risk) => (
                      <div
                        key={risk.id}
                        className={`p-2 rounded-lg border ${
                          risk.severity === 'blocker'
                            ? 'bg-gate-reject border-gate-reject-border text-gate-reject-foreground'
                            : risk.severity === 'warn'
                            ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
                            : 'bg-muted/15 border-border text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">{risk.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 触发的建议提示 */}
            {previewResult.triggeredSuggestions && previewResult.triggeredSuggestions.length > 0 && (
              <div className="p-3 bg-muted/15 border border-border rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span>
                    应用此建议后可能会产生 {previewResult.triggeredSuggestions.length} 个新建议
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            无法加载预览信息
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={applying}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!previewResult || applying || loading}
          >
            {applying ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                应用中...
              </>
            ) : (
              '确认应用'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

