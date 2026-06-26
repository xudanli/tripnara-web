import type { MoneyNudge } from '@/types/in-trip-money';
import { nudgeTypeClasses, nudgeTypeLabel } from '@/lib/in-trip-money';
import { cn } from '@/lib/utils';

interface InTripMoneyNudgeListProps {
  nudges: MoneyNudge[];
  className?: string;
}

export function InTripMoneyNudgeList({ nudges, className }: InTripMoneyNudgeListProps) {
  if (nudges.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-medium text-muted-foreground">数字助推</p>
      {nudges.map((nudge, index) => (
        <div
          key={`${nudge.type}-${index}`}
          className={cn('rounded-lg border px-3 py-2.5 text-sm', nudgeTypeClasses(nudge.type))}
        >
          <p className="text-[10px] font-medium opacity-80 mb-0.5">
            {nudgeTypeLabel(nudge.type)}
          </p>
          <p>{nudge.message}</p>
        </div>
      ))}
    </div>
  );
}
