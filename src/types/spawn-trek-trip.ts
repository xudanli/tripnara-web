import type { TrekkingVibeOrchestrationPlan } from '@/types/trekking-vibe-orchestration';

export type SpawnTrekTripRouteCandidate = {
  routeDirectionKey: string;
  label: string;
  availability: 'live' | 'planned';
  routeDirectionId?: number;
  recommended?: boolean;
};

export type PreferenceEvolutionReason =
  | 'TREK_VIBE_CONFIRMED'
  | 'TREK_READINESS_ACK'
  | 'TREK_POST_RATING_FIVE_STAR';

/** GET /match-square/posts/:id/spawn-trek-trip/preview */
export type SpawnTrekTripPreview = {
  canSpawn: boolean;
  blockReason?: string | null;
  liveCandidates: SpawnTrekTripRouteCandidate[];
  plannedCandidates: SpawnTrekTripRouteCandidate[];
  selectedRouteDirectionKey?: string | null;
  orchestration?: TrekkingVibeOrchestrationPlan | null;
  offlineDataPreloadRequired?: boolean;
  demGridMetres?: number | null;
  preferenceEvolutionReasonsPlanned?: PreferenceEvolutionReason[];
  alreadySpawned?: boolean;
  existingHikePlanId?: string | null;
  existingTripId?: string | null;
};

/** POST /match-square/posts/:id/spawn-trek-trip */
export type SpawnTrekTripRequest = {
  routeDirectionKey?: string;
  routeDirectionId?: number;
};

export type SpawnTrekTripOfflinePackMeta = {
  routeDirectionId: number;
  demGridMetres?: number | null;
  preloadRequired: boolean;
};

/** POST spawn 响应 */
export type SpawnTrekTripResult = {
  success: boolean;
  message?: string | null;
  hikePlanId?: string | null;
  tripId?: string | null;
  routeDirectionId?: number | null;
  routeDirectionName?: string | null;
  hardTrekTrailPlanAttached?: boolean;
  offlinePackMeta?: SpawnTrekTripOfflinePackMeta | null;
  dnaSyncScheduled?: boolean;
  preferenceEvolutionReasons?: PreferenceEvolutionReason[];
};

/** 招募帖持久化的 spawn 状态 */
export type TrekSpawnState = {
  spawnedAt?: string | null;
  hikePlanId?: string | null;
  tripId?: string | null;
  routeDirectionId?: number | null;
  routeDirectionKey?: string | null;
};
