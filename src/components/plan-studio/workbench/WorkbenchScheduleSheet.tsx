import { lazy, Suspense, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import type { TripDetail } from '@/types/trip';
import type { TripExecutabilityView } from '@/types/trip-executability';
import { workbenchPanelHeader, workbenchPanelTitle } from './workbench-ui';

const ScheduleTab = lazy(() => import('@/pages/plan-studio/ScheduleTab'));

export interface WorkbenchScheduleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  trip?: TripDetail | null;
  refreshKey?: number;
  /** 打开后滚动定位到指定天（0-based） */
  focusDayIndex?: number;
  onScheduleChanged?: () => void;
  /** P1：TEP 按日角标与 item 保存后刷新 */
  tepEnabled?: boolean;
  tepExecutability?: TripExecutabilityView | null;
  onTepRefresh?: () => void | Promise<void>;
}

/** 完整时间轴编辑抽屉（保留 ScheduleTab 能力，不影响工作台摘要视图） */
export function WorkbenchScheduleSheet({
  open,
  onOpenChange,
  tripId,
  trip,
  refreshKey = 0,
  focusDayIndex,
  onScheduleChanged,
  tepEnabled = false,
  tepExecutability = null,
  onTepRefresh,
}: WorkbenchScheduleSheetProps) {
  const handleOpenChange = (next: boolean) => {
    if (!next && open) {
      onScheduleChanged?.();
    }
    onOpenChange(next);
  };

  useEffect(() => {
    if (!open || focusDayIndex == null || focusDayIndex < 0) return;
    const timer = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('plan-studio:scroll-schedule-day', {
          detail: { dayIndex: focusDayIndex },
        }),
      );
    }, 450);
    return () => window.clearTimeout(timer);
  }, [open, focusDayIndex, refreshKey]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-4xl">
        <SheetHeader className={cn(workbenchPanelHeader, 'px-5 py-4 text-left')}>
          <SheetTitle className={workbenchPanelTitle}>编辑完整时间轴</SheetTitle>
          <SheetDescription className="text-xs">
            拖拽调整活动顺序、修改时间与地点。关闭后将刷新工作台行程视图。
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {open ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-24">
                  <Spinner className="h-8 w-8" />
                </div>
              }
            >
              <ScheduleTab
                tripId={tripId}
                initialTrip={trip}
                refreshKey={refreshKey}
                tepEnabled={tepEnabled}
                tepExecutability={tepExecutability}
                onTepRefresh={onTepRefresh}
              />
            </Suspense>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
