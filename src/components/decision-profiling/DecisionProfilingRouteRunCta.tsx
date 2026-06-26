import { useNavigate } from 'react-router-dom';
import { ClipboardList, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildDecisionProfilingQuizUrl,
  decisionProfilingCtaLabel,
  isDecisionProfilingReuseAction,
  navigateToDecisionProfilingHub,
  navigateToDecisionProfilingQuiz,
} from '@/lib/decision-profiling-navigation';
import type { DecisionProfilingPayload } from '@/types/trip-decision-profiling';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DecisionProfilingRouteRunCtaProps {
  payload: DecisionProfilingPayload;
  className?: string;
  disabled?: boolean;
}

/** route_and_run payload.decision_profiling.triggered：气泡内 CTA */
export function DecisionProfilingRouteRunCta({
  payload,
  className,
  disabled,
}: DecisionProfilingRouteRunCtaProps) {
  const navigate = useNavigate();

  if (!payload.triggered) return null;

  const showReuse =
    isDecisionProfilingReuseAction(payload) &&
    payload.clientNavigation?.action === 'reuse_profile';

  if (showReuse) {
    return (
      <div className={cn('mt-3 flex flex-wrap gap-2', className)}>
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={disabled}
          className="h-8 rounded-full text-xs gap-1.5"
          onClick={() => {
            if (!navigateToDecisionProfilingHub(navigate, payload)) {
              toast.error('无法打开决策画像，请稍后重试');
            }
          }}
        >
          <History className="w-3.5 h-3.5 shrink-0" aria-hidden />
          沿用上次调查
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 rounded-full text-xs"
          onClick={() => {
            if (!navigateToDecisionProfilingQuiz(navigate, payload)) {
              toast.error('无法打开行前调查，请稍后重试');
            }
          }}
        >
          重新调查
        </Button>
      </div>
    );
  }

  if (!buildDecisionProfilingQuizUrl(payload)) return null;

  return (
    <div className={cn('mt-3', className)}>
      <Button
        type="button"
        variant="default"
        size="sm"
        disabled={disabled}
        className="h-8 rounded-full text-xs gap-1.5"
        onClick={() => {
          if (!navigateToDecisionProfilingHub(navigate, payload)) {
            toast.error('无法打开行前调查，请稍后从规划工作台重试');
          }
        }}
      >
        <ClipboardList className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {decisionProfilingCtaLabel(payload)}
      </Button>
    </div>
  );
}
