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

/** 决策队列 / overview 计数用 */
export function filterDecisionQueueSummaries(
  items: DecisionProblemSummary[],
): DecisionProblemSummary[] {
  return items.filter((item) => !isReadinessSafetyDecisionProblem(item));
}
