/**
 * GET /trips/:tripId/hiking-summary
 * @see docs/api/embedded-hiking-trip-metadata.md
 */

import type { HikePlanRecord, HikePlanStatus } from '@/types/hike-plan';
import type { HikingPhase, HikingProfile, HikingSegment } from '@/types/hiking-embedded';

/** 摘要内嵌的 HikePlan（字段可少于完整 Record） */
export interface HikePlanSummaryEmbed {
  id: string;
  status: HikePlanStatus | 'prep' | string;
  plannedDate?: string;
  routeDirectionId?: number;
  checklistComplete?: boolean;
  checklistCompleted?: boolean;
  permitsComplete?: boolean;
  permitsObtained?: boolean;
}

export interface HikingSegmentSummaryItem extends HikingSegment {
  hikePlan?: HikePlanSummaryEmbed | HikePlanRecord | null;
}

export interface TripHikingSummary {
  tripId: string;
  hikingProfile: HikingProfile;
  hikingPhase: HikingPhase;
  phaseHintZh?: string;
  segments: HikingSegmentSummaryItem[];
  hikePlans?: HikePlanRecord[];
}

/** GET /trips/:tripId/hiking-segments/:segmentId/evaluate */
export interface HikingSegmentEvaluateResponse {
  segmentId: string;
  readiness?: {
    level?: string;
    score?: number;
    headlineZh?: string;
    summaryZh?: string;
    evaluatedAt?: string;
  };
  permits?: {
    complete?: boolean;
    permitsComplete?: boolean;
    missingZh?: string[];
    hintsZh?: string[];
  };
  costHintZh?: string;
  feeHintZh?: string;
}
