/**
 * constraint-assessments 不可用（403/404）时，从 GET /executability 合成 Phase 0 视图。
 * 只读 fallback · 正式门禁仍以 assessment BFF 为准。
 */
import { tripExecutabilityApi } from '@/api/trip-executability';
import { CONSTRAINT_KEY_UI_IDS } from '@/lib/frontend-constraint-card-view.util';
import type {
  ConstraintAggregateStatus,
  ConstraintAssessmentLaneStatus,
  UnifiedConstraintAssessmentBundle,
  UnifiedConstraintAssessmentLaneView,
  UnifiedConstraintAssessmentView,
} from '@/types/frontend-constraint-assessment-api.types';
import type {
  PlanningRuleResult,
  TripExecutabilityView,
  ValidationFinding,
} from '@/types/trip-executability';

const RULE_TO_CONSTRAINT_KEY: Record<string, string> = {
  'SDR-101': 'MAX_DAILY_DRIVE',
  'SDR-202': 'NO_NIGHT_DRIVE',
  'SDR-001': 'OFFICIAL_IS_FROAD_2WD',
  'SDR-003': 'NO_UNPAVED_ROAD',
  'SDR-203': 'FIXED_APPOINTMENTS',
};

function parseDayAndMinutes(message: string): { day?: number; actual?: string } {
  const dayMatch = message.match(/第\s*(\d+)\s*日/);
  const minMatch = message.match(/(\d+)\s*min/i);
  const day = dayMatch ? Number(dayMatch[1]) : undefined;
  let actual: string | undefined;
  if (minMatch) {
    const total = Number(minMatch[1]);
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    actual = hours > 0 ? `${hours}h${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
  }
  return { day, actual };
}

function outcomeToLaneStatus(
  outcome: string | undefined,
  severity?: string,
): ConstraintAssessmentLaneStatus {
  switch (outcome) {
    case 'PASS':
      return 'PASS';
    case 'REJECT':
      return 'BLOCK';
    case 'NEED_CONFIRM':
    case 'SUGGEST_REPAIR':
      return severity === 'HIGH' || severity === 'CRITICAL' ? 'BLOCK' : 'REQUIRES_VERIFICATION';
    case 'CAUTION':
      return 'WARNING';
    default:
      return 'UNKNOWN';
  }
}

function laneFromRule(input: {
  ruleId: string;
  outcome?: string;
  severity?: string;
  message?: string;
  source?: string;
}): UnifiedConstraintAssessmentLaneView {
  const evidence = input.message ? parseDayAndMinutes(input.message) : {};
  return {
    status: outcomeToLaneStatus(input.outcome, input.severity),
    source: input.source ?? 'TEP',
    ruleId: input.ruleId,
    message: input.message,
    evidence: Object.keys(evidence).length ? evidence : undefined,
  };
}

function resolveAggregateStatus(lanes: {
  planning: UnifiedConstraintAssessmentLaneView | null;
  executability: UnifiedConstraintAssessmentLaneView | null;
}): ConstraintAggregateStatus {
  const statuses = [lanes.planning?.status, lanes.executability?.status].filter(Boolean);
  if (statuses.some((s) => s === 'BLOCK')) {
    if (lanes.executability?.status === 'BLOCK') return 'EXECUTION_BLOCK';
    return 'PLANNING_BLOCK';
  }
  if (statuses.some((s) => s === 'WARNING' || s === 'REQUIRES_VERIFICATION')) return 'WARN';
  if (statuses.every((s) => s === 'PASS')) return 'PASS';
  if (statuses.length === 0) return 'UNKNOWN';
  return 'UNKNOWN';
}

function legacyIdForConstraintKey(constraintKey: string): string | undefined {
  const uiIds = CONSTRAINT_KEY_UI_IDS[constraintKey];
  if (!uiIds?.length) return undefined;
  const preferred = uiIds.find((id) => id.startsWith('c_'));
  return preferred ?? uiIds[0];
}

function pickWorstRule(
  rules: Array<PlanningRuleResult | ValidationFinding>,
  ruleId: string,
): PlanningRuleResult | ValidationFinding | undefined {
  const matches = rules.filter((r) => r.ruleId === ruleId);
  if (!matches.length) return undefined;
  const rank = (outcome?: string) => {
    switch (outcome) {
      case 'REJECT':
        return 5;
      case 'NEED_CONFIRM':
      case 'SUGGEST_REPAIR':
        return 4;
      case 'CAUTION':
        return 3;
      case 'UNKNOWN':
        return 2;
      case 'PASS':
        return 1;
      default:
        return 0;
    }
  };
  return [...matches].sort((a, b) => rank(b.outcome) - rank(a.outcome))[0];
}

export function buildAssessmentBundleFromExecutability(
  executability: TripExecutabilityView,
): UnifiedConstraintAssessmentBundle {
  const findings = executability.assessment?.findings ?? [];
  const tepRules = executability.tepRuleResults ?? [];
  const allRules: Array<PlanningRuleResult | ValidationFinding> = [...findings, ...tepRules];

  const assessments: UnifiedConstraintAssessmentView[] = [];

  for (const [ruleId, constraintKey] of Object.entries(RULE_TO_CONSTRAINT_KEY)) {
    const hit = pickWorstRule(allRules, ruleId);
    if (!hit) continue;

    const executabilityLane = laneFromRule({
      ruleId,
      outcome: hit.outcome,
      severity: hit.severity,
      message: 'message' in hit ? hit.message : hit.explanation,
      source: 'TEP',
    });

    const lanes = {
      planning: null as UnifiedConstraintAssessmentLaneView | null,
      executability:
        executabilityLane.status === 'UNKNOWN' && hit.outcome === 'UNKNOWN'
          ? null
          : executabilityLane,
    };

    assessments.push({
      constraintKey,
      legacyConstraintId: legacyIdForConstraintKey(constraintKey),
      aggregateStatus: resolveAggregateStatus(lanes),
      lanes,
    });
  }

  return {
    tripId: executability.tripId,
    assessedAt: executability.assessment?.evaluatedAt,
    assessments,
  };
}

export async function fetchConstraintAssessmentsWithExecutabilityFallback(
  tripId: string,
  options?: { refresh?: boolean },
): Promise<UnifiedConstraintAssessmentBundle | null> {
  try {
    const { fetchConstraintAssessments } = await import(
      '@/api/frontend-travel-decision-contract-api-client'
    );
    return await fetchConstraintAssessments(tripId, options);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status !== 403 && status !== 404 && status !== 501) throw err;
  }

  try {
    const executability = await tripExecutabilityApi.getExecutability(tripId, options);
    const bundle = buildAssessmentBundleFromExecutability(executability);
    return bundle.assessments.length ? bundle : null;
  } catch {
    return null;
  }
}
