import { applyRepair } from '@/api/feasibility-repair';
import { itineraryItemsApi } from '@/api/trips';
import { isPlanClassAction } from '@/lib/feasibility-repair-plan-class';
import type { FeasibilityIssueDto, FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';

export {
  filterFeasibilityRepairOptionsForTrip,
  isBookTransportRepairOption,
  isInapplicableSelfDriveRepairOption,
  shouldShowFeasibilityRepairWorkflow,
} from '@/lib/feasibility-repair-filter';

export function resolveRevalidateScope(
  issue: FeasibilityIssueDto,
  option?: FeasibilityRepairOptionDto,
): { issueId?: string; dayNumber?: number } {
  const scope = option?.payload?.validateScope;
  if (scope?.type === 'issue' && scope.issueId) {
    return { issueId: scope.issueId };
  }
  if (scope?.type === 'day' && scope.dayNumber != null) {
    return { dayNumber: scope.dayNumber, issueId: issue.id };
  }
  if (scope?.type === 'route' && scope.segmentId) {
    return { segmentId: scope.segmentId, issueId: issue.id };
  }
  if (scope?.type === 'route') {
    return { issueId: issue.id };
  }
  return { issueId: issue.id };
}

async function applyAdjustTimePayload(option: FeasibilityRepairOptionDto): Promise<void> {
  const payload = option.payload;
  if (!payload?.itemId || !payload.suggestedValue) {
    throw new Error('缺少调整时间所需字段');
  }
  const suggested =
    typeof payload.suggestedValue === 'string' ? payload.suggestedValue : undefined;
  if (!suggested) {
    throw new Error('缺少调整时间所需字段');
  }
  const field = payload.field === 'endTime' ? 'endTime' : 'startTime';
  await itineraryItemsApi.update(payload.itemId, { [field]: suggested });
}

/** 应用单条修复：BFF apply-repair；adjust_time 可回退本地 PATCH */
export async function applyFeasibilityRepairOption(
  tripId: string,
  issue: FeasibilityIssueDto,
  option: FeasibilityRepairOptionDto,
  options?: { forceDecisionRepair?: boolean },
): Promise<void> {
  try {
    const res = await applyRepair(tripId, issue.id, {
      optionId: option.id,
      ...(isPlanClassAction(option.actionType) ? { executeDecision: true } : {}),
      ...(options?.forceDecisionRepair ? { forceDecisionRepair: true } : {}),
    });
    if (res.status === 'deferred') {
      throw new Error(res.message || '修复已暂缓，需先确认协商点');
    }
    return;
  } catch (err) {
    if (
      option.actionType === 'adjust_time' &&
      option.payload?.itemId &&
      typeof option.payload.suggestedValue === 'string'
    ) {
      await applyAdjustTimePayload(option);
      return;
    }
    throw err;
  }
}
