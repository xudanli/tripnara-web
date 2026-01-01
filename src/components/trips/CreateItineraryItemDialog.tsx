import { useState, useEffect } from 'react';
import { itineraryItemsApi } from '@/api/trips';
import type { CreateItineraryItemRequest, ItineraryItemType } from '@/types/trip';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateItineraryItemDialogProps {
  tripDayId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateItineraryItemDialog({
  tripDayId,
  open,
  onOpenChange,
  onSuccess,
}: CreateItineraryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateItineraryItemRequest>({
    tripDayId,
    type: 'ACTIVITY',
    startTime: '',
    endTime: '',
    note: '',
  });

  useEffect(() => {
    if (open) {
      // 重置表单
      setFormData({
        tripDayId,
        type: 'ACTIVITY',
        startTime: '',
        endTime: '',
        note: '',
        placeId: undefined,
        trailId: undefined,
      });
      setError(null);
    }
  }, [open, tripDayId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData: CreateItineraryItemRequest = {
        ...formData,
        tripDayId,
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : '',
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : '',
        // 如果 placeId 或 trailId 为空字符串，设为 undefined
        placeId: formData.placeId ? Number(formData.placeId) : undefined,
        trailId: formData.trailId ? Number(formData.trailId) : undefined,
        note: formData.note || undefined,
      };

      await itineraryItemsApi.create(submitData);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || '创建行程项失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>添加行程项</DialogTitle>
          <DialogDescription>在指定日期添加活动、用餐、休息或交通等行程项</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="type">行程项类型</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as ItineraryItemType })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVITY">游玩活动</SelectItem>
                  <SelectItem value="REST">休息/咖啡</SelectItem>
                  <SelectItem value="MEAL_ANCHOR">必吃大餐（需要订位）</SelectItem>
                  <SelectItem value="MEAL_FLOATING">随便吃吃</SelectItem>
                  <SelectItem value="TRANSIT">交通移动</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">开始时间</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime || ''}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">结束时间</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime || ''}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            {(formData.type === 'ACTIVITY' || formData.type === 'MEAL_ANCHOR' || formData.type === 'MEAL_FLOATING') && (
              <div className="space-y-2">
                <Label htmlFor="placeId">地点 ID（可选）</Label>
                <Input
                  id="placeId"
                  type="number"
                  value={formData.placeId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      placeId: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="输入地点 ID"
                />
                <p className="text-xs text-muted-foreground">
                  如果关联了地点，系统会自动校验营业时间
                </p>
              </div>
            )}

            {formData.type === 'ACTIVITY' && (
              <div className="space-y-2">
                <Label htmlFor="trailId">徒步路线 ID（可选）</Label>
                <Input
                  id="trailId"
                  type="number"
                  value={formData.trailId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trailId: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="输入徒步路线 ID"
                />
                <p className="text-xs text-muted-foreground">
                  如果是徒步活动，可以关联徒步路线
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note">备注</Label>
              <Textarea
                id="note"
                value={formData.note || ''}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="添加备注信息（如：记得带充电宝、需要提前预约等）"
                rows={3}
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
              {loading ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

