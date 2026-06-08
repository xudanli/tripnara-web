/**
 * Active Trip Dashboard 埋点
 */

export const ACTIVE_TRIP_ANALYTICS_EVENTS = {
  DASHBOARD_VIEW: 'active_trip_dashboard_view',
} as const;

function track(eventName: string, properties?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log('[ActiveTripAnalytics]', eventName, properties);
  }
  if (typeof window !== 'undefined' && (window as unknown as { dataLayer?: unknown[] }).dataLayer) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
      event: eventName,
      ...properties,
    });
  }
}

export function trackActiveTripDashboardView(payload: {
  tripId: string;
  contextualCardIds: string[];
  taskPending: number;
  awaitingViewerAction: string;
}): void {
  track(ACTIVE_TRIP_ANALYTICS_EVENTS.DASHBOARD_VIEW, {
    tripId: payload.tripId,
    contextualCards: payload.contextualCardIds,
    'taskSummary.pending': payload.taskPending,
    awaitingViewerAction: payload.awaitingViewerAction,
  });
}
