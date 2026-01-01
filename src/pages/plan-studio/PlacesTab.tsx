import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Clock } from 'lucide-react';
import { placesApi } from '@/api/places';
import { tripsApi, itineraryItemsApi } from '@/api/trips';
import type { PlaceWithDistance } from '@/types/places-routes';
import type { TripDetail, CreateItineraryItemRequest } from '@/types/trip';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';
import { format } from 'date-fns';

interface PlacesTabProps {
  tripId: string;
  personaMode?: PersonaMode;
}

type SearchMode = 'search' | 'nearby' | 'recommend';

export default function PlacesTab({ tripId, personaMode = 'abu' }: PlacesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('search');
  const [results, setResults] = useState<PlaceWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 加入功能相关状态
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithDistance | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [adding, setAdding] = useState(false);

  // 加载行程信息
  useEffect(() => {
    loadTrip();
    // 获取用户位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('获取位置失败:', error);
        }
      );
    }
  }, [tripId]);

  const loadTrip = async () => {
    try {
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err) {
      console.error('Failed to load trip:', err);
    }
  };

  const handleSearch = async () => {
    if (searchMode === 'search' && !searchQuery.trim()) {
      setError('请输入搜索关键词');
      return;
    }

    if (searchMode === 'nearby' && !userLocation) {
      setError('需要获取您的位置才能查找附近地点');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let searchResults: PlaceWithDistance[] = [];

      if (searchMode === 'search') {
        searchResults = await placesApi.searchPlaces({
          q: searchQuery,
          lat: userLocation?.lat,
          lng: userLocation?.lng,
          limit: 20,
        });
      } else if (searchMode === 'nearby') {
        searchResults = await placesApi.getNearbyPlaces({
          lat: userLocation!.lat,
          lng: userLocation!.lng,
          radius: 5000, // 5km
        });
      } else if (searchMode === 'recommend') {
        const recommendations = await placesApi.getRecommendations({
          tripId,
          limit: 20,
        });
        // 转换类型，因为getRecommendations返回的是TripPlace[]，但结构类似
        searchResults = recommendations.map((p: any) => ({
          id: p.id,
          nameCN: p.nameCN,
          nameEN: p.nameEN,
          category: p.category,
          latitude: p.latitude,
          longitude: p.longitude,
          address: p.address,
          rating: p.rating,
          metadata: p.metadata,
          distance: 0, // 推荐结果可能没有距离信息
        })) as PlaceWithDistance[];
      }

      setResults(searchResults);
    } catch (err: any) {
      setError(err.message || '搜索失败，请稍后重试');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlace = (place: PlaceWithDistance) => {
    setSelectedPlace(place);
    setAddDialogOpen(true);
    if (trip?.TripDay && trip.TripDay.length > 0) {
      setSelectedDayId(trip.TripDay[0].id);
    }
  };

  const handleConfirmAdd = async () => {
    if (!selectedPlace || !selectedDayId) return;

    try {
      setAdding(true);
      const now = new Date();
      const startTime = new Date(now);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(10, 0, 0, 0); // 默认1小时

      const data: CreateItineraryItemRequest = {
        tripDayId: selectedDayId,
        placeId: selectedPlace.id,
        type: 'ACTIVITY',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };

      await itineraryItemsApi.create(data);
      setAddDialogOpen(false);
      setSelectedPlace(null);
      // 可以显示成功提示
    } catch (err: any) {
      setError(err.message || '添加地点失败');
      console.error('Failed to add place:', err);
    } finally {
      setAdding(false);
    }
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>找点</CardTitle>
          <CardDescription>搜索、附近、推荐 - 证据展示</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2" data-tour="places-search">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchMode === 'search') {
                    handleSearch();
                  }
                }}
                placeholder={searchMode === 'nearby' ? '点击"附近"按钮搜索' : searchMode === 'recommend' ? '点击"推荐"按钮获取推荐' : '搜索地点...'}
                className="pl-10"
                disabled={searchMode !== 'search'}
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={loading || (searchMode === 'search' && !searchQuery.trim())}
            >
              {loading ? <Spinner className="w-4 h-4 mr-2" /> : null}
              {searchMode === 'search' ? '搜索' : searchMode === 'nearby' ? '附近' : '推荐'}
            </Button>
            <Button 
              variant={searchMode === 'nearby' ? 'default' : 'outline'}
              onClick={() => {
                setSearchMode('nearby');
                setSearchQuery('');
                setResults([]);
              }}
            >
              附近
            </Button>
            <Button 
              variant={searchMode === 'recommend' ? 'default' : 'outline'}
              onClick={() => {
                setSearchMode('recommend');
                setSearchQuery('');
                setResults([]);
              }}
            >
              推荐
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* 搜索结果 */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-8 h-8" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              {results.map((place) => (
                <Card key={place.id} className="cursor-pointer hover:border-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold">{place.nameCN || place.nameEN}</h3>
                          {place.rating && (
                            <Badge>{place.rating.toFixed(1)}分</Badge>
                          )}
                          {place.category && (
                            <Badge variant="outline">{place.category}</Badge>
                          )}
                        </div>
                        {place.address && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {place.address}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground" data-tour="places-evidence">
                          {place.metadata?.openingHours && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Object.values(place.metadata.openingHours)[0] || '营业时间未知'}
                            </span>
                          )}
                          {place.distance && (
                            <span>距离 {place.distance > 1000 ? `${(place.distance / 1000).toFixed(1)}km` : `${place.distance}m`}</span>
                          )}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAddPlace(place)}
                      >
                        加入
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !loading && searchMode !== 'recommend' ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchMode === 'nearby' ? '点击"附近"按钮查找附近地点' : '请输入关键词搜索地点'}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 添加地点对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>添加到行程</DialogTitle>
            <DialogDescription>
              选择要将"{selectedPlace?.nameCN || selectedPlace?.nameEN}"添加到哪一天
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {trip && trip.TripDay && trip.TripDay.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="day">选择日期</Label>
                <Select value={selectedDayId} onValueChange={setSelectedDayId}>
                  <SelectTrigger id="day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {trip.TripDay.map((day, index) => (
                      <SelectItem key={day.id} value={day.id}>
                        Day {index + 1} - {format(new Date(day.date), 'yyyy-MM-dd')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                暂无可用的行程日期
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={adding}>
              取消
            </Button>
            <Button onClick={handleConfirmAdd} disabled={adding || !selectedDayId}>
              {adding ? <Spinner className="w-4 h-4 mr-2" /> : null}
              确认添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
