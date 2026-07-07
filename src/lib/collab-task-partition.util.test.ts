import { describe, expect, it } from 'vitest';
import { partitionCollaborativeTasks } from './collab-task-partition.util';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';

describe('collab-task-partition.util', () => {
  it('partitions subtasks and domain influence negotiations', () => {
    const subTask: CollaborativeTaskView = {
      id: 'csub_1',
      templateId: 'decision_subtask:TEAM_CONFIRM',
      title: '预计 斯科加瀑布… · 团队确认',
      status: 'pending',
      isSubTask: true,
      source: 'decision_problem',
    };
    const domain: CollaborativeTaskView = {
      id: 'dom_1',
      templateId: 'domain:destination_route',
      title: '目的地与路线',
      status: 'pending',
      source: 'domain_influence',
    };
    const legacyDecisionParent: CollaborativeTaskView = {
      id: 'legacy_1',
      templateId: 'decision_negotiation',
      title: '不应出现',
      status: 'pending',
      source: 'decision_problem',
    };

    const { decisionFollowUps, domainNegotiations, otherTasks } = partitionCollaborativeTasks([
      subTask,
      domain,
      legacyDecisionParent,
    ]);

    expect(decisionFollowUps).toEqual([subTask]);
    expect(domainNegotiations).toEqual([domain]);
    expect(otherTasks).toEqual([legacyDecisionParent]);
  });
});
