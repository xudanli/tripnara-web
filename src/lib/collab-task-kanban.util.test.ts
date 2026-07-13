import { describe, expect, it } from 'vitest';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import {
  buildCollabTaskAiSummaryView,
  buildCollabTaskBoardStats,
  filterTasksForBoard,
  taskKanbanColumn,
} from './collab-task-kanban.util';

const baseTask = (overrides: Partial<CollaborativeTaskView>): CollaborativeTaskView => ({
  id: 't1',
  templateId: 'tpl',
  title: 'Test',
  status: 'pending',
  ...overrides,
});

describe('collab-task-kanban.util', () => {
  it('maps statuses to kanban columns', () => {
    expect(taskKanbanColumn(baseTask({ status: 'confirmed' }))).toBe('done');
    expect(taskKanbanColumn(baseTask({ status: 'rolled_back' }))).toBe('in_progress');
    expect(taskKanbanColumn(baseTask({ status: 'timed_out' }))).toBe('todo');
    expect(taskKanbanColumn(baseTask({ status: 'pending', assigneeUserId: 'u1' }))).toBe('to_confirm');
    expect(taskKanbanColumn(baseTask({ status: 'pending' }))).toBe('todo');
  });

  it('builds board stats', () => {
    const tasks = [
      baseTask({ id: '1', status: 'confirmed' }),
      baseTask({ id: '2', status: 'pending', assigneeUserId: 'u1' }),
      baseTask({ id: '3', status: 'timed_out' }),
    ];
    const stats = buildCollabTaskBoardStats(tasks);
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(1);
    expect(stats.completionRate).toBe(33);
  });

  it('builds ai summary with overdue highlights', () => {
    const tasks = [
      baseTask({ id: '1', title: '确认冰川预订', status: 'timed_out' }),
      baseTask({ id: '2', title: '准备登山装备', status: 'timed_out' }),
    ];
    const view = buildCollabTaskAiSummaryView(tasks);
    expect(view.text).toContain('逾期工作');
    expect(view.highlights?.length).toBeGreaterThan(0);
  });

  it('filters by search text', () => {
    const tasks = [
      baseTask({ id: '1', title: '预订冰川徒步' }),
      baseTask({ id: '2', title: '其他任务' }),
    ];
    const filtered = filterTasksForBoard(tasks, { search: '冰川' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe('预订冰川徒步');
  });
});
