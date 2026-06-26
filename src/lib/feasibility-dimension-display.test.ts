import { describe, expect, it } from 'vitest';
import {
  feasibilityDimensionGridClass,
  normalizeFeasibilityDimensionTiles,
  normalizeFeasibilityReportFromApi,
} from '@/lib/feasibility-dimension-display';
import type { TripFeasibilityReportDto } from '@/types/trip-feasibility-report';

const baseReport = (): TripFeasibilityReportDto => ({
  tripId: 't1',
  tripTitle: 'Test',
  dateRangeLabel: '',
  verdict: { status: 'ADJUST_REQUIRED', headline: '需调整' },
  overallScore: 72,
  isStale: false,
  dimensions: [],
  dayTimeline: [],
  issues: [],
  alternatives: [],
  summary: { mustHandle: 0, suggestAdjust: 1, pendingConfirm: 0, blockers: 0 },
});

describe('normalizeFeasibilityDimensionTiles', () => {
  it('parses six dimensions from API snake_case', () => {
    const dims = normalizeFeasibilityDimensionTiles([
      { key: 'schedule', label: '日程可行性', score: 80, status_label: '正常', issue_count: 0, blocker_count: 0 },
      { key: 'team_fit', label: '团队成员适配', score: 60, issue_count: 1, blocker_count: 0 },
      {
        key: 'itinerary_completeness',
        label: '行程结构完整',
        score: 55,
        issue_count: 2,
        blocker_count: 0,
      },
    ]);
    expect(dims).toHaveLength(3);
    expect(dims?.[1]?.key).toBe('team_fit');
    expect(dims?.[2]?.issueCount).toBe(2);
  });
});

describe('feasibilityDimensionGridClass', () => {
  it('uses three columns for six dimensions', () => {
    expect(feasibilityDimensionGridClass(6)).toContain('grid-cols-3');
  });
});

describe('normalizeFeasibilityReportFromApi', () => {
  it('merges team fit summary from raw payload', () => {
    const report = normalizeFeasibilityReportFromApi(baseReport(), {
      team_fit_summary: { score: 58, member_count: 3, profiling_completed_count: 1 },
    });
    expect(report.teamFitSummary?.profilingCompletedCount).toBe(1);
  });
});
