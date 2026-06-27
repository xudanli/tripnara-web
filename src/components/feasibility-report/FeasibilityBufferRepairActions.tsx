import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFeasibilityBufferRepair } from '@/hooks/useFeasibilityBufferRepair';
import {
  isBufferOrTravelRepairIssue,
  prefersInsertBufferDayPrimary,
  hasMinuteOrShiftBufferOptions,
} from '@/lib/feasibility-buffer-repair.util';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';
import type { TripDetail } from '@/types/trip';
import { cn } from '@/lib/utils';

export interface FeasibilityBufferRepairActionsProps {
  tripId: string;
  issue: FeasibilityIssueDto;
  trip?: TripDetail | null;
  compact?: boolean;
  className?: string;
  onApplied?: () => void | Promise<void>;
}

export default function FeasibilityBufferRepairActions({
  tripId,
  issue,
  trip,
  compact = false,
  className,
  onApplied,
}: FeasibilityBufferRepairActionsProps) {
  const { options, loading, applyQuickAction, applyOption } = useFeasibilityBufferRepair(
    tripId,
    issue,
    trip,
  );

  if (!isBufferOrTravelRepairIssue(issue)) return null;

  const btnClass = compact ? 'h-7 text-[11px]' : 'h-8 text-xs';
  const insertPrimary = prefersInsertBufferDayPrimary(issue);
  const minutePrimary = hasMinuteOrShiftBufferOptions(issue);

  if (options.length > 0) {
    return (
      <div className={cn('flex flex-wrap gap-1.5', className)}>
        {options.map((opt) => (
          <Button
            key={opt.id}
            variant="secondary"
            size="sm"
            className={btnClass}
            disabled={loading}
            type="button"
            onClick={() => void applyOption(opt, onApplied)}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : opt.label}
          </Button>
        ))}
      </div>
    );
  }

  if (insertPrimary || issue.uiHints?.primaryAction === 'add_buffer') {
    return (
      <div className={cn('flex flex-wrap gap-1.5', className)}>
        <Button
          variant="secondary"
          size="sm"
          className={btnClass}
          disabled={loading}
          type="button"
          onClick={() => void applyQuickAction('insert-buffer-day', onApplied)}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : '插入缓冲日'}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {!insertPrimary && !minutePrimary ? (
        <>
          <Button
            variant="secondary"
            size="sm"
            className={btnClass}
            disabled={loading}
            type="button"
            onClick={() => void applyQuickAction('buffer-30', onApplied)}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : '加 30 分钟缓冲'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={btnClass}
            disabled={loading}
            type="button"
            onClick={() => void applyQuickAction('buffer-60', onApplied)}
          >
            加 60 分钟缓冲
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={btnClass}
            disabled={loading}
            type="button"
            onClick={() => void applyQuickAction('buffer-15', onApplied)}
          >
            加 15 分钟缓冲
          </Button>
        </>
      ) : null}
      <Button
        variant={insertPrimary ? 'secondary' : 'outline'}
        size="sm"
        className={btnClass}
        disabled={loading}
        type="button"
        onClick={() => void applyQuickAction('shift', onApplied)}
      >
        推迟出发
      </Button>
      {insertPrimary ? (
        <Button
          variant="outline"
          size="sm"
          className={btnClass}
          disabled={loading}
          type="button"
          onClick={() => void applyQuickAction('insert-buffer-day', onApplied)}
        >
          插入缓冲日
        </Button>
      ) : null}
    </div>
  );
}
