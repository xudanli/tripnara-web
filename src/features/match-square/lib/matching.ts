/**
 * Match Square 撮合 — 兼容层 + Match Engine v2 入口
 * @see docs/match-engine-architecture.md
 */
import type { MatchDimensionBreakdown, VerifiedCredentials } from '@/types/match-square';
import type { OdysseyCognitiveScores } from '@/types/odyssey-travel-persona';
import { resolveMbtiAxes } from '@/features/odyssey-intake/lib/mbti-resolver';
import { MATCH_DIMENSION_WEIGHTS } from './constants';
import { backgroundBonusToDimensionScore } from './verified-credentials';
import {
  calculateStructuralMatch,
  type MatchEngineProfile,
  type MatchTripWindow,
  type StructuralMatchResult,
} from './match-engine';

export type { MatchEngineProfile, StructuralMatchResult, MatchTripWindow };

type PlanningStyle = 'planner' | 'flexible';
type EnergyStyle = 'extrovert' | 'introvert';
type DecisionStyle = 'fast' | 'slow';
type RiskStyle = 'high' | 'low';
type SpendingStyle = 'generous' | 'frugal';

function classifyPlanning(scores: OdysseyCognitiveScores): PlanningStyle {
  const axes = resolveMbtiAxes(scores);
  return axes.J >= axes.P ? 'planner' : 'flexible';
}

function classifySocial(scores: OdysseyCognitiveScores): EnergyStyle {
  const axes = resolveMbtiAxes(scores);
  return axes.E >= axes.I ? 'extrovert' : 'introvert';
}

function classifyDecision(scores: OdysseyCognitiveScores): DecisionStyle {
  return scores.compromise_index >= 0 ? 'fast' : 'slow';
}

function classifyRisk(scores: OdysseyCognitiveScores): RiskStyle {
  return scores.ambiguity_tolerance >= 0 ? 'high' : 'low';
}

function classifySpending(scores: OdysseyCognitiveScores): SpendingStyle {
  return scores.financial_flexibility >= 0 ? 'generous' : 'frugal';
}

function planningScore(a: PlanningStyle, b: PlanningStyle): number {
  if (a === b) return 17;
  if ((a === 'planner' && b === 'flexible') || (a === 'flexible' && b === 'planner')) return 11;
  return 17;
}

function socialScore(a: EnergyStyle, b: EnergyStyle): number {
  return a === b ? 17 : 15;
}

function decisionScore(a: DecisionStyle, b: DecisionStyle): number {
  if (a === b) return 17;
  return 15;
}

function riskScore(a: RiskStyle, b: RiskStyle): number {
  if (a === b) return 17;
  if (a !== b) return 11;
  return 10;
}

function spendingScore(a: SpendingStyle, b: SpendingStyle): number {
  if (a === b) return 17;
  return 10;
}

export function passesMatchHardGates(
  self: OdysseyCognitiveScores,
  other: OdysseyCognitiveScores
): boolean {
  const selfAxes = resolveMbtiAxes(self);
  const otherAxes = resolveMbtiAxes(other);

  if (self.financial_flexibility <= -2 && other.financial_flexibility >= 2) return false;
  if (self.financial_flexibility >= 2 && other.financial_flexibility <= -2) return false;

  const selfControl = selfAxes.J > 85 && selfAxes.P < 15;
  const otherChaos = otherAxes.P > 85 && otherAxes.J < 15;
  const otherControl = otherAxes.J > 85 && otherAxes.P < 15;
  const selfChaos = selfAxes.P > 85 && selfAxes.J < 15;
  if ((selfControl && otherChaos) || (otherControl && selfChaos)) return false;

  return true;
}

function legacyDimensionBreakdown(
  self: OdysseyCognitiveScores,
  other: OdysseyCognitiveScores,
  _viewerCredentials?: VerifiedCredentials | null,
  _captainCredentials?: VerifiedCredentials | null
): MatchDimensionBreakdown {
  return {
    planning: planningScore(classifyPlanning(self), classifyPlanning(other)),
    socialEnergy: socialScore(classifySocial(self), classifySocial(other)),
    decisionSpeed: decisionScore(classifyDecision(self), classifyDecision(other)),
    riskTolerance: riskScore(classifyRisk(self), classifyRisk(other)),
    spending: spendingScore(classifySpending(self), classifySpending(other)),
    socialBackground: backgroundBonusToDimensionScore(0),
    backgroundBonus: 0,
  };
}

function structuralToBreakdown(
  legacy: MatchDimensionBreakdown,
  structural: StructuralMatchResult
): MatchDimensionBreakdown {
  return {
    ...legacy,
    teamworkFit: structural.teamworkFit,
    stressFit: structural.stressFit,
    mbtiSynergy: structural.mbtiSynergy,
    structuralInsights: structural.insights,
  };
}

export type StructuralMatchOptions = {
  leaderProfile: MatchEngineProfile;
  memberProfile: MatchEngineProfile;
  memberTrip?: MatchTripWindow | null;
  skipTimeGate?: boolean;
};

