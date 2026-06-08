import { cn } from '@/lib/utils';
import type { ComputeStep } from '@/types/hiking';

interface ComputeStepCardProps {
  step: ComputeStep;
  active: boolean;
  done: boolean;
  progress: number;
  className?: string;
}

export function ComputeStepCard({
  step,
  active,
  done,
  progress,
  className,
}: ComputeStepCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-5 py-4 transition-colors',
        active ? 'border-foreground/20 bg-foreground/[0.03]' : 'border-transparent',
        done && !active && 'opacity-60',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium tracking-tight text-foreground">
            {step.labelZh}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {step.service}
          </p>
        </div>
        {step.status === 'cached_fallback' && (
          <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-400">
            演示数据
          </span>
        )}
      </div>
      {active && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-100 ease-linear"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}
