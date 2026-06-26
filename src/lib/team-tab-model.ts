import type {
  DecisionWeightMode,
  ObjectiveFunctionWeights,
  TeamMember,
  TeamNegotiationResponse,
} from '@/types/optimization-v2';
import { DIMENSION_LABELS } from '@/types/optimization-v2';

/** 用户可见的三种治理模式 */
export type TeamGovernanceMode = 'leader' | 'weighted' | 'consensus';

export const GOVERNANCE_MODE_META: Record<
  TeamGovernanceMode,
  { label: string; icon: string; description: string }
> = {
  leader: {
    label: '领队模式',
    icon: '👑',
    description: '由领队做最终决策',
  },
  weighted: {
    label: '权重模式',
    icon: '⚖️',
    description: '按成员贡献加权投票',
  },
  consensus: {
    label: '一致模式',
    icon: '🤝',
    description: '重要事项需全员一致',
  },
};

export function backendToGovernance(mode: DecisionWeightMode): TeamGovernanceMode {
  if (mode === 'LEADER_DOMINANT') return 'leader';
  if (mode === 'EQUAL') return 'consensus';
  return 'weighted';
}

export function governanceToBackend(mode: TeamGovernanceMode): DecisionWeightMode {
  switch (mode) {
    case 'leader':
      return 'LEADER_DOMINANT';
    case 'consensus':
      return 'EQUAL';
    case 'weighted':
    default:
      return 'EXPERIENCE_WEIGHTED';
  }
}

export interface PreferenceSummaryItem {
  label: string;
  level: string;
}

const PREFERENCE_GROUPS: Array<{ label: string; keys: (keyof ObjectiveFunctionWeights)[] }> = [
  { label: '节奏偏好', keys: ['pacingVariance', 'timeSlack'] },
  { label: '预算敏感度', keys: ['budgetOverrun'] },
  { label: '体验优先级', keys: ['experienceDensity', 'philosophyAlignment'] },
  { label: '安全优先度', keys: ['safety', 'fatigueRisk', 'weatherRisk'] },
];

function weightToLevel(value: number): string {
  if (value >= 0.22) return '极高';
  if (value >= 0.15) return '高';
  if (value >= 0.08) return '中';
  return '低';
}

export function buildPreferenceSummary(weights: ObjectiveFunctionWeights): PreferenceSummaryItem[] {
  return PREFERENCE_GROUPS.map(({ label, keys }) => {
    const avg = keys.reduce((sum, key) => sum + (weights[key] ?? 0), 0) / keys.length;
    return { label, level: weightToLevel(avg) };
  });
}

export function aggregateTeamWeights(members: TeamMember[]): ObjectiveFunctionWeights {
  if (members.length === 0) {
    return {
      safety: 0.25,
      experienceDensity: 0.2,
      philosophyAlignment: 0.15,
      timeSlack: 0.1,
      fatigueRisk: 0.1,
      weatherRisk: 0.1,
      budgetOverrun: 0.05,
      pacingVariance: 0.05,
    };
  }
  const keys = Object.keys(DIMENSION_LABELS) as (keyof ObjectiveFunctionWeights)[];
  const result = {} as ObjectiveFunctionWeights;
  for (const key of keys) {
    result[key] =
      members.reduce((sum, m) => sum + (m.personalWeights?.[key] ?? 0), 0) / members.length;
  }
  return result;
}

export interface TeamConflictItem {
  id: string;
  topic: string;
  description: string;
}

const FITNESS_RANK: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

const EXPERIENCE_RANK: Record<string, number> = {
  NOVICE: 1,
  SOME_EXPERIENCE: 2,
  EXPERIENCED: 3,
  EXPERT: 4,
};

export function detectMemberConflicts(members: TeamMember[]): TeamConflictItem[] {
  if (members.length < 2) return [];

  const conflicts: TeamConflictItem[] = [];

  const fitnessValues = members.map((m) => FITNESS_RANK[m.fitnessLevel] ?? 2);
  const fitnessSpread = Math.max(...fitnessValues) - Math.min(...fitnessValues);
  if (fitnessSpread >= 2) {
    const slow = members.find((m) => (FITNESS_RANK[m.fitnessLevel] ?? 2) === Math.min(...fitnessValues));
    const fast = members.find((m) => (FITNESS_RANK[m.fitnessLevel] ?? 2) === Math.max(...fitnessValues));
    if (slow && fast) {
      conflicts.push({
        id: 'fitness-pace',
        topic: '行程节奏',
        description: `${slow.displayName} vs ${fast.displayName}（体能差异较大）`,
      });
    }
  }

  const expValues = members.map((m) => EXPERIENCE_RANK[m.experienceLevel] ?? 2);
  const expSpread = Math.max(...expValues) - Math.min(...expValues);
  if (expSpread >= 2) {
    conflicts.push({
      id: 'experience-comfort',
      topic: '活动难度',
      description: '成员户外经验差异明显，路线强度需协调',
    });
  }

  const budgetSpread = members.reduce((max, m) => {
    const v = m.personalWeights?.budgetOverrun ?? 0.05;
    return Math.max(max, v);
  }, 0);
  const budgetMin = members.reduce((min, m) => {
    const v = m.personalWeights?.budgetOverrun ?? 0.05;
    return Math.min(min, v);
  }, 1);
  if (budgetSpread - budgetMin >= 0.08) {
    conflicts.push({
      id: 'budget',
      topic: '预算取向',
      description: '成员对预算敏感度不一致',
    });
  }

  return conflicts.slice(0, 4);
}

export function conflictsFromNegotiation(
  result: TeamNegotiationResponse | null,
): TeamConflictItem[] {
  if (!result?.conflicts?.length) return [];
  return result.conflicts.map((c, i) => ({
    id: `negotiation-${i}`,
    topic: c.type || '偏好分歧',
    description: c.description,
  }));
}

export function memberRoleLabel(member: TeamMember, isCreator?: boolean): string {
  if (isCreator || member.role === 'LEADER') return '创建者';
  if (member.role === 'OBSERVER') return '观察者';
  return '成员';
}
