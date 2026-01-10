import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import type { 
  GenerateTripDraftRequest, 
  TripDraftResponse, 
  TimeSlot,
  TravelStyle,
  IntensityLevel,
  TransportMode,
  AccommodationBase,
  HikingLevel,
} from '@/types/trip';
import type { Country } from '@/types/country';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { 
  ArrowLeft, 
  Sparkles, 
  Calendar, 
  Clock, 
  Lock,
  CheckCircle2,
  AlertCircle,
  ChevronsUpDown,
  Eye,
  Save,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: '上午 (9:00-12:00)',
  lunch: '午餐 (12:00-13:30)',
  afternoon: '下午 (13:30-17:30)',
  dinner: '晚餐 (18:00-20:00)',
  evening: '晚间 (可选)',
};

const TRAVEL_STYLE_LABELS: Record<TravelStyle, string> = {
  nature: '自然风光',
  culture: '文化历史',
  food: '美食探索',
  citywalk: '城市漫步',
  photography: '摄影打卡',
  adventure: '冒险体验',
};

const INTENSITY_LABELS: Record<IntensityLevel, string> = {
  relaxed: '轻松',
  balanced: '平衡',
  intense: '紧凑',
};

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  walk: '步行',
  transit: '公共交通',
  car: '自驾',
};

const HIKING_LABELS: Record<HikingLevel, string> = {
  none: '无徒步',
  light: '轻度徒步',
  'hiking-heavy': '重度徒步',
};

