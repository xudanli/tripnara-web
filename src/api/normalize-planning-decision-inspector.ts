import { normalizePlanningCausalChain } from '@/api/normalize-planning-causal-chain';
import { normalizePlanningDecisionBasis } from '@/api/normalize-planning-decision-basis';
import type {
  PlanningDecisionInspector,
  PlanningDecisionInspectorFeasibility,
  PlanningDecisionInspectorGateCheck,
  PlanningDecisionInspectorImpactTag,
  PlanningDecisionInspectorMemberConsensus,
  PlanningDecisionInspectorMemberOpinion,
  PlanningDecisionInspectorPlanDiff,
  PlanningDecisionInspectorPlanDiffRow,
  PlanningDecisionInspectorTabEmptyState,
  PlanningDecisionInspectorTimelineCompare,
  PlanningDecisionInspectorTimelineMilestone,
} from '@/dto/frontend-planning-decision-inspector.types';

function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function peelInspectorPayload(raw: unknown): Record<string, unknown> {
  const record = readRecord(raw);
  if (!record) return {};

  if (asString(record.schema)?.includes('planning_decision_inspector')) return record;

  const nested = readRecord(record.data);
  if (nested && asString(nested.schema)?.includes('planning_decision_inspector')) return nested;

  const inspector = readRecord(record.decisionInspector ?? record.decision_inspector);
  if (inspector) return inspector;

  return record;
}

function normalizeChangeRow(raw: unknown, index: number): PlanningDecisionInspectorPlanDiffRow | null {
  const record = readRecord(raw);
  if (!record) return null;
  const itemLabel = asString(record.itemLabel ?? record.item_label ?? record.label);
  const before = asString(record.before);
  const after = asString(record.after);
  const deltaLabel = asString(record.deltaLabel ?? record.delta_label ?? record.delta);
  if (!itemLabel || !before || !after || !deltaLabel) return null;
  return {
    id: asString(record.id) ?? `row_${index}`,
    itemLabel,
    before,
    after,
    deltaLabel,
    deltaMinutes: asNumber(record.deltaMinutes ?? record.delta_minutes),
  };
}

function normalizeImpactTag(raw: unknown, index: number): PlanningDecisionInspectorImpactTag | null {
  const record = readRecord(raw);
  if (!record) return null;
  const label = asString(record.label);
  if (!label) return null;
  return {
    id: asString(record.id) ?? `tag_${index}`,
    label,
    tone: (asString(record.tone) ?? 'muted') as PlanningDecisionInspectorImpactTag['tone'],
  };
}

function normalizeMilestone(raw: unknown, index: number): PlanningDecisionInspectorTimelineMilestone | null {
  const record = readRecord(raw);
  if (!record) return null;
  const label = asString(record.label);
  const originalTime = asString(record.originalTime ?? record.original_time ?? record.before);
  const newTime = asString(record.newTime ?? record.new_time ?? record.after);
  if (!label || !originalTime || !newTime) return null;
  return {
    id: asString(record.id) ?? `ms_${index}`,
    label,
    originalTime,
    newTime,
    deltaMinutes: asNumber(record.deltaMinutes ?? record.delta_minutes),
    durationAfterMinutes: asNumber(record.durationAfterMinutes ?? record.duration_after_minutes),
    originalDurationAfterMinutes: asNumber(
      record.originalDurationAfterMinutes ?? record.original_duration_after_minutes,
    ),
  };
}

