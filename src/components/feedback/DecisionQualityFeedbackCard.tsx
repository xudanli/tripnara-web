import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { decisionApi } from '@/api/decision';
import type { DecisionQualityFeedbackRequest } from '@/types/feedback';
import { toast } from 'sonner';

interface DecisionQualityFeedbackCardProps {
  runId: string;
  tripId?: string;
  userId?: string;
  onSubmitted?: () => void;
  className?: string;
}

export default function DecisionQualityFeedbackCard({
  runId,
  tripId,
  userId,
  onSubmitted,
  className,
}: DecisionQualityFeedbackCardProps) {
  const [overallSatisfaction, setOverallSatisfaction] = useState<number>(5);
  const [planQuality, setPlanQuality] = useState<number>(5);
  const [conflictExplanationQuality, setConflictExplanationQuality] = useState<number>(5);
  const [tradeoffOptionsQuality, setTradeoffOptionsQuality] = useState<number>(5);
  const [decisionSpeed, setDecisionSpeed] = useState<number>(5);
  const [additionalFeedback, setAdditionalFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (submitting || submitted) return;

    setSubmitting(true);
    try {
      const feedback: DecisionQualityFeedbackRequest = {
        runId,
        overallSatisfaction,
        planQuality,
        conflictExplanationQuality,
        tradeoffOptionsQuality,
        decisionSpeed,
        additionalFeedback: additionalFeedback.trim() || undefined,
        tripId,
        userId,
      };

      await decisionApi.submitDecisionQualityFeedback(feedback);
      
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
              决策质量反馈
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              请帮助我们改进决策质量
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
        {/* 整体满意度 */}
        <div className="space-y-2">
          <Label className="text-sm">整体满意度</Label>
          <div className="space-y-2">
            <Slider
              value={[overallSatisfaction]}
              onValueChange={(value) => setOverallSatisfaction(value[0])}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1分</span>
              <span className="text-lg font-semibold text-primary">{overallSatisfaction}分</span>
              <span>5分</span>
            </div>
          </div>
        </div>

        {/* 计划质量 */}
        <div className="space-y-2">
          <Label className="text-sm">计划质量</Label>
          <div className="space-y-2">
            <Slider
              value={[planQuality]}
              onValueChange={(value) => setPlanQuality(value[0])}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1分</span>
              <span className="text-lg font-semibold text-primary">{planQuality}分</span>
              <span>5分</span>
            </div>
          </div>
        </div>

        {/* 冲突解释质量 */}
        <div className="space-y-2">
          <Label className="text-sm">冲突解释质量</Label>
          <div className="space-y-2">
            <Slider
              value={[conflictExplanationQuality]}
              onValueChange={(value) => setConflictExplanationQuality(value[0])}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1分</span>
              <span className="text-lg font-semibold text-primary">{conflictExplanationQuality}分</span>
              <span>5分</span>
            </div>
          </div>
        </div>

        {/* 权衡选项质量 */}
        <div className="space-y-2">
          <Label className="text-sm">权衡选项质量</Label>
          <div className="space-y-2">
            <Slider
              value={[tradeoffOptionsQuality]}
              onValueChange={(value) => setTradeoffOptionsQuality(value[0])}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1分</span>
              <span className="text-lg font-semibold text-primary">{tradeoffOptionsQuality}分</span>
              <span>5分</span>
            </div>
          </div>
        </div>

        {/* 决策速度 */}
        <div className="space-y-2">
          <Label className="text-sm">决策速度</Label>
          <div className="space-y-2">
            <Slider
              value={[decisionSpeed]}
              onValueChange={(value) => setDecisionSpeed(value[0])}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1分</span>
              <span className="text-lg font-semibold text-primary">{decisionSpeed}分</span>
              <span>5分</span>
            </div>
          </div>
        </div>

        {/* 额外反馈 */}
        <div className="space-y-2">
          <Label htmlFor="additionalFeedback" className="text-sm">
            额外反馈（可选）
          </Label>
          <Textarea
            id="additionalFeedback"
            placeholder="请告诉我们您的其他想法和建议..."
            value={additionalFeedback}
            onChange={(e) => setAdditionalFeedback(e.target.value)}
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
