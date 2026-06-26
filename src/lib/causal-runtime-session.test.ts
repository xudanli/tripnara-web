import { describe, expect, it, beforeEach, beforeAll } from 'vitest';
import {
  buildCausalOutcomeContext,
  enrichRecordRealityOutcomeRequest,
  extractTripWorldStateFromGeneratePlanRequest,
  saveCausalRuntimeSession,
} from '@/lib/causal-runtime-session';

function installSessionStorageMock(): void {
  const store = new Map<string, string>();
  const mock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: mock,
    configurable: true,
  });
}

describe('causal-runtime-session', () => {
  beforeAll(() => {
    installSessionStorageMock();
  });

  beforeEach(() => {
    sessionStorage.clear();
  });

  it('enrichRecordRealityOutcomeRequest fills missing state and causality_id', () => {
    saveCausalRuntimeSession(
      'trip-1',
      { context: { country: 'IS' }, decisionCausalityChain: [{ id: 'c1' }] },
      { lastDecisionCausalityId: 'caus-abc' },
    );

    const enriched = enrichRecordRealityOutcomeRequest(
      {
        outcome: { schema: 'p-ops-2-outcome/v1', recordedAtIso: '2026-06-26', summary: 'ok' },
      },
      'trip-1',
    );

    expect(enriched.causality_id).toBe('caus-abc');
    expect(enriched.state?.context).toEqual({ country: 'IS' });
    expect(enriched.tripId).toBe('trip-1');
  });

  it('buildCausalOutcomeContext returns null when cache missing', () => {
    expect(buildCausalOutcomeContext('missing')).toBeNull();
  });

  it('extractTripWorldStateFromGeneratePlanRequest reads nested state', () => {
    const nested = {
      tripId: 'trip-1',
      state: { context: { country: 'IS' }, decisionCausalityChain: [] },
      metadata: { hikingProfile: 'primary' },
    };
    expect(extractTripWorldStateFromGeneratePlanRequest(nested).context).toEqual({
      country: 'IS',
    });
  });
});
