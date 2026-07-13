import { normalizeAttractionExploreCandidates } from './normalize-attraction-explore';
import {
  normalizeArrangeLodgingSuggestions,
  readLodgingStandardFromRecord,
} from './normalize-arrange-itinerary-lodging';
import {
  normalizePlanningDecisionClusterSummary,
  normalizePlanningDecisionExecutionSteps,
  normalizePlanningDecisionPack,
  normalizePlanningDecisionPackOption,
  normalizePlanningProposalMonitor,
} from './normalize-planning-decision-pack';
import type {
  ArrangeItineraryAutoArrangeResult,
  ArrangeItineraryDirectAutoArrangeResponse,
  ArrangeItineraryDirectItemResponse,
  ArrangeItineraryDirectPlaceResponse,
  ArrangeItineraryProposalWriteResponse,
  ArrangeItemLockEntry,
  ArrangeItemLocksResponse,
  ArrangeOrchestrationState,
  PlanProposal,
  PlanProposalDiff,
  PlanProposalValidation,
} from '@/types/arrange-itinerary';
import type { ItineraryItemDetail } from '@/types/trip';
import type { ScheduleTimelineResponse } from '@/types/schedule-timeline';

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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item)).filter((n) => Number.isFinite(n));
}

export function normalizeOrchestrationState(data: unknown): ArrangeOrchestrationState {
  const record = readRecord(data) ?? {};
  return {
    tripId: String(record.tripId ?? ''),
    phase: (asString(record.phase) ?? 'IDLE') as ArrangeOrchestrationState['phase'],
    activeProposalId: asString(record.activeProposalId ?? record.active_proposal_id) ?? null,
    contextVersion: asNumber(record.contextVersion ?? record.context_version) ?? 0,
    message: asString(record.message),
    updatedAt: asString(record.updatedAt ?? record.updated_at),
  };
}

function normalizeValidation(raw: unknown): PlanProposalValidation {
  const record = readRecord(raw) ?? {};
  const conflictsRaw = Array.isArray(record.conflicts) ? record.conflicts : [];
  return {
    status: (asString(record.status) ?? 'PASS') as PlanProposalValidation['status'],
    warnings: asStringArray(record.warnings),
    conflicts: conflictsRaw
      .map((item) => {
        const conflict = readRecord(item);
        if (!conflict) return null;
        const message = asString(conflict.message);
        if (!message) return null;
        return {
          kind: asString(conflict.kind) ?? 'unknown',
          message,
          dayIndex: asNumber(conflict.dayIndex ?? conflict.day_index),
          itemIds: asStringArray(conflict.itemIds ?? conflict.item_ids),
        };
      })
      .filter(Boolean) as PlanProposalValidation['conflicts'],
  };
}

function normalizeDiff(raw: unknown): PlanProposalDiff {
  const record = readRecord(raw) ?? {};
  const timelineRaw = Array.isArray(record.timelineChanges ?? record.timeline_changes)
    ? (record.timelineChanges ?? record.timeline_changes)
    : [];
  return {
    summary: asString(record.summary) ?? '行程将发生变化',
    timelineChanges: timelineRaw
      .map((item) => {
        const change = readRecord(item);
        if (!change) return null;
        const label = asString(change.label);
        if (!label) return null;
        return {
          operation: asString(change.operation) ?? 'CHANGE',
          label,
          dayIndex: asNumber(change.dayIndex ?? change.day_index),
          impact: asString(change.impact),
        };
      })
      .filter(Boolean) as PlanProposalDiff['timelineChanges'],
  };
}

