import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import type { FeaturedTrip } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Calendar, MapPin, DollarSign, ThumbsUp, Heart, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { getTripStatusClasses, getTripStatusLabel } from '@/lib/trip-status';

export default function FeaturedTripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<FeaturedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeaturedTrips();
  }, []);

  const loadFeaturedTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tripsApi.getFeatured(20); // 获取前20个热门推荐
      setTrips(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || '加载热门推荐失败');
      console.error('Failed to load featured trips:', err);
      setTrips([]);
    } finally {
      setLoading(false);
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
          <Button onClick={loadFeaturedTrips} className="mt-4" variant="outline">
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
          <div className="flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-bold">热门推荐</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            发现最受欢迎的行程，获取旅行灵感
          </p>
        </div>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>暂无热门推荐</EmptyTitle>
                <EmptyDescription>热门行程将根据点赞数和收藏数推荐</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => {
            if (!trip || !trip.id) return null;
            return (
              <Card
                key={trip.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleTripClick(trip.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{trip.destination || '未知目的地'}</CardTitle>
                    <Badge 
                      className={getTripStatusClasses((trip.status || 'PLANNING') as any)} 
                      variant="outline"
                    >
                      {getTripStatusLabel((trip.status || 'PLANNING') as any)}
                    </Badge>
                  </div>
                  <CardDescription>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {trip.startDate
                            ? format(new Date(trip.startDate), 'yyyy-MM-dd')
                            : 'N/A'}{' '}
                          -{' '}
                          {trip.endDate ? format(new Date(trip.endDate), 'yyyy-MM-dd') : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{trip.destination || '未知'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>¥{((trip.totalBudget ?? 0) as number).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-4 pt-2 border-t">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{trip.likeCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Heart className="w-4 h-4" />
                        <span>{trip.collectionCount || 0}</span>
                      </div>
                      {trip.popularityScore && (
                        <div className="flex items-center gap-1 text-sm text-orange-600 font-medium">
                          <TrendingUp className="w-4 h-4" />
                          <span>热度 {trip.popularityScore.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

