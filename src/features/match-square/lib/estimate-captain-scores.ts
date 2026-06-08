import { EMPTY_COGNITIVE_SCORES } from '@/features/odyssey-intake/constants/questions';
import type { OdysseyCognitiveScores } from '@/types/odyssey-travel-persona';

/** 由 MBTI 粗估认知向量（列表页客户端 enrich 用；有真实向量时以后端为准） */
export function estimateScoresFromMbti(mbtiType: string): OdysseyCognitiveScores {
  const t = mbtiType.toUpperCase().slice(0, 4);
  const scores: OdysseyCognitiveScores = { ...EMPTY_COGNITIVE_SCORES };

  if (t.includes('E')) {
    scores.mbti_e_score = 4;
    scores.mbti_i_score = -2;
    scores.social_drive = 2;
  } else {
    scores.mbti_i_score = 4;
    scores.mbti_e_score = -2;
    scores.social_drive = -1;
  }

  if (t.includes('J')) {
    scores.mbti_j_score = 5;
    scores.mbti_p_score = -3;
    scores.planning_index = 3;
  } else {
    scores.mbti_p_score = 5;
    scores.mbti_j_score = -3;
    scores.planning_index = -2;
  }

  if (t.includes('T')) {
    scores.mbti_t_score = 3;
    scores.mbti_f_score = -1;
  } else {
    scores.mbti_f_score = 3;
    scores.mbti_t_score = -1;
  }

  if (t.includes('S')) {
    scores.mbti_s_score = 3;
    scores.mbti_n_score = -1;
  } else {
    scores.mbti_n_score = 3;
    scores.mbti_s_score = -1;
  }

  if (t.startsWith('ENT') || t.startsWith('EST')) {
    scores.energy_capacity = 2;
    scores.financial_flexibility = 1;
  }
  if (t.startsWith('INT') || t.startsWith('INF')) {
    scores.ambiguity_tolerance = -1;
    scores.financial_flexibility = 0;
  }

  return scores;
}
