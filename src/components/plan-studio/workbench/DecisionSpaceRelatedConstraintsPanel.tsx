import { useMemo } from 'react';
import { ChevronRight, LockKeyhole } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useTripConstraints } from '@/hooks/useTripConstraints';
import {
  flattenPartition,
  hasConstraintConflict,
} from '@/lib/constraint-console-partition.util';
import { resolveRelatedConstraintUiIds } from '@/lib/planning-conflicts-decision.util';
import { uiConstraintIdToApi } from '@/lib/trip-constraints.adapter';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConstraintsSummary } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import type { TripBudgetProfile } from '@/types/trip-budget';
import type { TripConstraintsListResponse } from '@/types/trip-constraints';
import { ConstraintListItemRow } from './ConstraintListItemRow';
import { cn } from '@/lib/utils';
import {
  workbenchEmptySurface,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchScrollable,
} from './workbench-ui';

export interface DecisionSpaceRelatedConstraintsPanelProps {
  tripId: string;
  summary: PlanningConstraintsSummary | null;
  trip?: TripDetail | null;
  loading?: boolean;
  softPrefsRevision?: number;
  constraintsApiList?: TripConstraintsListResponse | null;
  budgetProfile?: TripBudgetProfile | null;
  conflict?: PlanningConflictItem | null;
  decisionProblem?: DecisionProblemSummary | null;
  onOpenConstraintConsole?: () => void;
  className?: string;
}

function entryMatchesRelatedIds(
  entryId: string,
  relatedIdSet: Set<string>,
): boolean {
  return relatedIdSet.has(entryId) || relatedIdSet.has(uiConstraintIdToApi(entryId));
}

/** 决策空间左栏 · 仅展示与当前决策相关的约束（只读） */
export function DecisionSpaceRelatedConstraintsPanel({
  tripId,
  summary,
  trip,
  loading,
  softPrefsRevision = 0,
  constraintsApiList,
  budgetProfile,
  conflict,
  decisionProblem,
  onOpenConstraintConsole,
  className,
}: DecisionSpaceRelatedConstraintsPanelProps) {
  const relatedIds = useMemo(
    () => resolveRelatedConstraintUiIds({ conflict, decisionProblem }),
    [conflict, decisionProblem],
  );
  const relatedIdSet = useMemo(() => new Set(relatedIds), [relatedIds]);

  const tripConstraints = useTripConstraints({
    tripId,
    summary,
    trip,
    budgetProfile: budgetProfile ?? null,
    revision: softPrefsRevision,
    apiListOverride: constraintsApiList,
  });

  const relatedEntries = useMemo(() => {
    if (relatedIdSet.size === 0) return [];
    return flattenPartition(tripConstraints.partition).filter((entry) =>
      entryMatchesRelatedIds(entry.id, relatedIdSet),
    );
  }, [tripConstraints.partition, relatedIdSet]);

  const showLoading = (loading || tripConstraints.loading) && !summary;

  return (
    <div className={cn('flex h-full flex-col border-t border-border/60 bg-background', className)}>
      <div className={workbenchPanelHeader}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className={workbenchPanelTitle}>相关约束</h2>
            <Badge variant="outline" className="h-5 shrink-0 text-[10px] font-normal text-muted-foreground">
              只读
            </Badge>
          </div>
          <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
        </div>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
          仅展示与当前决策相关的约束条件；修改请前往完整约束控制台。
        </p>
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto px-2.5 py-2', workbenchScrollable)}>
        {showLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : relatedEntries.length === 0 ? (
          <div className={cn(workbenchEmptySurface, 'px-3 py-4 text-center')}>
            <p className="text-xs font-medium text-foreground">暂无关联约束</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {relatedIds.length > 0
                ? '已识别与当前决策相关的约束类型，但当前行程控制台未展示对应条目（例如非自驾行程不显示「每日驾驶上限」）。可在完整约束控制台查看全部条件。'
                : '当前决策问题可能来自预订、证据或外部规则，不直接对应可编辑的行程约束。'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {relatedEntries.map((item) => (
              <li key={item.id}>
                <ConstraintListItemRow
                  item={{
                    ...item,
                    locked: true,
                    readOnly: true,
                  }}
                  layout="stacked"
                  selected={hasConstraintConflict(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {onOpenConstraintConsole ? (
        <div className="shrink-0 border-t border-border/50 p-2">
          <Button
            variant="outline"
            className="h-8 w-full rounded-lg text-[11px] font-medium"
            onClick={onOpenConstraintConsole}
          >
            查看全部条件
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
