import { coerceExecutionStatusResponse } from '@/trips/decision-semantics/frontend/decision-center-execution-state-machine.util';
import type {
  CreateDecisionResponse,
  DecisionCenterOverview,
  DecisionCenterRecentDecisionSnapshot,
  DecisionAuthority,
  DecisionExecutionStatus,
  DecisionExecutionStatusResponse,
  DecisionOption,
  DecisionRecordStatus,
} from '@/types/decision-problem';

/** BFF recentDecisions：decisionId、recordStatus、executionStatus 字符串 */
export function normalizeRecentDecisionSnapshot(
  raw: DecisionCenterRecentDecisionSnapshot & {
    decisionId?: string;
    recordStatus?: DecisionRecordStatus;
  },
): DecisionCenterRecentDecisionSnapshot {
  const id = String(raw.id ?? raw.decisionId ?? '').trim();
  const coerced =
    raw.executionStatus != null && typeof raw.executionStatus !== 'string'
      ? coerceExecutionStatusResponse(
          raw.executionStatus as unknown as DecisionExecutionStatusResponse,
        )
      : null;
  const executionStatus = (
    typeof raw.executionStatus === 'string'
      ? raw.executionStatus
      : coerced?.status
  ) as DecisionExecutionStatus | undefined;

  return {
    ...raw,
    id,
    decisionId: raw.decisionId ?? (id || undefined),
    status: raw.status ?? raw.recordStatus,
    recordStatus: raw.recordStatus,
    executionStatus,
    needsRepair: raw.needsRepair ?? coerced?.needsRepair,
  };
}

export function normalizeDecisionCenterOverview(
  overview: DecisionCenterOverview,
): DecisionCenterOverview {
  if (!overview.recentDecisions?.length) return overview;
  return {
    ...overview,
    recentDecisions: overview.recentDecisions
      .map((item) => normalizeRecentDecisionSnapshot(item))
      .filter((item) => Boolean(item.id)),
  };
}

/** BFF authority 使用 requiredApprover；前端展示用 approver */
export function normalizeDecisionAuthority(
  authority: DecisionAuthority | null | undefined,
): DecisionAuthority | undefined {
  if (!authority) return undefined;
  const requiredApprover = (authority as { requiredApprover?: string }).requiredApprover;
  return {
    ...authority,
    approver: authority.approver ?? (requiredApprover as DecisionAuthority['approver']),
  };
}

/** BFF options 常用 title 字段 */
export function normalizeDecisionOption(option: DecisionOption): DecisionOption {
  const title = option.title?.trim() || option.label?.trim();
  return {
    ...option,
    title: title || option.title,
    label: option.label?.trim() ?? title,
    authority: normalizeDecisionAuthority(option.authority),
  };
}

export function normalizeDecisionOptions(options: DecisionOption[]): DecisionOption[] {
  return options.map(normalizeDecisionOption);
}

/** POST decisions：executionStatus 可能是字符串（含 IDEMPOTENT_REPLAY） */
export function normalizeCreateDecisionResponse(
  data: CreateDecisionResponse,
): CreateDecisionResponse {
  const executionStatus = coerceExecutionStatusResponse(data.executionStatus);
  return executionStatus ? { ...data, executionStatus } : data;
}
