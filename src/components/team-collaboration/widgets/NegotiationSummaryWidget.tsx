import { Progress } from '@/components/ui/progress';
import { estimateNegotiationProgress } from '@/lib/collab-decisions-dashboard.util';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import { CollabWidgetCard } from './CollabWidgetCard';

interface NegotiationSummaryWidgetProps {
  tasks: DomainNegotiationTask[];
  className?: string;
}

export function NegotiationSummaryWidget({ tasks, className }: NegotiationSummaryWidgetProps) {
  const active = tasks.filter((t) => t.status !== 'consensus_reached').slice(0, 5);

  return (
    <CollabWidgetCard title="协商摘要" description="各议题协商进度" className={className} compact>
      {active.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无进行中的协商议题。</p>
      ) : (
        <ul className="space-y-3">
          {active.map((task) => {
            const progress = estimateNegotiationProgress(task);
            return (
              <li key={task.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-foreground">{task.title}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-1.5" />
                <p className="mt-0.5 text-[10px] text-muted-foreground">{task.statusLabel}</p>
              </li>
            );
          })}
        </ul>
      )}
    </CollabWidgetCard>
  );
}
