import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadHikingRouteDirection } from '@/lib/load-hiking-route-detail';
import { useLongestHike } from '@/hooks/useLongestHike';
import { useRouteDirectionReadiness } from '@/hooks/useHikingDemo';
import { computeTrailReadiness } from '@/lib/trail-readiness-score';
import { mapRouteReadinessToTrailResult } from '@/lib/map-route-readiness';
import type { RouteDirection } from '@/types/places-routes';
import type { DayPaceVerdict } from '@/types/hiking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { StartHikePlanButton } from './StartHikePlanButton';
import ScoreGauge from '@/components/readiness/ScoreGauge';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Mountain,
  Footprints,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  pickDaySkeleton,
  pickRiskMatrixRows,
  riskLevelZh,
} from '@/lib/hiking-trail-detail-ui';
import {
  isPlaceholderDaySkeleton,
  PLACEHOLDER_DAY_SKELETON_HINT,
} from '@/lib/day-skeleton-quality';
import { HikingFitnessCard } from './HikingFitnessCard';

type HikingTrailReadinessPanelProps = {
  routeDirectionId: number;
  /** P1 仅日志/归因，不改变评分 */
  plannedDate?: string;
  hikePlanId?: string;
};

export function HikingTrailReadinessPanel({
  routeDirectionId,
  plannedDate,
  hikePlanId,
}: HikingTrailReadinessPanelProps) {
  const navigate = useNavigate();
  const [trail, setTrail] = useState<RouteDirection | null>(null);
  const [loadingTrail, setLoadingTrail] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const { longestHikeForQuery } = useLongestHike();

  const {
    data: serverReadiness,
    isLoading: loadingServer,
    isError: serverError,
    refetch: refetchServer,
  } = useRouteDirectionReadiness(routeDirectionId, {
    longestHike: longestHikeForQuery,
    plannedDate,
    hikePlanId,
    enabled: !loadingTrail && Boolean(trail),
  });

  const loadTrail = useCallback(async () => {
    setLoadingTrail(true);
    try {
      const data = await loadHikingRouteDirection(routeDirectionId, {
        longestHike: longestHikeForQuery,
      });
      setTrail(data);
    } catch (e) {
      toast.error((e as Error).message || '加载路线失败');
    } finally {
      setLoadingTrail(false);
    }
  }, [routeDirectionId, longestHikeForQuery]);

  useEffect(() => {
    loadTrail();
  }, [loadTrail, reloadKey]);

  const handleFitnessUpdated = () => {
    setReloadKey((k) => k + 1);
    refetchServer();
  };

  const loading = loadingTrail || (loadingServer && !serverError);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!trail) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">路线不存在</CardContent>
      </Card>
    );
  }

  const hd = trail.hikingDetail;
  const localResult = computeTrailReadiness(trail, hd);
  const result =
    serverReadiness && !serverError
      ? mapRouteReadinessToTrailResult(serverReadiness, trail, hd)
      : localResult;

  const serverDayPace: DayPaceVerdict[] | undefined =
    serverReadiness?.dayPaceVerdict?.length
      ? serverReadiness.dayPaceVerdict
      : undefined;
  const detailDayPace = hd?.fitnessMatch?.dayPaceVerdict;
  const dayPaceList = serverDayPace?.length ? serverDayPace : detailDayPace;
  const daySkeleton = pickDaySkeleton(hd);
  const dayPaceLooksPlaceholder = isPlaceholderDaySkeleton(daySkeleton);

  const longestHikeDisplay =
    serverReadiness?.longestHikeUsed ?? hd?.fitnessMatch?.longestHike;

  const suggestedDaysDisplay =
    serverReadiness?.suggestedDays ??
    hd?.fitnessMatch?.suggestedDays ??
    hd?.summary?.suggestedDays ??
    (pickDaySkeleton(hd).length > 0 ? pickDaySkeleton(hd).length : undefined) ??
    (dayPaceList?.length ? dayPaceList.length : undefined) ??
    trail.constraints?.minDays;

  const statusBadge =
    result.status === 'go' ? (
      <Badge className="bg-green-600">可走</Badge>
    ) : result.status === 'caution' ? (
      <Badge className="bg-amber-500">注意</Badge>
    ) : (
      <Badge variant="destructive">不建议</Badge>
    );

  const scoreSourceLabel =
    serverReadiness && !serverError ? '服务端评估' : '本地估算';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(`/dashboard/trails/${routeDirectionId}`)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回路线详情
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Footprints className="h-7 w-7" />
            徒步 Readiness
          </h1>
          <p className="text-muted-foreground mt-1">{result.summaryZh}</p>
          <p className="text-xs text-muted-foreground mt-0.5">分数来源：{scoreSourceLabel}</p>
        </div>
        {statusBadge}
      </div>

      <HikingFitnessCard onUpdated={handleFitnessUpdated} className="border-dashed" />

      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-6 items-center">
          <ScoreGauge score={result.score} size="lg" />
          <div className="flex-1 space-y-2">
            <p className="font-medium">{result.headlineZh}</p>
            {serverReadiness?.fitnessVerdict && (
              <p className="text-sm text-muted-foreground">
                体能判定：{serverReadiness.fitnessVerdict}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <StartHikePlanButton routeDirectionId={trail.id} nameCN={trail.nameCN} size="sm" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/trails/${trail.id}`)}
              >
                路线详情
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {result.factorsFromServer && !serverError ? (
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            四象限来自 GET /readiness/route-directions/:id（factors）
          </p>
        ) : null}
        {Object.entries(result.factors).map(([key, f]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{f.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{f.score}</div>
              <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-teal-600" style={{ width: `${f.score}%` }} />
              </div>
              {'detailZh' in f && f.detailZh ? (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{f.detailZh}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {(result.blockers.length > 0 || result.cautions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Abu · 门控与注意项
            </CardTitle>
            {serverReadiness && !serverError && (
              <CardDescription>来自 GET /readiness/route-directions/:id</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {result.blockers.map((b) => (
              <div key={b} className="flex gap-2 text-sm text-red-800 bg-red-50 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {b}
              </div>
            ))}
            {result.cautions.map((c) => (
              <div key={c} className="flex gap-2 text-sm text-amber-900 bg-amber-50 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {c}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pickRiskMatrixRows(hd).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">风险矩阵</CardTitle>
            <CardDescription>来自 hikingDetail.riskMatrixRows（Admin override 已 merge）</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            {pickRiskMatrixRows(hd).map((row) => (
              <div key={row.id} className="p-2 border rounded-md">
                <div className="font-medium">{row.labelCN ?? row.label ?? row.id}</div>
                <div className="text-muted-foreground text-xs">
                  {row.value ?? riskLevelZh(row.level) ?? '—'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {dayPaceList && dayPaceList.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mountain className="h-4 w-4" />
              体能 · 日节奏
            </CardTitle>
            <CardDescription>
              {longestHikeDisplay != null && (
                <>基于最长连续徒步 {longestHikeDisplay} 天 · </>
              )}
              建议 {suggestedDaysDisplay ?? '—'} 天
              {serverDayPace?.length ? ' · 服务端日节奏' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dayPaceLooksPlaceholder ? (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                {PLACEHOLDER_DAY_SKELETON_HINT}
              </p>
            ) : null}
            {dayPaceList.map((v) => {
              const note =
                v.noteZh?.trim() ||
                (v.verdict ? String(v.verdict) : '') ||
                (v as { eligible?: boolean; ascentM?: number }).ascentM != null
                  ? `爬升 ${(v as { ascentM?: number }).ascentM} m · ${
                      (v as { eligible?: boolean }).eligible ? '节奏可接受' : '偏紧'
                    }`
                  : '';
              return (
                <div key={v.day} className="text-sm border rounded-lg p-3">
                  <span className="font-medium">Day {v.day}</span>
                  {note ? (
                    <span className="text-muted-foreground ml-2">{note}</span>
                  ) : (
                    <span className="text-muted-foreground ml-2">—</span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {hd?.weatherRisk && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              天气
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{hd.weatherRisk.headlineZh}</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
              {hd.weatherRisk.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {result.status === 'go' && (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          完成准备清单与离线包后，可从准备页开始徒步
        </div>
      )}
    </div>
  );
}
