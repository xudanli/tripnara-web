import { EMPTY_COGNITIVE_SCORES, ODYSSEY_QUESTIONS } from '../constants/questions';
import type {
  OdysseyAnswerChoice,
  OdysseyCognitiveScores,
  OdysseyQuestionId,
  TravelPersonaRadarDimensions,
} from '@/types/odyssey-travel-persona';

/** 将原始累积分映射到 0–100 雷达维度 */
function clampScore(raw: number, min = -8, max = 8): number {
  const normalized = ((raw - min) / (max - min)) * 100;
  return Math.round(Math.max(0, Math.min(100, normalized)));
}

export function computeCognitiveScores(
  answers: Partial<Record<OdysseyQuestionId, OdysseyAnswerChoice>>
): OdysseyCognitiveScores {
  const scores: OdysseyCognitiveScores = { ...EMPTY_COGNITIVE_SCORES };

  for (const question of ODYSSEY_QUESTIONS) {
    const choice = answers[question.id];
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

export function cognitiveScoresToRadar(
  scores: OdysseyCognitiveScores
): TravelPersonaRadarDimensions {
  return {
    financialFlexibility: clampScore(scores.financial_flexibility),
    planningRigidity: clampScore(scores.planning_index + scores.mbti_j_score - scores.mbti_p_score),
    ambiguityTolerance: clampScore(scores.ambiguity_tolerance),
    energyCapacity: clampScore(scores.energy_capacity + scores.travel_pace_specialist),
    socialDrive: clampScore(scores.social_drive + scores.mbti_e_score - scores.mbti_i_score),
    meaningOrientation: clampScore(scores.aesthetic_meaning - scores.aesthetic_sensory),
  };
}

export function isIntakeComplete(
  answers: Partial<Record<OdysseyQuestionId, OdysseyAnswerChoice>>
): boolean {
  return ODYSSEY_QUESTIONS.every((q) => answers[q.id] != null);
}
