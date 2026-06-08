import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { routeDirectionShareApi } from '@/api/route-direction-share';
import type { SharedRouteDirectionResponse } from '@/types/route-direction-share';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { MapboxTrailMap } from '@/components/map';
import { polylineToCoordinates, supplyPoiMarkerColor } from '@/lib/map-geo';
import {
  pickDaySkeleton,
  pickPolyline,
  pickSupplyPois,
} from '@/lib/hiking-trail-detail-ui';
import { StartHikePlanButton } from '@/components/hiking/StartHikePlanButton';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  MapPin,
  Mountain,
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export default function SharedTrailPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<SharedRouteDirectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shareToken) void loadShared();
  }, [shareToken]);

  const loadShared = async () => {
    if (!shareToken) return;
    try {
      setLoading(true);
      setError(null);
      const res = await routeDirectionShareApi.getShared(shareToken);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载分享路线失败');
    } finally {
      setLoading(false);
    }
  };

  const trail = data?.routeDirection;
  const hd = trail?.hikingDetail;
  const daySkeleton = useMemo(() => pickDaySkeleton(hd), [hd]);
  const supplyPois = useMemo(() => pickSupplyPois(hd), [hd]);
  const summary = hd?.summary;
  const trailMapLine = useMemo(() => polylineToCoordinates(pickPolyline(hd)), [hd]);
  const trailMapMarkers = useMemo(
    () =>
      supplyPois.map((p) => ({
        id: p.id,
        lng: p.lng,
        lat: p.lat,
        label: p.nameCN,
        color: supplyPoiMarkerColor(p.subCategory),
      })),
    [supplyPois]
  );

  const totalDistanceKm = useMemo(() => {
    if (summary?.totalDistanceKm != null) return summary.totalDistanceKm;
    return daySkeleton.reduce((s, d) => s + d.distanceKm, 0);
  }, [summary, daySkeleton]);

  const totalAscentM = useMemo(() => {
    if (summary?.totalAscentM != null) return summary.totalAscentM;
    return daySkeleton.reduce((s, d) => s + d.ascentM, 0);
  }, [summary, daySkeleton]);

  const suggestedDays =
    summary?.suggestedDays ??
    (daySkeleton.length > 0 ? daySkeleton.length : trail?.constraints?.minDays);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !data || !trail) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-red-600">{error || '分享链接无效或已过期'}</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit = data.permission === 'EDIT';
  const currentMonth = new Date().getMonth() + 1;
  const isBestMonth = trail.seasonality?.bestMonths?.includes(currentMonth);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{canEdit ? '可编辑' : '仅查看'}</Badge>
            {data.expiresAt && (
              <Badge variant="secondary" className="text-xs">
                有效期至 {new Date(data.expiresAt).toLocaleString('zh-CN')}
              </Badge>
            )}
          </div>
          {isAuthenticated ? (
            <StartHikePlanButton
              routeDirectionId={trail.id}
              nameCN={trail.nameCN}
              routeDirectionName={trail.routeDirectionName}
              size="default"
            />
          ) : (
            <Button variant="outline" onClick={() => navigate('/login')}>
              登录后开始准备
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-3xl">{trail.nameCN}</CardTitle>
                  <Badge variant={isBestMonth ? 'default' : 'secondary'}>
                    {isBestMonth ? '最佳季节' : '非最佳季节'}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1 text-base">
                  <MapPin className="h-4 w-4" />
                  {trail.countryCode} · {trail.regions?.join(', ')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <Stat
                value={
                  summary?.maxElevationM ?? trail.constraints?.soft?.maxElevationM
                    ? `${summary?.maxElevationM ?? trail.constraints?.soft?.maxElevationM}m`
                    : '—'
                }
                label="最高点"
                icon={<Mountain className="h-3 w-3" />}
              />
              <Stat
                value={totalAscentM > 0 ? `+${totalAscentM}m` : '—'}
                label="累计爬升"
                icon={<TrendingUp className="h-3 w-3" />}
              />
              <Stat
                value={suggestedDays != null ? `${suggestedDays} 天` : '—'}
                label="建议天数"
                icon={<Clock className="h-3 w-3" />}
              />
              <Stat
                value={totalDistanceKm > 0 ? `${totalDistanceKm.toFixed(0)} km` : '—'}
                label="距离"
              />
              <Stat
                value={summary?.difficulty || trail.riskProfile?.level || '—'}
                label="难度"
                icon={<AlertTriangle className="h-3 w-3" />}
              />
            </div>

            <MapboxTrailMap
              height={320}
              lineCoordinates={trailMapLine}
              markers={trailMapMarkers}
              mapStyle="outdoors"
              fitBounds={trailMapLine.length >= 2 || trailMapMarkers.length > 0}
              emptyMessage="暂无轨迹数据"
            />

            {daySkeleton.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-semibold">按日分段</h3>
                {daySkeleton.map((day) => (
                  <div
                    key={day.day}
                    className="rounded-lg border px-3 py-2 text-sm text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      Day {day.day} · {day.theme}
                    </span>
                    {' — '}
                    {day.distanceKm} km · 爬升 ↑{day.ascentM} m
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          通过分享链接查看 · 路线 ID {trail.id}
        </p>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
        {icon}
        {label}
      </div>
    </div>
  );
}
