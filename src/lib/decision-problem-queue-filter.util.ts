import type { DecisionProblemSummary } from '@/types/decision-problem';

/**
 * Readiness / Safety 类问题（如冰岛紧急电话）不进决策队列与 open 计数。
 * 展示改走 Readiness / Safety surface。
 */
export function isReadinessSafetyDecisionProblem(
  item: Pick<DecisionProblemSummary, 'id' | 'title' | 'semanticKey' | 'instanceKey'>,
): boolean {
  const semantic = `${item.semanticKey ?? ''} ${item.instanceKey ?? ''}`.toLowerCase();
  if (
    semantic.includes('readiness:') ||
    semantic.includes('safety:') ||
    semantic.includes('emergency') ||
    semantic.includes('issue-finding')
  ) {
    return true;
  }

  const title = item.title.trim();
  if (/紧急电话|emergency\s*(number|phone|call)/i.test(title)) {
    return true;
  }

  return false;
}

/** Canonical 日负荷问题（与 DecisionCase 日驾卡去重） */
export function isCanonicalExcessiveDailyLoadProblem(
  item: Pick<DecisionProblemSummary, 'id' | 'semanticKey' | 'canonicalView'>,
): boolean {
  const semantic = `${item.semanticKey ?? ''} ${item.canonicalView?.rfc001Problem?.semanticCapability ?? ''}`
    .trim()
    .toUpperCase();
  return semantic.includes('EXCESSIVE_DAILY_LOAD');
}

/** DecisionCase 日驾超限（与 Canonical EXCESSIVE_DAILY_LOAD 互斥） */
export function isDecisionCaseExcessiveDailyDriveProblem(
  item: Pick<DecisionProblemSummary, 'id' | 'semanticKey' | 'decisionCase'>,
): boolean {
  const semantic = String(item.semanticKey ?? '').toUpperCase();
  if (semantic.includes('EXCESSIVE_DAILY_DRIVE') || semantic.includes('RULE_TRIGGER.EXCESSIVE_DAILY_DRIVE')) {
    return true;
  }
  const id = String(item.id ?? '');
  if (/^dc_drive_/i.test(id)) return true;
  return item.decisionCase?.sourceKind === 'RULE_TRIGGER' && /DRIVE|日驾|驾驶负荷/i.test(semantic);
}

/**
 * 队列已有 Canonical EXCESSIVE_DAILY_LOAD 时，隐藏 DecisionCase 日驾卡。
 * 车型 / 保险 / 落地 / 环岛 / 冰川不受影响。
 */
export function filterDecisionCaseDriveWhenCanonicalLoadPresent(
  items: DecisionProblemSummary[],
): DecisionProblemSummary[] {
  const hasCanonicalLoad = items.some(isCanonicalExcessiveDailyLoadProblem);
  if (!hasCanonicalLoad) return items;
  return items.filter((item) => !isDecisionCaseExcessiveDailyDriveProblem(item));
}

/** 决策队列 / overview 计数用 */
export function filterDecisionQueueSummaries(
  items: DecisionProblemSummary[],
): DecisionProblemSummary[] {
  return filterDecisionCaseDriveWhenCanonicalLoadPresent(
    items.filter((item) => !isReadinessSafetyDecisionProblem(item)),
  );
}
