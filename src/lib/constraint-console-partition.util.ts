import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import { shouldShowListEditButton } from '@/lib/constraint-console-interaction.util';
import { expandConstraintIdVariants, collectIssueConstraintIds } from '@/lib/constraints-check-normalize.util';
import { apiConstraintIdToUi, uiConstraintIdToApi } from '@/lib/trip-constraints.adapter';
import { isOfficialRuleConstraintId } from '@/lib/trip-constraint-destination-rule.util';
import {
  TRIP_CONSTRAINT_LEGACY_IDS,
  type TripConstraint,
  type TripConstraintsCheckIssue,
} from '@/types/trip-constraints';

export interface ConstraintConsolePartition {
  userHardItems: ConstraintListEntry[];
  userSoftItems: ConstraintListEntry[];
  officialRuleItems: ConstraintListEntry[];
  worldFeasibilityItem: ConstraintListEntry | null;
}

export function isWorldFeasibilityConstraint(
  constraint: Pick<TripConstraint, 'id'> | Pick<ConstraintListEntry, 'id'>,
): boolean {
  return (
    constraint.id === TRIP_CONSTRAINT_LEGACY_IDS.WORLD_FEASIBILITY ||
    constraint.id === 'c_world_feasibility' ||
    constraint.id === 'world_feasibility'
  );
}

export function isOfficialRuleConstraint(
  constraint:
    | Pick<TripConstraint, 'id' | 'type' | 'source' | 'sectionKey'>
    | Pick<ConstraintListEntry, 'id' | 'kind' | 'sourceType' | 'sectionKey'>,
): boolean {
  if ('id' in constraint && isOfficialRuleConstraintId(constraint.id)) return true;
  if ('sectionKey' in constraint && constraint.sectionKey === 'readonly_official') {
    if ('sourceType' in constraint && constraint.sourceType === 'OFFICIAL_RULE') return true;
    if ('source' in constraint && constraint.source?.type === 'OFFICIAL_RULE') return true;
  }
  if ('type' in constraint && constraint.type === 'EXTERNAL') {
    return constraint.source?.type === 'OFFICIAL_RULE';
  }
  if ('kind' in constraint) {
    return constraint.kind === 'external' && constraint.sourceType === 'OFFICIAL_RULE';
  }
  return false;
}

export function isSafetyCategory(category?: string | null): boolean {
  return category === 'SAFETY';
}

export function hasConstraintConflict(entry: Pick<ConstraintListEntry, 'hasConflict' | 'cardTone'>): boolean {
  return entry.hasConflict === true || entry.cardTone === 'danger';
}

/** 官方目的地规则：只读，无编辑/删除/停用 */
export function isConstraintReadOnly(entry: ConstraintListEntry): boolean {
  return entry.readOnly === true || isOfficialRuleConstraint(entry);
}

/** 是否允许 PATCH（locked 或官方规则均禁止） */
export function canPatchConstraint(entry: ConstraintListEntry): boolean {
  if (isConstraintReadOnly(entry)) return false;
  if (entry.locked) return false;
  return entry.kind === 'hard' || entry.kind === 'soft';
}

export function canShowConstraintEdit(entry: ConstraintListEntry): boolean {
  return shouldShowListEditButton(entry);
}

export function canShowConstraintDelete(entry: ConstraintListEntry): boolean {
  if (isConstraintReadOnly(entry)) return false;
  if (entry.locked) return false;
  return entry.kind === 'soft';
}

export function canOfferRelaxation(entry: ConstraintListEntry): boolean {
  if (isConstraintReadOnly(entry)) return false;
  return entry.allowRelaxation !== false;
}

export function sortOfficialRuleItems(items: ConstraintListEntry[]): ConstraintListEntry[] {
  return [...items].sort((a, b) => {
    const aSafety = isSafetyCategory(a.category) ? 0 : 1;
    const bSafety = isSafetyCategory(b.category) ? 0 : 1;
    if (aSafety !== bSafety) return aSafety - bSafety;
    return a.label.localeCompare(b.label, 'zh');
  });
}

export function partitionConstraintEntries(items: ConstraintListEntry[]): ConstraintConsolePartition {
  const userHardItems: ConstraintListEntry[] = [];
  const userSoftItems: ConstraintListEntry[] = [];
  const officialRuleItems: ConstraintListEntry[] = [];
  let worldFeasibilityItem: ConstraintListEntry | null = null;

  for (const item of items) {
    if (isWorldFeasibilityConstraint(item)) {
      worldFeasibilityItem = item;
      continue;
    }
    if (isOfficialRuleConstraint(item)) {
      officialRuleItems.push(item);
      continue;
    }
    if (item.kind === 'hard') {
      userHardItems.push(item);
    } else if (item.kind === 'soft') {
      userSoftItems.push(item);
    }
  }

  return {
    userHardItems,
    userSoftItems,
    officialRuleItems: sortOfficialRuleItems(officialRuleItems),
    worldFeasibilityItem,
  };
}

