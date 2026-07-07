import { describe, expect, it } from 'vitest';
import {
  EXECUTE_WIND_CAUSAL_DEMO,
  executeCausalInsightFromEmbedded,
  executeCausalInsightFromTraceReplay,
  mergeExecuteCausalInsight,
  resolveExecuteCausalInsight,
  resolveExecuteCausalTraceTier3ProblemId,
} from '@/lib/execute-causal-insight.util';
import type { TripExecutionAdvisoryDto } from '@/types/trip-execution-advisory';
import type { CausalTraceReplayView } from '@/types/causal-trace';

const BASE_ADVISORY: TripExecutionAdvisoryDto = {
  tripId: 'trip-1',
  dayNumber: 1,
  date: '2026-07-16',
  currentState: { currentTime: '12:00', delayMinutes: 45 },
  verdict: { status: 'AT_RISK', headline: '强风预警 · Day 1 活动需调整' },
  impacts: { affectedItems: [] },
  deviations: [],
  recommendations: [],
  realtimeRisks: { weather: '阵风预计持续至 14:00' },
  evidence: {},
};

const EMBEDDED_INSIGHT = {
  guardianHeadline: EXECUTE_WIND_CAUSAL_DEMO.guardianHeadline,
  primaryEnforcement: 'ADJUST_REQUIRED' as const,
  linkedProblemId: 'dp_wind',
  causalStory: {
    assessment: EXECUTE_WIND_CAUSAL_DEMO.causalStory.assessment,
    chain: EXECUTE_WIND_CAUSAL_DEMO.causalStory.chain ?? [],
  },
};

describe('resolveExecuteCausalInsight', () => {
  it('prefers P0 causalInsight from execution-advisory', () => {
    const view = resolveExecuteCausalInsight({
      ...BASE_ADVISORY,
      causalInsight: EMBEDDED_INSIGHT,
    });

    expect(view?.causalStory.chain).toHaveLength(3);
    expect(view?.primaryEnforcement).toBe('REQUIRE_ADJUSTMENT');
    expect(view?.isDemo).toBeFalsy();
  });

  it('falls back to wind demo when no causalInsight', () => {
    const view = resolveExecuteCausalInsight(BASE_ADVISORY);
    expect(view?.isDemo).toBe(true);
  });
});

describe('executeCausalInsightFromEmbedded', () => {
  it('builds trailing step from assessment', () => {
    const view = executeCausalInsightFromEmbedded(
      { ...BASE_ADVISORY, causalInsight: EMBEDDED_INSIGHT },
      EMBEDDED_INSIGHT,
    );
    expect(view.trailingStep?.label).toBe('决策冲突');
    expect(view.trailingStep?.description).toContain('提前 20 分钟');
  });
});

describe('resolveExecuteCausalTraceTier3ProblemId', () => {
  it('returns linkedProblemId when chain is empty', () => {
    expect(
      resolveExecuteCausalTraceTier3ProblemId({
        ...BASE_ADVISORY,
        causalInsight: {
          ...EMBEDDED_INSIGHT,
          causalStory: { assessment: 'pending', chain: [] },
        },
      }),
    ).toBe('dp_wind');
  });

  it('skips tier-3 when P0 chain is present', () => {
    expect(
      resolveExecuteCausalTraceTier3ProblemId({
        ...BASE_ADVISORY,
        causalInsight: EMBEDDED_INSIGHT,
      }),
    ).toBeNull();
  });
});

describe('mergeExecuteCausalInsight', () => {
  const replay: CausalTraceReplayView = {
    schemaId: 'tripnara.causal_trace_replay@v1',
    tripId: 'trip-1',
    problemId: 'dp_wind',
    generatedAt: '2026-07-16T12:00:00Z',
    ref: {
      traceId: 'trace_1',
      worldStateVersion: 'ws_1',
      protocolVersion: 'causal-trace-v1',
    },
    trace: {},
    causalStoryView: EXECUTE_WIND_CAUSAL_DEMO.causalStory,
    guardianCausalStoryView: EXECUTE_WIND_CAUSAL_DEMO.causalStory,
  };

  it('prefers embedded P0 chain over tier-3 replay', () => {
    const merged = mergeExecuteCausalInsight(
      { ...BASE_ADVISORY, causalInsight: EMBEDDED_INSIGHT },
      replay,
    );
    expect(merged?.causalStory.chain).toHaveLength(3);
  });

  it('uses tier-3 replay when P0 chain is empty', () => {
    const merged = mergeExecuteCausalInsight(
      {
        ...BASE_ADVISORY,
        causalInsight: {
          ...EMBEDDED_INSIGHT,
          causalStory: { assessment: 'loading', chain: [] },
        },
      },
      replay,
    );
    expect(merged?.causalStory.chain?.length).toBeGreaterThan(0);
    expect(merged?.linkedProblemId).toBe('dp_wind');
  });
});

describe('executeCausalInsightFromTraceReplay', () => {
  it('maps causal-trace replay to execute view', () => {
    const view = executeCausalInsightFromTraceReplay(
      { ...BASE_ADVISORY, causalInsight: EMBEDDED_INSIGHT },
      {
        schemaId: 'tripnara.causal_trace_replay@v1',
        tripId: 'trip-1',
        problemId: 'dp_wind',
        generatedAt: '2026-07-16T12:00:00Z',
        ref: {
          traceId: 'trace_1',
          worldStateVersion: 'ws_1',
          protocolVersion: 'causal-trace-v1',
        },
        trace: {},
        causalStoryView: EXECUTE_WIND_CAUSAL_DEMO.causalStory,
        guardianCausalStoryView: EXECUTE_WIND_CAUSAL_DEMO.causalStory,
      },
    );

    expect(view.guardianHeadline).toContain('强风');
    expect(view.causalStory.chain?.length).toBeGreaterThan(0);
  });
});
