import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCollabCenterTasks } from '@/hooks/useCollabCenterTasks';
import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';
import { CollaborativeTaskFlywheelPanel } from '@/features/match-square/components/CollaborativeTaskFlywheelPanel';
import { mergeCollabDeepLink } from '@/lib/collab-center-navigation';
import {
  countTasksByAssigneeScope,
  filterTasksByAssigneeScope,
  parseCollabTaskAssigneeScope,
  type CollabTaskAssigneeScope,
} from '@/lib/collab-task-assignee.util';
import {
  parseCollabTaskFilter,
  type CollabTaskFilter,
} from '@/lib/collab-task-filters';
import { trackCollabTaskApplyAi } from '@/utils/collab-center-analytics';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';
import { CollabTaskBoardTable } from '../widgets/CollabTaskBoardTable';
import { CollabTaskInsightsSidebar } from '../widgets/CollabTaskInsightsSidebar';
import { collabDashboardGrid, collabDashboardSpan } from '../collab-dashboard-layout';

interface CollabCenterTasksTabProps {
  tripId: string;
  className?: string;
}

export function CollabCenterTasksTab({ tripId, className }: CollabCenterTasksTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const taskFilter = parseCollabTaskFilter(searchParams.get('taskFilter'));
  const assigneeScope = parseCollabTaskAssigneeScope(searchParams.get('taskAssignee'));
  const { collaborativeTasks, myTasks, unassigned, currentUserId } = useCollabCenterTasks(tripId);
  const { openAssistant, sendAssistantMessage } = useAssistantSidebar();

  const scopedTasks = useMemo(() => {
    if (assigneeScope === 'mine') return myTasks;
    if (assigneeScope === 'unassigned') return unassigned;
    return collaborativeTasks;
  }, [assigneeScope, collaborativeTasks, myTasks, unassigned]);

  const assigneeCounts = useMemo(
    () => countTasksByAssigneeScope(collaborativeTasks, currentUserId),
    [collaborativeTasks, currentUserId],
  );

  const setTaskFilter = useCallback(
    (filter: CollabTaskFilter) => {
      const next = mergeCollabDeepLink(searchParams, { collabTab: 'tasks' });
      if (filter === 'all') {
        next.delete('taskFilter');
      } else {
        next.set('taskFilter', filter);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setAssigneeScope = useCallback(
    (scope: CollabTaskAssigneeScope) => {
      const next = mergeCollabDeepLink(searchParams, { collabTab: 'tasks' });
      if (scope === 'all') {
        next.delete('taskAssignee');
      } else {
        next.set('taskAssignee', scope);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const total = scopedTasks.length;
  const pending = scopedTasks.filter((t) => t.status === 'pending').length;
  const inProgress = scopedTasks.filter(
    (t) => t.status === 'pending' || t.status === 'rolled_back',
  ).length;
  const completed = scopedTasks.filter((t) => t.status === 'confirmed').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className={cn(workbenchCard, 'px-4 py-3')}>
          <p className="text-2xl font-semibold tabular-nums">{total}</p>
          <p className="text-xs font-medium">
            {assigneeScope === 'mine' ? '我的跟进' : assigneeScope === 'unassigned' ? '未分配' : '全部任务'}
          </p>
        </div>
        <div className={cn(workbenchCard, 'px-4 py-3')}>
          <p className="text-2xl font-semibold tabular-nums">{inProgress}</p>
          <p className="text-xs font-medium">进行中</p>
        </div>
        <div className={cn(workbenchCard, 'px-4 py-3')}>
          <p className="text-2xl font-semibold tabular-nums">{pending}</p>
          <p className="text-xs font-medium">待处理</p>
        </div>
        <div className={cn(workbenchCard, 'px-4 py-3')}>
          <p className="text-2xl font-semibold tabular-nums">{completed}</p>
          <p className="text-xs font-medium">已完成</p>
        </div>
        <div className={cn(workbenchCard, 'px-4 py-3')}>
          <p className="text-2xl font-semibold tabular-nums">{completionRate}%</p>
          <p className="text-xs font-medium">完成率</p>
        </div>
      </div>

      <div className={collabDashboardGrid}>
        <div className={collabDashboardSpan({ md: 6, lg: 8 })}>
          <CollabTaskBoardTable
            tasks={scopedTasks}
            filter={taskFilter}
            onFilterChange={setTaskFilter}
            assigneeScope={assigneeScope}
            assigneeCounts={assigneeCounts}
            onAssigneeScopeChange={setAssigneeScope}
          />
        </div>
        <div className={collabDashboardSpan({ md: 6, lg: 4 })}>
          <CollabTaskInsightsSidebar
            tasks={scopedTasks}
            onDiscussAssignment={(message) => {
              const target = unassigned.find((t) => t.status === 'pending');
              trackCollabTaskApplyAi({ tripId, taskId: target?.id });
              openAssistant();
              sendAssistantMessage(message);
            }}
          />
        </div>
      </div>

      <CollaborativeTaskFlywheelPanel tripId={tripId} interactive />
    </div>
  );
}
