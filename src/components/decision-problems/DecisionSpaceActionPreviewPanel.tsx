import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dispatchPlanStudioSelectScheduleDay } from '@/lib/plan-studio-schedule-navigation';
import type { DecisionSpaceActionPreviewView } from '@/lib/decision-space-action-preview.util';
import { actionPreviewHasIncrementalContent } from '@/lib/decision-space-action-preview.util';
import { DecisionSpaceItineraryDiffList } from '@/components/decision-problems/DecisionSpaceItineraryDiffList';

export interface DecisionSpaceActionPreviewPanelProps {
  view: DecisionSpaceActionPreviewView | null;
  loading?: boolean;
  className?: string;
  onViewSchedule?: () => void;
  /** 读路径仅 baseline tradeoffs 时，由用户点「查看影响预览」触发 POST preview */
  canRequestPreview?: boolean;
  onRequestPreview?: () => void;
}

/** P2 · 选中方案后的影响预览（before/after + 摘要） */
export function DecisionSpaceActionPreviewPanel({
  view,
  loading = false,
  className,
  onViewSchedule,
  canRequestPreview = false,
  onRequestPreview,
}: DecisionSpaceActionPreviewPanelProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-dashed border-border/60 px-3 py-3 text-[11px] text-muted-foreground',
          className,
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        正在加载方案影响预览…
      </div>
    );
  }

  if (!view) {
    if (!canRequestPreview || !onRequestPreview) return null;
    return (
      <button
        type="button"
        className={cn(
          'px-0.5 text-left text-[11px] text-primary underline-offset-2 hover:underline',
          className,
        )}
        onClick={onRequestPreview}
      >
        加载完整影响对比 →
      </button>
    );
  }

  if (!actionPreviewHasIncrementalContent(view)) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-background/80 px-3 py-2.5',
        className,
      )}
    >
      <p className="text-xs font-semibold text-foreground">方案影响预览</p>

      {view.summary ? (
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{view.summary}</p>
      ) : null}

      {view.comparison ? (
        <div className="mt-2 flex flex-wrap items-center gap-1 rounded-md border border-dashed border-border/50 bg-muted/10 px-2.5 py-1.5 text-[11px]">
          <span className="text-muted-foreground">原计划</span>
          <span className="font-medium text-foreground">{view.comparison.before}</span>
          <span className="text-muted-foreground/60" aria-hidden>
            →
          </span>
          <span className="text-muted-foreground">调整后</span>
          <span className="font-medium text-foreground">{view.comparison.after}</span>
        </div>
      ) : null}

      {view.mutationLines.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          {view.mutationLines.map((line) => (
            <li key={line} className="leading-snug">
              · {line}
            </li>
          ))}
        </ul>
      ) : null}

      {view.itineraryDiff.length > 0 || view.scheduleNavigation ? (
        <div className="mt-2.5 space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground">行程变更预览</p>
          <DecisionSpaceItineraryDiffList diff={view.itineraryDiff} />
          {view.scheduleNavigation ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 w-full text-[11px]"
              onClick={() => {
                dispatchPlanStudioSelectScheduleDay(view.scheduleNavigation!);
                onViewSchedule?.();
              }}
            >
              在时间轴中查看变更
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
