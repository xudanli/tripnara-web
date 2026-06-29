import { GitBranch, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { DecisionCheckerSplitBannerDto } from '@/types/decision-checker';
import {
  workbenchSplitBannerIconSurface,
  workbenchSplitBannerSurface,
} from './workbench-ui';

export interface WorkbenchSplitPlanBannerProps {
  banner: DecisionCheckerSplitBannerDto;
  onViewSplitPlan?: () => void;
  className?: string;
}

/** 中栏 · 分流建议紧凑提示条（克制中性 / 轻 warning） */
export function WorkbenchSplitPlanBanner({
  banner,
  onViewSplitPlan,
  className,
}: WorkbenchSplitPlanBannerProps) {
  const tone = banner.tone === 'warning' ? 'warning' : 'info';

  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2.5 text-[11px] leading-snug',
        workbenchSplitBannerSurface(tone),
        className,
      )}
    >
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
          workbenchSplitBannerIconSurface(tone),
        )}
        aria-hidden
      >
        <GitBranch className="h-3.5 w-3.5" />
      </span>
      <span className="shrink-0 font-semibold text-foreground">{banner.title}</span>
      {banner.message ? (
        <>
          <span className="hidden text-muted-foreground/40 sm:inline" aria-hidden>
            ·
          </span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{banner.message}</span>
        </>
      ) : null}
      {banner.affectedDays.length > 0 ? (
        <span className="flex shrink-0 flex-wrap gap-1">
          {banner.affectedDays.map((day) => (
            <Badge
              key={day}
              variant="outline"
              className="h-5 rounded-full border-gate-suggest-border/45 bg-background/70 px-1.5 py-0 text-[10px] font-normal leading-5 text-gate-suggest-foreground"
            >
              Day {day}
            </Badge>
          ))}
        </span>
      ) : null}
      {onViewSplitPlan ? (
        <button
          type="button"
          onClick={onViewSplitPlan}
          className="ml-auto inline-flex shrink-0 items-center gap-1 font-medium text-gate-suggest-foreground hover:underline"
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          查看分流方案
        </button>
      ) : null}
    </div>
  );
}
