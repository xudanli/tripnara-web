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

interface SuggestionPreviewDialogProps {
  tripId: string;
  suggestion: Suggestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function SuggestionPreviewDialog({
  tripId,
  suggestion,
  open,
  onOpenChange,
  onConfirm,
}: SuggestionPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<ApplySuggestionResponse | null>(null);
  const [applying, setApplying] = useState(false);

  const loadPreview = async () => {
    if (!suggestion || !suggestion.actions || suggestion.actions.length === 0) {
      return;
    }

    const actionId = suggestion.actions[0].id;
    setLoading(true);

    try {
      const result = await tripsApi.applySuggestion(tripId, suggestion.id, {
        actionId: actionId,
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

    const actionId = suggestion.actions[0].id;
    setApplying(true);

    try {
      const result = await tripsApi.applySuggestion(tripId, suggestion.id, {
        actionId: actionId,
        preview: false,
      });

      toast.success('建议已成功应用');
      
      // 如果有触发的建议，提示用户
      if (result.triggeredSuggestions && result.triggeredSuggestions.length > 0) {
        toast.info(`应用建议后产生了 ${result.triggeredSuggestions.length} 个新建议`);
      }

      onOpenChange(false);
      onConfirm();
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
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  变更内容
                </h4>
                <ul className="space-y-2">
                  {previewResult.appliedChanges.map((change, index) => (
                    <li key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
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
                  <TrendingUp className="w-4 h-4 text-blue-600" />
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
                            previewResult.impact.metrics.fatigue > 0 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {previewResult.impact.metrics.fatigue > 0 ? '+' : ''}
                            {previewResult.impact.metrics.fatigue}
                          </div>
                        </div>
                      )}
                      {previewResult.impact.metrics.buffer !== undefined && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-900">缓冲时间</span>
                          </div>
                          <div className={`text-lg font-semibold ${
                            previewResult.impact.metrics.buffer > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {previewResult.impact.metrics.buffer > 0 ? '+' : ''}
                            {previewResult.impact.metrics.buffer} 分钟
                          </div>
                        </div>
                      )}
                      {previewResult.impact.metrics.cost !== undefined && (
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-medium text-purple-900">成本变化</span>
                          </div>
                          <div className={`text-lg font-semibold ${
                            previewResult.impact.metrics.cost > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {previewResult.impact.metrics.cost > 0 ? '+' : ''}
                            ¥{previewResult.impact.metrics.cost}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 风险提示 */}
                {previewResult.impact.risks && previewResult.impact.risks.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-red-900">
                      <Shield className="w-4 h-4" />
                      可能产生的风险
                    </div>
                    {previewResult.impact.risks.map((risk) => (
                      <div
                        key={risk.id}
                        className={`p-2 rounded-lg border ${
                          risk.severity === 'blocker'
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : risk.severity === 'warn'
                            ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
                            : 'bg-blue-50 border-blue-200 text-blue-900'
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
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-900">
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

