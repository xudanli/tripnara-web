import { Info, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatTravelAssuranceSubtitle,
  type TravelAssuranceSummary,
} from '@/lib/travel-assurance-summary.util';
import {
  resolveWorkbenchFeasibilityGrade,
  workbenchFeasibilityGradeClass,
  workbenchFeasibilityRingColor,
} from '@/lib/workbench-feasibility-display.util';

export interface WorkbenchFeasibilityRingProps {
  score: number | null;
  loading?: boolean;
  onClick?: () => void;
  /** 有则展示「行程保障」叙事，替代纯可行度分数 */
  assurance?: TravelAssuranceSummary | null;
  className?: string;
}

function AssuranceMetricsGrid({ assurance }: { assurance: TravelAssuranceSummary }) {
  const metrics = [
    { label: '已验证', value: assurance.verifiedItemCount },
    { label: '待处理', value: assurance.pendingProblemCount },
    { label: '可优化', value: assurance.suggestOptimizeCount },
  ];

  return (
    <div className="grid min-w-[168px] grid-cols-3 divide-x divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-muted/10">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex flex-col items-center px-2 py-1.5 text-center">
          <span className="text-[9px] font-medium leading-tight text-muted-foreground">
            {metric.label}
          </span>
          <span className="mt-0.5 text-sm font-semibold tabular-nums leading-none text-foreground">
            {metric.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 顶栏行程保障 / 可行度（对齐设计稿） */
export function WorkbenchFeasibilityRing({
  score,
  loading,
  onClick,
  assurance,
  className,
}: WorkbenchFeasibilityRingProps) {
  const size = 44;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalized = score != null ? Math.min(100, Math.max(0, Math.round(score))) : 0;
  const offset = circumference - (normalized / 100) * circumference;
  const grade = score != null ? resolveWorkbenchFeasibilityGrade(normalized) : null;
  const assuranceMode = Boolean(assurance);
  const subtitle = assurance ? formatTravelAssuranceSubtitle(assurance) : null;

  const body = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {assuranceMode ? (
          <div className="flex h-full w-full items-center justify-center rounded-full border border-border/60 bg-muted/15">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" aria-hidden />
          </div>
        ) : (
          <>
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
                  className={cn(
                    'transition-all duration-500',
                    workbenchFeasibilityRingColor(grade!.tone),
                  )}
                />
              ) : null}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {loading ? '…' : score != null ? normalized : '—'}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] font-medium text-muted-foreground">
          {assuranceMode ? '行程保障' : '可行度评分'}
        </p>
        {assuranceMode && assurance ? (
          <>
            <AssuranceMetricsGrid assurance={assurance} />
            {score != null ? (
              <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                综合 {normalized} 分
              </p>
            ) : null}
          </>
        ) : grade ? (
          <p className={cn('text-xs font-semibold', workbenchFeasibilityGradeClass(grade.tone))}>
            {grade.label}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{loading ? '加载中' : '暂无评分'}</p>
        )}
        {assuranceMode && subtitle && score == null ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">{subtitle}</p>
        ) : null}
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
      aria-label={assuranceMode ? '查看行程保障详情' : '查看可行度详情'}
    >
      {body}
    </button>
  );
}
