/**
 * Gateway 代理响应解包 — options / preview 统一 { ok, route, flow, data }。
 */
import { titleForSemanticCapability, personaLabelForSemanticCapability } from '@/trips/decision-runtime/gateway/frontend/canonical-decision-l2-state-machine.util';
import { normalizeDecisionOption } from '@/lib/decision-semantics-normalize.util';
import type {
  DecisionProblemDetail,
  DecisionOption,
  DecisionOptionPreviewResponse,
} from '@/types/decision-problem';
import type { DecisionRouteView,
  Rfc001DecisionCenterProblemView,
  UnifiedGatewayEnvelope,
  UnifiedProblemFlow,
} from '@/types/unified-decision';
import type { CandidateComparisonView } from '@/types/candidate-comparison';
import { extractComparisonViewFromPayload } from '@/lib/candidate-comparison-view.util';
import { extractImpactScopeFromPayload } from '@/lib/impact-scope-view.util';
import { normalizeDecisionActions } from '@/lib/decision-action.util';
import { normalizeDecisionProblemResolution } from '@/lib/decision-resolution.util';
import { extractDecisionProblemNegotiationDetailFields } from '@/lib/normalize-decision-problem-negotiation.util';
import { extractCausalTraceFromPayload } from '@/lib/causal-trace-view.util';
import type { CausalTracePayloadFields } from '@/lib/causal-trace-view.util';
import {
  resolveDecisionWriteChain,
  writeChainFromLegacyFlow,
  legacyFlowFromWriteChain,
} from '@/lib/decision-write-chain.util';
import type { DecisionWriteChain } from '@/types/unified-decision';
import type { ImpactScopeView } from '@/types/impact-scope';
import type { DecisionProblemNegotiationDetailFields } from '@/types/decision-problem-negotiation';

export interface UnwrappedGatewayResponse<T> {
  ok?: boolean;
  flow?: UnifiedProblemFlow;
  route?: DecisionRouteView;
  payload: T;
  isGateway: boolean;
}

export function isUnifiedGatewayEnvelope(
  raw: unknown,
): raw is UnifiedGatewayEnvelope {
  if (!raw || typeof raw !== 'object') return false;
  const record = raw as Record<string, unknown>;
  return 'data' in record && ('flow' in record || 'ok' in record || 'route' in record);
}

export function unwrapUnifiedGatewayEnvelope<T = unknown>(
  raw: unknown,
): UnwrappedGatewayResponse<T> {
  if (isUnifiedGatewayEnvelope(raw)) {
    return {
      ok: raw.ok,
      flow: raw.flow,
      route: raw.route,
      payload: raw.data as T,
      isGateway: true,
    };
  }
  return { payload: raw as T, isGateway: false };
}

function mapCandidateToOption(candidate: Record<string, unknown>): DecisionOption {
  const id = String(candidate.candidateId ?? candidate.id ?? '').trim();
  const executionCapability =
    (candidate.executionCapability as DecisionOption['executionCapability']) ??
    (candidate.execution_capability as DecisionOption['executionCapability']);
  return normalizeDecisionOption({
    id,
    label: String(candidate.label ?? candidate.title ?? id),
    title: candidate.title as string | undefined,
    description: candidate.description as string | undefined,
    tradeoffs: candidate.tradeoffs as DecisionOption['tradeoffs'],
    routePreview: candidate.routePreview as DecisionOption['routePreview'],
    executionCapability,
  });
}

/** Canonical workspace candidates 或 Legacy repair options → DecisionOption[] */
export function mapGatewayOptionsPayload(data: unknown): DecisionOption[] {
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  if (Array.isArray(record.options)) {
    return record.options.map((opt) =>
      normalizeDecisionOption(opt as DecisionOption),
    );
  }
  if (Array.isArray(record.candidates)) {
    return record.candidates.map((c) =>
      mapCandidateToOption(c as Record<string, unknown>),
    );
  }
  return [];
}

export function mapGatewayPreviewPayload(
  data: unknown,
  optionId: string,
): DecisionOptionPreviewResponse {
  if (!data || typeof data !== 'object') {
    return { optionId, executionCapability: 'GUIDED_MANUAL' };
  }
  const record = data as DecisionOptionPreviewResponse & Record<string, unknown>;
  const requiredAcknowledgements = normalizePreviewAcknowledgements(
    record.requiredAcknowledgements ?? record.required_acknowledgements,
  );
  const acknowledgementRequired = normalizePreviewAcknowledgements(
    record.acknowledgementRequired ?? record.acknowledgement_required,
  );
  const mergedAcknowledgements = requiredAcknowledgements.length
    ? requiredAcknowledgements
    : acknowledgementRequired;
  const causalFields = extractCausalTraceFromPayload(record);

  return {
    ...record,
    ...causalFields,
    optionId: record.optionId ?? optionId,
    executionCapability: record.executionCapability ?? 'GUIDED_MANUAL',
    requiredAcknowledgements: mergedAcknowledgements.length ? mergedAcknowledgements : undefined,
    acknowledgementRequired: mergedAcknowledgements.length ? mergedAcknowledgements : undefined,
  };
}

