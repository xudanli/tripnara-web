import apiClient from './client';
import { readinessApi } from '@/api/readiness';
import {
  assertFeasibilityApplyRepairAllowed,
  coerceWriteChainBlockedError,
  EffectivePlanWriteChainRequiredError,
  shouldBlockDirectEffectivePlanWrite,
} from '@/lib/effective-plan-write-chain.util';
import type { RepairOption } from '@/types/readiness';
import type {
  ApplyRepairResponse,
  FeasibilityRepairOptionsResponse,
  PreviewRepairResponse,
} from '@/types/feasibility-repair';
import type {
  FeasibilityRepairActionType,
  FeasibilityRepairOptionDto,
} from '@/types/trip-feasibility-report';
import { normalizeGuardianNegotiationResult } from '@/lib/readiness-guardian-negotiation.util';
import { normalizeCascadeUiHints } from '@/lib/readiness-cascade.util';
import { extractGuardianPresentation } from '@/lib/guardian-presentation.util';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function normalizeStringList(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw.map(String).map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
}

function normalizeDeferredGuardianFields(raw: Record<string, unknown>) {
  return {
    humanDecisionPointsFlat: normalizeStringList(
      raw.humanDecisionPointsFlat ?? raw.human_decision_points_flat,
    ),
    presentation: extractGuardianPresentation(raw),
  };
}

function unwrapData<T>(response: { data: ApiResponseWrapper<T> }): T | null {
  if (response?.data?.success && response.data.data != null) {
    return response.data.data;
  }
  return null;
}

function isNotImplemented(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501;
}

function mapRepairImpactSummary(impact: unknown): string | undefined {
  if (typeof impact === 'string') {
    if (impact === 'high') return '影响较大';
    if (impact === 'medium') return '影响中等';
    if (impact === 'low') return '影响较小';
    return impact;
  }
  return undefined;
}

function normalizeRepairPayload(raw: unknown): FeasibilityRepairOptionDto['payload'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const p = raw as Record<string, unknown>;
  const scopeRaw = (p.validateScope ?? p.validate_scope) as Record<string, unknown> | undefined;
  const suggestedRaw = p.suggestedValue ?? p.suggested_value;

  return {
    itemId: (p.itemId ?? p.item_id) as string | undefined,
    field: p.field as 'startTime' | 'endTime' | undefined,
    suggestedValue:
      typeof suggestedRaw === 'string' || (suggestedRaw && typeof suggestedRaw === 'object')
        ? (suggestedRaw as string | { dayNumber?: number })
        : undefined,
    targetDayNumber:
      p.targetDayNumber != null || p.target_day_number != null
        ? Number(p.targetDayNumber ?? p.target_day_number)
        : undefined,
    strategy: (p.strategy as string | undefined) ?? undefined,
    segmentId: (p.segmentId ?? p.segment_id) as string | undefined,
    fromItemId: (p.fromItemId ?? p.from_item_id) as string | undefined,
    toItemId: (p.toItemId ?? p.to_item_id) as string | undefined,
    validateScope: scopeRaw
      ? {
          type: String(scopeRaw.type ?? 'issue') as 'issue' | 'day' | 'trip' | 'route',
          issueId: (scopeRaw.issueId ?? scopeRaw.issue_id) as string | undefined,
          dayNumber:
            scopeRaw.dayNumber != null || scopeRaw.day_number != null
              ? Number(scopeRaw.dayNumber ?? scopeRaw.day_number)
              : undefined,
          segmentId: (scopeRaw.segmentId ?? scopeRaw.segment_id) as string | undefined,
        }
      : undefined,
  };
}

function mapRepairOption(
  o: RepairOption | FeasibilityRepairOptionDto | Record<string, unknown>,
): FeasibilityRepairOptionDto {
  const r = o as Record<string, unknown>;
  const id = String(r.id ?? '');
  return {
    id,
    label: String(r.label ?? r.title ?? r.description ?? id),
    description: (r.description as string | undefined) ?? undefined,
    impactSummary:
      mapRepairImpactSummary(r.impact) ??
      (r.timeEstimate as string | undefined) ??
      (r.time_estimate as string | undefined) ??
      (typeof r.impact === 'string' ? r.impact : undefined),
    actionType: (r.actionType ?? r.action_type) as FeasibilityRepairActionType | undefined,
    payload: normalizeRepairPayload(r.payload) ?? (r.payload as FeasibilityRepairOptionDto['payload']),
    metadata: (r.metadata as Record<string, unknown> | undefined) ?? undefined,
  };
}