export function normalizePlanProposal(data: unknown): PlanProposal {
  const record = readRecord(data) ?? {};
  const changesRaw = Array.isArray(record.changes) ? record.changes : [];
  return {
    proposalId: String(record.proposalId ?? record.proposal_id ?? ''),
    tripId: String(record.tripId ?? record.trip_id ?? ''),
    intent: (asString(record.intent) ?? 'PLACE_CANDIDATE') as PlanProposal['intent'],
    basePlanVersion: asNumber(record.basePlanVersion ?? record.base_plan_version) ?? 0,
    contextVersion: asNumber(record.contextVersion ?? record.context_version) ?? 0,
    affectedDays: asNumberArray(record.affectedDays ?? record.affected_days),
    changes: changesRaw
      .map((item) => {
        const change = readRecord(item);
        if (!change) return null;
        return {
          operation: asString(change.operation) ?? 'CHANGE',
          candidateId: asString(change.candidateId ?? change.candidate_id),
          placeId: asNumber(change.placeId ?? change.place_id),
          dayIndex: asNumber(change.dayIndex ?? change.day_index),
          startTime: asString(change.startTime ?? change.start_time),
          endTime: asString(change.endTime ?? change.end_time),
          label: asString(change.label),
          removeFromCandidates:
            change.removeFromCandidates === true || change.remove_from_candidates === true,
        };
      })
      .filter(Boolean) as PlanProposal['changes'],
    benefits: readRecord(record.benefits) ?? undefined,
    tradeoffs: asStringArray(record.tradeoffs),
    validation: normalizeValidation(record.validation),
    diff: normalizeDiff(record.diff),
    requiresConfirmation:
      record.requiresConfirmation === true ||
      record.requires_confirmation === true ||
      true,
    status: asString(record.status) ?? 'AWAITING_CONFIRMATION',
    createdAt: asString(record.createdAt ?? record.created_at),
    expiresAt: asString(record.expiresAt ?? record.expires_at),
    decisionPack: normalizePlanningDecisionPack(record.decisionPack ?? record.decision_pack),
  };
}

export function normalizeProposalWriteResponse(
  data: unknown,
): ArrangeItineraryProposalWriteResponse {
  const record = readRecord(data) ?? {};
  const orchestrationRaw = record.orchestrationState ?? record.orchestration_state;
  const proposalRaw = record.proposal;
  return {
    mode: 'proposal',
    tripId: String(record.tripId ?? ''),
    orchestrationState: normalizeOrchestrationState(orchestrationRaw ?? record),
    proposal: normalizePlanProposal(proposalRaw ?? record),
    answer: asString(record.answer),
    suggestedActions: Array.isArray(record.suggestedActions)
      ? record.suggestedActions.map((item) => {
          const action = readRecord(item) ?? {};
          return {
            action: asString(action.action) ?? '',
            label: asString(action.label) ?? '',
            previewId: asString(action.previewId ?? action.preview_id),
          };
        })
      : undefined,
  };
}

function parseWriteMode(record: Record<string, unknown>): 'proposal' | 'direct' {
  const mode = asString(record.mode);
  if (mode === 'proposal' || record.proposal != null) return 'proposal';
  return 'direct';
}

export function normalizePlaceCandidateResponse(data: unknown) {
  const record = readRecord(data) ?? {};
  if (parseWriteMode(record) === 'proposal') {
    return normalizeProposalWriteResponse(record);
  }
  const candidatesRaw = record.candidates;
  const direct: ArrangeItineraryDirectPlaceResponse = {
    mode: 'direct',
    tripId: String(record.tripId ?? ''),
    itineraryItem: record.itineraryItem as ItineraryItemDetail,
    scheduleTimeline: record.scheduleTimeline as ScheduleTimelineResponse | undefined,
    candidates: candidatesRaw
      ? normalizeAttractionExploreCandidates(candidatesRaw)
      : undefined,
  };
  return direct;
}

export function normalizeItemMutationResponse(data: unknown) {
  const record = readRecord(data) ?? {};
  if (parseWriteMode(record) === 'proposal') {
    return normalizeProposalWriteResponse(record);
  }
  const direct: ArrangeItineraryDirectItemResponse = {
    mode: 'direct',
    tripId: String(record.tripId ?? ''),
    itineraryItem: record.itineraryItem as ItineraryItemDetail,
    scheduleTimeline: record.scheduleTimeline as ScheduleTimelineResponse | undefined,
  };
  return direct;
}

export function normalizeAutoArrangeResponse(data: unknown): ArrangeItineraryAutoArrangeResult {
  const record = readRecord(data) ?? {};
  if (parseWriteMode(record) === 'proposal') {
    return normalizeProposalWriteResponse(record);
  }
  const itemCount = asNumber(record.itemCount ?? record.item_count);
  const status = asString(record.status);
  const message = asString(record.message);
  const direct: ArrangeItineraryDirectAutoArrangeResponse = {
    mode: 'direct',
    tripId: asString(record.tripId),
    taskId: asString(record.taskId ?? record.task_id),
    status,
    itemCount,
    message:
      message ??
      (itemCount != null
        ? `已编排 ${itemCount} 个景点`
        : status === 'completed'
          ? '自动编排已完成'
          : '已提交自动编排'),
  };
  return direct;
}