function normalizePreviewAcknowledgements(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item).trim()).filter(Boolean);
}

export function isCanonicalGatewayFlow(flow?: UnifiedProblemFlow | null): boolean {
  return flow === 'CANONICAL_L2';
}

/** @deprecated 使用 resolveDecisionWriteChain / isEvaluateAuthorizeExecuteChain */
export function isCanonicalGatewayWriteChain(
  input: { actionability?: { writeChain?: DecisionWriteChain | null } | null; flow?: UnifiedProblemFlow | null },
): boolean {
  return resolveDecisionWriteChain(input) === 'EVALUATE_AUTHORIZE_EXECUTE';
}

export function shouldBlockLegacyDecisionCreate(input: {
  flow?: UnifiedProblemFlow | null;
  actionability?: { writeChain?: DecisionWriteChain | null } | null;
  executionCapability?: string | null;
}): boolean {
  if (resolveDecisionWriteChain(input) === 'EVALUATE_AUTHORIZE_EXECUTE') return true;
  return false;
}

export interface GatewayDecisionOptionsResult {
  options: DecisionOption[];
  actions?: import('@/types/unified-decision').DecisionAction[];
  flow?: UnifiedProblemFlow;
  route?: DecisionRouteView;
  ok?: boolean;
  problemId?: string;
  tripId?: string;
  generatedAt?: string;
  comparisonView?: CandidateComparisonView | null;
  impactScopeView?: ImpactScopeView | null;
  recommendedCandidateId?: string;
}

export interface GatewayDecisionPreviewResult
  extends DecisionOptionPreviewResponse,
    CausalTracePayloadFields {
  flow?: UnifiedProblemFlow;
  route?: DecisionRouteView;
  ok?: boolean;
}

export function normalizeGatewayOptionsResponse(
  raw: unknown,
): GatewayDecisionOptionsResult {
  const { ok, flow, route, payload, isGateway } = unwrapUnifiedGatewayEnvelope(raw);
  const body = payload as Record<string, unknown>;
  const comparisonView = extractComparisonViewFromPayload(isGateway ? payload : raw);
  const impactScopeView = extractImpactScopeFromPayload(isGateway ? payload : raw);
  return {
    problemId: body.problemId as string | undefined,
    tripId: body.tripId as string | undefined,
    generatedAt: body.generatedAt as string | undefined,
    options: mapGatewayOptionsPayload(isGateway ? payload : raw),
    actions: normalizeDecisionActions(body.actions),
    flow: isGateway ? flow : undefined,
    route: isGateway ? route : undefined,
    ok: isGateway ? ok : undefined,
    comparisonView,
    impactScopeView,
    recommendedCandidateId:
      comparisonView?.recommendedCandidateId ??
      (typeof body.recommendedCandidateId === 'string'
        ? body.recommendedCandidateId
        : undefined),
  };
}

export function normalizeGatewayPreviewResponse(
  raw: unknown,
  optionId: string,
): GatewayDecisionPreviewResult {
  const { ok, flow, route, payload, isGateway } = unwrapUnifiedGatewayEnvelope(raw);
  const preview = mapGatewayPreviewPayload(isGateway ? payload : raw, optionId);
  return {
    ...preview,
    flow: isGateway ? flow : undefined,
    route: isGateway ? route : undefined,
    ok: isGateway ? ok : undefined,
  };
}

export interface GatewayDecisionProblemDetailResult
  extends DecisionProblemDetail,
    DecisionProblemNegotiationDetailFields,
    CausalTracePayloadFields {
  flow?: UnifiedProblemFlow;
  route?: DecisionRouteView;
  ok?: boolean;
  canonicalView?: Rfc001DecisionCenterProblemView;
  resolution?: import('@/types/unified-decision').DecisionProblemResolutionView;
  actionPlanId?: string;
  debug?: {
    authority?: unknown;
    suppressedActions?: import('@/types/unified-decision').DecisionAction[];
  };
}

