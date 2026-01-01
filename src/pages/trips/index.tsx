import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import type { TripListItem } from '@/types/trip';
import type { Country } from '@/types/country';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle, EmptyMedia } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, MapPin, DollarSign, Shield, Activity, RefreshCw, Heart, Share2, Users, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { TripPlanning } from '@/components/illustrations';
import { cn } from '@/lib/utils';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PLANNING':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'IN_PROGRESS':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'PLANNING':
      return '规划中';
    case 'IN_PROGRESS':
      return '进行中';
    case 'COMPLETED':
      return '已完成';
    case 'CANCELLED':
      return '已取消';
    default:
      return status;
  }
};

type StatusFilter = 'all' | 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED';

export default function TripsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryMap, setCountryMap] = useState<Map<string, Country>>(new Map());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    loadCountries();
    loadTrips();
  }, []);

  // 当从创建页面返回时，刷新行程列表
  useEffect(() => {
    // 检查是否从创建页面返回（通过 location.state 判断）
    if (location.state?.from === 'create') {
      loadTrips();
      // 清除 state，避免重复刷新
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // 加载国家列表，建立代码到国家信息的映射
  const loadCountries = async () => {
    try {
      const countries = await countriesApi.getAll();
      const map = new Map<string, Country>();
      countries.forEach((country) => {
        map.set(country.isoCode, country);
      });
      setCountryMap(map);
    } catch (err: any) {
      console.error('Failed to load countries:', err);
      // 加载失败不影响行程列表显示，只是国家名称无法显示
    }
  };

  // 根据国家代码获取国家名称
  const getCountryName = (countryCode: string): string => {
    const country = countryMap.get(countryCode);
    if (country) {
      return country.nameCN;
    }
    // 如果找不到，返回代码本身
    return countryCode;
  };

  const loadTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tripsApi.getAll();
      // 确保数据是数组，并添加默认值
      setTrips(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || '加载行程列表失败');
      console.error('Failed to load trips:', err);
      setTrips([]); // 出错时设置为空数组
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = () => {
    navigate('/dashboard/trips/new');
  };

  const handleTripClick = (tripId: string) => {
    navigate(`/dashboard/trips/${tripId}`);
  };

  // 计算行程成熟度（基于状态和天数）
  const getMaturity = (trip: TripListItem): 'ROUGH' | 'READY' | 'EXECUTABLE' => {
    const days = trip.days?.length ?? 0;
    if (trip.status === 'COMPLETED') return 'EXECUTABLE';
    if (trip.status === 'IN_PROGRESS') return 'EXECUTABLE';
    if (days > 0 && trip.status === 'PLANNING') return 'READY';
    return 'ROUGH';
  };

  const getMaturityColor = (maturity: string) => {
    switch (maturity) {
      case 'EXECUTABLE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'READY':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ROUGH':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMaturityText = (maturity: string) => {
    switch (maturity) {
      case 'EXECUTABLE':
        return '可执行';
      case 'READY':
        return '就绪';
      case 'ROUGH':
        return '草稿';
      default:
        return maturity;
    }
  };

  // 过滤行程
  const filteredTrips = statusFilter === 'all' 
    ? trips 
    : trips.filter(trip => trip.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
          <Button onClick={loadTrips} className="mt-4" variant="outline">
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">我的旅行计划</h1>
          <p className="text-muted-foreground mt-1">管理和查看您的所有行程</p>
        </div>
        <Button onClick={handleCreateTrip}>
          <Plus className="w-4 h-4 mr-2" />
          创建新旅程
        </Button>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyMedia>
                <TripPlanning size={280} color="#6b7280" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>还没有行程</EmptyTitle>
                <EmptyDescription>创建您的第一个行程，开始规划您的旅行</EmptyDescription>
              </EmptyHeader>
              <Button onClick={handleCreateTrip} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                创建新行程
              </Button>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 状态筛选 */}
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="PLANNING">草稿</TabsTrigger>
              <TabsTrigger value="IN_PROGRESS">进行中</TabsTrigger>
              <TabsTrigger value="COMPLETED">已完成</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 行程卡片列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => {
              if (!trip || !trip.id) return null;
              const maturity = getMaturity(trip);
              const days = trip.days?.length ?? 0;
              
              return (
                <Card
                  key={trip.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                  onClick={() => handleTripClick(trip.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">
                        {trip.destination ? getCountryName(trip.destination) : '未知目的地'}
                      </CardTitle>
                      <Badge className={getStatusColor(trip.status || 'PLANNING')} variant="outline">
                        {getStatusText(trip.status || 'PLANNING')}
                      </Badge>
                    </div>
                    <CardDescription>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {trip.startDate ? format(new Date(trip.startDate), 'yyyy-MM-dd') : 'N/A'} -{' '}
                          {trip.endDate ? format(new Date(trip.endDate), 'yyyy-MM-dd') : 'N/A'}
                        </span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 行程成熟度 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">行程成熟度</span>
                      <Badge className={getMaturityColor(maturity)} variant="outline">
                        {getMaturityText(maturity)}
                      </Badge>
                    </div>

                    {/* 三人格评分 */}
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-600" />
                          <span className="text-muted-foreground">Abu 通过率</span>
                        </div>
                        <span className="font-medium text-green-600">安全 OK</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-orange-600" />
                          <span className="text-muted-foreground">Dr.Dre 评分</span>
                        </div>
                        <span className="font-medium text-orange-600">节奏 OK</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-green-600" />
                          <span className="text-muted-foreground">Neptune 状态</span>
                        </div>
                        <span className="font-medium text-green-600">可修复</span>
                      </div>
                    </div>

                    {/* 预算状态 */}
                    <div className="flex items-center justify-between text-sm border-t pt-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-muted-foreground">预算状态</span>
                      </div>
                      <span className="font-medium">
                        ¥{((trip.totalBudget ?? 0) as number).toLocaleString()}
                      </span>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 border-t pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: 实现收藏功能
                        }}
                      >
                        <Heart className="w-4 h-4 mr-1" />
                        收藏
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: 实现分享功能
                        }}
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        分享
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: 实现协作功能
                        }}
                      >
                        <Users className="w-4 h-4 mr-1" />
                        协作
                      </Button>
                    </div>

                    {/* 进入行程按钮 */}
                    <Button
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTripClick(trip.id);
                      }}
                    >
                      进入行程
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
