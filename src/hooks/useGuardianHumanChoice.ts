import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { submitGuardianHumanChoice } from '@/lib/guardian-choose-submit';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
import type {
  GuardianChooseNextAction,
  GuardianHumanChoiceSource,
  SubmitGuardianHumanChoiceInput,
  SubmitGuardianHumanChoiceResult,
} from '@/types/guardian-choose';
import { GuardianChooseBlockedError } from '@/types/guardian-choose';

export interface UseGuardianHumanChoiceOptions {
  userId?: string | null;
  tripId?: string | null;
  source: GuardianHumanChoiceSource;
  /** 默认决策点列表（negotiation humanDecisionPoints 等） */
  decisionPoints?: string[];
  sessionId?: string | null;
  correlationId?: string | null;
  onSuccess?: (selectedIndex: number, selectedText: string) => void;
  /** CHOOSE 响应中的新 presentation（优先于旧选项列表） */
  onPresentation?: (presentation: GuardianPersonaPresentation) => void;
  /** guardian/choose 完整结果 */
  onChooseResult?: (result: SubmitGuardianHumanChoiceResult) => void;
  /** guardian/choose 返回的 nextAction（需自行 refresh / 重调 negotiation） */
  onNextAction?: (action: GuardianChooseNextAction) => void;
}

export function useGuardianHumanChoice({
  userId,
  tripId,
  source,
  decisionPoints = [],
  sessionId,
  correlationId,
  onSuccess,
  onPresentation,
  onChooseResult,
  onNextAction,
}: UseGuardianHumanChoiceOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitChoice = useCallback(
    async (
      selectedIndex: number,
      selectedText: string,
      pointsOverride?: string[],
    ) => {
      if (!userId || !tripId) {
        toast.error('请先登录并绑定行程后再提交选择');
        onSuccess?.(selectedIndex, selectedText);
        return;
      }

      const points = pointsOverride ?? decisionPoints;
      setIsSubmitting(true);
      try {
        const result = await submitGuardianHumanChoice({
          userId,
          tripId,
          source,
          selectedIndex,
          selectedText,
          decisionPoints: points,
          sessionId: sessionId ?? undefined,
          correlationId: correlationId ?? undefined,
        } satisfies SubmitGuardianHumanChoiceInput);

        onChooseResult?.(result);

        if (result.nextAction === 'BLOCKED') {
          toast.error('存在不可忽略的安全/合规风险，请先修改方案');
          return;
        }

        if (result.presentation) {
          onPresentation?.(result.presentation);
        }

        toast.success(
          result.channel === 'guardian_choose'
            ? '已提交价值取舍'
            : '已记录您的价值取舍',
        );
        onSuccess?.(selectedIndex, selectedText);
        if (result.nextAction) {
          onNextAction?.(result.nextAction);
        }
      } catch (err) {
        if (err instanceof GuardianChooseBlockedError) {
          toast.error(err.message);
          return;
        }
        console.error('[useGuardianHumanChoice]', err);
        toast.error('提交选择失败，请稍后重试');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      userId,
      tripId,
      source,
      decisionPoints,
      sessionId,
      correlationId,
      onSuccess,
      onPresentation,
      onChooseResult,
      onNextAction,
    ],
  );

  return { submitChoice, isSubmitting, canSubmit: Boolean(userId && tripId) };
}
