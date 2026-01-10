import { useState, useEffect } from 'react';
import { itineraryItemsApi } from '@/api/trips';
import type { ItineraryItem, UpdateItineraryItemRequest } from '@/types/trip';
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
import { AlertCircle, Info } from 'lucide-react';

interface EditItineraryItemDialogProps {
  item: ItineraryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditItineraryItemDialog({
  item,
  open,
  onOpenChange,
  onSuccess,
}: EditItineraryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [originalStartTime, setOriginalStartTime] = useState<string>('');
  const [formData, setFormData] = useState<UpdateItineraryItemRequest>({
    startTime: item.startTime ? new Date(item.startTime).toISOString().slice(0, 16) : '',
    endTime: item.endTime ? new Date(item.endTime).toISOString().slice(0, 16) : '',
    note: item.note || '',
  });

  useEffect(() => {
    if (open && item) {
      const startTime = item.startTime ? new Date(item.startTime).toISOString().slice(0, 16) : '';
      setFormData({
        startTime,
        endTime: item.endTime ? new Date(item.endTime).toISOString().slice(0, 16) : '',
        note: item.note || '',
      });
      setOriginalStartTime(startTime);
      setError(null);
      setWarning(null);
    }
  }, [item, open]);

  // 检测开始时间是否改变（用于显示智能调整提示）
  const startTimeChanged = formData.startTime !== originalStartTime;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updateData: UpdateItineraryItemRequest = {
        ...formData,
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : undefined,
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : undefined,
      };

      await itineraryItemsApi.update(item.id, updateData);
      
      // 更新成功，调用成功回调（会重新加载当天的行程项以获取最新时间）
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const errorMessage = err.message || '更新行程项失败';
      
      // 检查是否是时间不合理的警告（包含"时间可能不合理"或"建议开始时间"等关键词）
      if (errorMessage.includes('时间可能不合理') || errorMessage.includes('建议开始时间') || errorMessage.includes('预计需要')) {
        setWarning(errorMessage);
        setError(null);
      } else {
        setError(errorMessage);
        setWarning(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>编辑行程项</DialogTitle>
          <DialogDescription>
            {item.Place?.nameCN || item.Trail?.nameCN || item.type}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {warning && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{warning}</span>
              </div>
            )}

            {startTimeChanged && !warning && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  更新开始时间后，系统会根据实际距离和交通方式自动计算旅行时间，并智能调整后续行程项的时间。
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">开始时间</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, startTime: e.target.value });
                    // 清除之前的警告
                    if (warning) setWarning(null);
                  }}
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

            <div className="space-y-2">
              <Label htmlFor="note">备注</Label>
              <Textarea
                id="note"
                value={formData.note || ''}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="添加备注信息"
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
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