function normalizePlanDiff(raw: unknown): PlanningDecisionInspectorPlanDiff | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;

  const changeRows = (Array.isArray(record.changeRows ?? record.change_rows) ? record.changeRows ?? record.change_rows : [])
    .map(normalizeChangeRow)
    .filter(Boolean) as PlanningDecisionInspectorPlanDiffRow[];

  const impactTags = (Array.isArray(record.impactTags ?? record.impact_tags) ? record.impactTags ?? record.impact_tags : [])
    .map(normalizeImpactTag)
    .filter(Boolean) as PlanningDecisionInspectorImpactTag[];

  const unchangedItems = Array.isArray(record.unchangedItems ?? record.unchanged_items)
    ? (record.unchangedItems ?? record.unchanged_items).map(String).filter(Boolean)
    : [];

  const timelineRaw = readRecord(record.timelineCompare ?? record.timeline_compare);
  let timelineCompare: PlanningDecisionInspectorTimelineCompare | undefined;
  if (timelineRaw) {
    const milestones = (Array.isArray(timelineRaw.milestones) ? timelineRaw.milestones : [])
      .map(normalizeMilestone)
      .filter(Boolean) as PlanningDecisionInspectorTimelineMilestone[];
    timelineCompare = {
      milestones,
      bannerText: asString(timelineRaw.bannerText ?? timelineRaw.banner_text),
      summary: asString(timelineRaw.summary),
    };
  }

  if (!changeRows.length && !impactTags.length && !unchangedItems.length && !timelineCompare) {
    return undefined;
  }

  return {
    optionBadge: asString(record.optionBadge ?? record.option_badge),
    optionTitle: asString(record.optionTitle ?? record.option_title),
    changeRows,
    impactTags,
    unchangedItems,
    timelineCompare,
  };
}

function normalizeOpinion(raw: unknown, index: number): PlanningDecisionInspectorMemberOpinion | null {
  const record = readRecord(raw);
  if (!record) return null;
  const displayName = asString(record.displayName ?? record.display_name ?? record.name);
  if (!displayName) return null;
  return {
    id: asString(record.id ?? record.memberId ?? record.member_id) ?? `op_${index}`,
    displayName,
    stance: (asString(record.stance) ?? 'neutral') as PlanningDecisionInspectorMemberOpinion['stance'],
    comment: asString(record.comment ?? record.summary),
  };
}

function normalizeMemberConsensus(raw: unknown): PlanningDecisionInspectorMemberConsensus | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;

  const opinions = (Array.isArray(record.opinions) ? record.opinions : [])
    .map(normalizeOpinion)
    .filter(Boolean) as PlanningDecisionInspectorMemberOpinion[];

  const aiSummary = Array.isArray(record.aiSummary ?? record.ai_summary)
    ? (record.aiSummary ?? record.ai_summary).map(String).filter(Boolean)
    : [];

  const assessmentRaw = readRecord(record.assessment);
  const assessment = assessmentRaw
    ? {
        supportPercent: asNumber(assessmentRaw.supportPercent ?? assessmentRaw.support_percent),
        statusMessage: asString(assessmentRaw.statusMessage ?? assessmentRaw.status_message),
        canCreatorConfirm: asBool(assessmentRaw.canCreatorConfirm ?? assessmentRaw.can_creator_confirm, true),
      }
    : undefined;

  if (!opinions.length && !aiSummary.length && !asString(record.summaryBar ?? record.summary_bar)) {
    return undefined;
  }

  return {
    summaryBar: asString(record.summaryBar ?? record.summary_bar),
    supportCount: asNumber(record.supportCount ?? record.support_count),
    objectionCount: asNumber(record.objectionCount ?? record.objection_count),
    pendingCount: asNumber(record.pendingCount ?? record.pending_count),
    opinions,
    aiSummary,
    assessment,
  };
}

function normalizeGateCheck(raw: unknown, index: number): PlanningDecisionInspectorGateCheck | null {
  const record = readRecord(raw);
  if (!record) return null;
  const label = asString(record.label);
  if (!label) return null;
  const statusRaw = asString(record.status)?.toLowerCase() ?? 'pass';
  return {
    id: asString(record.id) ?? `gate_${index}`,
    label,
    status: statusRaw as PlanningDecisionInspectorGateCheck['status'],
  };
}

