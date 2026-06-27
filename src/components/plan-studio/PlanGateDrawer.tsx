import PlanningWorkbenchTab from '@/pages/plan-studio/PlanningWorkbenchTab';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { usePlanStudio } from '@/contexts/PlanStudioContext';

interface PlanGateDrawerProps {
  tripId?: string | null;
  initialTrip?: import('@/types/trip').TripDetail | null;
}

/**
 * Plan Gate：方案预览、三人格门控、对比与提交（原「决策评估」Tab）
 */
export default function PlanGateDrawer({ tripId, initialTrip }: PlanGateDrawerProps) {
  const {
    planGateOpen,
    closePlanGate,
    planGateSession,
    planGateAutoGenerate,
    notifyPlanCommitted,
  } = usePlanStudio();

  return (
    <Sheet open={planGateOpen} onOpenChange={(open) => !open && closePlanGate()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl lg:max-w-4xl"
      >
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle>方案预览与提交</SheetTitle>
          <SheetDescription>
            查看评估结果，确认后可写入时间轴
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {tripId && planGateOpen ? (
            <PlanningWorkbenchTab
              key={`plan-gate-${tripId}-${planGateSession}`}
              tripId={tripId}
              initialTrip={initialTrip}
              embedMode
              autoGenerateOnOpen={planGateAutoGenerate}
              onPlanCommitted={notifyPlanCommitted}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
