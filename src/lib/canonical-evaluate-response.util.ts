/**
 * POST evaluate 响应归一化 — options / candidates / record.selectedCandidateId
 */
import { normalizeDecisionOption } from '@/lib/decision-semantics-normalize.util';
import { mapGatewayOptionsPayload } from '@/lib/unified-gateway-response.util';
import { unwrapUnifiedGatewayEnvelope } from '@/lib/unified-gateway-response.util';
import { extractComparisonViewFromPayload } from '@/lib/candidate-comparison-view.util';
import { extractImpactScopeFromPayload } from '@/lib/impact-scope-view.util';
import type { DecisionOption } from '@/types/decision-problem';
import type {
  NormalizedCanonicalEvaluateResponse,
  Rfc001EvaluateCandidateView,
} from '@/types/unified-decision';

export type { NormalizedCanonicalEvaluateResponse } from '@/types/unified-decision';

function mergeOptionsWithEvaluateCandidates(
  options: DecisionOption[],
  candidates: Rfc001EvaluateCandidateView[],
): DecisionOption[] {
  if (!candidates.length) return options;

  const metaById = new Map(candidates.map((c) => [c.candidateId, c]));

  const merged = options.map((opt) => {
    const meta = metaById.get(opt.id);
    if (!meta) return opt;
    return normalizeDecisionOption({
      ...opt,
      label: opt.label ?? opt.title ?? meta.label ?? opt.id,
      description: opt.description ?? meta.description,
      executable: meta.blocked === true ? false : opt.executable,
    });
  });

  return merged;
}

export function normalizeCanonicalEvaluateResponse(
  raw: unknown,
): NormalizedCanonicalEvaluateResponse {
  const { ok, route, payload, isGateway } = unwrapUnifiedGatewayEnvelope(raw);
  const body = (isGateway ? payload : raw) as Record<string, unknown>;

  const record = body.record as NormalizedCanonicalEvaluateResponse['record'];
  const options = mapGatewayOptionsPayload(body);
  const candidates = Array.isArray(body.candidates)
    ? (body.candidates as Rfc001EvaluateCandidateView[])
    : [];

  const mergedOptions = mergeOptionsWithEvaluateCandidates(options, candidates);
  const comparisonView = extractComparisonViewFromPayload(body);
  const impactScopeView = extractImpactScopeFromPayload(body);
  const recommendedCandidateId =
    comparisonView?.recommendedCandidateId ??
    record?.selectedCandidateId ??
    (typeof body.recommendedCandidateId === 'string'
      ? body.recommendedCandidateId
      : undefined);

  return {
    ok: isGateway ? ok : (body.ok as boolean | undefined),
    route: isGateway
      ? route
      : (body.route as NormalizedCanonicalEvaluateResponse['route']),
    runId: body.runId as string | undefined,
    record,
    planVersion: body.planVersion as NormalizedCanonicalEvaluateResponse['planVersion'],
    humanDecisionRequired: body.humanDecisionRequired as boolean | undefined,
    options: mergedOptions,
    candidates,
    leadingPersona: body.leadingPersona as string | undefined,
    generatedAt: body.generatedAt as string | undefined,
    recommendedCandidateId,
    comparisonView: comparisonView ?? undefined,
    impactScopeView: impactScopeView ?? undefined,
  };
}

export function summarizeExcludedEvaluateCandidates(
  candidates: Rfc001EvaluateCandidateView[],
  recommendedId: string,
): string[] {
  return candidates
    .filter(
      (c) =>
        c.candidateId !== recommendedId &&
        (c.blocked === true || String(c.abuVerdict ?? '').toUpperCase() === 'BLOCK'),
    )
    .map((c) => {
      const label = c.label ?? c.candidateId;
      const reason =
        c.blockedReason?.trim() ||
        (String(c.abuVerdict ?? '').toUpperCase() === 'BLOCK'
          ? '安全/可行性未通过（Abu）'
          : '已被 Decision Core 排除');
      return `${label}：${reason}`;
    })
    .slice(0, 5);
}

export function findEvaluateCandidate(
  candidates: Rfc001EvaluateCandidateView[] | undefined,
  candidateId: string | null | undefined,
): Rfc001EvaluateCandidateView | undefined {
  if (!candidateId || !candidates?.length) return undefined;
  return candidates.find((c) => c.candidateId === candidateId);
}
