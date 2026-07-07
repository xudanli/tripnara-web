import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { WorkbenchGateStatusBanner } from './WorkbenchGateStatusBanner';
import type { GateStatus } from '@/lib/gate-status';
import { workbenchPrimaryAction } from './workbench-ui';

export interface WorkbenchConclusionStripProps {
  gateStatus?: GateStatus | string | null;
  headline?: string | null;
  detail?: string | null;
  affectedDayLabel?: string | null;
  pendingCount?: number;
  feasibilityScore?: number | null;
  primaryCtaLabel?: string;
  onPrimaryCta?: () => void;
  focusDayIndex?: number | null;
  onFocusDay?: (dayIndex: number) => void;
  onViewAnalysis?: () => void;
  className?: string;
}

function formatAffectedDaysLabel(days?: number[]): string | null {
  if (!days?.length) return null;
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 1) return `第 ${sorted[0]} 天`;
  return `第 ${sorted[0]}–${sorted[sorted.length - 1]} 天`;
}

export function buildWorkbenchAffectedDayLabel(
  affectedDays?: number[],
): string | null {
  return formatAffectedDaysLabel(affectedDays);
}

/** 小屏首屏结论条：Gate 状态 + 主 CTA */
export function WorkbenchConclusionStrip({
  gateStatus,
  headline,
  detail,
  affectedDayLabel,
  pendingCount = 0,
  feasibilityScore,
  primaryCtaLabel = '查看修复方案',
  onPrimaryCta,
  focusDayIndex,
  onFocusDay,
  onViewAnalysis,
  className,
}: WorkbenchConclusionStripProps) {
  const hasBlocking = Boolean(gateStatus && gateStatus !== 'ALLOW');
  const showPrimary = hasBlocking && onPrimaryCta;
  const showFocusDay =
    typeof focusDayIndex === 'number' &&
    focusDayIndex >= 0 &&
    onFocusDay;

  if (!hasBlocking && pendingCount === 0) {
    return (
      <div
        className={cn(
          'shrink-0 border-b border-border/70 bg-card px-4 py-3 sm:px-5',
          className,
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">当前无明显阻断问题</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {feasibilityScore != null
                ? `可行度 ${Math.round(feasibilityScore)}% · 可继续微调`
                : '可继续查看每日行程与决策依据'}
            </p>
          </div>
          {onViewAnalysis ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 min-h-[44px] rounded-lg text-xs"
              onClick={onViewAnalysis}
            >
              查看分析
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'shrink-0 space-y-2 border-b border-border/70 bg-card px-4 py-3 sm:px-5',
        className,
      )}
    >
      {gateStatus ? (
        <WorkbenchGateStatusBanner
          status={gateStatus}
          message={headline ?? detail ?? undefined}
          size="sm"
        />
      ) : (
        <p className="text-sm font-medium text-foreground">{headline ?? '有待处理问题'}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {affectedDayLabel ? `影响 ${affectedDayLabel}` : null}
          {affectedDayLabel && pendingCount > 0 ? ' · ' : null}
          {pendingCount > 0 ? `${pendingCount} 项待处理` : null}
          {!affectedDayLabel && pendingCount <= 0 && detail ? detail : null}
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          {showFocusDay ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 min-h-[44px] rounded-lg text-xs"
              onClick={() => onFocusDay(focusDayIndex)}
            >
              看第 {focusDayIndex + 1} 天
            </Button>
          ) : null}
          {showPrimary ? (
            <Button
              type="button"
              size="sm"
              className={cn('h-9 min-h-[44px] rounded-lg text-xs', workbenchPrimaryAction)}
              onClick={onPrimaryCta}
            >
              {primaryCtaLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
