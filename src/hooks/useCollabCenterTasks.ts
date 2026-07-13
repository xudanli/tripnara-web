import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCollabOverview } from '@/hooks/useCollabOverview';
import { useWorkbenchCollaborators } from '@/pages/plan-studio/hooks/useWorkbenchData';
import {
  enrichCollaborativeTasksWithAssigneeLabels,
  filterMySubTasks,
  filterUnassignedSubTasks,
} from '@/lib/collab-task-assignee.util';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';

/**
 * 任务分工 Tab 读模型 · 对齐 BFF GET /collaborative-tasks
 *
 * ```ts
 * const myTasks = collaborativeTasks.filter(
 *   (t) => t.isSubTask && t.assigneeUserId === currentUserId,
 * );
 * const unassigned = collaborativeTasks.filter(
 *   (t) => t.isSubTask && !t.assigneeUserId,
 * );
 * ```
 */
export function useCollabCenterTasks(tripId: string | undefined) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const { flywheelTasks, loading: overviewLoading } = useCollabOverview(tripId);
  const { data: collaborators = [], isLoading: collaboratorsLoading } =
    useWorkbenchCollaborators(tripId);

  const collaborativeTasks = useMemo(
    () => enrichCollaborativeTasksWithAssigneeLabels(flywheelTasks, collaborators),
    [flywheelTasks, collaborators],
  );

  const myTasks = useMemo(
    () => filterMySubTasks(collaborativeTasks, currentUserId),
    [collaborativeTasks, currentUserId],
  );

  const unassigned = useMemo(
    () => filterUnassignedSubTasks(collaborativeTasks),
    [collaborativeTasks],
  );

  return {
    collaborativeTasks,
    myTasks,
    unassigned,
    currentUserId,
    collaborators,
    loading: overviewLoading || collaboratorsLoading,
  } satisfies {
    collaborativeTasks: CollaborativeTaskView[];
    myTasks: CollaborativeTaskView[];
    unassigned: CollaborativeTaskView[];
    currentUserId: string | null;
    collaborators: typeof collaborators;
    loading: boolean;
  };
}
