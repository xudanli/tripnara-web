import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useQuizFlow } from '@/hooks/useDecisionProfiling';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';

interface DecisionProfilingQuizDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: DecisionProfilingStep;
  /** 「重新调查」时预填上次答案 */
  prefillOnOpen?: boolean;
  onCompleted?: () => void;
}

export function DecisionProfilingQuizDialog({
  tripId,
  open,
  onOpenChange,
  initialStep = 'travel_style',
  prefillOnOpen = false,
  onCompleted,
}: DecisionProfilingQuizDialogProps) {
  const {
    quiz,
    quizLoading,
    step,
    setStep,
    currentQuestions,
    answers,
    selectOption,
    userNote,
    setUserNote,
    submitting,
    submitSection,
    resetPrefill,
  } = useQuizFlow(tripId, initialStep, { prefillOnOpen });

  const [questionIndex, setQuestionIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuestionIndex(0);
    setStep(initialStep);
    resetPrefill();
  }, [open, initialStep, setStep, resetPrefill]);

  const sectionLabel = step === 'travel_style' ? 'Travel Style · 旅行风格' : 'Money DNA · 消费 DNA';
  const totalQuestions = currentQuestions.length;
  const currentQuestion = currentQuestions[questionIndex];
  const progressPct =
    step === 'done' ? 100 : totalQuestions > 0 ? ((questionIndex + 1) / totalQuestions) * 100 : 0;

  const handleNext = async () => {
    if (!currentQuestion || !answers[currentQuestion.id]) return;
    if (questionIndex < totalQuestions - 1) {
      setQuestionIndex(questionIndex + 1);
      return;
    }
    const result = await submitSection();
    if (result.ok) {
      setQuestionIndex(0);
      if (result.done) onCompleted?.();
    }
  };

  const handleBack = () => {
    if (questionIndex > 0) setQuestionIndex(questionIndex - 1);
    else if (step === 'money_dna') {
      setStep('travel_style');
      setQuestionIndex(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">决策风格画像</span>
          </div>
          <DialogTitle className="text-lg">
            {step === 'done' ? '调查完成' : sectionLabel}
          </DialogTitle>
          <DialogDescription>
            {step === 'done'
              ? '你的旅行风格与 Money DNA 已保存，团队摩擦预警将在成员完成后更新。'
              : quiz
                ? prefillOnOpen
                  ? `已预填上次答案，可修改后提交 · 预计 ${quiz.estimatedMinutes.min}–${quiz.estimatedMinutes.max} 分钟`
                  : `预计 ${quiz.estimatedMinutes.min}–${quiz.estimatedMinutes.max} 分钟 · 情境化单选题`
                : '加载题库中…'}
          </DialogDescription>
          {step !== 'done' ? <Progress value={progressPct} className="h-1.5" /> : null}
        </DialogHeader>

        <div className="px-6 pb-6 pt-2 min-h-[280px]">
          {quizLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          ) : step === 'done' ? (
            <div className="py-8 text-center space-y-4">
              <p className="text-sm text-muted-foreground">可在右上角「决策画像」查看摩擦预警与分摊共识。</p>
              <Button onClick={() => onOpenChange(false)}>关闭</Button>
            </div>
          ) : currentQuestion ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                第 {questionIndex + 1} / {totalQuestions} 题
              </p>
              <p className="text-sm font-medium leading-relaxed">{currentQuestion.prompt}</p>
              <ul className="space-y-2">
                {currentQuestion.options.map((opt) => {
                  const selected = answers[currentQuestion.id] === opt.id;
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => selectOption(currentQuestion.id, opt.id)}
                        className={cn(
                          'w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                          selected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'hover:bg-muted/40',
                        )}
                      >
                        {opt.label}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {step === 'travel_style' && questionIndex === totalQuestions - 1 ? (
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs text-muted-foreground">微调备注（可选）</label>
                  <Textarea
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="如果 AI 判断不完全准确，可以补充说明…"
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  disabled={step === 'travel_style' && questionIndex === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一题
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleNext()}
                  disabled={!answers[currentQuestion.id] || submitting}
                  className="gap-1"
                >
                  {submitting ? (
                    '提交中…'
                  ) : questionIndex < totalQuestions - 1 ? (
                    <>
                      下一题
                      <ChevronRight className="h-4 w-4" />
                    </>
                  ) : step === 'travel_style' ? (
                    '完成 Travel Style'
                  ) : (
                    '完成 Money DNA'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">暂无题目</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
