import { Badge } from '@/components/ui/badge';
import { ITINERARY_CHANGE_LABEL } from '@/lib/feasibility-repair-plan-class';
import type { ItineraryDiffEntry } from '@/types/feasibility-repair';

export interface DecisionSpaceItineraryDiffListProps {
  diff: ItineraryDiffEntry[];
}

/** P3 · 决策空间内联行程 diff 列表 */
export function DecisionSpaceItineraryDiffList({ diff }: DecisionSpaceItineraryDiffListProps) {
  if (!diff.length) {
    return (
      <p className="text-[11px] text-muted-foreground py-2 text-center rounded-md border border-dashed border-border/60">
        当前预览未返回具体行程变更明细
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {diff.map((row) => (
        <li
          key={`${row.slotId}-${row.changeType}-${row.dayNumber}`}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md border border-border/60 bg-muted/10 px-2.5 py-1.5 text-[11px]"
        >
          <Badge variant="outline" className="h-5 shrink-0 text-[10px]">
            {ITINERARY_CHANGE_LABEL[row.changeType] ?? row.changeType}
          </Badge>
          <span className="font-mono-brand text-muted-foreground">Day {row.dayNumber}</span>
          {row.changeType === 'time_changed' ? (
            <span className="text-foreground">
              {row.before?.title}: {row.before?.time ?? '—'} → {row.after?.time ?? '—'}
            </span>
          ) : null}
          {row.changeType === 'removed' ? (
            <span className="text-foreground">{row.before?.title}</span>
          ) : null}
          {row.changeType === 'added' ? (
            <span className="text-foreground">{row.after?.title}</span>
          ) : null}
          {row.changeType === 'title_changed' ? (
            <span className="text-foreground">
              {row.before?.title} → {row.after?.title}
            </span>
          ) : null}
          {row.changeType === 'moved_day' ? (
            <span className="text-foreground">
              {row.after?.title ?? row.before?.title}: Day {row.before?.dayNumber} → Day{' '}
              {row.after?.dayNumber}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
