/**
 * Plan Studio 松弛建议条埋点（PRD v0.2 §23）
 */

function track(eventName: string, properties?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log('[RelaxationBarAnalytics]', eventName, properties);
  }
  if (typeof window !== 'undefined' && (window as unknown as { dataLayer?: unknown[] }).dataLayer) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
      event: eventName,
      ...properties,
    });
  }
}

export const RELAXATION_BAR_ANALYTICS_EVENTS = {
  IMPRESSION: 'relaxation_bar_impression',
  ACCEPT: 'relaxation_bar_accept',
  DISCUSS: 'relaxation_bar_discuss',
} as const;

export function trackRelaxationBarImpression(payload: {
  tripId: string;
  suggestionCount: number;
}): void {
  track(RELAXATION_BAR_ANALYTICS_EVENTS.IMPRESSION, {
    trip_id: payload.tripId,
    suggestion_count: payload.suggestionCount,
  });
}

export function trackRelaxationBarAccept(payload: {
  tripId: string;
  constraintId?: string;
  suggestionType?: string;
  actionIds: string[];
}): void {
  track(RELAXATION_BAR_ANALYTICS_EVENTS.ACCEPT, {
    trip_id: payload.tripId,
    constraint_id: payload.constraintId,
    suggestion_type: payload.suggestionType,
    action_ids: payload.actionIds,
  });
}

export function trackRelaxationBarDiscuss(payload: { tripId: string }): void {
  track(RELAXATION_BAR_ANALYTICS_EVENTS.DISCUSS, {
    trip_id: payload.tripId,
  });
}