export function normalizeAiActionResponse(data: unknown) {
  const record = readRecord(data) ?? {};
  if (parseWriteMode(record) === 'proposal') {
    return normalizeProposalWriteResponse(record);
  }
  return {
    mode: 'direct' as const,
    action: (asString(record.action) ?? 'fill_gaps') as 'fill_gaps',
    answer: asString(record.answer) ?? '',
    suggestedActions: Array.isArray(record.suggestedActions)
      ? record.suggestedActions.map((item) => {
          const action = readRecord(item) ?? {};
          return {
            action: asString(action.action) ?? '',
            label: asString(action.label) ?? '',
            previewId: asString(action.previewId ?? action.preview_id),
          };
        })
      : undefined,
    preview: readRecord(record.preview) as {
      scheduleRevision?: number;
      changedItemIds?: string[];
    },
  };
}

function normalizeItemLockEntry(raw: unknown): ArrangeItemLockEntry | null {
  const record = readRecord(raw);
  if (!record) return null;
  const itemId = asString(record.itemId ?? record.item_id ?? record.id);
  if (!itemId) return null;
  return {
    itemId,
    label: asString(record.label),
    dayIndex: asNumber(record.dayIndex ?? record.day_index),
    reason: asString(record.reason),
  };
}

function normalizeItemLockList(raw: unknown): ArrangeItemLockEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => normalizeItemLockEntry(item))
    .filter(Boolean) as ArrangeItemLockEntry[];
}

export function normalizeItemLocks(data: unknown): ArrangeItemLocksResponse {
  const record = readRecord(data) ?? {};
  return {
    tripId: String(record.tripId ?? record.trip_id ?? ''),
    lockedItems: normalizeItemLockList(record.lockedItems ?? record.locked_items),
    semiLockedItems: normalizeItemLockList(record.semiLockedItems ?? record.semi_locked_items),
    mustVisitItems: normalizeItemLockList(record.mustVisitItems ?? record.must_visit_items),
    movableItems: normalizeItemLockList(record.movableItems ?? record.movable_items),
  };
}

function normalizeCopilotActionHint(
  raw: unknown,
): import('@/types/arrange-itinerary').CopilotActionHint | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;
  const type = asString(record.type ?? record.action);
  if (!type) return undefined;
  return {
    type,
    label: asString(record.label),
    placeId: record.placeId ?? record.place_id ?? undefined,
    candidateId: asString(record.candidateId ?? record.candidate_id),
    dayIndex: asNumber(record.dayIndex ?? record.day_index) ?? undefined,
    itemId: asString(record.itemId ?? record.item_id),
    proposalId: asString(record.proposalId ?? record.proposal_id),
  };
}

function normalizeCopilotSuggestion(
  raw: unknown,
): import('@/types/arrange-itinerary').CopilotSuggestion | null {
  const record = readRecord(raw);
  if (!record) return null;
  const id = asString(record.id);
  const kind = asString(record.kind);
  const title = asString(record.title);
  const message = asString(record.message);
  if (!id || !kind || !title || !message) return null;
  const severity = asString(record.severity);
  return {
    id,
    kind: kind as import('@/types/arrange-itinerary').CopilotSuggestionKind,
    title,
    message,
    severity:
      severity === 'info' || severity === 'warn' || severity === 'action' ? severity : undefined,
    actionHint: normalizeCopilotActionHint(record.actionHint ?? record.action_hint),
    option:
      normalizePlanningDecisionPackOption(record.option) ??
      normalizePlanningDecisionPackOption(record.decisionOption ?? record.decision_option) ??
      undefined,
  };
}

export function normalizeCopilotSuggestions(
  data: unknown,
): import('@/types/arrange-itinerary').CopilotSuggestionsResponse {
  const record = readRecord(data) ?? {};
  const listRaw = Array.isArray(record.suggestions) ? record.suggestions : [];
  return {
    tripId: String(record.tripId ?? record.trip_id ?? ''),
    suggestions: listRaw
      .map((item) => normalizeCopilotSuggestion(item))
      .filter(Boolean) as import('@/types/arrange-itinerary').CopilotSuggestion[],
    generatedAt: asString(record.generatedAt ?? record.generated_at),
  };
}

function normalizeItemLocksSummary(
  raw: unknown,
): import('@/types/arrange-itinerary').PlanningWorkbenchItemLocksSummary | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;
  return {
    lockedCount: asNumber(record.lockedCount ?? record.locked_count) ?? 0,
    semiLockedCount: asNumber(record.semiLockedCount ?? record.semi_locked_count) ?? 0,
    mustVisitCount: asNumber(record.mustVisitCount ?? record.must_visit_count) ?? 0,
    movableCount: asNumber(record.movableCount ?? record.movable_count) ?? 0,
  };
}

