import type { PlanningStyle } from '@/types/match-square';
import type { OdysseyCognitiveScores, PremiumStressAnswerChoice } from '@/types/odyssey-travel-persona';
import {
  readStoredPremiumIntake,
  stressAnswerAtSlot,
} from '@/features/odyssey-intake/lib/premium-stress-storage';
import type { ControlStyleBand } from './types';

export type StressTraitTriple = {
  controlScore: number;
  qualityBaseline: number;
  financialElasticity: number;
};

/** 从 localStorage 读取 Premium v2 入网抗压题 */
export function loadStoredPremiumStressAnswers(): Record<string, PremiumStressAnswerChoice> | null {
  const stored = readStoredPremiumIntake();
  return stored?.stressAnswers ?? null;
}

function traitsFromStressAnswers(
  answers: Record<string, PremiumStressAnswerChoice>,
  questionIds?: string[]
): StressTraitTriple {
  const stored = { stressAnswers: answers, questionIds: questionIds ?? Object.keys(answers) };
  const resource = stressAnswerAtSlot(stored, 0);
  const team = stressAnswerAtSlot(stored, 1);
  const spend = stressAnswerAtSlot(stored, 2);

  const qualityBaseline = resource === 'A' ? 10 : resource === 'B' ? 1 : 5;
  const controlScore = team === 'A' ? 10 : team === 'B' ? 5 : 5;
  const financialElasticity = spend === 'A' ? 10 : spend === 'B' ? 1 : 5;

  return { controlScore, qualityBaseline, financialElasticity };
}

function traitsFromCognitiveScores(scores: OdysseyCognitiveScores): StressTraitTriple {
  const controlRaw = scores.planning_index + scores.mbti_j_score - scores.compromise_index;
  const controlScore = Math.min(10, Math.max(1, Math.round(5 + controlRaw)));

  const qualityRaw = scores.planning_index + scores.financial_flexibility - scores.ambiguity_tolerance;
  const qualityBaseline = Math.min(10, Math.max(1, Math.round(5 + qualityRaw * 0.8)));

  const financialElasticity = Math.min(
    10,
    Math.max(1, Math.round(5 + scores.financial_flexibility * 1.2 - scores.compromise_index * 0.5))
  );

  return { controlScore, qualityBaseline, financialElasticity };
}

export function resolveStressTraits(input: {
  stressAnswers?: Record<string, PremiumStressAnswerChoice> | null;
  cognitiveScores?: OdysseyCognitiveScores | null;
  declaredPlanningStyle?: PlanningStyle | null;
}): StressTraitTriple {
  if (input.stressAnswers && Object.keys(input.stressAnswers).length > 0) {
    const stored = readStoredPremiumIntake();
    const fromAnswers = traitsFromStressAnswers(
      input.stressAnswers,
      stored?.questionIds
    );
    if (input.declaredPlanningStyle === 'full_managed') {
      fromAnswers.controlScore = Math.max(fromAnswers.controlScore, 10);
    } else if (input.declaredPlanningStyle === 'co_planning') {
      fromAnswers.controlScore = Math.max(fromAnswers.controlScore, 5);
    } else if (input.declaredPlanningStyle === 'casual_play') {
      fromAnswers.controlScore = Math.min(fromAnswers.controlScore, 3);
    }
    return fromAnswers;
  }

  if (input.cognitiveScores) {
    const fromScores = traitsFromCognitiveScores(input.cognitiveScores);
    if (input.declaredPlanningStyle === 'full_managed') fromScores.controlScore = 10;
    if (input.declaredPlanningStyle === 'co_planning') fromScores.controlScore = 5;
    if (input.declaredPlanningStyle === 'casual_play') fromScores.controlScore = 1;
    return fromScores;
  }

  if (input.declaredPlanningStyle === 'full_managed') {
    return { controlScore: 10, qualityBaseline: 7, financialElasticity: 6 };
  }
  if (input.declaredPlanningStyle === 'casual_play') {
    return { controlScore: 1, qualityBaseline: 5, financialElasticity: 5 };
  }
  return { controlScore: 5, qualityBaseline: 5, financialElasticity: 5 };
}

export function resolveControlStyleBand(
  controlScore: number,
  declaredPlanningStyle?: PlanningStyle | null
): ControlStyleBand {
  if (declaredPlanningStyle === 'full_managed' || controlScore >= 8) return 'full_managed';
  if (declaredPlanningStyle === 'casual_play' || controlScore <= 3) return 'casual_delegate';
  return 'co_planning';
}

export function buildStressTraitsFromAnswers(
  answers: Record<string, PremiumStressAnswerChoice>
): StressTraitTriple {
  if (Object.keys(answers).length === 0) {
    return { controlScore: 5, qualityBaseline: 5, financialElasticity: 5 };
  }
  return traitsFromStressAnswers(answers, readStoredPremiumIntake()?.questionIds);
}
