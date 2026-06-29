/**
 * 团队协作中心埋点
 * @see docs/team-collaboration-center-design-spec.md §十三
 */

import type { CollabCenterTab } from '@/lib/collab-center-tabs';

export const COLLAB_CENTER_ANALYTICS_EVENTS = {
  OPEN: 'collab_center_open',
  TAB_SWITCH: 'collab_tab_switch',
  PENDING_CLICK: 'collab_pending_click',
  NEGOTIATION_START: 'collab_negotiation_start',
  VOTE_START: 'collab_vote_start',
  WISH_SUBMIT: 'collab_wish_submit',
  TASK_APPLY_AI: 'collab_task_apply_ai',
} as const;

function track(eventName: string, properties?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log('[CollabCenterAnalytics]', eventName, properties);
  }
  if (typeof window !== 'undefined' && (window as unknown as { dataLayer?: unknown[] }).dataLayer) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
      event: eventName,
      ...properties,
    });
  }
}

export function trackCollabCenterOpen(payload: {
  tripId: string;
  fromTab: string;
  memberCount: number;
}): void {
  track(COLLAB_CENTER_ANALYTICS_EVENTS.OPEN, {
    trip_id: payload.tripId,
    from_tab: payload.fromTab,
    member_count: payload.memberCount,
  });
}

export function trackCollabTabSwitch(payload: {
  tripId: string;
  collabTab: CollabCenterTab;
}): void {
  track(COLLAB_CENTER_ANALYTICS_EVENTS.TAB_SWITCH, {
    trip_id: payload.tripId,
    collab_tab: payload.collabTab,
  });
}

export function trackCollabPendingClick(payload: {
  tripId: string;
  itemId: string;
  itemType: string;
}): void {
  track(COLLAB_CENTER_ANALYTICS_EVENTS.PENDING_CLICK, {
    trip_id: payload.tripId,
    item_id: payload.itemId,
    item_type: payload.itemType,
  });
}

export function trackCollabNegotiationStart(payload: {
  tripId: string;
  domain?: string;
}): void {
  track(COLLAB_CENTER_ANALYTICS_EVENTS.NEGOTIATION_START, {
    trip_id: payload.tripId,
    domain: payload.domain,
  });
}

export function trackCollabVoteStart(payload: {
  tripId: string;
  voteId: string;
}): void {
  track(COLLAB_CENTER_ANALYTICS_EVENTS.VOTE_START, {
    trip_id: payload.tripId,
    vote_id: payload.voteId,
  });
}

export function trackCollabWishSubmit(payload: {
  tripId: string;
  visibility: string;
  category: string;
}): void {
  track(COLLAB_CENTER_ANALYTICS_EVENTS.WISH_SUBMIT, {
    trip_id: payload.tripId,
    visibility: payload.visibility,
    category: payload.category,
  });
}

export function trackCollabTaskApplyAi(payload: {
  tripId: string;
  taskId?: string;
}): void {
  track(COLLAB_CENTER_ANALYTICS_EVENTS.TASK_APPLY_AI, {
    trip_id: payload.tripId,
    task_id: payload.taskId,
  });
}
