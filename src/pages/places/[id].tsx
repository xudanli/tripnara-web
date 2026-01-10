import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { placesApi } from '@/api/places';
import type { Place } from '@/types/places-routes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, MapPin, Star, Clock, TrendingUp, Navigation } from 'lucide-react';

export default function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPlace();
    }
  }, [id]);

  const loadPlace = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await placesApi.getPlaceDetail(Number(id));
      setPlace(data);
    } catch (err: any) {
      setError(err.message || '加载地点详情失败');
      console.error('Failed to load place:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error || '地点不存在'}</p>
            <Button onClick={() => navigate(-1)} className="mt-4" variant="outline">
              返回
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {place.nameCN || place.nameEN || `地点 ${place.id}`}
          </h1>
          {place.nameEN && place.nameCN && (
            <p className="text-muted-foreground mt-1">{place.nameEN}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：主要信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline">{place.category}</Badge>
                {place.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{place.rating.toFixed(1)}</span>
                  </div>
                )}
                {place.City && (
                  <span className="text-sm text-muted-foreground">
                    {place.City.nameCN || place.City.nameEN}
                  </span>
                )}
              </div>

              {place.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                  <span>{place.address}</span>
                </div>
              )}

              {place.latitude && place.longitude && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Navigation className="w-4 h-4" />
                  <span>
                    坐标: {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
                  </span>
                </div>
              )}

              {place.metadata?.description && (
                <div>
                  <h3 className="font-semibold mb-2">简介</h3>
                  <p className="text-muted-foreground">{place.metadata.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 营业时间 */}
          {place.metadata?.openingHours && (
            <Card>
              <CardHeader>
                <CardTitle>营业时间</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(place.metadata.openingHours).map(([day, time]) => (
                    <div key={day} className="flex justify-between">
                      <span className="font-medium">{day}</span>
                      <span className="text-muted-foreground">{time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 门票价格 */}
          {place.metadata?.ticketPrice && (
            <Card>
              <CardHeader>
                <CardTitle>门票价格</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{place.metadata.ticketPrice}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：元数据 */}
        <div className="space-y-6">
          {/* 物理元数据 */}
          {place.physicalMetadata && (
            <Card>
              <CardHeader>
                <CardTitle>游玩信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {place.physicalMetadata.estimated_duration_min && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">预计游玩时长</div>
                      <div className="font-semibold">
                        {place.physicalMetadata.estimated_duration_min} 分钟
                      </div>
                    </div>
                  </div>
                )}

                {place.physicalMetadata.intensity_factor && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">强度因子</div>
                      <div className="font-semibold">
                        {place.physicalMetadata.intensity_factor.toFixed(1)}
                      </div>
                    </div>
                  </div>
                )}

                {place.physicalMetadata.walking_distance_m && (
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">步行距离</div>
                      <div className="font-semibold">
                        {place.physicalMetadata.walking_distance_m} 米
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 支付方式 */}
          {place.metadata?.paymentMethods && place.metadata.paymentMethods.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>支付方式</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {place.metadata.paymentMethods.map((method) => (
                    <Badge key={method} variant="secondary">
                      {method}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

