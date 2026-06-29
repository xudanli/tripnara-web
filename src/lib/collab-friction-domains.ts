import { FRICTION_DOMAIN_LABELS, FRICTION_LEVEL_TEXT } from '@/lib/decision-profiling-labels';
import type {
  FrictionDomain,
  FrictionLevel,
  FrictionMatrixPair,
  HighRiskAlert,
} from '@/types/trip-decision-profiling';

/** 画像 Tab 摩擦矩阵优先展示的领域（与设计稿一致） */
export const PERSONA_FRICTION_DOMAIN_ORDER: FrictionDomain[] = [
  'budget',
  'pace',
  'accommodation',
  'activities',
  'group_decision',
];

const LEVEL_RANK: Record<FrictionLevel, number> = {
  green: 0,
  yellow: 1,
  red: 2,
};

export interface AggregatedDomainFriction {
  domain: FrictionDomain;
  label: string;
  level: FrictionLevel;
  levelLabel: string;
  score: number;
}

/** 将成员对矩阵聚合为团队领域摩擦列表 */
export function aggregateFrictionByDomain(
  pairs: FrictionMatrixPair[],
): AggregatedDomainFriction[] {
  const byDomain = new Map<
    FrictionDomain,
    { level: FrictionLevel; score: number }
  >();

  for (const pair of pairs) {
    for (const cell of pair.cells) {
      const prev = byDomain.get(cell.domain);
      const nextLevel =
        !prev || LEVEL_RANK[cell.level] > LEVEL_RANK[prev.level]
          ? cell.level
          : prev.level;
      const nextScore = Math.max(prev?.score ?? 0, cell.score);
      byDomain.set(cell.domain, { level: nextLevel, score: nextScore });
    }
  }

  return PERSONA_FRICTION_DOMAIN_ORDER.filter((domain) => byDomain.has(domain)).map(
    (domain) => {
      const item = byDomain.get(domain)!;
      return {
        domain,
        label: FRICTION_DOMAIN_LABELS[domain],
        level: item.level,
        levelLabel: FRICTION_LEVEL_TEXT[item.level],
        score: item.score,
      };
    },
  );
}

/** 摩擦点表「影响维度」文案 */
export const FRICTION_IMPACT_DIMENSION: Partial<Record<FrictionDomain, string>> = {
  budget: '预算重叠度',
  pace: '节奏同步',
  accommodation: '舒适度偏好',
  activities: '体验优先级',
  transportation: '交通方式',
  dining: '餐饮偏好',
  planning_style: '规划方式',
  group_decision: '集体决策',
};

export function frictionPointTitle(alert: HighRiskAlert): string {
  return `${alert.domainLabel}不一致`;
}

export function frictionImpactDimension(alert: HighRiskAlert): string {
  return FRICTION_IMPACT_DIMENSION[alert.domain] ?? alert.domainLabel;
}
