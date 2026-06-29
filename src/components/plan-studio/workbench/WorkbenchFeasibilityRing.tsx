import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  resolveWorkbenchFeasibilityGrade,
  workbenchFeasibilityGradeClass,
  workbenchFeasibilityRingColor,
} from '@/lib/workbench-feasibility-display.util';

export interface WorkbenchFeasibilityRingProps {
  score: number | null;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

/** 顶栏可行度环形评分（对齐设计稿） */
export function WorkbenchFeasibilityRing({
  score,
  loading,
  onClick,
  className,
}: WorkbenchFeasibilityRingProps) {
  const size = 44;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalized = score != null ? Math.min(100, Math.max(0, Math.round(score))) : 0;
  const offset = circumference - (normalized / 100) * circumference;
  const grade = score != null ? resolveWorkbenchFeasibilityGrade(normalized) : null;

  const body = (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          {score != null ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn('transition-all duration-500', workbenchFeasibilityRingColor(grade!.tone))}
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {loading ? '…' : score != null ? normalized : '—'}
          </span>
        </div>
      </div>
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] font-medium text-muted-foreground">可行度评分</p>
        {grade ? (
          <p className={cn('text-xs font-semibold', workbenchFeasibilityGradeClass(grade.tone))}>
            {grade.label}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{loading ? '加载中' : '暂无评分'}</p>
        )}
      </div>
      {onClick ? (
        <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
      ) : null}
    </div>
  );

  if (!onClick) return body;

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      aria-label="查看可行度详情"
    >
      {body}
    </button>
  );
}