function normalizeFeasibility(raw: unknown): PlanningDecisionInspectorFeasibility | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;

  const gateChecks = (Array.isArray(record.gateChecks ?? record.gate_checks) ? record.gateChecks ?? record.gate_checks : [])
    .map(normalizeGateCheck)
    .filter(Boolean) as PlanningDecisionInspectorGateCheck[];

  const executionSummary = (Array.isArray(record.executionSummary ?? record.execution_summary)
    ? record.executionSummary ?? record.execution_summary
    : []
  )
    .map((item, index) => {
      const row = readRecord(item);
      if (!row) return null;
      const label = asString(row.label);
      const value = asString(row.value);
      if (!label || !value) return null;
      return {
        id: asString(row.id) ?? `exec_${index}`,
        label,
        value,
        icon: asString(row.icon),
      };
    })
    .filter(Boolean) as PlanningDecisionInspectorFeasibility['executionSummary'];

  const validityRaw = readRecord(record.validityWarning ?? record.validity_warning);
  const verdictRaw = readRecord(record.verdict);

  if (!gateChecks.length && !asString(record.headline) && !verdictRaw) {
    return undefined;
  }

  return {
    canSafelyWrite: asBool(record.canSafelyWrite ?? record.can_safely_write, true),
    headline: asString(record.headline),
    optionBadge: asString(record.optionBadge ?? record.option_badge),
    optionTitle: asString(record.optionTitle ?? record.option_title),
    gateChecks,
    validityWarning: validityRaw
      ? {
          message: asString(validityRaw.message),
          retriggerCondition: asString(
            validityRaw.retriggerCondition ?? validityRaw.retrigger_condition,
          ),
        }
      : undefined,
    executionSummary,
    verdict: verdictRaw
      ? {
          status: (asString(verdictRaw.status) ?? 'feasible') as PlanningDecisionInspectorFeasibility['verdict'] extends infer V
            ? V extends { status: infer S }
              ? S
              : never
            : never,
          message: asString(verdictRaw.message) ?? '',
          subtext: asString(verdictRaw.subtext),
        }
      : undefined,
  };
}

function normalizeTabEmptyState(raw: unknown): PlanningDecisionInspectorTabEmptyState | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;
  return {
    causalChain: asBool(record.causalChain ?? record.causal_chain, false),
    planDiff: asBool(record.planDiff ?? record.plan_diff, false),
    memberConsensus: asBool(record.memberConsensus ?? record.member_consensus, false),
    feasibility: asBool(record.feasibility, false),
  };
}

export function normalizePlanningDecisionInspector(
  raw: unknown,
  tripId: string,
): PlanningDecisionInspector {
  const record = peelInspectorPayload(raw);
  const proposalId = asString(record.proposalId ?? record.proposal_id);
  const problemId = asString(record.problemId ?? record.problem_id);

  const basisRaw = record.decisionBasis ?? record.decision_basis;
  const causalRaw = record.causalChain ?? record.causal_chain;
  const tabEmptyRaw = readRecord(record.tabEmptyState ?? record.tab_empty_state);

  return {
    schema: (asString(record.schema) ?? 'tripnara.planning_decision_inspector@v1') as PlanningDecisionInspector['schema'],
    tripId: asString(record.tripId ?? record.trip_id) ?? tripId,
    mode: asString(record.mode) as PlanningDecisionInspector['mode'],
    proposalId,
    problemId,
    optionId: asString(record.optionId ?? record.option_id),
    conflictId: asString(record.conflictId ?? record.conflict_id),
    tabEmptyState: normalizeTabEmptyState(tabEmptyRaw),
    refreshUrl: asString(record.refreshUrl ?? record.refresh_url),
    decisionBasis: basisRaw
      ? normalizePlanningDecisionBasis(basisRaw, tripId)
      : undefined,
    causalChain: causalRaw
      ? normalizePlanningCausalChain(causalRaw, tripId)
      : undefined,
    planDiff: normalizePlanDiff(record.planDiff ?? record.plan_diff),
    memberConsensus: normalizeMemberConsensus(record.memberConsensus ?? record.member_consensus),
    feasibility: normalizeFeasibility(record.feasibility),
  };
}
