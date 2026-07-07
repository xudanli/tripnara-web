/**
 * Plan Studio Workbench 子模式埋点（模式指示条 + 约束抽屉 M2）
 */

import type { WorkbenchMode } from '@/lib/workbench-mode-context.util';

export const WORKBENCH_MODE_ANALYTICS_EVENTS = {
  MODE_ENTER: 'workbench_mode_enter',
  MODE_EXIT: 'workbench_mode_exit',
  MODE_BACK_CLICK: 'workbench_mode_back_click',
  CONSTRAINT_DRAWER_OPEN: 'constraint_drawer_open',
  CONSTRAINT_DRAWER_CLOSE: 'constraint_drawer_close',
  CONSTRAINT_DRAWER_SAVE: 'constraint_drawer_save',
  CONSTRAINT_DRAWER_UNSAVED_PROMPT: 'constraint_drawer_unsaved_prompt',
  PLAN_GATE_CONSTRAINT_MUTEX: 'workbench_plan_gate_constraint_mutex',
} as const;

function track(eventName: string, properties?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log('[WorkbenchModeAnalytics]', eventName, properties);
  }
  if (typeof window !== 'undefined' && (window as unknown as { dataLayer?: unknown[] }).dataLayer) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
      event: eventName,
      ...properties,
    });
  }
}

export function trackWorkbenchModeEnter(payload: {
  tripId: string;
  mode: Exclude<WorkbenchMode, 'browse'>;
  source?: string;
}): void {
  track(WORKBENCH_MODE_ANALYTICS_EVENTS.MODE_ENTER, {
    trip_id: payload.tripId,
    mode: payload.mode,
    source: payload.source,
  });
}

export function trackWorkbenchModeExit(payload: {
  tripId: string;
  mode: Exclude<WorkbenchMode, 'browse'>;
  durationMs: number;
  completed?: boolean;
}): void {
  track(WORKBENCH_MODE_ANALYTICS_EVENTS.MODE_EXIT, {
    trip_id: payload.tripId,
    mode: payload.mode,
    duration_ms: payload.durationMs,
    completed: payload.completed ?? false,
  });
}

export function trackWorkbenchModeBackClick(payload: {
  tripId: string;
  mode: Exclude<WorkbenchMode, 'browse'>;
  hadUnsavedDraft?: boolean;
}): void {
  track(WORKBENCH_MODE_ANALYTICS_EVENTS.MODE_BACK_CLICK, {
    trip_id: payload.tripId,
    mode: payload.mode,
    had_unsaved_draft: payload.hadUnsavedDraft ?? false,
  });
}

export function trackConstraintDrawerOpen(payload: {
  tripId: string;
  constraintId?: string | null;
  source?: string;
  dayIndex?: number;
}): void {
  track(WORKBENCH_MODE_ANALYTICS_EVENTS.CONSTRAINT_DRAWER_OPEN, {
    trip_id: payload.tripId,
    constraint_id: payload.constraintId ?? undefined,
    source: payload.source,
    day_index: payload.dayIndex,
  });
}

export function trackConstraintDrawerClose(payload: {
  tripId: string;
  constraintId?: string | null;
  saved?: boolean;
  hadSaveDuringSession?: boolean;
  durationMs?: number;
}): void {
  track(WORKBENCH_MODE_ANALYTICS_EVENTS.CONSTRAINT_DRAWER_CLOSE, {
    trip_id: payload.tripId,
    constraint_id: payload.constraintId ?? undefined,
    saved: payload.saved ?? false,
    had_save_during_session: payload.hadSaveDuringSession ?? false,
    duration_ms: payload.durationMs,
  });
}

export function trackConstraintDrawerSave(payload: {
  tripId: string;
  constraintId?: string | null;
}): void {
  track(WORKBENCH_MODE_ANALYTICS_EVENTS.CONSTRAINT_DRAWER_SAVE, {
    trip_id: payload.tripId,
    constraint_id: payload.constraintId ?? undefined,
  });
}

export function trackPlanGateConstraintMutex(payload: {
  tripId: string;
  action:
    | 'plan_gate_closed_for_constraint'
    | 'constraint_closed_for_plan_gate'
    | 'decision_space_closed_for_constraint';
}): void {
  track(WORKBENCH_MODE_ANALYTICS_EVENTS.PLAN_GATE_CONSTRAINT_MUTEX, {
    trip_id: payload.tripId,
    action: payload.action,
  });
}

export function trackConstraintDrawerUnsavedPrompt(payload: {
  tripId: string;
  action: 'confirm' | 'cancel';
}): void {
  track(WORKBENCH_MODE_ANALYTICS_EVENTS.CONSTRAINT_DRAWER_UNSAVED_PROMPT, {
    trip_id: payload.tripId,
    action: payload.action,
  });
}
