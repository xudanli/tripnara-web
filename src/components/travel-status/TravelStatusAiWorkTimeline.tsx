import { Bot, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { workbenchPreDepartureTaskStatusBadgeClass } from '@/components/plan-studio/workbench/workbench-ui';
import { humanizeTravelActivitySummary } from '@/lib/travel-status-display.util';
import type { AiCompletedWorkItem, AiCompletedWorkKind } from '@/api/travel-status.types';
import { travelStatusEmptyState, travelStatusListItem } from './travel-status-ui';

const KIND_META: Record<
  AiCompletedWorkKind,
  { badge: string; icon: typeof Bot; status: 'completed' | 'in_progress' | 'blocked' }
> = {
  AUTO_REPAIR: {
    badge: 'AI 已自动处理',
    icon: Bot,
    status: 'completed',
  },
  DECISION_APPLIED: {
    badge: '您已确认',
    icon: CheckCircle2,
    status: 'completed',
  },
  DECISION_SUBMITTED: {
    badge: '处理中',
    icon: Loader2,
    status: 'in_progress',
  },
};

interface TravelStatusAiWorkTimelineProps {
  items: AiCompletedWorkItem[];
  className?: string;
}

export default function TravelStatusAiWorkTimeline({
  items,
  className,
}: TravelStatusAiWorkTimelineProps) {
  if (items.length === 0) {
    return (
      <p className={cn('text-xs leading-relaxed text-muted-foreground', className)}>
        暂无 AI 活动记录
      </p>
    );
  }

  return (
    <ol className={cn('space-y-2', className)}>
      {items.map((item) => {
        const meta = KIND_META[item.kind] ?? KIND_META.DECISION_APPLIED;
        const Icon = meta.icon;
        const when = item.occurredAt
          ? formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true, locale: zhCN })
          : null;

        return (
          <li key={item.activityId} className={travelStatusListItem}>
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/15">
                <Icon
                  className={cn(
                    'h-4 w-4 text-muted-foreground',
                    item.kind === 'DECISION_SUBMITTED' && 'animate-spin',
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={workbenchPreDepartureTaskStatusBadgeClass(meta.status)}>
                    {meta.badge}
                  </span>
                  {item.reversible ? (
                    <span className="text-[10px] text-muted-foreground">可撤销</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs font-medium leading-snug text-foreground">
                  {humanizeTravelActivitySummary(item.summary)}
                </p>
                {when ? (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {when}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
