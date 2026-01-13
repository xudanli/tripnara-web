import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import type { TripListItem } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle, EmptyMedia } from '@/components/ui/empty';
import { Calendar, DollarSign, Trash2, ArrowRight, Info } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/format';
import { getTripStatusClasses, getTripStatusLabel } from '@/lib/trip-status';
import { countriesApi } from '@/api/countries';
import type { Country } from '@/types/country';
import { toast } from 'sonner';
import { TripPlanning } from '@/components/illustrations';

export default function CollectedTripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [collectedTripIds, setCollectedTripIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryMap, setCountryMap] = useState<Map<string, Country>>(new Map());
  const [uncollectingTripId, setUncollectingTripId] = useState<string | null>(null);

  useEffect(() => {
    loadCountries();
    loadCollectedTrips();
  }, []);

  // 加载国家列表
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
    }
  };

  // 根据国家代码获取国家名称
  const getCountryName = (countryCode: string): string => {
    const country = countryMap.get(countryCode);
    if (country) {
      return country.nameCN;
    }
    return countryCode;
  };

  // 根据国家代码获取货币代码
  const getCurrencyCode = (countryCode: string): string => {
    const country = countryMap.get(countryCode);
    if (country && country.currencyCode) {
      return country.currencyCode;
    }
    return 'CNY';
  };

  // 格式化行程预算
  const formatTripBudget = (trip: TripListItem): string => {
    const amount = (trip.totalBudget ?? 0) as number;
    const currencyCode = getCurrencyCode(trip.destination);
    return formatCurrency(amount, currencyCode);
  };

  const loadCollectedTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 由于 /trips/collected 接口已废弃，我们从所有行程中筛选已收藏的
      // 通过检查每个行程的收藏状态来确定
      const allTrips = await tripsApi.getAll();
      
      // 由于无法直接获取收藏列表，我们需要通过其他方式判断
      // 这里暂时显示所有行程，并提示用户功能限制
      // 实际应用中，可以通过本地存储或从主页面传递收藏状态
      setTrips(allTrips);
      
      // 尝试从 localStorage 获取收藏状态（如果主页面有保存）
      const storedCollected = localStorage.getItem('collectedTripIds');
      if (storedCollected) {
        try {
          const ids = JSON.parse(storedCollected);
          setCollectedTripIds(new Set(ids));
        } catch (e) {
          console.error('Failed to parse stored collected trips:', e);
        }
      }
    } catch (err: any) {
      setError(err.message || '加载收藏列表失败');
      console.error('Failed to load collected trips:', err);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  // 筛选出已收藏的行程
  const collectedTrips = trips.filter(trip => collectedTripIds.has(trip.id));

  const handleUncollect = async (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (uncollectingTripId) return;

    try {
      setUncollectingTripId(tripId);
      await tripsApi.uncollect(tripId);
      setCollectedTripIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tripId);
        // 更新 localStorage
        localStorage.setItem('collectedTripIds', JSON.stringify(Array.from(newSet)));
        return newSet;
      });
      toast.success('已取消收藏');
    } catch (err: any) {
      console.error('Failed to uncollect trip:', err);
      toast.error(err.message || '取消收藏失败');
    } finally {
      setUncollectingTripId(null);
    }
  };

  const handleTripClick = (tripId: string) => {
    navigate(`/dashboard/trips/${tripId}`);
  };

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
          <Button onClick={loadCollectedTrips} className="mt-4" variant="outline">
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
          <h1 className="text-3xl font-bold">我的收藏</h1>
          <p className="text-muted-foreground mt-1">查看您收藏的所有行程</p>
        </div>
      </div>

      {/* 功能限制提示 */}
      {collectedTripIds.size === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-blue-800">
                  由于后端接口限制，收藏列表功能暂时通过本地状态管理。
                  您可以在"我的行程"页面收藏行程，收藏状态会保存在本地。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {collectedTrips.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyMedia>
                <TripPlanning size={280} color="#6b7280" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>还没有收藏</EmptyTitle>
                <EmptyDescription>
                  在"我的行程"页面收藏您感兴趣的行程，方便以后查看
                </EmptyDescription>
              </EmptyHeader>
              <Button onClick={() => navigate('/dashboard/trips')} className="mt-4">
                前往我的行程
              </Button>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collectedTrips.map((trip) => {
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleUncollect(trip.id, e)}
                        className="text-red-500 hover:text-red-700"
                        disabled={uncollectingTripId === trip.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
                  {/* 状态 */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">状态</span>
                    <span className={getTripStatusClasses((trip.status || 'PLANNING') as any)}>
                      {getTripStatusLabel((trip.status || 'PLANNING') as any)}
                    </span>
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

                  {/* 进入行程按钮 */}
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTripClick(trip.id);
                    }}
                  >
                    查看详情
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


