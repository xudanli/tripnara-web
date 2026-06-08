/**
 * 混合出行：Trip 容器 + HikePlan 徒步片段
 * @see docs/api/embedded-hiking-trip-metadata.md
 */

import type { HikePlanRecord } from '@/types/hike-plan';

export type HikingProfile = 'none' | 'embedded' | 'primary';

/** P1 服务端 hiking-summary 与前端展示统一枚举 */
export type HikingPhase =
  | 'idle'
  | 'configure_segments'
  | 'link_plans'
  | 'prep'
  | 'on_trail'
  | 'wrap_up';

export interface HikingSegmentReadinessSnapshot {
  level: string;
  score: number;
  evaluatedAt: string;
}

export interface HikingSegment {
  segmentId: string;
  startDate: string;
  endDate?: string;
  routeDirectionId?: number;
  hikePlanId?: string;
  label?: string;
  readinessSnapshot?: HikingSegmentReadinessSnapshot;
}

export interface EmbeddedHikingTripMetadata {
  hikingProfile?: HikingProfile;
  hikingSegments?: HikingSegment[];
}

/** P2 POST /hiking/hike-plans/with-segment */
export interface CreateHikePlanWithSegmentRequest {
  tripId: string;
  routeDirectionId: number;
  plannedDate?: string;
  plannedStartTime?: string;
  nameCN?: string;
  segment: HikingSegment;
}

export interface CreateHikePlanWithSegmentResponse {
  hikePlan: HikePlanRecord;
  segment: HikingSegment;
}

/** generate-plan state.signals.embeddedHiking（与后端对齐） */
export interface EmbeddedHikingSignals {
  segmentCount: number;
  effectiveDays: number;
  startDate?: string;
  endDate?: string;
}
