import { useState, useEffect } from 'react';
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
  defaultPacePreference?: 'RELAXED' | 'BALANCED' | 'CHALLENGE';
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
      setCountries(data);
    } catch (err: any) {
      console.error('Failed to load countries:', err);
    }
  };

  const handleSubmit = async () => {
    if (!formData.destination || !formData.startDate || !formData.endDate) {
      setError('请填写必填项：目的地、开始日期、结束日期');
      return;
    }

    setLoading(true);
    setError(null);

    try {
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

      onSuccess(result.trip.id);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || '创建行程失败');
      console.error('Failed to create trip from template:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>使用模板创建行程</DialogTitle>
          <DialogDescription>
            {templateName && `基于模板"${templateName}"创建新行程`}
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
              placeholder="例如: 50000"
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
                <SelectValue placeholder="选择节奏偏好" />
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
                创建中...
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

