/**
 * 行程详情 Tab BFF 类型（files / timeline-overview / collab-overview）
 * 与后端 `frontend-trip-detail-tab-api.types.ts` 对齐；本仓库由现有 types 聚合。
 */

import type {
  TripFileListResponse,
  TripFileOverviewResponse,
  TripFileStatsResponse,
} from '@/types/trip-files';
import type { TimelineOverviewResponse } from '@/types/timeline-overview';
import type { CollabOverviewResponse } from '@/types/collab-overview';
import type { AccommodationOverviewResponse } from '@/types/accommodation-overview';

export type {
  TimelineOverviewQuery,
  TimelineOverviewResponse,
  TimelineOverviewPlanning,
  TimelineOverviewStats,
} from '@/types/timeline-overview';

/** Tab BFF preset（v1.7）；显式 include 优先于 preset */
export type TripDetailTabBffPreset = 'shell' | 'full';

/** 与后端 BFF_INCLUDE_PRESETS 对齐 */
export const TRIP_DETAIL_TAB_BFF_INCLUDES = {
  timelineShell: 'stats',
  timelinePhase2: 'stats,pipeline,tasks,reminders,planobjects',
  timelineWithSuggestions: 'stats,pipeline,tasks,reminders,suggestions',
  collabShell: 'members,health',
} as const;

export type TripDetailTabFirstPaint = {
  timeline: TimelineOverviewResponse;
  collab: CollabOverviewResponse;
  files: TripFilesTabData;
  accommodation: AccommodationOverviewResponse;
};

export type TripDetailTabPhase2 = {
  timeline: TimelineOverviewResponse;
  collab: CollabOverviewResponse;
};

export type {
  CollabOverviewQuery,
  CollabOverviewResponse,
  CollabOverviewCollaborator,
  CollabOverviewDomainInfluence,
  CollabOverviewFrictionRadar,
  CollabOverviewSilentVote,
  CollabOverviewTaskItem,
  CollabOverviewTaskKind,
  CollabOverviewTeamHealth,
  CollabOverviewTeamRef,
  CollabOverviewWishSummary,
  CollabTeamHealthStatus,
} from '@/types/collab-overview';

export type {
  AccommodationAlternative,
  AccommodationBookingDocument,
  AccommodationNightCard,
  AccommodationOverviewQuery,
  AccommodationOverviewResponse,
  AccommodationOverviewStats,
  AccommodationPlaceSummary,
  AccommodationReminder,
  AccommodationTravelImpact,
  AccommodationTravelSummary,
} from '@/types/accommodation-overview';

export type {
  ActivityFavoriteItem,
  ActivityFavoritesResponse,
  ToggleActivityFavoriteRequest,
} from '@/types/activity-favorites';

export type {
  CreateTripFilePendingRequest,
  TripFileCategory,
  TripFileCategoryStats,
  TripFileDownloadResponse,
  TripFileItem,
  TripFileListQuery,
  TripFileListResponse,
  TripFileOverviewItem,
  TripFileOverviewQuery,
  TripFileOverviewResponse,
  TripFileOverviewSources,
  TripFileOverviewStatus,
  TripFileSource,
  TripFileStatsResponse,
  TripFileStatus,
} from '@/types/trip-files';

/** 文件 Tab 首屏：`GET /files/overview` 聚合读模型 */
export type TripFilesTabData = TripFileOverviewResponse;
