import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { RouteDirection } from '@/types/places-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  MapPin,
  Mountain,
  TrendingUp,
  Clock,
  AlertTriangle,
  Droplet,
  Navigation,
  Calendar,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { MapboxTrailMap } from '@/components/map';
import { polylineToCoordinates, supplyPoiMarkerColor } from '@/lib/map-geo';
import { loadHikingRouteDirection } from '@/lib/load-hiking-route-detail';
import { HikingElevationChart } from '@/components/hiking/HikingElevationChart';
import { useLongestHike } from '@/hooks/useLongestHike';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { TrailOfflineDownloadButton } from '@/components/trails/TrailOfflineDownloadButton';
import { StartHikePlanButton } from '@/components/hiking/StartHikePlanButton';
import { StartTrekRecruitmentButton } from '@/components/hiking/StartTrekRecruitmentButton';
import { Label } from '@/components/ui/label';
import {
  hasMeaningfulHikingDetail,
  isHikingLogisticsSectionEmpty,
  pickRiskMatrixRows,
  pickDaySkeleton,
  pickHikingPermits,
  hikingPermitLabel,
  pickPolyline,
  pickSupplyPois,
  riskLevelZh,
  trailHasHikingTag,
} from '@/lib/hiking-trail-detail-ui';
import {
  isPlaceholderDaySkeleton,
  PLACEHOLDER_DAY_SKELETON_HINT,
} from '@/lib/day-skeleton-quality';
import type { HikingTrailDetail } from '@/types/hiking-trail-detail';
import {
  isTrailBookmarked,
  syncTrailBookmarkIdsFromCloud,
  toggleTrailBookmark,
} from '@/lib/trail-bookmarks';
import { ShareTrailDialog } from '@/components/trails/ShareTrailDialog';

