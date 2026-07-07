import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TripStatusBarViewModel } from '@/lib/trip-status-bar.util';
import { tripReadinessToneClass } from '@/lib/trip-status-bar.util';

interface TripOverviewHeroProps {
  model: TripStatusBarViewModel;
  onHandleIssues?: () => void;
  onViewFeasibility?: () => void;
  className?: string;
  /** 概览 Tab：结论区不重复展开问题列表（下方有待办区） */
  showIssueDetail?: boolean;
}

/** 总览 Hero — 结论优先：能不能去、哪里有问题、要做什么 */
export function TripOverviewHero({
  model,
  onHandleIssues,
  onViewFeasibility,
  className,
  showIssueDetail = true,
}: TripOverviewHeroProps) {
  const hasBlockers = model.counts.blockers > 0;
  const issueLines = model.topIssues.length
    ? model.topIssues
    : hasBlockers
      ? [{ problemId: '_summary', headline: model.headline, impact: model.subheadline }]
      : [];

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-none',
        className,
      )}
    >
      <div className="space-y-2.5 px-3 py-3 sm:px-4">
        <div className="space-y-1.5">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
              tripReadinessToneClass(model.readiness),
            )}
          >
            {model.readinessLabel}
          </span>
          <h2 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
            {model.headline}
          </h2>
          {model.subheadline ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{model.subheadline}</p>
          ) : null}
        </div>

        {showIssueDetail && issueLines.length > 0 && model.readiness !== 'READY_TO_GO' ? (
          <div className="space-y-1.5 rounded-lg border border-border/70 px-2.5 py-2">
            <p className="text-[11px] font-medium text-foreground">
              {hasBlockers
                ? `还有 ${model.counts.blockers} 个问题需要在出发前处理：`
                : '建议出发前关注：'}
            </p>
            <ul className="space-y-1">
              {issueLines.map((issue) => (
                <li key={issue.problemId} className="flex gap-1.5 text-xs text-muted-foreground">
                  <span className="shrink-0 text-muted-foreground/60">·</span>
                  <span>
                    <span className="text-foreground">{issue.headline}</span>
                    {issue.impact ? (
                      <span className="mt-0.5 block text-[10px] opacity-90">{issue.impact}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : model.readiness === 'READY_TO_GO' ? (
          <p className="text-xs text-muted-foreground">
            核心条件已满足，可继续完善细节或查看监控项。
          </p>
        ) : showIssueDetail ? null : (
          <p className="text-xs text-muted-foreground">
            {model.counts.blockers > 0
              ? `${model.counts.blockers} 项待处理，见下方待办。`
              : model.counts.warnings > 0
                ? `${model.counts.warnings} 项建议关注，见下方待办。`
                : '详见下方行程快照与监控。'}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {(hasBlockers || model.counts.warnings > 0) && onHandleIssues ? (
            <Button size="sm" className="h-8 text-xs" onClick={onHandleIssues}>
              {showIssueDetail ? '处理问题' : '查看待办'}
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>
          ) : null}
          {onViewFeasibility ? (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onViewFeasibility}>
              查看完整可行性
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
