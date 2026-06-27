/**
 * Plan Studio Decision Strip 埋点（PRD §10）
 */

import type { DecisionStripState } from '@/lib/decision-strip-model';

export const DECISION_STRIP_ANALYTICS_EVENTS = {
  IMPRESSION: 'decision_strip_impression',
  PRIMARY_CTA: 'decision_strip_primary_cta',
  EXPAND: 'decision_strip_expand',
  EVIDENCE_OPEN: 'decision_strip_evidence_open',
  DEEP_LINK: 'decision_strip_deep_link',
} as const;

export type DecisionStripDeepLinkTarget =
  | 'causal_insight'
  | 'decision_cockpit'
  | 'evidence_drawer';

function track(eventName: string, properties?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log('[DecisionStripAnalytics]', eventName, properties);
  }
  if (typeof window !== 'undefined' && (window as unknown as { dataLayer?: unknown[] }).dataLayer) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
      event: eventName,
      ...properties,
    });
  }
}

export function trackDecisionStripImpression(payload: {
  tripId: string;
  stripState: DecisionStripState;
  hasGuards: boolean;
}): void {
  track(DECISION_STRIP_ANALYTICS_EVENTS.IMPRESSION, {
    trip_id: payload.tripId,
    strip_state: payload.stripState,
    has_guards: payload.hasGuards,
  });
}

export function trackDecisionStripPrimaryCta(payload: {
  tripId: string;
  ctaType: string;
  stripState: DecisionStripState;
}): void {
  track(DECISION_STRIP_ANALYTICS_EVENTS.PRIMARY_CTA, {
    trip_id: payload.tripId,
    cta_type: payload.ctaType,
    strip_state: payload.stripState,
  });
}

export function trackDecisionStripExpand(payload: {
  tripId: string;
  expanded: boolean;
}): void {
  track(DECISION_STRIP_ANALYTICS_EVENTS.EXPAND, {
    trip_id: payload.tripId,
    expanded: payload.expanded,
  });
}

export function trackDecisionStripEvidenceOpen(payload: {
  tripId: string;
  source: 'strip' | 'drawer';
}): void {
  track(DECISION_STRIP_ANALYTICS_EVENTS.EVIDENCE_OPEN, {
    trip_id: payload.tripId,
    source: payload.source,
  });
}

export function trackDecisionStripDeepLink(payload: {
  tripId: string;
  target: DecisionStripDeepLinkTarget;
  stripState?: DecisionStripState;
}): void {
  track(DECISION_STRIP_ANALYTICS_EVENTS.DEEP_LINK, {
    trip_id: payload.tripId,
    target: payload.target,
    strip_state: payload.stripState,
  });
}
