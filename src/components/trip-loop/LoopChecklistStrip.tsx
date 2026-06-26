import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import { resolveLoopChecklistNavigateTarget } from '@/lib/loop-checklist-navigation';
import { cn } from '@/lib/utils';
import type { LoopChecklistResult, TripLoopChecklistItem } from '@/types/trip-loop';

interface LoopChecklistStripProps {
  items: TripLoopChecklistItem[];
  className?: string;
  onItemActivate?: (item: TripLoopChecklistItem) => void;
}

function resultIcon(result: LoopChecklistResult) {
  switch (result) {
    case 'passed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" aria-hidden />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-red-600" aria-hidden />;
    case 'deferred':
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />;
    default:
      return <Circle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />;
  }
}

function resultLabel(result: LoopChecklistResult): string {
  switch (result) {
    case 'passed':
      return '通过';
    case 'failed':
      return '未通过';
    case 'deferred':
      return '稍后复查';
    default:
      return '待检';
  }
}

export function LoopChecklistStrip({ items, className, onItemActivate }: LoopChecklistStripProps) {
  if (items.length === 0) return null;

  return (
    <ul className={cn('grid gap-2 sm:grid-cols-2', className)} aria-label="验证检查清单">
      {items.map((item) => {
        const target = resolveLoopChecklistNavigateTarget(item);
        const clickable =
          Boolean(onItemActivate) &&
          (target.kind === 'filter_issues' || target.kind === 'open_profiling');
        const Tag = clickable ? 'button' : 'li';

        return (
          <Tag
            key={item.id}
            type={clickable ? 'button' : undefined}
            onClick={
              clickable
                ? () => onItemActivate?.(item)
                : undefined
            }
            className={cn(
              'flex items-start gap-2 rounded-md border px-3 py-2 text-sm text-left w-full',
              item.result === 'deferred'
                ? 'border-border/60 bg-muted/15'
                : 'bg-muted/20',
              clickable && 'cursor-pointer hover:bg-muted/35 transition-colors',
            )}
          >
          <span className="mt-0.5 shrink-0">{resultIcon(item.result)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">{item.label}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {resultLabel(item.result)}
              </span>
            </div>
            {item.detail ? (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.detail}</p>
            ) : null}
          </div>
        </Tag>
        );
      })}
    </ul>
  );
}
