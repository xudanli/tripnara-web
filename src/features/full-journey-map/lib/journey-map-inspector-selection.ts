import type { CoverageGap, CoverageMapPoi, CoverageMapResponse } from '@/api/readiness';
import { resolveItineraryItemForCoveragePoi } from '@/lib/coverage-poi-matching.util';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import type { JourneyActivity } from '../types';

export type JourneyMapInspectorSelection =
  | { kind: 'poi'; poi: CoverageMapPoi; item: ItineraryItemDetail | null }
  | { kind: 'gap'; gap: CoverageGap };

export interface JourneyMapInspectorContext {
  coverage: CoverageMapResponse | null;
  trip: TripDetail | null;
  itineraryItems: ItineraryItemDetail[];
}

/** 从地图活动 id（poi-* / item-*）或 gap-* 解析 Inspector 选中项，复用 CoverageMapExplorer 同款数据 */
export function resolveJourneyMapInspectorSelection(
  activity: JourneyActivity | null,
  ctx: JourneyMapInspectorContext,
): JourneyMapInspectorSelection | null {
  if (!activity || !ctx.coverage) return null;

  if (activity.id.startsWith('poi-')) {
    const poiId = activity.id.slice('poi-'.length);
    const poi = ctx.coverage.pois.find((p) => p.id === poiId);
    if (!poi) return null;
    const item =
      ctx.trip?.TripDay?.length
        ? resolveItineraryItemForCoveragePoi(poi, ctx.trip.TripDay, ctx.itineraryItems)
        : null;
    return { kind: 'poi', poi, item };
  }

  if (activity.id.startsWith('gap-')) {
    const gapId = activity.id.slice('gap-'.length);
    const gap = ctx.coverage.gaps.find((g) => g.id === gapId);
    if (gap) return { kind: 'gap', gap };
  }

  if (activity.id.startsWith('item-')) {
    const itemId = activity.id.slice('item-'.length);
    const item = ctx.itineraryItems.find((i) => i.id === itemId);
    if (!item) return null;
    const dayIndex = activity.dayIndex + 1;
    const poi =
      ctx.coverage.pois.find(
        (p) =>
          p.day === dayIndex &&
          (p.name === activity.title ||
            p.name === item.Place?.nameCN ||
            p.name === item.Place?.nameEN),
      ) ?? null;
    if (poi) {
      return { kind: 'poi', poi, item };
    }
  }

  return null;
}
