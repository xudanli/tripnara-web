import { describe, expect, it } from 'vitest';
import {
  buildExecuteCenterDetailModel,
  executeTimelineStatusLabel,
  resolveExecuteDayTimeline,
} from './execute-center-detail.util';

describe('execute-center-detail.util', () => {
  it('returns demo timeline when schedule is empty', () => {
    const timeline = resolveExecuteDayTimeline({});
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline.some((entry) => entry.status === 'current')).toBe(true);
  });

  it('builds center detail with split groups and alert', () => {
    const model = buildExecuteCenterDetailModel({
      hasWindWarning: true,
      windDescription: '阵风预计持续至 14:00',
    });
    expect(model.splitGroups.length).toBeGreaterThanOrEqual(2);
    expect(model.reunionSummary).toBeTruthy();
    expect(model.realtimeAlert?.description).toContain('阵风');
    expect(model.realtimeAlert?.suggestedActions.length).toBeGreaterThan(0);
  });

  it('maps timeline status labels', () => {
    expect(executeTimelineStatusLabel('done')).toBe('已完成');
    expect(executeTimelineStatusLabel('current')).toBe('进行中');
    expect(executeTimelineStatusLabel('upcoming')).toBe('待定');
  });
});