/** BFF planning-workbench-snapshot → 编排/探索共享轮询快照 */
export function normalizePlanningWorkbenchSnapshot(
  data: unknown,
): import('@/types/arrange-itinerary').PlanningWorkbenchSnapshot {
  const record = readRecord(data) ?? {};
  const overviewRaw = readRecord(record.overview);
  const suggestionsRaw = Array.isArray(record.copilotSuggestions)
    ? record.copilotSuggestions
    : Array.isArray(record.copilot_suggestions)
      ? record.copilot_suggestions
      : Array.isArray(record.topCopilotSuggestions)
        ? record.topCopilotSuggestions
        : [];

  const modeRaw = asString(record.planningMode ?? record.planning_mode) ?? 'copilot';
  const planningMode =
    modeRaw === 'manual' || modeRaw === 'copilot' ? modeRaw : 'copilot';

  const copilotRecord = readRecord(record.copilot);
  const clustersRaw = Array.isArray(record.decisionClusters)
    ? record.decisionClusters
    : Array.isArray(record.decision_clusters)
      ? record.decision_clusters
      : Array.isArray(copilotRecord?.decisionClusters)
        ? copilotRecord.decisionClusters
        : Array.isArray(copilotRecord?.decision_clusters)
          ? copilotRecord.decision_clusters
          : [];

  return {
    tripId: String(record.tripId ?? record.trip_id ?? ''),
    planningMode,
    orchestrationState: normalizeOrchestrationState(
      record.orchestrationState ?? record.orchestration_state ?? record,
    ),
    overview: overviewRaw
      ? {
          dayCount: asNumber(overviewRaw.dayCount ?? overviewRaw.day_count) ?? 0,
          nights: asNumber(overviewRaw.nights) ?? 0,
          activityCount: asNumber(overviewRaw.activityCount ?? overviewRaw.activity_count) ?? 0,
          totalDriveMinutes:
            asNumber(overviewRaw.totalDriveMinutes ?? overviewRaw.total_drive_minutes) ?? 0,
          totalDistanceKm:
            asNumber(overviewRaw.totalDistanceKm ?? overviewRaw.total_distance_km) ?? 0,
          routeSpanKm: asNumber(overviewRaw.routeSpanKm ?? overviewRaw.route_span_km) ?? 0,
          unplacedCandidateCount:
            asNumber(
              overviewRaw.unplacedCandidateCount ?? overviewRaw.unplaced_candidate_count,
            ) ?? 0,
          ...(() => {
            const lodgingSuggestions = normalizeArrangeLodgingSuggestions(
              overviewRaw.lodgingSuggestions ?? overviewRaw.lodging_suggestions,
            );
            const standard = readLodgingStandardFromRecord(overviewRaw);
            return {
              ...(lodgingSuggestions.length > 0 ? { lodgingSuggestions } : {}),
              ...(standard.stars != null ? { accommodationStandardStars: standard.stars } : {}),
              ...(standard.label ? { accommodationStandardLabel: standard.label } : {}),
            };
          })(),
        }
      : undefined,
    itemLocksSummary: normalizeItemLocksSummary(
      record.itemLocksSummary ?? record.item_locks_summary ?? record.itemLocks ?? record.item_locks,
    ),
    conflictCount: asNumber(record.conflictCount ?? record.conflict_count) ?? undefined,
    copilotSuggestions: suggestionsRaw
      .map((item) => normalizeCopilotSuggestion(item))
      .filter(Boolean) as import('@/types/arrange-itinerary').CopilotSuggestion[],
    decisionClusters: clustersRaw
      .map(normalizePlanningDecisionClusterSummary)
      .filter(Boolean) as import('@/types/arrange-itinerary').PlanningWorkbenchSnapshot['decisionClusters'],
    pendingProposalCount:
      asNumber(record.pendingProposalCount ?? record.pending_proposal_count) ?? undefined,
    updatedAt: asString(record.updatedAt ?? record.updated_at),
    ...(() => {
      const lodgingSuggestions = normalizeArrangeLodgingSuggestions(
        record.lodgingSuggestions ?? record.lodging_suggestions,
      );
      const standard = readLodgingStandardFromRecord(record);
      return {
        ...(lodgingSuggestions.length > 0 ? { lodgingSuggestions } : {}),
        ...(standard.stars != null ? { accommodationStandardStars: standard.stars } : {}),
        ...(standard.label ? { accommodationStandardLabel: standard.label } : {}),
      };
    })(),
  };
}

export function normalizeCopilotActionResponse(
  data: unknown,
): import('@/types/arrange-itinerary').CopilotActionResult {
  return normalizeProposalWriteResponse(data);
}
