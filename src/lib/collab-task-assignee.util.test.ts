import { describe, expect, it } from 'vitest';
import {
  enrichCollaborativeTasksWithAssigneeLabels,
  filterMySubTasks,
  filterTasksByAssigneeScope,
  filterUnassignedSubTasks,
  isCollaborativeTaskAssigned,
} from './collab-task-assignee.util';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';

const subTaskAssigned: CollaborativeTaskView = {
  id: 'csub_1',
  templateId: 'decision_subtask:TEAM_CONFIRM',
  title: '团队确认',
  status: 'pending',
  isSubTask: true,
  assigneeUserId: 'user_a',
};

const subTaskUnassigned: CollaborativeTaskView = {
  id: 'csub_2',
  templateId: 'decision_subtask:CANCELLATION_POLICY',
  title: '查取消政策',
  status: 'pending',
  isSubTask: true,
  assigneeUserId: null,
};

const flywheelTask: CollaborativeTaskView = {
  id: 'fw_1',
  templateId: 'ford_gear_shared_checklist',
  title: '装备清单',
  status: 'pending',
  assigneeLabel: 'Alice',
};

describe('collab-task-assignee.util', () => {
  it('filters my and unassigned subtasks', () => {
    const tasks = [subTaskAssigned, subTaskUnassigned, flywheelTask];
    expect(filterMySubTasks(tasks, 'user_a')).toEqual([subTaskAssigned]);
    expect(filterUnassignedSubTasks(tasks)).toEqual([subTaskUnassigned]);
  });

  it('scopes mine/unassigned to subtasks only', () => {
    const tasks = [subTaskAssigned, subTaskUnassigned, flywheelTask];
    expect(filterTasksByAssigneeScope(tasks, 'mine', 'user_a')).toEqual([subTaskAssigned]);
    expect(filterTasksByAssigneeScope(tasks, 'unassigned')).toEqual([subTaskUnassigned]);
    expect(filterTasksByAssigneeScope(tasks, 'all')).toEqual(tasks);
  });

  it('uses assigneeUserId for subtask assignment state', () => {
    expect(isCollaborativeTaskAssigned(subTaskAssigned)).toBe(true);
    expect(isCollaborativeTaskAssigned(subTaskUnassigned)).toBe(false);
    expect(isCollaborativeTaskAssigned(flywheelTask)).toBe(true);
  });

  it('enriches assignee label from collaborators', () => {
    const enriched = enrichCollaborativeTasksWithAssigneeLabels([subTaskAssigned], [
      { userId: 'user_a', displayName: '小明' },
    ]);
    expect(enriched[0]?.assigneeLabel).toBe('小明');
  });
});
