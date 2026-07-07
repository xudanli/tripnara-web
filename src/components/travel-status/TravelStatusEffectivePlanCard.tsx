import { ArrowRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { workbenchInsetPanel } from '@/components/plan-studio/workbench/workbench-ui';
import type { TravelStatusEffectivePlan } from '@/api/travel-status.types';
import { PlanContentStateBadge } from '@/features/trip-context';
import { travelStatusEmptyState } from './travel-status-ui';

interface TravelStatusEffectivePlanCardProps {
  plan: TravelStatusEffectivePlan;
  onOpenPlanStudio?: () => void;
  className?: string;
}

export default function TravelStatusEffectivePlanCard({
  plan,
  onOpenPlanStudio,
  className,
}: TravelStatusEffectivePlanCardProps) {
  const title = plan.headline || '当前可执行行程';
  const hasContent = Boolean(plan.summary || plan.dayCount != null || plan.itemCount != null);

  if (!hasContent && !plan.versionId) {
    return (
      <div className={cn(travelStatusEmptyState, 'py-5', className)}>
        <p className="text-xs text-muted-foreground">暂无行程摘要，请前往编辑行程补全</p>
        {onOpenPlanStudio ? (
          <Button size="sm" className="mt-3 h-8" onClick={onOpenPlanStudio}>
            打开 Plan Studio
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn(workbenchInsetPanel, 'flex items-start gap-3 p-3.5')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/15">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <PlanContentStateBadge state="effective" />
            <h3 className="text-sm font-semibold leading-snug text-foreground">{title}</h3>
          </div>
          {plan.summary ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {plan.summary}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {plan.dayCount != null ? (
              <span className="font-mono-brand text-[11px] font-medium tabular-nums text-muted-foreground">
                {plan.dayCount} 天
              </span>
            ) : null}
            {plan.itemCount != null ? (
              <span className="font-mono-brand text-[11px] font-medium tabular-nums text-muted-foreground">
                {plan.itemCount} 个活动
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {onOpenPlanStudio ? (
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-full text-xs sm:w-auto"
          onClick={onOpenPlanStudio}
        >
          查看完整行程
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
