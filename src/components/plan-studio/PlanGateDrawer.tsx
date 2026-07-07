import { PlanGateWizard } from '@/components/plan-gate/PlanGateWizard';
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
  /** 约束 / 决策等输入摘要（来自规划工作台） */
  inputsSummary?: import('@/hooks/usePlanGateFlow').PlanGateInputsSummary;
}

/**
 * Plan Gate（方案确认）：决策落地闸门 — 生成草案、多维验证、取舍确认、提交时间轴
 */
export default function PlanGateDrawer({
  tripId,
  initialTrip,
  inputsSummary,
}: PlanGateDrawerProps) {
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
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl"
      >
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle>方案确认</SheetTitle>
          <SheetDescription>基于当前决策生成并提交完整行程方案</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          {tripId && planGateOpen ? (
            <PlanGateWizard
              key={`plan-gate-v2-${tripId}-${planGateSession}`}
              tripId={tripId}
              initialTrip={initialTrip}
              autoGenerateOnOpen={planGateAutoGenerate}
              inputsSummary={inputsSummary}
              onPlanCommitted={notifyPlanCommitted}
              onClose={closePlanGate}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