export function computeStructuralMatch(
  options: StructuralMatchOptions
): StructuralMatchResult {
  return calculateStructuralMatch(options.leaderProfile, options.memberProfile, {
    memberTrip: options.memberTrip,
    skipTimeGate: options.skipTimeGate,
  });
}

export function computeMatchDimensionBreakdown(
  self: OdysseyCognitiveScores,
  other: OdysseyCognitiveScores,
  viewerCredentials?: VerifiedCredentials | null,
  captainCredentials?: VerifiedCredentials | null,
  structural?: StructuralMatchOptions | null
): MatchDimensionBreakdown {
  const legacy = legacyDimensionBreakdown(self, other, viewerCredentials, captainCredentials);
  if (!structural) return legacy;

  const result = computeStructuralMatch(structural);
  return structuralToBreakdown(legacy, result);
}

export function computeCompatibilityScore(
  self: OdysseyCognitiveScores,
  other: OdysseyCognitiveScores,
  viewerCredentials?: VerifiedCredentials | null,
  captainCredentials?: VerifiedCredentials | null,
  structural?: StructuralMatchOptions | null
): number {
  if (structural) {
    const result = computeStructuralMatch(structural);
    if (result.blocked) return 0;
    return result.score;
  }

  if (!passesMatchHardGates(self, other)) return 0;

  const breakdown = legacyDimensionBreakdown(self, other, viewerCredentials, captainCredentials);
  const weighted =
    breakdown.planning * MATCH_DIMENSION_WEIGHTS.planning +
    breakdown.socialEnergy * MATCH_DIMENSION_WEIGHTS.socialEnergy +
    breakdown.decisionSpeed * MATCH_DIMENSION_WEIGHTS.decisionSpeed +
    breakdown.riskTolerance * MATCH_DIMENSION_WEIGHTS.riskTolerance +
    breakdown.spending * MATCH_DIMENSION_WEIGHTS.spending;

  const backgroundBonus = breakdown.backgroundBonus ?? 0;

  return Math.min(100, Math.max(0, Math.round(50 + weighted + backgroundBonus)));
}

export function detectPlanConflict(
  self: OdysseyCognitiveScores,
  other: OdysseyCognitiveScores
): { conflictDetected: boolean; conflictTopic?: string; promptMessage?: string } {
  const selfStyle = classifyPlanning(self);
  const otherStyle = classifyPlanning(other);
  if (selfStyle === 'planner' && otherStyle === 'flexible') {
    return {
      conflictDetected: true,
      conflictTopic: '计划硬度',
      promptMessage:
        '检测到你们对「计划硬度」的认知存在差异，你是否愿意向队长做出不迟到、配合核心行程的承诺声明？',
    };
  }
  if (selfStyle === 'flexible' && otherStyle === 'planner') {
    return {
      conflictDetected: true,
      conflictTopic: '计划硬度',
      promptMessage:
        '该队伍偏向强规划型行程，你是否愿意配合核心时间节点、不因个人节奏影响全队？',
    };
  }
  return { conflictDetected: false };
}

export function buildMatchInsights(
  self: OdysseyCognitiveScores,
  other: OdysseyCognitiveScores,
  viewerCredentials?: VerifiedCredentials | null,
  captainCredentials?: VerifiedCredentials | null,
  structural?: StructuralMatchResult | null
): { highlights: string[]; warnings: string[] } {
  if (structural?.insights?.length) {
    const highlights = structural.insights
      .filter((i) => i.level === 'pass')
      .map((i) => `✓ ${i.label}：${i.detail}`);
    const warnings = structural.insights
      .filter((i) => i.level === 'warn' || i.level === 'fail')
      .map((i) => `${i.level === 'fail' ? '✗' : '⚠️'} ${i.label}：${i.detail}`);

    if (highlights.length === 0) {
      highlights.push('基础结构无硬性熔断，具备同行基础契合度。');
    }
    return { highlights, warnings };
  }

  const breakdown = legacyDimensionBreakdown(self, other, viewerCredentials, captainCredentials);
  const highlights: string[] = [];
  const warnings: string[] = [];

  if (breakdown.planning >= 15) {
    highlights.push('你们对行程弹性与计划性的偏好较为一致，行中节奏冲突风险较低。');
  } else if (breakdown.planning <= 11) {
    warnings.push('一方偏好严格时间表，另一方偏向随性探索，行中可能对「赶路 vs 深度」产生分歧。');
  }

  if (breakdown.spending >= 15) {
    highlights.push('消费观念高度匹配，在拼房与就餐预算上处于同一带宽。');
  } else if (breakdown.spending <= 10) {
    warnings.push('消费带宽存在错位，建议在出发前明确人均预算与分摊方式。');
  }

  if (breakdown.socialEnergy <= 15 && classifySocial(self) !== classifySocial(other)) {
    warnings.push('社交能量差异明显，一方可能需要独处充电，另一方偏好高频互动。');
  }

  if (breakdown.decisionSpeed <= 15) {
    warnings.push('决策速度存在差异，出现迷路或延误时可能需要更多耐心沟通。');
  }

  if (highlights.length === 0) {
    highlights.push('基础人格维度无硬性冲突，具备同行基础契合度。');
  }

  return { highlights, warnings };
}
