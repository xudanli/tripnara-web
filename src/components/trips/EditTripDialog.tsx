import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { tripsApi } from '@/api/trips';
import type { TripDetail, UpdateTripRequest } from '@/types/trip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EditTripDialogProps {
  trip: TripDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditTripDialog({ trip, open, onOpenChange, onSuccess }: EditTripDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(
    trip.startDate ? new Date(trip.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    trip.endDate ? new Date(trip.endDate) : undefined
  );
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [formData, setFormData] = useState<UpdateTripRequest>({
    name: trip.name,
    startDate: trip.startDate.split('T')[0], // 只取日期部分
    endDate: trip.endDate.split('T')[0],
  });

  // 当 trip 或 open 变化时更新表单数据
  useEffect(() => {
    if (open && trip) {
      const start = trip.startDate ? new Date(trip.startDate) : undefined;
      const end = trip.endDate ? new Date(trip.endDate) : undefined;
      setStartDate(start);
      setEndDate(end);
      setFormData({
        name: trip.name,
        startDate: trip.startDate.split('T')[0],
        endDate: trip.endDate.split('T')[0],
      });
      setError(null);
    }
  }, [trip, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 验证日期
    if (!startDate || !endDate) {
      setError('请选择开始日期和结束日期');
      setLoading(false);
      return;
    }

    if (endDate < startDate) {
      setError('结束日期不能早于开始日期');
      setLoading(false);
      return;
    }

    try {
      // 确保日期格式正确（添加时间部分）
      const updateData: UpdateTripRequest = {
        name: formData.name,
        startDate: formData.startDate ? `${formData.startDate}T00:00:00.000Z` : undefined,
        endDate: formData.endDate ? `${formData.endDate}T00:00:00.000Z` : undefined,
      };
      
      await tripsApi.update(trip.id, updateData);
      toast.success('行程信息已更新', {
        description: '您的行程信息已成功保存',
        duration: 3000,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const errorMessage = err.message || '更新行程失败';
      setError(errorMessage);
      // 移除 Toast 错误通知，避免与内联错误消息重复
      // 模态框内的操作错误应该只使用内联错误消息
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑行程</DialogTitle>
          <DialogDescription>修改行程名称和日期</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4 min-h-[200px]">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tripName">行程名称（可选）</Label>
              <Input
                id="tripName"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：冰岛环岛游"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                为你的行程起个名字吧（可选，如不填写将自动生成）
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">开始日期</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="startDate"
                      variant="outline"
                      data-empty={!startDate}
                      className={cn(
                        "w-full justify-start text-left font-normal h-10",
                        "data-[empty=true]:text-muted-foreground",
                        "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? (
                        format(startDate, 'MMMM do, yyyy', { locale: enUS })
                      ) : (
                        <span>选择开始日期</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" side="top" sideOffset={8}>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (date) {
                          const dateStr = format(date, 'yyyy-MM-dd');
                          setFormData({ ...formData, startDate: dateStr });
                          setStartDateOpen(false); // 选择日期后关闭弹窗
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">结束日期</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="endDate"
                      variant="outline"
                      data-empty={!endDate}
                      className={cn(
                        "w-full justify-start text-left font-normal h-10",
                        "data-[empty=true]:text-muted-foreground",
                        "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? (
                        format(endDate, 'MMMM do, yyyy', { locale: enUS })
                      ) : (
                        <span>选择结束日期</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" side="top" sideOffset={8}>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        if (date) {
                          const dateStr = format(date, 'yyyy-MM-dd');
                          setFormData({ ...formData, endDate: dateStr });
                          setEndDateOpen(false); // 选择日期后关闭弹窗
                        }
                      }}
                      initialFocus
                      disabled={(date) => {
                        if (startDate) {
                          return date < startDate;
                        }
                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

