import { describe, expect, it } from 'vitest';
import {
  resolveItineraryItemPlanContentState,
  resolvePlanLayerStates,
  resolveWorkbenchPlanContentState,
} from './plan-content-state.util';

describe('plan-content-state.util', () => {
  it('reads metadata.planContentState', () => {
    expect(
      resolveItineraryItemPlanContentState({
        metadata: { planContentState: 'proposal' },
      }),
    ).toBe('proposal');
  });

  it('infers draft from itinerary adjust source', () => {
    expect(
      resolveItineraryItemPlanContentState({
        metadata: { source: 'itinerary_adjust_draft' },
      }),
    ).toBe('draft');
  });

  it('resolves plan layers from overview pending proposals', () => {
    const layers = resolvePlanLayerStates({
      overviewView: { pendingProposalCount: 2 },
    });
    expect(layers).toContain('effective');
    expect(layers).toContain('proposal');
  });

  it('marks workbench output as proposal until committed', () => {
    expect(resolveWorkbenchPlanContentState(false)).toBe('proposal');
    expect(resolveWorkbenchPlanContentState(false, true)).toBe('pending_apply');
    expect(resolveWorkbenchPlanContentState(true)).toBe('effective');
  });
});
