import { useMemo, useState } from 'react';
import { Star } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type {
  CompanionToRate,
  PendingSurveyCampaign,
  ReputationSurveyQuestion,
  StarRating,
  SubmitSurveyBody,
} from '@/types/reputation';
import { FALLBACK_SURVEY_QUESTIONS } from '@/types/reputation';
import {
  useReputationSurveyQuestions,
  useSubmitReputationSurvey,
} from '../hooks/useReputation';

interface ReputationSurveyDialogProps {
  campaign: PendingSurveyCampaign | null;
  reviewee: CompanionToRate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRevieweeComplete?: () => void;
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: StarRating) => void;
}) {
  return (
    <div className="flex gap-1">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="rounded p-1 transition hover:scale-110"
        >
          <Star
            className={cn(
              'h-7 w-7',
              n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
            )}
          />
        </button>
      ))}
    </div>
  );
}

function buildSubmitBody(
  campaignId: string,
  revieweeUserId: string,
  answers: Partial<Record<string, StarRating>>,
  questions: ReputationSurveyQuestion[]
): SubmitSurveyBody {
  const body: Record<string, string | number> = { campaignId, revieweeUserId };
  for (const q of questions) {
    const rating = answers[q.id];
    if (rating == null) {
      throw new Error(`缺少题目 ${q.id} 的评分`);
    }
    body[q.mapsTo] = rating;
  }
  return body as unknown as SubmitSurveyBody;
}

export function ReputationSurveyDialog({
  campaign,
  reviewee,
  open,
  onOpenChange,
  onRevieweeComplete,
}: ReputationSurveyDialogProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<string, StarRating>>>({});
  const { data: questionsData } = useReputationSurveyQuestions(open);
  const submit = useSubmitReputationSurvey();

  const questions = useMemo(
    () =>
      [...(questionsData?.questions ?? FALLBACK_SURVEY_QUESTIONS)].sort(
        (a, b) => a.order - b.order
      ),
    [questionsData]
  );

  const current = questions[step];
  const currentRating = current ? answers[current.id] : undefined;
  const isLast = step === questions.length - 1;

  const reset = () => {
    setStep(0);
    setAnswers({});
  };

  const handleNext = async () => {
    if (!current || !currentRating || !campaign || !reviewee) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    try {
      const payload = buildSubmitBody(campaign.id, reviewee.userId, answers, questions);
      await submit.mutateAsync(payload);
      toast.success(`已为 ${reviewee.displayName} 完成互评`);
      reset();
      onOpenChange(false);
      onRevieweeComplete?.();
    } catch {
      toast.error('提交失败，请重试');
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  if (!campaign || !reviewee) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{campaign.pushCopy.title}</DialogTitle>
          <DialogDescription>
            {campaign.destinationLabel ?? '本次行程'} · 为 {reviewee.displayName}
            {reviewee.cardTitle ? `（${reviewee.cardTitle}）` : ''} 打分（{step + 1}/
            {questions.length}）
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm font-medium">{current?.text}</p>
        {current && (
          <StarRating
            value={currentRating ?? 0}
            onChange={(v) => setAnswers((a) => ({ ...a, [current.id]: v }))}
          />
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              上一题
            </Button>
          )}
          <Button onClick={handleNext} disabled={!currentRating || submit.isPending}>
            {isLast ? (submit.isPending ? '提交中…' : '完成互评') : '下一题'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
