import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Mountain, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  loadHikingGenerateLog,
  runHikingGeneratePlanWithCausalCache,
} from '@/lib/hiking-generate-plan';
import type { TripDetail } from '@/types/trip';
import type { FitnessProfile } from '@/types/fitness';
import {
  HardTrekTrailPlanTimeline,
  extractHardTrekTrailPlan,
  extractRouteDirectionName,
} from './HardTrekTrailPlanTimeline';

interface HikingTrailPlanSummaryCardProps {
  tripId: string;
  /** 传入后可一键 generate-plan（含因果 session 缓存） */
  trip?: TripDetail | null;
  fitnessProfile?: FitnessProfile | null;
  onOpenPreview?: () => void;
  onGenerated?: () => void;
  className?: string;
}

/** 展示最近一次决策引擎 generate-plan 的 Trail 段结果（session 缓存） */
export function HikingTrailPlanSummaryCard({
  tripId,
  trip,
  fitnessProfile,
  onOpenPreview,
  onGenerated,
  className,
}: HikingTrailPlanSummaryCardProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [generating, setGenerating] = useState(false);

  const log = useMemo(
    () => loadHikingGenerateLog(tripId),
    [tripId, refreshKey],
  );
  const plan = extractHardTrekTrailPlan(log ?? undefined);

  const handleGenerate = async () => {
    if (!trip) {
      toast.error('行程信息未加载');
      return;
    }
    try {
      setGenerating(true);
      await runHikingGeneratePlanWithCausalCache(trip, { fitnessProfile });
      setRefreshKey((k) => k + 1);
      onGenerated?.();
      toast.success('Trail 计划已生成，因果会话已缓存');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成 Trail 计划失败');
    } finally {
      setGenerating(false);
    }
  };

  if (!plan && !onOpenPreview && !trip) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mountain className="h-4 w-4" />
          徒步 Trail 计划
        </CardTitle>
        <CardDescription>决策引擎 generate-plan 输出（含因果 session 缓存）</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {plan ? (
          <HardTrekTrailPlanTimeline
            plan={plan}
            routeDirectionName={extractRouteDirectionName(log ?? undefined)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            尚未生成 Trail 段，可预演或点击下方按钮调用 generate-plan。
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {trip ? (
            <Button
              type="button"
              size="sm"
              disabled={generating}
              onClick={() => void handleGenerate()}
            >
              {generating ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              生成 Trail 计划
            </Button>
          ) : null}
          {onOpenPreview ? (
            <Button type="button" variant="outline" size="sm" onClick={onOpenPreview}>
              Trail 预演
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
