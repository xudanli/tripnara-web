/**
 * 路线模板 POI 同步：当 create-trip 未生成行程项时，按名称解析 placeId 并写入行程。
 *
 * 背景：部分模板（如冰岛环岛）dayPlans.pois 仅有 nameCN/nameEN，无 id；
 * 后端 create-trip 仅按 place id 匹配，会创建空行程。
 */

import { placesApi } from '@/api/places';
import { itineraryItemsApi, tripsApi } from '@/api/trips';
import type { DayPlan, DayPlanPoi } from '@/types/places-routes';
import type { PlaceWithDistance } from '@/types/places-routes';

export type TemplatePoiSyncResult = {
  created: number;
  failed: number;
  skipped: number;
  unresolved: string[];
};

function normalizeTimeOnDate(dayDate: string, timeStr?: string, fallbackHour = 9): string {
  const dateOnly = dayDate.split('T')[0];
  if (!timeStr) {
    return `${dateOnly}T${String(fallbackHour).padStart(2, '0')}:00:00.000Z`;
  }
  if (timeStr.includes('T')) return timeStr;
  const [h, m] = timeStr.split(':');
  return `${dateOnly}T${h?.padStart(2, '0') ?? '09'}:${m?.padStart(2, '0') ?? '00'}:00.000Z`;
}

function endTimeFromDuration(startIso: string, durationMinutes?: number): string {
  const start = new Date(startIso);
  const mins = durationMinutes && durationMinutes > 0 ? durationMinutes : 60;
  return new Date(start.getTime() + mins * 60 * 1000).toISOString();
}

function pickBestPlaceMatch(poi: DayPlanPoi, results: PlaceWithDistance[]): PlaceWithDistance | undefined {
  if (!results.length) return undefined;

  const nameEN = poi.nameEN?.trim().toLowerCase();
  const nameCN = poi.nameCN?.trim();

  if (nameEN) {
    const exact = results.find(
      (r) =>
        r.nameEN?.toLowerCase() === nameEN ||
        r.name?.toLowerCase() === nameEN
    );
    if (exact) return exact;
  }

  if (nameCN) {
    const exact = results.find((r) => r.nameCN === nameCN);
    if (exact) return exact;
  }

  if (nameEN) {
    const partial = results.find(
      (r) =>
        r.nameEN?.toLowerCase().includes(nameEN) ||
        (nameCN && r.nameCN?.includes(nameCN))
    );
    if (partial) return partial;
  }

  return results[0];
}

async function searchPlacesForPoi(
  poi: DayPlanPoi,
  countryCode?: string
): Promise<PlaceWithDistance | undefined> {
  const queries = [poi.nameEN?.trim(), poi.nameCN?.trim()].filter(Boolean) as string[];

  for (const q of queries) {
    try {
      const results = await placesApi.searchPlaces({
        q,
        countryCode,
        limit: 8,
      });
      const match = pickBestPlaceMatch(poi, results);
      if (match) return match;
    } catch {
      // 继续尝试下一个查询词
    }
  }

  const semanticQuery = poi.nameEN?.trim() || poi.nameCN?.trim();
  if (!semanticQuery) return undefined;

  try {
    const semantic = await placesApi.semanticSearchPlaces({
      q: semanticQuery,
      countryCode,
      limit: 5,
    });
    const results = semantic?.results ?? [];
    return pickBestPlaceMatch(poi, results);
  } catch {
    return undefined;
  }
}

async function resolvePlaceForPoi(
  poi: DayPlanPoi,
  countryCode?: string
): Promise<PlaceWithDistance | undefined> {
  if (typeof poi.id === 'number' && Number.isFinite(poi.id) && poi.id > 0) {
    return { id: poi.id, nameCN: poi.nameCN, nameEN: poi.nameEN } as PlaceWithDistance;
  }
  return searchPlacesForPoi(poi, countryCode);
}

export function countDayPlanPois(dayPlans?: DayPlan[]): number {
  if (!dayPlans?.length) return 0;
  return dayPlans.reduce((sum, day) => sum + (day.pois?.length ?? 0), 0);
}

/** create-trip 返回 0 项但模板含 POI 时需前端补同步 */
export function shouldSyncTemplatePoisAfterCreate(
  totalItems: number | undefined,
  dayPlans?: DayPlan[]
): boolean {
  if (!dayPlans?.length) return false;
  return countDayPlanPois(dayPlans) > 0 && (totalItems ?? 0) === 0;
}

export async function syncTemplatePoisToTrip(input: {
  tripId: string;
  dayPlans: DayPlan[];
  destinationCountryCode?: string;
}): Promise<TemplatePoiSyncResult> {
  const trip = await tripsApi.getById(input.tripId);
  const sortedDays = [...(trip.TripDay ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const result: TemplatePoiSyncResult = {
    created: 0,
    failed: 0,
    skipped: 0,
    unresolved: [],
  };

  for (const dayPlan of input.dayPlans) {
    const pois = dayPlan.pois ?? [];
    if (!pois.length) continue;

    const tripDay = sortedDays[dayPlan.day - 1];
    if (!tripDay?.id) {
      result.skipped += pois.length;
      continue;
    }

    for (const poi of pois) {
      const label = poi.nameCN || poi.nameEN || `day${dayPlan.day}`;
      try {
        const place = await resolvePlaceForPoi(poi, input.destinationCountryCode);
        const startTime = normalizeTimeOnDate(tripDay.date, poi.startTime);
        const endTime = poi.endTime
          ? normalizeTimeOnDate(tripDay.date, poi.endTime)
          : endTimeFromDuration(startTime, poi.durationMinutes);

        await itineraryItemsApi.create({
          tripDayId: tripDay.id,
          type: 'ACTIVITY',
          placeId: place?.id,
          placeName: !place?.id ? poi.nameCN || poi.nameEN : undefined,
          startTime,
          endTime,
          note: poi.required || poi.priority === 'MUST_SEE' ? '[必游]' : undefined,
          forceCreate: true,
        });
        result.created += 1;
      } catch {
        result.failed += 1;
        result.unresolved.push(label);
      }
    }
  }

  return result;
}
