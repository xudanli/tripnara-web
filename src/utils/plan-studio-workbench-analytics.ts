function track(eventName: string, properties?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log('[WorkbenchAnalytics]', eventName, properties);
  }
  if (typeof window !== 'undefined' && (window as unknown as { dataLayer?: unknown[] }).dataLayer) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
      event: eventName,
      ...properties,
    });
  }
}

export function trackWorkbenchScheduleImpression(payload: {
  tripId: string;
  viewport: 'mobile' | 'desktop';
}): void {
  track('workbench_schedule_impression', {
    trip_id: payload.tripId,
    viewport: payload.viewport,
  });
}

export function trackWorkbenchConclusionStripView(payload: {
  tripId: string;
  gateStatus?: string | null;
  mustHandleCount: number;
}): void {
  track('workbench_conclusion_strip_view', {
    trip_id: payload.tripId,
    gate_status: payload.gateStatus ?? undefined,
    must_handle_count: payload.mustHandleCount,
  });
}

export function trackWorkbenchMobileColumnChange(payload: {
  tripId: string;
  column: string;
  source?: string;
}): void {
  track('workbench_mobile_column_change', {
    trip_id: payload.tripId,
    column: payload.column,
    source: payload.source,
  });
}

export function trackWorkbenchDaySelect(payload: {
  tripId: string;
  dayIndex: number;
  hasConflict: boolean;
  hasDecisionProblem: boolean;
}): void {
  track('workbench_day_select', {
    trip_id: payload.tripId,
    day_index: payload.dayIndex,
    has_conflict: payload.hasConflict,
    has_decision_problem: payload.hasDecisionProblem,
  });
}

export function trackWorkbenchConflictDefer(payload: {
  tripId: string;
  dayIndex: number;
  conflictIds: string[];
  priority: string;
}): void {
  track('workbench_conflict_defer', {
    trip_id: payload.tripId,
    day_index: payload.dayIndex,
    conflict_ids: payload.conflictIds,
    priority: payload.priority,
  });
}

export function trackWorkbenchConflictDeferUndo(payload: {
  tripId: string;
  conflictId: string;
  within5s: boolean;
}): void {
  track('workbench_conflict_defer_undo', {
    trip_id: payload.tripId,
    conflict_id: payload.conflictId,
    within_5s: payload.within5s,
  });
}

export function trackWorkbenchOpenDecisionSpace(payload: {
  tripId: string;
  source: string;
  dayIndex?: number;
  conflictId?: string;
}): void {
  track('workbench_open_decision_space', {
    trip_id: payload.tripId,
    source: payload.source,
    day_index: payload.dayIndex,
    conflict_id: payload.conflictId,
  });
}
