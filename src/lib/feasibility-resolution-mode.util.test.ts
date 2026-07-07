import { describe, expect, it } from 'vitest';
import {
  filterFeasibilityIssuesForActionableInbox,
  isFeasibilityDecisionSpaceIssue,
  resolveFeasibilityIssueActionByResolutionMode,
  resolveLinkedDecisionProblemId,
} from './feasibility-resolution-mode.util';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

describe('feasibility-resolution-mode.util', () => {
  it('routes DECISION_REQUIRED to decision space', () => {
    const issue: FeasibilityIssueDto = {
      id: 'iss_1',
      linkedDecisionProblemId: 'dp_1',
      resolutionMode: 'DECISION_REQUIRED',
      priority: 'must_handle',
      category: 'schedule',
      title: '午餐窗',
      message: '冲突',
      severity: 'high',
    };
    const target = resolveFeasibilityIssueActionByResolutionMode(issue, 'trip_1');
    expect(target?.surface).toBe('decision_space');
    expect(target?.href).toContain('dp_1');
    expect(resolveLinkedDecisionProblemId(issue)).toBe('dp_1');
  });

  it('routes DIRECT_EDIT to schedule', () => {
    const issue: FeasibilityIssueDto = {
      id: 'iss_2',
      resolutionMode: 'DIRECT_EDIT',
      priority: 'must_handle',
      category: 'itinerary_completeness',
      title: '缺住宿',
      message: '缺住宿',
      severity: 'medium',
      affectedDays: [2],
    };
    const target = resolveFeasibilityIssueActionByResolutionMode(issue, 'trip_1');
    expect(target?.surface).toBe('schedule_edit');
    expect(target?.href).toContain('day=2');
  });

  it('filters DECISION_REQUIRED from actionable inbox', () => {
    const decisionIssue: FeasibilityIssueDto = {
      id: 'iss_d',
      resolutionMode: 'DECISION_REQUIRED',
      priority: 'must_handle',
      category: 'schedule',
      title: '午餐窗冲突',
      message: '冲突',
      severity: 'high',
    };
    const editIssue: FeasibilityIssueDto = {
      id: 'iss_e',
      resolutionMode: 'DIRECT_EDIT',
      priority: 'must_handle',
      category: 'itinerary_completeness',
      title: '缺住宿',
      message: '缺住宿',
      severity: 'medium',
    };
    expect(isFeasibilityDecisionSpaceIssue(decisionIssue)).toBe(true);
    expect(filterFeasibilityIssuesForActionableInbox([decisionIssue, editIssue])).toEqual([
      editIssue,
    ]);
  });
});
