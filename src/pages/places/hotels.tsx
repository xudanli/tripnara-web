import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { placesApi } from '@/api/places';
import { hotelsApi } from '@/api/hotels';
import type {
  HotelOption,
  HotelRecommendation,
  HotelRecommendationStrategy,
  CityHotelRecommendation,
} from '@/types/places-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Hotel,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

const STRATEGIES: { value: HotelRecommendationStrategy; label: string; desc: string }[] = [
  { value: 'CENTROID', label: '重心法', desc: '适合高密度行程' },
  { value: 'HUB', label: '交通枢纽法', desc: '适合大多数人' },
  { value: 'RESORT', label: '度假模式', desc: '适合休闲度假' },
];

export default function HotelsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');

  const [mode, setMode] = useState<'options' | 'recommend' | 'city'>('options');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 城市推荐模式
  const [city, setCity] = useState<string>('');
  const [starRating, setStarRating] = useState<number>(4);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [cityHotels, setCityHotels] = useState<CityHotelRecommendation[]>([]);

  // 选项模式
  const [hotelOptions, setHotelOptions] = useState<HotelOption[]>([]);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [densityAnalysis, setDensityAnalysis] = useState<any>(null);

  // 推荐模式
  const [strategy, setStrategy] = useState<HotelRecommendationStrategy>('HUB');
  const [maxBudget, setMaxBudget] = useState<number>(2000);
  const [minTier, setMinTier] = useState<number>(1);
  const [maxTier, setMaxTier] = useState<number>(5);
  const [includeHiddenCost, setIncludeHiddenCost] = useState(true);
  const [hotelRecommendations, setHotelRecommendations] = useState<HotelRecommendation[]>([]);

  useEffect(() => {
    if (tripId && mode === 'options') {
      loadHotelOptions();
    }
  }, [tripId, mode]);

  const loadHotelOptions = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await placesApi.recommendHotelOptions({
        tripId,
        includeHiddenCost: true,
      });
      setHotelOptions(data.options || []);
      setRecommendation(data.recommendation || null);
      setDensityAnalysis(data.densityAnalysis || null);
    } catch (err: any) {
      setError(err.message || '加载酒店推荐失败');
      console.error('Failed to load hotel options:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommend = async () => {
    if (!tripId) {
      setError('请提供行程ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await placesApi.recommendHotels({
        tripId,
        strategy,
        maxBudget,
        minTier,
        maxTier,
        includeHiddenCost,
      });
      setHotelRecommendations(data);
    } catch (err: any) {
      setError(err.message || '推荐酒店失败');
      console.error('Failed to recommend hotels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCityRecommend = async () => {
    if (!city) {
      setError('请输入城市名称');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await hotelsApi.getRecommendations({
        city,
        starRating,
        minPrice,
        maxPrice,
        limit: 10,
      });
      setCityHotels(data);
    } catch (err: any) {
      setError(err.message || '推荐酒店失败');
      console.error('Failed to recommend hotels by city:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <div>
          <h1 className="text-3xl font-bold">酒店推荐</h1>
          <p className="text-muted-foreground mt-1">根据您的行程智能推荐合适的酒店</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 模式切换 */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
        <TabsList>
          <TabsTrigger value="options">推荐选项</TabsTrigger>
          <TabsTrigger value="recommend">自定义推荐</TabsTrigger>
          <TabsTrigger value="city">城市推荐</TabsTrigger>
        </TabsList>

        {/* 推荐选项模式 */}
        <TabsContent value="options" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-8 h-8" />
            </div>
          ) : hotelOptions.length > 0 ? (
            <>
              {recommendation && (
                <Card className="border-primary bg-primary/5">
                  <CardContent className="pt-6">
                    <p className="text-primary font-medium">{recommendation}</p>
                  </CardContent>
                </Card>
              )}

              {densityAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>行程密度分析</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">密度等级</div>
                        <div className="font-semibold">{densityAnalysis.density}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">平均每日景点</div>
                        <div className="font-semibold">{densityAnalysis.avgPlacesPerDay}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">总天数</div>
                        <div className="font-semibold">{densityAnalysis.totalDays}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">总景点数</div>
                        <div className="font-semibold">{densityAnalysis.totalAttractions}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {hotelOptions.map((option) => (
                  <Card key={option.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle>{option.name}</CardTitle>
                      <CardDescription>{option.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      {/* 优点 */}
                      <div>
                        <div className="text-sm font-medium mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          优点
                        </div>
                        <ul className="space-y-1">
                          {option.pros.map((pro, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              • {pro}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 缺点 */}
                      <div>
                        <div className="text-sm font-medium mb-2 flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          缺点
                        </div>
                        <ul className="space-y-1">
                          {option.cons.map((con, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              • {con}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 酒店列表 */}
                      <div>
                          <div className="text-sm font-medium mb-2">推荐酒店</div>
                        <div className="space-y-2">
                          {option.hotels.map((hotel) => (
                            <div key={hotel.hotelId} className="p-2 border rounded">
                              <div className="font-medium">{hotel.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ¥{hotel.roomRate}/晚 · {hotel.tier}星
                              </div>
                              {hotel.totalCost !== undefined && (
                                <div className="text-sm font-semibold text-primary mt-1">
                                  总成本: ¥{hotel.totalCost.toFixed(2)}
                                </div>
                              )}
                              {hotel.locationScore && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {hotel.locationScore.nearest_station_walk_min !== undefined && (
                                    <span>距地铁站 {hotel.locationScore.nearest_station_walk_min} 分钟</span>
                                  )}
                                  {hotel.locationScore.avg_distance_to_attractions_km !== undefined && (
                                    <span className="ml-2">
                                      平均距离景点 {hotel.locationScore.avg_distance_to_attractions_km.toFixed(1)} km
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                {hotel.recommendationReason}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Hotel className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无推荐选项</p>
                <p className="text-sm mt-2">请先创建行程或提供行程ID</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 自定义推荐模式 */}
        <TabsContent value="recommend" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>推荐配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>推荐策略</Label>
                  <Select value={strategy} onValueChange={(v) => setStrategy(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STRATEGIES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label} - {s.desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>预算上限（元/晚）</Label>
                  <Input
                    type="number"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(Number(e.target.value))}
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label>最低星级</Label>
                  <Input
                    type="number"
                    value={minTier}
                    onChange={(e) => setMinTier(Number(e.target.value))}
                    min={1}
                    max={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>最高星级</Label>
                  <Input
                    type="number"
                    value={maxTier}
                    onChange={(e) => setMaxTier(Number(e.target.value))}
                    min={1}
                    max={5}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeHiddenCost"
                  checked={includeHiddenCost}
                  onCheckedChange={(checked) => setIncludeHiddenCost(checked === true)}
                />
                <Label htmlFor="includeHiddenCost" className="font-normal">
                  考虑隐形成本（交通费 + 时间成本）
                </Label>
              </div>

              <Button onClick={handleRecommend} disabled={loading || !tripId} className="w-full">
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Hotel className="w-4 h-4 mr-2" />
                )}
                开始推荐
              </Button>
            </CardContent>
          </Card>

          {/* 推荐结果 */}
          {hotelRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>推荐结果</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hotelRecommendations.map((hotel) => (
                    <Card key={hotel.hotelId}>
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{hotel.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge>{hotel.tier}星</Badge>
                                {hotel.distanceToCenter !== undefined && (
                                  <span className="text-sm text-muted-foreground">
                                    距中心 {hotel.distanceToCenter}m
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {hotel.totalCost !== undefined ? (
                                <>
                                  <div className="text-2xl font-bold text-primary">
                                    ¥{hotel.totalCost.toFixed(2)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    房价: ¥{hotel.roomRate}/晚
                                  </div>
                                </>
                              ) : (
                                <div className="text-2xl font-bold text-primary">
                                  ¥{hotel.roomRate}/晚
                                </div>
                              )}
                            </div>
                          </div>

                          {hotel.locationScore && (
                            <div className="p-3 bg-muted rounded-lg">
                              <div className="text-sm font-medium mb-2">位置信息</div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {hotel.locationScore.center_distance_km !== undefined && (
                                  <div>距市中心: {hotel.locationScore.center_distance_km.toFixed(1)} km</div>
                                )}
                                {hotel.locationScore.nearest_station_walk_min !== undefined && (
                                  <div>距地铁站: {hotel.locationScore.nearest_station_walk_min} 分钟</div>
                                )}
                                {hotel.locationScore.is_transport_hub && (
                                  <div>交通枢纽: 是</div>
                                )}
                                {hotel.locationScore.avg_distance_to_attractions_km !== undefined && (
                                  <div>平均距景点: {hotel.locationScore.avg_distance_to_attractions_km.toFixed(1)} km</div>
                                )}
                                {hotel.locationScore.transport_convenience_score !== undefined && (
                                  <div>交通便利度: {hotel.locationScore.transport_convenience_score}/10</div>
                                )}
                              </div>
                            </div>
                          )}

                          {hotel.costBreakdown && (
                            <div className="p-3 bg-muted rounded-lg">
                              <div className="text-sm font-medium mb-2">成本明细</div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>房价: ¥{hotel.costBreakdown.roomRate}</div>
                                <div>交通费: ¥{hotel.costBreakdown.transportCost}</div>
                                <div>时间成本: ¥{hotel.costBreakdown.timeCost}</div>
                                <div>隐形成本: ¥{hotel.costBreakdown.hiddenCost}</div>
                                <div className="col-span-2 font-semibold">
                                  总成本: ¥{hotel.costBreakdown.totalCost}
                                </div>
                              </div>
                            </div>
                          )}

                          <p className="text-sm text-muted-foreground">
                            {hotel.recommendationReason}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 城市推荐模式 */}
        <TabsContent value="city" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>根据城市和星级推荐</CardTitle>
              <CardDescription>输入城市名称和星级，系统会推荐符合条件的酒店</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>城市名称</Label>
                  <Input
                    placeholder="例如：洛阳市、北京"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>星级（1-5）</Label>
                  <Input
                    type="number"
                    value={starRating}
                    onChange={(e) => setStarRating(Number(e.target.value))}
                    min={1}
                    max={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>最低价格（元，可选）</Label>
                  <Input
                    type="number"
                    value={minPrice || ''}
                    onChange={(e) =>
                      setMinPrice(e.target.value ? Number(e.target.value) : undefined)
                    }
                    min={0}
                    placeholder="不限制"
                  />
                </div>

                <div className="space-y-2">
                  <Label>最高价格（元，可选）</Label>
                  <Input
                    type="number"
                    value={maxPrice || ''}
                    onChange={(e) =>
                      setMaxPrice(e.target.value ? Number(e.target.value) : undefined)
                    }
                    min={0}
                    placeholder="不限制"
                  />
                </div>
              </div>

              <Button onClick={handleCityRecommend} disabled={loading || !city} className="w-full">
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Hotel className="w-4 h-4 mr-2" />
                )}
                开始推荐
              </Button>
            </CardContent>
          </Card>

          {/* 城市推荐结果 */}
          {cityHotels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>推荐结果</CardTitle>
                <CardDescription>
                  找到 {cityHotels.length} 个符合条件的酒店
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cityHotels.map((hotel) => (
                    <Card key={hotel.id}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{hotel.name}</h3>
                              {hotel.brand && (
                                <Badge variant="outline" className="mt-1">
                                  {hotel.brand}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {hotel.address && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">地址：</span>
                              {hotel.address}
                              {hotel.district && ` (${hotel.district})`}
                            </div>
                          )}

                          {hotel.phone && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">电话：</span>
                              {hotel.phone}
                            </div>
                          )}

                          {hotel.lat !== null && hotel.lng !== null && (
                            <div className="text-xs text-muted-foreground">
                              坐标: {hotel.lat.toFixed(4)}, {hotel.lng.toFixed(4)}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

