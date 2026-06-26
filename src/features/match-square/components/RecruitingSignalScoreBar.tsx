import { cn } from '@/lib/utils';
import { recruitingSignalBarColor } from '../lib/recruiting-attribution.util';

interface RecruitingSignalScoreBarProps {
  label: string;
  score: number;
  className?: string;
}

export function RecruitingSignalScoreBar({
  label,
  score,
  className,
}: RecruitingSignalScoreBarProps) {
  const clamped = Math.max(0, Math.min(1, score));
  const percent = Math.round(clamped * 100);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', recruitingSignalBarColor(clamped))}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} ${percent}%`}
        />
      </div>
    </div>
  );
}
