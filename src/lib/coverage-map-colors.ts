import type { PoiCoverageStatus, SegmentCoverageStatus } from '@/api/readiness';
import {
  SEMANTIC_BLUE_HEX,
  SEMANTIC_GREEN_HEX,
  SEMANTIC_RED_HEX,
} from '@/lib/semantic-colors';

/** 与 CoverageMiniMap 一致的 POI 覆盖状态色 */
export const COVERAGE_POI_COLORS: Record<PoiCoverageStatus, string> = {
  covered: SEMANTIC_GREEN_HEX,
  partial: '#eab308',
  uncovered: SEMANTIC_RED_HEX,
};

/** 与 CoverageMiniMap 一致的路段覆盖状态色 */
export const COVERAGE_SEGMENT_COLORS: Record<SegmentCoverageStatus, string> = {
  covered: SEMANTIC_GREEN_HEX,
  warning: '#f97316',
  blocked: SEMANTIC_RED_HEX,
};

export const COVERAGE_GAP_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: SEMANTIC_RED_HEX,
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

export { SEMANTIC_BLUE_HEX };
