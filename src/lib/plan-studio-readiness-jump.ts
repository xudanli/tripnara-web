import type { TripDetail } from '@/types/trip';
import type { AffectedPoi } from '@/api/readiness';
import type { ReadinessTripScope } from '@/api/readiness';

type SelectActions = {
  selectDay: (
    dayIndex: number,
    date: string,
    dayStats?: { totalItems: number; hasMeal: boolean; hasTransit: boolean }
  ) => void;
  selectItem: (
    itemId: string,
    placeName: string,
    itemType: string,
    extended?: { dayStats?: { totalItems: number; hasMeal: boolean; hasTransit: boolean } }
  ) => void;
};

function dayStatsForTripDay(day: TripDetail['TripDay'][0]) {
  const items = day.ItineraryItem || [];
  return {
    totalItems: items.length,
    hasMeal: items.some(i => i.type === 'MEAL_ANCHOR' || i.type === 'MEAL_FLOATING'),
    hasTransit: items.some(i => i.type === 'TRANSIT'),
  };
}

/**
 * 选中某一天并尽量选中某一行程项（用于准备度 / 风险跳转）。
 * day 为行程内第几天（1-based），与 ScheduleTab selectDay(idx+1, …) 一致。
 */
export function jumpToTripDayAndMaybeItem(
  trip: TripDetail | null | undefined,
  actions: SelectActions | null | undefined,
  opts: { day: number; itineraryItemId?: string; placeId?: string }
): boolean {
  if (!trip?.TripDay?.length || !actions || opts.day < 1) return false;
  const dayRow = trip.TripDay[opts.day - 1];
  if (!dayRow?.date) return false;
  const items = dayRow.ItineraryItem || [];
  const dayStats = dayStatsForTripDay(dayRow);
  actions.selectDay(opts.day, dayRow.date, dayStats);

  let item = opts.itineraryItemId ? items.find(i => i.id === opts.itineraryItemId) : undefined;
  if (!item && opts.placeId) {
    item = items.find(i => i.Place?.id === opts.placeId);
  }
  if (item) {
    const placeName =
      item.Place?.nameCN || item.Place?.nameEN || item.Place?.name || '';
    actions.selectItem(item.id, placeName, item.type, { dayStats });
  }
  return true;
}

/** 覆盖缺口 tripScope → 时间轴某天 / 某点（segmentId 视为可能的行程项 id） */
export function jumpFromTripScope(
  trip: TripDetail | null | undefined,
  actions: SelectActions | null | undefined,
  scope: ReadinessTripScope
): boolean {
  if (!scope.day || scope.day < 1) return false;
  const placeHint =
    scope.kind === 'poi'
      ? scope.fromPoi?.id || scope.toPoi?.id
      : scope.fromPoi?.id || scope.toPoi?.id;
  return jumpToTripDayAndMaybeItem(trip, actions, {
    day: scope.day,
    itineraryItemId: scope.segmentId,
    placeId: placeHint,
  });
}

/** 风险卡片 affectedPois → 某天 / 某行程项（id 可能是行程项 id 或 Place id，依次匹配） */
export function jumpFromAffectedPoi(
  trip: TripDetail | null | undefined,
  actions: SelectActions | null | undefined,
  poi: AffectedPoi
): boolean {
  if (!poi.day || poi.day < 1) return false;
  return jumpToTripDayAndMaybeItem(trip, actions, {
    day: poi.day,
    itineraryItemId: poi.id,
    placeId: poi.id,
  });
}
