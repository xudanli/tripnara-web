import { guardianChooseApi } from '@/api/guardian-choose';
import { optimizationApi } from '@/api/optimization-v2';
import { DEFAULT_WEIGHTS } from '@/types/optimization-v2';
import type {
  SubmitGuardianHumanChoiceInput,
  SubmitGuardianHumanChoiceResult,
} from '@/types/guardian-choose';
import { GuardianChooseBlockedError } from '@/types/guardian-choose';
import type { AxiosError } from 'axios';

function isAxiosError(err: unknown): err is AxiosError<{ message?: string }> {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isAxiosError' in err &&
    (err as AxiosError).isAxiosError === true
  );
}

/**
 * Guardian CHOOSE 写回：优先 POST /v2/trips/:tripId/guardian/choose；
 * 端点不可用时回退 optimization feedback（仅记反馈，不驱动编排）。
 */
export async function submitGuardianHumanChoice(
  input: SubmitGuardianHumanChoiceInput,
): Promise<SubmitGuardianHumanChoiceResult> {
  const {
    userId,
    tripId,
    source,
    selectedText,
    selectedIndex,
    decisionPoints,
    correlationId,
    sessionId,
    negotiationRunId,
  } = input;

  try {
    const choose = await guardianChooseApi.submitChoose(tripId, {
      source,
      selectedIndex,
      selectedText,
      decisionPoints,
      correlationId,
      sessionId,
      negotiationRunId,
    });
    return {
      accepted: choose.accepted,
      nextAction: choose.nextAction,
      planVersion: choose.planVersion,
      decisionLogEntryId: choose.decisionLogEntryId,
      presentation: choose.presentation,
      channel: 'guardian_choose',
    };
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 409) {
      const msg =
        typeof err.response.data?.message === 'string'
          ? err.response.data.message
          : undefined;
      throw new GuardianChooseBlockedError(msg);
    }

    const status = isAxiosError(err) ? err.response?.status : undefined;
    // 404/501/网络等：过渡回退 feedback
    if (status !== undefined && status !== 404 && status !== 501 && status !== 503) {
      throw err;
    }
  }

  const reason = [
    `Guardian CHOOSE [${source}]`,
    `choice=${selectedIndex}`,
    `text=${selectedText}`,
    decisionPoints.length ? `points=${decisionPoints.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  const feedback = await optimizationApi.submitFeedback({
    userId,
    tripId,
    type: 'PREFERENCE_UPDATE',
    data: {
      modificationType: 'OTHER',
      modificationReason: reason.slice(0, 2000),
    },
  });

  let captureId: string | undefined;
  try {
    const capture = await optimizationApi.recordOutcomeCapture({
      userId,
      tripId,
      correlationId: correlationId ?? `${tripId}:guardian-choose:${Date.now()}`,
      feedbackType: 'PREFERENCE_UPDATE',
      feedbackData: {
        modificationType: 'OTHER',
        modificationReason: reason.slice(0, 500),
      },
      rlhfJsonEval: {
        contextSnapshot: {
          source,
          selectedIndex,
          selectedText,
          decisionPoints,
        },
        utilityWeights: DEFAULT_WEIGHTS,
      },
    });
    captureId = capture.captureId;
  } catch {
    // outcome capture 为增强链路，feedback 成功即可
  }

  return {
    feedbackId: feedback.feedbackId,
    captureId,
    channel: 'feedback_fallback',
    nextAction: 'CONTINUE_PLANNING',
  };
}
