/**
 * Plan Studio 方案矩阵埋点（PRD v0.2 §23）
 */

function track(eventName: string, properties?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log('[SolutionMatrixAnalytics]', eventName, properties);
  }
  if (typeof window !== 'undefined' && (window as unknown as { dataLayer?: unknown[] }).dataLayer) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
      event: eventName,
      ...properties,
    });
  }
}

export const SOLUTION_MATRIX_ANALYTICS_EVENTS = {
  IMPRESSION: 'solution_matrix_impression',
  COLUMN_SELECT: 'solution_matrix_column_select',
  EXPAND_DIMENSIONS: 'solution_matrix_expand_dimensions',
  EXPAND_PANEL: 'solution_matrix_expand_panel',
} as const;

export function trackSolutionMatrixImpression(payload: {
  tripId: string;
  columnCount: number;
  collapsed: boolean;
}): void {
  track(SOLUTION_MATRIX_ANALYTICS_EVENTS.IMPRESSION, {
    trip_id: payload.tripId,
    column_count: payload.columnCount,
    collapsed: payload.collapsed,
  });
}

export function trackSolutionMatrixColumnSelect(payload: {
  tripId: string;
  columnIndex: number;
  planId: string;
}): void {
  track(SOLUTION_MATRIX_ANALYTICS_EVENTS.COLUMN_SELECT, {
    trip_id: payload.tripId,
    column_index: payload.columnIndex,
    plan_id: payload.planId,
  });
}

export function trackSolutionMatrixExpandDimensions(payload: { tripId: string; expanded: boolean }): void {
  track(SOLUTION_MATRIX_ANALYTICS_EVENTS.EXPAND_DIMENSIONS, {
    trip_id: payload.tripId,
    expanded: payload.expanded,
  });
}

export function trackSolutionMatrixExpandPanel(payload: { tripId: string; expanded: boolean }): void {
  track(SOLUTION_MATRIX_ANALYTICS_EVENTS.EXPAND_PANEL, {
    trip_id: payload.tripId,
    expanded: payload.expanded,
  });
}
