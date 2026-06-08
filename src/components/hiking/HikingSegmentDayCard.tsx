import { useNavigate } from 'react-router-dom';
import { Mountain, Compass, Backpack, Play, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HikingSegment } from '@/types/hiking-embedded';
import type { HikePlanRecord } from '@/types/hike-plan';
import type { HardTrekTrailSegment } from '@/types/hiking';
import type { HikingDayCard } from '@/types/hiking-trail-card';

type Props = {
  dayLabel: string;
  tripId?: string;
  /** GET /trips/:id — tripDay.hikingDayCard（优先） */
  hikingDayCard?: HikingDayCard;
  segment?: HikingSegment;
  plan?: HikePlanRecord;
  /** 旧回退：决策引擎 hardTrekTrailPlan 按日段 */
  trailDay?: HardTrekTrailSegment;
  trailPlanSummary?: { suggestedDays: number; totalDistanceKm: number; maxDailyAscentM: number };
};

export function HikingSegmentDayCard({
  dayLabel,
  tripId,
  hikingDayCard,
  segment,
  plan,
  trailDay,
  trailPlanSummary,
}: Props) {
  const navigate = useNavigate();
  const displayDay = hikingDayCard ?? trailDay;

  const hikePlanId = hikingDayCard?.hikePlanId ?? segment?.hikePlanId ?? plan?.id;
  const rd = hikingDayCard?.routeDirectionId ?? segment?.routeDirectionId ?? plan?.routeDirectionId;

  const blocked =
    segment?.readinessSnapshot?.level &&
    ['not_ready', 'blocked', 'no-go'].includes(segment.readinessSnapshot.level.toLowerCase());

  const planned =
    segment?.startDate?.split('T')[0] ?? plan?.plannedDate?.split('T')[0] ?? '';
  const readinessHref =
    rd && hikePlanId
      ? `/dashboard/readiness?trailId=${rd}&tripId=${plan?.tripId ?? tripId ?? ''}&hikePlanId=${hikePlanId}${planned ? `&plannedDate=${planned}` : ''}`
      : rd
        ? `/dashboard/readiness?trailId=${rd}${planned ? `&plannedDate=${planned}` : ''}`
        : undefined;

  const theme = hikingDayCard?.theme ?? trailDay?.theme;
  const routeBadge =
    hikingDayCard?.trailName ??
    hikingDayCard?.label ??
    trailDay?.trailName ??
    segment?.label ??
    plan?.routeDirectionName ??
    (rd ? `路线 ${rd}` : '—');

  const statsLine = hikingDayCard
    ? `${hikingDayCard.distanceKm} km · 爬升 ↑${hikingDayCard.ascentM} m${hikingDayCard.noteZh ? ` · ${hikingDayCard.noteZh}` : ''}`
    : trailDay
      ? `${trailDay.distanceKm} km · 爬升 ↑${trailDay.ascentM} m${trailDay.noteZh ? ` · ${trailDay.noteZh}` : ''}`
      : null;

  return (
    <Card className="border-l-4 border-l-emerald-500 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Mountain className="h-4 w-4 text-emerald-700" />
          <CardTitle className="text-base">
            徒步 · {dayLabel}
            {theme ? (
              <span className="font-normal text-muted-foreground"> · {theme}</span>
            ) : null}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {routeBadge}
          </Badge>
          {displayDay && displayDay.suitable === false ? (
            <Badge variant="destructive" className="text-xs">
              日爬升超标
            </Badge>
          ) : null}
          {plan?.status === 'in_progress' ? (
            <Badge className="bg-blue-600 text-xs">行中</Badge>
          ) : null}
        </div>
        {statsLine ? (
          <p className="text-xs text-muted-foreground mt-1">{statsLine}</p>
        ) : trailPlanSummary ? (
          <p className="text-xs text-muted-foreground mt-1">
            全程 {trailPlanSummary.totalDistanceKm} km · 建议 {trailPlanSummary.suggestedDays} 日徒步
          </p>
        ) : !hikingDayCard && !trailDay && !trailPlanSummary ? (
          <p className="text-xs text-amber-800/90 mt-1">
            尚未生成按日 Trail 段；请刷新行程或关联徒步计划
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        {readinessHref ? (
          <Button type="button" size="sm" variant="outline" onClick={() => navigate(readinessHref)}>
            <Compass className="h-3.5 w-3.5 mr-1" />
            准备度评估
          </Button>
        ) : null}
        {hikePlanId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigate(`/dashboard/trails/prep/${hikePlanId}`)}
          >
            <Backpack className="h-3.5 w-3.5 mr-1" />
            行前准备
          </Button>
        ) : null}
        {hikePlanId && plan?.status === 'in_progress' ? (
          <Button
            type="button"
            size="sm"
            onClick={() => navigate(`/dashboard/trails/on-trail/${hikePlanId}`)}
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            继续行中
          </Button>
        ) : hikePlanId && !blocked ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={plan?.status !== 'ready' && plan?.status !== 'planning'}
            onClick={() => navigate(`/dashboard/trails/prep/${hikePlanId}`)}
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            开始徒步
          </Button>
        ) : null}
        {hikePlanId && plan?.status === 'completed' ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/dashboard/trails/review/${hikePlanId}`)}
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            复盘
          </Button>
        ) : null}
        {blocked ? (
          <span className="text-xs text-amber-800 w-full">暂不可走（Readiness）</span>
        ) : null}
      </CardContent>
    </Card>
  );
}
