import { describe, expect, it } from 'vitest';
import { mapDecisionSubTaskToCollaborativeTaskView } from './trip-decision-follow-up-tasks.util';

describe('trip-decision-follow-up-tasks.util', () => {
  it('maps decision subtask to collaborative task view', () => {
    const mapped = mapDecisionSubTaskToCollaborativeTaskView({
      subTask: {
        id: 'csub_1',
        resolutionId: 'res_1',
        title: '查取消政策',
        kind: 'CANCELLATION_POLICY',
        status: 'pending',
        problemId: 'dp_1',
      },
      problemTitle: '雷尼斯黑沙滩：准入提示',
    });

    expect(mapped.isSubTask).toBe(true);
    expect(mapped.source).toBe('decision_problem');
    expect(mapped.title).toBe('查取消政策');
    expect(mapped.status).toBe('pending');
    expect(mapped.decisionProblemId).toBe('dp_1');
    expect(mapped.description).toContain('雷尼斯黑沙滩');
  });

  it('maps completed subtask to confirmed', () => {
    const mapped = mapDecisionSubTaskToCollaborativeTaskView({
      subTask: {
        id: 'csub_2',
        resolutionId: 'res_1',
        title: '团队确认',
        kind: 'TEAM_CONFIRM',
        status: 'completed',
      },
    });
    expect(mapped.status).toBe('confirmed');
  });
});
