import { describe, expect, it } from 'vitest';
import {
  buildCausalObservationFromEnvironmentEvent,
  buildCausalObservationFromInTripLoopUi,
  buildOpsOutcomeFromEnvironmentEvent,
} from '@/lib/causal-in-trip-telemetry-builders';
import type { EnvironmentEventDetail } from '@/types/in-trip-execution';

describe('causal-in-trip-telemetry', () => {
  it('builds causal_observation for red weather event', () => {
    const detail: EnvironmentEventDetail = {
      id: 'evt-1',
      tripId: 'trip-1',
      type: 'weather',
      severity: 'red',
      description: '大风导致冰川团集合风险',
      status: 'resolved',
      detectedAt: '2026-06-26T08:00:00Z',
      affectedItemCount: 1,
      alternativePlanCount: 2,
      affectedItems: [],
      alternativePlans: [],
      cascadeImpact: [],
    };

    const obs = buildCausalObservationFromEnvironmentEvent(detail);
    expect(obs.schema).toBe('tripnara/causal-observation/v1');
    expect(obs.metrics?.iceland_miss_prob).toBe(1);
    expect(obs.missed_appointment).toBe(true);

    const outcome = buildOpsOutcomeFromEnvironmentEvent(detail);
    expect(outcome.extensions?.causal_observation).toEqual(obs);
    expect(outcome.delta?.hardWeatherRealized).toBe(true);
  });

  it('builds loop ui observation with lower miss prob for monitoring', () => {
    const obs = buildCausalObservationFromInTripLoopUi({
      phase: 'monitoring',
      headline: '今日行程稳定',
      layers: {
        happened: '无重大天气变化',
        impact: '对集合时间影响有限',
        action: '按原计划执行',
      },
      issueCards: [],
    });
    expect(obs.metrics?.iceland_miss_prob).toBe(0.2);
    expect(obs.missed_appointment).toBe(false);
  });
});
