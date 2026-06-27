import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';
import type {
  PoiAccessEvaluation,
  PoiAccessPlanBAction,
  PoiAccessPlanBHint,
  PoiAccessPlanBOption,
  PoiAccessVerdict,
  PoiAccessVerdictCanonical,
} from '@/types/poi-access-capacity';

const VERDICT_LABELS: Record<PoiAccessVerdictCanonical, string> = {
  FEASIBLE: '能去',
  FEASIBLE_WITH_RISK: '能去，但有风险',
  BLOCKED: '暂不可去',
  NEEDS_CONFIRMATION: '待确认',
  RESERVATION_REQUIRED: '需预约',
};

const PLAN_B_ACTION_LABELS: Record<PoiAccessPlanBAction, string> = {
  SHIFT_ARRIVAL: '改到达时间',
  BOOK_NOW: '跳转预订',
  USE_ALTERNATIVE: '替换备选 POI',
  CHANGE_DATE: '改日期',
};

/** 后端 NEEDS_CONFIRMATION ↔ 读模型 UNKNOWN */
export function normalizePoiAccessVerdict(
  verdict: PoiAccessVerdict | string | undefined,
): PoiAccessVerdictCanonical {
  if (!verdict || verdict === 'UNKNOWN') return 'NEEDS_CONFIRMATION';
  if (verdict in VERDICT_LABELS) return verdict as PoiAccessVerdictCanonical;
  return 'NEEDS_CONFIRMATION';
}

export function poiAccessVerdictLabel(verdict: PoiAccessVerdict | string | undefined): string {
  return VERDICT_LABELS[normalizePoiAccessVerdict(verdict)];
}

export function poiAccessPlanBActionLabel(action: PoiAccessPlanBAction | string | undefined): string {
  if (!action) return '查看方案';
  if (action in PLAN_B_ACTION_LABELS) {
    return PLAN_B_ACTION_LABELS[action as PoiAccessPlanBAction];
  }
  return action;
}

/** 合并 planB / planBHints 为统一列表（UI 渲染用） */
export function collectPoiAccessPlanBOptions(input: {
  planB?: PoiAccessPlanBOption[];
  planBHints?: PoiAccessPlanBHint[];
}): Array<PoiAccessPlanBOption | PoiAccessPlanBHint> {
  if (input.planB?.length) return input.planB;
  return input.planBHints ?? [];
}

export function resolvePlanBDisplayLabel(
  option: PoiAccessPlanBOption | PoiAccessPlanBHint,
): string {
  if ('action' in option && option.action) {
    return option.label ?? poiAccessPlanBActionLabel(option.action);
  }
  if ('actionType' in option && option.actionType) {
    return option.label ?? option.actionType;
  }
  return option.label ?? '查看方案';
}

/** 上传凭证所需 tripItemId — evaluation 缺失时从 anchors / proofs 回退 */
export function resolvePoiAccessTripItemId(
  issue: FeasibilityIssueDto,
  evaluation?: PoiAccessEvaluation | null,
): string | undefined {
  const fromEval = evaluation?.tripItemId ?? issue.accessEvaluation?.tripItemId;
  if (fromEval) return fromEval;
  if (issue.anchors?.fromItemId) return issue.anchors.fromItemId;
  if (issue.anchors?.toItemId) return issue.anchors.toItemId;
  for (const proof of issue.proofs ?? []) {
    if (proof.itemId) return proof.itemId;
  }
  return undefined;
}
