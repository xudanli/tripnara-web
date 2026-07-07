import { describe, expect, it } from 'vitest';
import {
  buildPlanStudioDecisionProblemPath,
  buildPlanStudioDecisionSpacePath,
  buildPlanStudioPlanningInboxPath,
  readDecisionProblemIdFromSearchParams,
} from '@/lib/plan-studio-decision-navigation.util';
import {
  resolveActiveDecisionProblem,
  resolveConflictForDecisionProblem,
  resolveDecisionProblemForConflict,
  resolveRelatedConstraintUiIds,
} from '@/lib/planning-conflicts-decision.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';

describe('plan-studio-decision-navigation.util', () => {
  it('builds problem deep link', () => {
    expect(buildPlanStudioDecisionProblemPath('trip_1', 'prob_1')).toContain('problemId=prob_1');
    expect(buildPlanStudioDecisionProblemPath('trip_1', 'prob_1')).toContain('decisionSpace=1');
  });

  it('builds planning inbox deep link', () => {
    expect(buildPlanStudioPlanningInboxPath('trip_1')).toContain('tab=tasks');
    expect(buildPlanStudioPlanningInboxPath('trip_1')).toContain('planningInbox=1');
  });

  it('builds decision space deep link', () => {
    expect(buildPlanStudioDecisionSpacePath('trip_1')).toContain('decisionSpace=1');
    expect(buildPlanStudioDecisionSpacePath('trip_1', { conflictId: 'c1' })).toContain('conflictId=c1');
  });

  it('reads problemId from search params', () => {
    expect(readDecisionProblemIdFromSearchParams(new URLSearchParams('problemId=abc'))).toBe('abc');
  });
});

describe('planning-conflicts-decision.util', () => {
  const problems: DecisionProblemSummary[] = [
    {
      id: 'dp_issue_1',
      type: 'INFEASIBILITY',
      title: 'Drive too long',
      status: 'OPEN',
      primaryEnforcement: 'BLOCK',
      sourceRefs: [{ system: 'FEASIBILITY', refId: 'issue_1' }],
    },
  ];

  const conflict: PlanningConflictItem = {
    id: 'c1',
    source: 'feasibility',
    priority: 'must_handle',
    category: 'transport',
    title: 'Drive',
    message: 'Too long',
    categoryLabel: '交通',
    issue: { id: 'issue_1', decisionProblemId: 'dp_issue_1' } as PlanningConflictItem['issue'],
  };

  it('matches decision problem from issue decisionProblemId', () => {
    expect(resolveDecisionProblemForConflict(conflict, problems)?.id).toBe('dp_issue_1');
  });

  it('prefers active problem id', () => {
    expect(
      resolveActiveDecisionProblem('dp_issue_1', conflict, problems)?.title,
    ).toBe('Drive too long');
  });

  it('resolves conflict from decision problem sourceRefs', () => {
    expect(resolveConflictForDecisionProblem(problems[0], [conflict])?.id).toBe('c1');
  });

  it('resolves related constraint ids for road_class conflict', () => {
    const roadConflict: PlanningConflictItem = {
      ...conflict,
      category: 'transport',
      issue: {
        ...conflict.issue!,
        issueKind: 'road_class',
        category: 'transport',
      },
    };
    expect(resolveRelatedConstraintUiIds({ conflict: roadConflict })).toContain(
      'max_segment_distance',
    );
  });

  it('returns empty related constraints for gate-only problems', () => {
    expect(
      resolveRelatedConstraintUiIds({
        decisionProblem: {
          id: 'dp_gate',
          type: 'RISK',
          title: 'Blue Lagoon',
          status: 'OPEN',
          semanticKey: 'gate:booking',
          detectedBy: 'GATE',
        },
      }),
    ).toEqual([]);
  });

  it('resolves related constraint ids for travel buffer decision problem without conflict', () => {
    expect(
      resolveRelatedConstraintUiIds({
        decisionProblem: {
          id: 'dp_buffer_d1',
          type: 'INFEASIBILITY',
          title: '第1天 交通缓冲偏差',
          status: 'OPEN',
          primaryEnforcement: 'REQUIRE_ADJUSTMENT',
          affectedDayNumbers: [1],
        },
      }),
    ).toEqual(
      expect.arrayContaining(['daily_drive', 'time_range', 'transport', 'pacing']),
    );
  });

  it('resolves related constraint ids for buffer_insufficient feasibility issue', () => {
    const bufferConflict: PlanningConflictItem = {
      ...conflict,
      category: 'schedule',
      issue: {
        ...conflict.issue!,
        issueKind: 'buffer_insufficient',
        conflictType: 'BUFFER_INSUFFICIENT',
        category: 'schedule',
      } as PlanningConflictItem['issue'],
    };
    expect(resolveRelatedConstraintUiIds({ conflict: bufferConflict })).toEqual(
      expect.arrayContaining(['daily_drive', 'time_range', 'transport', 'pacing']),
    );
  });

  it('resolves P1 enforce issue kinds to constraint ui ids', () => {
    const dailyConflict: PlanningConflictItem = {
      ...conflict,
      issue: { ...conflict.issue!, issueKind: 'daily_drive' } as PlanningConflictItem['issue'],
    };
    expect(resolveRelatedConstraintUiIds({ conflict: dailyConflict })).toEqual(
      expect.arrayContaining(['daily_drive', 'max_daily_drive']),
    );

    const nightConflict: PlanningConflictItem = {
      ...conflict,
      issue: { ...conflict.issue!, issueKind: 'no_night_drive' } as PlanningConflictItem['issue'],
    };
    expect(resolveRelatedConstraintUiIds({ conflict: nightConflict })).toContain('no_night_drive');

    const budgetConflict: PlanningConflictItem = {
      ...conflict,
      category: 'other',
      issue: {
        ...conflict.issue!,
        issueKind: 'budget',
        category: 'schedule',
      } as PlanningConflictItem['issue'],
    };
    expect(resolveRelatedConstraintUiIds({ conflict: budgetConflict })).toContain('budget');
  });

  it('links buffer decision problem to feasibility conflict by day and title', () => {
    const bufferConflict: PlanningConflictItem = {
      id: 'issue_buffer_d1',
      source: 'feasibility',
      priority: 'must_handle',
      category: 'schedule',
      title: '交通缓冲偏紧',
      message: 'Day 1 buffer short',
      categoryLabel: '行程',
      affectedDays: [1],
      issue: {
        id: 'issue_buffer_d1',
        conflictType: 'BUFFER_INSUFFICIENT',
        issueKind: 'same_day_travel',
        affectedDays: [1],
      } as PlanningConflictItem['issue'],
    };
    const problem: DecisionProblemSummary = {
      id: 'dp_bff_buffer',
      type: 'INFEASIBILITY',
      title: '第1天 交通缓冲偏差',
      status: 'OPEN',
      primaryEnforcement: 'REQUIRE_ADJUSTMENT',
      affectedDayNumbers: [1],
    };
    expect(resolveConflictForDecisionProblem(problem, [bufferConflict])?.id).toBe(
      'issue_buffer_d1',
    );
  });
});
