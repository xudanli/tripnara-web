import type { TripListItem, TripStatus } from '@/types/trip';
import type { TripPlanningAvailability } from '@/lib/trip-content-mode';
import type { TripContentMode } from '@/lib/trip-content-mode';

/** GET /trips/list Query */
export interface TripListPageQuery {
  /** 默认 50，最大 100 */
  limit?: number;
  /** 默认 0 */
  offset?: number;
  /** 逗号分隔，如 `PLANNING,IN_PROGRESS`（后端兼容 TRAVELING） */
  status?: string;
  /** 默认 true，已取消排末尾 */
  includeCancelled?: boolean;
}

/** 列表卡片摘要（BFF 投影）— 对齐 backend frontend-trip-list-api.types.ts */
export interface TripListSummaryDto {
  displayStatus: 'planning' | 'pre_trip' | 'traveling' | 'completed' | 'cancelled';
  displayStatusLabel: string;
  coverImageUrl?: string | null;
  /** @deprecated BFF 已合并进 coverImageUrl，与 CountryProfile.coverImageUrl 同源 */
  destinationCoverImageUrl?: string | null;
  /** 封面来源：auto=随机POI / poi=指定POI / user=自定义 */
  coverImageSource?: 'auto' | 'poi' | 'user' | null;
  coverPlaceId?: number | null;
  durationDays: number;
  memberCount: number;
  memberAvatars?: Array<{ userId?: string; name?: string; avatarUrl?: string | null }>;
  progressPercent?: number | null;
  feasibilityScore?: number | null;
  feasibilityLabel?: string | null;
  hardConflictCount?: number | null;
  pendingConfirmCount?: number | null;
  budgetPerPerson?: number | null;
  traveling?: {
    weatherCelsius?: number | null;
    weatherLabel?: string | null;
    nextStopName?: string | null;
    nextStopEta?: string | null;
  };
  primaryAction?: {
    label: string;
    intent: 'open_detail' | 'open_execute' | 'open_plan_studio' | 'open_insights';
  };
}

/** GET /trips/list 单项 — 扩展 TripListItem */
export interface TripListCardDto extends TripListItem {
  destinationLabel?: string;
  currency?: string;
  planningAvailability?: TripPlanningAvailability;
  listSummary?: TripListSummaryDto | null;
  tripContentMode?: TripContentMode;
}

export interface TripListPageResponse {
  trips: TripListCardDto[];
  total: number;
}

export type { TripStatus, TripListCardDto as TripListCardItem };
