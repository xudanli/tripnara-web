import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import type { TripListCardDto } from '@/types/trip-list';
import type { Country } from '@/types/country';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle, EmptyMedia } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ShieldX } from 'lucide-react';
import { TripPlanning } from '@/components/illustrations';
import { ShareTripDialog } from '@/components/trips/ShareTripDialog';
import { CollaboratorsDialog } from '@/components/trips/CollaboratorsDialog';
import TripListCard from '@/components/trips/list/TripListCard';
import TripListCreateCard from '@/components/trips/list/TripListCreateCard';
import { TripCoverDialog } from '@/components/trips/list/TripCoverDialog';
import { tripListUi } from '@/components/trips/list/trip-list-ui';
import { toast } from 'sonner';
import { shouldShowNlItemsGeneratingPlaceholder } from '@/lib/trip-planning-complete';
import { buildPlanningWorkbenchPath } from '@/lib/travel-status-navigation.util';
import {
  getTripPlanningAvailabilityLabel,
  resolveTripPlanningAvailability,
} from '@/lib/trip-content-mode';
import { sortTripsForList } from '@/lib/trip-list.util';
import { buildTripCoverMetadataPatch } from '@/lib/trip-cover.util';
import { ParticipantProjectsBanner } from '@/features/participant-portal';