function indexCheckIssuesByConstraintIds(
  issues: TripConstraintsCheckIssue[],
): Map<string, TripConstraintsCheckIssue> {
  const byConstraintId = new Map<string, TripConstraintsCheckIssue>();
  for (const issue of issues) {
    const ids = collectIssueConstraintIds(issue);
    for (const id of ids) {
      byConstraintId.set(id, issue);
    }
  }
  return byConstraintId;
}

function indexTradeoffIssuesByConstraintIds(
  issues: TripConstraintsCheckIssue[],
): Map<string, TripConstraintsCheckIssue> {
  const byConstraintId = new Map<string, TripConstraintsCheckIssue>();
  for (const issue of issues) {
    if (issue.issueKind !== 'soft_tradeoff' && !issue.sacrificed) continue;
    for (const id of collectIssueConstraintIds(issue)) {
      byConstraintId.set(id, issue);
    }
  }
  return byConstraintId;
}

function isSacrificedEntry(
  item: ConstraintListEntry,
  sacrificedIds: Set<string> | undefined,
): boolean {
  if (!sacrificedIds?.size) return false;
  const apiId = uiConstraintIdToApi(item.id);
  const uiId = apiConstraintIdToUi(item.id);
  return sacrificedIds.has(apiId) || sacrificedIds.has(item.id) || sacrificedIds.has(uiId);
}

export interface AttachCheckIssuesOptions {
  sacrificedConstraintIds?: string[];
}

export function attachCheckIssuesToEntries(
  items: ConstraintListEntry[],
  issues: TripConstraintsCheckIssue[] | undefined,
  options?: AttachCheckIssuesOptions,
): ConstraintListEntry[] {
  if (!issues?.length && !options?.sacrificedConstraintIds?.length) return items;

  const sacrificedIds = new Set<string>();
  for (const id of options?.sacrificedConstraintIds ?? []) {
    for (const v of expandConstraintIdVariants(id)) sacrificedIds.add(v);
  }

  const byConstraintId = indexCheckIssuesByConstraintIds(issues ?? []);
  const tradeoffByConstraintId = indexTradeoffIssuesByConstraintIds(issues ?? []);

  return items.map((item) => {
    const apiId = uiConstraintIdToApi(item.id);
    const uiId = apiConstraintIdToUi(item.id);
    const sacrificed = item.kind === 'soft' && isSacrificedEntry(item, sacrificedIds);

    if (sacrificed) {
      const tradeoff =
        tradeoffByConstraintId.get(apiId) ??
        tradeoffByConstraintId.get(item.id) ??
        tradeoffByConstraintId.get(uiId);
      return {
        ...item,
        softSacrificed: true,
        softTradeoffMessage: tradeoff?.message,
        checkIssueId: tradeoff ? (tradeoff.decisionProblemId ?? tradeoff.id) : item.checkIssueId,
        allowRelaxation: tradeoff?.allowRelaxation ?? item.allowRelaxation,
        statusLabel: '已取舍',
        statusTone: 'warning' as const,
        hasConflict: false,
        cardTone: 'caution' as const,
      };
    }

    const issue =
      byConstraintId.get(apiId) ??
      byConstraintId.get(item.id) ??
      byConstraintId.get(uiId);
    if (!issue) return item;
    if (issue.issueKind === 'soft_tradeoff') return item;

    const decisionProblemId = issue.decisionProblemId ?? issue.id;
    return {
      ...item,
      checkIssueId: decisionProblemId,
      allowRelaxation: issue.allowRelaxation ?? item.allowRelaxation,
    };
  });
}

export function flattenPartition(partition: ConstraintConsolePartition): ConstraintListEntry[] {
  return [
    ...partition.userHardItems,
    ...partition.userSoftItems,
    ...partition.officialRuleItems,
    ...(partition.worldFeasibilityItem ? [partition.worldFeasibilityItem] : []),
  ];
}

export const OFFICIAL_RULE_READONLY_HINT =
  '此项为目的地官方规则，由系统自动维护，不可手动修改或关闭。';

/** @deprecated 使用 OFFICIAL_RULE_READONLY_HINT */
export const OFFICIAL_RULE_WHY_NOT_EDITABLE = OFFICIAL_RULE_READONLY_HINT;

export function isOfficialReadonlyConstraint(
  item: Pick<ConstraintListEntry, 'sourceType' | 'locked'>,
): boolean {
  return item.sourceType === 'OFFICIAL_RULE' && item.locked === true;
}

/** ? tooltip：规则说明（description）+ 官方只读系统提示（前端固定文案） */
export function buildConstraintHelpTooltip(
  item: Pick<ConstraintListEntry, 'description' | 'sourceType' | 'locked'>,
): string | null {
  const description = item.description?.trim();
  const parts = [
    description || null,
    isOfficialReadonlyConstraint(item) ? OFFICIAL_RULE_READONLY_HINT : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join('\n\n') : null;
}
