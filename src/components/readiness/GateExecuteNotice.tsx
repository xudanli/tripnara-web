import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { computeGateExecuteStatus, gateExecuteBlockMessage } from '@/lib/gate-execute';
import type { TripFeasibilityReportDto } from '@/types/trip-feasibility-report';
import type { TripDetail } from '@/types/trip';
import { cn } from '@/lib/utils';

export interface GateExecuteNoticeProps {
  trip: TripDetail | null | undefined;
  report: TripFeasibilityReportDto | null | undefined;
  tripId?: string;
  compact?: boolean;
  className?: string;
}

export default function GateExecuteNotice({
  trip,
  report,
  tripId,
  compact = false,
  className,
}: GateExecuteNoticeProps) {
  const gate = computeGateExecuteStatus(report, trip);
  if (!gate.blocked) return null;

  const message = gateExecuteBlockMessage(gate);
  const resolvedTripId = tripId ?? trip?.id ?? report?.tripId;
  const feasibilityHref = resolvedTripId
    ? `/dashboard/feasibility?tripId=${encodeURIComponent(resolvedTripId)}`
    : undefined;

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted dark:bg-muted/20 dark:border-border/50',
        compact ? 'px-3 py-2.5' : 'px-4 py-3',
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          className={cn('shrink-0 text-error dark:text-error', compact ? 'h-4 w-4 mt-0.5' : 'h-5 w-5')}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className={cn('font-medium text-error dark:text-error', compact ? 'text-xs' : 'text-sm')}>
            出发前须完成以下事项，暂无法开始行程
          </p>
          {message ? (
            <p className={cn('text-error/90 dark:text-error/90 leading-relaxed', compact ? 'text-[11px]' : 'text-xs')}>
              {message}
            </p>
          ) : null}
          <ul className={cn('space-y-0.5 text-error dark:text-error', compact ? 'text-[11px]' : 'text-xs')}>
            {gate.reasons.map((reason) => (
              <li key={`${reason.code}-${reason.issueId ?? reason.message}`} className="flex items-start gap-1.5">
                <ShieldCheck className="h-3 w-3 shrink-0 mt-0.5 opacity-70" aria-hidden />
                <span>{reason.message}</span>
              </li>
            ))}
          </ul>
          {feasibilityHref ? (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-7 text-xs border-border text-error hover:bg-muted dark:border-border dark:text-error',
                compact && 'mt-1',
              )}
              asChild
            >
              <Link to={feasibilityHref}>查看可执行性报告</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
