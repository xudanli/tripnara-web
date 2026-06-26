import { useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useInTripRecoveryLoop, IN_TRIP_LOOP_POLL_MS } from '@/hooks/useInTripRecoveryLoop';
import { isTripLoopInTripEnabled } from '@/lib/trip-loop-feature';
import { InTripRecoveryLoopPanel } from './InTripRecoveryLoopPanel';
import { toast } from 'sonner';

interface InTripRecoveryLoopSheetProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environmentEventId?: string | null;
  onApplied?: () => void;
}

export function InTripRecoveryLoopSheet({
  tripId,
  open,
  onOpenChange,
  environmentEventId,
  onApplied,
}: InTripRecoveryLoopSheetProps) {
  const enabled = isTripLoopInTripEnabled();
  const loop = useInTripRecoveryLoop(tripId, {
    enabled: open && enabled,
    onApplied,
  });

  useEffect(() => {
    if (!open || !enabled || !environmentEventId) return;
    void loop.run(environmentEventId);
    // 仅在手势打开时触发；latest 仍为主数据源
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, enabled, environmentEventId]);

  const handleApply = async () => {
    const res = await loop.apply();
    if (!res) return;
    const hasDeferred = loop.error != null;
    if (!hasDeferred) {
      toast.success('已采用行中调整');
      onApplied?.();
      onOpenChange(false);
    }
  };

  if (!enabled) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-base">今日变化</SheetTitle>
          <SheetDescription className="text-xs">
            环境变化 → 影响评估 → 推荐调整
          </SheetDescription>
        </SheetHeader>
        <InTripRecoveryLoopPanel
          ui={loop.ui}
          loading={loop.loading || loop.running}
          applying={loop.applying}
          error={loop.error}
          canApply={loop.canApply}
          onApply={() => void handleApply()}
        />
      </SheetContent>
    </Sheet>
  );
}

/** 行中页顶部 banner：有非 monitoring 状态时展示 */
export function InTripRecoveryLoopBanner({
  tripId,
  onOpen,
  className,
}: {
  tripId: string;
  onOpen: () => void;
  className?: string;
}) {
  const enabled = isTripLoopInTripEnabled();
  const loop = useInTripRecoveryLoop(tripId, {
    enabled,
    pollIntervalMs: IN_TRIP_LOOP_POLL_MS,
  });

  if (!enabled || !loop.needsAttention || !loop.ui) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={className}
      aria-label={loop.ui.headline}
    >
      <InTripRecoveryLoopPanel
        ui={loop.ui}
        loading={false}
        canApply={false}
        className="w-full text-left cursor-pointer hover:shadow-md transition-shadow"
      />
    </button>
  );
}
