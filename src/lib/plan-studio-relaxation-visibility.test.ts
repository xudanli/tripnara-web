import { describe, expect, it } from 'vitest';
import { shouldShowPlanStudioRelaxationBar } from '@/lib/plan-studio-relaxation-visibility';

describe('shouldShowPlanStudioRelaxationBar', () => {
  it('hides when assistant sidebar is expanded', () => {
    expect(shouldShowPlanStudioRelaxationBar(true, true)).toBe(false);
  });

  it('shows when visible and assistant collapsed', () => {
    expect(shouldShowPlanStudioRelaxationBar(true, false)).toBe(true);
  });

  it('hides when not visible', () => {
    expect(shouldShowPlanStudioRelaxationBar(false, false)).toBe(false);
  });
});
