import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { routeDirectionsApi } from '@/api/route-directions';
import type { RouteDirection } from '@/types/places-routes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TrailCard } from '@/components/trails';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Search,
  MapPin,
  Filter,
  Map,
  List,
} from 'lucide-react';
import { toast } from 'sonner';

// 快捷筛选标签
const QUICK_FILTERS = [
  { label: '1-day', value: '1-day' },
  { label: '2-3 days', value: '2-3-days' },
  { label: 'waterfall', value: 'waterfall' },
  { label: 'ridge', value: 'ridge' },
  { label: 'glacier', value: 'glacier' },
  { label: 'hot spring', value: 'hot-spring' },
];

// 难度选项
const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '简单' },
  { value: 'moderate', label: '中等' },
  { value: 'hard', label: '困难' },
  { value: 'expert', label: '专家' },
];

export default function TrailsExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [trails, setTrails] = useState<RouteDirection[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // 筛选条件
  const [difficulty, setDifficulty] = useState<string>('');
  const [distanceRange, setDistanceRange] = useState<[number, number]>([0, 100]);
  const [elevationRange, setElevationRange] = useState<[number, number]>([0, 5000]);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 24]);
  const [loopType, setLoopType] = useState<string>('');

  useEffect(() => {
    loadTrails();
  }, [searchParams]);

  const loadTrails = async () => {
    try {
      setLoading(true);
      const countryCode = searchParams.get('country') || '';
      const month = searchParams.get('month') 
        ? parseInt(searchParams.get('month')!) 
        : new Date().getMonth() + 1;

      const data = await routeDirectionsApi.query({
        countryCode: countryCode || undefined,
        tag: '徒步',
        month,
        isActive: true,
      });

      setTrails(data || []);
    } catch (error: any) {
      toast.error('加载路线失败: ' + (error.message || '未知错误'));
      console.error('Failed to load trails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // 更新搜索参数
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (location) params.set('location', location);
    setSearchParams(params);
    loadTrails();
  };

  const handleQuickFilter = (filter: string) => {
    const newFilters = selectedFilters.includes(filter)
      ? selectedFilters.filter((f) => f !== filter)
      : [...selectedFilters, filter];
    setSelectedFilters(newFilters);
  };

  const getReadinessScore = (trail: RouteDirection): number => {
    // 模拟可走指数计算（实际应该调用 Readiness API）
    const month = new Date().getMonth() + 1;
    const isBestMonth = trail.seasonality?.bestMonths?.includes(month);
    const baseScore = isBestMonth ? 80 : 60;
    return baseScore + Math.floor(Math.random() * 20);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 顶部搜索栏 */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索路线名、国家、公园..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <div className="w-48">
            <Input
              placeholder="当前城市/国家"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-10"
            />
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          <Button onClick={handleSearch}>搜索</Button>
        </div>

        {/* 快捷筛选 */}
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((filter) => (
            <Badge
              key={filter.value}
              variant={selectedFilters.includes(filter.value) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleQuickFilter(filter.value)}
            >
              {filter.label}
            </Badge>
          ))}
        </div>

        {/* 筛选按钮和视图切换 */}
        <div className="flex justify-between items-center">
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                筛选
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>筛选条件</SheetTitle>
                <SheetDescription>
                  设置你的路线筛选条件
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* 难度 */}
                <div>
                  <Label>难度</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择难度" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 距离 */}
                <div>
                  <Label>距离: {distanceRange[0]} - {distanceRange[1]} km</Label>
                  <Slider
                    value={distanceRange}
                    onValueChange={(v) => setDistanceRange(v as [number, number])}
                    min={0}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>

                {/* 爬升 */}
                <div>
                  <Label>爬升: {elevationRange[0]} - {elevationRange[1]} m</Label>
                  <Slider
                    value={elevationRange}
                    onValueChange={(v) => setElevationRange(v as [number, number])}
                    min={0}
                    max={5000}
                    step={50}
                    className="mt-2"
                  />
                </div>

                {/* 耗时 */}
                <div>
                  <Label>预计耗时: {timeRange[0]} - {timeRange[1]} 小时</Label>
                  <Slider
                    value={timeRange}
                    onValueChange={(v) => setTimeRange(v as [number, number])}
                    min={0}
                    max={24}
                    step={1}
                    className="mt-2"
                  />
                </div>

                {/* 路线类型 */}
                <div>
                  <Label>路线类型</Label>
                  <Select value={loopType} onValueChange={setLoopType}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loop">环线</SelectItem>
                      <SelectItem value="out-and-back">往返</SelectItem>
                      <SelectItem value="point-to-point">穿越</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <Button className="flex-1" onClick={() => setFilterOpen(false)}>
                  应用筛选
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDifficulty('');
                    setDistanceRange([0, 100]);
                    setElevationRange([0, 5000]);
                    setTimeRange([0, 24]);
                    setLoopType('');
                  }}
                >
                  重置
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-2" />
              列表
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('map')}
            >
              <Map className="h-4 w-4 mr-2" />
              地图
            </Button>
          </div>
        </div>
      </div>

      {/* 结果列表 */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trails.map((trail) => (
            <TrailCard
              key={trail.id}
              trail={trail}
              readinessScore={getReadinessScore(trail)}
              onBookmark={() => toast.info('已收藏')}
              onDownload={() => toast.info('离线下载功能开发中')}
            />
          ))}
        </div>
      ) : (
        <Card className="h-[600px]">
          <CardContent className="p-0 h-full">
            <div className="h-full flex items-center justify-center text-muted-foreground">
              地图视图开发中
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && trails.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">没有找到匹配的路线</p>
        </div>
      )}
    </div>
  );
}

