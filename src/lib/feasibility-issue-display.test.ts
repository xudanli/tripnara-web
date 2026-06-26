import { describe, expect, it } from 'vitest';
import {
  getFeasibilityIssueIcon,
  resolveFeasibilityIssueVisualCategory,
} from '@/lib/feasibility-issue-display';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';
import {
  Activity,
  ArrowRightLeft,
  ClipboardList,
  ListTree,
  Users,
} from 'lucide-react';

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

describe('resolveFeasibilityIssueVisualCategory', () => {
  it('maps team_fit issue kinds', () => {
    expect(
      resolveFeasibilityIssueVisualCategory(issue({ category: 'team_fit', issueKind: 'team_friction' })),
    ).toBe('team_fit');
    expect(
      resolveFeasibilityIssueVisualCategory(
        issue({ category: 'schedule', issueKind: 'profiling_incomplete' }),
      ),
    ).toBe('team_fit');
  });

  it('maps itinerary_completeness', () => {
    expect(
      resolveFeasibilityIssueVisualCategory(
        issue({ category: 'itinerary_completeness', issueKind: 'itinerary_structure' }),
      ),
    ).toBe('itinerary_completeness');
  });

  it('infers from proofs ruleId when category is generic', () => {
    expect(
      resolveFeasibilityIssueVisualCategory(
        issue({
          category: 'custom',
          proofs: [{ ruleId: 'team.profiling_incomplete' }],
        }),
      ),
    ).toBe('team_fit');
    expect(
      resolveFeasibilityIssueVisualCategory(
        issue({
          category: 'custom',
          proofs: [{ ruleId: 'itinerary.missing_meal' }],
        }),
      ),
    ).toBe('itinerary_completeness');
  });
});

describe('getFeasibilityIssueIcon', () => {
  it('returns kind-specific icons', () => {
    expect(getFeasibilityIssueIcon(issue({ issueKind: 'profiling_incomplete' }))).toBe(ClipboardList);
    expect(getFeasibilityIssueIcon(issue({ issueKind: 'team_friction' }))).toBe(Users);
    expect(getFeasibilityIssueIcon(issue({ issueKind: 'team_fatigue' }))).toBe(Activity);
    expect(getFeasibilityIssueIcon(issue({ issueKind: 'itinerary_structure' }))).toBe(ListTree);
    expect(getFeasibilityIssueIcon(issue({ issueKind: 'inter_day_travel' }))).toBe(ArrowRightLeft);
  });
});
