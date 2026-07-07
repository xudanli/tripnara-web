import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  resetDecisionRuntimeCapabilitiesForTests,
  prefetchDecisionRuntimeCapabilities,
} from '@/lib/decision-runtime-capabilities.store';
import { isWriteChainEnabled, isGatewayDomainRulesExclusive } from '@/lib/decision-gateway.util';
import { decisionRuntimeApi } from '@/api/decision-runtime';
import {
  filterGatewayExclusiveFeasibilityIssues,
  isGatewayProjectedFeasibilityIssue,
  resolveFeasibilityIssueGatewayDomain,
} from '@/lib/gateway-feasibility-projection.util';
import { parseWriteChainRequiredSignal } from '@/lib/effective-plan-write-chain.util';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

describe('decision-runtime-capabilities.store', () => {
  beforeEach(() => {
    resetDecisionRuntimeCapabilitiesForTests();
    vi.unstubAllEnvs();
  });

  it('falls back to env when runtime endpoints missing', async () => {
    vi.stubEnv('VITE_DECISION_GATEWAY_UNIFIED', '1');
    vi.spyOn(decisionRuntimeApi, 'getWriteChainOps').mockResolvedValue(null);
    vi.spyOn(decisionRuntimeApi, 'getRuntimeCapabilities').mockResolvedValue(null);
    await prefetchDecisionRuntimeCapabilities();
    expect(isWriteChainEnabled()).toBe(true);
  });

  it('prefers runtime writeChainEnabled over env off', async () => {
    vi.stubEnv('VITE_DECISION_GATEWAY_UNIFIED', '0');
    vi.spyOn(decisionRuntimeApi, 'getWriteChainOps').mockResolvedValue({ writeChainEnabled: true });
    vi.spyOn(decisionRuntimeApi, 'getRuntimeCapabilities').mockResolvedValue({
      gatewayDomainRulesExclusive: true,
      constraintPlanVerifyProjection: true,
      phase6LegacyDeprecation: true,
    });
    await prefetchDecisionRuntimeCapabilities();
    expect(isWriteChainEnabled()).toBe(true);
    expect(isGatewayDomainRulesExclusive()).toBe(true);
  });
});

describe('gateway-feasibility-projection.util', () => {
  beforeEach(() => {
    resetDecisionRuntimeCapabilitiesForTests({
      writeChainEnabled: true,
      gatewayDomainRulesExclusive: true,
      constraintPlanVerifyProjection: true,
      phase6LegacyDeprecation: true,
      loaded: true,
      source: 'runtime',
    });
  });

  it('resolves poi_access domain', () => {
    expect(
      resolveFeasibilityIssueGatewayDomain({ issueKind: 'poi_access_blocked', category: 'booking' }),
    ).toBe('poi_access');
  });

  it('detects gateway projected issue via decisionProblemId', () => {
    expect(isGatewayProjectedFeasibilityIssue({ id: 'i1', decisionProblemId: 'p1' })).toBe(true);
  });

  it('strips legacy duplicate in exclusive domain', () => {
    const issues: FeasibilityIssueDto[] = [
      {
        id: 'legacy_schedule',
        priority: 'must_handle',
        category: 'schedule',
        title: 'legacy',
        message: 'buffer',
        severity: 'high',
        issueKind: 'schedule_buffer',
      },
      {
        id: 'gateway_schedule',
        decisionProblemId: 'problem_1',
        priority: 'must_handle',
        category: 'schedule',
        title: 'gateway',
        message: 'buffer',
        severity: 'high',
        issueKind: 'schedule_buffer',
      },
    ];
    const filtered = filterGatewayExclusiveFeasibilityIssues(issues);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('gateway_schedule');
  });
});

describe('parseWriteChainRequiredSignal', () => {
  it('parses RL preDecision writeChainRequired', () => {
    const parsed = parseWriteChainRequiredSignal({
      writeChainRequired: true,
      authorizedPaths: [
        'POST /trips/:tripId/decision-problems/:problemId/resolutions',
        'POST /trips/:tripId/decision-problems/:problemId/apply',
      ],
      caller: 'RLIntegration.preDecision',
    });
    expect(parsed?.writeChainRequired).toBe(true);
    expect(parsed?.authorizedPaths).toHaveLength(2);
  });
});
