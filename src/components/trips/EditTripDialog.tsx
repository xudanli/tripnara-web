import { useState, useEffect } from 'react';
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

interface EditTripDialogProps {
  trip: TripDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditTripDialog({ trip, open, onOpenChange, onSuccess }: EditTripDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateTripRequest>({
    destination: trip.destination,
    startDate: trip.startDate.split('T')[0], // 只取日期部分
    endDate: trip.endDate.split('T')[0],
    totalBudget: trip.totalBudget ?? 0,
  });

  // 当 trip 或 open 变化时更新表单数据
  useEffect(() => {
    if (open && trip) {
      setFormData({
        destination: trip.destination,
        startDate: trip.startDate.split('T')[0],
        endDate: trip.endDate.split('T')[0],
        totalBudget: trip.totalBudget ?? 0,
      });
      setError(null);
    }
  }, [trip, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 确保日期格式正确（添加时间部分）
      const updateData: UpdateTripRequest = {
        ...formData,
        startDate: formData.startDate ? `${formData.startDate}T00:00:00.000Z` : undefined,
        endDate: formData.endDate ? `${formData.endDate}T00:00:00.000Z` : undefined,
      };
      
      await tripsApi.update(trip.id, updateData);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || '更新行程失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>编辑行程</DialogTitle>
          <DialogDescription>修改行程的基本信息</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="destination">目的地</Label>
              <Input
                id="destination"
                value={formData.destination || ''}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="输入目的地"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">开始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">结束日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalBudget">总预算（¥）</Label>
              <Input
                id="totalBudget"
                type="number"
                min="0"
                step="0.01"
                value={formData.totalBudget ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, totalBudget: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.00"
              />
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
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

