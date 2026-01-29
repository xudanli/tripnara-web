import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle } from 'lucide-react';
import { routeDirectionsApi } from '@/api/route-directions';
import { countriesApi } from '@/api/countries';
import type { CreateTripFromTemplateRequest } from '@/types/places-routes';
import type { Country } from '@/types/country';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CheckCircle2, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateTripFromTemplateDialogProps {
  templateId: number;
  templateName?: string;
  defaultDurationDays?: number;
  defaultPacePreference?: 'RELAXED' | 'BALANCED' | 'INTENSE' | 'CHALLENGE';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (tripId: string) => void;
}

export function CreateTripFromTemplateDialog({
  templateId,
  templateName,
  defaultDurationDays,
  defaultPacePreference,
  open,
  onOpenChange,
  onSuccess,
}: CreateTripFromTemplateDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [destinationOpen, setDestinationOpen] = useState(false);
  
  const [formData, setFormData] = useState<CreateTripFromTemplateRequest>({
    destination: '',
    startDate: '',
    endDate: '',
    totalBudget: undefined,
    pacePreference: defaultPacePreference,
    intensity: 'balanced',
    transport: 'walk',
    travelers: [{ type: 'ADULT', mobilityTag: 'CITY_POTATO' }],
    constraints: {},
  });

  useEffect(() => {
    if (open) {
      loadCountries();
      // 计算默认结束日期
      if (formData.startDate && defaultDurationDays) {
        const start = new Date(formData.startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + defaultDurationDays - 1);
        setFormData(prev => ({
          ...prev,
          endDate: end.toISOString().split('T')[0],
        }));
      }
    }
  }, [open, defaultDurationDays]);

  useEffect(() => {
    // 当开始日期改变时，自动计算结束日期
    if (formData.startDate && defaultDurationDays) {
      const start = new Date(formData.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + defaultDurationDays - 1);
      setFormData(prev => ({
        ...prev,
        endDate: end.toISOString().split('T')[0],
      }));
    }
  }, [formData.startDate, defaultDurationDays]);

  const loadCountries = async () => {
    try {
      const data = await countriesApi.getAll();
      setCountries(data.countries || []);
    } catch (err: any) {
      console.error('Failed to load countries:', err);
    }
  };

  const handleSubmit = async () => {
    if (!formData.destination || !formData.startDate || !formData.endDate) {
      setError(t('dialogs.createTripFromTemplate.fillRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 [CreateTripFromTemplate] 开始创建行程，模板ID:', templateId);
      
      const result = await routeDirectionsApi.createTripFromTemplate(templateId, {
        ...formData,
        // 清理空值
        totalBudget: formData.totalBudget || undefined,
        pacePreference: formData.pacePreference || undefined,
        intensity: formData.intensity || undefined,
        transport: formData.transport || undefined,
        travelers: formData.travelers && formData.travelers.length > 0 ? formData.travelers : undefined,
        constraints: Object.keys(formData.constraints || {}).length > 0 ? formData.constraints : undefined,
      });

      console.log('✅ [CreateTripFromTemplate] API响应完整数据:', {
        fullResult: result,
        trip: result.trip,
        tripId: result.trip?.id,
        tripIdType: typeof result.trip?.id,
        tripIdLength: result.trip?.id?.length,
        destination: result.trip?.destination,
        startDate: result.trip?.startDate,
        endDate: result.trip?.endDate,
        stats: result.stats,
        warnings: result.warnings,
        generatedItems: result.generatedItems,
      });
      
      // 🔍 详细检查生成的行程项数据
      if (result.generatedItems && result.generatedItems.length > 0) {
        console.log('📋 [CreateTripFromTemplate] 生成的行程项详情:', {
          totalDays: result.generatedItems.length,
          itemsByDay: result.generatedItems.map((day: any) => ({
            day: day.day,
            date: day.date,
            itemsCount: day.items?.length || 0,
            items: day.items?.map((item: any) => ({
              placeId: item.placeId,
              type: item.type,
              note: item.note,
              reason: item.reason,
              startTime: item.startTime,
              endTime: item.endTime,
            })) || [],
          })),
        });
      }
      
      // 🔍 检查统计信息
      if (result.stats) {
        console.log('📊 [CreateTripFromTemplate] 生成统计:', {
          totalDays: result.stats.totalDays,
          totalItems: result.stats.totalItems,
          placesMatched: result.stats.placesMatched,
          placesMissing: result.stats.placesMissing,
          matchRate: result.stats.placesMatched > 0 
            ? `${((result.stats.placesMatched / (result.stats.placesMatched + result.stats.placesMissing)) * 100).toFixed(1)}%`
            : '0%',
        });
        
        // ⚠️ 如果有缺失的POI，显示警告
        if (result.stats.placesMissing > 0) {
          console.warn('⚠️ [CreateTripFromTemplate] 有POI未匹配:', {
            missingCount: result.stats.placesMissing,
            matchedCount: result.stats.placesMatched,
            warnings: result.warnings || [],
          });
        }
      }

      // 验证返回的 trip.id 是否存在
      if (!result.trip?.id) {
        console.error('❌ [CreateTripFromTemplate] 创建成功但未返回行程ID:', {
          result,
          trip: result.trip,
        });
        throw new Error('创建成功但未返回行程ID，请检查后端响应格式');
      }

      // 验证 trip.id 格式（应该是UUID格式的字符串）
      const tripId = String(result.trip.id).trim();
      if (!tripId || tripId.length < 10) {
        console.error('❌ [CreateTripFromTemplate] 行程ID格式异常:', {
          tripId,
          originalId: result.trip.id,
          type: typeof result.trip.id,
        });
        throw new Error(`行程ID格式异常: ${tripId}`);
      }

      console.log('✅ [CreateTripFromTemplate] 准备调用成功回调，tripId:', tripId);
      console.log('✅ [CreateTripFromTemplate] onSuccess 回调函数:', typeof onSuccess);

      // 调用成功回调（会处理导航）
      try {
        onSuccess(tripId);
        console.log('✅ [CreateTripFromTemplate] 成功回调已调用');
      } catch (callbackErr: any) {
        console.error('❌ [CreateTripFromTemplate] 调用成功回调失败:', callbackErr);
        setError('调用成功回调失败: ' + callbackErr.message);
        return;
      }
      
      onOpenChange(false);
    } catch (err: any) {
      console.error('❌ [CreateTripFromTemplate] 创建行程失败:', {
        templateId,
        error: err.message,
        code: err.code,
        response: err.response?.data,
        fullError: err,
      });
      
      // 提取更详细的错误信息
      let errorMessage = err.message || t('dialogs.createTripFromTemplate.createFailed');
      
      // 如果是权限错误
      if (err.code === 'UNAUTHORIZED' || err.response?.status === 401) {
        errorMessage = '没有权限创建行程，请检查登录状态';
      }
      // 如果是资源不存在
      else if (err.code === 'NOT_FOUND' || err.response?.status === 404) {
        errorMessage = '模板不存在或已被删除';
      }
      // 如果是服务器错误
      else if (err.response?.status >= 500) {
        errorMessage = '服务器错误，请稍后重试';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('dialogs.createTripFromTemplate.title')}</DialogTitle>
          <DialogDescription>
            {templateName && t('dialogs.createTripFromTemplate.basedOnTemplate', { templateName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            </div>
          )}

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
                      : t('dialogs.createTripFromTemplate.selectDestination')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder={t('dialogs.createTripFromTemplate.searchCountry')} />
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
                placeholder={t('dialogs.createTripFromTemplate.enterCountryCode')}
              />
            )}
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">开始日期 *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">结束日期 *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* 预算 */}
          <div className="space-y-2">
            <Label htmlFor="totalBudget">总预算（可选）</Label>
            <Input
              id="totalBudget"
              type="number"
              value={formData.totalBudget || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalBudget: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder={t('dialogs.createTripFromTemplate.exampleBudget')}
            />
          </div>

          {/* 节奏偏好 */}
          <div className="space-y-2">
            <Label htmlFor="pacePreference">节奏偏好</Label>
            <Select
              value={formData.pacePreference}
              onValueChange={(value) =>
                setFormData({ ...formData, pacePreference: value as 'RELAXED' | 'BALANCED' | 'CHALLENGE' })
              }
            >
              <SelectTrigger id="pacePreference">
                <SelectValue placeholder={t('dialogs.createTripFromTemplate.selectPace')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RELAXED">轻松 (RELAXED)</SelectItem>
                <SelectItem value="BALANCED">平衡 (BALANCED)</SelectItem>
                <SelectItem value="CHALLENGE">挑战 (CHALLENGE)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 强度 */}
          <div className="space-y-2">
            <Label htmlFor="intensity">强度</Label>
            <Select
              value={formData.intensity}
              onValueChange={(value) =>
                setFormData({ ...formData, intensity: value as 'relaxed' | 'balanced' | 'intense' })
              }
            >
              <SelectTrigger id="intensity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relaxed">轻松</SelectItem>
                <SelectItem value="balanced">平衡</SelectItem>
                <SelectItem value="intense">紧凑</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 出行方式 */}
          <div className="space-y-2">
            <Label htmlFor="transport">出行方式</Label>
            <Select
              value={formData.transport}
              onValueChange={(value) =>
                setFormData({ ...formData, transport: value as 'walk' | 'transit' | 'car' })
              }
            >
              <SelectTrigger id="transport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk">步行</SelectItem>
                <SelectItem value="transit">公共交通</SelectItem>
                <SelectItem value="car">自驾</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 约束条件 */}
          <div className="space-y-3 pt-2 border-t">
            <Label>约束条件（可选）</Label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                {t('dialogs.createTripFromTemplate.creating')}
              </>
            ) : (
              '创建行程'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

