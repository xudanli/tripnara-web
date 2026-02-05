import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { decisionApi } from '@/api/decision';
import type { PlanVariantFeedbackRequest, VariantStrategy, UserChoice } from '@/types/feedback';
import { toast } from 'sonner';

interface PlanVariantFeedbackCardProps {
  runId: string;
  variantId: string;
  variantStrategy: VariantStrategy;
  userChoice: UserChoice;
  tripId?: string;
  userId?: string;
  onSubmitted?: () => void;
  className?: string;
}

const CHOICE_LABELS: Record<UserChoice, string> = {
  selected: '已选择',
  rejected: '已拒绝',
  modified: '已修改',
};

export default function PlanVariantFeedbackCard({
  runId,
  variantId,
  variantStrategy,
  userChoice,
  tripId,
  userId,
  onSubmitted,
  className,
}: PlanVariantFeedbackCardProps) {
  const [rating, setRating] = useState<number>(5);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (submitting || submitted) return;

    setSubmitting(true);
    try {
      const feedback: PlanVariantFeedbackRequest = {
        runId,
        variantId,
        variantStrategy,
        userChoice,
        rating,
        reason: reason.trim() || undefined,
        tripId,
        userId,
      };

      await decisionApi.submitPlanVariantFeedback(feedback);
      
      setSubmitted(true);
      toast.success('反馈提交成功，感谢您的反馈！');
      onSubmitted?.();
    } catch (error: any) {
      console.error('提交反馈失败:', error);
      toast.error(error.message || '提交反馈失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className={cn('border-green-300 bg-green-50', className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700">
            <Star className="w-5 h-5" />
            <span className="font-medium">感谢您的反馈！</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-blue-200', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              方案反馈
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              您{CHOICE_LABELS[userChoice]}此方案，请告诉我们您的想法
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onSubmitted?.()}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 评分滑块 */}
        <div className="space-y-2">
          <Label className="text-sm">评分（1-5分）</Label>
          <div className="space-y-2">
            <Slider
              value={[rating]}
              onValueChange={(value) => setRating(value[0])}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1分 - 不满意</span>
              <span className="text-lg font-semibold text-primary">{rating}分</span>
              <span>5分 - 非常满意</span>
            </div>
          </div>
        </div>

        {/* 反馈原因输入框 */}
        <div className="space-y-2">
          <Label htmlFor="reason" className="text-sm">
            反馈原因（可选）
          </Label>
          <Textarea
            id="reason"
            placeholder="请告诉我们您选择/拒绝/修改此方案的原因..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* 提交按钮 */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? '提交中...' : '提交反馈'}
        </Button>
      </CardContent>
    </Card>
  );
}
