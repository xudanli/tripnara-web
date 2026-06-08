import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Map,
  Navigation,
  AlertTriangle,
  Clock,
  Sunset,
  Wifi,
  WifiOff,
  Mic,
  MapPin,
  RotateCcw,
  Pause,
} from 'lucide-react';
import { toast } from 'sonner';
import type { OnTrailState, TrailEvent } from '@/types/trail';
import { MapboxTrailMap } from '@/components/map';
import { trailOfflineStore } from '@/services/trail-offline-store';
import type { TrailOfflinePackRecord } from '@/types/trail-offline';
import { hikePlanRepository, isUuidLike } from '@/services/hike-plan-repository';
import { useHikePlan } from '@/hooks/useHikePlan';
import { useGpsTrackRecorder } from '@/hooks/useGpsTrackRecorder';
import { GpsRecordingBar } from '@/components/hiking/GpsRecordingBar';
import { Spinner } from '@/components/ui/spinner';
import {
  formatKm,
  formatPaceKmh,
  normalizeOnTrailState,
  userRecordedTrailEvents,
} from '@/lib/on-trail-state';
import {
  gpsToElevationPoints,
  hikingElevationToPoints,
  pickOffRouteAlert,
  trailEventsToElevationEvents,
} from '@/lib/on-trail-elevation';
import { ElevationProfile } from '@/components/trails/ElevationProfile';

const emptyTrailState = (id: string): OnTrailState =>
  normalizeOnTrailState({
    hikePlanId: id,
    distanceCompletedKm: 0,
    elevationGainedM: 0,
    timeElapsedMin: 0,
    events: [],
  });

