import { Compass, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { OnboardingStatus } from '@/types/trip-decision-profiling';
import { isDecisionProfilingReuseEnabled } from '@/lib/decision-profiling-reuse-feature';
import { CollabWidgetCard } from './CollabWidgetCard';

interface DecisionStyleSurveyWidgetProps {
  onboarding: OnboardingStatus | null;
  memberCount?: number;
  reusing?: boolean;
  onStartQuiz: () => void;
  onReuseProfile?: () => void;
}

export function DecisionStyleSurveyWidget({
  onboarding,
  memberCount,
  reusing,
  onStartQuiz,
  onReuseProfile,
}: DecisionStyleSurveyWidgetProps) {
  const completion = onboarding?.teamCompletionRate ?? 0;
  const quizDone = onboarding?.quizCompleted ?? false;
  const reuseEligible =
    isDecisionProfilingReuseEnabled() && onboarding?.reuse?.eligible && !quizDone;

  return (
    <CollabWidgetCard title="决策风格调查">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {quizDone
            ? `团队完成度 ${Math.round(completion)}%${memberCount ? ` · ${memberCount} 位成员` : ''}`
            : '完成 Travel Style 与 Money DNA 调查，解锁团队摩擦预警'}
        </p>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">团队完成度</span>
            <span className="tabular-nums font-medium">{Math.round(completion)}%</span>
          </div>
          <Progress value={completion} className="h-1.5" />
        </div>
        <div className="flex flex-wrap gap-2">
          {reuseEligible && onReuseProfile ? (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1 text-xs"
              disabled={reusing}
              onClick={onReuseProfile}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              沿用上次结果
            </Button>
          ) : null}
          <Button
            type="button"
            variant={reuseEligible ? 'outline' : 'default'}
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={onStartQuiz}
          >
            <Compass className="h-3.5 w-3.5" />
            {quizDone ? '重新调查' : '开始调查'}
          </Button>
        </div>
      </div>
    </CollabWidgetCard>
  );
}
