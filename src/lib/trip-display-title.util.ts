/**
 * 行程名称展示 SSOT：侧栏 / 详情顶栏 / Plan Studio / Nara 共用。
 *
 * 优先级：
 * 1. 用户可编辑的 `trip.name`（用于分辨多条同目的地行程）
 * 2. 无 name 时回退「目的地 · N天行程」
 * 版本号（V73）由顶栏 planBadge 单独展示，不写入本标题。
 */

export type TripDisplayTitleSource = {
  name?: string | null;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  TripDay?: ReadonlyArray<unknown> | null;
  days?: ReadonlyArray<unknown> | null;
};

export function resolveTripDestinationRaw(destination?: string | null): string {
  return destination?.split(',')[0]?.trim() || '';
}

export function resolveTripDayCount(trip: TripDisplayTitleSource): number | null {
  if (Array.isArray(trip.TripDay) && trip.TripDay.length > 0) {
    return trip.TripDay.length;
  }
  if (Array.isArray(trip.days) && trip.days.length > 0) {
    return trip.days.length;
  }
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
      if (days > 0 && days < 400) return days;
    }
  }
  return null;
}

export function resolveTripDestinationLabel(
  trip: TripDisplayTitleSource,
  resolveCountryName?: (codeOrName: string) => string,
): string {
  const raw = resolveTripDestinationRaw(trip.destination);
  if (!raw) return '';
  return resolveCountryName?.(raw)?.trim() || raw;
}

/** 无自定义名称时的结构化标题：`冰岛 · 9天行程` */
export function formatTripStructuredTitle(
  trip: TripDisplayTitleSource,
  options?: {
    destinationLabel?: string | null;
    resolveCountryName?: (codeOrName: string) => string;
  },
): string {
  const dest =
    options?.destinationLabel?.trim() ||
    resolveTripDestinationLabel(trip, options?.resolveCountryName);
  const days = resolveTripDayCount(trip);

  if (dest && days != null) return `${dest} · ${days}天行程`;
  if (days != null) return `${days}天行程`;
  if (dest) return dest;
  return '未知目的地';
}

/**
 * 展示标题：优先 `trip.name`，否则结构化回退。
 */
export function formatTripDisplayTitle(
  trip: TripDisplayTitleSource,
  options?: {
    destinationLabel?: string | null;
    resolveCountryName?: (codeOrName: string) => string;
    /** 为 true 时忽略 name，强制结构化标题（少用） */
    preferStructured?: boolean;
  },
): string {
  const name = trip.name?.trim();
  if (!options?.preferStructured && name) return name;
  return formatTripStructuredTitle(trip, options);
}
