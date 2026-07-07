import { CalendarDays, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OnboardingStatus } from '@/types/trip-decision-profiling';
import { isDecisionProfilingReuseEnabled } from '@/lib/decision-profiling-reuse-feature';
import { CollabWidgetCard } from './CollabWidgetCard';

interface DecisionStyleSurveyWidgetProps {
  onboarding: OnboardingStatus | null;
  memberCount?: number;
  completedAt?: string;
  reusing?: boolean;
  onStartQuiz: () => void;
  onReuseProfile?: () => void;
}

export function DecisionStyleSurveyWidget({
  onboarding,
  memberCount,
  completedAt,
  reusing,
  onStartQuiz,
  onReuseProfile,
}: DecisionStyleSurveyWidgetProps) {
  const completion = onboarding?.teamCompletionRate ?? 0;
  const quizDone = onboarding?.quizCompleted ?? false;
  const reuseEligible =
    isDecisionProfilingReuseEnabled() && onboarding?.reuse?.eligible && !quizDone;

  return (
    <CollabWidgetCard
      title={
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          决策风格调查
        </span>
      }
      className="h-full"
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {quizDone ? (
            <>
              {completedAt ? <p>最近完成 {completedAt}</p> : null}
              <p>
                来源：{memberCount ?? '—'} 位成员 · Travel Style + Money DNA
              </p>
              <p>团队完成度 {Math.round(completion)}%</p>
            </>
          ) : (
            <p>完成 Travel Style 与 Money DNA 调查，解锁团队摩擦预警与分摊共识。</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {quizDone || reuseEligible ? (
            <Button
              type="button"
              size="sm"
              className="h-8 w-full gap-1 text-xs"
              disabled={reusing || (quizDone && !reuseEligible)}
              onClick={reuseEligible && onReuseProfile ? onReuseProfile : undefined}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              沿用上次结果
            </Button>
          ) : null}
          <Button
            type="button"
            variant={quizDone || reuseEligible ? 'outline' : 'default'}
            size="sm"
            className="h-8 w-full text-xs"
            onClick={onStartQuiz}
          >
            {quizDone ? '重新调查' : '开始调查'}
          </Button>
        </div>
      </div>
    </CollabWidgetCard>
  );
}
