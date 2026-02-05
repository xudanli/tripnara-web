/**
 * 重新排序行程对话框
 * 允许用户拖拽调整当日行程项的顺序
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { executionApi, type ReorderResponse } from '@/api/execution';
import { toast } from 'sonner';
import { GripVertical, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { ScheduleItem } from '@/types/trip';
import { cn } from '@/lib/utils';

interface ReorderScheduleDialogProps {
  tripId: string;
  dayId: string;
  items: ScheduleItem[];
  // 可选的 itemId 映射（从 placeId 到 itemId）
  itemIdMap?: Map<number, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (result: ReorderResponse) => void;
}

export function ReorderScheduleDialog({
  tripId,
  dayId,
  items,
  itemIdMap,
  open,
  onOpenChange,
  onSuccess,
}: ReorderScheduleDialogProps) {
  const [reorderedItems, setReorderedItems] = useState<ScheduleItem[]>(items);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReorderedItems(items);
      setDraggedIndex(null);
      setTargetIndex(null);
    }
  }, [open, items]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setTargetIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && targetIndex !== null) {
      const newItems = [...reorderedItems];
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, removed);
      setReorderedItems(newItems);
    }
    setDraggedIndex(null);
    setTargetIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newItems = [...reorderedItems];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      setReorderedItems(newItems);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < reorderedItems.length - 1) {
      const newItems = [...reorderedItems];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      setReorderedItems(newItems);
    }
  };

  const handleSubmit = async () => {
    // 检查顺序是否改变
    const orderChanged = reorderedItems.some((item, index) => {
      const originalItem = items[index];
      return !originalItem || item.placeId !== originalItem.placeId;
    });

    if (!orderChanged) {
      toast.info('顺序未改变');
      onOpenChange(false);
      return;
    }

    setSubmitting(true);
    try {
      // 构建新的顺序数组
      // 如果有 itemIdMap，使用 itemId；否则使用 placeId（需要后端支持）
      const newOrder = reorderedItems.map((item) => {
        if (itemIdMap && itemIdMap.has(item.placeId)) {
          return itemIdMap.get(item.placeId)!;
        }
        // 如果没有 itemIdMap，使用 placeId 作为临时标识（需要后端支持）
        return item.placeId.toString();
      });

      const result = await executionApi.reorder({
        tripId,
        dayId,
        newOrder,
        reason: '用户请求调整顺序',
      });

      toast.success('行程已重新排序');
      if (onSuccess) {
        onSuccess(result);
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to reorder:', err);
      toast.error(err?.message || '重新排序失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>重新排序行程</DialogTitle>
          <DialogDescription>
            拖拽调整行程项的顺序，或使用上下箭头按钮移动
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {reorderedItems.map((item, index) => (
            <div
              key={`${item.placeId}-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'flex items-center gap-3 p-3 border rounded-lg cursor-move transition-colors',
                draggedIndex === index && 'opacity-50',
                targetIndex === index && 'border-primary bg-primary/5'
              )}
            >
              <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">{item.placeName}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  {format(new Date(item.startTime), 'HH:mm')} - {format(new Date(item.endTime), 'HH:mm')}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === reorderedItems.length - 1}
                >
                  ↓
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                提交中...
              </>
            ) : (
              '确认排序'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
