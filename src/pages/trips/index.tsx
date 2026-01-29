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
import { Plus, Calendar, DollarSign, Shield, Activity, RefreshCw, Heart, Share2, Users, ArrowRight, CloudSun } from 'lucide-react';
import { format } from 'date-fns';
import { TripPlanning } from '@/components/illustrations';
import { cn } from '@/lib/utils';
import { ShareTripDialog } from '@/components/trips/ShareTripDialog';
import { CollaboratorsDialog } from '@/components/trips/CollaboratorsDialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/format';
import { getTripStatusClasses, getTripStatusLabel } from '@/lib/trip-status';
import { getPersonaIconColorClasses } from '@/lib/persona-colors';
import { TripCardWeather } from '@/components/weather/WeatherCard';

type StatusFilter = 'all' | string;

export default function TripsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryMap, setCountryMap] = useState<Map<string, Country>>(new Map());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  
  // 收藏、分享、协作相关状态
  const [collectedTripIds, setCollectedTripIds] = useState<Set<string>>(new Set());
  const [collectingTripId, setCollectingTripId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTripId, setShareTripId] = useState<string | null>(null);
  const [collaboratorsDialogOpen, setCollaboratorsDialogOpen] = useState(false);
  const [collaboratorsTripId, setCollaboratorsTripId] = useState<string | null>(null);

  useEffect(() => {
    loadCountries();
    loadTrips();
    // 从 localStorage 加载收藏状态
    const storedCollected = localStorage.getItem('collectedTripIds');
    if (storedCollected) {
      try {
        const ids = JSON.parse(storedCollected);
        setCollectedTripIds(new Set(ids));
      } catch (e) {
        console.error('Failed to parse stored collected trips:', e);
      }
    }
  }, []);

  // 监听路径变化，如果是从其他页面导航到行程库，也刷新一次
  useEffect(() => {
    // 当路径是 /dashboard/trips 时，检查是否需要刷新
    if (location.pathname === '/dashboard/trips') {
      // 检查是否有刷新标记（通过 sessionStorage）
      const shouldRefresh = sessionStorage.getItem('trips-page-should-refresh');
      if (shouldRefresh === 'true') {
        console.log('🔄 [TripsPage] 检测到刷新标记，刷新行程列表');
        sessionStorage.removeItem('trips-page-should-refresh');
        // 延迟刷新，确保页面已渲染
        setTimeout(() => {
          loadTrips();
        }, 500);
      }
    }
  }, [location.pathname]);

  // 当从创建页面返回时，刷新行程列表
  useEffect(() => {
    // 检查是否从创建页面返回（通过 location.state 判断）
    if (location.state?.from === 'create') {
      const tripId = location.state?.tripId;
      console.log('🔄 [TripsPage] 检测到从创建页面返回，刷新行程列表', {
        tripId,
        locationState: location.state,
        pathname: location.pathname,
      });
      
      // 设置刷新标记，用于显示成功提示
      sessionStorage.setItem('trips-page-was-refreshing', 'true');
      
      // 显示成功提示
      if (tripId) {
        toast.success('行程创建成功！正在刷新列表...', {
          description: `行程ID: ${tripId.substring(0, 8)}...`,
          duration: 3000,
        });
      } else {
        toast.success('行程创建成功！正在刷新列表...', {
          duration: 3000,
        });
      }
      
      // 延迟一小段时间后刷新，确保导航已完成
      const timer = setTimeout(() => {
        console.log('🔄 [TripsPage] 延迟刷新触发，开始调用 loadTrips()');
        loadTrips();
      }, 800); // 增加到800ms，给后端更多时间完成创建
      
      // 清除 state，避免重复刷新
      window.history.replaceState({}, document.title);
      
      return () => {
        console.log('🔄 [TripsPage] 清理刷新定时器');
        clearTimeout(timer);
      };
    }
  }, [location]);

  // 加载国家列表，建立代码到国家信息的映射
  const loadCountries = async () => {
    try {
      const response = await countriesApi.getAll();
      const countries = response.countries || [];
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

  // 根据国家代码获取货币代码
  const getCurrencyCode = (countryCode: string): string => {
    const country = countryMap.get(countryCode);
    if (country && country.currencyCode) {
      return country.currencyCode;
    }
    // 如果找不到，默认使用 CNY
    return 'CNY';
  };

  // 格式化行程预算
  const formatTripBudget = (trip: TripListItem): string => {
    const amount = (trip.totalBudget ?? 0) as number;
    const currencyCode = getCurrencyCode(trip.destination);
    return formatCurrency(amount, currencyCode);
  };

  const loadTrips = async () => {
    const loadId = Date.now(); // 用于追踪本次加载
    try {
      setLoading(true);
      setError(null);
      console.log(`🔄 [TripsPage] [${loadId}] 开始加载行程列表...`);
      
      // 添加超时保护
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('加载行程列表超时（30秒）'));
        }, 30000);
      });
      
      const apiPromise = tripsApi.getAll();
      
      console.log(`🔄 [TripsPage] [${loadId}] 等待API响应...`);
      const data = await Promise.race([apiPromise, timeoutPromise]) as TripListItem[];
      
      console.log(`✅ [TripsPage] [${loadId}] API调用成功，handleResponse处理后的数据:`, {
        data,
        type: typeof data,
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A',
        // 详细检查数据结构（如果返回的不是数组）
        dataKeys: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : [],
        // 检查是否是包装格式（不应该出现，因为 handleResponse 已经处理过了）
        hasSuccess: data && typeof data === 'object' && !Array.isArray(data) && 'success' in data,
        hasData: data && typeof data === 'object' && !Array.isArray(data) && 'data' in data,
        hasItems: data && typeof data === 'object' && !Array.isArray(data) && 'items' in data,
        // 打印所有行程ID
        allTripIds: Array.isArray(data) ? data.map(t => t.id) : 'N/A',
      });
      
      // 🔧 防御性处理：如果 handleResponse 返回的不是数组，尝试提取
      let tripsData = data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        console.warn(`⚠️ [TripsPage] [${loadId}] handleResponse 返回的不是数组，尝试提取数据:`, data);
        // 检查是否是包装格式
        if ('success' in data && 'data' in data) {
          const wrapped = data as any;
          if (wrapped.success && wrapped.data) {
            // 检查是否是 items 格式（/api/trips/admin）
            if (Array.isArray(wrapped.data.items)) {
              console.log(`⚠️ [TripsPage] [${loadId}] 检测到 items 格式，使用 result.data.items`);
              tripsData = wrapped.data.items;
            } else if (Array.isArray(wrapped.data)) {
              // 标准格式（/api/trips）
              console.log(`✅ [TripsPage] [${loadId}] 检测到标准格式，使用 result.data`);
              tripsData = wrapped.data;
            }
          }
        }
        // 检查是否直接有 items 字段
        if ('items' in data && Array.isArray((data as any).items)) {
          console.log(`⚠️ [TripsPage] [${loadId}] 检测到直接 items 字段，使用 data.items`);
          tripsData = (data as any).items;
        }
      }
      
      // 确保数据是数组，并添加默认值
      const tripsList = Array.isArray(tripsData) ? tripsData : [];
      console.log(`✅ [TripsPage] [${loadId}] 处理后的行程列表，数量:`, tripsList.length);
      
      // 打印所有行程的详细信息，便于调试
      if (tripsList.length > 0) {
        console.log(`✅ [TripsPage] [${loadId}] 所有行程详情:`, tripsList.map(t => ({
          id: t.id,
          destination: t.destination,
          status: t.status,
          startDate: t.startDate,
          endDate: t.endDate,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })));
        
        // 按状态分组统计
        const statusCounts: Record<string, number> = {};
        tripsList.forEach(trip => {
          const status = trip.status || 'UNKNOWN';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        console.log(`✅ [TripsPage] [${loadId}] 行程状态统计:`, statusCounts);
      }
      
      setTrips(tripsList);
      
      // 从实际数据中提取所有存在的状态值
      const statusSet = new Set<string>();
      tripsList.forEach(trip => {
        if (trip.status) {
          statusSet.add(trip.status);
        }
      });
      setAvailableStatuses(Array.from(statusSet));
      
      // 如果列表为空，记录警告
      if (tripsList.length === 0) {
        console.warn(`⚠️ [TripsPage] [${loadId}] 行程列表为空，可能的原因：1) 确实没有行程 2) API返回格式不正确 3) 权限问题`);
        toast.warning('行程列表为空', {
          description: '如果您刚创建了行程，请稍等片刻后刷新页面',
          duration: 5000,
        });
      } else {
        console.log(`✅ [TripsPage] [${loadId}] 行程列表加载完成，共 ${tripsList.length} 个行程`);
        // 如果之前有刷新标记，显示成功提示
        const wasRefreshing = sessionStorage.getItem('trips-page-was-refreshing');
        if (wasRefreshing === 'true') {
          sessionStorage.removeItem('trips-page-was-refreshing');
          toast.success(`行程列表已更新，共 ${tripsList.length} 个行程`, {
            duration: 3000,
          });
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || '加载行程列表失败';
      console.error(`❌ [TripsPage] [${loadId}] 加载行程列表失败:`, {
        error: err,
        message: err.message,
        code: err.code,
        response: err.response,
        responseData: err.response?.data,
        responseStatus: err.response?.status,
        stack: err.stack,
      });
      
      setError(errorMessage);
      toast.error('加载行程列表失败', {
        description: errorMessage,
        duration: 5000,
        action: {
          label: '重试',
          onClick: () => loadTrips(),
        },
      });
      setTrips([]); // 出错时设置为空数组
      setAvailableStatuses([]);
    } finally {
      setLoading(false);
      console.log(`✅ [TripsPage] [${loadId}] loadTrips 函数执行完成，loading状态已设置为false`);
    }
  };

  // 加载收藏状态
  // 已移除：/trips/collected 接口已废弃
  // 收藏状态现在通过用户操作后的本地状态管理
  // const loadCollectedStatus = async () => {
  //   try {
  //     const collectedTrips = await tripsApi.getCollected();
  //     const collectedIds = new Set(collectedTrips.map((ct) => ct.trip.id));
  //     setCollectedTripIds(collectedIds);
  //   } catch (err: any) {
  //     // 静默处理错误，不影响主流程
  //     console.error('Failed to load collected status:', err);
  //   }
  // };

  // 处理收藏/取消收藏
  const handleCollect = async (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (collectingTripId) return;

    const isCollected = collectedTripIds.has(tripId);
    try {
      setCollectingTripId(tripId);
      if (isCollected) {
        await tripsApi.uncollect(tripId);
        setCollectedTripIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(tripId);
          // 保存到 localStorage
          localStorage.setItem('collectedTripIds', JSON.stringify(Array.from(newSet)));
          return newSet;
        });
        toast.success('已取消收藏');
      } else {
        await tripsApi.collect(tripId);
        setCollectedTripIds((prev) => {
          const newSet = new Set(prev).add(tripId);
          // 保存到 localStorage
          localStorage.setItem('collectedTripIds', JSON.stringify(Array.from(newSet)));
          return newSet;
        });
        toast.success('已收藏');
      }
    } catch (err: any) {
      console.error('Failed to toggle collection:', err);
      toast.error(err.message || '操作失败');
    } finally {
      setCollectingTripId(null);
    }
  };

  // 处理分享
  const handleShare = (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareTripId(tripId);
    setShareDialogOpen(true);
  };

  // 处理协作
  const handleCollaborate = (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollaboratorsTripId(tripId);
    setCollaboratorsDialogOpen(true);
  };

  const handleCreateTrip = () => {
    navigate('/dashboard/trips/new');
  };

  const handleTripClick = (tripId: string) => {
    navigate(`/dashboard/trips/${tripId}`);
  };

  // getMaturity, getMaturityColor 和 getMaturityText 已移除，未使用

  // ✅ 排序行程：取消的行程在最后面、已收藏+更新时间最新的优先级最高、其次是已收藏、之后是更新时间
  const sortedTrips = [...trips].sort((a, b) => {
    // 1. 已取消的行程排在最后
    if (a.status === 'CANCELLED' && b.status !== 'CANCELLED') return 1;
    if (a.status !== 'CANCELLED' && b.status === 'CANCELLED') return -1;
    if (a.status === 'CANCELLED' && b.status === 'CANCELLED') {
      // 两个都是已取消，按更新时间倒序
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    }

    // 2. 已收藏+更新时间最新的优先级最高
    const aIsCollected = collectedTripIds.has(a.id);
    const bIsCollected = collectedTripIds.has(b.id);
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();

    // 两个都收藏：按更新时间倒序
    if (aIsCollected && bIsCollected) {
      return bTime - aTime;
    }
    // 只有 a 收藏：a 在前
    if (aIsCollected && !bIsCollected) {
      return -1;
    }
    // 只有 b 收藏：b 在前
    if (!aIsCollected && bIsCollected) {
      return 1;
    }
    // 两个都不收藏：按更新时间倒序
    return bTime - aTime;
  });

  // 过滤行程
  const filteredTrips = statusFilter === 'all' 
    ? sortedTrips 
    : sortedTrips.filter(trip => trip.status === statusFilter);
  
  // 调试日志：记录过滤前后的数量（直接在渲染时记录，避免 useEffect 依赖问题）
  if (trips.length > 0 && process.env.NODE_ENV === 'development') {
    const filteredOut = statusFilter !== 'all' 
      ? sortedTrips.filter(trip => trip.status !== statusFilter)
      : [];
    if (filteredOut.length > 0 || filteredTrips.length !== trips.length) {
      console.log('🔍 [TripsPage] 行程过滤统计:', {
        总数量: trips.length,
        排序后数量: sortedTrips.length,
        当前过滤状态: statusFilter,
        过滤后数量: filteredTrips.length,
        可用状态列表: availableStatuses,
        过滤掉的行程: filteredOut.map(t => ({
          id: t.id,
          status: t.status,
          destination: t.destination,
        })),
      });
    }
  }

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
          {/* 状态筛选 - 根据实际接口返回的状态动态显示 */}
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              {availableStatuses.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {getTripStatusLabel(status as any)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* 行程卡片列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.length === 0 && trips.length > 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground mb-2">
                      当前筛选条件下没有行程
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      总共有 {trips.length} 个行程，但当前筛选状态 "{getTripStatusLabel(statusFilter as any)}" 下没有匹配的行程
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setStatusFilter('all')}
                    >
                      显示全部行程
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                {filteredTrips.map((trip) => {
                  if (!trip || !trip.id) return null;
              
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
                      <Badge 
                        className={getTripStatusClasses((trip.status || 'PLANNING') as any)} 
                        variant="outline"
                      >
                        {getTripStatusLabel((trip.status || 'PLANNING') as any)}
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
                      {/* 即将出发的行程显示目的地天气 */}
                      {trip.destination && trip.startDate && trip.status !== 'CANCELLED' && (
                        <div className="mt-2">
                          <TripCardWeather 
                            countryCode={trip.destination} 
                            startDate={trip.startDate}
                            showOnlyUpcoming={true}
                          />
                        </div>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 三人格评分 - 提示查看详情获取完整评估 */}
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Shield className={cn('w-4 h-4', getPersonaIconColorClasses('ABU'))} />
                          <span className="text-muted-foreground">Abu 评估</span>
                        </div>
                        <span className="text-xs text-muted-foreground">查看详情</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Activity className={cn('w-4 h-4', getPersonaIconColorClasses('DR_DRE'))} />
                          <span className="text-muted-foreground">Dr.Dre 评估</span>
                        </div>
                        <span className="text-xs text-muted-foreground">查看详情</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <RefreshCw className={cn('w-4 h-4', getPersonaIconColorClasses('NEPTUNE'))} />
                          <span className="text-muted-foreground">Neptune 评估</span>
                        </div>
                        <span className="text-xs text-muted-foreground">查看详情</span>
                      </div>
                    </div>

                    {/* 预算状态 */}
                    <div className="flex items-center justify-between text-sm border-t pt-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-muted-foreground">预算状态</span>
                      </div>
                      <span className="font-medium">
                        {formatTripBudget(trip)}
                      </span>
                    </div>

                    {/* 操作按钮 - 已取消状态下隐藏收藏、分享、协作 */}
                    {trip.status !== 'CANCELLED' && (
                      <div className="flex items-center gap-2 border-t pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "flex-1",
                            collectedTripIds.has(trip.id) && "text-red-600 hover:text-red-700"
                          )}
                          onClick={(e) => handleCollect(trip.id, e)}
                          disabled={collectingTripId === trip.id}
                        >
                          <Heart 
                            className={cn(
                              "w-4 h-4 mr-1",
                              collectedTripIds.has(trip.id) && "fill-current"
                            )} 
                          />
                          收藏
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => handleShare(trip.id, e)}
                        >
                          <Share2 className="w-4 h-4 mr-1" />
                          分享
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => handleCollaborate(trip.id, e)}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          协作
                        </Button>
                      </div>
                    )}

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
              </>
            )}
          </div>
        </>
      )}

      {/* 分享对话框 */}
      {shareTripId && (
        <ShareTripDialog
          tripId={shareTripId}
          open={shareDialogOpen}
          onOpenChange={(open) => {
            setShareDialogOpen(open);
            if (!open) {
              setShareTripId(null);
            }
          }}
        />
      )}

      {/* 协作者对话框 */}
      {collaboratorsTripId && (
        <CollaboratorsDialog
          tripId={collaboratorsTripId}
          open={collaboratorsDialogOpen}
          onOpenChange={(open) => {
            setCollaboratorsDialogOpen(open);
            if (!open) {
              setCollaboratorsTripId(null);
            }
          }}
        />
      )}
    </div>
  );
}
