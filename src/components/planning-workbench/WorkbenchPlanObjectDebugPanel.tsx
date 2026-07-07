import { Boxes, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanObjectChainRow } from '@/components/planning-workbench/PlanObjectChainRow';
import { usePlanObjects } from '@/hooks/usePlanObjects';
import { countPlanObjectChainObjects } from '@/lib/plan-object-source.util';
import { cn } from '@/lib/utils';
import { PLAN_OBJECT_CHAIN_ORDER } from '@/types/plan-objects';

export interface WorkbenchPlanObjectDebugPanelProps {
  tripId: string;
  className?: string;
}

/**
 * Plan Studio 调试：独立 GET /plan-objects（Timeline Tab 产品路径走 timeline-overview?include=planobjects）
 */
export function WorkbenchPlanObjectDebugPanel({
  tripId,
  className,
}: WorkbenchPlanObjectDebugPanelProps) {
  if (!import.meta.env.DEV) return null;

  const { data, dataSource, loading, error, unavailable, refetch } = usePlanObjects(tripId, {
    enabled: Boolean(tripId),
  });

  const objectCount = countPlanObjectChainObjects(data?.days ?? []);
  const tripTail = tripId.length > 8 ? `…${tripId.slice(-8)}` : tripId;

  return (
    <Card className={cn('border-dashed border-border/70 bg-muted/15', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 py-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Boxes className="h-3.5 w-3.5" />
            PlanObject 链（Plan Studio 调试）
          </CardTitle>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            {PLAN_OBJECT_CHAIN_ORDER.join(' → ')} · trip {tripTail}
          </p>
          {dataSource ? (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              数据源：
              {dataSource === 'timeline-overview'
                ? 'timeline-overview?include=planobjects（回退）'
                : 'GET /plan-objects'}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          disabled={loading}
          onClick={() => refetch()}
          aria-label="刷新 plan-objects"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {loading && !data ? (
          <p className="text-[10px] text-muted-foreground">加载 plan-objects…</p>
        ) : null}
        {unavailable ? (
          <p className="text-[10px] text-muted-foreground">
            BFF 尚未提供 GET /plan-objects（404/501）
          </p>
        ) : null}
        {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
        {data?.days?.length ? (
          <>
            {objectCount === 0 ? (
              <p className="text-[10px] text-amber-700">
                已返回 {data.days.length} 天壳层，但对象链为空。请点刷新；若仍空，在 Network 核对
                /plan-objects 与 timeline-overview 的 objects/type 字段。
              </p>
            ) : null}
            <ul className="space-y-2">
              {data.days.map((day) => (
                <li
                  key={`${day.dayNumber}-${day.tripDayId ?? 'day'}`}
                  className="rounded-md border border-border/50 bg-background/80 px-2.5 py-2"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <Badge variant="secondary" className="h-5 text-[10px] font-normal">
                      Day {day.dayNumber}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {day.objects.length} 对象
                    </span>
                  </div>
                  <PlanObjectChainRow objects={day.objects} />
                </li>
              ))}
            </ul>
          </>
        ) : !loading && !unavailable && !error ? (
          <p className="text-[10px] text-muted-foreground">暂无日内 PlanObject 数据</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
