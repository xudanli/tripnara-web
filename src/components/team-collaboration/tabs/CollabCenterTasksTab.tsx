import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useCollabCenterTasks } from '@/hooks/useCollabCenterTasks';
import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';
import { mergeCollabDeepLink } from '@/lib/collab-center-navigation';
import {
  countTasksByAssigneeScope,
  filterTasksByAssigneeScope,
  parseCollabTaskAssigneeScope,
  type CollabTaskAssigneeScope,
} from '@/lib/collab-task-assignee.util';
import {
  filterTasksForBoard,
  type CollabTaskDomainFilter,
  type CollabTaskKanbanColumn,
  type CollabTaskPriority,
} from '@/lib/collab-task-kanban.util';
import { trackCollabTaskApplyAi } from '@/utils/collab-center-analytics';
import { cn } from '@/lib/utils';
import { collabDashboardGrid, collabDashboardSpan, collabPageStack } from '../collab-dashboard-layout';
import { CollabTaskStatusBanner } from '../widgets/CollabTaskStatusBanner';
import { CollabTaskFilterBar } from '../widgets/CollabTaskFilterBar';
import { CollabTaskKanbanBoard } from '../widgets/CollabTaskKanbanBoard';
import { CollabTaskInsightsSidebar } from '../widgets/CollabTaskInsightsSidebar';

interface CollabCenterTasksTabProps {
  tripId: string;
  className?: string;
}

export function CollabCenterTasksTab({ tripId, className }: CollabCenterTasksTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const assigneeScope = parseCollabTaskAssigneeScope(searchParams.get('taskAssignee'));
  const ownerParam = searchParams.get('taskOwner');
  const { collaborativeTasks, currentUserId, collaborators } = useCollabCenterTasks(tripId);
  const { openAssistant, sendAssistantMessage } = useAssistantSidebar();

  const [priority, setPriority] = useState<CollabTaskPriority | 'all'>('all');
  const [domain, setDomain] = useState<CollabTaskDomainFilter>('all');
  const [search, setSearch] = useState('');

  const scopedTasks = useMemo(
    () => filterTasksByAssigneeScope(collaborativeTasks, assigneeScope, currentUserId),
    [assigneeScope, collaborativeTasks, currentUserId],
  );

  const boardTasks = useMemo(
    () =>
      filterTasksForBoard(scopedTasks, {
        search,
        priority,
        domain,
        ownerUserId: ownerParam,
      }),
    [scopedTasks, search, priority, domain, ownerParam],
  );

  const assigneeCounts = useMemo(
    () => countTasksByAssigneeScope(collaborativeTasks, currentUserId),
    [collaborativeTasks, currentUserId],
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

  const setOwnerFilter = useCallback(
    (userId: string | null) => {
      const next = mergeCollabDeepLink(searchParams, { collabTab: 'tasks' });
      if (!userId) {
        next.delete('taskOwner');
      } else {
        next.set('taskOwner', userId);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleDiscussAssignment = useCallback(
    (message: string) => {
      const target = boardTasks.find((t) => t.status === 'pending');
      trackCollabTaskApplyAi({ tripId, taskId: target?.id });
      openAssistant();
      sendAssistantMessage(message || '请根据当前任务负载，给出自动分配与催办建议。');
    },
    [boardTasks, tripId, openAssistant, sendAssistantMessage],
  );

  const handleNewTask = useCallback(() => {
    toast.message('协作任务由决策确认与行前准备自动生成，暂不支持手动新建');
  }, []);

  const handleAddColumnTask = useCallback((_column: CollabTaskKanbanColumn) => {
    handleNewTask();
  }, [handleNewTask]);

  return (
    <div className={cn(collabPageStack, className)}>
      <CollabTaskStatusBanner tasks={scopedTasks} onNewTask={handleNewTask} />

      <CollabTaskFilterBar
        assigneeScope={assigneeScope}
        assigneeCounts={assigneeCounts}
        onAssigneeScopeChange={setAssigneeScope}
        priority={priority}
        onPriorityChange={setPriority}
        domain={domain}
        onDomainChange={setDomain}
        search={search}
        onSearchChange={setSearch}
      />

      <div className={collabDashboardGrid}>
        <div className={collabDashboardSpan({ md: 6, lg: 8 })}>
          <CollabTaskKanbanBoard tasks={boardTasks} onAddTask={handleAddColumnTask} />
        </div>
        <div className={collabDashboardSpan({ md: 6, lg: 4 })}>
          <CollabTaskInsightsSidebar
            tasks={scopedTasks}
            collaborators={collaborators}
            selectedOwnerId={ownerParam}
            onSelectOwner={setOwnerFilter}
            onDiscussAssignment={handleDiscussAssignment}
            onAutoAssign={() => handleDiscussAssignment('请给出自动分配建议')}
            onRemind={() => {
              openAssistant();
              sendAssistantMessage('请为逾期和待确认任务生成催办消息草稿。');
            }}
            onExport={() => toast.message('导出功能即将上线')}
          />
        </div>
      </div>
    </div>
  );
}
