import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { usePlanGatePreTripTasks } from '@/hooks/usePlanGatePreTripTasks';
import { PlanGatePreTripTasksPanel } from './PlanGatePreTripTasksPanel';
import type { PlanGatePreTripTasks } from '@/types/plan-gate';

export interface PlanGatePreTripTasksDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  planId?: string | null;
  embedded?: PlanGatePreTripTasks | null;
}

export function PlanGatePreTripTasksDrawer({
  open,
  onOpenChange,
  tripId,
  planId,
  embedded,
}: PlanGatePreTripTasksDrawerProps) {
  const { preTripTasks, loading, refresh } = usePlanGatePreTripTasks({
    tripId,
    planId,
    embedded,
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>行前准备任务</SheetTitle>
          <SheetDescription>方案与行程侧汇总，提交后将写入行前准备收件箱</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pt-2">
          <PlanGatePreTripTasksPanel
            preTripTasks={preTripTasks}
            loading={loading}
            title="全部任务"
            emptyMessage="当前没有待处理的行前任务"
          />
          {!embedded && !loading ? (
            <button
              type="button"
              className="mt-3 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => void refresh()}
            >
              刷新列表
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
