/**
 * 调整时间对话框
 * 用于显示和应用时间调整建议
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle, CheckCircle2, Clock, Info } from 'lucide-react';
import type { Suggestion, ApplySuggestionResponse } from '@/types/suggestion';
import { tripsApi } from '@/api/trips';
import { cn } from '@/lib/utils';

interface AdjustTimeDialogProps {
  tripId: string;
  suggestion: Suggestion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdjustTimeDialog({
  tripId,
  suggestion,
  open,
  onOpenChange,
  onSuccess,
}: AdjustTimeDialogProps) {
  const { t } = useTranslation();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<ApplySuggestionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  // 当对话框打开时，获取预览
  useEffect(() => {
    if (open && suggestion) {
      loadPreview();
    } else {
      // 关闭时重置状态
      setPreviewResult(null);
      setError(null);
    }
  }, [open, suggestion]);

  const loadPreview = async () => {
    if (!suggestion.actions || suggestion.actions.length === 0) {
      setError(t('dialogs.adjustTime.noActions'));
      return;
    }

    const actionId = suggestion.actions[0].id; // 使用第一个操作
    setPreviewLoading(true);
    setError(null);

    try {
      const result = await tripsApi.applySuggestion(tripId, suggestion.id, {
        actionId: actionId,
        preview: true,
      });
      setPreviewResult(result);
    } catch (err: any) {
      const errorMessage = err.message || t('dialogs.adjustTime.previewFailed');
      // 检查是否是时间不合理的警告
      if (errorMessage.includes('时间可能不合理') || errorMessage.includes('建议开始时间') || errorMessage.includes('预计需要')) {
        // 时间不合理警告，但不阻止预览加载
        setError(null);
        console.warn('时间调整警告:', errorMessage);
      } else {
        setError(errorMessage);
        console.error('Failed to load preview:', err);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    if (!suggestion.actions || suggestion.actions.length === 0) {
      return;
    }

    const actionId = suggestion.actions[0].id;
    setApplying(true);
    setError(null);

    try {
      await tripsApi.applySuggestion(tripId, suggestion.id, {
        actionId: actionId,
        preview: false,
      });

      // 应用成功
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const errorMessage = err.message || t('dialogs.adjustTime.applyFailed');
      // 检查是否是时间不合理的警告
      if (errorMessage.includes('时间可能不合理') || errorMessage.includes('建议开始时间') || errorMessage.includes('预计需要')) {
        // 时间不合理警告，显示为警告而不是错误
        setError(`⚠️ ${errorMessage}`);
      } else {
        setError(errorMessage);
      }
      console.error('Failed to apply suggestion:', err);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            {t('dialogs.adjustTime.title')}
          </DialogTitle>
          <DialogDescription>
            {suggestion.title || suggestion.summary}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 智能时间调整提示 */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              {t('dialogs.adjustTime.infoMessage')}
            </span>
          </div>

          {previewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-6 h-6" />
              <span className="ml-2 text-sm text-muted-foreground">{t('dialogs.adjustTime.loading')}</span>
            </div>
          ) : previewResult ? (
            <div className="space-y-4">
              {/* 调整说明 */}
              {previewResult.appliedChanges && previewResult.appliedChanges.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">{t('dialogs.adjustTime.adjustmentContent')}</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {previewResult.appliedChanges.map((change, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>{change.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 影响分析 */}
              {previewResult.impact && (
                <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
                  <h4 className="text-sm font-semibold">{t('dialogs.adjustTime.impactAnalysis')}</h4>
                  
                  {previewResult.impact.metrics && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {previewResult.impact.metrics.fatigue !== undefined && (
                        <div>
                          <div className="text-muted-foreground">{t('dialogs.adjustTime.fatigue')}</div>
                          <div className={cn(
                            'font-semibold',
                            previewResult.impact.metrics.fatigue < 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {previewResult.impact.metrics.fatigue > 0 ? '+' : ''}
                            {previewResult.impact.metrics.fatigue}
                          </div>
                        </div>
                      )}
                      {previewResult.impact.metrics.buffer !== undefined && (
                        <div>
                          <div className="text-muted-foreground">{t('dialogs.adjustTime.bufferTime')}</div>
                          <div className={cn(
                            'font-semibold',
                            previewResult.impact.metrics.buffer > 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {previewResult.impact.metrics.buffer > 0 ? '+' : ''}
                            {previewResult.impact.metrics.buffer} {t('dialogs.adjustTime.minutes')}
                          </div>
                        </div>
                      )}
                      {previewResult.impact.metrics.cost !== undefined && (
                        <div>
                          <div className="text-muted-foreground">{t('dialogs.adjustTime.costChange')}</div>
                          <div className={cn(
                            'font-semibold',
                            previewResult.impact.metrics.cost < 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {previewResult.impact.metrics.cost > 0 ? '+' : ''}
                            ¥{previewResult.impact.metrics.cost}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {previewResult.impact.risks && previewResult.impact.risks.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">{t('dialogs.adjustTime.riskAssessment')}</div>
                      {previewResult.impact.risks.map((risk) => (
                        <div
                          key={risk.id}
                          className={cn(
                            'text-xs p-2 rounded',
                            risk.severity === 'blocker' && 'bg-red-50 text-red-800',
                            risk.severity === 'warn' && 'bg-yellow-50 text-yellow-800',
                            risk.severity === 'info' && 'bg-blue-50 text-blue-800'
                          )}
                        >
                          {risk.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 建议描述 */}
              {suggestion.description && (
                <div className="text-sm text-muted-foreground">
                  <strong>{t('dialogs.adjustTime.explanation')}</strong>
                  {suggestion.description}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {t('dialogs.adjustTime.noPreview')}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={applying}
          >
            {t('dialogs.adjustTime.cancel')}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!previewResult || applying || previewLoading}
          >
            {applying ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                {t('dialogs.adjustTime.applying')}
              </>
            ) : (
              t('dialogs.adjustTime.confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

