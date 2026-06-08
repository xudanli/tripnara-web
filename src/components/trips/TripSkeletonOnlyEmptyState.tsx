import { Link } from 'react-router-dom';
import { Compass, Map, Puzzle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TripDetail } from '@/types/trip';
import { getMatchSquareInstantiation } from '@/lib/match-square-trip-metadata';
import { cn } from '@/lib/utils';

type TripSkeletonOnlyEmptyStateProps = {
  trip: TripDetail;
  tripId: string;
  className?: string;
};

/** Match Square / 模板 instantiate 后的骨架空态 — 引导 spawn / 编排 / Active Trip */
export function TripSkeletonOnlyEmptyState({
  trip,
  tripId,
  className,
}: TripSkeletonOnlyEmptyStateProps) {
  const inst = getMatchSquareInstantiation(trip.metadata);
  const recruitmentPostId = inst?.recruitmentPostId;

  return (
    <div
      className={cn(
        'mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-12 text-center',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/40">
        <Puzzle className="h-7 w-7 text-primary" aria-hidden />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">行程骨架已就绪</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          本行程不含 NL 生成的 POI 时间轴。请补全路线模板、spawn 徒步计划，或进入 Active Trip
          继续协同编排。
        </p>
      </div>

      <ul className="w-full space-y-2 text-left text-xs text-muted-foreground">
        <li className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2">
          <Map className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>绑定路线模板或确认招募帖内的模板匹配</span>
        </li>
        <li className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>满员后 spawn 徒步计划 / TripNARA 编排</span>
        </li>
        <li className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2">
          <Compass className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>行中协同任务与情境工具在 Active Trip 中展开</span>
        </li>
      </ul>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <Button asChild>
          <Link to={`/dashboard/trips/${tripId}/active`}>进入 Active Trip</Link>
        </Button>
        {recruitmentPostId && (
          <Button variant="outline" asChild>
            <Link to={`/dashboard/tripnara/plaza/${recruitmentPostId}`}>返回招募详情</Link>
          </Button>
        )}
        <Button variant="ghost" asChild>
          <Link to="/dashboard/trips">返回行程列表</Link>
        </Button>
      </div>
    </div>
  );
}
