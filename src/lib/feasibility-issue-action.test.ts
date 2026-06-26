import { describe, expect, it } from 'vitest';
import { resolveFeasibilityIssueActionTarget } from '@/lib/feasibility-issue-action';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

function issue(partial: Partial<FeasibilityIssueDto>): FeasibilityIssueDto {
  return {
    id: 'i1',
    priority: 'suggest_adjust',
    category: 'schedule',
    title: 't',
    message: 'm',
    severity: 'medium',
    ...partial,
  };
}

describe('resolveFeasibilityIssueActionTarget', () => {
  const tripId = 'trip-1';

  it('routes profiling_incomplete to decision profiling quiz', () => {
    const target = resolveFeasibilityIssueActionTarget(
      issue({ category: 'team_fit', issueKind: 'profiling_incomplete' }),
      tripId,
    );
    expect(target.surface).toBe('decision_profiling_quiz');
    expect(target.profilingSurface).toBe('quiz');
    expect(target.href).toContain('openDecisionProfiling=1');
  });

  it('routes team friction to friction radar', () => {
    const target = resolveFeasibilityIssueActionTarget(
      issue({ category: 'team_fit', issueKind: 'team_friction' }),
      tripId,
    );
    expect(target.surface).toBe('friction_radar');
    expect(target.profilingSurface).toBe('friction');
  });

  it('routes budget split friction to split consensus', () => {
    const target = resolveFeasibilityIssueActionTarget(
      issue({
        category: 'team_fit',
        message: '预算分摊尚未达成共识',
      }),
      tripId,
    );
    expect(target.surface).toBe('split_consensus');
  });

  it('routes open_repair to road_class_repair', () => {
    const target = resolveFeasibilityIssueActionTarget(
      issue({
        category: 'transport',
        uiHints: { primaryAction: 'open_repair' },
      }),
      tripId,
    );
    expect(target.surface).toBe('road_class_repair');
  });
});
