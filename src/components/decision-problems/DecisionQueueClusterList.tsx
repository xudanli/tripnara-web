import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QueueDisplayDecisionProblem } from '@/lib/decision-problem-queue-context.util';
import {
  compareDecisionProblemsForQueue,
  groupQueueProblemsByDay,
  resolveDecisionProblemQueueDisplay,
} from '@/lib/decision-problem-queue-display.util';
import { primaryEnforcementLabel } from '@/lib/decision-problem-display.util';
import {
  workbenchListItemIdle,
  workbenchListItemSelected,
  workbenchQueueDayLabel,
  workbenchQueueEnforcementBadgeClass,
} from '@/components/plan-studio/workbench/workbench-ui';

export interface DecisionQueueClusterListProps {
  items: QueueDisplayDecisionProblem[];
  selectedId?: string | null;
  onSelect?: (problemId: string) => void;
  /** hover 时预取 problem detail */
  onPrefetchProblem?: (problemId: string) => void;
  className?: string;
}

function QueueProblemRow({
  item,
  selected,
  onSelect,
  onPrefetch,
}: {
  item: QueueDisplayDecisionProblem;
  selected: boolean;
  onSelect: (problemId: string) => void;
  onPrefetch?: (problemId: string) => void;
}) {
  const queueDisplay = resolveDecisionProblemQueueDisplay(item);
  const enforcementLabel = primaryEnforcementLabel(item.primaryEnforcement);
  const categoryLabel = item.categoryLabel?.trim() || item.queueCategoryLabel?.trim();
  const isBlock = String(item.primaryEnforcement ?? '').trim().toUpperCase() === 'BLOCK';

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      onMouseEnter={() => onPrefetch?.(item.id)}
      onFocus={() => onPrefetch?.(item.id)}
      className={cn(
        'group flex w-full items-start gap-2',
        selected ? workbenchListItemSelected : workbenchListItemIdle,
      )}
    >
      <div className="min-w-0 flex-1 text-left">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {queueDisplay.dayBadge ? (
            <span className={workbenchQueueDayLabel}>{queueDisplay.dayBadge}</span>
          ) : null}
          {queueDisplay.dayBadge && (enforcementLabel || categoryLabel) ? (
            <span className="text-[10px] text-border" aria-hidden>
              ·
            </span>
          ) : null}
          {enforcementLabel ? (
            <span
              className={cn(
                'shrink-0 rounded px-1 py-0 text-[10px] font-medium leading-none',
                workbenchQueueEnforcementBadgeClass(item.primaryEnforcement),
              )}
            >
              {enforcementLabel}
            </span>
          ) : null}
          {categoryLabel ? (
            <>
              {enforcementLabel ? (
                <span className="text-[10px] text-border" aria-hidden>
                  ·
                </span>
              ) : null}
              <span className="text-[10px] text-muted-foreground">{categoryLabel}</span>
            </>
          ) : null}
        </div>
        <p
          className={cn(
            'mt-1 line-clamp-2 leading-snug text-foreground',
            isBlock ? 'text-xs font-semibold' : 'text-xs font-medium',
          )}
        >
          {queueDisplay.issueTitle}
        </p>
        {queueDisplay.contextLine ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] leading-relaxed text-muted-foreground">
            {queueDisplay.contextLine}
          </p>
        ) : null}
      </div>
      <ChevronRight className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70" />
    </button>
  );
}

/** 工作台决策队列 · 扁平问题列表（簇/依赖默认在详情展示） */
export function DecisionQueueClusterList({
  items,
  selectedId,
  onSelect,
  onPrefetchProblem,
  className,
}: DecisionQueueClusterListProps) {
  const openItems = useMemo(
    () =>
      [...items]
        .filter((item) => item.status !== 'RESOLVED' && item.status !== 'DISMISSED')
        .sort(compareDecisionProblemsForQueue),
    [items],
  );

  const groups = useMemo(() => groupQueueProblemsByDay(openItems), [openItems]);

  if (!openItems.length) {
    return (
      <p className={cn('px-1 py-4 text-center text-[11px] text-muted-foreground', className)}>
        暂无待处理决策
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {groups.map((group) => (
        <div key={group.day ?? `flat-${group.items.map((item) => item.id).join('-')}`}>
          {group.day != null ? (
            <p className="mb-1 px-0.5 text-[10px] font-medium text-muted-foreground">
              第 {group.day} 天（{group.items.length}）
            </p>
          ) : null}
          <ul className="space-y-1.5">
            {group.items.map((item) => (
              <li key={item.instanceKey ?? item.id}>
                <QueueProblemRow
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={(problemId) => onSelect?.(problemId)}
                  onPrefetch={onPrefetchProblem}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
