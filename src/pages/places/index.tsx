import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { placesApi } from '@/api/places';
import type { PlaceWithDistance, PlaceCategory } from '@/types/places-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  MapPin,
  Navigation,
  Loader2,
  Star,
  Clock,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { DiscoverBoxIllustration } from '@/components/illustrations';

const PLACE_CATEGORIES: { value: PlaceCategory; label: string }[] = [
  { value: 'ATTRACTION', label: '景点' },
  { value: 'RESTAURANT', label: '餐厅' },
  { value: 'CAFE', label: '咖啡厅' },
  { value: 'BAR', label: '酒吧' },
  { value: 'SHOPPING', label: '购物' },
  { value: 'HOTEL', label: '酒店' },
  { value: 'MUSEUM', label: '博物馆' },
  { value: 'PARK', label: '公园' },
  { value: 'TRANSPORT', label: '交通枢纽' },
  { value: 'TRANSIT_HUB', label: '交通枢纽' },
  { value: 'OTHER', label: '其他' },
];

export default function PlacesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState<'keyword' | 'semantic' | 'nearby'>('keyword');
  const [category, setCategory] = useState<PlaceCategory | 'all'>('all');
  const [radius, setRadius] = useState(2000);
  
  const [results, setResults] = useState<PlaceWithDistance[]>([]);
  const [autocompleteResults, setAutocompleteResults] = useState<PlaceWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // 防抖搜索关键词
  const debouncedQuery = useDebounce(searchQuery, 300);

  // 获取用户位置
  useEffect(() => {
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
  }, []);

  // 自动补全
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      handleAutocomplete(debouncedQuery);
    } else {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
    }
  }, [debouncedQuery]);

  const handleAutocomplete = async (query: string) => {
    try {
      setAutocompleteLoading(true);
      const results = await placesApi.autocompletePlaces({
        q: query,
        lat: userLocation?.lat,
        lng: userLocation?.lng,
        limit: 10,
      });
      setAutocompleteResults(results);
      setShowAutocomplete(true);
    } catch (err: any) {
      console.error('Autocomplete error:', err);
    } finally {
      setAutocompleteLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && searchType !== 'nearby') {
      setError('请输入搜索关键词');
      return;
    }

    if (searchType === 'nearby' && !userLocation) {
      setError('需要获取您的位置才能查找附近地点');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setShowAutocomplete(false);

      let searchResults: PlaceWithDistance[] = [];

      if (searchType === 'keyword') {
        searchResults = await placesApi.searchPlaces({
          q: searchQuery,
          lat: userLocation?.lat,
          lng: userLocation?.lng,
          radius: radius,
          type: category !== 'all' ? category : undefined,
          limit: 20,
        });
      } else if (searchType === 'semantic') {
        const response = await placesApi.semanticSearchPlaces({
          q: searchQuery,
          lat: userLocation?.lat,
          lng: userLocation?.lng,
          radius: radius,
          type: category !== 'all' ? category : undefined,
          limit: 20,
        });
        searchResults = response.results;
      } else if (searchType === 'nearby') {
        searchResults = await placesApi.getNearbyPlaces({
          lat: userLocation!.lat,
          lng: userLocation!.lng,
          radius: radius,
          type: category !== 'all' ? category : undefined,
        });
      }

      setResults(searchResults);
      setSearchParams({ q: searchQuery, type: searchType });
    } catch (err: any) {
      setError(err.message || '搜索失败，请稍后重试');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceClick = (placeId: number) => {
    navigate(`/dashboard/places/${placeId}`);
  };

  const handleAutocompleteSelect = (place: PlaceWithDistance) => {
    setSearchQuery(place.nameCN || place.nameEN || '');
    setShowAutocomplete(false);
    setSearchQuery(place.nameCN || place.nameEN || '');
    handleSearch();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div>
        <h1 className="text-3xl font-bold">地点搜索</h1>
        <p className="text-muted-foreground mt-1">搜索和发现您感兴趣的地点</p>
      </div>

      {/* 搜索区域 */}
      <Card>
        <CardHeader>
          <CardTitle>搜索地点</CardTitle>
          <CardDescription>支持关键词搜索、语义搜索和附近地点查找</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索类型切换 */}
          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="keyword">关键词搜索</TabsTrigger>
              <TabsTrigger value="semantic">语义搜索</TabsTrigger>
              <TabsTrigger value="nearby">附近地点</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 搜索框 */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder={
                    searchType === 'nearby'
                      ? '点击搜索按钮查找附近地点'
                      : searchType === 'semantic'
                      ? '输入自然语言描述，如"适合冥想的安静庭院"'
                      : '输入地点名称或关键词'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (autocompleteResults.length > 0) {
                      setShowAutocomplete(true);
                    }
                  }}
                  className="pl-10"
                  disabled={searchType === 'nearby'}
                />
                
                {/* 自动补全下拉 */}
                {showAutocomplete && autocompleteResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {autocompleteLoading ? (
                      <div className="p-4 text-center">
                        <Spinner className="w-4 h-4" />
                      </div>
                    ) : (
                      autocompleteResults.map((place) => (
                        <div
                          key={place.id}
                          className="p-3 hover:bg-accent cursor-pointer border-b last:border-0"
                          onClick={() => handleAutocompleteSelect(place)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {place.nameCN || place.nameEN}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {place.category} {place.distance && `· ${Math.round(place.distance)}m`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                搜索
              </Button>
            </div>
          </div>

          {/* 筛选选项 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>地点类别</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {PLACE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>搜索半径（米）</Label>
              <Input
                type="number"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                min={100}
                max={10000}
                step={100}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 搜索结果 */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              搜索结果 ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((place) => (
                <Card
                  key={place.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handlePlaceClick(place.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {place.nameCN || place.nameEN || `地点 ${place.id}`}
                          </h3>
                          {place.nameEN && place.nameCN && (
                            <p className="text-sm text-muted-foreground">{place.nameEN}</p>
                          )}
                        </div>
                        {place.rating && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{place.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{place.category}</Badge>
                        {place.distance !== undefined && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            {Math.round(place.distance)}m
                          </span>
                        )}
                        {place.physicalMetadata?.estimated_duration_min && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {place.physicalMetadata.estimated_duration_min}分钟
                          </span>
                        )}
                      </div>
                      
                      {place.address && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {place.address}
                        </p>
                      )}
                      
                      {place.metadata?.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {place.metadata.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {!loading && results.length === 0 && searchParams.get('q') && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-4 opacity-50">
                <DiscoverBoxIllustration size={160} />
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-1">未找到相关地点</p>
              <p className="text-xs text-muted-foreground">请尝试其他关键词或调整筛选条件</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
