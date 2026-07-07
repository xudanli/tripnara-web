import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { WISH_CATEGORY_LABELS } from '@/lib/wishlist-model';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { DomainCrossLevel } from '@/types/trip-domain-influence';
import {
  CROSS_LEVEL_LABEL,
  crossLevelBadgeClass,
  negotiationStatusClass,
} from '@/components/domain-influence/domain-influence-ui';
import {
  workbenchListItemIdle,
  workbenchListItemSelected,
  workbenchSoftPriorityClass,
} from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';

interface CollabDecisionQueuePanelProps {
  tasks: DomainNegotiationTask[];
  selectedTaskId?: string | null;
  loading?: boolean;
  onSelectTask?: (task: DomainNegotiationTask) => void;
  className?: string;
}

function priorityLabel(level: DomainCrossLevel): '高' | '中' | '低' {
  if (level === 'high') return '高';
  if (level === 'medium') return '中';
  return '低';
}

const DOMAIN_LABELS = WISH_CATEGORY_LABELS;

function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS] ?? domain;
}

export function CollabDecisionQueuePanel({
  tasks,
  selectedTaskId,
  loading,
  onSelectTask,
  className,
}: CollabDecisionQueuePanelProps) {
  const actionable = tasks.filter((t) => t.status !== 'consensus_reached');

  return (
    <CollabWidgetCard
      title="领域协商"
      description="领域结构化协商 · Round Robin 偏好分享"
      className={className}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-5 w-5 text-muted-foreground" />
        </div>
      ) : actionable.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无待决协商议题，可从画像 Tab 识别摩擦点后发起。</p>
      ) : (
        <ul className="space-y-1.5" aria-label="决策队列">
          {actionable.map((task) => {
            const selected = task.id === selectedTaskId;
            const priority = priorityLabel(task.crossLevel);
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onSelectTask?.(task)}
                  className={cn(
                    'flex w-full items-start gap-2 text-left',
                    selected ? workbenchListItemSelected : workbenchListItemIdle,
                  )}
                  aria-current={selected ? 'true' : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground">{task.title}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-5 text-[10px] font-normal',
                          workbenchSoftPriorityClass(priority),
                        )}
                      >
                        {priority}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="h-5 text-[10px] font-normal">
                        {domainLabel(task.domain)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('h-5 text-[10px] font-normal', negotiationStatusClass(task.status))}
                      >
                        {task.statusLabel}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('h-5 text-[10px] font-normal', crossLevelBadgeClass(task.crossLevel))}
                      >
                        {CROSS_LEVEL_LABEL[task.crossLevel]}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      'mt-1 h-3.5 w-3.5 shrink-0',
                      selected ? 'text-primary' : 'text-muted-foreground/60',
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </CollabWidgetCard>
  );
}
