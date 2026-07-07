/**
 * 行程详情页埋点
 * @see docs/information-architecture.md · Trip Detail Tabs
 */

export const TRIP_DETAIL_ANALYTICS_EVENTS = {
  TAB_VIEW: 'trip_detail_tab_view',
  METRIC_CLICK: 'travel_status_metric_click',
  GATE_SUMMARY_ACTION: 'trip_detail_gate_summary_action',
  PLAN_STUDIO_DEEPLINK: 'trip_detail_plan_studio_deeplink',
  EVIDENCE_FILES_LINK: 'trip_detail_evidence_files_link',
} as const;

function track(eventName: string, properties?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log('[TripDetailAnalytics]', eventName, properties);
  }
  if (typeof window !== 'undefined' && (window as unknown as { dataLayer?: unknown[] }).dataLayer) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
      event: eventName,
      ...properties,
    });
  }
}

export function trackTripDetailTabView(payload: { tripId: string; tab: string }): void {
  track(TRIP_DETAIL_ANALYTICS_EVENTS.TAB_VIEW, {
    trip_id: payload.tripId,
    tab: payload.tab,
  });
}

export function trackTravelStatusMetricClick(payload: {
  tripId: string;
  metricKey: string;
  metricValue: number | string;
  target?: string;
}): void {
  track(TRIP_DETAIL_ANALYTICS_EVENTS.METRIC_CLICK, {
    trip_id: payload.tripId,
    metric_key: payload.metricKey,
    metric_value: payload.metricValue,
    target: payload.target,
  });
}

export function trackTripDetailGateSummaryAction(payload: {
  tripId: string;
  tab: string;
  action: string;
}): void {
  track(TRIP_DETAIL_ANALYTICS_EVENTS.GATE_SUMMARY_ACTION, {
    trip_id: payload.tripId,
    tab: payload.tab,
    action: payload.action,
  });
}

export function trackTripDetailPlanStudioDeeplink(payload: {
  tripId: string;
  fromTab: string;
  dayNumber?: number;
  taskId?: string;
  taskCategory?: string;
}): void {
  track(TRIP_DETAIL_ANALYTICS_EVENTS.PLAN_STUDIO_DEEPLINK, {
    trip_id: payload.tripId,
    from_tab: payload.fromTab,
    day_number: payload.dayNumber,
    task_id: payload.taskId,
    task_category: payload.taskCategory,
  });
}

export function trackTripDetailEvidenceFilesLink(payload: {
  tripId: string;
  fromTab: string;
  direction: 'to_files' | 'to_decision_log' | 'to_timeline';
  itineraryItemId?: string;
}): void {
  track(TRIP_DETAIL_ANALYTICS_EVENTS.EVIDENCE_FILES_LINK, {
    trip_id: payload.tripId,
    from_tab: payload.fromTab,
    direction: payload.direction,
    itinerary_item_id: payload.itineraryItemId,
  });
}
