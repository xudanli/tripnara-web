import { describe, expect, it } from 'vitest';
import type { FeasibilityIssueDto, FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';
import type { TripDetail } from '@/types/trip';
import { IntentTravelMode } from '@/types/trip';
import { filterFeasibilityRepairOptionsForTrip, shouldShowFeasibilityRepairWorkflow } from './feasibility-repair-filter';

const selfDriveTrip = {
  pacingConfig: { travelMode: IntentTravelMode.DRIVING },
} as TripDetail;

const longDriveIssue: FeasibilityIssueDto = {
  id: 'issue-transport-seg-1-long_distance',
  priority: 'must_handle',
  category: 'transport',
  title: '超长距离',
  message: '第1天 · 蓝湖 → 塞济斯菲厄泽 · 超长距离行驶(>300km)，强烈建议分段或中途住宿',
  severity: 'high',
  issueKind: 'road_class',
  uiHints: { primaryAction: 'open_repair' },
  anchors: {
    segmentId: 'seg-1',
    fromItemId: 'item-blue-lagoon',
    toItemId: 'item-seyðisfjörður',
    fromDayNumber: 1,
    toDayNumber: 1,
    fromPlaceLabel: '蓝湖',
    toPlaceLabel: '塞济斯菲厄泽',
    travelMinutes: 431,
    distanceKm: 431,
  },
};

const structuralOptions: FeasibilityRepairOptionDto[] = [
  {
    id: 'insert_midpoint_stay',
    label: '中途住宿拆段',
    actionType: 'change_hotel',
    payload: { strategy: 'midpoint_overnight', segmentId: 'seg-1' },
  },
  {
    id: 'move_destination_day',
    label: '目的地挪到次日',
    actionType: 'move_to_day',
    payload: { itemId: 'item-seyðisfjörður', suggestedValue: { dayNumber: 2 } },
  },
  {
    id: 'alternative_route',
    label: '绕行替代路线',
    actionType: 'find_alternative_route',
    payload: { segmentId: 'seg-1' },
  },
  {
    id: 'reorder_split',
    label: '调整顺序拆段',
    actionType: 'reorder_pois',
    payload: { segmentId: 'seg-1' },
  },
];

describe('filterFeasibilityRepairOptionsForTrip', () => {
  it('keeps all four structural long-drive options on self-drive trips', () => {
    const filtered = filterFeasibilityRepairOptionsForTrip(
      structuralOptions,
      selfDriveTrip,
      longDriveIssue,
    );
    expect(filtered.map((o) => o.id)).toEqual([
      'insert_midpoint_stay',
      'move_destination_day',
      'alternative_route',
      'reorder_split',
    ]);
  });

  it('still filters book_transport on self-drive trips', () => {
    const filtered = filterFeasibilityRepairOptionsForTrip(
      [
        ...structuralOptions,
        { id: 'book', label: '预订交通', actionType: 'book_transport' },
      ],
      selfDriveTrip,
      longDriveIssue,
    );
    expect(filtered.some((o) => o.id === 'book')).toBe(false);
    expect(filtered).toHaveLength(4);
  });
});

describe('shouldShowFeasibilityRepairWorkflow', () => {
  it('shows for suggest_adjust even when repair options are not loaded yet', () => {
    expect(
      shouldShowFeasibilityRepairWorkflow({
        issue: { ...longDriveIssue, priority: 'suggest_adjust' },
        repairOptionCount: 0,
      }),
    ).toBe(true);
  });

  it('hides for pending_confirm without repair hints when empty', () => {
    expect(
      shouldShowFeasibilityRepairWorkflow({
        issue: { ...longDriveIssue, priority: 'pending_confirm', uiHints: undefined },
        repairOptionCount: 0,
      }),
    ).toBe(false);
  });
});
