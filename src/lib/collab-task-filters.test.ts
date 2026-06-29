import { describe, expect, it } from 'vitest';
import {
  classifyCollaborativeTask,
  countTasksByFilter,
  matchesCollabTaskFilter,
  parseCollabTaskFilter,
} from './collab-task-filters';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';

describe('collab-task-filters', () => {
  it('parseCollabTaskFilter validates values', () => {
    expect(parseCollabTaskFilter('prep')).toBe('prep');
    expect(parseCollabTaskFilter('invalid')).toBe('all');
  });

  it('classifies known prep templates', () => {
    const task = {
      id: '1',
      templateId: 'pre_trip_safety_blueprint',
      title: '行前安全蓝图交付',
      status: 'pending',
    } as CollaborativeTaskView;
    expect(classifyCollaborativeTask(task)).toBe('prep');
    expect(matchesCollabTaskFilter(task, 'prep')).toBe(true);
  });

  it('countTasksByFilter aggregates categories', () => {
    const tasks = [
      { id: '1', templateId: 'pre_trip_safety_blueprint', title: 'a', status: 'pending' },
      { id: '2', templateId: 'custom', title: '投票决策', status: 'pending' },
    ] as CollaborativeTaskView[];
    const counts = countTasksByFilter(tasks);
    expect(counts.all).toBe(2);
    expect(counts.prep).toBe(1);
    expect(counts.decision).toBe(1);
  });
});
