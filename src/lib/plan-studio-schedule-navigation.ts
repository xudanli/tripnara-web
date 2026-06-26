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
