import { describe, expect, it } from 'vitest';
import { computeDecisionCenterDualRunMetrics } from '@/lib/decision-center-dual-run.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';

describe('decision-center-dual-run.util', () => {
  const problems: DecisionProblemSummary[] = [
    {
      id: 'dp_1',
      type: 'INFEASIBILITY',
      title: 'Drive long',
      status: 'OPEN',
      primaryEnforcement: 'BLOCK',
      sourceRefs: [{ refId: 'issue_1' }],
    },
    {
      id: 'dp_orphan',
      type: 'RISK',
      title: 'Orphan',
      status: 'OPEN',
      primaryEnforcement: 'WARN',
    },
  ];

  const conflicts: PlanningConflictItem[] = [
    {
      id: 'c1',
      source: 'feasibility',
      priority: 'must_handle',
      category: 'transport',
      title: 'Drive',
      message: 'Too long',
      categoryLabel: '交通',
      issue: { id: 'issue_1', decisionProblemId: 'dp_1' } as PlanningConflictItem['issue'],
    },
    {
      id: 'c_unmatched',
      source: 'schedule',
      priority: 'must_handle',
      category: 'schedule',
      title: 'Overlap',
      message: 'Overlap',
      categoryLabel: '日程',
    },
  ];

  it('computes matched and unmatched counts', () => {
    const metrics = computeDecisionCenterDualRunMetrics({
      decisionProblems: problems,
      planningConflicts: conflicts,
      inboxCount: 2,
      mustHandleCount: 2,
    });
    expect(metrics.matchedConflictCount).toBe(1);
    expect(metrics.unmatchedConflicts).toHaveLength(1);
    expect(metrics.orphanProblems).toHaveLength(1);
    expect(metrics.orphanProblems[0]?.id).toBe('dp_orphan');
  });
});
