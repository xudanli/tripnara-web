import { describe, expect, it } from 'vitest';
import { normalizeFeasibilityIssue } from './feasibility-issue-normalize';

describe('normalizeFeasibilityIssue', () => {
  it('infers road_class metadata for transport-seg long_distance ids', () => {
    const normalized = normalizeFeasibilityIssue({
      id: 'issue-transport-seg-1-long_distance',
      priority: 'must_handle',
      category: 'transport',
      title: '超长距离',
      message: '第1天 · 蓝湖 → 塞济斯菲厄泽 · 超长距离行驶(>300km)',
      severity: 'high',
      anchors: {
        fromItemId: 'a',
        toItemId: 'b',
        fromDayNumber: 1,
        toDayNumber: 1,
        fromPlaceLabel: '蓝湖',
        toPlaceLabel: '塞济斯菲厄泽',
        travelMinutes: 400,
        segment_id: 'seg-1',
        distance_km: 620,
      } as never,
    });

    expect(normalized.issueKind).toBe('road_class');
    expect(normalized.uiHints?.primaryAction).toBe('open_repair');
    expect(normalized.anchors?.segmentId).toBe('seg-1');
    expect(normalized.anchors?.travelDistanceMeters).toBe(620_000);
  });
});
