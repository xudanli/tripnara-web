/**
 * HikePlan 全生命周期 API 类型
 * @see docs/api/hike-plan-lifecycle.md
 */

import type {
  PrepChecklist,
  PrepPermit,
  PrepTransport,
  TrailEvent,
  TrailRiskAlert,
  TrailRepairSuggestion,
  HikeReview,
} from '@/types/trail';
import type { Coordinates } from '@/types/common';

export type HikePlanStatus =
  | 'planning'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface HikePlanRecord {
  id: string;
  routeDirectionId: number;
  routeDirectionName?: string;
  nameCN?: string;
  countryCode?: string;
  tripId?: string;
  plannedDate: string;
  plannedStartTime?: string;
  durationDays?: number;
  status: HikePlanStatus;
  checklistCompleted?: boolean;
  permitsObtained?: boolean;
  transportArranged?: boolean;
  offlinePackDownloaded?: boolean;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHikePlanRequest {
  routeDirectionId: number;
  tripId?: string;
  plannedDate?: string;
  plannedStartTime?: string;
  routeDirectionName?: string;
  nameCN?: string;
}

export interface UpdateHikePlanRequest {
  plannedDate?: string;
  plannedStartTime?: string;
  status?: HikePlanStatus;
  checklistCompleted?: boolean;
  permitsObtained?: boolean;
  transportArranged?: boolean;
  offlinePackDownloaded?: boolean;
}

export interface HikePlanPrepData {
  hikePlanId: string;
  checklist: PrepChecklist[];
  permits: PrepPermit[];
  transport?: PrepTransport;
  /** 后端 PATCH 后自动重算 */
  checklistComplete?: boolean;
  permitsComplete?: boolean;
  offlineReady?: boolean;
  /** @deprecated 读时兼容旧响应 */
  checklistCompleted?: boolean;
  permitsObtained?: boolean;
  offlinePackDownloaded?: boolean;
}

export interface UpdateHikePlanPrepRequest {
  checklist?: PrepChecklist[];
  permits?: PrepPermit[];
  transport?: PrepTransport;
  /** 传清单/许可后由后端重算，一般无需手填 */
  checklistComplete?: boolean;
  permitsComplete?: boolean;
  offlineReady?: boolean;
  checklistCompleted?: boolean;
  permitsObtained?: boolean;
  transportArranged?: boolean;
  offlinePackDownloaded?: boolean;
}

export interface GpsTrackPointDto {
  lat: number;
  lng: number;
  altitudeM?: number;
  accuracyM?: number;
  speedMps?: number;
  headingDeg?: number;
  recordedAt: string;
}

export interface UploadTrackPointsRequest {
  points: GpsTrackPointDto[];
  /** 幂等批次 ID */
  clientBatchId?: string;
}

export interface UploadTrackPointsResponse {
  accepted: number;
  totalPoints: number;
  summary: GpsTrackSummary;
}

export interface GpsTrackSummary {
  pointCount: number;
  distanceKm: number;
  durationMin: number;
  elevationGainM?: number;
  startedAt?: string;
  lastRecordedAt?: string;
}

export interface GpsTrackResponse {
  hikePlanId: string;
  points: GpsTrackPointDto[];
  summary: GpsTrackSummary;
}

export interface OnTrailLiveStateDto {
  hikePlanId: string;
  currentLocation?: Coordinates;
  currentElevationM?: number;
  currentSegmentId?: string;
  distanceCompletedKm: number;
  elevationGainedM: number;
  timeElapsedMin: number;
  estimatedArrivalTime?: string;
  sunsetCountdownMin?: number;
  isOffline?: boolean;
  /** 偏航判定阈值（米），默认 50 */
  routeDeviationThresholdM?: number;
  activeRisks?: TrailRiskAlert[];
  paceStatus?: {
    currentPace: number;
    plannedPace: number;
    bufferRemainingMin: number;
    latestTurnaroundTime?: string;
  };
  repairSuggestions?: TrailRepairSuggestion[];
  events: TrailEvent[];
  gpsSummary?: GpsTrackSummary;
}

export interface UpdateOnTrailLiveStateRequest {
  currentLocation?: Coordinates;
  currentElevationM?: number;
  distanceCompletedKm?: number;
  elevationGainedM?: number;
  timeElapsedMin?: number;
  isOffline?: boolean;
  routeDeviationThresholdM?: number;
  events?: TrailEvent[];
}

export interface HikeReviewResponse {
  hikePlanId: string;
  review: HikeReview;
}

export interface GenerateHikeReviewRequest {
  useGpsTrack?: boolean;
}
