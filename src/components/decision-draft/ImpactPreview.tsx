/**
 * 影响预览组件
 * 显示决策修改的影响范围
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { decisionDraftApi } from '@/api/decision-draft';
import type { ImpactPreviewResult } from '@/types/decision-draft';
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImpactPreviewProps {
  draftId: string;
  stepId: string;
  newValue: any;
  open: boolean;
  onClose?: () => void;
  onApply?: () => void;
  onCancel?: () => void;
}

export default function ImpactPreview({
  draftId,
  stepId,
  newValue,
  open,
  onClose,
  onApply,
  onCancel,
}: ImpactPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [impact, setImpact] = useState<ImpactPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && draftId && stepId) {
      loadImpactPreview();
    }
  }, [open, draftId, stepId, newValue]);

  const loadImpactPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await decisionDraftApi.previewImpact(draftId, {
        step_id: stepId,
        new_value: newValue,
      });
      setImpact(data);
    } catch (err: any) {
      setError(err.message || '加载影响预览失败');
      console.error('Failed to load impact preview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    onApply?.();
    onClose?.();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            影响预览
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        )}

        {error && (
          <div className="p-4 text-destructive">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && impact && (
          <div className="space-y-4">
            {/* 影响摘要 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">影响摘要</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{impact.impact_summary}</p>
              </CardContent>
            </Card>

            {/* 置信度变化 */}
            {impact.confidence_change !== 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {impact.confidence_change > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    置信度变化
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      'text-2xl font-bold',
                      impact.confidence_change > 0 ? 'text-green-500' : 'text-red-500'
                    )}
                  >
                    {impact.confidence_change > 0 ? '+' : ''}
                    {Math.round(impact.confidence_change * 100)}%
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 受影响的决策步骤 */}
            {impact.affected_steps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    受影响的决策步骤 ({impact.affected_steps.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {impact.affected_steps.map((stepId) => (
                      <Badge key={stepId} variant="outline" className="bg-orange-50 dark:bg-orange-950">
                        {stepId}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 受影响的证据 */}
            {impact.affected_evidence.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    受影响的证据 ({impact.affected_evidence.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {impact.affected_evidence.map((evidenceId) => (
                      <Badge key={evidenceId} variant="outline" className="bg-orange-50 dark:bg-orange-950">
                        {evidenceId}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                取消
              </Button>
              <Button onClick={handleApply}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                应用修改
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
