import { ChevronRight, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MobileExecutionOverviewDto } from '@/types/mobile-execution';

export interface ExecutionOverviewPanelProps {
  overview: MobileExecutionOverviewDto | null;
  loading?: boolean;
  partial?: boolean;
  canReportSlip?: boolean;
  onStatusRowClick?: (rowId: MobileExecutionOverviewDto['statusRows'][number]['id']) => void;
  onQuickAction?: (actionId: string) => void;
  onReportSlip?: () => void;
  className?: string;
}

function statusRowClass(style: MobileExecutionOverviewDto['statusRows'][number]['style']): string {
  switch (style) {
    case 'risk':
      return 'border-gate-reject-border/40 bg-gate-reject/5';
    case 'adjustment':
      return 'border-gate-confirm-border/40 bg-gate-confirm/5';
    default:
      return 'border-border/70 bg-muted/20';
  }
}

export function ExecutionOverviewPanel({
  overview,
  loading = false,
  partial = false,
  canReportSlip = false,
  onStatusRowClick,
  onQuickAction,
  onReportSlip,
  className,
}: ExecutionOverviewPanelProps) {
  if (loading && !overview) {
    return (
      <div className={cn('flex items-center justify-center rounded-xl border border-border/70 bg-card p-6', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!overview) return null;

  const activity = overview.currentActivity;

  return (
    <section
      className={cn('rounded-xl border border-border/70 bg-card p-4 space-y-4', className)}
      data-testid="execution-overview-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {overview.dayLabel}
            </Badge>
            <span className="text-xs text-muted-foreground">{overview.lifecycleLabel}</span>
            {partial ? (
              <Badge variant="secondary" className="text-[10px]">
                加载中…
              </Badge>
            ) : null}
          </div>
          <h2 className="text-base font-semibold text-foreground truncate">{activity.title}</h2>
          {activity.subtitle ? (
            <p className="text-sm text-muted-foreground">{activity.subtitle}</p>
          ) : null}
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {overview.executionScore}
          </p>
          <p className="text-[11px] text-muted-foreground">{overview.executionScoreLabel}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        <div className="rounded-lg border border-border/60 bg-muted/10 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">当前位置</p>
          <p className="mt-1 font-medium text-foreground">{activity.locationName || '—'}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/10 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">集合 / 离开</p>
          <p className="mt-1 font-medium text-foreground">{activity.meetingTime || activity.remainingTime || '—'}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/10 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">预计到达</p>
          <p className="mt-1 font-medium text-foreground">{activity.estimatedArrival || '—'}</p>
        </div>
      </div>

      {overview.metrics.length ? (
        <div className="flex flex-wrap gap-2">
          {overview.metrics.slice(0, 4).map((metric) => (
            <div
              key={metric.id}
              className="rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-[11px]"
              title={metric.detail}
            >
              <span className="text-muted-foreground">{metric.title}</span>
              <span className="ml-1.5 font-medium text-foreground">{metric.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {overview.statusRows.length ? (
        <ul className="space-y-2">
          {overview.statusRows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/20',
                  statusRowClass(row.style),
                )}
                onClick={() => onStatusRowClick?.(row.id)}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{row.title}</span>
                    {row.badgeCount != null && row.badgeCount > 0 ? (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {row.badgeCount}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{row.detail}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {overview.quickActions.map((action) => (
          <Button
            key={action.id}
            type="button"
            size="sm"
            variant={action.isDestructive ? 'destructive' : 'outline'}
            className="h-8"
            onClick={() => {
              if (action.id === 'log-event') {
                onReportSlip?.();
                return;
              }
              onQuickAction?.(action.id);
            }}
          >
            {action.title}
          </Button>
        ))}
        {canReportSlip ? (
          <Button type="button" size="sm" className="h-8" onClick={onReportSlip}>
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            我晚了
          </Button>
        ) : null}
      </div>
    </section>
  );
}
