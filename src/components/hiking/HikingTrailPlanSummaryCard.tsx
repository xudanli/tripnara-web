import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mountain } from 'lucide-react';
import { loadHikingGenerateLog } from '@/lib/hiking-generate-plan';
import {
  HardTrekTrailPlanTimeline,
  extractHardTrekTrailPlan,
  extractRouteDirectionName,
} from './HardTrekTrailPlanTimeline';

interface HikingTrailPlanSummaryCardProps {
  tripId: string;
  onOpenPreview?: () => void;
  className?: string;
}

/** 展示最近一次决策引擎 generate-plan 的 Trail 段结果（session 缓存） */
export function HikingTrailPlanSummaryCard({
  tripId,
  onOpenPreview,
  className,
}: HikingTrailPlanSummaryCardProps) {
  const log = useMemo(() => loadHikingGenerateLog(tripId), [tripId]);
  const plan = extractHardTrekTrailPlan(log ?? undefined);

  if (!plan && !onOpenPreview) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mountain className="h-4 w-4" />
          徒步 Trail 计划
        </CardTitle>
        <CardDescription>决策引擎 generate-plan 输出</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {plan ? (
          <HardTrekTrailPlanTimeline
            plan={plan}
            routeDirectionName={extractRouteDirectionName(log ?? undefined)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            尚未生成 Trail 段，可先预演或点击「重新生成方案」。
          </p>
        )}
        {onOpenPreview && (
          <Button type="button" variant="outline" size="sm" onClick={onOpenPreview}>
            Trail 预演
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
