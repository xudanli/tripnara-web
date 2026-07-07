import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import type { TripIntentRouteResult } from '@/api/travel-status.types';

export interface HandleTripIntentResultOptions {
  navigate: NavigateFunction;
  tripId: string;
  scrollToDecisionQueue?: () => void;
}

export function handleTripIntentResult(
  result: TripIntentRouteResult,
  options: HandleTripIntentResultOptions,
): void {
  const { navigate, tripId, scrollToDecisionQueue } = options;

  switch (result.suggestedAction) {
    case 'OPEN_DECISION_QUEUE':
      if (result.decisionQueueHeadline) {
        toast.info(result.decisionQueueHeadline);
      }
      scrollToDecisionQueue?.();
      break;

    case 'CALL_ROUTE_AND_RUN':
      toast.message('正在处理…', {
        description: result.classification.label ?? result.classification.kind,
      });
      navigate(`/dashboard/nara?tripId=${tripId}`);
      break;

    case 'REVIEW_DISPATCH_RESULT':
      toast.success('已收到处理结果', {
        description:
          result.decisionQueueHeadline ??
          result.classification.label ??
          '请查看下方更新',
      });
      break;

    case 'NONE':
    default:
      toast.message(result.classification.label ?? result.classification.kind, {
        description: result.decisionQueueHeadline,
      });
      break;
  }
}
