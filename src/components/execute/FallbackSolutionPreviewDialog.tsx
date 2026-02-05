/**
 * 修复方案预览对话框
 * 显示修复方案的详细变更内容和时间线预览
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
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { executionApi, type PreviewFallbackResponse } from '@/api/execution';
import { toast } from 'sonner';
import { CheckCircle2, X, Plus, Minus, Edit, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FallbackSolutionPreviewDialogProps {
  solutionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: (solutionId: string) => void;
}

export function FallbackSolutionPreviewDialog({
  solutionId,
  open,
  onOpenChange,
  onApply,
}: FallbackSolutionPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewFallbackResponse | null>(null);

  useEffect(() => {
    if (open && solutionId) {
      loadPreview();
    } else {
      setPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, solutionId]);

  const loadPreview = async () => {
    if (!solutionId) return;

    setLoading(true);
    try {
      const result = await executionApi.previewFallback(solutionId);
      setPreview(result);
    } catch (err: any) {
      console.error('Failed to load preview:', err);
      toast.error(err?.message || '获取预览失败');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (solutionId && onApply) {
      onApply(solutionId);
      onOpenChange(false);
    }
  };

  if (!solutionId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            预览修复方案
          </DialogTitle>
          <DialogDescription>
            {preview?.description || '正在加载预览...'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-6 h-6" />
            <span className="ml-2 text-sm text-muted-foreground">正在加载预览...</span>
          </div>
        ) : preview ? (
          <div className="space-y-6">
            {/* 方案信息 */}
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn(
                  preview.type === 'minimal' && 'border-blue-500 text-blue-700',
                  preview.type === 'experience' && 'border-purple-500 text-purple-700',
                  preview.type === 'safety' && 'border-green-500 text-green-700'
                )}
              >
                {preview.type === 'minimal' && '最小改动'}
                {preview.type === 'experience' && '体验优先'}
                {preview.type === 'safety' && '安全优先'}
              </Badge>
              <h3 className="text-lg font-semibold">{preview.title}</h3>
            </div>

            {/* 变更内容 */}
            {preview.changes && preview.changes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    变更内容
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {preview.changes.map((change, index) => (
                      <div
                        key={index}
                        className={cn(
                          'p-3 rounded-lg border',
                          change.action === 'modify' && 'bg-blue-50 border-blue-200',
                          change.action === 'remove' && 'bg-red-50 border-red-200',
                          change.action === 'add' && 'bg-green-50 border-green-200'
                        )}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          {change.action === 'modify' && (
                            <Edit className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                          )}
                          {change.action === 'remove' && (
                            <Minus className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
                          )}
                          {change.action === 'add' && (
                            <Plus className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-sm mb-1">
                              {change.action === 'modify' && '修改'}
                              {change.action === 'remove' && '删除'}
                              {change.action === 'add' && '新增'}
                            </div>
                            {change.original && (
                              <div className="text-xs text-muted-foreground mb-1">
                                <span className="font-medium">原计划：</span>
                                {change.original.placeName} ({format(new Date(change.original.startTime), 'HH:mm')} - {format(new Date(change.original.endTime), 'HH:mm')})
                              </div>
                            )}
                            {change.modified && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">新计划：</span>
                                {change.modified.placeName} ({format(new Date(change.modified.startTime), 'HH:mm')} - {format(new Date(change.modified.endTime), 'HH:mm')})
                              </div>
                            )}
                            {change.reason && (
                              <div className="text-xs text-muted-foreground mt-1 italic">
                                {change.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 影响分析 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  影响分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">到达时间</div>
                    <div className="font-medium">{preview.impact.arrivalTime}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">缺失地点</div>
                    <div className="font-medium">
                      {preview.impact.missingPlaces === 0 ? '无' : `${preview.impact.missingPlaces}个`}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">风险变化</div>
                    <Badge
                      variant="outline"
                      className={cn(
                        preview.impact.riskChange === 'low' && 'border-green-500 text-green-700',
                        preview.impact.riskChange === 'medium' && 'border-yellow-500 text-yellow-700',
                        preview.impact.riskChange === 'high' && 'border-red-500 text-red-700'
                      )}
                    >
                      {preview.impact.riskChange === 'low' ? '低' : 
                       preview.impact.riskChange === 'medium' ? '中' : '高'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 时间线预览 */}
            {preview.timeline && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    时间线预览
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {preview.timeline.schedule.items.map((item, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg border',
                          item.status === 'unchanged' && 'bg-gray-50 border-gray-200',
                          item.status === 'modified' && 'bg-blue-50 border-blue-200',
                          item.status === 'new' && 'bg-green-50 border-green-200',
                          item.status === 'removed' && 'bg-red-50 border-red-200 opacity-50'
                        )}
                      >
                        <div className="flex-shrink-0 w-16 text-xs text-muted-foreground">
                          {format(new Date(item.startTime), 'HH:mm')}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.placeName}</div>
                          {item.status !== 'unchanged' && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {item.status === 'modified' && '已修改'}
                              {item.status === 'new' && '新增'}
                              {item.status === 'removed' && '已删除'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleApply} disabled={!preview}>
            应用此方案
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