function extractV2DetailFields(
  payload: unknown,
  flow?: UnifiedProblemFlow | null,
): Partial<GatewayDecisionProblemDetailResult> {
  if (!payload || typeof payload !== 'object') return {};
  const record = payload as Record<string, unknown>;
  const actionability = record.actionability as GatewayDecisionProblemDetailResult['actionability'];
  const writeChain = resolveDecisionWriteChain({ actionability, flow });
  const actions = normalizeDecisionActions(record.actions);
  const resolution = normalizeDecisionProblemResolution(record.resolution);
  const problemNode = record.problem as Record<string, unknown> | undefined;
  const applyResultRaw = record.applyResult ?? record.apply_result;
  const applyResultRecord =
    applyResultRaw && typeof applyResultRaw === 'object'
      ? (applyResultRaw as Record<string, unknown>)
      : undefined;
  const actionPlanId =
    typeof record.actionPlanId === 'string'
      ? record.actionPlanId
      : typeof record.action_plan_id === 'string'
        ? record.action_plan_id
        : typeof applyResultRecord?.actionPlanId === 'string'
          ? applyResultRecord.actionPlanId
          : typeof applyResultRecord?.action_plan_id === 'string'
            ? applyResultRecord.action_plan_id
            : undefined;
  const debugRaw = record.debug;
  const debug =
    debugRaw && typeof debugRaw === 'object'
      ? {
          authority: (debugRaw as Record<string, unknown>).authority,
          suppressedActions: normalizeDecisionActions(
            (debugRaw as Record<string, unknown>).suppressedActions ??
              (debugRaw as Record<string, unknown>).suppressed_actions,
          ),
        }
      : undefined;
  if (debug && !debug.suppressedActions?.length) {
    delete debug.suppressedActions;
  }

  return {
    instanceKey: typeof record.instanceKey === 'string' ? record.instanceKey : undefined,
    workflowStatus:
      (problemNode?.workflowStatus as GatewayDecisionProblemDetailResult['workflowStatus']) ??
      (record.workflowStatus as GatewayDecisionProblemDetailResult['workflowStatus']),
    executionStatus:
      (problemNode?.executionStatus as GatewayDecisionProblemDetailResult['executionStatus']) ??
      (record.executionStatus as GatewayDecisionProblemDetailResult['executionStatus']),
    actionability: actionability ?? { writeChain },
    writeChain,
    actions: actions.length ? actions : undefined,
    resolution,
    actionPlanId,
    debug,
    enforcement: typeof record.enforcement === 'string' ? record.enforcement : undefined,
  };
}

function mapCanonicalProblemToDetail(
  canonical: Rfc001DecisionCenterProblemView,
  problemId: string,
  route?: DecisionRouteView,
  impactScopeView?: ImpactScopeView | null,
  v2?: Partial<GatewayDecisionProblemDetailResult>,
): GatewayDecisionProblemDetailResult {
  const semantic = canonical.rfc001Problem.semanticCapability;
  const writeChain = v2?.writeChain ?? 'EVALUATE_AUTHORIZE_EXECUTE';
  return {
    id: canonical.problemId ?? problemId,
    title:
      canonical.rfc001Problem.title?.trim() || titleForSemanticCapability(semantic),
    description: canonical.rfc001Problem.description,
    type: 'RISK',
    status: (canonical.rfc001Problem.status as DecisionProblemDetail['status']) ?? 'OPEN',
    primaryEnforcement: 'REQUIRE_CONFIRMATION',
    detectedBy: 'GUARDIAN',
    semanticKey: semantic,
    flowKind: legacyFlowFromWriteChain(writeChain),
    flow: 'CANONICAL_L2',
    writeChain,
    route: route ?? canonical.route,
    canonicalView: canonical,
    personaLabel: personaLabelForSemanticCapability(semantic),
    impactScopeView: impactScopeView ?? undefined,
    ...v2,
  };
}

/** GET decision-problems/:id — Gateway 信封或 Legacy 详情 */
export function normalizeGatewayProblemDetail(
  raw: unknown,
  problemId: string,
): GatewayDecisionProblemDetailResult {
  const negotiationFields = extractDecisionProblemNegotiationDetailFields(raw);
  const { ok, flow, route, payload, isGateway } = unwrapUnifiedGatewayEnvelope(raw);
  const impactScopeView = extractImpactScopeFromPayload(isGateway ? payload : raw);
  const v2Fields = extractV2DetailFields(isGateway ? payload : raw, flow);
  const writeChain = v2Fields.writeChain ?? resolveDecisionWriteChain({ flow });

  if (isGateway && writeChain === 'EVALUATE_AUTHORIZE_EXECUTE') {
    const canonical = payload as Rfc001DecisionCenterProblemView;
    if (canonical?.problemId || canonical?.rfc001Problem) {
      return {
        ...mapCanonicalProblemToDetail(canonical, problemId, route, impactScopeView, v2Fields),
        ...extractCausalTraceFromPayload(payload),
        ...negotiationFields,
        ok,
      };
    }
  }

  const legacy = (isGateway ? payload : raw) as DecisionProblemDetail;
  const legacyFlowKind =
    isGateway && flow ? flow : legacy.flowKind ?? writeChainFromLegacyFlow('LEGACY_V15');
  const causalFields = extractCausalTraceFromPayload(isGateway ? payload : raw);
  return {
    ...legacy,
    id: legacy.id ?? problemId,
    flow: isGateway ? flow : legacy.flowKind,
    route: isGateway ? route : legacy.route,
    ok: isGateway ? ok : undefined,
    flowKind: legacyFlowKind,
    writeChain: v2Fields.writeChain ?? resolveDecisionWriteChain({ flow: legacyFlowKind }),
    impactScopeView: impactScopeView ?? legacy.impactScopeView,
    ...v2Fields,
    ...causalFields,
    ...negotiationFields,
  };
}
