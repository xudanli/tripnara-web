/**
 * Memory Console 埋点
 */
import { isMemoryConsoleEnabled } from '@/lib/memory-feature';

export const MEMORY_ANALYTICS_EVENTS = {
  CONSOLE_VIEW: 'memory.console.view',
  DELETE_PATCH: 'memory.console.delete_patch',
  GATE_SINK_ANCHOR_VIEW: 'ui.gate_card.view_sink_anchor',
} as const;

function track(eventName: string, properties?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log('[MemoryAnalytics]', eventName, properties);
  }
  if (typeof window !== 'undefined' && (window as unknown as { dataLayer?: unknown[] }).dataLayer) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
      event: eventName,
      ...properties,
    });
  }
}

export function trackMemoryConsoleView(tripId?: string | null): void {
  if (!isMemoryConsoleEnabled()) return;
  track(MEMORY_ANALYTICS_EVENTS.CONSOLE_VIEW, { trip_id: tripId ?? null });
}

export function trackMemoryDeletePatch(patchId: string, tripId?: string): void {
  if (!isMemoryConsoleEnabled()) return;
  track(MEMORY_ANALYTICS_EVENTS.DELETE_PATCH, { patch_id: patchId, trip_id: tripId });
}

export function trackGateSinkAnchorView(patchIds: string[]): void {
  track(MEMORY_ANALYTICS_EVENTS.GATE_SINK_ANCHOR_VIEW, { patch_ids: patchIds });
}