function normalizePreviewRepair(raw: Record<string, unknown>): PreviewRepairResponse {
  const guardianRaw = raw.guardianNegotiation ?? raw.guardian_negotiation;
  const itineraryDiffRaw = (raw.itineraryDiff ?? raw.itinerary_diff ?? []) as Record<string, unknown>[];
  const optionRaw = raw.option as FeasibilityRepairOptionDto | RepairOption | undefined;
  const impactRaw = (raw.impact ?? {}) as Record<string, unknown>;

  return {
    issueId: (raw.issueId ?? raw.issue_id) as string | undefined,
    optionId: String(raw.optionId ?? raw.option_id ?? ''),
    actionType: String(raw.actionType ?? raw.action_type ?? ''),
    previewMode: (raw.previewMode ?? raw.preview_mode ?? 'heuristic') as PreviewRepairResponse['previewMode'],
    status: (raw.status ?? 'preview') as PreviewRepairResponse['status'],
    message: String(raw.message ?? ''),
    before: normalizeDaySnapshot(raw.before),
    after: normalizeDaySnapshot(raw.after),
    itineraryDiff: itineraryDiffRaw.map(normalizeDiffEntry),
    impact: {
      feasibilityScoreBefore: Number(
        impactRaw.feasibilityScoreBefore ?? impactRaw.feasibility_score_before ?? 0,
      ),
      feasibilityScoreAfter:
        impactRaw.feasibilityScoreAfter != null || impactRaw.feasibility_score_after != null
          ? Number(impactRaw.feasibilityScoreAfter ?? impactRaw.feasibility_score_after)
          : undefined,
      estimated: Boolean(impactRaw.estimated ?? true),
    },
    wouldDefer: Boolean(raw.wouldDefer ?? raw.would_defer),
    guardianNegotiation: normalizeGuardianNegotiationResult(guardianRaw) ?? undefined,
    cascadeUiHints: normalizeCascadeUiHints(raw.cascadeUiHints ?? raw.cascade_ui_hints),
    causalPreAnalysis:
      (raw.causalPreAnalysis ?? raw.causal_pre_analysis) as PreviewRepairResponse['causalPreAnalysis'],
    option: optionRaw ? mapRepairOption(optionRaw) : { id: String(raw.optionId ?? ''), label: '' },
    ...normalizeDeferredGuardianFields(raw),
  };
}

function normalizeDaySnapshot(raw: unknown): PreviewRepairResponse['before'] {
  const d = (raw ?? {}) as Record<string, unknown>;
  return {
    dayNumber: Number(d.dayNumber ?? d.day_number ?? 0),
    itemCount: Number(d.itemCount ?? d.item_count ?? 0),
    totalItemCount: Number(d.totalItemCount ?? d.total_item_count ?? 0),
    highlights: Array.isArray(d.highlights) ? d.highlights.map(String) : [],
  };
}

function normalizeDiffEntry(raw: Record<string, unknown>): PreviewRepairResponse['itineraryDiff'][number] {
  const before = raw.before as Record<string, unknown> | undefined;
  const after = raw.after as Record<string, unknown> | undefined;
  return {
    slotId: String(raw.slotId ?? raw.slot_id ?? ''),
    changeType: String(raw.changeType ?? raw.change_type ?? 'title_changed') as PreviewRepairResponse['itineraryDiff'][number]['changeType'],
    dayNumber: Number(raw.dayNumber ?? raw.day_number ?? 0),
    before: before
      ? {
          title: before.title as string | undefined,
          time: (before.time ?? before.startTime) as string | undefined,
          endTime: (before.endTime ?? before.end_time) as string | undefined,
          dayNumber: before.dayNumber != null ? Number(before.dayNumber) : undefined,
        }
      : undefined,
    after: after
      ? {
          title: after.title as string | undefined,
          time: (after.time ?? after.startTime) as string | undefined,
          endTime: (after.endTime ?? after.end_time) as string | undefined,
          dayNumber: after.dayNumber != null ? Number(after.dayNumber) : undefined,
        }
      : undefined,
  };
}

function normalizeApplyRepair(raw: Record<string, unknown>): ApplyRepairResponse {
  const guardianRaw = raw.guardianNegotiation ?? raw.guardian_negotiation;
  const metadata = raw.metadata as ApplyRepairResponse['metadata'] | undefined;
  const success = raw.success;
  let status = (raw.status ?? 'applied') as ApplyRepairResponse['status'];
  if (!raw.status && success === true) status = 'applied';
  if (!raw.status && success === false) status = 'deferred';

  return {
    status,
    message: String(raw.message ?? ''),
    actionType: String(raw.actionType ?? raw.action_type ?? ''),
    persisted: raw.persisted as boolean | undefined,
    persistDecision: (raw.persistDecision ?? raw.persist_decision) as boolean | undefined,
    guardianNegotiation: normalizeGuardianNegotiationResult(guardianRaw) ?? undefined,
    metadata,
    ...normalizeDeferredGuardianFields(raw),
  };
}

