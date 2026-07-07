import { cn } from '@/lib/utils';
import type { DayExecutionStatus } from '@/lib/day-executability.util';
import { dayExecutionStatusTone } from '@/lib/day-executability.util';

interface ExecutionStatusBadgeProps {
  label: string;
  status: DayExecutionStatus;
  className?: string;
}

export function ExecutionStatusBadge({ label, status, className }: ExecutionStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        dayExecutionStatusTone(status),
        className,
      )}
    >
      {label}
    </span>
  );
}
