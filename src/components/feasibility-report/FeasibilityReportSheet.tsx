import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useTripFeasibilityReport } from '@/hooks/useTripFeasibilityReport';
import {
  feasibilityVerdictGateClasses,
  feasibilityVerdictToGate,
} from '@/lib/feasibility-ui';
import { getGateStatusLabel } from '@/lib/gate-status';
import { FeasibilityReportPanel } from './FeasibilityReportPanel';

interface FeasibilityReportSheetProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIssueId?: string | null;
  onNavigateToSchedule?: (
    detail: import('@/lib/plan-studio-schedule-navigation').PlanStudioScheduleNavigateDetail,
  ) => void;
}

export function FeasibilityReportSheet({
  tripId,
  open,
  onOpenChange,
  initialIssueId,
  onNavigateToSchedule,
}: FeasibilityReportSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl lg:max-w-5xl p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="px-4 py-2.5 border-b border-border bg-muted/25 shrink-0">
          <SheetTitle className="text-sm font-semibold">可执行性检查</SheetTitle>
          <SheetDescription className="text-[11px]">
            优先处理下方问题，验证与维度说明可稍后展开
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <FeasibilityReportPanel
            tripId={tripId}
            embedded
            initialIssueId={initialIssueId}
            onNavigateToSchedule={(detail) => {
              onOpenChange(false);
              onNavigateToSchedule?.(detail);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface FeasibilityReportTriggerProps {
  tripId: string;
  onClick: () => void;
  className?: string;
}

/** 顶栏入口：显示裁决态 + 分数摘要 */
export function FeasibilityReportTrigger({ tripId, onClick, className }: FeasibilityReportTriggerProps) {
  const { data } = useTripFeasibilityReport(tripId);

  const gateLabel = data
    ? getGateStatusLabel(feasibilityVerdictToGate(data.verdict.status))
    : null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('flex items-center gap-1.5 text-xs sm:text-sm', className)}
      onClick={onClick}
      data-tour="feasibility-trigger"
    >
      <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
      <span className="hidden sm:inline">可执行性</span>
      {data && (
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-medium border tabular-nums',
              feasibilityVerdictGateClasses(data.verdict.status),
            )}
          >
            {data.overallScore}
          </span>
          {gateLabel && (
            <span className="hidden md:inline text-[10px] text-muted-foreground font-normal">
              {gateLabel}
            </span>
          )}
        </span>
      )}
    </Button>
  );
}
