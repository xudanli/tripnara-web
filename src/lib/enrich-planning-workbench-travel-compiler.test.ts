import { describe, expect, it } from 'vitest';
import { enrichPlanningWorkbenchExecuteRequest } from '@/lib/enrich-planning-workbench-travel-compiler';

describe('enrichPlanningWorkbenchExecuteRequest', () => {
  const base = {
    context: { destination: { country: 'Iceland' }, days: 5 },
    tripId: 'trip-1',
    userAction: 'generate' as const,
  };

  it('does not inject when enable_travel_compiler is false', () => {
    const payload = enrichPlanningWorkbenchExecuteRequest({
      ...base,
      enable_travel_compiler: false,
    });
    expect(payload.enable_travel_compiler).toBe(false);
  });

  it('skips compare action even when explicitly enabled', () => {
    const payload = enrichPlanningWorkbenchExecuteRequest({
      ...base,
      userAction: 'compare',
      enable_travel_compiler: true,
    });
    expect(payload.enable_travel_compiler).toBe(true);
    expect(payload.userAction).toBe('compare');
  });

  it('skips without tripId', () => {
    const payload = enrichPlanningWorkbenchExecuteRequest({
      ...base,
      tripId: undefined,
    });
    expect(payload.enable_travel_compiler).toBeUndefined();
  });
});
