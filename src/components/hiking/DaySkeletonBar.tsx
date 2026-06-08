import type { DaySkeleton, DayPaceVerdict } from '@/types/hiking';
import { cn } from '@/lib/utils';

interface DaySkeletonBarProps {
  days: DaySkeleton[];
  verdicts?: DayPaceVerdict[];
  className?: string;
}

function verdictClass(verdict: string | undefined): string {
  if (verdict === 'over_limit') {
    return 'border-red-500/50 bg-red-500/5 text-red-700 dark:text-red-400';
  }
  if (verdict === 'stretch') {
    return 'border-amber-500/50 bg-amber-500/5 text-amber-800 dark:text-amber-400';
  }
  return 'border-border/60 bg-background';
}

export function DaySkeletonBar({ days, verdicts = [], className }: DaySkeletonBarProps) {
  const verdictByDay = new Map(verdicts.map((v) => [v.day, v]));

  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      {days.map((d) => {
        const v = verdictByDay.get(d.day);
        return (
          <div
            key={d.day}
            className={cn(
              'rounded-xl border px-3 py-3 text-center transition-colors',
              verdictClass(v?.verdict)
            )}
            title={v?.noteZh}
          >
            <p className="text-xs font-medium text-muted-foreground">Day {d.day}</p>
            <p className="mt-1 text-sm font-semibold leading-tight">{d.theme}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {d.distanceKm} km · ↑{d.ascentM} m
            </p>
            {v && (v.verdict === 'over_limit' || v.verdict === 'stretch') && (
              <p className="mt-1 text-[10px] font-medium">{v.noteZh}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
