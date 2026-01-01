import { useState } from 'react';
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
import type {
  OnTrailState,
  TrailEvent,
} from '@/types/trail';

export default function OnTrailLivePage() {
  const { hikePlanId } = useParams<{ hikePlanId: string }>();
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // 模拟实时状态
  const [trailState, setTrailState] = useState<OnTrailState>({
    hikePlanId: hikePlanId || '',
    currentLocation: { latitude: -45.0, longitude: 168.0 },
    currentElevation: 1200,
    currentSegmentId: 'segment-2',
    distanceCompletedKm: 8.5,
    elevationGainedM: 450,
    timeElapsedMin: 180,
    estimatedArrivalTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    sunsetCountdownMin: 120,
    isOffline: false,
    activeRisks: [
      {
        id: 'risk-1',
        type: 'wind',
        severity: 'medium',
        message: '风速接近阈值',
        threshold: {
          metric: '风速',
          value: 12,
          current: 10.5,
        },
        suggestedAction: 'continue',
      },
    ],
    paceStatus: {
      currentPace: 3.2,
      plannedPace: 3.5,
      bufferRemainingMin: 45,
      latestTurnaroundTime: '16:30',
    },
    repairSuggestions: [
      {
        id: 'repair-1',
        title: '走到撤退点下山',
        description: '如果感觉疲劳，可以在 3km 后的撤退点提前下山',
        type: 'exit_point',
        changes: {
          distanceChangeKm: -5,
          timeChangeMin: -90,
        },
        targetPoint: {
          name: '撤退点 A',
          coordinates: { latitude: -45.1, longitude: 168.1 },
          distanceFromStartKm: 11.5,
        },
      },
    ],
    events: [],
  });

  const handleRecordEvent = (type: TrailEvent['type']) => {
    const newEvent: TrailEvent = {
      id: `event-${Date.now()}`,
      type,
      timestamp: new Date().toISOString(),
      location: trailState.currentLocation,
      segmentId: trailState.currentSegmentId,
    };
    setTrailState((prev) => ({
      ...prev,
      events: [...prev.events, newEvent],
    }));
    toast.success('事件已记录');
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-7xl">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <div className="flex items-center gap-2">
          {isOffline ? (
            <Badge variant="outline" className="bg-yellow-50">
              <WifiOff className="h-3 w-3 mr-1" />
              离线模式
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-50">
              <Wifi className="h-3 w-3 mr-1" />
              在线
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOffline(!isOffline)}
          >
            {isOffline ? '切换到在线' : '切换到离线'}
          </Button>
        </div>
      </div>

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
              <div className="h-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Map className="h-12 w-12 mx-auto mb-2" />
                  <p>离线地图视图</p>
                  <p className="text-xs mt-1">
                    当前点、路线线条、下一关键节点
                  </p>
                </div>
              </div>
              {/* 偏航提示 */}
              <div className="absolute top-4 left-4 right-4">
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-yellow-900">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">偏航提示</span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      您已偏离路线 50m，建议回到路线
                    </p>
                  </CardContent>
                </Card>
              </div>
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
                    {trailState.distanceCompletedKm.toFixed(1)} km
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
              {trailState.paceStatus && (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>当前配速</span>
                      <span className="font-medium">
                        {trailState.paceStatus.currentPace.toFixed(1)} km/h
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>计划配速</span>
                      <span className="font-medium">
                        {trailState.paceStatus.plannedPace.toFixed(1)} km/h
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full ${
                          trailState.paceStatus.currentPace >=
                          trailState.paceStatus.plannedPace
                            ? 'bg-green-500'
                            : 'bg-yellow-500'
                        }`}
                        style={{
                          width: `${
                            (trailState.paceStatus.currentPace /
                              trailState.paceStatus.plannedPace) *
                            100
                          }%`,
                        }}
                      />
                    </div>
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