export default function TripsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [trips, setTrips] = useState<TripListCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryMap, setCountryMap] = useState<Map<string, Country>>(new Map());
  
  // 收藏、分享、协作相关状态
  const [collectedTripIds, setCollectedTripIds] = useState<Set<string>>(new Set());
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTripId, setShareTripId] = useState<string | null>(null);
  const [collaboratorsDialogOpen, setCollaboratorsDialogOpen] = useState(false);
  const [collaboratorsTripId, setCollaboratorsTripId] = useState<string | null>(null);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [coverTripId, setCoverTripId] = useState<string | null>(null);

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

  // 为无 BFF 封面的行程，补拉 CountryProfile.coverImageUrl（与 listSummary 同源）
  const loadCountryCoversForTrips = async (tripsList: TripListCardDto[]) => {
    const codesNeedingCover = new Set<string>();
    for (const trip of tripsList) {
      if (!trip.destination) continue;
      const summaryCover = trip.listSummary?.coverImageUrl;
      if (typeof summaryCover === 'string' && summaryCover.trim()) continue;
      codesNeedingCover.add(trip.destination);
    }
    if (codesNeedingCover.size === 0) return;

    const entries = await Promise.all(
      [...codesNeedingCover].map(async (code) => {
        try {
          const profile = await countriesApi.getCountryProfile(code);
          return [code, profile.coverImageUrl ?? null] as const;
        } catch {
          return [code, null] as const;
        }
      }),
    );

    setCountryMap((prev) => {
      const next = new Map(prev);
      for (const [code, coverImageUrl] of entries) {
        if (!coverImageUrl) continue;
        const existing = next.get(code);
        if (existing) {
          next.set(code, { ...existing, coverImageUrl });
        }
      }
      return next;
    });
  };

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
      
      const apiPromise = tripsApi.getListPage();
      
      console.log(`🔄 [TripsPage] [${loadId}] 等待API响应...`);
      const listPage = await Promise.race([apiPromise, timeoutPromise]) as Awaited<
        ReturnType<typeof tripsApi.getListPage>
      >;
      const data = listPage.trips;
      
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
      void loadCountryCoversForTrips(tripsList);
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
      setTrips([]);
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

  const handleSetCover = (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCoverTripId(tripId);
    setCoverDialogOpen(true);
  };

  const handleCoverSaved = async (payload: {
    tripId: string;
    coverImageSource: 'auto' | 'poi' | 'user';
    coverImageUrl?: string | null;
    coverPlaceId?: number | null;
    previewUrl?: string;
  }) => {
    if (payload.coverImageSource === 'poi' || payload.coverImageSource === 'user') {
      const resolvedCoverUrl = payload.coverImageUrl ?? payload.previewUrl;
      setTrips((prev) =>
        prev.map((trip) => {
          if (trip.id !== payload.tripId) return trip;

          const metadata = buildTripCoverMetadataPatch(
            trip.metadata as Record<string, unknown> | undefined,
            {
              coverImageSource: payload.coverImageSource,
              coverPlaceId: payload.coverPlaceId ?? null,
              coverImageUrl: payload.coverImageUrl ?? null,
            },
          );

          return {
            ...trip,
            metadata,
            listSummary: trip.listSummary
              ? {
                  ...trip.listSummary,
                  coverImageUrl: resolvedCoverUrl ?? trip.listSummary.coverImageUrl ?? null,
                }
              : resolvedCoverUrl
                ? {
                    displayStatus: 'planning',
                    displayStatusLabel: '规划中',
                    coverImageUrl: resolvedCoverUrl,
                    durationDays: trip.days?.length ?? 0,
                    memberCount: 1,
                  }
                : trip.listSummary,
          };
        }),
      );
      return;
    }

    // auto：封面由 BFF 解析，保存后刷新列表
    await loadTrips();
  };

  const handleCreateTrip = () => {
    navigate('/dashboard/trips/new');
  };

  const [checkingTripId, setCheckingTripId] = useState<string | null>(null);

  const handleTripClick = async (tripId: string) => {
    if (checkingTripId === tripId) return;
    const listItem = trips.find((trip) => trip.id === tripId);
    const listAvailability = resolveTripPlanningAvailability(listItem);
    const listRepair = (listItem?.metadata as Record<string, any> | undefined)?.repairContract;
    const listGenerationProgress = (listItem?.metadata as Record<string, any> | undefined)?.generationProgress;
    if (listAvailability !== 'ready') {
      toast.info(getTripPlanningAvailabilityLabel(listAvailability), {
        description:
          listAvailability === 'collecting_info'
            ? '这个行程草稿还缺少规划信息，请继续在创建对话里补齐。'
            : listAvailability === 'failed'
              ? (typeof listGenerationProgress?.message === 'string'
                  ? listGenerationProgress.message
                  : listRepair?.violation === 'INSUFFICIENT_POI_CANDIDATES'
                    ? 'POI 候选不足，请补充城市/区域或导入目的地 POI 数据。'
                    : '生成失败，请稍后重试或重新创建行程。')
              : listAvailability === 'ready_to_generate'
                ? '规划骨架已初始化，但还没有生成 POI 方案。'
                : '行程规划还没完成，完成后才能进入详情页。',
      });
      return;
    }

    setCheckingTripId(tripId);
    try {
      const trip = await tripsApi.getById(tripId);
      const detailAvailability = resolveTripPlanningAvailability(trip);
      if (detailAvailability !== 'ready') {
        toast.info(getTripPlanningAvailabilityLabel(detailAvailability), {
          description:
            detailAvailability === 'collecting_info'
              ? '这个行程草稿还缺少规划信息，请继续补齐后再查看详情。'
              : detailAvailability === 'failed'
                ? '生成失败，请稍后重试或重新创建行程。'
                : detailAvailability === 'ready_to_generate'
                  ? '规划骨架已初始化，但还没有生成 POI 方案。'
                  : '行程规划还没完成，完成后才能进入详情页。',
        });
        await loadTrips();
        return;
      }
      if (shouldShowNlItemsGeneratingPlaceholder(trip)) {
        const progress = trip.metadata?.generationProgress;
        if (progress?.status === 'failed') {
          toast.error('行程项生成失败', {
            description: progress.message || '请稍后重试',
          });
        } else {
          toast.info('行程项生成中', {
            description: '预计需要 2–5 分钟，请稍后刷新或直接访问行程查看进度',
          });
        }
        return;
      }
      navigate(
        trip.status === 'PLANNING'
          ? buildPlanningWorkbenchPath(tripId)
          : `/dashboard/trips/${tripId}`,
      );
    } catch (err) {
      console.error('Failed to check trip before navigation:', err);
      toast.error('无法加载行程，请重试');
    } finally {
      setCheckingTripId(null);
    }
  };

  // getMaturity, getMaturityColor 和 getMaturityText 已移除，未使用

  const sortedTrips = sortTripsForList(trips, collectedTripIds);

  if (loading) {
    return (
      <div className={tripListUi.page}>
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className={tripListUi.cardGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[340px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
          <ShieldX className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground">{error}</p>
            <Button onClick={loadTrips} className="mt-4" variant="outline">
              重试
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={tripListUi.page}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">我的旅行计划</h1>
        <p className="text-sm text-muted-foreground mt-1">管理和查看您的所有行程</p>
      </div>

      <ParticipantProjectsBanner className="max-w-3xl" />

      {trips.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyMedia>
                <TripPlanning size={280} className="text-muted-foreground" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>还没有行程</EmptyTitle>
                <EmptyDescription>创建您的第一个行程，开始规划您的旅行</EmptyDescription>
              </EmptyHeader>
              <div className="mt-4 flex justify-center">
                <Button onClick={handleCreateTrip} className={tripListUi.primaryBtn}>
                  <Plus className="w-4 h-4 mr-2" />
                  创建行程
                </Button>
              </div>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className={tripListUi.cardGrid}>
            {sortedTrips.map((trip) => {
              if (!trip?.id) return null;
              return (
                <TripListCard
                  key={trip.id}
                  trip={trip}
                  countryName={
                    trip.destinationLabel ??
                    (trip.destination ? getCountryName(trip.destination) : '未知目的地')
                  }
                  countryCoverImageUrl={countryMap.get(trip.destination)?.coverImageUrl}
                  checking={checkingTripId === trip.id}
                  onOpen={handleTripClick}
                  onShare={handleShare}
                  onCollaborate={handleCollaborate}
                  onSetCover={handleSetCover}
                  onRefresh={(_, e) => {
                    e.stopPropagation();
                    loadTrips();
                  }}
                />
              );
            })}
            <TripListCreateCard onCreate={handleCreateTrip} />
          </div>
        </>
      )}

      {shareTripId && (
        <ShareTripDialog
          tripId={shareTripId}
          open={shareDialogOpen}
          onOpenChange={(open) => {
            setShareDialogOpen(open);
            if (!open) setShareTripId(null);
          }}
        />
      )}

      {collaboratorsTripId && (
        <CollaboratorsDialog
          tripId={collaboratorsTripId}
          open={collaboratorsDialogOpen}
          onOpenChange={(open) => {
            setCollaboratorsDialogOpen(open);
            if (!open) setCollaboratorsTripId(null);
          }}
        />
      )}

      <TripCoverDialog
        tripId={coverTripId}
        open={coverDialogOpen}
        onOpenChange={(open) => {
          setCoverDialogOpen(open);
          if (!open) setCoverTripId(null);
        }}
        onSaved={handleCoverSaved}
      />
    </div>
  );
}
