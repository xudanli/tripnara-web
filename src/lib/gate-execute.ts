import { shouldRequireExperienceRegretConfirmation } from '@/lib/experience-regret-bound.util';
import type { GateExecuteStatus } from '@/types/trip-reservation-evidence';
import type { FeasibilityIssueDto, TripFeasibilityReportDto } from '@/types/trip-feasibility-report';
import type { TripDetail } from '@/types/trip';

function isHardAccessIssue(issue: FeasibilityIssueDto): boolean {
  return issue.issueKind === 'poi_access_blocked';
}

function isRegretIssue(issue: FeasibilityIssueDto): boolean {
  return issue.issueKind === 'experience_regret_unconfirmed';
}

function normalizeGateFromApi(raw: unknown): GateExecuteStatus | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as GateExecuteStatus;
  if (typeof o.blocked !== 'boolean' || !Array.isArray(o.reasons)) return undefined;
  return o;
}

/** 从报告 issues + 行程 metadata 推导 GATE-EXECUTE（后端未返回时 fallback） */
export function computeGateExecuteStatus(
  report: TripFeasibilityReportDto | null | undefined,
  trip: TripDetail | null | undefined,
): GateExecuteStatus {
  const fromApi = normalizeGateFromApi(
    (report as TripFeasibilityReportDto & { gateExecute?: unknown })?.gateExecute,
  );
  if (fromApi) return fromApi;

  const reasons: GateExecuteStatus['reasons'] = [];

  for (const issue of report?.issues ?? []) {
    if (isHardAccessIssue(issue)) {
      reasons.push({
        code: 'access_hard_blocked',
        issueId: issue.id,
        message: issue.title || issue.message,
      });
    }
  }

  const regretFromReport = (report?.issues ?? []).some(isRegretIssue);
  const regretFromTrip = shouldRequireExperienceRegretConfirmation(trip);

  if (regretFromReport || regretFromTrip) {
    reasons.push({
      code: 'experience_regret_unconfirmed',
      issueId: report?.issues.find(isRegretIssue)?.id,
      message: '出发前请确认体验底线（遗憾上界）',
    });
  }

  return {
    blocked: reasons.length > 0,
    reasons,
  };
}

export function gateExecuteBlockMessage(status: GateExecuteStatus): string {
  if (!status.blocked || status.reasons.length === 0) {
    return '';
  }
  return status.reasons.map((r) => r.message).join('；');
}

export function validatePlanningToInProgressGate(
  trip: TripDetail | null | undefined,
  report: TripFeasibilityReportDto | null | undefined,
): { allowed: boolean; message?: string } {
  const gate = computeGateExecuteStatus(report, trip);
  if (!gate.blocked) return { allowed: true };
  return {
    allowed: false,
    message: gateExecuteBlockMessage(gate) || '出发前仍有必须完成的事项，请先处理后再开始行程。',
  };
}
