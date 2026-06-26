import * as React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { resolveLoopValidationPresentation } from '@/lib/trip-loop-display';
import { feasibilityVerdictGateClasses, feasibilityVerdictToGate } from '@/lib/feasibility-ui';
import { getGateStatusLabel } from '@/lib/gate-status';
import { useTripFeasibilityReport } from '@/hooks/useTripFeasibilityReport';
import { useReadinessRepairLoop } from '@/hooks/useReadinessRepairLoop';
import { isTripLoopReadinessEnabled } from '@/lib/trip-loop-feature';
import { ReadinessRepairLoopWorkspace } from './ReadinessRepairLoopWorkspace';

interface ReadinessRepairLoopSheetProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIssueId?: string | null;
  onNavigateToSchedule?: (
    detail: import('@/lib/plan-studio-schedule-navigation').PlanStudioScheduleNavigateDetail,
  ) => void;
  onApplied?: () => void;
}

export function ReadinessRepairLoopSheet({
  tripId,
  open,
  onOpenChange,
  initialIssueId,
  onNavigateToSchedule,
  onApplied,
}: ReadinessRepairLoopSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl lg:max-w-5xl p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="px-4 py-2.5 border-b border-border bg-muted/25 shrink-0">
          <div className="flex items-start justify-between gap-2 pr-8">
            <div>
              <SheetTitle className="text-sm font-semibold">
                {isTripLoopReadinessEnabled() ? '方案验证闭环' : '可执行性检查'}
              </SheetTitle>
              {isTripLoopReadinessEnabled() ? (
                <SheetDescription className="text-[11px]">
                  系统验证 → 提议调整 → 您确认后写库
                </SheetDescription>
              ) : null}
            </div>
            <Link
              to={`/dashboard/feasibility?tripId=${encodeURIComponent(tripId)}`}
              className="text-[11px] text-primary hover:underline shrink-0 pt-0.5"
              onClick={() => onOpenChange(false)}
            >
              全页查看
            </Link>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <ReadinessRepairLoopWorkspace
            tripId={tripId}
            variant="sheet"
            active={open}
            initialIssueId={initialIssueId}
            onNavigateToSchedule={(detail) => {
              onOpenChange(false);
              onNavigateToSchedule?.(detail);
            }}
            onApplied={onApplied}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ReadinessRepairLoopTriggerProps {
  tripId: string;
  onClick: () => void;
  className?: string;
  /** 来自 Decision Strip，避免重复 hook */
  loopPhaseLabel?: string | null;
}

/** Plan Studio 顶栏：优先展示 Loop phase，回退 feasibility 裁决 */
export function ReadinessRepairLoopTrigger({
  tripId,
  onClick,
  className,
  loopPhaseLabel: loopPhaseLabelProp,
}: ReadinessRepairLoopTriggerProps) {
  const loopEnabled = isTripLoopReadinessEnabled();
  const loop = useReadinessRepairLoop(tripId, {
    enabled: loopEnabled && loopPhaseLabelProp == null,
    autoRestore: loopPhaseLabelProp == null,
  });
  const { data: feasibility } = useTripFeasibilityReport(
    tripId,
    !loopPhaseLabelProp && !loop.ui,
  );

  const phase =
    loopPhaseLabelProp ??
    (loop.ui ? resolveLoopValidationPresentation(loop.ui).phaseLabel : null);
  const gateLabel =
    phase ??
    (feasibility
      ? getGateStatusLabel(feasibilityVerdictToGate(feasibility.verdict.status))
      : null);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('gap-1.5 h-8 text-xs', className)}
      onClick={onClick}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">方案验证</span>
      {gateLabel ? (
        <Badge
          variant="secondary"
          className={cn(
            'text-[10px] px-1.5 py-0 h-4',
            !loopPhaseLabelProp &&
              !phase &&
              feasibility &&
              feasibilityVerdictGateClasses(feasibility.verdict.status),
          )}
        >
          {gateLabel}
        </Badge>
      ) : null}
    </Button>
  );
}
