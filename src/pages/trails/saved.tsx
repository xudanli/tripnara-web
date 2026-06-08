import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Bookmark,
  Download,
  MapPin,
  Mountain,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { trailOfflineStore } from '@/services/trail-offline-store';
import { formatPackSize } from '@/lib/build-trail-offline-pack';
import {
  fetchTrailBookmarksCloud,
  getTrailBookmarkIds,
  toggleTrailBookmark,
} from '@/lib/trail-bookmarks';
import type { TrailBookmarkItem } from '@/api/trail-bookmarks';
import { routeDirectionsApi } from '@/api/route-directions';
import type { TrailOfflinePackRecord } from '@/types/trail-offline';
import type { RouteDirection } from '@/types/places-routes';
import { StartHikePlanButton } from '@/components/hiking/StartHikePlanButton';

function bookmarkToRouteDirection(item: TrailBookmarkItem): RouteDirection {
  return {
    id: item.routeDirectionId,
    name: item.name ?? '',
    nameCN: item.nameCN ?? item.name ?? `路线 ${item.routeDirectionId}`,
    countryCode: '',
    regions: [],
    tags: ['徒步'],
    routeDirectionName: item.name,
    readinessScore: item.readinessScore,
    totalDistanceKm: item.totalDistanceKm,
    estimatedDays: item.estimatedDays,
    startPoint: item.startPoint,
  } as RouteDirection;
}

export default function TrailsSavedPage() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<TrailOfflinePackRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<RouteDirection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const packList = await trailOfflineStore.list();
      setPacks(packList);

      const cloud = await fetchTrailBookmarksCloud();
      if (cloud?.length) {
        setBookmarks(cloud.map(bookmarkToRouteDirection));
      } else {
        const bookmarkIds = getTrailBookmarkIds();
        if (bookmarkIds.length > 0) {
          const all = await routeDirectionsApi.query({ tag: '徒步', isActive: true });
          setBookmarks((all ?? []).filter((t) => bookmarkIds.includes(t.id)));
        } else {
          setBookmarks([]);
        }
      }
    } catch (e) {
      toast.error((e as Error).message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleDeletePack = async (id: number) => {
    try {
      await trailOfflineStore.delete(id);
      toast.success('已删除离线包');
      await loadAll();
    } catch (e) {
      toast.error((e as Error).message || '删除失败');
    }
  };

  const handleRemoveBookmark = async (id: number) => {
    try {
      await toggleTrailBookmark(id);
      setBookmarks((prev) => prev.filter((t) => t.id !== id));
      toast.success('已取消收藏');
    } catch (e) {
      toast.error((e as Error).message || '取消收藏失败');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/dashboard/trails')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回徒步中心
      </Button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">收藏 / 离线下载</h1>
          <p className="text-muted-foreground">收藏路线与已下载的离线数据包</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/trails/explore')}>
          去发现路线
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">加载中…</p>
      ) : (
        <Tabs defaultValue="bookmarks">
          <TabsList>
            <TabsTrigger value="bookmarks">
              收藏
              {bookmarks.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {bookmarks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="offline">
              离线下载
              {packs.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {packs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookmarks" className="mt-4 space-y-4">
            {bookmarks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">还没有收藏的路线</p>
                  <Button onClick={() => navigate('/dashboard/trails/explore')}>
                    去发现页收藏
                  </Button>
                </CardContent>
              </Card>
            ) : (
              bookmarks.map((trail) => (
                <Card key={trail.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{trail.nameCN}</CardTitle>
                    <CardDescription>
                      {trail.countryCode} · {trail.regions?.[0]}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/dashboard/trails/${trail.id}`)}
                    >
                      查看详情
                    </Button>
                    <StartHikePlanButton
                      size="sm"
                      routeDirectionId={trail.id}
                      nameCN={trail.nameCN}
                      routeDirectionName={trail.routeDirectionName}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveBookmark(trail.id)}
                    >
                      取消收藏
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="offline" className="mt-4 space-y-4">
            {packs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <WifiOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">还没有离线下载的路线</p>
                  <Button onClick={() => navigate('/dashboard/trails/explore')}>
                    <Download className="h-4 w-4 mr-2" />
                    去发现页下载
                  </Button>
                </CardContent>
              </Card>
            ) : (
              packs.map((pack) => (
                <Card key={pack.routeDirectionId}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-lg">{pack.nameCN}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {pack.countryCode} · {pack.regions.join(', ') || '—'}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        <WifiOff className="h-3 w-3 mr-1" />
                        离线
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">距离</span>
                        <p className="font-medium">
                          {pack.summary.totalDistanceKm != null
                            ? `${pack.summary.totalDistanceKm.toFixed(0)} km`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">爬升</span>
                        <p className="font-medium flex items-center gap-1">
                          <Mountain className="h-3 w-3" />
                          {pack.summary.totalAscentM != null
                            ? `+${pack.summary.totalAscentM}m`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">体积</span>
                        <p className="font-medium">{formatPackSize(pack.sizeBytes)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">下载时间</span>
                        <p className="font-medium text-xs">
                          {new Date(pack.downloadedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(`/dashboard/trails/${pack.routeDirectionId}`)
                        }
                      >
                        查看详情
                      </Button>
                      <StartHikePlanButton
                        size="sm"
                        routeDirectionId={pack.routeDirectionId}
                        nameCN={pack.nameCN}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDeletePack(pack.routeDirectionId)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        删除离线包
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
