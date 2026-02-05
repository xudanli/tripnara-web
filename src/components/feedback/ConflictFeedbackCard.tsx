import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { decisionApi } from '@/api/decision';
import type { ConflictFeedbackRequest } from '@/types/feedback';
import { toast } from 'sonner';

interface ConflictFeedbackCardProps {
  runId: string;
  conflictId: string;
  conflictType: string;
  tradeoffOptions: string[];
  tripId?: string;
  userId?: string;
  onSubmitted?: () => void;
  className?: string;
}

export default function ConflictFeedbackCard({
  runId,
  conflictId,
  conflictType,
  tradeoffOptions,
  tripId,
  userId,
  onSubmitted,
  className,
}: ConflictFeedbackCardProps) {
  const [understood, setUnderstood] = useState(false);
  const [explanationClear, setExplanationClear] = useState(false);
  const [tradeoffOptionsUseful, setTradeoffOptionsUseful] = useState(false);
  const [selectedTradeoffOption, setSelectedTradeoffOption] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (submitting || submitted) return;

    setSubmitting(true);
    try {
      const feedback: ConflictFeedbackRequest = {
        runId,
        conflictId,
        conflictType,
        understood,
        explanationClear,
        tradeoffOptionsUseful,
        selectedTradeoffOption: selectedTradeoffOption || undefined,
        tripId,
        userId,
      };

      await decisionApi.submitConflictFeedback(feedback);
      
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
            <CheckCircle2 className="w-5 h-5" />
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
              冲突反馈
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              请帮助我们改进冲突解释和权衡选项
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
        {/* 理解度 */}
        <div className="flex items-center justify-between">
          <Label htmlFor="understood" className="text-sm">
            我理解了这个冲突
          </Label>
          <Switch
            id="understood"
            checked={understood}
            onCheckedChange={setUnderstood}
          />
        </div>

        {/* 解释清晰度 */}
        <div className="flex items-center justify-between">
          <Label htmlFor="explanationClear" className="text-sm">
            冲突解释清晰
          </Label>
          <Switch
            id="explanationClear"
            checked={explanationClear}
            onCheckedChange={setExplanationClear}
          />
        </div>

        {/* 权衡选项有用度 */}
        <div className="flex items-center justify-between">
          <Label htmlFor="tradeoffOptionsUseful" className="text-sm">
            权衡选项有用
          </Label>
          <Switch
            id="tradeoffOptionsUseful"
            checked={tradeoffOptionsUseful}
            onCheckedChange={setTradeoffOptionsUseful}
          />
        </div>

        {/* 选择的权衡选项 */}
        {tradeoffOptions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm">您选择的权衡选项（可选）</Label>
            <Select value={selectedTradeoffOption} onValueChange={setSelectedTradeoffOption}>
              <SelectTrigger>
                <SelectValue placeholder="请选择您选择的权衡选项" />
              </SelectTrigger>
              <SelectContent>
                {tradeoffOptions.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
