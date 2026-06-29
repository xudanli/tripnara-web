import type { PoiCoverageStatus, SegmentCoverageStatus } from '@/api/readiness';

/** 与 CoverageMiniMap 一致的 POI 覆盖状态色 */
export const COVERAGE_POI_COLORS: Record<PoiCoverageStatus, string> = {
  covered: '#22c55e',
  partial: '#eab308',
  uncovered: '#ef4444',
};

/** 与 CoverageMiniMap 一致的路段覆盖状态色 */
export const COVERAGE_SEGMENT_COLORS: Record<SegmentCoverageStatus, string> = {
  covered: '#22c55e',
  warning: '#f97316',
  blocked: '#ef4444',
};

export const COVERAGE_GAP_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#eab308',
};

export function coverageSegmentLineStyle(status: SegmentCoverageStatus): {
  color: string;
  dashed: boolean;
} {
  return {
    color: COVERAGE_SEGMENT_COLORS[status],
    dashed: status !== 'covered',
  };
}
