import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { LifeEventType } from '@/types/self-evolution';
import { useResetLifeEventMemory } from '../hooks/useSelfEvolution';

const LIFE_EVENTS: Array<{ type: LifeEventType; label: string; description: string }> = [
  { type: 'marriage', label: '结婚', description: '生活方式转向稳定，偏好可能更偏向舒适与共享体验' },
  { type: 'childbirth', label: '生子', description: '家庭结构变化，安全与便利权重上升' },
  { type: 'retirement', label: '退休', description: '时间自由度提升，节奏与预算模式可能改变' },
  { type: 'relocation', label: '搬家', description: '地理与社交圈变化，目的地偏好可能重置' },
  { type: 'career_change', label: '职业变更', description: '工作节奏变化，旅行频率与风格可能调整' },
];

interface LifeEventModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LifeEventModal({ userId, open, onOpenChange }: LifeEventModalProps) {
  const reset = useResetLifeEventMemory();

  const handleReset = async (eventType: LifeEventType) => {
    try {
      await reset.mutateAsync({ userId, eventType });
      toast.success('记忆已根据生活事件调整');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '重置失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>生活事件</DialogTitle>
          <DialogDescription>
            选择近期生活事件，系统将相应调整你的旅行偏好记忆
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {LIFE_EVENTS.map((event) => (
            <Button
              key={event.type}
              variant="outline"
              className="h-auto w-full flex-col items-start gap-1 px-4 py-3 text-left"
              disabled={reset.isPending}
              onClick={() => handleReset(event.type)}
            >
              <span className="font-medium">{event.label}</span>
              <span className="text-xs font-normal text-muted-foreground">{event.description}</span>
            </Button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
