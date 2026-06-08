import { EMPTY_COGNITIVE_SCORES } from '../constants/questions';
import { PREMIUM_STRESS_QUESTIONS, type PremiumStressQuestion } from '../constants/premium-stress-test';
import { rebuildQuestionsForScoring } from './normalize-premium-stress-questions';
import { readStoredPremiumIntake } from './premium-stress-storage';
import type {
  MbtiType,
  OdysseyCognitiveScores,
  PremiumStressAnswerChoice,
} from '@/types/odyssey-travel-persona';
import { applySelfSelectedMbti } from './mbti-from-type';

function resolveQuestionsForAnswers(
  stressAnswers: Record<string, PremiumStressAnswerChoice>,
  questions?: PremiumStressQuestion[]
): PremiumStressQuestion[] {
  if (questions?.length) return questions;

  const stored = readStoredPremiumIntake();
  if (stored?.questionIds?.length) {
    return rebuildQuestionsForScoring(stored.questionIds);
  }

  return PREMIUM_STRESS_QUESTIONS;
}

export function computeStressCognitiveScores(
  stressAnswers: Record<string, PremiumStressAnswerChoice>,
  questions?: PremiumStressQuestion[]
): OdysseyCognitiveScores {
  const scores: OdysseyCognitiveScores = { ...EMPTY_COGNITIVE_SCORES };
  const qs = resolveQuestionsForAnswers(stressAnswers, questions);

  for (const question of qs) {
    const choice = stressAnswers[question.id];
    if (!choice) continue;
    const option = question.options.find((o) => o.id === choice);
    if (!option) continue;
    for (const [key, delta] of Object.entries(option.deltas)) {
      const k = key as keyof OdysseyCognitiveScores;
      scores[k] += delta ?? 0;
    }
  }

  return scores;
}

/** Premium v2：自选 MBTI + 抗压题 → 完整认知向量 */
export function computePremiumCognitiveScores(
  mbtiType: MbtiType,
  stressAnswers: Record<string, PremiumStressAnswerChoice>,
  questions?: PremiumStressQuestion[]
): OdysseyCognitiveScores {
  const stressOnly = computeStressCognitiveScores(stressAnswers, questions);
  return applySelfSelectedMbti(stressOnly, mbtiType);
}

export function isPremiumStressComplete(
  stressAnswers: Record<string, PremiumStressAnswerChoice>,
  questions: PremiumStressQuestion[] = PREMIUM_STRESS_QUESTIONS
): boolean {
  return questions.every((q) => stressAnswers[q.id] != null);
}
