import { describe, expect, it } from 'vitest';
import {
  extractCausalTraceFromPayload,
  formatGuardianCausalWarning,
  normalizeCausalStoryView,
  resolveGuardianCausalHeadline,
  normalizeCausalTraceReference,
  normalizeCausalTraceReplayView,
  resolveCausalTraceRefForSubmit,
} from './causal-trace-view.util';

const SAMPLE_REF = {
  traceId: 'trace_1',
  worldStateVersion: 'ws_v3',
  protocolVersion: 'causal-trace-v1' as const,
};

const SAMPLE_STORY = {
  traceId: 'trace_1',
  worldStateVersion: 'ws_v3',
  headline: '大风导致第 3 天户外行程受阻',
  assessment: '建议改走室内备选或调整出发时段。',
  chain: [
    {
      nodeId: 'n1',
      type: 'WEATHER',
      title: '大风预警',
      description: '风速超过户外活动阈值',
    },
  ],
  recommendedOption: {
    optionId: 'cand_indoor',
    summary: '改室内行程',
    expectedImprovement: '消除户外风险',
  },
  technicalTraceRef: 'tech_trace_1',
};

describe('causal-trace-view.util', () => {
  it('normalizes causal trace reference', () => {
    expect(normalizeCausalTraceReference(SAMPLE_REF)).toEqual(SAMPLE_REF);
    expect(
      normalizeCausalTraceReference({
        trace_id: 'trace_2',
        world_state_version: 'ws_v4',
      }),
    ).toEqual({
      traceId: 'trace_2',
      worldStateVersion: 'ws_v4',
      protocolVersion: 'causal-trace-v1',
    });
  });

  it('formats guardian causal warning with Abu prefix', () => {
    expect(formatGuardianCausalWarning('安全提示：强风下不建议按原计划出发')).toBe(
      'Abu：安全提示：强风下不建议按原计划出发',
    );
    expect(formatGuardianCausalWarning('Abu：安全提示：强风')).toBe('Abu：安全提示：强风');
  });

  it('reads partial guardian headline without full causal story fields', () => {
    expect(
      resolveGuardianCausalHeadline({
        guardianCausalStoryView: { headline: '安全提示：强风不建议出发' },
      }),
    ).toBe('安全提示：强风不建议出发');
  });

  it('normalizes causal story view', () => {
    expect(normalizeCausalStoryView(SAMPLE_STORY)).toEqual(SAMPLE_STORY);
  });

  it('extracts causal fields from gateway payload', () => {
    const fields = extractCausalTraceFromPayload({
      causalTraceRef: SAMPLE_REF,
      causalStoryView: SAMPLE_STORY,
      guardianCausalStoryView: {
        ...SAMPLE_STORY,
        headline: 'Abu：户外活动存在安全风险',
      },
    });
    expect(fields.causalTraceRef).toEqual(SAMPLE_REF);
    expect(fields.causalStoryView?.headline).toContain('大风');
    expect(fields.guardianCausalStoryView?.headline).toContain('Abu');
  });

  it('resolves causalTraceRef preview-first for submit', () => {
    expect(
      resolveCausalTraceRefForSubmit({
        preview: { causalTraceRef: { ...SAMPLE_REF, worldStateVersion: 'ws_preview' } },
        detail: { causalTraceRef: SAMPLE_REF },
      }),
    ).toEqual({ ...SAMPLE_REF, worldStateVersion: 'ws_preview' });
    expect(resolveCausalTraceRefForSubmit({ detail: { causalTraceRef: SAMPLE_REF } })).toEqual(
      SAMPLE_REF,
    );
  });

  it('normalizes causal trace replay view', () => {
    const replay = normalizeCausalTraceReplayView({
      schemaId: 'tripnara.causal_trace_replay@v1',
      tripId: 'trip_1',
      problemId: 'prob_1',
      generatedAt: '2026-07-06T00:00:00.000Z',
      ref: SAMPLE_REF,
      trace: { traceId: 'trace_1' },
      causalStoryView: SAMPLE_STORY,
      guardianCausalStoryView: SAMPLE_STORY,
    });
    expect(replay?.schemaId).toBe('tripnara.causal_trace_replay@v1');
    expect(replay?.ref.traceId).toBe('trace_1');
  });
});
