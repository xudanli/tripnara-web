import { Filter, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import {
  COLLAB_TASK_ASSIGNEE_SCOPES,
  type CollabTaskAssigneeScope,
} from '@/lib/collab-task-assignee.util';
import {
  TASK_DOMAIN_FILTERS,
  TASK_PRIORITY_FILTERS,
  type CollabTaskDomainFilter,
} from '@/lib/collab-task-kanban.util';
import type { CollabTaskPriority } from '@/lib/collab-task-kanban.util';
import {
  workbenchSegmentIdle,
  workbenchSegmentSelected,
} from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface CollabTaskFilterBarProps {
  assigneeScope: CollabTaskAssigneeScope;
  assigneeCounts?: Record<CollabTaskAssigneeScope, number>;
  onAssigneeScopeChange: (scope: CollabTaskAssigneeScope) => void;
  priority: CollabTaskPriority | 'all';
  onPriorityChange: (priority: CollabTaskPriority | 'all') => void;
  domain: CollabTaskDomainFilter;
  onDomainChange: (domain: CollabTaskDomainFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  className?: string;
}

function ChipButton({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-[28px] items-center rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors',
        selected ? workbenchSegmentSelected : workbenchSegmentIdle,
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function CollabTaskFilterBar({
  assigneeScope,
  assigneeCounts,
  onAssigneeScopeChange,
  priority,
  onPriorityChange,
  domain,
  onDomainChange,
  search,
  onSearchChange,
  className,
}: CollabTaskFilterBarProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[10px] text-muted-foreground">视图</span>
          {COLLAB_TASK_ASSIGNEE_SCOPES.map((scope) => (
            <ChipButton
              key={scope.value}
              selected={assigneeScope === scope.value}
              onClick={() => onAssigneeScopeChange(scope.value)}
            >
              {scope.label === '全部' ? '全部' : scope.label === '我的跟进' ? '我的' : scope.label}
              {assigneeCounts ? (
                <span className="ml-1 tabular-nums opacity-80">{assigneeCounts[scope.value]}</span>
              ) : null}
            </ChipButton>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[10px] text-muted-foreground">优先级</span>
          {TASK_PRIORITY_FILTERS.map((item) => (
            <ChipButton
              key={item.value}
              selected={priority === item.value}
              onClick={() => onPriorityChange(item.value)}
              className={priority !== item.value ? item.tone : undefined}
            >
              {item.label}
            </ChipButton>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[10px] text-muted-foreground">领域</span>
          {TASK_DOMAIN_FILTERS.map((item) => (
            <ChipButton
              key={item.value}
              selected={domain === item.value}
              onClick={() => onDomainChange(item.value)}
            >
              {item.label}
            </ChipButton>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索任务名称或描述…"
              className="h-8 pl-8 text-xs"
            />
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-muted/40"
            aria-label="更多筛选"
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
