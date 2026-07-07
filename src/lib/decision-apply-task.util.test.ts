import { describe, expect, it } from 'vitest';
import {
  applyTaskStatusMessage,
  normalizeApplyAcceptedResponse,
  normalizeApplyTaskResponse,
  resolveApplyTaskPollPath,
} from './decision-apply-task.util';

describe('decision-apply-task.util', () => {
  it('normalizes async apply accepted response', () => {
    expect(
      normalizeApplyAcceptedResponse({
        schemaId: 'tripnara.decision_problem_apply_accepted@v1',
        taskId: 'dp_apply_abc123',
        status: 'PENDING',
        pollUrl: '/trips/t1/decision-problems/p1/apply-tasks/dp_apply_abc123',
        pollIntervalMs: 2000,
        reused: true,
      }),
    ).toEqual({
      schemaId: 'tripnara.decision_problem_apply_accepted@v1',
      taskId: 'dp_apply_abc123',
      status: 'PENDING',
      pollUrl: '/trips/t1/decision-problems/p1/apply-tasks/dp_apply_abc123',
      pollIntervalMs: 2000,
      reused: true,
    });
  });

  it('normalizes apply task READY with result', () => {
    const task = normalizeApplyTaskResponse({
      taskId: 'dp_apply_abc123',
      status: 'READY',
      result: {
        problem: { executionStatus: 'APPLIED' },
        revalidation: { status: 'PASSED' },
      },
    });
    expect(task.status).toBe('READY');
    expect(task.result?.problem?.executionStatus).toBe('APPLIED');
  });

  it('resolves poll path from pollUrl', () => {
    expect(
      resolveApplyTaskPollPath(
        {
          taskId: 'dp_apply_abc123',
          pollUrl: '/api/trips/t1/decision-problems/p1/apply-tasks/dp_apply_abc123',
        },
        't1',
        'p1',
      ),
    ).toBe('/trips/t1/decision-problems/p1/apply-tasks/dp_apply_abc123');
  });

  it('maps task status to progress messages', () => {
    expect(applyTaskStatusMessage('APPLYING')).toBe('正在写入行程…');
    expect(applyTaskStatusMessage('REVALIDATING')).toBe('正在复核行程可行性…');
    expect(applyTaskStatusMessage('READY')).toBeNull();
  });
});
