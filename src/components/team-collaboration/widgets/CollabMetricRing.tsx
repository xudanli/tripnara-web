import { cn } from '@/lib/utils';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';

interface CollabMetricRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  /** percent: 72% · score: 72/100 */
  valueFormat?: 'percent' | 'score';
  strokeClassName?: string;
  className?: string;
}

/** 协作中心通用环形指标 */
export function CollabMetricRing({
  value,
  size = 128,
  strokeWidth = 8,
  label,
  sublabel,
  valueFormat = 'percent',
  strokeClassName = 'stroke-primary',
  className,
}: CollabMetricRingProps) {
  const normalized = Math.min(100, Math.max(0, Math.round(value)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn('transition-all duration-500', strokeClassName)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-foreground">
            {valueFormat === 'score' ? (
              <>
                {normalized}
                <span className="text-sm font-normal text-muted-foreground">/100</span>
              </>
            ) : (
              `${normalized}%`
            )}
          </span>
          {sublabel ? (
            <span className="text-[10px] text-muted-foreground">{sublabel}</span>
          ) : null}
        </div>
      </div>
      {label ? (
        <p className="text-center text-sm font-medium text-foreground">{label}</p>
      ) : null}
    </div>
  );
}
