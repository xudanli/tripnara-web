import { describe, expect, it } from 'vitest';
import {
  mapExecutionPrimaryEnforcementForBanner,
  normalizeExecutionCausalInsight,
  normalizeTripExecutionAdvisory,
} from '@/lib/normalize-trip-execution-advisory.util';

describe('normalizeExecutionCausalInsight', () => {
  it('parses P0 causalInsight block', () => {
    const insight = normalizeExecutionCausalInsight({
      guardianHeadline: '安全提示：蓝湖温泉 → 哈尔格林姆斯教堂 强风下不建议按原计划出发',
      primaryEnforcement: 'ADJUST_REQUIRED',
      linkedProblemId: 'dp_wind',
      causalStory: {
        assessment: '最小干预建议将出发时间提前 20 分钟。',
        chain: [
          {
            nodeId: 'n1',
            type: 'WEATHER',
            title: '天气影响',
            description: '预计出现 12 m/s 阵风，影响路段通行速度',
          },
        ],
      },
    });

    expect(insight?.guardianHeadline).toContain('强风');
    expect(insight?.primaryEnforcement).toBe('ADJUST_REQUIRED');
    expect(insight?.linkedProblemId).toBe('dp_wind');
    expect(insight?.causalStory.chain).toHaveLength(1);
  });

  it('infers primaryEnforcement when missing', () => {
    const insight = normalizeExecutionCausalInsight({
      guardianHeadline: '当前条件不建议继续按原计划执行',
      causalStory: {
        assessment: '路面湿滑',
        chain: [{ description: '侧风 22 m/s', type: 'WEATHER' }],
      },
    });
    expect(insight?.primaryEnforcement).toBe('NOT_EXECUTABLE');
    expect(insight?.causalStory.chain[0]?.title).toBe('天气影响');
  });
});

describe('mapExecutionPrimaryEnforcementForBanner', () => {
  it('maps execution enums to banner enums', () => {
    expect(mapExecutionPrimaryEnforcementForBanner('NOT_EXECUTABLE')).toBe('BLOCK');
    expect(mapExecutionPrimaryEnforcementForBanner('ADJUST_REQUIRED')).toBe('REQUIRE_ADJUSTMENT');
  });
});

describe('normalizeTripExecutionAdvisory', () => {
  it('merges normalized causalInsight into advisory', () => {
    const advisory = normalizeTripExecutionAdvisory({
      tripId: 'trip-1',
      dayNumber: 1,
      date: '2026-07-16',
      currentState: { currentTime: '12:00', delayMinutes: 0 },
      verdict: { status: 'AT_RISK', headline: '强风' },
      impacts: { affectedItems: [] },
      deviations: [],
      recommendations: [],
      realtimeRisks: {},
      evidence: {},
      causal_insight: {
        guardian_headline: 'Abu 提示',
        primary_enforcement: 'ADJUST_REQUIRED',
        causal_story: {
          assessment: '建议调整',
          chain: [
            {
              node_id: 'n1',
              type: 'WEATHER',
              title: '天气影响',
              description: '阵风 12 m/s',
            },
          ],
        },
      },
    });

    expect(advisory?.causalInsight?.guardianHeadline).toBe('Abu 提示');
    expect(advisory?.causalInsight?.causalStory.chain[0]?.nodeId).toBe('n1');
  });
});
