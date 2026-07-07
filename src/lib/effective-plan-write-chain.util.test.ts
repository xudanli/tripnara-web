import { describe, expect, it, vi } from 'vitest';
import {
  EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED,
  NON_CANONICAL_APPLY_DEPRECATED,
  EffectivePlanWriteChainRequiredError,
  assertConflictsResolveAllowed,
  assertExecutionApplyFallbackAllowed,
  assertExecutionReorderAllowed,
  assertReadinessApplyRepairAllowed,
  assertTripPlannerApplySuggestionAllowed,
  formatLegacyApplyBlockedMessage,
  formatWriteChainAuthorizedPathsCta,
  isEffectivePlanWriteChainRequiredError,
  isLegacyApplyBlockedError,
  isNonCanonicalApplyDeprecatedError,
  parseWriteChainBlockedError,
  parseWriteChainBlockedFromThrown,
  readFeasibilityRepairErrorCode,
  resolveFeasibilityIssueDecisionProblemId,
  shouldBlockDirectEffectivePlanWrite,
  shouldRetryLegacyApply,
} from '@/lib/effective-plan-write-chain.util';
import { AxiosError, AxiosHeaders } from 'axios';

const CAS_WRITE_CHAIN_BODY = {
  success: false,
  error: {
    code: EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED,
    message: 'Plan mutation blocked (ReadinessRepairService.applyRepair): ...',
    details: {
      caller: 'ReadinessRepairService.applyRepair',
      authorizedPaths: [
        'POST /trips/:tripId/decision-problems/:problemId/resolutions',
        'POST /trips/:tripId/decision-problems/:problemId/apply',
      ],
      writeChain: true,
    },
  },
};

describe('effective-plan-write-chain.util', () => {
  it('reads nested BFF error codes', () => {
    expect(
      readFeasibilityRepairErrorCode({
        error: { code: EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED },
      }),
    ).toBe(EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED);
  });

  it('parses CAS write-chain block payload with authorizedPaths', () => {
    const parsed = parseWriteChainBlockedError(CAS_WRITE_CHAIN_BODY);
    expect(parsed?.code).toBe(EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED);
    expect(parsed?.details?.caller).toBe('ReadinessRepairService.applyRepair');
    expect(parsed?.details?.authorizedPaths).toHaveLength(2);
    expect(parsed?.details?.writeChain).toBe(true);
  });

  it('formats CTA from authorizedPaths', () => {
    expect(
      formatWriteChainAuthorizedPathsCta(CAS_WRITE_CHAIN_BODY.error.details.authorizedPaths),
    ).toBe('请走：提交结论（resolutions） → 应用到行程（apply）');
  });

  it('includes authorizedPaths CTA in blocked message', () => {
    const err = new AxiosError('blocked', '403', undefined, undefined, {
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: CAS_WRITE_CHAIN_BODY,
    });
    const message = formatLegacyApplyBlockedMessage(err);
    expect(message).toContain('ReadinessRepairService.applyRepair');
    expect(message).toContain('提交结论（resolutions）');
    expect(message).toContain('应用到行程（apply）');
  });

  it('detects axios EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED', () => {
    const err = new AxiosError('blocked', '403', undefined, undefined, {
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { error: { code: EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED } },
    });
    expect(isEffectivePlanWriteChainRequiredError(err)).toBe(true);
  });

  it('does not retry legacy apply on write-chain block', () => {
    const err = new EffectivePlanWriteChainRequiredError('p1');
    expect(shouldRetryLegacyApply(err)).toBe(false);
  });

  it('detects NON_CANONICAL_APPLY_DEPRECATED from axios', () => {
    const err = new AxiosError('deprecated', '410', undefined, undefined, {
      status: 410,
      statusText: 'Gone',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { error: { code: NON_CANONICAL_APPLY_DEPRECATED } },
    });
    expect(isNonCanonicalApplyDeprecatedError(err)).toBe(true);
    expect(isLegacyApplyBlockedError(err)).toBe(true);
  });

  it('parses api client TripnaraHttpError shape via response.data', () => {
    const err = Object.assign(new Error('blocked'), {
      code: EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED,
      response: { data: CAS_WRITE_CHAIN_BODY },
    });
    const parsed = parseWriteChainBlockedFromThrown(err);
    expect(parsed?.details?.authorizedPaths).toHaveLength(2);
  });

  it('allows conflicts resolve dryRun preview', () => {
    expect(() => assertConflictsResolveAllowed({ dryRun: true })).not.toThrow();
  });

  it('blocks conflicts resolve when write chain on and not dryRun', () => {
    vi.stubEnv('VITE_DECISION_GATEWAY_UNIFIED', '1');
    expect(() => assertConflictsResolveAllowed({ dryRun: false })).toThrow(
      EffectivePlanWriteChainRequiredError,
    );
    vi.unstubAllEnvs();
  });

  it('blocks readiness apply-repair when gateway on', () => {
    vi.stubEnv('VITE_DECISION_GATEWAY_UNIFIED', '1');
    expect(() => assertReadinessApplyRepairAllowed({ blockerId: 'b1' })).toThrow(
      EffectivePlanWriteChainRequiredError,
    );
    vi.unstubAllEnvs();
  });

  it('blocks execution reorder when gateway on', () => {
    vi.stubEnv('VITE_DECISION_GATEWAY_UNIFIED', '1');
    expect(() => assertExecutionReorderAllowed({ tripId: 't1' })).toThrow(
      EffectivePlanWriteChainRequiredError,
    );
    vi.unstubAllEnvs();
  });

  it('blocks execution apply-fallback when gateway on', () => {
    vi.stubEnv('VITE_DECISION_GATEWAY_UNIFIED', '1');
    expect(() => assertExecutionApplyFallbackAllowed({ tripId: 't1', solutionId: 's1' })).toThrow(
      EffectivePlanWriteChainRequiredError,
    );
    vi.unstubAllEnvs();
  });

  it('blocks trip-planner applySuggestion when gateway on', () => {
    vi.stubEnv('VITE_DECISION_GATEWAY_UNIFIED', '1');
    expect(() =>
      assertTripPlannerApplySuggestionAllowed({ tripId: 't1', suggestionId: 'sg1' }),
    ).toThrow(EffectivePlanWriteChainRequiredError);
    vi.unstubAllEnvs();
  });

  it('carries problemId on proactive error', () => {
    const err = new EffectivePlanWriteChainRequiredError('problem_abc');
    expect(err.problemId).toBe('problem_abc');
    expect(isEffectivePlanWriteChainRequiredError(err)).toBe(true);
  });

  it('prefers decisionProblemId over issue id', () => {
    expect(
      resolveFeasibilityIssueDecisionProblemId({
        id: 'issue_1',
        decisionProblemId: 'problem_1',
      }),
    ).toBe('problem_1');
  });
});
