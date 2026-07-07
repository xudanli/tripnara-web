import { applyRepair } from '@/api/feasibility-repair';
import { itineraryItemsApi } from '@/api/trips';
import {
  assertFeasibilityApplyRepairAllowed,
  formatLegacyApplyBlockedMessage,
  isLegacyApplyBlockedError,
} from '@/lib/effective-plan-write-chain.util';
import { isPlanClassAction } from '@/lib/feasibility-repair-plan-class';
import { shouldOpenReservationEvidenceModal } from '@/lib/poi-access-reservation-evidence.util';
import type { FeasibilityIssueDto, FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';
import { isAxiosError } from 'axios';

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

import {
  readFeasibilityRepairErrorCode,
} from '@/lib/effective-plan-write-chain.util';

function readRepairErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  if (typeof record.message === 'string') return record.message;
  if (Array.isArray(record.message)) return record.message.map(String).join(' ');
  return undefined;
}

/** apply-repair / preview-repair 409 SCHEDULE_CONFLICT 等 → 用户可读文案 */
export function formatFeasibilityRepairApplyError(err: unknown): string {
  if (isLegacyApplyBlockedError(err)) {
    return formatLegacyApplyBlockedMessage(err);
  }
  if (isAxiosError(err) && err.response?.status === 409) {
    const code = readFeasibilityRepairErrorCode(err.response.data);
    const message = readRepairErrorMessage(err.response.data);
    if (code === 'SCHEDULE_CONFLICT') {
      return (
        message?.trim() ||
        '加缓冲后与当日其他行程时间冲突，请改选其他方案或到时间轴手动调整'
      );
    }
    if (message?.trim()) return message.trim();
  }
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  return '应用修复失败';
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
  if (shouldOpenReservationEvidenceModal(option, issue)) {
    throw new Error('请先上传预约凭证（确认号），不要直接应用该修复项');
  }

  assertFeasibilityApplyRepairAllowed(issue);

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
    if (isLegacyApplyBlockedError(err)) throw err;
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
