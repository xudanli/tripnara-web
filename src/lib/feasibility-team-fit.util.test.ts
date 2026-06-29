import { describe, expect, it } from 'vitest';
import {
  buildTeamFitDeepLinkUrl,
  resolveAffectedMemberChips,
  resolveTeamFitHighlightPlan,
} from '@/lib/feasibility-team-fit.util';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

function issue(partial: Partial<FeasibilityIssueDto>): FeasibilityIssueDto {
  return {
    id: 'team-1',
    priority: 'suggest_adjust',
    category: 'team_fit',
    title: '团队节奏',
    message: '节奏分歧',
    severity: 'medium',
    ...partial,
  };
}

describe('buildTeamFitDeepLinkUrl', () => {
  it('appends teamHighlight and teamMembers from uiHints', () => {
    const url = buildTeamFitDeepLinkUrl('trip-1', issue({
      uiHints: {
        deepLink: {
          tab: 'team',
          highlightDomains: ['pacing', 'budget'],
        },
        affectedMemberIds: ['u-alice', 'u-bob'],
      },
    }));
    expect(url).toContain('collab=1');
    expect(url).toContain('collabTab=members');
    expect(url).toContain('teamHighlight=pacing%2Cbudget');
    expect(url).toContain('teamMembers=u-alice%2Cu-bob');
  });
});

describe('resolveTeamFitHighlightPlan', () => {
  it('maps pacing/budget domains to preference labels', () => {
    const plan = resolveTeamFitHighlightPlan(['pacing', 'budget']);
    expect(plan.preferences).toBe(true);
    expect(plan.preferenceLabels).toEqual(['节奏偏好', '预算敏感度']);
    expect(plan.members).toBe(false);
  });

  it('detects structured negotiation domain', () => {
    const plan = resolveTeamFitHighlightPlan(['activities']);
    expect(plan.negotiationDomain).toBe('activities');
    expect(plan.openStructuredNegotiation).toBe(true);
  });
});

describe('resolveAffectedMemberChips', () => {
  it('uses display names when provided', () => {
    expect(
      resolveAffectedMemberChips(['u1'], { u1: 'Alice' }),
    ).toEqual([{ id: 'u1', label: 'Alice' }]);
  });

  it('falls back to truncated id label', () => {
    const chips = resolveAffectedMemberChips(['abcdefghijklmnop']);
    expect(chips[0]?.label).toMatch(/^成员 · abcdefgh…$/);
  });
});
