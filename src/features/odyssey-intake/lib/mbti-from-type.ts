import type {
  MbtiAxisPercentages,
  MbtiType,
  OdysseyCognitiveScores,
} from '@/types/odyssey-travel-persona';
import { EMPTY_COGNITIVE_SCORES } from '../constants/questions';

/** 用户自选 MBTI → 四轴原始分值偏置（不再从情景题推导） */
export function applySelfSelectedMbti(
  scores: OdysseyCognitiveScores,
  mbtiType: MbtiType
): OdysseyCognitiveScores {
  const next = { ...scores };
  const t = mbtiType.toUpperCase();

  if (t[0] === 'E') {
    next.mbti_e_score += 6;
    next.mbti_i_score -= 4;
    next.social_drive += 2;
  } else {
    next.mbti_i_score += 6;
    next.mbti_e_score -= 4;
  }

  if (t[1] === 'S') {
    next.mbti_s_score += 6;
    next.mbti_n_score -= 4;
  } else {
    next.mbti_n_score += 6;
    next.mbti_s_score -= 4;
  }

  if (t[2] === 'T') {
    next.mbti_t_score += 6;
    next.mbti_f_score -= 4;
  } else {
    next.mbti_f_score += 6;
    next.mbti_t_score -= 4;
  }

  if (t[3] === 'J') {
    next.mbti_j_score += 6;
    next.mbti_p_score -= 4;
    next.planning_index += 2;
  } else {
    next.mbti_p_score += 6;
    next.mbti_j_score -= 4;
    next.planning_index -= 1;
  }

  return next;
}

/** 仅由四字母类型生成轴百分比（自选路径） */
export function mbtiTypeToAxisPercentages(mbtiType: MbtiType): MbtiAxisPercentages {
  const scores = applySelfSelectedMbti({ ...EMPTY_COGNITIVE_SCORES }, mbtiType);
  const axis = (positive: number, negative: number, primaryLetter: keyof MbtiAxisPercentages, secondaryLetter: keyof MbtiAxisPercentages) => {
    const total = Math.max(positive + negative, 1);
    const primaryPct = Math.round((positive / total) * 100);
    return { [primaryLetter]: primaryPct, [secondaryLetter]: 100 - primaryPct };
  };

  return {
    ...axis(scores.mbti_e_score, scores.mbti_i_score, 'E', 'I'),
    ...axis(scores.mbti_s_score, scores.mbti_n_score, 'S', 'N'),
    ...axis(scores.mbti_t_score, scores.mbti_f_score, 'T', 'F'),
    ...axis(scores.mbti_j_score, scores.mbti_p_score, 'J', 'P'),
  } as MbtiAxisPercentages;
}
