import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { itineraryOptimizationApi } from '@/api/itinerary-optimization';
import { placesApi } from '@/api/places';
import type { Place as TripPlace } from '@/types/trip';
import type {
  OptimizeRouteRequest,
  OptimizeRouteResponse,
  OptimizeRouteConfig,
} from '@/types/itinerary-optimization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Zap,
  TrendingUp,
  Baby,
  UserCog,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  PACING_FACTOR,
  DEFAULT_TIMES,
  PLACE_RECOMMENDATIONS,
  TIME_FORMAT,
  INTENSITY_LABELS,
  PACING_FACTOR_LABELS,
} from '@/constants/itinerary-optimization';

export default function TripOptimizePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizedResult, setOptimizedResult] = useState<OptimizeRouteResponse | null>(null);
  const [humanizedDescription, setHumanizedDescription] = useState<string | null>(null);
  const [humanizing, setHumanizing] = useState(false);

  // 地点数据
  const [places, setPlaces] = useState<TripPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placesError, setPlacesError] = useState<string | null>(null);

  // 地点选择
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<number[]>([]);

  // 配置表单
  const today = format(new Date(), 'yyyy-MM-dd');
  const defaultStartTime = `${String(DEFAULT_TIMES.START_HOUR).padStart(2, '0')}:${String(DEFAULT_TIMES.START_MINUTE).padStart(2, '0')}`;
  const defaultEndTime = `${String(DEFAULT_TIMES.END_HOUR).padStart(2, '0')}:${String(DEFAULT_TIMES.END_MINUTE).padStart(2, '0')}`;
  
  const [config, setConfig] = useState<OptimizeRouteConfig>({
    date: today,
    startTime: `${today}T${defaultStartTime}:${TIME_FORMAT.ISO_SUFFIX}`,
    endTime: `${today}T${defaultEndTime}:${TIME_FORMAT.ISO_SUFFIX}`,
    pacingFactor: PACING_FACTOR.DEFAULT,
    hasChildren: false,
    hasElderly: false,
    lunchWindow: {
      start: DEFAULT_TIMES.LUNCH_START,
      end: DEFAULT_TIMES.LUNCH_END,
    },
    dinnerWindow: {
      start: DEFAULT_TIMES.DINNER_START,
      end: DEFAULT_TIMES.DINNER_END,
    },
    useVRPTW: false,
  });

  // 加载地点列表
  useEffect(() => {
    const loadPlaces = async () => {
      try {
        setPlacesLoading(true);
        setPlacesError(null);
        const params: any = {
          limit: PLACE_RECOMMENDATIONS.DEFAULT_LIMIT,
        };
        
        // 如果有tripId，使用tripId获取推荐地点
        if (tripId) {
          params.tripId = tripId;
        }
        
        const data = await placesApi.getRecommendations(params);
        setPlaces(data);
      } catch (err: any) {
        setPlacesError(err.message || '加载地点列表失败');
        console.error('Failed to load places:', err);
      } finally {
        setPlacesLoading(false);
      }
    };

    loadPlaces();
  }, [tripId]);

  const handlePlaceToggle = (placeId: number) => {
    setSelectedPlaceIds((prev) =>
      prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]
    );
  };

  const handleOptimize = async () => {
    if (selectedPlaceIds.length === 0) {
      setError('请至少选择一个地点');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setOptimizedResult(null);
      setHumanizedDescription(null);

      // 确保时间格式正确（ISO 8601）
      const dateStr = config.date;
      let startDateTime = config.startTime;
      let endDateTime = config.endTime;

      // 如果时间格式不完整，补充完整
      if (!startDateTime.includes('T') || !startDateTime.endsWith('Z')) {
        const timePart = startDateTime.includes('T')
          ? startDateTime.split('T')[1]?.slice(0, 5) || defaultStartTime
          : defaultStartTime;
        startDateTime = `${dateStr}T${timePart}:${TIME_FORMAT.ISO_SUFFIX}`;
      }

      if (!endDateTime.includes('T') || !endDateTime.endsWith('Z')) {
        const timePart = endDateTime.includes('T')
          ? endDateTime.split('T')[1]?.slice(0, 5) || defaultEndTime
          : defaultEndTime;
        endDateTime = `${dateStr}T${timePart}:${TIME_FORMAT.ISO_SUFFIX}`;
      }

      const request: OptimizeRouteRequest = {
        placeIds: selectedPlaceIds,
        config: {
          ...config,
          date: dateStr,
          startTime: startDateTime,
          endTime: endDateTime,
        },
      };

      const result = await itineraryOptimizationApi.optimize(request);
      setOptimizedResult(result);
    } catch (err: any) {
      setError(err.message || '优化失败，请稍后重试');
      console.error('Optimization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHumanize = async () => {
    if (!optimizedResult) return;

    try {
      setHumanizing(true);
      const result = await itineraryOptimizationApi.humanizeResult({
        data: optimizedResult,
        dataType: 'itinerary_optimization',
      });
      setHumanizedDescription(result.description);
    } catch (err: any) {
      console.error('Humanize error:', err);
      // 人性化失败不影响主流程，只记录错误
    } finally {
      setHumanizing(false);
    }
  };

  const formatTime = (isoTime: string) => {
    try {
      return format(parseISO(isoTime), TIME_FORMAT.DISPLAY_FORMAT, { locale: zhCN });
    } catch {
      return isoTime;
    }
  };


  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold">行程路线优化</h1>
            <p className="text-muted-foreground mt-1">
              使用节奏感算法优化您的行程安排，找到最优路线
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：配置面板 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 地点选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                选择地点
              </CardTitle>
              <CardDescription>选择需要优化的地点（至少选择一个）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {placesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="w-6 h-6" />
                </div>
              ) : placesError ? (
                <div className="text-sm text-red-600 py-4">{placesError}</div>
              ) : places.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  暂无可用地点
                </div>
              ) : (
                <>
                  {places.map((place) => (
                    <div key={place.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`place-${place.id}`}
                        checked={selectedPlaceIds.includes(place.id)}
                        onCheckedChange={() => handlePlaceToggle(place.id)}
                      />
                      <Label
                        htmlFor={`place-${place.id}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        {place.nameCN || place.nameEN || `地点 ${place.id}`}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {place.category}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                  {selectedPlaceIds.length > 0 && (
                    <div className="pt-2 border-t text-sm text-muted-foreground">
                      已选择 {selectedPlaceIds.length} 个地点
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 优化配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                优化配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 日期 */}
              <div className="space-y-2">
                <Label htmlFor="date">行程日期</Label>
                <Input
                  id="date"
                  type="date"
                  value={config.date}
                  onChange={(e) => setConfig({ ...config, date: e.target.value })}
                />
              </div>

              {/* 开始时间 */}
              <div className="space-y-2">
                <Label htmlFor="startTime">开始时间</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={
                    config.startTime.includes('T')
                      ? config.startTime.split('T')[1]?.slice(0, 5) || defaultStartTime
                      : defaultStartTime
                  }
                  onChange={(e) => {
                    const timeStr = e.target.value;
                    const dateTime = `${config.date}T${timeStr}:00.000Z`;
                    setConfig({ ...config, startTime: dateTime });
                  }}
                />
              </div>

              {/* 结束时间 */}
              <div className="space-y-2">
                <Label htmlFor="endTime">结束时间</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={
                    config.endTime.includes('T')
                      ? config.endTime.split('T')[1]?.slice(0, 5) || defaultEndTime
                      : defaultEndTime
                  }
                  onChange={(e) => {
                    const timeStr = e.target.value;
                    const dateTime = `${config.date}T${timeStr}:00.000Z`;
                    setConfig({ ...config, endTime: dateTime });
                  }}
                />
              </div>

              {/* 节奏因子 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>节奏因子</Label>
                  <span className="text-sm text-muted-foreground">
                    {config.pacingFactor === PACING_FACTOR.MIN
                      ? PACING_FACTOR_LABELS.FAST
                      : config.pacingFactor === PACING_FACTOR.MAX
                      ? PACING_FACTOR_LABELS.SLOW
                      : PACING_FACTOR_LABELS.NORMAL}
                  </span>
                </div>
                <Slider
                  value={[config.pacingFactor || PACING_FACTOR.DEFAULT]}
                  min={PACING_FACTOR.MIN}
                  max={PACING_FACTOR.MAX}
                  step={PACING_FACTOR.STEP}
                  onValueChange={([value]) => setConfig({ ...config, pacingFactor: value })}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{PACING_FACTOR.MIN} (快)</span>
                  <span>{PACING_FACTOR.DEFAULT} (标准)</span>
                  <span>{PACING_FACTOR.MAX} (慢)</span>
                </div>
              </div>

              {/* 人员组成 */}
              <div className="space-y-3">
                <Label>人员组成</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasChildren"
                    checked={config.hasChildren}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, hasChildren: checked === true })
                    }
                  />
                  <Label htmlFor="hasChildren" className="flex items-center gap-2 font-normal">
                    <Baby className="w-4 h-4" />
                    带小孩
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasElderly"
                    checked={config.hasElderly}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, hasElderly: checked === true })
                    }
                  />
                  <Label htmlFor="hasElderly" className="flex items-center gap-2 font-normal">
                    <UserCog className="w-4 h-4" />
                    带老人
                  </Label>
                </div>
              </div>

              {/* 午餐时间窗 */}
              <div className="space-y-2">
                <Label>午餐时间窗</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="time"
                    value={config.lunchWindow?.start || DEFAULT_TIMES.LUNCH_START}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lunchWindow: {
                          ...config.lunchWindow!,
                          start: e.target.value,
                        },
                      })
                    }
                  />
                  <Input
                    type="time"
                    value={config.lunchWindow?.end || DEFAULT_TIMES.LUNCH_END}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lunchWindow: {
                          ...config.lunchWindow!,
                          end: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* 晚餐时间窗 */}
              <div className="space-y-2">
                <Label>晚餐时间窗</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="time"
                    value={config.dinnerWindow?.start || DEFAULT_TIMES.DINNER_START}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        dinnerWindow: {
                          ...config.dinnerWindow!,
                          start: e.target.value,
                        },
                      })
                    }
                  />
                  <Input
                    type="time"
                    value={config.dinnerWindow?.end || DEFAULT_TIMES.DINNER_END}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        dinnerWindow: {
                          ...config.dinnerWindow!,
                          end: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* 优化按钮 */}
              <Button
                onClick={handleOptimize}
                disabled={loading || selectedPlaceIds.length === 0}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    优化中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    开始优化
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：结果展示 */}
        <div className="lg:col-span-2 space-y-6">
          {optimizedResult ? (
            <>
              {/* 分数展示 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    优化结果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                      <div>
                        <div className="text-sm text-muted-foreground">快乐值总分</div>
                        <div className="text-3xl font-bold text-primary">
                          {optimizedResult.happinessScore.toFixed(1)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleHumanize}
                        disabled={humanizing}
                      >
                        {humanizing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        生成人性化描述
                      </Button>
                    </div>

                    {/* 分数明细 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">兴趣分</div>
                        <div className="text-lg font-semibold text-green-600">
                          +{optimizedResult.scoreBreakdown.interestScore}
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">距离惩罚</div>
                        <div className="text-lg font-semibold text-red-600">
                          -{optimizedResult.scoreBreakdown.distancePenalty.toFixed(1)}
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">疲劳惩罚</div>
                        <div className="text-lg font-semibold text-red-600">
                          -{optimizedResult.scoreBreakdown.tiredPenalty.toFixed(1)}
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">聚类奖励</div>
                        <div className="text-lg font-semibold text-green-600">
                          +{optimizedResult.scoreBreakdown.clusteringBonus.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 时间轴 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    行程时间轴
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {optimizedResult.schedule.map((scheduleItem, index) => {
                      const node = optimizedResult.nodes[scheduleItem.nodeIndex];
                      return (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-lg">{node.name}</h3>
                              <Badge variant="outline">{node.category}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {formatTime(scheduleItem.startTime)} -{' '}
                                  {formatTime(scheduleItem.endTime)}
                                </span>
                              </div>
                              {node.estimatedDuration && (
                                <span>预计 {node.estimatedDuration} 分钟</span>
                              )}
                              {node.intensity && (
                                <Badge
                                  variant={
                                    node.intensity === 'HIGH'
                                      ? 'destructive'
                                      : node.intensity === 'MEDIUM'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                >
                                  {node.intensity === 'HIGH'
                                    ? INTENSITY_LABELS.HIGH
                                    : node.intensity === 'MEDIUM'
                                    ? INTENSITY_LABELS.MEDIUM
                                    : INTENSITY_LABELS.LOW}
                                </Badge>
                              )}
                            </div>
                            {scheduleItem.transportTime !== null &&
                              scheduleItem.transportTime !== undefined && (
                                <div className="text-xs text-muted-foreground">
                                  交通时间：{scheduleItem.transportTime} 分钟
                                </div>
                              )}
                            {node.location && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                坐标: {node.location.lat.toFixed(4)},{' '}
                                {node.location.lng.toFixed(4)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 人性化描述 */}
              {humanizedDescription && (
                <Card>
                  <CardHeader>
                    <CardTitle>行程描述</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {humanizedDescription}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {loading ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p>正在优化路线，请稍候...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <Sparkles className="w-12 h-12 text-muted-foreground" />
                    <p>请选择地点并配置参数，然后点击"开始优化"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

