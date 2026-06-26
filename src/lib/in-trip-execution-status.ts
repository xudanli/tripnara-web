import type { TripState } from '@/types/trip';
import type { VulnerabilitySeverity } from '@/types/in-trip-execution';

export type InTripExecutionBadgeVariant = 'default' | 'destructive' | 'secondary' | 'outline';

export type InTripExecutionBadge = {
  label: string;
  variant: InTripExecutionBadgeVariant;
  /** Abu / Gate 裁决原文（调试或 Tooltip） */
  abuVerdict?: string;
  gateStatus?: string;
};

type TripStateWithGate = TripState & {
  executionStatus?: string;
  abuVerdict?: string;
  gateStatus?: string;
  gateVerdict?: string;
  needsRepair?: boolean;
  abu?: { verdict?: string; status?: string };
};

function normalizeAbuVerdict(state: TripStateWithGate | null | undefined): string | undefined {
  if (!state) return undefined;
  const raw =
    state.abuVerdict ??
    state.gateVerdict ??
    state.gateStatus ??
    state.executionStatus ??
    state.abu?.verdict ??
    state.abu?.status;
  return typeof raw === 'string' ? raw.trim().toUpperCase() : undefined;
}

/**
 * 行中顶部状态徽章：优先 TripState / Abu 裁决，辅以脆弱度与待处理数。
 */
export function resolveInTripExecutionBadge(
  tripState: TripState | null | undefined,
  opts?: {
    vulnerabilitySeverity?: VulnerabilitySeverity;
    pendingTotal?: number;
  }
): InTripExecutionBadge {
  const state = tripState as TripStateWithGate | null;
  const abu = normalizeAbuVerdict(state);
  const pending = opts?.pendingTotal ?? 0;
  const vuln = opts?.vulnerabilitySeverity;

  if (abu === 'REJECT' || abu === 'BLOCK' || abu === 'DENY') {
    return {
      label: 'Abu：不可执行',
      variant: 'destructive',
      abuVerdict: abu,
      gateStatus: state?.gateStatus,
    };
  }

  if (abu === 'NEED_ADJUST' || abu === 'WARN' || abu === 'WARNING') {
    return {
      label: 'Abu：需调整',
      variant: 'secondary',
      abuVerdict: abu,
      gateStatus: state?.gateStatus,
    };
  }

  if (state?.needsRepair === true || abu === 'NEEDS_REPAIR') {
    return {
      label: '需修复',
      variant: 'destructive',
      abuVerdict: abu,
      gateStatus: state?.gateStatus,
    };
  }

  if (vuln === 'red') {
    return {
      label: '脆弱度高',
      variant: 'destructive',
      abuVerdict: abu,
      gateStatus: state?.gateStatus,
    };
  }

  if (pending > 0) {
    return {
      label: `${pending} 项待处理`,
      variant: 'secondary',
      abuVerdict: abu,
      gateStatus: state?.gateStatus,
    };
  }

  if (abu === 'ALLOW' || abu === 'OK' || abu === 'PASS') {
    return {
      label: 'Abu：可执行',
      variant: 'default',
      abuVerdict: abu,
      gateStatus: state?.gateStatus,
    };
  }

  // 启发式兜底（后端未写 Abu 字段时）
  const onTrack = Boolean(state?.nextStop?.itemId ?? state?.currentItemId);
  return {
    label: onTrack ? '正常进行' : '待确认下一步',
    variant: onTrack ? 'default' : 'outline',
    abuVerdict: abu,
    gateStatus: state?.gateStatus,
  };
}
