import type { ControlStyleBand, MatchEngineProfile } from './types';
import { computeMbtiSynergy } from './mbti-synergy';
import {
  passesTimeLocationGate,
} from './hard-gates';
import type {
  CalculateStructuralMatchOptions,
  StructuralMatchInsight,
  StructuralMatchResult,
} from './types';

function euclidean2(a: [number, number], b: [number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function computeTeamworkFit(leader: MatchEngineProfile, member: MatchEngineProfile): number {
  const lc = leader.stressTraits.controlScore;
  const mc = member.stressTraits.controlScore;
  const leaderFull =
    leader.controlStyle === 'full_managed' || leader.declaredPlanningStyle === 'full_managed';
  const memberDelegate = member.controlStyle === 'casual_delegate' || mc <= 3;
  const memberFull = mc >= 8 || member.controlStyle === 'full_managed';
  const leaderCo =
    leader.controlStyle === 'co_planning' || leader.declaredPlanningStyle === 'co_planning';
  const memberCo = member.controlStyle === 'co_planning';

  if (leaderFull && memberDelegate) return 25;
  if (leaderFull && memberFull) return -20;
  if (leaderCo && memberCo) return 20;
  if (lc >= 8 && mc <= 3) return 25;
  if (lc >= 8 && mc >= 8) return -20;
  if (lc >= 4 && lc <= 7 && mc >= 4 && mc <= 7) return 20;
  return 5;
}

function computeStressPenalty(leader: MatchEngineProfile, member: MatchEngineProfile): number {
  const leaderVec: [number, number] = [
    leader.stressTraits.qualityBaseline,
    leader.stressTraits.financialElasticity,
  ];
  const memberVec: [number, number] = [
    member.stressTraits.qualityBaseline,
    member.stressTraits.financialElasticity,
  ];
  const dist = euclidean2(leaderVec, memberVec);
  return Math.max(-15, Math.round(-1.5 * dist));
}

function teamworkInsightLabel(leader: MatchEngineProfile, member: MatchEngineProfile): string {
  const fit = computeTeamworkFit(leader, member);
  if (fit >= 20) {
    if (leader.controlStyle === 'full_managed' || leader.stressTraits.controlScore >= 8) {
      return '高效飞轮 (全托管队长 ＋ 甩手掌柜队员)';
    }
    return '民主合伙人 (一起策划 × 协同队员)';
  }
  if (fit <= -10) return '权力冲突 (双强主导，一山不容二虎)';
  return '契约可磨合 (分工边界需行前对齐)';
}

function socialBandwidthInsight(
  _leader: MatchEngineProfile,
  _member: MatchEngineProfile,
  gap: number
): StructuralMatchInsight {
  if (gap === 0) {
    return {
      level: 'pass',
      label: '圈层沟通带宽',
      detail: '完美同频 (学历/职级/行业背书处于同一带宽)',
    };
  }
  if (gap <= 1) {
    return {
      level: 'pass',
      label: '圈层沟通带宽',
      detail: '高度同频 (背书档位接近，行中沟通成本预期低)',
    };
  }
  if (gap <= 2) {
    return {
      level: 'warn',
      label: '圈层沟通带宽',
      detail: '中度错位 — 建议出发前对齐消费与决策习惯',
    };
  }
  return {
    level: 'fail',
    label: '圈层沟通带宽',
    detail: '严重错位 — 跨 3 个背书层级，系统隐性过滤',
  };
}

function stressInsight(leader: MatchEngineProfile, member: MatchEngineProfile): StructuralMatchInsight {
  const penalty = computeStressPenalty(leader, member);
  const aGap = Math.abs(leader.stressTraits.qualityBaseline - member.stressTraits.qualityBaseline);
  const fGap = Math.abs(
    leader.stressTraits.financialElasticity - member.stressTraits.financialElasticity
  );

  if (penalty >= -5) {
    return {
      level: 'pass',
      label: '行中审美与消费底线',
      detail: '品质底线与财务弹性基本对齐',
    };
  }
  if (aGap >= 6) {
    return {
      level: 'warn',
      label: '行中审美分歧',
      detail:
        leader.stressTraits.qualityBaseline >= 8
          ? '中度风险 (队长品质底线极高，队员偏随遇而安)'
          : '中度风险 (住宿/体验标准预期存在落差)',
    };
  }
  if (fGap >= 6) {
    return {
      level: 'warn',
      label: '财务弹性分歧',
      detail: '中度风险 (悦己独立 vs 团队妥协倾向差异明显)',
    };
  }
  return {
    level: 'warn',
    label: '行中抗压对齐',
    detail: '存在可预见的行中摩擦点，建议行前书面确认分摊规则',
  };
}

function mbtiInsight(leader: MatchEngineProfile, member: MatchEngineProfile, synergy: number): StructuralMatchInsight {
  if (synergy >= 12) {
    return {
      level: 'pass',
      label: 'MBTI 角色拼图',
      detail: `${leader.mbtiType} × ${member.mbtiType} — 职场公路片互补位 (+${synergy})`,
    };
  }
  if (synergy >= 6) {
    return {
      level: 'pass',
      label: 'MBTI 角色拼图',
      detail: `象限互补 — ${member.mbtiType} 可补位队长盲区`,
    };
  }
  return {
    level: 'warn',
    label: 'MBTI 角色拼图',
    detail: '无显著互补加成 — 依赖契约分工而非性格拼图',
  };
}

/**
 * Decision OS Match Engine · 双层撮合
 * Layer 1: Hard Gates (时空 + 圈层带宽)
 * Layer 2: Teamwork + Stress + MBTI Synergy → 团队结构稳定性得分 [50, 100]
 */
export function calculateStructuralMatch(
  leader: MatchEngineProfile,
  member: MatchEngineProfile,
  options: CalculateStructuralMatchOptions = {}
): StructuralMatchResult {
  const minOverlap = options.minOverlapDays ?? 3;

  const memberTrip = options.memberTrip ?? member.trip;
  const timeGate = options.skipTimeGate
    ? { pass: true as const, overlapDays: null as number | null }
    : passesTimeLocationGate(leader.trip, memberTrip, minOverlap);

  const socialGate = { pass: true as const, gap: 0 };

  if (!timeGate.pass) {
    return {
      score: 0,
      blocked: true,
      blockReason: timeGate.reason,
      timeOverlapDays: timeGate.overlapDays,
      socialBandwidthGap: socialGate.gap,
      teamworkFit: 0,
      stressFit: 0,
      mbtiSynergy: 0,
      insights: [
        {
          level: 'fail',
          label: '时空错位熔断',
          detail: timeGate.reason ?? '出行窗口不重叠',
        },
      ],
    };
  }

  const teamworkFit = computeTeamworkFit(leader, member);
  const stressPenalty = computeStressPenalty(leader, member);
  const stressFit = Math.max(0, 25 + stressPenalty);
  const mbtiSynergy = computeMbtiSynergy(String(leader.mbtiType), String(member.mbtiType));

  const raw = 50 + teamworkFit + stressPenalty + mbtiSynergy;
  const score = Math.min(100, Math.max(50, Math.round(raw)));

  const insights: StructuralMatchInsight[] = [
    socialBandwidthInsight(leader, member, socialGate.gap),
    {
      level: teamworkFit >= 15 ? 'pass' : teamworkFit < 0 ? 'fail' : 'warn',
      label: '团队契约分工',
      detail: teamworkInsightLabel(leader, member),
    },
    stressInsight(leader, member),
    mbtiInsight(leader, member, mbtiSynergy),
  ];

  return {
    score,
    blocked: false,
    timeOverlapDays: timeGate.overlapDays,
    socialBandwidthGap: socialGate.gap,
    teamworkFit,
    stressFit,
    mbtiSynergy,
    insights,
  };
}

export function controlStyleLabel(band: ControlStyleBand): string {
  switch (band) {
    case 'full_managed':
      return '全托管';
    case 'co_planning':
      return '一起策划';
    case 'casual_delegate':
      return '乐意躺平/执行';
  }
}
