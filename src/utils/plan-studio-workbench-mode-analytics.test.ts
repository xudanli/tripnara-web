import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WORKBENCH_MODE_ANALYTICS_EVENTS,
  trackConstraintDrawerClose,
  trackConstraintDrawerSave,
  trackPlanGateConstraintMutex,
} from './plan-studio-workbench-mode-analytics';

describe('plan-studio-workbench-mode-analytics', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('trackConstraintDrawerSave logs M3 save event', () => {
    trackConstraintDrawerSave({ tripId: 'trip-1', constraintId: 'daily_drive' });
    expect(console.log).toHaveBeenCalledWith(
      '[WorkbenchModeAnalytics]',
      WORKBENCH_MODE_ANALYTICS_EVENTS.CONSTRAINT_DRAWER_SAVE,
      expect.objectContaining({
        trip_id: 'trip-1',
        constraint_id: 'daily_drive',
      }),
    );
  });

  it('trackConstraintDrawerClose includes had_save_during_session', () => {
    trackConstraintDrawerClose({
      tripId: 'trip-1',
      constraintId: 'daily_drive',
      saved: false,
      hadSaveDuringSession: true,
      durationMs: 1200,
    });
    expect(console.log).toHaveBeenCalledWith(
      '[WorkbenchModeAnalytics]',
      WORKBENCH_MODE_ANALYTICS_EVENTS.CONSTRAINT_DRAWER_CLOSE,
      expect.objectContaining({
        trip_id: 'trip-1',
        saved: false,
        had_save_during_session: true,
        duration_ms: 1200,
      }),
    );
  });

  it('trackPlanGateConstraintMutex logs mutex action', () => {
    trackPlanGateConstraintMutex({
      tripId: 'trip-1',
      action: 'constraint_closed_for_plan_gate',
    });
    expect(console.log).toHaveBeenCalledWith(
      '[WorkbenchModeAnalytics]',
      WORKBENCH_MODE_ANALYTICS_EVENTS.PLAN_GATE_CONSTRAINT_MUTEX,
      expect.objectContaining({
        trip_id: 'trip-1',
        action: 'constraint_closed_for_plan_gate',
      }),
    );
  });
});
