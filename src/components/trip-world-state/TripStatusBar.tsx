import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TripStatusBarViewModel } from '@/lib/trip-status-bar.util';
import { tripReadinessToneClass } from '@/lib/trip-status-bar.util';

export type TripStatusBarSection = 'decisions' | 'verify' | 'monitor';

interface TripStatusBarProps {
  model: TripStatusBarViewModel;
  tripLabel?: string;
  dateRangeLabel?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onNavigateSection?: (section: TripStatusBarSection) => void;
  className?: string;
}

function CountChip({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  tone?: 'danger' | 'warning' | 'neutral';
  onClick?: () => void;
}) {
  if (value <= 0) return null;
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none',
        tone === 'danger' && 'border-gate-reject-border/50 text-gate-reject-foreground bg-gate-reject/5',
        tone === 'warning' && 'border-gate-confirm-border/50 text-gate-confirm-foreground bg-gate-confirm/5',
        tone === 'neutral' && 'border-border text-muted-foreground bg-muted/30',
        onClick && 'cursor-pointer hover:bg-muted/50 transition-colors',
      )}
    >
      {value} {label}
    </Comp>
  );
}

/** 行程内共享世界状态条 — 消费 travel-status BFF，不在前端计算规则 */
export function TripStatusBar({
  model,
  tripLabel,
  dateRangeLabel,
  isRefreshing,
  onRefresh,
  onNavigateSection,
  className,
}: TripStatusBarProps) {
  const { counts, readinessLabel, planVersionLabel, worldStateUpdatedLabel } = model;

  return (
    <div
      className={cn(
        'border-b border-border bg-card/95 px-4 sm:px-6 py-1.5 shadow-sm',
        className,
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {(tripLabel || dateRangeLabel) && (
            <p className="text-[10px] text-muted-foreground truncate mb-0.5">
              {[tripLabel, dateRangeLabel].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none',
                tripReadinessToneClass(model.readiness),
              )}
            >
              {readinessLabel}
            </span>
            <span className="text-xs text-foreground font-medium truncate max-w-[min(100%,28rem)] leading-snug">
              {model.headline}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {planVersionLabel ? (
            <span className="text-[10px] text-muted-foreground font-mono leading-none">
              计划 {planVersionLabel}
            </span>
          ) : null}
          {worldStateUpdatedLabel ? (
            <span className="text-[10px] text-muted-foreground hidden md:inline leading-none">
              {worldStateUpdatedLabel}
            </span>
          ) : null}
          {onRefresh ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-muted-foreground"
              disabled={isRefreshing}
              onClick={onRefresh}
            >
              <RefreshCw className={cn('h-3 w-3 mr-0.5', isRefreshing && 'animate-spin')} />
              刷新
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-1 flex flex-wrap gap-1">
        <CountChip
          label="阻塞"
          value={counts.blockers}
          tone="danger"
          onClick={counts.blockers > 0 ? () => onNavigateSection?.('decisions') : undefined}
        />
        <CountChip
          label="待确认"
          value={counts.needsConfirm}
          tone="warning"
          onClick={counts.needsConfirm > 0 ? () => onNavigateSection?.('verify') : undefined}
        />
        <CountChip
          label="提醒"
          value={counts.warnings}
          tone="warning"
          onClick={counts.warnings > 0 ? () => onNavigateSection?.('decisions') : undefined}
        />
        <CountChip
          label="持续监控"
          value={counts.monitoring}
          tone="neutral"
          onClick={counts.monitoring > 0 ? () => onNavigateSection?.('monitor') : undefined}
        />
      </div>
    </div>
  );
}
