import type { MbtiType } from '@/types/odyssey-travel-persona';

/** 职场公路片角色协同矩阵 — 队长 MBTI → 理想拼图位加成 */
const LEADER_SYNERGY: Partial<Record<string, Partial<Record<string, number>>>> = {
  INTJ: { ENFP: 15, ESFP: 15, ISTP: 12, ESTP: 12, ISFP: 8 },
  ENTJ: { INFP: 14, ISFP: 12, ISTP: 12, ENFP: 10 },
  INFJ: { ENTP: 14, ESTP: 12, ESFP: 10, ISTP: 8 },
  ENFJ: { INTP: 12, ISTP: 12, ISFP: 10, ISTJ: 8 },
  INTP: { ESFJ: 12, ENFJ: 12, ESTJ: 10, ISFP: 8 },
  ENFP: { INTJ: 14, ISTJ: 12, INFJ: 10, ESTP: 8 },
  ISTJ: { ENFP: 12, ESFP: 10, ENTP: 10, ISFP: 8 },
  ESTJ: { INFP: 12, ISFP: 10, ENTP: 10, ISTP: 8 },
  ISTP: { ENFJ: 12, ESFJ: 10, ENTJ: 10, ENFP: 8 },
  ISFP: { ENTJ: 12, ESTJ: 10, ENTP: 10, ENFJ: 8 },
  ESTP: { INFJ: 12, INTJ: 10, ISFJ: 10, INTP: 8 },
  ESFP: { INTJ: 12, INFJ: 10, ISTJ: 10, INTP: 8 },
  ISFJ: { ENTP: 12, ESTP: 10, ENFP: 10, ENTJ: 8 },
  ESFJ: { INTP: 12, ISTP: 10, INFP: 10, INTJ: 8 },
  INFP: { ESTJ: 12, ENTJ: 10, ISTJ: 10, ESTP: 8 },
  ENTP: { ISFJ: 12, ISTJ: 10, INFJ: 10, ESFJ: 8 },
};

/** 象限互补兜底：NT 队长 + SP 队员 */
const QUADRANT_BONUS: Record<string, Record<string, number>> = {
  NT: { SP: 6, NF: 4 },
  NF: { NT: 4, SJ: 4 },
  SP: { NT: 6, SJ: 4 },
  SJ: { NF: 4, SP: 4 },
};

function mbtiQuadrant(type: string): string {
  const t = type.toUpperCase().slice(0, 4);
  if (t.length < 4) return 'NT';
  const second = t[1];
  const fourth = t[3];
  if (second === 'N' && fourth === 'T') return 'NT';
  if (second === 'N' && fourth === 'F') return 'NF';
  if (second === 'S' && fourth === 'P') return 'SP';
  return 'SJ';
}

export function computeMbtiSynergy(leaderMbti: string, memberMbti: string): number {
  const leader = leaderMbti.toUpperCase().slice(0, 4) as MbtiType;
  const member = memberMbti.toUpperCase().slice(0, 4) as MbtiType;

  const direct = LEADER_SYNERGY[leader]?.[member];
  if (direct != null) return direct;

  const lq = mbtiQuadrant(leader);
  const mq = mbtiQuadrant(member);
  if (lq !== mq) return QUADRANT_BONUS[lq]?.[mq] ?? 3;

  return 0;
}

/** 根据协同矩阵返回队长虚位拼图标签 */
export function idealMemberArchetypes(leaderMbti: string): string[] {
  const leader = leaderMbti.toUpperCase().slice(0, 4);
  const synergy = LEADER_SYNERGY[leader];
  if (!synergy) return [];

  return Object.entries(synergy)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, score]) => {
      if (score >= 14) return `${type} · 角色拼图加成 +${score}`;
      return `${type} · 互补位`;
    });
}
