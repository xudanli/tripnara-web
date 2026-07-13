import { useMemo, useState } from 'react';
import { ChevronRight, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { WISH_CATEGORY_LABELS } from '@/lib/wishlist-model';
import {
  DECISION_QUEUE_DOMAIN_FILTERS,
  DECISION_QUEUE_PRIORITY_FILTERS,
  filterDecisionQueueTasks,
  resolveQueueStageLabel,
  type DecisionQueueDomainFilter,
  type DecisionQueuePriorityFilter,
} from '@/lib/collab-decisions-dashboard.util';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { DomainCrossLevel } from '@/types/trip-domain-influence';
import type { SilentVoteDetail } from '@/types/silent-votes';
import {
  workbenchListItemIdle,
  workbenchListItemSelected,
  workbenchSoftPriorityClass,
} from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';

interface CollabDecisionQueuePanelProps {
  tasks: DomainNegotiationTask[];
  votes?: SilentVoteDetail[];
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

function domainLabel(domain: string): string {
  return WISH_CATEGORY_LABELS[domain as keyof typeof WISH_CATEGORY_LABELS] ?? domain;
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-2 py-0.5 text-[10px] transition-colors',
        active
          ? 'border-primary bg-primary/10 font-medium text-primary'
          : 'border-border/60 bg-background text-muted-foreground hover:border-border',
      )}
    >
      {label}
    </button>
  );
}

export function CollabDecisionQueuePanel({
  tasks,
  votes = [],
  selectedTaskId,
  loading,
  onSelectTask,
  className,
}: CollabDecisionQueuePanelProps) {
  const [domainFilter, setDomainFilter] = useState<DecisionQueueDomainFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<DecisionQueuePriorityFilter>('all');

  const openVoteTitles = useMemo(
    () => new Set(votes.filter((v) => v.status === 'open').map((v) => v.title)),
    [votes],
  );

  const actionable = useMemo(
    () => tasks.filter((t) => t.status !== 'consensus_reached'),
    [tasks],
  );

  const filtered = useMemo(
    () => filterDecisionQueueTasks(actionable, domainFilter, priorityFilter),
    [actionable, domainFilter, priorityFilter],
  );

  return (
    <CollabWidgetCard title="决策队列" description="按领域与优先级筛选待决议题" compact className={className}>
      <div className="mb-2 space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {DECISION_QUEUE_DOMAIN_FILTERS.map((item) => (
            <FilterChip
              key={item.value}
              label={item.label}
              active={domainFilter === item.value}
              onClick={() => setDomainFilter(item.value)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DECISION_QUEUE_PRIORITY_FILTERS.map((item) => (
            <FilterChip
              key={item}
              label={item === 'all' ? '全部优先级' : item}
              active={priorityFilter === item}
              onClick={() => setPriorityFilter(item)}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-5 w-5 text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无符合筛选条件的待决议题。</p>
      ) : (
        <ul className="space-y-1.5" aria-label="决策队列">
          {filtered.map((task) => {
            const selected = task.id === selectedTaskId;
            const priority = priorityLabel(task.crossLevel);
            const stageLabel = resolveQueueStageLabel(task, openVoteTitles);
            const participants = task.claimCount ?? 0;

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
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5">
                        <Users className="h-3 w-3" />
                        {participants > 0 ? `${participants} 人参与` : '待认领'}
                      </span>
                      <Badge variant="secondary" className="h-5 text-[10px] font-normal">
                        {domainLabel(task.domain)}
                      </Badge>
                      <span>{stageLabel}</span>
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
