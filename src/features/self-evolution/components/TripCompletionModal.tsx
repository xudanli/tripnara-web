import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import type { TripDetail } from '@/types/trip';
import type { ReviewSummary } from '@/types/trip-review';
import type { TripOutcomeQuestionnaireResponses, TripOutcomeResponse } from '@/types/self-evolution';
import { buildTripCompletedContext } from '../lib/build-trip-completed-context';
import { useTripCompletedFlow } from '../hooks/useSelfEvolution';
import { TripOutcomeDashboard } from './TripOutcomeDashboard';

const DEFAULT_RESPONSES: TripOutcomeQuestionnaireResponses = {
  overallSatisfaction: 5,
  cognitiveEvaluation: 5,
  positiveActivation: 5,
  negativeActivation: 2,
  willingnessToTravelAgain: 6,
  groupDynamics: 5,
  nps: 8,
  recommendation: 6,
};

const QUESTIONNAIRE_FIELDS: Array<{
  key: keyof TripOutcomeQuestionnaireResponses;
  label: string;
  min: number;
  max: number;
  step?: number;
}> = [
  { key: 'overallSatisfaction', label: '整体满意度', min: 1, max: 7 },
  { key: 'cognitiveEvaluation', label: '认知评价', min: 1, max: 7 },
  { key: 'positiveActivation', label: '积极情绪', min: 1, max: 7 },
  { key: 'negativeActivation', label: '消极情绪', min: 1, max: 7 },
  { key: 'willingnessToTravelAgain', label: '再次同行意愿', min: 1, max: 7 },
  { key: 'groupDynamics', label: '团队氛围', min: 1, max: 7 },
  { key: 'nps', label: '推荐意愿 (NPS)', min: 0, max: 10, step: 1 },
  { key: 'recommendation', label: '推荐评分', min: 1, max: 7 },
];

interface TripCompletionModalProps {
  tripId: string;
  userIds: string[];
  trip?: TripDetail;
  reviewSummary?: ReviewSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (outcome: TripOutcomeResponse) => void;
  plannedBudget?: number;
  actualSpent?: number;
}

export function TripCompletionModal({
  tripId,
  userIds,
  trip,
  reviewSummary,
  open,
  onOpenChange,
  onComplete,
  plannedBudget,
  actualSpent,
}: TripCompletionModalProps) {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<TripOutcomeQuestionnaireResponses>(DEFAULT_RESPONSES);
  const [outcome, setOutcome] = useState<TripOutcomeResponse | null>(null);
  const completeFlow = useTripCompletedFlow();

  const currentField = QUESTIONNAIRE_FIELDS[step];
  const isLast = step === QUESTIONNAIRE_FIELDS.length - 1;
  const showResult = outcome != null;

  const currentValue = currentField ? responses[currentField.key] : undefined;

  const reset = () => {
    setStep(0);
    setResponses(DEFAULT_RESPONSES);
    setOutcome(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleNext = async () => {
    if (!currentField) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    try {
      const primaryUserId = userIds[0];
      const ctx =
        trip && primaryUserId
          ? buildTripCompletedContext({
              trip,
              userId: primaryUserId,
              questionnaireResponses: responses,
              reviewSummary,
            })
          : {
              tripId,
              userIds,
              questionnaireResponses: responses,
              plannedBudget,
              actualSpent,
              preTripExpectation: 5,
            };

      const result = await completeFlow.mutateAsync(ctx);
      setOutcome(result.outcome);
      onComplete?.(result.outcome);
      if (result.reflected) {
        toast.info('已触发偏好反思，系统正在更新你的旅行模式');
      }
      toast.success('旅行评价已提交');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交评价失败');
    }
  };

  const sliderMax = useMemo(() => currentField?.max ?? 7, [currentField]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {showResult ? (
          <>
            <DialogHeader>
              <DialogTitle>旅行结果</DialogTitle>
              <DialogDescription>基于你的评价生成的 6 维旅行结果分析</DialogDescription>
            </DialogHeader>
            <TripOutcomeDashboard outcome={outcome} />
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>完成</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>旅行满意度评价</DialogTitle>
              <DialogDescription>
                第 {step + 1} / {QUESTIONNAIRE_FIELDS.length} 题 · 帮助我们改进未来推荐
              </DialogDescription>
            </DialogHeader>

            {currentField && (
              <div className="space-y-4 py-2">
                <Label className="text-base">{currentField.label}</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    min={currentField.min}
                    max={currentField.max}
                    step={currentField.step ?? 1}
                    value={[currentValue ?? currentField.min]}
                    onValueChange={([v]) =>
                      setResponses((prev) => ({ ...prev, [currentField.key]: v }))
                    }
                    className="flex-1"
                  />
                  <span className="w-8 text-right text-lg font-semibold tabular-nums">
                    {currentValue}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentField.min} – {sliderMax}
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={completeFlow.isPending}>
                  上一题
                </Button>
              )}
              <Button onClick={handleNext} disabled={completeFlow.isPending}>
                {completeFlow.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    提交中…
                  </>
                ) : isLast ? (
                  '提交评价'
                ) : (
                  '下一题'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
