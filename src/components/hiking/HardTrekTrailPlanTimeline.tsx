import type { HardTrekTrailPlan } from '@/types/hiking';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface HardTrekTrailPlanTimelineProps {
  plan: HardTrekTrailPlan | null | undefined;
  routeDirectionName?: string;
  className?: string;
}

export function HardTrekTrailPlanTimeline({
  plan,
  routeDirectionName,
  className,
}: HardTrekTrailPlanTimelineProps) {
  useEffect(() => {
    if (plan?.mode === 'poi_fallback' && plan.messageZh) {
      toast.info(plan.messageZh, { id: 'hard-trek-poi-fallback' });
    }
  }, [plan?.mode, plan?.messageZh]);

  if (!plan) return null;

  if (plan.mode === 'poi_fallback') {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        {plan.messageZh}
        {routeDirectionName ? ` · ${routeDirectionName}` : ''}
      </p>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">按日 Trail 段</p>
        {routeDirectionName && (
          <span className="text-xs text-muted-foreground">{routeDirectionName}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        建议 {plan.summary.suggestedDays} 日 · 全程 {plan.summary.totalDistanceKm} km · 日爬升上限{' '}
        {plan.summary.maxDailyAscentM} m
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {plan.segments.map((seg) => (
          <div
            key={seg.day}
            className={cn(
              'rounded-xl border px-3 py-3',
              !seg.suitable && 'border-gate-reject-border/40 bg-gate-reject-foreground/5'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Day {seg.day}</span>
              {!seg.suitable && (
                <span className="text-[10px] font-medium text-gate-reject-foreground">超标</span>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold">{seg.theme}</p>
            {seg.trailName && (
              <p className="text-xs text-muted-foreground">{seg.trailName}</p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              {seg.distanceKm} km · ↑{seg.ascentM} m
            </p>
            {seg.noteZh && (
              <p className="mt-1 text-[11px] text-gate-reject-foreground dark:text-gate-reject-foreground">{seg.noteZh}</p>
            )}
          </div>
        ))}
      </div>
      {plan.messageZh && (
        <p className="text-xs text-muted-foreground">{plan.messageZh}</p>
      )}
    </div>
  );
}

/** 从决策引擎 log 提取 hardTrekTrailPlan */
export { extractHardTrekTrailPlan } from '@/lib/hard-trek-trail-plan';

export function extractRouteDirectionName(
  log: Record<string, unknown> | null | undefined
): string | undefined {
  const rd = log?.routeDirection as { selected?: { name?: string } } | undefined;
  return rd?.selected?.name;
}
