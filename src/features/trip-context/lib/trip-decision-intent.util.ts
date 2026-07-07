import type { TravelContextIntentRequest } from '@/travel-context/client/travel-context-api.types';
import type { DecisionsViewData } from '@/travel-context/views/travel-context-views.types';
import { findRecommendedOptionForProblem } from './decisions-view-to-queue.util';

type SubmitTripIntent = (
  intent: Omit<TravelContextIntentRequest, 'basedOnRevision'>,
) => Promise<unknown>;

/** 通过 Travel Context Intent 接受并应用决策 */
export async function acceptTripDecisionViaIntent(
  submitTripIntent: SubmitTripIntent,
  decisionsView: DecisionsViewData | undefined,
  problemId: string,
): Promise<void> {
  const option = findRecommendedOptionForProblem(decisionsView, problemId);

  if (option) {
    await submitTripIntent({
      type: 'ACCEPT_DECISION_OPTION',
      payload: {
        problemId,
        optionId: option.optionId,
      },
    });
  }

  await submitTripIntent({
    type: 'APPLY_DECISION',
    payload: { problemId },
  });
}
