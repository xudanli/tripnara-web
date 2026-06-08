import type { RouteDirection } from '@/types/places-routes';
import { listEstimatedDays, listTotalDistanceKm } from '@/lib/hiking-trail-detail-ui';

export type TrailFilterState = {
  searchQuery?: string;
  difficulty?: string;
  distanceRange?: [number, number];
  elevationRange?: [number, number];
  quickTags?: string[];
};

function matchesQuickTag(trail: RouteDirection, tag: string): boolean {
  const text = [
    trail.nameCN,
    trail.name,
    ...(trail.tags ?? []),
    ...(trail.regions ?? []),
    trail.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const days = listEstimatedDays(trail);
  if (tag === '1-day') {
    if (days != null) return days <= 1;
    return /1\s*day|一日|当天|1\s*天/i.test(text);
  }
  if (tag === '2-3-days') {
    if (days != null) return days >= 2 && days <= 3;
    return /2|3|两天|三天|2-3/i.test(text);
  }

  const map: Record<string, RegExp> = {
    waterfall: /waterfall|瀑布/i,
    ridge: /ridge|山脊/i,
    glacier: /glacier|冰川/i,
    'hot-spring': /hot\s*spring|温泉/i,
  };
  const re = map[tag];
  return re ? re.test(text) : text.includes(tag.toLowerCase());
}

export function filterTrails(
  trails: RouteDirection[],
  filters: TrailFilterState
): RouteDirection[] {
  let result = [...trails];

  const q = filters.searchQuery?.trim().toLowerCase();
  if (q) {
    result = result.filter((t) => {
      const hay = [
        t.nameCN,
        t.name,
        t.countryCode,
        ...(t.regions ?? []),
        ...(t.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  if (filters.difficulty) {
    const d = filters.difficulty.toLowerCase();
    result = result.filter((t) => {
      const level = (t.riskProfile?.level ?? '').toLowerCase();
      return level.includes(d) || level === d;
    });
  }

  const [dMin, dMax] = filters.distanceRange ?? [0, 100];
  if (dMin > 0 || dMax < 100) {
    result = result.filter((t) => {
      const km = listTotalDistanceKm(t);
      if (km == null) return true;
      return km >= dMin && km <= dMax;
    });
  }

  const [eMin, eMax] = filters.elevationRange ?? [0, 5000];
  if (eMin > 0 || eMax < 5000) {
    result = result.filter((t) => {
      const m = t.constraints?.soft?.maxElevationM;
      if (m == null) return true;
      return m >= eMin && m <= eMax;
    });
  }

  if (filters.quickTags?.length) {
    result = result.filter((t) =>
      filters.quickTags!.some((tag) => matchesQuickTag(t, tag))
    );
  }

  return result;
}
