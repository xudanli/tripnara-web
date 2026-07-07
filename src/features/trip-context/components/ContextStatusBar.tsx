import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTripTravelContext } from '../context/TripTravelContext';

/** P0.1 — 行程上下文状态栏（人类可读，不暴露 revision/snapshot） */
export function ContextStatusBar({ className }: { className?: string }) {
  const { enabled, ready, tripId, statusDisplay } = useTripTravelContext();

  if (!enabled) return null;

  const items = [
    { label: '行程状态', value: statusDisplay.tripStageLabel },
    { label: '已同步', value: statusDisplay.syncLabel },
    { label: '当前计划', value: statusDisplay.effectivePlanLabel },
    statusDisplay.openDecisionsLabel
      ? { label: '待确认', value: statusDisplay.openDecisionsLabel, highlight: true }
      : null,
    statusDisplay.monitoringLabel ? { label: '监控', value: statusDisplay.monitoringLabel } : null,
    statusDisplay.freshnessLabel ? { label: '数据', value: statusDisplay.freshnessLabel } : null,
    statusDisplay.pendingProposalLabel
      ? { label: '提案', value: statusDisplay.pendingProposalLabel, highlight: true }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string; highlight?: boolean }>;

  return (
    <div
      className={cn(
        'border-b border-border bg-muted/30 px-4 py-2',
        !ready && 'opacity-70',
        className,
      )}
      aria-label="行程上下文状态"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs max-w-6xl mx-auto">
        {items.map(({ label, value, highlight }) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className="text-muted-foreground">{label}</span>
            <span
              className={cn(
                'font-medium',
                highlight ? 'text-foreground' : 'text-foreground/90',
              )}
            >
              {value}
            </span>
          </span>
        ))}
        {statusDisplay.consistencyWarning ? (
          <span className="text-amber-700 dark:text-amber-400 font-medium">
            {statusDisplay.consistencyWarning}
          </span>
        ) : null}
        {import.meta.env.DEV &&
        import.meta.env.VITE_TRAVEL_CONTEXT_DEBUG === '1' &&
        tripId ? (
          <Link
            to={`/dashboard/internal/trips/${tripId}/context`}
            className="ml-auto text-primary hover:underline font-medium"
          >
            检查器
          </Link>
        ) : null}
      </div>
    </div>
  );
}