export default function TrailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trail, setTrail] = useState<RouteDirection | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());
  const [bookmarked, setBookmarked] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const { longestHike, longestHikeForQuery, hasQueryOverride, omitsQueryForJwtProfile } =
    useLongestHike();

  const hd: HikingTrailDetail | undefined = trail?.hikingDetail;
  const hasApiHikingDetail = hasMeaningfulHikingDetail(hd);

  const daySkeleton = useMemo(() => pickDaySkeleton(hd), [hd]);
  const daySkeletonIsPlaceholder = useMemo(
    () => isPlaceholderDaySkeleton(daySkeleton),
    [daySkeleton]
  );
  const supplyPois = useMemo(() => pickSupplyPois(hd), [hd]);
  const elevationProfile = hd?.elevationProfile ?? [];
  const terrainSummary = hd?.terrainSummary;
  const fitnessMatch = hd?.fitnessMatch;
  const weatherRisk = hd?.weatherRisk;
  const riskMatrixRows = useMemo(() => pickRiskMatrixRows(hd), [hd]);

  const summary = hd?.summary;
  const totalDistanceKm = useMemo(() => {
    if (summary?.totalDistanceKm != null) return summary.totalDistanceKm;
    if (terrainSummary?.totalDistanceKm != null) return terrainSummary.totalDistanceKm;
    return daySkeleton.reduce((s, d) => s + d.distanceKm, 0);
  }, [summary, terrainSummary, daySkeleton]);

  const totalAscentM = useMemo(() => {
    if (summary?.totalAscentM != null) return summary.totalAscentM;
    if (terrainSummary?.cumulativeAscentM != null) return terrainSummary.cumulativeAscentM;
    return daySkeleton.reduce((s, d) => s + d.ascentM, 0);
  }, [summary, terrainSummary, daySkeleton]);

  const suggestedDays =
    summary?.suggestedDays ??
    (daySkeleton.length > 0 ? daySkeleton.length : trail?.constraints?.minDays);

  const hikingPermits = useMemo(() => pickHikingPermits(hd), [hd]);

  const hutPois = useMemo(
    () =>
      (hd?.shelters?.length
        ? hd.shelters
        : supplyPois.filter((p) => p.subCategory.toUpperCase().includes('HUT'))),
    [hd?.shelters, supplyPois]
  );
  const otherSupplyPois = useMemo(
    () => supplyPois.filter((p) => !p.subCategory.toUpperCase().includes('HUT')),
    [supplyPois]
  );

  const trailMapLine = useMemo(() => polylineToCoordinates(pickPolyline(hd)), [hd]);

  const trailMapMarkers = useMemo(
    () =>
      supplyPois.map((p) => ({
        id: p.id,
        lng: p.lng,
        lat: p.lat,
        label: p.nameCN,
        color: supplyPoiMarkerColor(p.subCategory),
      })),
    [supplyPois]
  );

  const hasTrailContent = hasApiHikingDetail;
  const logisticsSectionEmpty = hd ? isHikingLogisticsSectionEmpty(hd) : true;

  useEffect(() => {
    if (id) loadTrail();
  }, [id, longestHikeForQuery]);

  useEffect(() => {
    if (trail?.id == null) return;
    void syncTrailBookmarkIdsFromCloud().finally(() => {
      setBookmarked(isTrailBookmarked(trail.id));
    });
  }, [trail?.id]);

  const loadTrail = async () => {
    if (!id) return;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      setLoading(false);
      setTrail(null);
      return;
    }
    try {
      setLoading(true);
      const data = await loadHikingRouteDirection(numericId, { longestHike });
      setTrail(data);
    } catch (error: any) {
      toast.error('加载路线详情失败: ' + (error.message || '未知错误'));
      console.error('Failed to load trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSegment = (index: number) => {
    const newExpanded = new Set(expandedSegments);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSegments(newExpanded);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (!trail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">路线不存在</div>
      </div>
    );
  }

  const currentMonth = new Date().getMonth() + 1;
  const isBestMonth = trail.seasonality?.bestMonths?.includes(currentMonth);
  const monthBadge = isBestMonth ? '最佳季节' : '非最佳季节';

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        onClick={() => navigate('/dashboard/trails/explore')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回
      </Button>

      {/* Hero 区域 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-3xl">{trail.nameCN}</CardTitle>
                <Badge variant={isBestMonth ? 'default' : 'secondary'}>
                  {monthBadge}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-1 text-base">
                <MapPin className="h-4 w-4" />
                {trail.countryCode} · {trail.regions?.join(', ')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareDialogOpen(true)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                分享
              </Button>
              <Button
                variant={bookmarked ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (!trail) return;
                  void toggleTrailBookmark(trail.id)
                    .then((next) => {
                      setBookmarked(next);
                      toast.success(next ? '已收藏路线' : '已取消收藏');
                    })
                    .catch((e) => toast.error((e as Error).message || '收藏操作失败'));
                }}
              >
                <Bookmark
                  className={`h-4 w-4 mr-2 ${bookmarked ? 'fill-current' : ''}`}
                />
                {bookmarked ? '已收藏' : '收藏'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 核心指标一行 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {summary?.maxElevationM ?? trail.constraints?.soft?.maxElevationM
                  ? `${summary?.maxElevationM ?? trail.constraints?.soft?.maxElevationM}m`
                  : '未知'}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Mountain className="h-3 w-3" />
                最高点
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {totalAscentM > 0
                  ? `+${totalAscentM}m`
                  : trail.constraints?.soft?.maxDailyAscentM
                    ? `+${trail.constraints.soft.maxDailyAscentM}m`
                    : '未知'}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {totalAscentM > 0 ? '累计爬升' : '日爬升'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {suggestedDays != null ? `${suggestedDays} 天` : '待计算'}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                建议天数
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {totalDistanceKm > 0 ? `${totalDistanceKm.toFixed(0)} km` : '待计算'}
              </div>
              <div className="text-sm text-muted-foreground">距离</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {summary?.difficulty || trail.riskProfile?.level || '未知'}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                难度
              </div>
            </div>
          </div>

          {/* 主 CTA */}
          <div className="flex flex-wrap gap-2">
            <StartHikePlanButton
              className="flex-1 min-w-[140px]"
              routeDirectionId={trail.id}
              nameCN={trail.nameCN}
              routeDirectionName={trail.routeDirectionName}
            />
            <StartTrekRecruitmentButton
              className="flex-1 min-w-[140px]"
              routeDirectionId={trail.id}
              nameCN={trail.nameCN}
              routeDirectionName={trail.routeDirectionName}
              tags={trail.tags}
            />
            <Button
              className="flex-1 min-w-[140px]"
              size="lg"
              variant="outline"
              onClick={() => navigate(`/dashboard/readiness?trailId=${trail.id}`)}
            >
              Readiness 评估
            </Button>
            <TrailOfflineDownloadButton
              routeDirectionId={trail.id}
              className="h-11"
            />
          </div>

          <div className="mt-4">
            <MapboxTrailMap
              height={280}
              lineCoordinates={trailMapLine}
              markers={trailMapMarkers}
              mapStyle="outdoors"
              fitBounds={trailMapLine.length >= 2 || trailMapMarkers.length > 0}
              emptyMessage="暂无轨迹数据（需后端在 hikingDetail.geometry.polyline 中返回）"
            />
          </div>
        </CardContent>
      </Card>

      {hasApiHikingDetail && (
        <Alert className="mb-4 border-teal-200 bg-teal-50/50 dark:bg-teal-950/20">
          <Info className="h-4 w-4 text-teal-700" />
          <AlertTitle className="text-teal-900 dark:text-teal-100">徒步详情已加载</AlertTitle>
          <AlertDescription className="text-teal-800 dark:text-teal-200">
            数据来自{' '}
            <code className="text-xs">
              GET /route-directions/:id?longestHike={longestHike}
            </code>
            （仅 <code className="text-xs">hikingDetail</code>
            {hasQueryOverride
              ? ' · URL longestHike 覆盖'
              : omitsQueryForJwtProfile
                ? ' · 未传 query，后端用 JWT profile'
                : ` · longestHike=${longestHike}`}
            ）。
          </AlertDescription>
        </Alert>
      )}

      {hd?.offlinePackHints?.geojsonUrl && (
        <Alert className="mb-4 border-slate-200 bg-slate-50/80">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm">离线包 URL 预览</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground break-all">
            仅作参考；请在准备页通过{' '}
            <code className="text-[10px]">GET /hiking/route-directions/{trail.id}/offline-pack</code>{' '}
            获取 checksum 后下载。
            {hd.offlinePackHints.version ? ` 版本 ${hd.offlinePackHints.version}` : ''}
            {' · '}
            <a
              href={hd.offlinePackHints.geojsonUrl}
              className="text-primary underline"
              target="_blank"
              rel="noreferrer"
            >
              GeoJSON
            </a>
          </AlertDescription>
        </Alert>
      )}

      {!hasTrailContent && !loading && trailHasHikingTag(trail) && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>徒步详情待后端补齐</AlertTitle>
          <AlertDescription>
            请确认路线 tags 含「徒步」，且后端已在 GET 中 merge Admin 的 override 到{' '}
            <code className="text-xs">hikingDetail</code>（见{' '}
            <code className="text-xs">docs/api/hiking-client-integration.md</code>）。
            C 端不使用 <code className="text-xs">/demo/hiking/laugavegur</code>。
          </AlertDescription>
        </Alert>
      )}

      {/* 详细内容 Tabs */}
      <Tabs defaultValue="route" className="space-y-4">
        <TabsList>
          <TabsTrigger value="route">路线结构</TabsTrigger>
          <TabsTrigger value="safety">风险与约束</TabsTrigger>
          <TabsTrigger value="logistics">后勤与补给</TabsTrigger>
          <TabsTrigger value="alternatives">替代与修复</TabsTrigger>
        </TabsList>

        {/* Route Intelligence */}
        <TabsContent value="route">
          <Card>
            <CardHeader>
              <CardTitle>路线结构</CardTitle>
              <CardDescription>路线类型、分段、海拔剖面</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">路线类型</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {trail.constraints?.transportMode?.includes('hiking') ? '徒步' : '未知'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">按日分段</Label>
                {daySkeletonIsPlaceholder ? (
                  <Alert variant="default" className="border-amber-200 bg-amber-50/80">
                    <Info className="h-4 w-4 text-amber-700" />
                    <AlertTitle className="text-amber-900 text-sm">占位分段数据</AlertTitle>
                    <AlertDescription className="text-xs text-amber-800">
                      {PLACEHOLDER_DAY_SKELETON_HINT}
                    </AlertDescription>
                  </Alert>
                ) : null}
                {daySkeleton.length > 0 ? (
                  daySkeleton.map((day) => (
                    <Card key={day.day} className="border">
                      <CardHeader
                        className="cursor-pointer py-3"
                        onClick={() => toggleSegment(day.day)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-base">
                              Day {day.day} · {day.theme}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {day.distanceKm} km · 爬升 ↑{day.ascentM} m
                            </CardDescription>
                          </div>
                          {expandedSegments.has(day.day) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </CardHeader>
                      {expandedSegments.has(day.day) && (
                        <CardContent className="pt-0 text-sm text-muted-foreground">
                          {fitnessMatch?.dayPaceVerdict?.find((v) => v.day === day.day)
                            ?.noteZh ?? '—'}
                        </CardContent>
                      )}
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    暂无分段数据（需后端 hikingDetail.daySkeleton）
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">海拔剖面</Label>
                {elevationProfile.length > 0 ? (
                  <HikingElevationChart
                    className="mt-2"
                    points={elevationProfile}
                    dataSource={terrainSummary?.dataSource}
                  />
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    暂无海拔剖面（需后端 hikingDetail.elevationProfile）
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Safety & Constraints */}
        <TabsContent value="safety">
          <Card>
            <CardHeader>
              <CardTitle>风险与约束</CardTitle>
              <CardDescription>Abu 视角：硬门控与风险矩阵</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {weatherRisk && (
                <Alert variant="destructive" className="border-amber-300 bg-amber-50 text-amber-950">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{weatherRisk.headlineZh}</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-1 list-disc pl-4 text-sm">
                      {weatherRisk.rules.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label className="text-sm font-medium mb-2 block">风险矩阵</Label>
                {riskMatrixRows.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {riskMatrixRows.map((row) => (
                      <div key={row.id} className="p-3 border rounded-lg">
                        <div className="text-sm font-medium">
                          {row.labelCN ?? row.label ?? row.id}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {row.value ?? riskLevelZh(row.level) ?? '待补充'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">待补充</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">不可走条件（硬门控）</Label>
                {hd?.hardGates?.length ? (
                  <div className="space-y-2 text-sm">
                    {hd.hardGates.map((g) => (
                      <div key={g.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="font-medium text-red-900">{g.titleZh}</div>
                        <div className="text-red-700 mt-1">
                          {g.ruleZh}
                          {g.threshold ? ` (${g.threshold})` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">待补充</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">备案与救援信息</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>救援电话：{hd?.emergency?.rescuePhone ?? '待补充'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>登记点：{hd?.emergency?.registrationPointZh ?? '待补充'}</span>
                  </div>
                  {(hd?.emergency?.nearestExitPoints?.length
                    ? hd.emergency.nearestExitPoints
                    : [{ nameZh: '待补充' }]
                  ).map((ep, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Navigation className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {ep.nameZh}
                        {ep.distanceKm != null ? ` · ${ep.distanceKm} km` : ''}
                        {ep.noteZh ? ` — ${ep.noteZh}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logistics */}
        <TabsContent value="logistics">
          <Card>
            <CardHeader>
              <CardTitle>后勤与补给</CardTitle>
              <CardDescription>Dr.Dre 视角：到达、补给、时间窗口</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">起点到达方式</Label>
                <div className="space-y-2 text-sm">
                  {hd?.access?.byCar ? (
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">自驾</div>
                      <div className="text-muted-foreground mt-1">{hd.access.byCar}</div>
                    </div>
                  ) : hd?.access?.driving ? (
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">自驾</div>
                      <div className="text-muted-foreground mt-1">
                        停车点：{hd.access.driving.parkingNameZh}
                        {hd.access.driving.driveDurationMin != null
                          ? ` · 约 ${hd.access.driving.driveDurationMin} 分钟`
                          : ''}
                        {hd.access.driving.noteZh ? ` — ${hd.access.driving.noteZh}` : ''}
                      </div>
                    </div>
                  ) : !logisticsSectionEmpty ? (
                    <div className="p-3 border rounded-lg text-muted-foreground">自驾：待补充</div>
                  ) : null}
                  {hd?.access?.byBus ? (
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">公交/班车</div>
                      <div className="text-muted-foreground mt-1">{hd.access.byBus}</div>
                    </div>
                  ) : hd?.access?.transit ? (
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">公交/班车</div>
                      <div className="text-muted-foreground mt-1">{hd.access.transit.scheduleZh}</div>
                      {hd.access.transit.bookingUrl ? (
                        <a
                          href={hd.access.transit.bookingUrl}
                          className="text-xs text-primary mt-1 inline-block"
                          target="_blank"
                          rel="noreferrer"
                        >
                          预约链接
                        </a>
                      ) : null}
                    </div>
                  ) : !logisticsSectionEmpty ? (
                    <div className="p-3 border rounded-lg text-muted-foreground">公交/班车：待补充</div>
                  ) : null}
                  {logisticsSectionEmpty && (
                    <p className="text-sm text-muted-foreground">后勤与到达：待补充</p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">补给</Label>
                {supplyPois.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {otherSupplyPois.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-start gap-2 rounded-lg border p-3"
                      >
                        <Droplet
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: supplyPoiMarkerColor(p.subCategory) }}
                        />
                        <span>
                          <span className="font-medium">{p.nameCN}</span>
                          <span className="text-muted-foreground"> · {p.subCategory}</span>
                          {p.role ? (
                            <span className="block text-xs text-muted-foreground">{p.role}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">补给点：待补充</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">许可/预约</Label>
                {hikingPermits.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {hikingPermits.map((p) => (
                      <li key={p.id} className="rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{hikingPermitLabel(p)}</span>
                          {p.required !== false && (
                            <Badge variant="outline" className="text-xs">
                              必需
                            </Badge>
                          )}
                        </div>
                        {p.bookingUrl ? (
                          <a
                            href={p.bookingUrl}
                            className="text-xs text-primary mt-1 inline-flex items-center gap-1"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            预约
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">许可：待补充（hikingDetail.permits）</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">营地/山屋</Label>
                {hutPois.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {hutPois.map((p) => (
                      <li key={p.id} className="rounded-lg border p-3">
                        <div className="font-medium">{p.nameCN}</div>
                        <div className="text-muted-foreground mt-1">
                          {p.nameEN} · {p.subCategory}
                          {p.elevation_m != null ? ` · ${p.elevation_m} m` : ''}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">营地/避难所：待补充</p>
                )}
              </div>

              {trail.entryHubs && trail.entryHubs.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">入口枢纽</Label>
                  <p className="text-sm">{trail.entryHubs.join(' · ')}</p>
                </div>
              )}

              {hd?.supplies?.waterSources?.length ? (
                <div>
                  <Label className="text-sm font-medium mb-2 block">水源</Label>
                  <ul className="text-sm space-y-1">
                    {hd.supplies.waterSources.map((w, i) => (
                      <li key={i}>
                        {w.nameZh}
                        {w.seasonal ? ` (${w.seasonal})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <Label className="text-sm font-medium mb-2 block">时间窗口</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      建议出发：
                      {hd?.timeWindows?.suggestedDepartTime ?? '待计算'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      回程末班车：
                      {hd?.timeWindows?.lastReturnBusTime ?? '待补充'}
                    </span>
                  </div>
                  {hd?.timeWindows?.daylightHoursNoteZh ? (
                    <p className="text-muted-foreground">{hd.timeWindows.daylightHoursNoteZh}</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alternatives & Repair */}
        <TabsContent value="alternatives">
          <Card>
            <CardHeader>
              <CardTitle>替代与修复</CardTitle>
              <CardDescription>Neptune 视角：Plan B 与最小改动修复</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Plan B：短线替代</Label>
                {hd?.alternatives?.planBRoutes?.length ? (
                  <div className="space-y-2">
                    {hd.alternatives.planBRoutes.map((r) => (
                      <Card key={r.id} className="border">
                        <CardContent className="p-3">
                          <div className="font-medium text-sm">{r.titleZh}</div>
                          <div className="text-xs text-muted-foreground mt-1">{r.summaryZh}</div>
                          {r.routeDirectionId ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="mt-2 p-0 h-auto"
                              onClick={() =>
                                navigate(`/dashboard/trails/${r.routeDirectionId}`)
                              }
                            >
                              查看详情 <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">待补充</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">退出点/折返点</Label>
                {hd?.alternatives?.exitPoints?.length ? (
                  <div className="space-y-2 text-sm">
                    {hd.alternatives.exitPoints.map((ep) => (
                      <div key={ep.id} className="p-3 border rounded-lg">
                        <div className="font-medium">{ep.nameZh}</div>
                        <div className="text-muted-foreground mt-1">
                          里程约 {ep.distanceAlongTrailKm} km
                          {ep.noteZh ? ` — ${ep.noteZh}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">待补充</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">最小改动修复建议</Label>
                {hd?.alternatives?.repairHints?.length ? (
                  <div className="space-y-2 text-sm">
                    {hd.alternatives.repairHints.map((h) => (
                      <div
                        key={`${h.scenario}-${h.titleZh}`}
                        className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="font-medium text-blue-900">{h.titleZh}</div>
                        <div className="text-blue-700 mt-1">{h.actionZh}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">待补充</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {trail && (
        <ShareTrailDialog
          routeDirectionId={trail.id}
          trailName={trail.nameCN}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}
    </div>
  );
}