export default function GenerateTripPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 国家列表
  const [countries, setCountries] = useState<Country[]>([]);
  const [destinationOpen, setDestinationOpen] = useState(false);
  
  // 表单数据
  const [formData, setFormData] = useState<GenerateTripDraftRequest>({
    destination: '',
    days: 3,
    style: 'culture',
    intensity: 'balanced',
    transport: 'walk',
    accommodationBase: 'fixed',
    hikingLevel: 'none',
    constraints: {},
  });
  
  // 生成的草案
  const [draft, setDraft] = useState<TripDraftResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [lockedItems, setLockedItems] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    loadCountries();
  }, []);
  
  const loadCountries = async () => {
    try {
      const data = await countriesApi.getAll();
      setCountries(data);
    } catch (err: any) {
      console.error('Failed to load countries:', err);
    }
  };
  
  const handleGenerate = async () => {
    if (!formData.destination || formData.days < 1 || formData.days > 14) {
      setError('请填写目的地和天数(1-14天)');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await tripsApi.generateDraft(formData);
      setDraft(result);
    } catch (err: any) {
      // 处理不同类型的错误
      let errorMessage = '生成行程失败';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.error) {
        const error = err.response.data.error;
        switch (error.code) {
          case 'INSUFFICIENT_CANDIDATES':
            errorMessage = `候选地点不足。系统暂不支持该目的地，或该国家尚未导入足够的地点数据。`;
            break;
          case 'VALIDATION_FAILED':
            errorMessage = `规则校验失败：${error.message}`;
            break;
          case 'LLM_ERROR':
            errorMessage = `LLM 调用失败，请稍后重试。`;
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      }
      setError(errorMessage);
      console.error('Failed to generate draft:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!draft) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const result = await tripsApi.saveDraft({
        draft,
        userEdits: {
          lockedItemIds: Array.from(lockedItems),
        },
      });
      
      // 保存成功后跳转到行程详情页
      navigate(`/dashboard/trips/${result.id}`);
    } catch (err: any) {
      setError(err.message || '保存行程失败');
      console.error('Failed to save draft:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const toggleLockItem = (dayIndex: number, slot: TimeSlot) => {
    const key = `${dayIndex}-${slot}`;
    const newLocked = new Set(lockedItems);
    if (newLocked.has(key)) {
      newLocked.delete(key);
    } else {
      newLocked.add(key);
    }
    setLockedItems(newLocked);
  };
  
  const isItemLocked = (dayIndex: number, slot: TimeSlot): boolean => {
    return lockedItems.has(`${dayIndex}-${slot}`);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/trips')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">智能行程生成</h1>
          <p className="text-muted-foreground mt-1">
            输入关键参数，一键生成可执行行程
          </p>
        </div>
      </div>
      
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧: 参数表单 */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                生成参数
              </CardTitle>
              <CardDescription>
                填写关键参数，系统将基于place表生成可执行行程
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 目的地 */}
              <div className="space-y-2">
                <Label htmlFor="destination">目的地 *</Label>
                {countries.length > 0 ? (
                  <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {formData.destination
                          ? countries.find((c) => c.isoCode === formData.destination)?.nameCN || formData.destination
                          : '选择目的地...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="搜索国家..." />
                        <CommandList>
                          <CommandEmpty>未找到国家</CommandEmpty>
                          <CommandGroup>
                            {countries.map((country) => (
                              <CommandItem
                                key={country.isoCode}
                                value={country.isoCode}
                                onSelect={() => {
                                  setFormData({ ...formData, destination: country.isoCode });
                                  setDestinationOpen(false);
                                }}
                              >
                                <CheckCircle2
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    formData.destination === country.isoCode
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                {country.nameCN} ({country.isoCode})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    id="destination"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="输入国家代码(如: JP, IS)"
                  />
                )}
              </div>
              
              {/* 天数 */}
              <div className="space-y-2">
                <Label htmlFor="days">天数 *</Label>
                <Input
                  id="days"
                  type="number"
                  min="1"
                  max="14"
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 1 })}
                />
              </div>
              
              {/* 旅行风格 */}
              <div className="space-y-2">
                <Label htmlFor="style">旅行风格</Label>
                <Select
                  value={formData.style}
                  onValueChange={(value) => setFormData({ ...formData, style: value as TravelStyle })}
                >
                  <SelectTrigger id="style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRAVEL_STYLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 强度 */}
              <div className="space-y-2">
                <Label htmlFor="intensity">强度</Label>
                <Select
                  value={formData.intensity}
                  onValueChange={(value) => setFormData({ ...formData, intensity: value as IntensityLevel })}
                >
                  <SelectTrigger id="intensity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INTENSITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 出行方式 */}
              <div className="space-y-2">
                <Label htmlFor="transport">出行方式</Label>
                <Select
                  value={formData.transport}
                  onValueChange={(value) => setFormData({ ...formData, transport: value as TransportMode })}
                >
                  <SelectTrigger id="transport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRANSPORT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 住宿基点 */}
              <div className="space-y-2">
                <Label htmlFor="accommodationBase">住宿基点</Label>
                <Select
                  value={formData.accommodationBase}
                  onValueChange={(value) => setFormData({ ...formData, accommodationBase: value as AccommodationBase })}
                >
                  <SelectTrigger id="accommodationBase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">固定住一处</SelectItem>
                    <SelectItem value="moving">每晚移动</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 徒步级别 */}
              <div className="space-y-2">
                <Label htmlFor="hikingLevel">徒步级别</Label>
                <Select
                  value={formData.hikingLevel}
                  onValueChange={(value) => setFormData({ ...formData, hikingLevel: value as HikingLevel })}
                >
                  <SelectTrigger id="hikingLevel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(HIKING_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 约束条件 */}
              <div className="space-y-3 pt-2 border-t">
                <Label>约束条件</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="withChildren"
                      checked={formData.constraints?.withChildren || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          constraints: { ...formData.constraints, withChildren: checked as boolean },
                        })
                      }
                    />
                    <Label htmlFor="withChildren" className="font-normal cursor-pointer">
                      带娃
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="withElderly"
                      checked={formData.constraints?.withElderly || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          constraints: { ...formData.constraints, withElderly: checked as boolean },
                        })
                      }
                    />
                    <Label htmlFor="withElderly" className="font-normal cursor-pointer">
                      老人同行
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="earlyRiser"
                      checked={formData.constraints?.earlyRiser || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          constraints: { ...formData.constraints, earlyRiser: checked as boolean },
                        })
                      }
                    />
                    <Label htmlFor="earlyRiser" className="font-normal cursor-pointer">
                      早起困难
                    </Label>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleGenerate}
                disabled={loading || !formData.destination}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    生成行程
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* 右侧: 预览区域 */}
        <div className="lg:col-span-2 space-y-6">
          {draft ? (
            <>
              {/* 草案信息 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>行程预览</CardTitle>
                      <CardDescription>
                        {draft.destination} · {draft.days} 天 · 候选地点: {draft.candidatesCount} 个
                      </CardDescription>
                    </div>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <>
                          <Spinner className="w-4 h-4 mr-2" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          保存行程
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {draft.validationWarnings && draft.validationWarnings.length > 0 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-800">校验警告</p>
                          <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                            {draft.validationWarnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* 每日行程 */}
              <div className="space-y-4">
                {draft.draftDays.map((day, dayIndex) => (
                  <Card key={day.day}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Day {day.day} - {format(new Date(day.date), 'yyyy年MM月dd日')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(Object.keys(day.slots) as TimeSlot[]).map((slot) => {
                          const item = day.slots[slot];
                          if (!item) return null;
                          
                          const isLocked = isItemLocked(dayIndex, slot);
                          
                          return (
                            <div
                              key={slot}
                              className={cn(
                                'p-4 border rounded-lg',
                                isLocked && 'bg-blue-50 border-blue-200'
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline">{TIME_SLOT_LABELS[slot]}</Badge>
                                    {isLocked && (
                                      <Badge variant="secondary" className="bg-blue-100">
                                        <Lock className="w-3 h-3 mr-1" />
                                        已锁定
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="font-medium mb-1">
                                    Place ID: {item.placeId}
                                  </div>
                                  <div className="text-sm text-muted-foreground mb-2">
                                    {item.reason}
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {format(new Date(item.startTime), 'HH:mm')} -{' '}
                                      {format(new Date(item.endTime), 'HH:mm')}
                                    </div>
                                    {item.evidence?.openingHours && (
                                      <div>营业: {item.evidence.openingHours}</div>
                                    )}
                                    {item.evidence?.rating && (
                                      <div>评分: {item.evidence.rating}</div>
                                    )}
                                  </div>
                                  {item.alternatives && item.alternatives.length > 0 && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      备选: {item.alternatives.join(', ')}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleLockItem(dayIndex, slot)}
                                >
                                  <Lock
                                    className={cn(
                                      'w-4 h-4',
                                      isLocked ? 'text-blue-600' : 'text-gray-400'
                                    )}
                                  />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  填写左侧参数后点击"生成行程"按钮
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

