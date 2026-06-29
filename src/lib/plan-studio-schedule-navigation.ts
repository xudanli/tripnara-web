/** 可执行性 / 证据等 → 时间轴深链 payload */
export interface PlanStudioScheduleNavigateDetail {
  dayIndex?: number;
  dayNumber?: number;
  highlightItemIds?: string[];
  focus?: 'travel-timing';
  issueId?: string;
  fromPlaceLabel?: string;
  toPlaceLabel?: string;
}

export function resolveScheduleDayIndex(detail: PlanStudioScheduleNavigateDetail): number | undefined {
  if (typeof detail.dayIndex === 'number' && detail.dayIndex >= 0) return detail.dayIndex;
  if (typeof detail.dayNumber === 'number' && detail.dayNumber >= 1) {
    return detail.dayNumber - 1;
  }
  return undefined;
}

export function dispatchPlanStudioSelectScheduleDay(detail: PlanStudioScheduleNavigateDetail) {
  const dayIndex = resolveScheduleDayIndex(detail);
  window.dispatchEvent(
    new CustomEvent('plan-studio:select-schedule-day', {
      detail: { ...detail, dayIndex },
    }),
  );
}

/** 跨页深链：全程地图 → 规划工作台时间轴 */
export const PENDING_SCHEDULE_NAV_KEY = 'tripnara:pending-schedule-nav';

export function setPendingScheduleNavigation(detail: PlanStudioScheduleNavigateDetail): void {
  try {
    sessionStorage.setItem(PENDING_SCHEDULE_NAV_KEY, JSON.stringify(detail));
  } catch {
    /* ignore */
  }
}

export function consumePendingScheduleNavigation(): PlanStudioScheduleNavigateDetail | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SCHEDULE_NAV_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_SCHEDULE_NAV_KEY);
    return JSON.parse(raw) as PlanStudioScheduleNavigateDetail;
  } catch {
    return null;
  }
}

export function navigateToPlanStudioSchedule(
  navigate: (path: string) => void,
  tripId: string,
  detail?: PlanStudioScheduleNavigateDetail,
): void {
  if (detail) setPendingScheduleNavigation(detail);
  navigate(`/dashboard/plan-studio?tripId=${encodeURIComponent(tripId)}&tab=schedule`);
}

/** 从全程地图活动 id 解析时间轴高亮项 */
export function resolveItineraryHighlightIds(activity: {
  id: string;
}): string[] | undefined {
  if (activity.id.startsWith('item-')) {
    return [activity.id.slice('item-'.length)];
  }
  return undefined;
}
