import { describe, expect, it } from 'vitest';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';
import {
  isUltraLongDriveIssue,
  sortLongDriveRepairOptions,
  ULTRA_LONG_DRIVE_DISTANCE_METERS,
} from './feasibility-ultra-long-drive';

function issue(partial: Partial<FeasibilityIssueDto>): FeasibilityIssueDto {
  return {
    id: 'issue-1',
    priority: 'must_handle',
    category: 'schedule',
    title: '驾驶距离',
    message: partial.message ?? '',
    severity: 'high',
    ...partial,
  };
}

describe('isUltraLongDriveIssue', () => {
  it('detects road_class and message keywords', () => {
    expect(isUltraLongDriveIssue(issue({ issueKind: 'road_class', message: 'x' }))).toBe(true);
    expect(
      isUltraLongDriveIssue(
        issue({
          message:
            '第4天 · 蓝湖温泉 -> 塞济斯菲厄泽 (约 431 km) · 超长距离行驶(>300km)，强烈建议分段或中途住宿',
        }),
      ),
    ).toBe(true);
  });

  it('detects distance from parsed message and view model', () => {
    expect(isUltraLongDriveIssue(issue({ message: '第4天 · A -> B (约 431 km)' }))).toBe(true);
    expect(
      isUltraLongDriveIssue(issue({ message: '第4天 · A -> B (约 120 km)' })),
    ).toBe(false);
    expect(
      isUltraLongDriveIssue(issue({ message: 'short trip' }), {
        travelDistanceMeters: ULTRA_LONG_DRIVE_DISTANCE_METERS,
      }),
    ).toBe(true);
  });

  it('respects open_repair ui hint', () => {
    expect(
      isUltraLongDriveIssue(
        issue({
          message: '第4天 · A -> B (约 80 km)',
          uiHints: { primaryAction: 'open_repair' },
        }),
      ),
    ).toBe(true);
  });

  it('uses anchors.distanceKm', () => {
    expect(
      isUltraLongDriveIssue(
        issue({
          message: '第1天 · A -> B',
          anchors: {
            fromItemId: 'a',
            toItemId: 'b',
            fromDayNumber: 1,
            toDayNumber: 1,
            fromPlaceLabel: 'A',
            toPlaceLabel: 'B',
            travelMinutes: 400,
            distanceKm: 431,
          },
        }),
      ),
    ).toBe(true);
  });

  it('sorts structural repair options in backend order', () => {
    const sorted = sortLongDriveRepairOptions([
      { id: 'reorder_split', label: '调整相邻日安排' },
      { id: 'insert_midpoint_stay', label: '中途住宿拆段' },
      { id: 'alternative_route', label: '换近路线' },
      { id: 'move_destination_day', label: '目的地挪到次日' },
    ]);
    expect(sorted.map((o) => o.id)).toEqual([
      'insert_midpoint_stay',
      'move_destination_day',
      'alternative_route',
      'reorder_split',
    ]);
  });
});
