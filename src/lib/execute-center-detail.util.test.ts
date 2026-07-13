import { describe, expect, it } from 'vitest';
import {
  buildExecuteCenterDetailModel,
  executeTimelineStatusLabel,
  resolveExecuteDayTimeline,
} from './execute-center-detail.util';

describe('execute-center-detail.util', () => {
  it('returns empty timeline when schedule is empty', () => {
    const timeline = resolveExecuteDayTimeline({});
    expect(timeline).toHaveLength(0);
  });

  it('builds center detail with realtime alert from advisory', () => {
    const model = buildExecuteCenterDetailModel({
      hasWindWarning: true,
      windDescription: '阵风预计持续至 14:00',
      advisory: {
        tripId: 't1',
        dayNumber: 1,
        date: '2026-07-16',
        currentState: { currentTime: '11:00', delayMinutes: 0 },
        verdict: { status: 'AT_RISK', headline: '强风影响' },
        impacts: { affectedItems: [] },
        deviations: [],
        recommendations: [{ id: 'r1', label: '推迟', description: '等待风减弱', isRecommended: true }],
        realtimeRisks: { weather: '阵风预计持续至 14:00' },
        evidence: {},
      },
    });
    expect(model.splitGroups).toHaveLength(0);
    expect(model.realtimeAlert?.description).toContain('阵风');
    expect(model.realtimeAlert?.suggestedActions.length).toBeGreaterThan(0);
  });

  it('maps timeline status labels', () => {
    expect(executeTimelineStatusLabel('done')).toBe('已完成');
    expect(executeTimelineStatusLabel('current')).toBe('进行中');
    expect(executeTimelineStatusLabel('upcoming')).toBe('待定');
  });
});
