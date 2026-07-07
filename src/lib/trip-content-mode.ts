/**
 * Trip 内容模式 · 替代「items.length === 0 ⇒ 生成中」推断
 *
 * @see GET /trips/:id — generatingItems, tripContentMode
 */

import type { TripDetail, TripListItem } from '@/types/trip';
import { normalizeTripStatusFromApi } from '@/lib/in-trip-execution';
import { getMatchSquareInstantiation } from '@/lib/match-square-trip-metadata';
import { getTripHikingProfile } from '@/lib/trip-hiking';

export type TripContentMode = 'poi_timeline' | 'hiking_primary' | 'skeleton_only';

const TRIP_CONTENT_MODES = new Set<TripContentMode>([
  'poi_timeline',
  'hiking_primary',
  'skeleton_only',
]);

function parseTripContentMode(value: unknown): TripContentMode | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'poi_timeline' || normalized === 'classic_poi' || normalized === 'poi_itinerary') {
    return 'poi_timeline';
  }
  if (normalized === 'hiking_primary' || normalized === 'hiking') return 'hiking_primary';
  if (normalized === 'skeleton_only' || normalized === 'skeleton') return 'skeleton_only';
  return TRIP_CONTENT_MODES.has(normalized as TripContentMode)
    ? (normalized as TripContentMode)
    : undefined;
}

function ____readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

/** 是否已有经典 POI 行程项（非 loading 推断依据） */
export function hasPoiTimelineItems(
  trip: Pick<TripDetail, 'TripDay' | 'statistics'> | null | undefined
): boolean {
  if (!trip) return false;
  if (trip.statistics?.totalItems != null && trip.statistics.totalItems > 0) return true;
  return (
    trip.TripDay?.some((day) => (day.ItineraryItem?.length ?? 0) > 0) ?? false
  );
}

