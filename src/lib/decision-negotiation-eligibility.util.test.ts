import { describe, expect, it } from 'vitest';
import {
  isDecisionProblemNegotiationEligible,
  shouldShowDecisionSpaceCollaborationActions,
} from './decision-negotiation-eligibility.util';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

describe('decision-negotiation-eligibility', () => {
  it('blocks poi_access_reservation_required', () => {
    const conflict = {
      id: 'c1',
      issue: { issueKind: 'poi_access_reservation_required' },
    } as PlanningConflictItem;
    expect(isDecisionProblemNegotiationEligible({ conflict })).toBe(false);
  });

  it('allows preference conflict', () => {
    const problem = {
      id: 'p1',
      type: 'PREFERENCE_CONFLICT',
      title: '节奏分歧',
      status: 'OPEN',
      primaryEnforcement: 'REQUIRE_CONFIRMATION',
    } as DecisionProblemSummary;
    expect(isDecisionProblemNegotiationEligible({ problem })).toBe(true);
  });

  it('hides vote for solo trip', () => {
    expect(
      shouldShowDecisionSpaceCollaborationActions({
        travelerCount: 1,
        collaboratorCount: 0,
        preflightCanStart: true,
      }),
    ).toEqual({ showNegotiate: false, showVote: false });
  });

  it('hides collaboration when negotiation.visible is false (BFF SSOT)', () => {
    expect(
      shouldShowDecisionSpaceCollaborationActions({
        travelerCount: 4,
        collaboratorCount: 3,
        negotiationVisible: false,
        preflightCanStart: true,
      }),
    ).toEqual({ showNegotiate: false, showVote: false });
  });

  it('prefers negotiation.visible over client heuristic', () => {
    const conflict = {
      id: 'c1',
      issue: { issueKind: 'poi_access_blocked' },
    } as PlanningConflictItem;
    expect(
      shouldShowDecisionSpaceCollaborationActions({
        travelerCount: 4,
        collaboratorCount: 3,
        conflict,
        negotiationVisible: true,
        preflightCanStart: true,
      }),
    ).toEqual({ showNegotiate: true, showVote: true });
  });
});
