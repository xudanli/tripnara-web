import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { AlertTriangle, Shield, Brain, Wrench, X, MapPin, Plus } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import { placesApi } from '@/api/places';
import type { PlaceWithDistance } from '@/types/places-routes';
import { useDebounce } from '@/hooks/useDebounce';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';

interface IntentTabProps {
  tripId: string;
  personaMode?: PersonaMode;
}

export default function IntentTab({ tripId, personaMode = 'abu' }: IntentTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 意图与约束状态
  const [rhythm, setRhythm] = useState<'relaxed' | 'standard' | 'tight'>('standard');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [dailyWalkLimit, setDailyWalkLimit] = useState<number>(10);
  const [earlyRiser, setEarlyRiser] = useState(false);
  const [nightOwl, setNightOwl] = useState(false);
  const [mustPlaces, setMustPlaces] = useState<string[]>([]); // 存储POI ID
  const [mustPlaceMap, setMustPlaceMap] = useState<Map<number, PlaceWithDistance>>(new Map()); // ID到Place的映射
  const [avoidPlaces, setAvoidPlaces] = useState<string[]>([]); // 存储POI ID
  const [avoidPlaceMap, setAvoidPlaceMap] = useState<Map<number, PlaceWithDistance>>(new Map()); // ID到Place的映射
  const [budget, setBudget] = useState<number | undefined>(undefined);
  const [planningPolicy, setPlanningPolicy] = useState<'safe' | 'experience' | 'challenge'>('safe');

  // 地点搜索状态
  const [mustPlaceSearchOpen, setMustPlaceSearchOpen] = useState(false);
  const [mustPlaceSearchQuery, setMustPlaceSearchQuery] = useState('');
  const [mustPlaceSearchResults, setMustPlaceSearchResults] = useState<PlaceWithDistance[]>([]);
  const [mustPlaceSearchLoading, setMustPlaceSearchLoading] = useState(false);
  
  const [avoidPlaceSearchOpen, setAvoidPlaceSearchOpen] = useState(false);
  const [avoidPlaceSearchQuery, setAvoidPlaceSearchQuery] = useState('');
  const [avoidPlaceSearchResults, setAvoidPlaceSearchResults] = useState<PlaceWithDistance[]>([]);
  const [avoidPlaceSearchLoading, setAvoidPlaceSearchLoading] = useState(false);

  const debouncedMustPlaceSearch = useDebounce(mustPlaceSearchQuery, 300);
  const debouncedAvoidPlaceSearch = useDebounce(avoidPlaceSearchQuery, 300);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  // 搜索必须点
  useEffect(() => {
    if (debouncedMustPlaceSearch.length >= 2 && mustPlaceSearchOpen) {
      searchMustPlaces(debouncedMustPlaceSearch);
    } else {
      setMustPlaceSearchResults([]);
    }
  }, [debouncedMustPlaceSearch, mustPlaceSearchOpen]);

  // 搜索不可点
  useEffect(() => {
    if (debouncedAvoidPlaceSearch.length >= 2 && avoidPlaceSearchOpen) {
      searchAvoidPlaces(debouncedAvoidPlaceSearch);
    } else {
      setAvoidPlaceSearchResults([]);
    }
  }, [debouncedAvoidPlaceSearch, avoidPlaceSearchOpen]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      await tripsApi.getById(tripId);
      // 从trip数据中加载已有设置（如果有）
      // TODO: 从trip.preferences或planningPolicy中读取
    } catch (err) {
      console.error('Failed to load trip:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchMustPlaces = async (query: string) => {
    try {
      setMustPlaceSearchLoading(true);
      const results = await placesApi.autocompletePlaces({
        q: query,
        limit: 10,
      });
      setMustPlaceSearchResults(results);
    } catch (err) {
      console.error('Failed to search places:', err);
      setMustPlaceSearchResults([]);
    } finally {
      setMustPlaceSearchLoading(false);
    }
  };

  const searchAvoidPlaces = async (query: string) => {
    try {
      setAvoidPlaceSearchLoading(true);
      const results = await placesApi.autocompletePlaces({
        q: query,
        limit: 10,
      });
      setAvoidPlaceSearchResults(results);
    } catch (err) {
      console.error('Failed to search places:', err);
      setAvoidPlaceSearchResults([]);
    } finally {
      setAvoidPlaceSearchLoading(false);
    }
  };

  const handleAddMustPlace = (place: PlaceWithDistance) => {
    const placeId = place.id.toString();
    if (!mustPlaces.includes(placeId)) {
      setMustPlaces([...mustPlaces, placeId]);
      setMustPlaceMap(new Map(mustPlaceMap).set(place.id, place));
    }
    setMustPlaceSearchQuery('');
    setMustPlaceSearchOpen(false);
  };

  const handleRemoveMustPlace = (placeId: string) => {
    setMustPlaces(mustPlaces.filter(id => id !== placeId));
    const id = parseInt(placeId);
    const newMap = new Map(mustPlaceMap);
    newMap.delete(id);
    setMustPlaceMap(newMap);
  };

  const handleAddAvoidPlace = (place: PlaceWithDistance) => {
    const placeId = place.id.toString();
    if (!avoidPlaces.includes(placeId)) {
      setAvoidPlaces([...avoidPlaces, placeId]);
      setAvoidPlaceMap(new Map(avoidPlaceMap).set(place.id, place));
    }
    setAvoidPlaceSearchQuery('');
    setAvoidPlaceSearchOpen(false);
  };

  const handleRemoveAvoidPlace = (placeId: string) => {
    setAvoidPlaces(avoidPlaces.filter(id => id !== placeId));
    const id = parseInt(placeId);
    const newMap = new Map(avoidPlaceMap);
    newMap.delete(id);
    setAvoidPlaceMap(newMap);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // TODO: 调用API保存意图与约束
      // await tripsApi.updateIntent(tripId, { ... });
      console.log('Saving intent:', {
        rhythm,
        preferences,
        dailyWalkLimit,
        earlyRiser,
        nightOwl,
        mustPlaces,
        avoidPlaces,
        budget,
        planningPolicy,
      });
    } catch (err) {
      console.error('Failed to save intent:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card data-tour="trip-dna">
        <CardHeader>
          <CardTitle>我想要的</CardTitle>
          <CardDescription>定义你的旅行风格和节奏</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>节奏</Label>
            <Select value={rhythm} onValueChange={(v) => setRhythm(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relaxed">轻松（每天2-3个点）</SelectItem>
                <SelectItem value="standard">标准（每天4-5个点）</SelectItem>
                <SelectItem value="tight">紧凑（每天6+个点）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>偏好</Label>
            <div className="flex flex-wrap gap-2">
              {['自然', '城市', '摄影', '美食', '历史', '艺术', '购物', '夜生活'].map((pref) => (
                <Button
                  key={pref}
                  variant={preferences.includes(pref) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPreferences((prev) =>
                      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
                    );
                  }}
                >
                  {pref}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-tour="hard-constraints">
        <CardHeader>
          <CardTitle>约束</CardTitle>
          <CardDescription>设置你的限制条件</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>每日步行上限（公里）</Label>
              <Input
                type="number"
                value={dailyWalkLimit}
                onChange={(e) => setDailyWalkLimit(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>预算（元，可选）</Label>
              <Input
                type="number"
                value={budget || ''}
                onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : undefined)}
                min={0}
                placeholder="不限制"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="earlyRiser"
                checked={earlyRiser}
                onCheckedChange={(checked) => setEarlyRiser(checked === true)}
              />
              <Label htmlFor="earlyRiser">早起型</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="nightOwl"
                checked={nightOwl}
                onCheckedChange={(checked) => setNightOwl(checked === true)}
              />
              <Label htmlFor="nightOwl">夜猫子</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>必须点</Label>
            <div className="space-y-2">
              {/* 已选择的地点列表 */}
              {mustPlaces.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mustPlaces.map((placeId) => {
                    const place = mustPlaceMap.get(parseInt(placeId));
                    return (
                      <Badge key={placeId} variant="secondary" className="px-2 py-1">
                        {place?.nameCN || place?.nameEN || `POI ${placeId}`}
                        <button
                          type="button"
                          onClick={() => handleRemoveMustPlace(placeId)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              
              {/* 搜索输入框 */}
              <Popover open={mustPlaceSearchOpen} onOpenChange={setMustPlaceSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    搜索并添加地点...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[400px]" align="start">
                  <Command>
                    <CommandInput
                      placeholder="搜索地点名称..."
                      value={mustPlaceSearchQuery}
                      onValueChange={setMustPlaceSearchQuery}
                    />
                    <CommandList>
                      {mustPlaceSearchLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Spinner className="w-4 h-4" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>未找到地点</CommandEmpty>
                          <CommandGroup>
                            {mustPlaceSearchResults.map((place) => (
                              <CommandItem
                                key={place.id}
                                value={`${place.nameCN} ${place.nameEN} ${place.id}`}
                                onSelect={() => handleAddMustPlace(place)}
                                disabled={mustPlaces.includes(place.id.toString())}
                              >
                                <MapPin className="w-4 h-4 mr-2" />
                                <div className="flex-1">
                                  <div className="font-medium">{place.nameCN || place.nameEN}</div>
                                  {place.nameEN && place.nameCN && (
                                    <div className="text-xs text-muted-foreground">{place.nameEN}</div>
                                  )}
                                </div>
                                {mustPlaces.includes(place.id.toString()) && (
                                  <Badge variant="outline" className="text-xs">已添加</Badge>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>不可点</Label>
            <div className="space-y-2">
              {/* 已选择的地点列表 */}
              {avoidPlaces.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {avoidPlaces.map((placeId) => {
                    const place = avoidPlaceMap.get(parseInt(placeId));
                    return (
                      <Badge key={placeId} variant="secondary" className="px-2 py-1">
                        {place?.nameCN || place?.nameEN || `POI ${placeId}`}
                        <button
                          type="button"
                          onClick={() => handleRemoveAvoidPlace(placeId)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              
              {/* 搜索输入框 */}
              <Popover open={avoidPlaceSearchOpen} onOpenChange={setAvoidPlaceSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    搜索并添加地点...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[400px]" align="start">
                  <Command>
                    <CommandInput
                      placeholder="搜索地点名称..."
                      value={avoidPlaceSearchQuery}
                      onValueChange={setAvoidPlaceSearchQuery}
                    />
                    <CommandList>
                      {avoidPlaceSearchLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Spinner className="w-4 h-4" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>未找到地点</CommandEmpty>
                          <CommandGroup>
                            {avoidPlaceSearchResults.map((place) => (
                              <CommandItem
                                key={place.id}
                                value={`${place.nameCN} ${place.nameEN} ${place.id}`}
                                onSelect={() => handleAddAvoidPlace(place)}
                                disabled={avoidPlaces.includes(place.id.toString())}
                              >
                                <MapPin className="w-4 h-4 mr-2" />
                                <div className="flex-1">
                                  <div className="font-medium">{place.nameCN || place.nameEN}</div>
                                  {place.nameEN && place.nameCN && (
                                    <div className="text-xs text-muted-foreground">{place.nameEN}</div>
                                  )}
                                </div>
                                {avoidPlaces.includes(place.id.toString()) && (
                                  <Badge variant="outline" className="text-xs">已添加</Badge>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>规划策略</CardTitle>
          <CardDescription>选择系统推荐的规划策略预设</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={planningPolicy} onValueChange={(v) => setPlanningPolicy(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="safe">稳健优先（安全第一，时间充足）</SelectItem>
              <SelectItem value="experience">体验优先（最大化体验密度）</SelectItem>
              <SelectItem value="challenge">极限挑战（时间紧，体验多）</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Spinner className="w-4 h-4 mr-2" /> : null}
          Save & Continue to Places
        </Button>
      </div>
    </div>
  );
}

