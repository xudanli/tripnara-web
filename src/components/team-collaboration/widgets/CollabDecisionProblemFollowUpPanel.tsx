import { ArrowRight, ClipboardList } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { buildPlanStudioDecisionProblemPath } from '@/lib/plan-studio-decision-navigation.util';
import { mergeCollabDeepLink } from '@/lib/collab-center-navigation';
import { isDecisionProblemNegotiationTask } from '@/lib/collab-negotiation-selection.util';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import { workbenchInsetPanel } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface CollabDecisionProblemFollowUpPanelProps {
  tripId: string;
  task: DomainNegotiationTask;
  className?: string;
}

/** 决策 apply 衍生的开放协商（非 Round Robin 领域认领） */
export function CollabDecisionProblemFollowUpPanel({
  tripId,
  task,
  className,
}: CollabDecisionProblemFollowUpPanelProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const problemId = task.decisionProblemId ?? task.problemId;

  if (!isDecisionProblemNegotiationTask(task)) return null;

  const openDecisionProblem = () => {
    if (!problemId) return;
    navigate(buildPlanStudioDecisionProblemPath(tripId, problemId));
  };

  const openTaskDivision = () => {
    const next = mergeCollabDeepLink(searchParams, { collabTab: 'tasks' });
    setSearchParams(next, { replace: true });
  };

  return (
    <div className={cn(workbenchInsetPanel, 'space-y-3 p-4', className)}>
      <p className="text-sm leading-relaxed text-muted-foreground">
        此议题来自决策 apply 后的待跟进协商，需在决策中心查看方案、确认执行或创建协作子任务。
      </p>
      {task.description ? (
        <p className="text-sm text-foreground">{task.description}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {problemId ? (
          <Button type="button" size="sm" className="h-8 gap-1 text-xs" onClick={openDecisionProblem}>
            打开决策问题
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={openTaskDivision}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          查看任务分工
        </Button>
      </div>
    </div>
  );
}
