/**
 * 行程后体能反馈弹窗组件
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
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useSubmitFeedback } from '@/hooks/useFitnessQuery';
import type { EffortRating, AdjustmentType } from '@/types/fitness';
import { EFFORT_RATING_CONFIG, ADJUSTMENT_OPTIONS } from '@/constants/fitness';
import {
  trackFeedbackDialogShown,
  trackFeedbackSubmitted,
  trackFeedbackDismissed,
} from '@/utils/fitness-analytics';

interface TripFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripName?: string;
  onComplete?: () => void;
  onDismiss?: () => void;
}

/**
 * 行程后体能反馈弹窗
 * 
 * @example
 * ```tsx
 * <TripFeedbackDialog
 *   open={showFeedback}
 *   onOpenChange={setShowFeedback}
 *   tripId="trip_123"
 *   tripName="冰岛环岛7日"
 *   onComplete={() => {
 *     setShowFeedback(false);
 *     markTripFeedbackSubmitted(tripId);
 *   }}
 * />
 * ```
 */
export function TripFeedbackDialog({
  open,
  onOpenChange,
  tripId,
  tripName,
  onComplete,
  onDismiss,
}: TripFeedbackDialogProps) {
  // 状态
  const [effortRating, setEffortRating] = useState<EffortRating | null>(null);
  const [completedAsPlanned, setCompletedAsPlanned] = useState(true);
  const [adjustments, setAdjustments] = useState<AdjustmentType[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 提交反馈
  const submitMutation = useSubmitFeedback();

  // 弹窗打开时埋点
  useEffect(() => {
    if (open) {
      trackFeedbackDialogShown(tripId);
    }
  }, [open, tripId]);

  // 重置状态
  const resetState = () => {
    setEffortRating(null);
    setCompletedAsPlanned(true);
    setAdjustments([]);
    setShowSuccess(false);
    setSuccessMessage('');
  };

  // 关闭弹窗
  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // 跳过反馈
  const handleDismiss = () => {
    trackFeedbackDismissed(tripId);
    onDismiss?.();
    handleClose();
  };

  // 切换调整选项
  const toggleAdjustment = (id: AdjustmentType) => {
    setAdjustments(prev => 
      prev.includes(id)
        ? prev.filter(a => a !== id)
        : [...prev, id]
    );
  };

  // 提交反馈
  const handleSubmit = async () => {
    if (!effortRating) return;

    try {
      const result = await submitMutation.mutateAsync({
        tripId,
        actualEffortRating: effortRating,
        completedAsPlanned,
        adjustmentsMade: adjustments,
      });

      // 埋点
      trackFeedbackSubmitted({
        tripId,
        effortRating,
        completedAsPlanned,
        adjustmentsMade: adjustments,
      });

      // 显示成功消息
      setSuccessMessage(result.message);
      setShowSuccess(true);

      // 延迟关闭
      setTimeout(() => {
        onComplete?.();
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('提交反馈失败:', error);
    }
  };

  // 成功状态
  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-center">
              {successMessage || '感谢您的反馈！'}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              您的反馈将帮助我们优化后续行程推荐
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            🎉 恭喜完成行程！
          </DialogTitle>
          <DialogDescription className="text-center">
            {tripName ? `「${tripName}」` : ''}您的反馈将帮助我们更好地规划下次行程
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 体力感受选择 */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">
              这次行程的体能感受如何？
            </p>
            <div className="grid grid-cols-3 gap-3">
              {([1, 2, 3] as EffortRating[]).map((rating) => {
                const config = EFFORT_RATING_CONFIG[rating];
                const isSelected = effortRating === rating;
                
                return (
                  <button
                    key={rating}
                    onClick={() => setEffortRating(rating)}
                    className={cn(
                      'flex flex-col items-center p-4 rounded-lg border-2 transition-all',
                      'hover:border-primary/50',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-muted'
                    )}
                  >
                    <span className="text-3xl mb-1">{config.emoji}</span>
                    <span className="text-sm font-medium">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 是否按计划完成 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="completed"
              checked={completedAsPlanned}
              onCheckedChange={(checked) => setCompletedAsPlanned(checked === true)}
            />
            <label
              htmlFor="completed"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              按计划完成了所有行程
            </label>
          </div>

          {/* 调整选项（仅当未按计划完成时显示） */}
          {!completedAsPlanned && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                实际做了哪些调整？（可选）
              </p>
              <div className="flex flex-wrap gap-2">
                {ADJUSTMENT_OPTIONS.map((option) => {
                  const isSelected = adjustments.includes(option.id);
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleAdjustment(option.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm transition-all',
                        'border',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted hover:border-primary/50'
                      )}
                    >
                      {option.emoji} {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 按钮 */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleDismiss}>
            稍后再说
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!effortRating || submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                提交中...
              </>
            ) : (
              '提交反馈'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
