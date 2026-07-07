/**
 * 目的地规则（OFFICIAL_RULE）求解器 / 展示 SSOT — 与 hard_must_satisfy 用户硬约束分离。
 * 对齐 BFF：type=EXTERNAL · sectionKey=readonly_official · 不可 PATCH。
 */
import type { DestinationRuleTier } from '@/types/destination-rules';
import type {
  FeasibilityIssuePriority,
  FeasibilityIssueKind,
} from '@/types/trip-feasibility-report';
import type { TripConstraintViolationResult } from '@/types/trip-constraints';
import { apiConstraintIdToUi } from '@/lib/trip-constraints.adapter';

export interface DestinationRuleTierSpec {
  tier: DestinationRuleTier;
  /** 前端卡片 violationLabel 默认 */
  violationResultLabel: string;
  violationResult: TripConstraintViolationResult;
  /** BLOCK → hard conflict · hardConstraintBlocked */
  hardConstraintBlocked: boolean;
  feasibilityPriority: FeasibilityIssuePriority;
  feasibilitySeverity: 'high' | 'medium' | 'low';
  solverBehaviorLabel: string;
}

/** destinationRuleTier → 求解器 / 前端 violationResult */
export const DESTINATION_RULE_TIER_SPECS: readonly DestinationRuleTierSpec[] = [
  {
    tier: 'BLOCK',
    violationResultLabel: '阻断路线',
    violationResult: 'BLOCK',
    hardConstraintBlocked: true,
    feasibilityPriority: 'must_handle',
    feasibilitySeverity: 'high',
    solverBehaviorLabel: 'hard conflict · hardConstraintBlocked',
  },
  {
    tier: 'CONDITIONAL',
    violationResultLabel: '检查条件是否满足',
    violationResult: 'CONFIRM',
    hardConstraintBlocked: false,
    feasibilityPriority: 'suggest_adjust',
    feasibilitySeverity: 'medium',
    solverBehaviorLabel: '检查预约/季节/车型',
  },
  {
    tier: 'ADVISORY',
    violationResultLabel: '影响风险评分',
    violationResult: 'CONFIRM',
    hardConstraintBlocked: false,
    feasibilityPriority: 'pending_confirm',
    feasibilitySeverity: 'low',
    solverBehaviorLabel: '影响 feasibility 分数，不 block',
  },
] as const;

const tierSpecByTier = new Map<string, DestinationRuleTierSpec>(
  DESTINATION_RULE_TIER_SPECS.map((spec) => [spec.tier, spec]),
);

const officialRuleIdByNormalized = new Map<string, true>();

export function isOfficialRuleConstraintId(id: string | undefined | null): boolean {
  if (!id?.trim()) return false;
  const normalized = id.trim();
  if (normalized.startsWith('c_official_') || normalized.startsWith('c_official_poi_')) {
    return true;
  }
  const ui = apiConstraintIdToUi(normalized);
  return ui.startsWith('c_official_') || ui.startsWith('c_official_poi_');
}

export function registerOfficialRuleConstraintId(id: string | undefined | null): void {
  if (!id?.trim()) return;
  officialRuleIdByNormalized.set(id.trim(), true);
  officialRuleIdByNormalized.set(apiConstraintIdToUi(id.trim()), true);
}

export function resolveDestinationRuleTierSpec(
  tier: DestinationRuleTier | undefined | null,
): DestinationRuleTierSpec | undefined {
  if (!tier) return undefined;
  return tierSpecByTier.get(String(tier).toUpperCase());
}

export function resolveDestinationRuleViolationLabel(
  tier: DestinationRuleTier | undefined | null,
  contractMetaLabel?: string | null,
  valueLabel?: string | null,
): string {
  if (contractMetaLabel?.trim()) return contractMetaLabel.trim();
  if (valueLabel?.trim()) return valueLabel.trim();
  return (
    resolveDestinationRuleTierSpec(tier)?.violationResultLabel ??
    DESTINATION_RULE_TIER_SPECS[2].violationResultLabel
  );
}

export function resolveFeasibilitySignalsForDestinationRule(input: {
  tier?: DestinationRuleTier | null;
  constraintId?: string | null;
  relatedConstraintIds?: string[] | null;
}): {
  priority: FeasibilityIssuePriority;
  severity: 'high' | 'medium' | 'low';
  hardConstraintBlocked: boolean;
} | null {
  const spec = resolveDestinationRuleTierSpec(input.tier);
  if (spec) {
    return {
      priority: spec.feasibilityPriority,
      severity: spec.feasibilitySeverity,
      hardConstraintBlocked: spec.hardConstraintBlocked,
    };
  }

  const ids = [
    input.constraintId,
    ...(input.relatedConstraintIds ?? []),
  ].filter((id): id is string => Boolean(id?.trim()));

  for (const id of ids) {
    if (!isOfficialRuleConstraintId(id)) continue;
    const blockSpec = tierSpecByTier.get('BLOCK');
    if (blockSpec) {
      return {
        priority: blockSpec.feasibilityPriority,
        severity: blockSpec.feasibilitySeverity,
        hardConstraintBlocked: blockSpec.hardConstraintBlocked,
      };
    }
  }

  return null;
}

export function isDestinationRuleBlockedTier(tier: DestinationRuleTier | undefined | null): boolean {
  return resolveDestinationRuleTierSpec(tier)?.hardConstraintBlocked === true;
}

export function isDestinationRuleFeasibilityIssue(input: {
  issueKind?: FeasibilityIssueKind | string | null;
  constraintId?: string | null;
  relatedConstraintIds?: string[] | null;
}): boolean {
  if (input.constraintId && isOfficialRuleConstraintId(input.constraintId)) return true;
  return (input.relatedConstraintIds ?? []).some((id) => isOfficialRuleConstraintId(id));
}

export function expandOfficialRuleConstraintIdSet(ids: string[]): Set<string> {
  const set = new Set<string>();
  for (const raw of ids) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    set.add(trimmed);
    set.add(apiConstraintIdToUi(trimmed));
    if (trimmed.startsWith('c_')) set.add(trimmed.slice(2));
  }
  return set;
}
