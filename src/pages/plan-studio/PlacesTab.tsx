import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Search, MapPin, Clock, Star } from 'lucide-react';
import { placesApi } from '@/api/places';
import { tripsApi, itineraryItemsApi } from '@/api/trips';
import type { PlaceWithDistance, PlaceCategory } from '@/types/places-routes';
import type { TripDetail, CreateItineraryItemRequest } from '@/types/trip';
// PersonaMode 已移除 - 三人格现在是系统内部工具
import { format } from 'date-fns';
import { EmptyPlacesIllustration } from '@/components/illustrations';
import { orchestrator } from '@/services/orchestrator';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import type { ApprovalRequest } from '@/types/approval';

interface PlacesTabProps {
  tripId: string;
  onPlaceAdded?: () => void; // 添加成功后的回调
}

type SearchMode = 'search' | 'nearby' | 'recommend';

export default function PlacesTab({ tripId, onPlaceAdded }: PlacesTabProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // 审批功能
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  
  const handleApprovalComplete = async (approved: boolean, approval: ApprovalRequest) => {
    if (approved) {
      toast.success('审批已批准，系统正在继续执行...');
      // 刷新行程数据
      await loadTrip();
      if (onPlaceAdded) {
        onPlaceAdded();
      }
    } else {
      toast.info('审批已拒绝，系统将调整策略');
    }
    setApprovalDialogOpen(false);
    setPendingApprovalId(null);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('search');
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | 'all'>('all');
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          console.warn(t('planStudio.placesTab.getLocationFailed'), error);
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
      setError(t('planStudio.placesTab.enterSearchKeyword'));
      return;
    }

    if (searchMode === 'nearby' && !userLocation) {
      setError(t('planStudio.placesTab.needLocationForNearby'));
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
          type: selectedCategory !== 'all' ? selectedCategory : undefined,
          countryCode: trip?.destination, // 根据行程的国家进行过滤
        });
      } else if (searchMode === 'nearby') {
        searchResults = await placesApi.getNearbyPlaces({
          lat: userLocation!.lat,
          lng: userLocation!.lng,
          radius: 5000, // 5km
          type: selectedCategory !== 'all' ? selectedCategory : undefined,
          countryCode: trip?.destination, // 根据行程的国家进行过滤
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
      setError(err.message || t('planStudio.placesTab.searchFailed'));
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

      // 1. 先添加地点到行程
      await itineraryItemsApi.create(data);
      
      // 2. 自动触发 LangGraph Orchestrator，系统会自动调用三人格进行检查和调整
      // 传递已计算好的时间信息，确保与创建行程项时使用的时间一致
      if (user) {
        try {
          const result = await orchestrator.addPlace(
            user.id,
            tripId,
            selectedPlace.id,
            selectedDayId,
            selectedPlace.nameCN || selectedPlace.nameEN,
            startTime.toISOString(),
            endTime.toISOString()
          );
          
          // 检查是否需要审批
          if (result.needsApproval && result.data?.approvalId) {
            const approvalId = result.data.approvalId;
            setPendingApprovalId(approvalId);
            setApprovalDialogOpen(true);
            toast.info('需要您的审批才能继续执行操作');
            return; // 等待审批，不继续执行后续逻辑
          }
          
          // 显示系统自动执行的结果
          if (result.success && result.data) {
            // 如果有提醒，显示提醒
            if (result.data.personaAlerts && result.data.personaAlerts.length > 0) {
              toast.info(`系统已自动检查，发现 ${result.data.personaAlerts.length} 条提醒`);
            }
            
            // 如果有自动调整，显示调整信息
            if (result.data.autoAdjustments && result.data.autoAdjustments.length > 0) {
              toast.success(`系统已自动调整 ${result.data.autoAdjustments.length} 项`);
            }
            
            // 如果有解释，显示解释
            if (result.data.explanation) {
              toast.info(result.data.explanation);
            }
          } else if (!result.success) {
            // 如果执行失败，显示错误信息
            const errorMsg = result.error || result.message || '未知错误';
            console.warn('[PlacesTab] Orchestrator 执行失败，但地点已添加:', {
              error: result.error,
              message: result.message,
              decisionLogCount: result.data?.decisionLog?.length || 0,
              status: '地点已成功添加，但自动检查未完成',
            });
            
            // 根据错误类型显示不同的提示
            if (errorMsg.includes('约束条件') || errorMsg.includes('约束')) {
              toast.warning(`地点已添加，但检测到约束冲突: ${errorMsg}`, {
                description: '建议检查行程的硬约束设置（如时间、距离、预算等）',
                duration: 5000,
              });
            } else if (errorMsg.includes('无法完成规划')) {
              toast.warning(`地点已添加，但规划检查失败`, {
                description: errorMsg,
                duration: 5000,
              });
            } else {
              toast.warning(`地点已添加，但自动检查未完成`, {
                description: errorMsg,
                duration: 4000,
              });
            }
          }
        } catch (orchestratorError: any) {
          // Orchestrator 调用失败不影响添加地点操作
          console.error('[PlacesTab] Orchestrator 执行异常:', orchestratorError);
          toast.warning(`地点已添加，但自动检查失败: ${orchestratorError.message || '未知错误'}`);
        }
      }
      
      // 3. 刷新行程数据
      await loadTrip();
      
      // 4. 通知父组件刷新其他 Tab（如 ScheduleTab）
      if (onPlaceAdded) {
        onPlaceAdded();
      }
      
      // 5. 显示成功提示
      setSuccessMessage(t('planStudio.placesTab.addPlaceSuccess', { 
        placeName: selectedPlace.nameCN || selectedPlace.nameEN || ''
      }));
      setError(null);
      setAddDialogOpen(false);
      setSelectedPlace(null);
      
      // 6. 3秒后清除成功提示
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || t('planStudio.placesTab.addPlaceFailed'));
      setSuccessMessage(null);
      console.error('Failed to add place:', err);
    } finally {
      setAdding(false);
    }
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('planStudio.placesTab.title')}</CardTitle>
          <CardDescription>{t('planStudio.placesTab.description')}</CardDescription>
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
                placeholder={
                  searchMode === 'nearby' 
                    ? t('planStudio.placesTab.placeholders.clickNearby')
                    : searchMode === 'recommend' 
                    ? t('planStudio.placesTab.placeholders.clickRecommend')
                    : t('planStudio.placesTab.placeholders.searchPlace')
                }
                className="pl-10"
                disabled={searchMode !== 'search'}
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={loading || (searchMode === 'search' && !searchQuery.trim())}
            >
              {loading ? <Spinner className="w-4 h-4 mr-2" /> : null}
              {searchMode === 'search' 
                ? t('planStudio.placesTab.buttons.search')
                : searchMode === 'nearby' 
                ? t('planStudio.placesTab.buttons.nearby')
                : t('planStudio.placesTab.buttons.recommend')}
            </Button>
            <Button 
              variant={searchMode === 'nearby' ? 'default' : 'outline'}
              onClick={async () => {
                setSearchMode('nearby');
                setSearchQuery('');
                setResults([]);
                // 切换到附近模式后自动触发搜索
                if (userLocation) {
                  try {
                    setLoading(true);
                    setError(null);
                    const searchResults = await placesApi.getNearbyPlaces({
                      lat: userLocation.lat,
                      lng: userLocation.lng,
                      radius: 5000, // 5km
                      type: selectedCategory !== 'all' ? selectedCategory : undefined,
                      countryCode: trip?.destination, // 根据行程的国家进行过滤
                    });
                    setResults(searchResults);
                  } catch (err: any) {
                    setError(err.message || t('planStudio.placesTab.searchFailed'));
                    console.error('Nearby search error:', err);
                  } finally {
                    setLoading(false);
                  }
                } else {
                  setError(t('planStudio.placesTab.needLocationForNearby'));
                }
              }}
            >
              {t('planStudio.placesTab.buttons.nearby')}
            </Button>
            <Button 
              variant={searchMode === 'recommend' ? 'default' : 'outline'}
              onClick={async () => {
                setSearchMode('recommend');
                setSearchQuery('');
                setResults([]);
                // 切换到推荐模式后自动触发搜索
                try {
                  setLoading(true);
                  setError(null);
                  const recommendations = await placesApi.getRecommendations({
                    tripId,
                    limit: 20,
                  });
                  const searchResults = recommendations.map((p: any) => ({
                    id: p.id,
                    nameCN: p.nameCN,
                    nameEN: p.nameEN,
                    category: p.category,
                    latitude: p.latitude,
                    longitude: p.longitude,
                    address: p.address,
                    rating: p.rating,
                    metadata: p.metadata,
                    distance: 0,
                  })) as PlaceWithDistance[];
                  setResults(searchResults);
                } catch (err: any) {
                  setError(err.message || t('planStudio.placesTab.searchFailed'));
                  console.error('Recommend search error:', err);
                } finally {
                  setLoading(false);
                }
              }}
            >
              {t('planStudio.placesTab.buttons.recommend')}
            </Button>
          </div>

          {/* 类型筛选 - 改为标签形式 */}
          {(searchMode === 'search' || searchMode === 'nearby') && (
            <div className="space-y-2">
              <Label>{t('planStudio.placesTab.categoryFilter')}</Label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'all' as const, key: 'all' },
                  { value: 'ATTRACTION' as const, key: 'attraction' },
                  { value: 'RESTAURANT' as const, key: 'restaurant' },
                  { value: 'SHOPPING' as const, key: 'shopping' },
                  { value: 'HOTEL' as const, key: 'hotel' },
                  { value: 'TRANSIT_HUB' as const, key: 'transitHub' },
                ]).map(({ value, key }) => (
                  <Button
                    key={value}
                    variant={selectedCategory === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={async () => {
                      const newCategory = value as PlaceCategory | 'all';
                      setSelectedCategory(newCategory);
                      // 如果已经有搜索结果，自动重新搜索
                      if (searchMode === 'search' && searchQuery.trim()) {
                        try {
                          setLoading(true);
                          setError(null);
                          const searchResults = await placesApi.searchPlaces({
                            q: searchQuery,
                            lat: userLocation?.lat,
                            lng: userLocation?.lng,
                            limit: 20,
                            type: newCategory !== 'all' ? newCategory : undefined,
                            countryCode: trip?.destination, // 根据行程的国家进行过滤
                          });
                          setResults(searchResults);
                        } catch (err: any) {
                          setError(err.message || t('planStudio.placesTab.searchFailed'));
                          console.error('Search error:', err);
                        } finally {
                          setLoading(false);
                        }
                      } else if (searchMode === 'nearby' && userLocation) {
                        try {
                          setLoading(true);
                          setError(null);
                          const searchResults = await placesApi.getNearbyPlaces({
                            lat: userLocation.lat,
                            lng: userLocation.lng,
                            radius: 5000,
                            type: newCategory !== 'all' ? newCategory : undefined,
                            countryCode: trip?.destination, // 根据行程的国家进行过滤
                          });
                          setResults(searchResults);
                        } catch (err: any) {
                          setError(err.message || t('planStudio.placesTab.searchFailed'));
                          console.error('Nearby search error:', err);
                        } finally {
                          setLoading(false);
                        }
                      }
                    }}
                  >
                    {t(`planStudio.placesTab.categories.${key}`)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {successMessage}
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
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{place.rating.toFixed(1)}</span>
                            </div>
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
                              {Object.values(place.metadata.openingHours)[0] || t('planStudio.placesTab.openingHoursUnknown')}
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
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 opacity-50">
                <EmptyPlacesIllustration size={160} />
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-1">
                {searchMode === 'nearby' ? t('planStudio.placesTab.clickNearbyToFind') : t('planStudio.placesTab.enterKeywordToSearch')}
              </p>
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
              {t('planStudio.placesTab.selectDayToAdd', { placeName: selectedPlace?.nameCN || selectedPlace?.nameEN || '' })}
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
      
      {/* 审批对话框 */}
      {pendingApprovalId && (
        <ApprovalDialog
          approvalId={pendingApprovalId}
          open={approvalDialogOpen}
          onOpenChange={(open) => {
            setApprovalDialogOpen(open);
            if (!open) {
              setPendingApprovalId(null);
            }
          }}
          onDecision={handleApprovalComplete}
        />
      )}
    </div>
  );
}
