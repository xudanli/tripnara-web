import { describe, expect, it } from 'vitest';
import {
  HARD_CONSTRAINT_ENFORCEMENT_SPECS,
  isHardConstraintBlockedIssueKind,
  isHardConstraintBlockViolation,
  resolveConstraintUiIdsForEnforcementIssueKind,
  resolveFeasibilitySignalsForHardConstraint,
  resolveHardEnforcementSpec,
  resolveHardEnforcementSpecForConstraint,
} from './trip-constraint-hard-enforcement.util';

describe('trip-constraint-hard-enforcement.util', () => {
  it('defines P1 templates with shared metadata', () => {
    expect(HARD_CONSTRAINT_ENFORCEMENT_SPECS).toHaveLength(3);
    const daily = resolveHardEnforcementSpec({ templateId: 'max_daily_drive' });
    expect(daily?.issueKind).toBe('daily_drive');
    expect(daily?.hardConstraintBlocked).toBe(true);
    expect(daily?.verdictChannel).toBe('NOT_EXECUTABLE');
  });

  it('resolves by constraint id and ui id', () => {
    expect(resolveHardEnforcementSpec({ constraintId: 'c_no_night_drive' })?.templateId).toBe(
      'no_night_drive',
    );
    expect(resolveHardEnforcementSpec({ uiId: 'daily_drive' })?.issueKind).toBe('daily_drive');
    expect(resolveHardEnforcementSpec({ uiId: 'budget' })?.verdictChannel).toBe('BUDGET_GATE');
  });

  it('maps issueKind to constraint ui ids for decision space', () => {
    expect(resolveConstraintUiIdsForEnforcementIssueKind('daily_drive')).toEqual([
      'daily_drive',
      'max_daily_drive',
    ]);
    expect(resolveConstraintUiIdsForEnforcementIssueKind('no_night_drive')).toEqual([
      'no_night_drive',
    ]);
    expect(resolveConstraintUiIdsForEnforcementIssueKind('budget')).toEqual(['budget']);
  });

  it('BLOCK violationResult → must_handle + high severity', () => {
    expect(isHardConstraintBlockViolation('BLOCK')).toBe(true);
    expect(
      resolveFeasibilitySignalsForHardConstraint({ violationResult: 'BLOCK' }),
    ).toEqual({ priority: 'must_handle', severity: 'high' });
  });

  it('resolves from TripConstraint source.templateId', () => {
    const spec = resolveHardEnforcementSpecForConstraint({
      id: 'c_max_daily_drive',
      source: { type: 'USER', templateId: 'max_daily_drive' },
    });
    expect(spec?.detectionLabel).toContain('DRIVING');
  });

  it('flags guardian-blocked issue kinds', () => {
    expect(isHardConstraintBlockedIssueKind('daily_drive')).toBe(true);
    expect(isHardConstraintBlockedIssueKind('no_night_drive')).toBe(true);
    expect(isHardConstraintBlockedIssueKind('budget')).toBe(false);
  });
});
