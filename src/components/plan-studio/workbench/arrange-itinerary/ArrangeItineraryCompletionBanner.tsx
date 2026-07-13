import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ArrangeLodgingCoverageSummary } from '@/lib/arrange-itinerary-lodging-coverage.util';

export interface ArrangeItineraryCompletionBannerProps {
  activityCount: number;
  lodgingSummary: ArrangeLodgingCoverageSummary;
  onFillLodgingWithAssistant?: () => void;
  className?: string;
}

export function ArrangeItineraryCompletionBanner({
  activityCount,
  lodgingSummary,
  onFillLodgingWithAssistant,
  className,
}: ArrangeItineraryCompletionBannerProps) {
  const hasActivities = activityCount > 0;
  const lodgingIncomplete =
    lodgingSummary.totalNights > 0 && lodgingSummary.missingNights > 0;

  if (!hasActivities && lodgingSummary.isComplete) return null;

  const allComplete = hasActivities && lodgingSummary.isComplete;

  return (
    <div
      className={cn(
        'shrink-0 border-b border-border/50 px-3 py-1.5',
        allComplete ? 'bg-gate-allow/10' : 'bg-background',
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          编排进度
        </span>

        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-foreground">
          {hasActivities ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-gate-allow-foreground" />
          ) : (
            <span className="inline-flex h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
          )}
          活动 {hasActivities ? `已排入 ${activityCount} 项` : '待编排'}
        </span>

        {lodgingSummary.totalNights > 0 ? (
          <>
            <span className="hidden h-3 w-px shrink-0 bg-border/60 sm:block" aria-hidden />
            <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-foreground">
              {lodgingSummary.isComplete ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-gate-allow-foreground" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-gate-warn-foreground" />
              )}
              <span className="min-w-0 truncate">
                住宿 {lodgingSummary.coveredNights}/{lodgingSummary.totalNights} 晚
                {lodgingIncomplete ? ` · 待补 ${lodgingSummary.missingNights} 晚` : ' 已齐'}
              </span>
            </span>
            {lodgingIncomplete && onFillLodgingWithAssistant ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto h-6 shrink-0 gap-1 px-2 text-[10px]"
                onClick={onFillLodgingWithAssistant}
              >
                <Sparkles className="h-3 w-3" />
                一键补齐
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
