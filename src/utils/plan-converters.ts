/**
 * 计划转换工具
 *
 * 将 TripDetail 等前端数据结构转换为 V2 优化 API 所需的 RoutePlanDraft 格式
 *
 * @module utils/plan-converters
 */

import type { TripDetail, ItineraryItem } from '@/types/trip';
import type { RoutePlanDraft, DayPlan, DaySegment } from '@/types/optimization-v2';

/**
 * 从行程项获取地点名称
 */
function getPlaceName(item: ItineraryItem): string {
  if (item.Place?.nameCN) return item.Place.nameCN;
  if (item.Place?.nameEN) return item.Place.nameEN ?? '';
  if (item.note) return item.note;
  return '未知地点';
}

/**
 * 将每日行程项转换为路段列表
 *
 * 相邻地点之间生成 from-to 路段，如有 travelFromPreviousDistance 则填入 distanceKm
 */
function convertDayToSegments(
  items: ItineraryItem[]
): Array<{ from: string; to: string; distanceKm?: number }> {
  const segments: Array<{ from: string; to: string; distanceKm?: number }> = [];

  for (let i = 0; i < items.length - 1; i++) {
    const from = getPlaceName(items[i]);
    const to = getPlaceName(items[i + 1]);
    if (from !== to) {
      const nextItem = items[i + 1];
      const distanceKm =
        nextItem.travelFromPreviousDistance != null
          ? Math.round(nextItem.travelFromPreviousDistance! / 1000)
          : undefined;
      segments.push({ from, to, distanceKm });
    }
  }

  if (segments.length === 0 && items.length > 0) {
    const placeName = getPlaceName(items[0]);
    segments.push({ from: placeName, to: placeName, distanceKm: 0 });
  }

  return segments;
}

/**
 * 将 TripDetail 转换为 RoutePlanDraft（V2 优化 API 格式）
 *
 * @param trip - 行程详情
 * @param routeDirectionId - 可选，路线方向 ID（默认从 destination 推导）
 * @returns RoutePlanDraft
 *
 * @example
 * ```ts
 * const plan = tripDetailToRoutePlanDraft(tripDetail, 'iceland-ring-road');
 * await optimizationApi.evaluate({ plan, world });
 * ```
 */
export function tripDetailToRoutePlanDraft(
  trip: TripDetail,
  routeDirectionId?: string
): RoutePlanDraft {
  const days: DayPlan[] = (trip.TripDay ?? []).map((day, index) => ({
    dayNumber: index + 1,
    date: day.date,
    segments: convertDayToSegments(day.ItineraryItem ?? []),
  }));

  return {
    tripId: trip.id,
    routeDirectionId:
      routeDirectionId ??
      trip.destination?.toLowerCase().replace(/\s+/g, '-') ??
      undefined,
    days,
    metadata: {
      totalDays: days.length,
      startDate: trip.startDate,
      endDate: trip.endDate,
    },
  };
}
