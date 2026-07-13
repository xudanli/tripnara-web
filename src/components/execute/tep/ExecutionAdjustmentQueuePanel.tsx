import { Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExecutionAdjustmentQueueDto, ExecutionInterventionDto } from '@/types/mobile-execution';
import { ExecutionInterventionCard } from './ExecutionInterventionCard';

export interface ExecutionAdjustmentQueuePanelProps {
  tripId: string;
  data: ExecutionAdjustmentQueueDto | null;
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  applyingId?: string | null;
  highlightItemId?: string | null;
  onReload?: () => void;
  onAccept: (item: ExecutionInterventionDto) => void | Promise<void>;
  onDefer?: (item: ExecutionInterventionDto) => void | Promise<void>;
  className?: string;
}

export function ExecutionAdjustmentQueuePanel({
  tripId,
  data,
  loading = false,
  refreshing = false,
  error = null,
  applyingId = null,
  highlightItemId = null,
  onReload,
  onAccept,
  onDefer,
  className,
}: ExecutionAdjustmentQueuePanelProps) {
  if (loading && !data) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={cn('rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm', className)}>
        <p className="text-destructive">{error}</p>
        {onReload ? (
          <Button type="button" variant="outline" size="sm" className="mt-3 h-8" onClick={() => void onReload()}>
            重试
          </Button>
        ) : null}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className={cn('py-8 text-center', className)}>
        <p className="text-sm text-muted-foreground">暂无待调整项</p>
        {onReload ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-8 text-xs"
            disabled={refreshing}
            onClick={() => void onReload()}
          >
            <RefreshCw className={cn('mr-1 h-3.5 w-3.5', refreshing && 'animate-spin')} />
            刷新
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)} data-testid="execution-adjustment-queue-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{data.headline}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              待处理 {data.pendingCount}
            </Badge>
            {data.criticalCount > 0 ? (
              <Badge variant="destructive" className="text-[10px]">
                紧急 {data.criticalCount}
              </Badge>
            ) : null}
            {data.highPriorityCount > 0 ? (
              <Badge variant="outline" className="text-[10px]">
                高优 {data.highPriorityCount}
              </Badge>
            ) : null}
          </div>
        </div>
        {onReload ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={refreshing}
            onClick={() => void onReload()}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </Button>
        ) : null}
      </div>

      <ul className="space-y-3">
        {data.items.map((item) => (
          <li
            key={item.id}
            id={`execution-intervention-anchor-${item.id}`}
            className={cn(
              highlightItemId === item.id && 'ring-2 ring-primary ring-offset-2 rounded-xl',
            )}
          >
            <ExecutionInterventionCard
              item={item}
              tripId={tripId}
              applying={applyingId === item.id}
              onAccept={() => onAccept(item)}
              onDefer={item.decisionProblemId && onDefer ? () => onDefer(item) : undefined}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
