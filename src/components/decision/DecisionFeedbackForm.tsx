/**
 * 决策反馈表单组件
 * 用于收集用户对决策推荐的反馈
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Loader2, CheckCircle2 } from 'lucide-react';
import { useSubmitFeedback } from '@/hooks/useDecisions';
import type { DecisionFeedbackRequest } from '@/types/decision-engine';

interface DecisionFeedbackFormProps {
  decisionId: string;
  selectedPlanId?: string;
  onSuccess?: () => void;
  className?: string;
}

export function DecisionFeedbackForm({
  decisionId,
  selectedPlanId,
  onSuccess,
  className,
}: DecisionFeedbackFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [quickFeedback, setQuickFeedback] = useState<'positive' | 'negative' | null>(null);
  
  const { submitFeedback, isSubmitting, isSuccess, error } = useSubmitFeedback();

  const handleSubmit = async () => {
    const feedbackData: DecisionFeedbackRequest = {
      type: 'rating',
      rating: rating || undefined,
      comment: comment.trim() || undefined,
      selectedOption: selectedPlanId,
      context: {
        quickFeedback,
      },
    };

    try {
      await submitFeedback(decisionId, feedbackData);
      onSuccess?.();
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const handleQuickFeedback = (type: 'positive' | 'negative') => {
    setQuickFeedback(type);
    if (type === 'positive' && rating === 0) {
      setRating(4);
    } else if (type === 'negative' && rating === 0) {
      setRating(2);
    }
  };

  if (isSuccess) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">感谢您的反馈</h3>
          <p className="text-sm text-muted-foreground text-center">
            您的反馈将帮助我们提供更好的推荐
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          反馈评价
        </CardTitle>
        <CardDescription>
          您对这次推荐方案的体验如何？
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 快速反馈 */}
        <div>
          <Label className="text-sm font-medium mb-3 block">快速评价</Label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={quickFeedback === 'positive' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleQuickFeedback('positive')}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              满意
            </Button>
            <Button
              type="button"
              variant={quickFeedback === 'negative' ? 'destructive' : 'outline'}
              className="flex-1"
              onClick={() => handleQuickFeedback('negative')}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              不满意
            </Button>
          </div>
        </div>

        {/* 星级评分 */}
        <div>
          <Label className="text-sm font-medium mb-3 block">详细评分</Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-transform hover:scale-110"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={cn(
                    'h-8 w-8 transition-colors',
                    (hoveredRating || rating) >= star
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  )}
                />
              </button>
            ))}
            <span className="ml-3 text-sm text-muted-foreground">
              {rating > 0 && `${rating} 分`}
            </span>
          </div>
        </div>

        {/* 评论 */}
        <div>
          <Label htmlFor="comment" className="text-sm font-medium mb-3 block">
            补充说明（可选）
          </Label>
          <Textarea
            id="comment"
            placeholder="请告诉我们您的想法，例如：方案很好，但希望休息时间多一点..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            提交失败：{error.message}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (rating === 0 && !quickFeedback)}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              提交中...
            </>
          ) : (
            '提交反馈'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default DecisionFeedbackForm;
