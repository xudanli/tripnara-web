/**
 * 行程规划完成 / NL 生成门禁
 *
 * 不再用 items.length === 0 推断 loading。
 * 见 trip-content-mode.ts：generatingItems + tripContentMode。
 */

import type { TripDetail, TripListItem } from '@/types/trip';
import {
  hasPoiTimelineItems,
  normalizeTripListItemFields,
  resolveTripContentMode,
  resolveTripGeneratingItems,
  shouldShowNlItemsGeneratingPlaceholder,
} from '@/lib/trip-content-mode';

export type { TripContentMode } from '@/lib/trip-content-mode';
export {
  hasPoiTimelineItems,
  normalizeTripApiFields,
  normalizeTripListItemFields,
  resolveTripContentMode,
  resolveTripGeneratingItems,
  shouldShowNlItemsGeneratingPlaceholder,
  shouldShowTripSkeletonOnlyEmptyState,
} from '@/lib/trip-content-mode';

/**
 * 是否可进入详情 / Plan Studio（不展示 NL「行程项生成中」占位）
 * @deprecated 语义变更：请优先用 shouldShowNlItemsGeneratingPlaceholder 取反
 */
export function isTripPlanningComplete(trip: TripDetail | null | undefined): boolean {
  return !shouldShowNlItemsGeneratingPlaceholder(trip);
}

/**
 * 检查行程是否正在 NL 生成中（未完成且非失败）
 */
export function isTripGenerating(trip: TripDetail | null | undefined): boolean {
  return resolveTripGeneratingItems(trip);
}

/**
 * 列表项是否可能有行程项（用于快速判断，不保证准确）
 */
export function listItemHasItineraryItems(item: TripListItem | null | undefined): boolean | null {
  if (!item) return null;

  const normalized = normalizeTripListItemFields(item);
  if (resolveTripGeneratingItems(normalized)) return false;
  if (resolveTripContentMode(normalized) === 'skeleton_only') return true;

  if (hasPoiTimelineItems(normalized)) return true;

  const stats = (normalized as TripListItem & { statistics?: { totalItems?: number } }).statistics;
  if (stats && typeof stats.totalItems === 'number' && stats.totalItems > 0) {
    return true;
  }
  if ((normalized as TripListItem & { hasItineraryItems?: boolean }).hasItineraryItems === true) {
    return true;
  }
  return null;
}
