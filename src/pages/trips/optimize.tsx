import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { itineraryOptimizationApi } from '@/api/itinerary-optimization';
import { placesApi } from '@/api/places';
import { tripsApi } from '@/api/trips';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  TIME_FORMAT,
  INTENSITY_LABELS,
  PACING_FACTOR_LABELS,
  TRAVEL_MODE_OPTIONS,
  TRIP_TRAVEL_MODE_MAP,
} from '@/constants/itinerary-optimization';
import type { OptimizeTravelMode } from '@/types/itinerary-optimization';
import type { TripDetail } from '@/types/trip';

type PlaceOption = { id: number; nameCN?: string; nameEN?: string; category?: string; reason?: string };

export default function TripOptimizePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizedResult, setOptimizedResult] = useState<OptimizeRouteResponse | null>(null);
  const [humanizedDescription, setHumanizedDescription] = useState<string | null>(null);
  const [humanizing, setHumanizing] = useState(false);

  // 行程数据（有 tripId 时加载）
  const [trip, setTrip] = useState<TripDetail | null>(null);

  // 行程地点（按日期，来自 ItineraryItem）
  const tripPlacesForDate = (dateStr: string): PlaceOption[] => {
    if (!trip?.TripDay) return [];
    const day = trip.TripDay.find((d) => d.date === dateStr || d.date?.startsWith?.(dateStr));
    if (!day?.ItineraryItem) return [];
    return day.ItineraryItem
      .filter((item) => item.placeId && item.Place)
      .map((item) => ({
        id: item.placeId!,
        nameCN: item.Place!.nameCN,
        nameEN: item.Place!.nameEN ?? undefined,
        category: item.Place!.category as string | undefined,
      }));
  };

  // 语义搜索（添加更多地点）
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 已选地点（用于优化）
  const [selectedPlaces, setSelectedPlaces] = useState<PlaceOption[]>([]);

  // 行程国家代码（用于语义搜索）
  const [countryCode, setCountryCode] = useState<string | undefined>(undefined);

  // 配置表单
  const today = format(new Date(), 'yyyy-MM-dd');
  const defaultStartTime = `${String(DEFAULT_TIMES.START_HOUR).padStart(2, '0')}:${String(DEFAULT_TIMES.START_MINUTE).padStart(2, '0')}`;
  const defaultEndTime = `${String(DEFAULT_TIMES.END_HOUR).padStart(2, '0')}:${String(DEFAULT_TIMES.END_MINUTE).padStart(2, '0')}`;
  
  const [config, setConfig] = useState<OptimizeRouteConfig & {
    transportPreferences: { lessWalking: boolean; avoidHighways: boolean; avoidTolls: boolean };
  }>({
    date: today,
    startTime: `${today}T${defaultStartTime}:${TIME_FORMAT.ISO_SUFFIX}`,
    endTime: `${today}T${defaultEndTime}:${TIME_FORMAT.ISO_SUFFIX}`,
    pacingFactor: PACING_FACTOR.DEFAULT,
    hasChildren: false,
    hasElderly: false,
    defaultTravelMode: undefined,
    transportPreferences: {
      lessWalking: false,
      avoidHighways: false,
      avoidTolls: false,
    },
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

  // 加载行程：地点、countryCode、预填配置
  useEffect(() => {
    if (!tripId) return;
    const loadTrip = async () => {
      try {
        const data = await tripsApi.getById(tripId);
        setTrip(data);
        setCountryCode(data.destination || undefined);
        const firstDay = data.TripDay?.[0];
        const firstDate = firstDay?.date ?? config.date;
        const places = firstDay
          ? (firstDay.ItineraryItem ?? [])
              .filter((item) => item.placeId && item.Place)
              .map((item) => ({
                id: item.placeId!,
                nameCN: item.Place!.nameCN,
                nameEN: item.Place!.nameEN ?? undefined,
                category: item.Place!.category as string | undefined,
              }))
          : [];
        setSelectedPlaces(places);
        setConfig((prev) => {
          const updates: Partial<typeof prev> = { date: firstDate };
          const travelers = data.pacingConfig?.travelers ?? [];
          const hasChild = travelers.some((t) => t.type === 'CHILD');
          const hasElder = travelers.some((t) => t.type === 'ELDERLY');
          updates.hasChildren = hasChild;
          updates.hasElderly = hasElder;
          if (hasElder) {
            updates.transportPreferences = {
              ...prev.transportPreferences,
              lessWalking: true,
            };
          }
          const rawMode = data.metadata?.travelMode ?? data.metadata?.defaultTravelMode;
          const mappedMode = rawMode ? TRIP_TRAVEL_MODE_MAP[String(rawMode)] : undefined;
          if (mappedMode) updates.defaultTravelMode = mappedMode;
          return { ...prev, ...updates };
        });
      } catch {
        // 忽略
      }
    };
    loadTrip();
  }, [tripId]);

  // 日期变化时：当日行程地点 + 保留搜索添加的
  useEffect(() => {
    if (!tripId || !trip) return;
    const dayPlaces = tripPlacesForDate(config.date);
    setSelectedPlaces((prev) => {
      const dayIds = new Set(dayPlaces.map((p) => p.id));
      const fromSearch = prev.filter((p) => !dayIds.has(p.id));
      return [...dayPlaces, ...fromSearch];
    });
  }, [config.date, tripId, trip]);

  const handleSearchPlaces = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      setSearchError(null);
      const res = await placesApi.semanticSearchPlaces({
        q,
        countryCode,
        limit: 20,
      });
      setSearchResults(res?.results ?? []);
    } catch (err: any) {
      setSearchError(err.message || '搜索失败');
      setSearchResults([]);
      console.error('Semantic search error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleTogglePlace = (place: PlaceOption, checked: boolean) => {
    if (checked) {
      if (selectedPlaces.some((p) => p.id === place.id)) return;
      setSelectedPlaces((prev) => [...prev, place]);
    } else {
      setSelectedPlaces((prev) => prev.filter((p) => p.id !== place.id));
    }
  };

  const handleAddPlace = (place: PlaceOption) => {
    if (selectedPlaces.some((p) => p.id === place.id)) return;
    setSelectedPlaces((prev) => [...prev, place]);
  };

  const handleRemovePlace = (placeId: number) => {
    setSelectedPlaces((prev) => prev.filter((p) => p.id !== placeId));
  };

  const handleOptimize = async () => {
    if (selectedPlaces.length === 0) {
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
      const startDateTimeStr = typeof startDateTime === 'string'
        ? startDateTime
        : String(startDateTime);
      
      if (!startDateTimeStr.includes('T') || !startDateTimeStr.endsWith('Z')) {
        const timePart = startDateTimeStr.includes('T')
          ? startDateTimeStr.split('T')[1]?.slice(0, 5) || defaultStartTime
          : defaultStartTime;
        startDateTime = `${dateStr}T${timePart}:${TIME_FORMAT.ISO_SUFFIX}`;
      }

      const endDateTimeStr = typeof endDateTime === 'string'
        ? endDateTime
        : String(endDateTime);
      
      if (!endDateTimeStr.includes('T') || !endDateTimeStr.endsWith('Z')) {
        const timePart = endDateTimeStr.includes('T')
          ? endDateTimeStr.split('T')[1]?.slice(0, 5) || defaultEndTime
          : defaultEndTime;
        endDateTime = `${dateStr}T${timePart}:${TIME_FORMAT.ISO_SUFFIX}`;
      }

      let dayId = '';
      if (tripId) {
        const trip = await tripsApi.getById(tripId);
        const matchingDay = trip.TripDay?.find(
          (d) => d.date === dateStr || d.date?.startsWith?.(dateStr)
        );
        dayId = matchingDay?.id ?? trip.TripDay?.[0]?.id ?? '';
      }

      const prefs = config.transportPreferences;
      const transportPreferences = prefs
        ? (Object.fromEntries(
            Object.entries(prefs).filter(([, v]) => v === true)
          ) as OptimizeRouteConfig['transportPreferences'])
        : undefined;

      const request: OptimizeRouteRequest = {
        placeIds: selectedPlaces.map((p) => p.id),
        config: {
          ...config,
          date: dateStr,
          startTime: startDateTime,
          endTime: endDateTime,
          defaultTravelMode: config.defaultTravelMode,
          transportPreferences: transportPreferences && Object.keys(transportPreferences).length > 0
            ? transportPreferences
            : undefined,
        },
        tripId: tripId ?? '',
        dayId,
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
              <CardDescription>
                {tripId
                  ? `勾选要参与优化的地点（${config.date} 当天行程）`
                  : '搜索并添加地点后开始优化'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 有 tripId：展示当日行程地点 */}
              {tripId && trip && (() => {
                const dayPlaces = tripPlacesForDate(config.date);
                if (dayPlaces.length === 0) {
                  return (
                    <div className="text-sm text-muted-foreground py-2">
                      {config.date} 暂无行程项，可点击下方「添加更多地点」搜索
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">行程地点</div>
                    {dayPlaces.map((place) => (
                      <div key={place.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`trip-place-${place.id}`}
                          checked={selectedPlaces.some((p) => p.id === place.id)}
                          onCheckedChange={(checked) => handleTogglePlace(place, checked === true)}
                        />
                        <Label
                          htmlFor={`trip-place-${place.id}`}
                          className="flex-1 cursor-pointer font-normal"
                        >
                          {place.nameCN || place.nameEN || `地点 ${place.id}`}
                          {place.category && (
                            <Badge variant="outline" className="ml-2 text-xs">{place.category}</Badge>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* 添加更多地点：语义搜索 */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSearchExpanded((v) => !v)}
                >
                  {searchExpanded ? '收起搜索' : '添加更多地点'}
                </Button>
                {searchExpanded && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="冰岛瀑布、适合拍照的景点..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchPlaces()}
                      />
                      <Button onClick={handleSearchPlaces} disabled={searchLoading}>
                        {searchLoading ? <Spinner className="w-4 h-4" /> : '搜索'}
                      </Button>
                    </div>
                    {searchError && (
                      <div className="text-sm text-red-600">{searchError}</div>
                    )}
                    {searchResults.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {searchResults.map((place) => (
                          <div key={place.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{place.nameCN || place.nameEN || `地点 ${place.id}`}</span>
                              {place.category && (
                                <Badge variant="outline" className="ml-2 text-xs">{place.category}</Badge>
                              )}
                              {place.reason && (
                                <div className="text-xs text-muted-foreground truncate">{place.reason}</div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddPlace(place)}
                              disabled={selectedPlaces.some((p) => p.id === place.id)}
                            >
                              {selectedPlaces.some((p) => p.id === place.id) ? '已选' : '添加'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 无 tripId：仅展示搜索 */}
              {!tripId && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="冰岛瀑布、适合拍照的景点..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchPlaces()}
                    />
                    <Button onClick={handleSearchPlaces} disabled={searchLoading}>
                      {searchLoading ? <Spinner className="w-4 h-4" /> : '搜索'}
                    </Button>
                  </div>
                  {searchError && (
                    <div className="text-sm text-red-600">{searchError}</div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.map((place) => (
                        <div key={place.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{place.nameCN || place.nameEN || `地点 ${place.id}`}</span>
                            {place.category && (
                              <Badge variant="outline" className="ml-2 text-xs">{place.category}</Badge>
                            )}
                            {place.reason && (
                              <div className="text-xs text-muted-foreground truncate">{place.reason}</div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddPlace(place)}
                            disabled={selectedPlaces.some((p) => p.id === place.id)}
                          >
                            {selectedPlaces.some((p) => p.id === place.id) ? '已选' : '添加'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 已选列表 */}
              {selectedPlaces.length > 0 && (
                <div className="pt-2 border-t space-y-2">
                  <div className="text-sm font-medium">已选 ({selectedPlaces.length})</div>
                  {selectedPlaces.map((place) => (
                    <div key={place.id} className="flex items-center justify-between gap-2 py-1.5 text-sm border rounded px-2">
                      <div className="flex-1 min-w-0">
                        <span>{place.nameCN || place.nameEN || `地点 ${place.id}`}</span>
                        {place.category && (
                          <Badge variant="outline" className="ml-2 text-xs">{place.category}</Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemovePlace(place.id)}>
                        移除
                      </Button>
                    </div>
                  ))}
                </div>
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
                    (() => {
                      const startTimeStr = typeof config.startTime === 'string'
                        ? config.startTime
                        : String(config.startTime || '');
                      return startTimeStr.includes('T')
                        ? startTimeStr.split('T')[1]?.slice(0, 5) || defaultStartTime
                        : defaultStartTime;
                    })()
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
                    (() => {
                      const endTimeStr = typeof config.endTime === 'string'
                        ? config.endTime
                        : String(config.endTime || '');
                      return endTimeStr.includes('T')
                        ? endTimeStr.split('T')[1]?.slice(0, 5) || defaultEndTime
                        : defaultEndTime;
                    })()
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
                    onCheckedChange={(checked) => {
                      const hasElderly = checked === true;
                      setConfig({
                        ...config,
                        hasElderly,
                        // 带老人时自动勾选「少步行」
                        transportPreferences: hasElderly
                          ? { ...config.transportPreferences, lessWalking: true }
                          : config.transportPreferences,
                      });
                    }}
                  />
                  <Label htmlFor="hasElderly" className="flex items-center gap-2 font-normal">
                    <UserCog className="w-4 h-4" />
                    带老人
                  </Label>
                </div>
              </div>

              {/* 交通方式 */}
              <div className="space-y-2">
                <Label>交通方式</Label>
                <Select
                  value={config.defaultTravelMode ?? 'auto'}
                  onValueChange={(v) =>
                    setConfig({
                      ...config,
                      defaultTravelMode: v === 'auto' ? undefined : (v as OptimizeTravelMode),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="自动（根据人员组成）" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAVEL_MODE_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value ?? 'auto'}
                        value={opt.value ?? 'auto'}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  不选择时，后端根据「带小孩/带老人」自动选择：带老人→公交+少步行，带小孩→自驾，无特殊→公交
                </p>
              </div>

              {/* 交通偏好：少步行（适合老人） */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lessWalking"
                  checked={config.transportPreferences?.lessWalking}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      transportPreferences: {
                        ...config.transportPreferences,
                        lessWalking: checked === true,
                      },
                    })
                  }
                />
                <Label htmlFor="lessWalking" className="font-normal">
                  少步行（适合老人）
                </Label>
              </div>

              {/* 自驾偏好：仅在选择自驾时显示 */}
              {config.defaultTravelMode === 'DRIVING' && (
                <div className="space-y-2 pl-6 border-l-2 border-muted">
                  <Label className="text-sm">自驾偏好</Label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="avoidHighways"
                        checked={config.transportPreferences?.avoidHighways}
                        onCheckedChange={(checked) =>
                          setConfig({
                            ...config,
                            transportPreferences: {
                              ...config.transportPreferences,
                              avoidHighways: checked === true,
                            },
                          })
                        }
                      />
                      <Label htmlFor="avoidHighways" className="font-normal">
                        不走高速
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="avoidTolls"
                        checked={config.transportPreferences?.avoidTolls}
                        onCheckedChange={(checked) =>
                          setConfig({
                            ...config,
                            transportPreferences: {
                              ...config.transportPreferences,
                              avoidTolls: checked === true,
                            },
                          })
                        }
                      />
                      <Label htmlFor="avoidTolls" className="font-normal">
                        避免收费
                      </Label>
                    </div>
                  </div>
                </div>
              )}

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
                disabled={loading || selectedPlaces.length === 0}
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
                          {(optimizedResult.happinessScore ?? 0).toFixed(1)}
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
                          +{(optimizedResult.scoreBreakdown?.interestScore ?? 0)}
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">距离惩罚</div>
                        <div className="text-lg font-semibold text-red-600">
                          -{(optimizedResult.scoreBreakdown?.distancePenalty ?? 0).toFixed(1)}
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">疲劳惩罚</div>
                        <div className="text-lg font-semibold text-red-600">
                          -{(optimizedResult.scoreBreakdown?.tiredPenalty ?? 0).toFixed(1)}
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">聚类奖励</div>
                        <div className="text-lg font-semibold text-green-600">
                          +{(optimizedResult.scoreBreakdown?.clusteringBonus ?? 0).toFixed(1)}
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
                    {(optimizedResult.schedule ?? []).map((scheduleItem, index) => {
                      const node = optimizedResult.nodes?.[scheduleItem.nodeIndex];
                      if (!node) return null;
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
                                坐标: {(node.location?.lat ?? 0).toFixed(4)},{' '}
                                {(node.location?.lng ?? 0).toFixed(4)}
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

