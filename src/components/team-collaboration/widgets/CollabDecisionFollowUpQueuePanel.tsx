import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { decisionCollaborativeSubTaskKindLabel } from '@/lib/decision-collaborative-sub-task.util';
import {
  collaborativeSubTaskDisplayTitle,
  collaborativeSubTaskProblemId,
  isSuggestedCollaborativeSubTask,
} from '@/lib/collab-collaborative-task-display.util';
import { buildPlanStudioDecisionProblemPath } from '@/lib/plan-studio-decision-navigation.util';
import {
  workbenchListItemIdle,
  workbenchSoftPriorityClass,
} from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import { CollabWidgetCard } from './CollabWidgetCard';

interface CollabDecisionFollowUpQueuePanelProps {
  tripId: string;
  tasks: CollaborativeTaskView[];
  loading?: boolean;
  className?: string;
}

function subTaskStatusLabel(task: CollaborativeTaskView): string {
  if (isSuggestedCollaborativeSubTask(task)) return '建议跟进';
  if (task.status === 'confirmed') return '已完成';
  if (task.status === 'rolled_back') return '已取消';
  return '待处理';
}

export function CollabDecisionFollowUpQueuePanel({
  tripId,
  tasks,
  loading,
  className,
}: CollabDecisionFollowUpQueuePanelProps) {
  const navigate = useNavigate();
  const actionable = tasks.filter((t) => t.status !== 'confirmed' && t.status !== 'rolled_back');

  const openProblem = (task: CollaborativeTaskView) => {
    const problemId = collaborativeSubTaskProblemId(task);
    if (!problemId) return;
    navigate(buildPlanStudioDecisionProblemPath(tripId, problemId));
  };

  return (
    <CollabWidgetCard
      title="决策跟进"
      description="apply 后的协作子任务 · 标题已含决策上下文"
      className={className}
    >
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="h-5 w-5 text-muted-foreground" />
        </div>
      ) : actionable.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无决策跟进子任务。</p>
      ) : (
        <ul className="space-y-1.5" aria-label="决策跟进子任务">
          {actionable.map((task) => {
            const suggested = isSuggestedCollaborativeSubTask(task);
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => openProblem(task)}
                  disabled={!collaborativeSubTaskProblemId(task)}
                  className={cn(
                    'flex w-full items-start gap-2 text-left',
                    workbenchListItemIdle,
                    !collaborativeSubTaskProblemId(task) && 'cursor-default opacity-80',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">
                      {collaborativeSubTaskDisplayTitle(task)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {task.subTaskKind ? (
                        <Badge variant="secondary" className="h-5 text-[10px] font-normal">
                          {decisionCollaborativeSubTaskKindLabel(task.subTaskKind)}
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className="h-5 text-[10px] font-normal">
                        {subTaskStatusLabel(task)}
                      </Badge>
                      {task.assigneeUserId ? (
                        <Badge variant="outline" className="h-5 text-[10px] font-normal">
                          已分配
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn('h-5 text-[10px] font-normal', workbenchSoftPriorityClass('中'))}
                        >
                          未分配
                        </Badge>
                      )}
                      {suggested ? (
                        <span className="text-[10px] text-muted-foreground">确认后将落库</span>
                      ) : null}
                    </div>
                  </div>
                  {collaborativeSubTaskProblemId(task) ? (
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </CollabWidgetCard>
  );
}
