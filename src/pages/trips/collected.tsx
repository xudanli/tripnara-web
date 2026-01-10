import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import type { CollectedTrip } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Calendar, MapPin, DollarSign, Heart, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function CollectedTripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<CollectedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCollectedTrips();
  }, []);

  const loadCollectedTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      // 已移除：/trips/collected 接口已废弃
      // const data = await tripsApi.getCollected();
      // setTrips(data);
      setTrips([]); // 返回空列表
      setError('收藏列表功能暂时不可用：/trips/collected 接口已废弃');
    } catch (err: any) {
      setError(err.message || '加载收藏列表失败');
      console.error('Failed to load collected trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUncollect = async (tripId: string) => {
    try {
      await tripsApi.uncollect(tripId);
      setTrips(trips.filter((t) => t.trip.id !== tripId));
    } catch (err: any) {
      console.error('Failed to uncollect trip:', err);
    }
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
      <div>
        <h1 className="text-3xl font-bold">我的收藏</h1>
        <p className="text-muted-foreground mt-1">查看您收藏的所有行程</p>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>还没有收藏</EmptyTitle>
                <EmptyDescription>收藏您感兴趣的行程，方便以后查看</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((collected) => {
            const trip = collected.trip;
            return (
              <Card key={collected.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{trip.destination}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUncollect(trip.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(trip.startDate), 'yyyy-MM-dd')} -{' '}
                          {format(new Date(trip.endDate), 'yyyy-MM-dd')}
                        </span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{trip.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>¥{((trip.totalBudget ?? 0) as number).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{trip.TripDay.length} 天</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Heart className="w-4 h-4" />
                      <span>收藏于 {format(new Date(collected.createdAt), 'yyyy-MM-dd')}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    onClick={() => navigate(`/dashboard/trips/${trip.id}`)}
                  >
                    查看详情
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