export default function OnTrailLivePage() {
  const { hikePlanId: paramId } = useParams<{ hikePlanId: string }>();
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [offlinePack, setOfflinePack] = useState<TrailOfflinePackRecord | null>(null);
  const [trailState, setTrailState] = useState<OnTrailState | null>(null);
  const [completing, setCompleting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const planId = paramId && isUuidLike(paramId) ? paramId : undefined;
  const { plan, loading: planLoading } = useHikePlan(planId);
  const gpsEnabled = plan?.status === 'in_progress';

  const refreshLiveState = useCallback(() => {
    if (!planId) return;
    hikePlanRepository
      .getLiveState(planId)
      .then((live) => setTrailState(normalizeOnTrailState(live)))
      .catch(() => setTrailState(emptyTrailState(planId)));
  }, [planId]);

  const gps = useGpsTrackRecorder(planId, gpsEnabled, {
    onTrackFlushed: refreshLiveState,
  });

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!plan?.routeDirectionId) return;
    trailOfflineStore.get(plan.routeDirectionId).then(setOfflinePack);
  }, [plan?.routeDirectionId]);

  useEffect(() => {
    refreshLiveState();
  }, [refreshLiveState]);

  /** GPS 上传后服务端会刷新偏航 events */
  useEffect(() => {
    if (!planId || !gpsEnabled) return;
    const timer = window.setInterval(() => refreshLiveState(), 20_000);
    return () => window.clearInterval(timer);
  }, [planId, gpsEnabled, refreshLiveState]);

  useEffect(() => {
    if (!planId || gps.summary.pointCount === 0) return;
    setTrailState((prev) => {
      const base = prev ?? emptyTrailState(planId);
      return {
        ...base,
        distanceCompletedKm: gps.summary.distanceKm,
        timeElapsedMin: gps.summary.durationMin,
        elevationGainedM: gps.summary.elevationGainM ?? base.elevationGainedM,
      };
    });
    void hikePlanRepository.updateLiveState(planId, {
      distanceCompletedKm: gps.summary.distanceKm,
      timeElapsedMin: gps.summary.durationMin,
      elevationGainedM: gps.summary.elevationGainM,
      isOffline,
    });
  }, [gps.summary, planId, isOffline]);

  const handleRecordEvent = async (type: TrailEvent['type']) => {
    if (!planId) return;
    const newEvent: TrailEvent = {
      id: `event-${Date.now()}`,
      type,
      timestamp: new Date().toISOString(),
      location: trailState?.currentLocation,
      segmentId: trailState?.currentSegmentId,
    };
    try {
      const live = await hikePlanRepository.appendEvent(planId, newEvent);
      setTrailState((prev) => ({
        ...(prev ?? emptyTrailState(planId)),
        events: live.events ?? [],
      }));
      toast.success('事件已记录');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleCompleteHike = async () => {
    if (!planId) return;
    setCompleting(true);
    try {
      gps.stopRecording();
      await hikePlanRepository.complete(planId);
      navigate(`/dashboard/trails/review/${planId}`);
    } catch (e) {
      toast.error((e as Error).message || '结束徒步失败');
    } finally {
      setCompleting(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const offRouteAlert = useMemo(
    () =>
      pickOffRouteAlert({
        events: trailState?.events,
        risks: trailState?.activeRisks,
      }),
    [trailState?.events, trailState?.activeRisks]
  );

  const elevationLive = useMemo(() => {
    const fromGps = gpsToElevationPoints(gps.points);
    if (fromGps.length > 0) return fromGps;
    return hikingElevationToPoints(offlinePack?.elevationProfile);
  }, [gps.points, offlinePack?.elevationProfile]);

  const elevationEvents = useMemo(() => {
    if (!trailState) return [];
    return trailEventsToElevationEvents(
      userRecordedTrailEvents(trailState.events),
      gps.points,
      trailState.distanceCompletedKm
    );
  }, [trailState, gps.points]);

  const offlineBasemap = useMemo(() => {
    if (!offlinePack?.tileCache?.tileCount) return undefined;
    return {
      packKey: offlinePack.tileCache.packKey,
      manifest: offlinePack.tileManifest,
      format: offlinePack.tileCache.format,
    };
  }, [offlinePack]);

  const elevationStats = useMemo(() => {
    if (!elevationLive.length) {
      return {
        totalKm: offlinePack?.summary?.totalDistanceKm ?? 0,
        maxM: offlinePack?.summary?.maxElevationM ?? 1,
      };
    }
    const maxM = Math.max(...elevationLive.map((p) => p.elevationM), 1);
    const totalKm =
      elevationLive[elevationLive.length - 1]?.distanceKm ??
      offlinePack?.summary?.totalDistanceKm ??
      0;
    return { totalKm: Math.max(totalKm, 0.1), maxM };
  }, [elevationLive, offlinePack?.summary]);

  if (!planId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">请从准备页「开始徒步」进入（需有效的 HikePlan ID）</p>
        <Button onClick={() => navigate('/dashboard/trails/my-hikes')}>我的徒步</Button>
      </div>
    );
  }

  if (planLoading || !trailState) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <div className="flex items-center gap-2">
          {plan?.nameCN ? (
            <span className="text-sm font-medium hidden sm:inline">{plan.nameCN}</span>
          ) : null}
          {isOffline ? (
            <Badge variant="outline" className="bg-yellow-50">
              <WifiOff className="h-3 w-3 mr-1" />
              离线
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-50">
              <Wifi className="h-3 w-3 mr-1" />
              在线
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={handleCompleteHike} disabled={completing}>
            结束徒步
          </Button>
        </div>
      </div>

      <GpsRecordingBar
        className="mb-4"
        recording={gps.recording}
        summary={gps.summary}
        lastError={gps.lastError}
        onStart={gps.startRecording}
        onStop={gps.stopRecording}
        onSync={() => planId && hikePlanRepository.syncPendingGps(planId)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧：地图主视图 */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="h-[500px]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>地图视图</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Navigation className="h-4 w-4 mr-1" />
                    回到路线
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-80px)] relative">
              {offlinePack && offlinePack.lineCoordinates.length > 0 ? (
                <MapboxTrailMap
                  height="100%"
                  lineCoordinates={offlinePack.lineCoordinates}
                  recordedLineCoordinates={gps.lineCoordinates}
                  currentPosition={
                    gps.points.length > 0
                      ? {
                          lng: gps.points[gps.points.length - 1].lng,
                          lat: gps.points[gps.points.length - 1].lat,
                        }
                      : undefined
                  }
                  markers={offlinePack.markers}
                  mapStyle="outdoors"
                  fitBounds={!gps.recording}
                  emptyMessage="无轨迹数据"
                  offlineBasemap={offlineBasemap}
                  useOfflineBasemap={Boolean(offlineBasemap)}
                />
              ) : (
                <div className="h-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                  <div className="text-center px-4">
                    <Map className="h-12 w-12 mx-auto mb-2" />
                    <p>暂无计划路线</p>
                    <p className="text-xs mt-1">可在准备页下载离线包；GPS 蓝线为实走轨迹</p>
                    {gps.lineCoordinates.length >= 2 ? (
                      <div className="mt-4 h-48 w-full">
                        <MapboxTrailMap
                          height={192}
                          recordedLineCoordinates={gps.lineCoordinates}
                          fitBounds
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
              {offRouteAlert ? (
                <div className="absolute top-4 left-4 right-4 z-10">
                  <Card className="bg-yellow-50 border-yellow-200 shadow-md">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-yellow-900">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">偏航提示</span>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">
                        {offRouteAlert.message}
                        {offRouteAlert.distanceM != null
                          ? `（约 ${Math.round(offRouteAlert.distanceM)} m）`
                          : ''}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* 状态条 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">进度状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-2xl font-bold">
                    {formatKm(trailState.distanceCompletedKm)}
                  </div>
                  <div className="text-sm text-muted-foreground">已完成距离</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    +{trailState.elevationGainedM} m
                  </div>
                  <div className="text-sm text-muted-foreground">累计爬升</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatTime(trailState.timeElapsedMin)}
                  </div>
                  <div className="text-sm text-muted-foreground">已用时间</div>
                </div>
                <div>
                  <div className="text-2xl font-bold flex items-center gap-1">
                    <Sunset className="h-5 w-5 text-orange-500" />
                    {formatTime(trailState.sunsetCountdownMin || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">日落倒计时</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>预计到达终点时间</span>
                  <span className="font-medium">
                    {trailState.estimatedArrivalTime
                      ? new Date(trailState.estimatedArrivalTime).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '计算中...'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <ElevationProfile
            elevationPoints={elevationLive}
            events={elevationEvents}
            totalDistanceKm={elevationStats.totalKm}
            maxElevationM={elevationStats.maxM}
          />
        </div>

        {/* 右侧：风险、节奏、修复卡片 */}
        <div className="space-y-4">
          {/* 风险卡（Abu） */}
          <Card className="border-red-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <CardTitle className="text-base">风险监控</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {trailState.activeRisks && trailState.activeRisks.length > 0 ? (
                trailState.activeRisks.map((risk) => (
                  <div
                    key={risk.id}
                    className={`p-3 rounded-lg border ${
                      risk.severity === 'critical'
                        ? 'bg-red-50 border-red-200'
                        : risk.severity === 'high'
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{risk.message}</span>
                      <Badge
                        variant={
                          risk.severity === 'critical'
                            ? 'destructive'
                            : risk.severity === 'high'
                            ? 'default'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {risk.severity}
                      </Badge>
                    </div>
                    {risk.threshold && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {risk.threshold.metric}: {risk.threshold.current} / {risk.threshold.value}
                      </div>
                    )}
                    {risk.suggestedAction && risk.suggestedAction !== 'continue' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          toast.info(`建议：${risk.suggestedAction}`);
                        }}
                      >
                        建议{risk.suggestedAction === 'turnaround' ? '撤退' : '行动'}
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  暂无风险
                </div>
              )}
            </CardContent>
          </Card>

          {/* 节奏卡（Dr.Dre） */}
          <Card className="border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-base">节奏控制</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {trailState.paceStatus &&
              (trailState.paceStatus.plannedPace > 0 ||
                trailState.paceStatus.currentPace > 0) ? (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>当前配速</span>
                      <span className="font-medium">
                        {formatPaceKmh(trailState.paceStatus.currentPace)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>计划配速</span>
                      <span className="font-medium">
                        {formatPaceKmh(trailState.paceStatus.plannedPace)}
                      </span>
                    </div>
                    {trailState.paceStatus.plannedPace > 0 ? (
                      <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full ${
                            trailState.paceStatus.currentPace >=
                            trailState.paceStatus.plannedPace
                              ? 'bg-green-500'
                              : 'bg-yellow-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (trailState.paceStatus.currentPace /
                                trailState.paceStatus.plannedPace) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 mb-1">
                      缓冲剩余
                    </div>
                    <div className="text-lg font-bold text-blue-700">
                      {formatTime(trailState.paceStatus.bufferRemainingMin)}
                    </div>
                  </div>
                  {trailState.paceStatus.latestTurnaroundTime && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm font-medium text-red-900 mb-1">
                        最晚折返时间
                      </div>
                      <div className="text-lg font-bold text-red-700">
                        {trailState.paceStatus.latestTurnaroundTime}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  暂无节奏数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 修复卡（Neptune） */}
          <Card className="border-purple-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-base">修复建议</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {trailState.repairSuggestions && trailState.repairSuggestions.length > 0 ? (
                trailState.repairSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      toast.info(`应用修复：${suggestion.title}`);
                    }}
                  >
                    <div className="font-medium text-sm mb-1">{suggestion.title}</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {suggestion.description}
                    </div>
                    {suggestion.changes && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {suggestion.changes.distanceChangeKm && (
                          <Badge variant="outline">
                            距离: {suggestion.changes.distanceChangeKm > 0 ? '+' : ''}
                            {suggestion.changes.distanceChangeKm} km
                          </Badge>
                        )}
                        {suggestion.changes.timeChangeMin && (
                          <Badge variant="outline">
                            时间: {suggestion.changes.timeChangeMin > 0 ? '+' : ''}
                            {suggestion.changes.timeChangeMin} min
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  暂无修复建议
                </div>
              )}
            </CardContent>
          </Card>

          {/* 事件记录 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">事件记录</CardTitle>
              <CardDescription className="text-xs">
                给复盘喂证据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecordEvent('arrival')}
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  到达
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecordEvent('rest')}
                >
                  <Pause className="h-3 w-3 mr-1" />
                  休息
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecordEvent('risk')}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  风险
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecordEvent('turnaround')}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  折返
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setIsRecording(!isRecording);
                  toast.info(isRecording ? '停止录音' : '开始录音');
                }}
              >
                <Mic className={`h-3 w-3 mr-1 ${isRecording ? 'text-red-500' : ''}`} />
                {isRecording ? '停止录音' : '语音备注'}
              </Button>
              {trailState.events.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  已记录 {trailState.events.length} 个事件
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

