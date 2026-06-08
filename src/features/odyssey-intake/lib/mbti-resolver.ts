import type {
  MbtiAxisPercentages,
  MbtiQuadrant,
  MbtiType,
  OdysseyCognitiveScores,
} from '@/types/odyssey-travel-persona';

function axisPercent(positive: number, negative: number): { primary: number; secondary: number } {
  const total = Math.max(positive + negative, 1);
  const primaryPct = Math.round((positive / total) * 100);
  return { primary: primaryPct, secondary: 100 - primaryPct };
}

export function resolveMbtiAxes(scores: OdysseyCognitiveScores): MbtiAxisPercentages {
  const e = axisPercent(scores.mbti_e_score, scores.mbti_i_score);
  const s = axisPercent(scores.mbti_s_score, scores.mbti_n_score);
  const t = axisPercent(scores.mbti_t_score, scores.mbti_f_score);
  const j = axisPercent(scores.mbti_j_score, scores.mbti_p_score);

  return {
    E: e.primary,
    I: e.secondary,
    S: s.primary,
    N: s.secondary,
    T: t.primary,
    F: t.secondary,
    J: j.primary,
    P: j.secondary,
  };
}

export function resolveMbtiType(scores: OdysseyCognitiveScores): MbtiType {
  const axes = resolveMbtiAxes(scores);
  const letters = [
    axes.E >= axes.I ? 'E' : 'I',
    axes.S >= axes.N ? 'S' : 'N',
    axes.T >= axes.F ? 'T' : 'F',
    axes.J >= axes.P ? 'J' : 'P',
  ].join('');
  return letters as MbtiType;
}

export function resolveQuadrant(mbtiType: MbtiType): MbtiQuadrant {
  const second = mbtiType[1];
  const fourth = mbtiType[3];
  if (second === 'N' && fourth === 'T') return 'NT';
  if (second === 'N' && fourth === 'F') return 'NF';
  if (second === 'S' && fourth === 'P') return 'SP';
  return 'SJ';
}