/** NL 后台生成标记（根级或 metadata） */
export function resolveTripGeneratingItems(
  trip: { generatingItems?: boolean; metadata?: Record<string, unknown> } | null | undefined
): boolean {
  if (!trip) return false;
  if (trip.generatingItems === true) return true;
  const md = trip.metadata;
  if (md?.generatingItems === true || md?.generating_items === true) return true;

  // 过渡：后端尚未写 generatingItems 时，沿用 generationProgress 进行中态
  const progress = md?.generationProgress ?? md?.generation_progress;
  const status =
    progress && typeof progress === 'object'
      ? (progress as { status?: string }).status
      : undefined;
  if (status && status !== 'completed' && status !== 'failed') {
    return true;
  }
  return false;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export type TripPlanningAvailability =
  | 'ready'
  | 'draft'
  | 'collecting_info'
  | 'initializing'
  | 'ready_to_generate'
  | 'generating'
  | 'failed';

export function resolveTripPlanningAvailability(
  trip:
    | {
        status?: string;
        generatingItems?: boolean;
        planningAvailability?: TripPlanningAvailability | string;
        metadata?: Record<string, unknown>;
      }
    | null
    | undefined
): TripPlanningAvailability {
  if (!trip) return 'ready';

  const explicit = trip.planningAvailability;
  if (typeof explicit === 'string') {
    const normalized = explicit.toLowerCase() as TripPlanningAvailability;
    if (
      normalized === 'ready' ||
      normalized === 'draft' ||
      normalized === 'collecting_info' ||
      normalized === 'initializing' ||
      normalized === 'ready_to_generate' ||
      normalized === 'generating' ||
      normalized === 'failed'
    ) {
      return normalized;
    }
  }

  const md = trip.metadata ?? {};
  const progress = readRecord(md.generationProgress ?? md.generation_progress);
  const progressStatus = readString(progress?.status)?.toLowerCase();
  if (progressStatus === 'failed') return 'failed';
  if (progressStatus === 'completed') return 'ready';
  if (resolveTripGeneratingItems(trip)) return 'generating';

  const nlDraft = readRecord(md.nlDraft ?? md.nl_draft);
  const lifecycle = (
    readString(md.lifecycleStatus) ??
    readString(md.lifecycle_status) ??
    readString(nlDraft?.lifecycleStatus) ??
    readString(nlDraft?.lifecycle_status) ??
    (readString(trip.status)?.toUpperCase() === 'DRAFT' ? readString(trip.status) : undefined)
  )?.toUpperCase();

  const readiness = readRecord(md.planningReadiness ?? md.planning_readiness);
  const readinessStatus = readString(readiness?.status)?.toUpperCase();
  const canInitialize = readiness?.canInitializePlanning ?? readiness?.can_initialize_planning;
  const hasNlDraft = Boolean(nlDraft || md.createdFromNaturalLanguage === true);

  if (lifecycle === 'DRAFT') {
    if (readinessStatus === 'INSUFFICIENT' || canInitialize === false) return 'collecting_info';
    return 'draft';
  }

  if (hasNlDraft && readinessStatus === 'READY_FOR_ITINERARY') return 'ready_to_generate';
  if (lifecycle === 'READY_TO_GENERATE' || lifecycle === 'GENERATING') return 'generating';

  return 'ready';
}

export function isTripPlanningUnavailable(
  trip:
    | {
        status?: string;
        generatingItems?: boolean;
        metadata?: Record<string, unknown>;
      }
    | null
    | undefined
): boolean {
  return resolveTripPlanningAvailability(trip) !== 'ready';
}

export function getTripPlanningAvailabilityLabel(state: TripPlanningAvailability): string {
  switch (state) {
    case 'draft':
      return '草稿已保存';
    case 'collecting_info':
      return '待补充信息';
    case 'initializing':
      return '正在初始化';
    case 'ready_to_generate':
      return '待生成方案';
    case 'generating':
      return '正在生成';
    case 'failed':
      return '生成失败';
    case 'ready':
      return '可查看';
  }
}

/** 解析 tripContentMode（API 优先，metadata / 徒步 / Match Square 兜底） */
export function resolveTripContentMode(
  trip:
    | (Pick<TripDetail, 'tripContentMode' | 'metadata' | 'TripDay' | 'statistics'> & {
        generatingItems?: boolean;
      })
    | null
    | undefined
): TripContentMode {
  if (!trip) return 'poi_timeline';

  const explicit =
    parseTripContentMode(trip.tripContentMode) ??
    parseTripContentMode(trip.metadata?.tripContentMode) ??
    parseTripContentMode(trip.metadata?.trip_content_mode);
  if (explicit) return explicit;

  const md = trip.metadata ?? {};
  const inst = getMatchSquareInstantiation(md);
  const hikingProfile = getTripHikingProfile({ metadata: md });

  if (hikingProfile === 'embedded' || hikingProfile === 'primary') {
    return 'hiking_primary';
  }

  if (inst) {
    const instProfile = inst.hikingProfile ?? hikingProfile;
    if (instProfile === 'embedded' || instProfile === 'primary') {
      return 'hiking_primary';
    }
    if (!hasPoiTimelineItems(trip)) {
      return 'skeleton_only';
    }
  }

  if (hasPoiTimelineItems(trip)) {
    return 'poi_timeline';
  }

  return 'poi_timeline';
}

/** 仅 NL 建行程：应展示「行程项生成中」占位 */
export function shouldShowNlItemsGeneratingPlaceholder(
  trip: TripDetail | null | undefined
): boolean {
  if (!trip) return false;
  if (resolveTripGeneratingItems(trip)) return true;

  const progress = trip.metadata?.generationProgress;
  if (progress?.status === 'failed') return true;

  return false;
}

/** skeleton_only 且尚无 POI 时间轴 — 展示补全引导空态 */
export function shouldShowTripSkeletonOnlyEmptyState(
  trip: TripDetail | null | undefined
): boolean {
  if (!trip || shouldShowNlItemsGeneratingPlaceholder(trip)) return false;
  if (resolveTripContentMode(trip) !== 'skeleton_only') return false;
  return !hasPoiTimelineItems(trip);
}

import {
  normalizeHikingDayCard,
  normalizeHikingTrailSegments,
} from '@/lib/hiking-day-card';

type TripApiShape = TripDetail & {
  generating_items?: boolean;
  trip_content_mode?: string;
  hiking_trail_segments?: unknown;
  TripDay?: Array<
    TripDetail['TripDay'][0] & {
      hiking_day_card?: unknown;
    }
  >;
};

/** GET /trips/:id 响应字段归一化 */
export function normalizeTripApiFields<T extends TripApiShape>(trip: T): T {
  const generatingItems =
    trip.generatingItems ??
    (trip.generating_items === true ? true : undefined) ??
    (trip.metadata?.generatingItems === true || trip.metadata?.generating_items === true
      ? true
      : undefined);

  const tripContentMode =
    parseTripContentMode(trip.tripContentMode) ??
    parseTripContentMode(trip.trip_content_mode) ??
    parseTripContentMode(trip.metadata?.tripContentMode) ??
    parseTripContentMode(trip.metadata?.trip_content_mode);

  const hikingTrailSegments = normalizeHikingTrailSegments(
    trip.hikingTrailSegments ?? trip.hiking_trail_segments
  );

  const TripDay = trip.TripDay?.map((day) => {
    const withSnake = day as typeof day & { hiking_day_card?: unknown };
    const rawCard = day.hikingDayCard ?? withSnake.hiking_day_card;
    if (rawCard === null) return { ...day, hikingDayCard: null };
    const hikingDayCard = normalizeHikingDayCard(rawCard);
    return hikingDayCard ? { ...day, hikingDayCard } : day;
  });

  return {
    ...trip,
    ...(trip.status
      ? { status: normalizeTripStatusFromApi(trip.status as string) }
      : {}),
    ...(generatingItems !== undefined ? { generatingItems } : {}),
    ...(tripContentMode ? { tripContentMode } : {}),
    ...(hikingTrailSegments.length > 0 ? { hikingTrailSegments } : {}),
    ...(TripDay ? { TripDay } : {}),
  };
}

export function normalizeTripListItemFields(item: TripListItem): TripListItem {
  const raw = item as TripListItem & {
    generatingItems?: boolean;
    generating_items?: boolean;
    tripContentMode?: TripContentMode;
    trip_content_mode?: string;
  };

  const generatingItems =
    raw.generatingItems ??
    (raw.generating_items === true ? true : undefined) ??
    (raw.metadata?.generatingItems === true || raw.metadata?.generating_items === true
      ? true
      : undefined);

  const tripContentMode =
    parseTripContentMode(raw.tripContentMode) ??
    parseTripContentMode(raw.trip_content_mode) ??
    parseTripContentMode(raw.metadata?.tripContentMode) ??
    parseTripContentMode(raw.metadata?.trip_content_mode);

  return {
    ...item,
    ...(item.status
      ? { status: normalizeTripStatusFromApi(item.status as string) }
      : {}),
    ...(generatingItems !== undefined ? { generatingItems } : {}),
    ...(tripContentMode ? { tripContentMode } : {}),
  };
}
