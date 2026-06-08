import { buildIdentityCardFromPersona } from './build-identity-card';
import { resolveTravelPersonaPremium } from './persona-resolver';
import { rebuildQuestionsForScoring } from './normalize-premium-stress-questions';
import {
  readStoredPremiumIntake,
  writeStoredPremiumIntake,
} from './premium-stress-storage';
import type {
  OdysseyIdentityCard,
  OdysseyProfileCardView,
  OdysseyProfileSummary,
  OdysseySubmitRequest,
  OdysseySubmitResult,
} from '@/types/odyssey-intake';
import type { MbtiType, PremiumStressAnswerChoice } from '@/types/odyssey-travel-persona';

export function parsePremiumSubmitPayload(payload: OdysseySubmitRequest): {
  mbtiType: MbtiType;
  stressAnswers: Record<string, PremiumStressAnswerChoice>;
  questionIds: string[];
} | null {
  if (payload.intakeVersion !== 'premium_v2' || !payload.mbtiType) return null;

  const stressAnswers: Record<string, PremiumStressAnswerChoice> = {};
  const questionIds: string[] = [];

  for (const answer of payload.answers) {
    questionIds.push(answer.scenarioId);
    if (answer.optionId === 'A' || answer.optionId === 'B') {
      stressAnswers[answer.scenarioId] = answer.optionId;
    }
  }

  return {
    mbtiType: payload.mbtiType.toUpperCase() as MbtiType,
    stressAnswers,
    questionIds,
  };
}

export function buildPremiumCardFromSubmit(
  payload: OdysseySubmitRequest
): OdysseyIdentityCard | null {
  const parsed = parsePremiumSubmitPayload(payload);
  if (!parsed) return null;

  const questions = rebuildQuestionsForScoring(parsed.questionIds);
  const persona = resolveTravelPersonaPremium(
    parsed.mbtiType,
    parsed.stressAnswers,
    questions
  );
  return buildIdentityCardFromPersona(persona);
}

/** Premium v2：名片 MBTI 以用户自选为准，不被后端/旧缓存推断类型覆盖 */
export function reconcilePremiumSubmitResult(
  payload: OdysseySubmitRequest,
  result: OdysseySubmitResult
): OdysseySubmitResult {
  const parsed = parsePremiumSubmitPayload(payload);
  const card = buildPremiumCardFromSubmit(payload);
  if (!parsed || !card) return result;

  writeStoredPremiumIntake({
    mbtiType: parsed.mbtiType,
    stressAnswers: parsed.stressAnswers,
    questionIds: parsed.questionIds,
  });

  const selected = parsed.mbtiType.toUpperCase();
  if (
    result.mbtiType?.toUpperCase() === selected &&
    result.card.mbtiType?.toUpperCase() === selected
  ) {
    return result;
  }

  return {
    ...result,
    mbtiType: selected,
    card,
  };
}

function buildCardFromStoredIntake(): OdysseyIdentityCard | null {
  const stored = readStoredPremiumIntake();
  if (!stored) return null;

  const questions = rebuildQuestionsForScoring(stored.questionIds);
  const persona = resolveTravelPersonaPremium(
    stored.mbtiType,
    stored.stressAnswers,
    questions
  );
  return buildIdentityCardFromPersona(persona);
}

function reconcileProfileSummary(
  profile: OdysseyProfileSummary | null | undefined
): OdysseyProfileSummary | null {
  if (!profile?.card) return profile ?? null;

  const stored = readStoredPremiumIntake();
  if (!stored) return profile;

  const selected = stored.mbtiType.toUpperCase();
  const cardType = profile.card.mbtiType?.toUpperCase();
  const profileType = profile.mbtiType?.toUpperCase();

  if (cardType === selected && profileType === selected) return profile;

  const card = buildCardFromStoredIntake() ?? {
    ...profile.card,
    mbtiType: selected,
  };

  return {
    ...profile,
    mbtiType: selected,
    card,
  };
}

/** GET profile/card：与本地 premium 提交快照对齐 */
export function reconcilePremiumProfileCardView(
  view: OdysseyProfileCardView
): OdysseyProfileCardView {
  const profile = reconcileProfileSummary(view.profile);
  if (profile === view.profile) return view;
  return {
    ...view,
    profile,
    completed: Boolean(profile?.card),
  };
}
