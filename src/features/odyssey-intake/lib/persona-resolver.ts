import { PERSONA_MAPPING_TABLE, type PersonaCondition } from '../constants/persona-mapping';
import { cognitiveScoresToRadar } from './scoring';
import { computePremiumCognitiveScores } from './premium-stress-scoring';
import { mbtiTypeToAxisPercentages } from './mbti-from-type';
import { resolveQuadrant } from './mbti-resolver';
import type { MbtiType, OdysseyAnswerChoice, OdysseyCognitiveScores, OdysseyQuestionId, PremiumStressAnswerChoice, ResolvedTravelPersona } from '@/types/odyssey-travel-persona';
import { computeCognitiveScores } from './scoring';
import { resolveMbtiAxes, resolveMbtiType } from './mbti-resolver';

function matchesCondition(
  condition: PersonaCondition,
  scores: OdysseyCognitiveScores,
  axes: ReturnType<typeof resolveMbtiAxes>
): boolean {
  switch (condition.kind) {
    case 'j_high':
      return axes.J >= condition.threshold;
    case 'p_high':
      return axes.P >= condition.threshold;
    case 'experience_first':
      return scores.financial_flexibility >= 2;
    case 'adventure':
      return scores.ambiguity_tolerance >= 2;
    case 'aesthetic_sensory':
      return scores.aesthetic_sensory >= 2;
    case 'energy_high':
      return scores.energy_capacity >= 2 && scores.travel_pace_specialist >= 2;
    case 'financial_flex_high':
      return scores.financial_flexibility >= 2;
    case 'social_high':
      return scores.social_drive >= 2;
    case 'control_high':
      return scores.planning_index >= 2 && scores.mbti_j_score >= 2;
    case 'collaborative_high':
      return scores.compromise_index >= 2 && scores.social_drive >= 1;
    case 'default':
      return true;
  }
}

function resolvePersonaFromScores(
  mbtiType: MbtiType,
  cognitiveScores: OdysseyCognitiveScores,
  axisPercentages?: ReturnType<typeof resolveMbtiAxes>
): ResolvedTravelPersona {
  const axisPercentagesResolved = axisPercentages ?? mbtiTypeToAxisPercentages(mbtiType);
  const quadrant = resolveQuadrant(mbtiType);

  const candidates = PERSONA_MAPPING_TABLE.filter((e) => e.mbtiType === mbtiType);
  const matched =
    candidates.find((e) => matchesCondition(e.condition, cognitiveScores, axisPercentagesResolved)) ??
    candidates[0];

  const fallback = {
    title: `${mbtiType} 旅行者`,
    description: '你的旅行人格独一无二，等待更多旅程来书写专属故事。',
  };

  return {
    mbtiType,
    quadrant,
    title: matched?.title ?? fallback.title,
    description: matched?.description ?? fallback.description,
    radar: cognitiveScoresToRadar(cognitiveScores),
    axisPercentages: axisPercentagesResolved,
  };
}

/** 旧版：从 5 道情景题推导 MBTI + 人格 */
export function resolveTravelPersona(
  answers: Partial<Record<OdysseyQuestionId, OdysseyAnswerChoice>>
): ResolvedTravelPersona {
  const cognitiveScores = computeCognitiveScores(answers);
  const axisPercentages = resolveMbtiAxes(cognitiveScores);
  const mbtiType = resolveMbtiType(cognitiveScores);
  return resolvePersonaFromScores(mbtiType, cognitiveScores, axisPercentages);
}

/** Premium v2：自选 MBTI + 行中博弈抗压题 */
export function resolveTravelPersonaPremium(
  mbtiType: MbtiType,
  stressAnswers: Record<string, PremiumStressAnswerChoice>,
  questions?: import('../constants/premium-stress-test').PremiumStressQuestion[]
): ResolvedTravelPersona {
  const cognitiveScores = computePremiumCognitiveScores(mbtiType, stressAnswers, questions);
  return resolvePersonaFromScores(mbtiType, cognitiveScores);
}