function normalizeRepairOptionsResponse(
  raw: Record<string, unknown>,
  fallbackIssueId: string,
): FeasibilityRepairOptionsResponse {
  const guardianRaw = raw.guardianNegotiation ?? raw.guardian_negotiation;
  const optionsRaw = raw.options;
  const options = Array.isArray(optionsRaw)
    ? optionsRaw.map((o) => mapRepairOption(o as RepairOption | FeasibilityRepairOptionDto))
    : [];

  const issueId = String(raw.issueId ?? raw.issue_id ?? fallbackIssueId);
  const blockerId = raw.blockerId ?? raw.blocker_id;

  return {
    issueId,
    blockerId: blockerId != null ? String(blockerId) : issueId,
    issueMessage: String(
      raw.issueMessage ?? raw.blockerMessage ?? raw.blocker_message ?? '',
    ) || undefined,
    blockerMessage: String(
      raw.blockerMessage ?? raw.blocker_message ?? raw.issueMessage ?? '',
    ) || undefined,
    options,
    guardianNegotiation: normalizeGuardianNegotiationResult(guardianRaw) ?? undefined,
    cascadeUiHints: normalizeCascadeUiHints(raw.cascadeUiHints ?? raw.cascade_ui_hints),
    causalPreAnalysis:
      (raw.causalPreAnalysis ?? raw.causal_pre_analysis) as FeasibilityRepairOptionsResponse['causalPreAnalysis'],
    dependencyImpact:
      (raw.dependencyImpact ?? raw.dependency_impact) as Record<string, unknown> | undefined,
  };
}

const base = (tripId: string) => `/trips/${tripId}/feasibility-report`;

export async function getRepairOptions(
  tripId: string,
  issueId: string,
): Promise<FeasibilityRepairOptionsResponse> {
  try {
    const response = await apiClient.get<
      ApiResponseWrapper<
        | FeasibilityRepairOptionDto[]
        | FeasibilityRepairOptionsResponse
        | Record<string, unknown>
      >
    >(`${base(tripId)}/issues/${encodeURIComponent(issueId)}/repair-options`);
    const data = unwrapData(response);
    if (Array.isArray(data)) {
      return {
        issueId,
        blockerId: issueId,
        options: data,
      };
    }
    if (data && typeof data === 'object') {
      if ('options' in data && Array.isArray((data as FeasibilityRepairOptionsResponse).options)) {
        return normalizeRepairOptionsResponse(data as Record<string, unknown>, issueId);
      }
    }
  } catch (err) {
    if (!isNotImplemented(err)) throw err;
  }

  const repairs = await readinessApi.getRepairOptions(tripId, issueId);
  return {
    issueId: repairs.blockerId ?? issueId,
    blockerId: repairs.blockerId ?? issueId,
    issueMessage: repairs.blockerMessage,
    blockerMessage: repairs.blockerMessage,
    options: repairs.options.map(mapRepairOption),
    guardianNegotiation: repairs.guardianNegotiation,
    cascadeUiHints: repairs.cascadeUiHints,
    causalPreAnalysis: repairs.causalPreAnalysis,
    dependencyImpact: repairs.dependencyImpact,
  };
}

export interface ApplyRepairBody {
  optionId: string;
  reason?: string;
  executeDecision?: boolean;
  forceDecisionRepair?: boolean;
  persistDecision?: boolean;
  runGuardianNegotiation?: boolean;
}

/** 选中 option 后立即调用 */
export async function previewRepair(
  tripId: string,
  issueId: string,
  optionId: string,
  body?: Pick<ApplyRepairBody, 'runGuardianNegotiation'>,
): Promise<PreviewRepairResponse> {
  const response = await apiClient.post<ApiResponseWrapper<Record<string, unknown>>>(
    `${base(tripId)}/issues/${encodeURIComponent(issueId)}/preview-repair`,
    { optionId, ...body },
  );
  const data = unwrapData(response);
  if (!data) {
    throw new Error('预览修复失败');
  }
  return normalizePreviewRepair(data);
}

/** 用户确认后调用 — Plan B 类可省略 executeDecision（后端默认 true） */
export async function applyRepair(
  tripId: string,
  issueId: string,
  body: ApplyRepairBody,
): Promise<ApplyRepairResponse> {
  assertFeasibilityApplyRepairAllowed({ id: issueId });

  try {
    const response = await apiClient.post<ApiResponseWrapper<Record<string, unknown>>>(
      `${base(tripId)}/issues/${encodeURIComponent(issueId)}/apply-repair`,
      body,
    );
    const data = unwrapData(response);
    if (data) return normalizeApplyRepair(data);
    return { status: 'applied', message: '', actionType: '' };
  } catch (err) {
    if (!isNotImplemented(err)) throw coerceWriteChainBlockedError(err);
  }

  if (shouldBlockDirectEffectivePlanWrite()) {
    throw new EffectivePlanWriteChainRequiredError(issueId);
  }

  const legacy = await readinessApi.applyRepair(tripId, issueId, body.optionId);
  return {
    status: legacy.success ? 'applied' : 'deferred',
    message: legacy.message ?? '',
    actionType: '',
  };
}
