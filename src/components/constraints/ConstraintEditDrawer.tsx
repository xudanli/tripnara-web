import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ConstraintConsolePanel } from '@/components/plan-studio/workbench';
import { ConstraintMutationHost } from '@/components/constraints/ConstraintMutationHost';
import { useConstraintMutations } from '@/hooks/useConstraintMutations';
import { useConstraintsSummary } from '@/hooks/useConstraintsSummary';
import {
  useWorkbenchBudgetProfile,
  useWorkbenchTripConstraints,
} from '@/pages/plan-studio/hooks/useWorkbenchData';
import { buildPlanStudioConstraintsPath } from '@/lib/travel-status-navigation.util';
import { dispatchOpenConstraintEditor } from '@/lib/plan-studio-constraints-events';
import type { ConstraintPendingKey } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';

export interface ConstraintEditDrawerProps {
  tripId: string;
  trip?: TripDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 行中 / 概览 · 约束摘要 + 新增/编辑（不进入 Plan Studio 三栏控制台） */
export function ConstraintEditDrawer({
  tripId,
  trip,
  open,
  onOpenChange,
}: ConstraintEditDrawerProps) {
  const navigate = useNavigate();
  const constraintsSummary = useConstraintsSummary(tripId, trip);
  const constraintsQuery = useWorkbenchTripConstraints(tripId, open);
  const budgetQuery = useWorkbenchBudgetProfile(tripId, open);
  const constraintsApiList = constraintsQuery.data ?? null;

  const mutations = useConstraintMutations({
    tripId,
    trip,
    summary: constraintsSummary.summary,
    constraintsApiList,
    budgetProfile: budgetQuery.data ?? null,
    constraintConsoleOpen: open,
    onAfterConstraintEvalCommit: () => void constraintsSummary.reload(),
  });

  const openFullConsole = useCallback(() => {
    onOpenChange(false);
    navigate(buildPlanStudioConstraintsPath(tripId));
  }, [navigate, onOpenChange, tripId]);

  const handleEditLegacyConstraint = useCallback(
    (key: ConstraintPendingKey) => {
      onOpenChange(false);
      navigate(buildPlanStudioConstraintsPath(tripId));
      window.setTimeout(() => {
        dispatchOpenConstraintEditor({ tripId, key });
      }, 150);
    },
    [navigate, onOpenChange, tripId],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="flex items-center gap-2 text-base">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />
                  约束与偏好
                </SheetTitle>
                <SheetDescription className="mt-1 text-xs">
                  规划与行中共用同一套约束数据；此处可快速新增或编辑单条规则。
                </SheetDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 text-xs"
                onClick={openFullConsole}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                完整控制台
              </Button>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ConstraintConsolePanel
              tripId={tripId}
              summary={constraintsSummary.summary}
              trip={trip}
              loading={constraintsSummary.loading}
              loadSettled={constraintsSummary.loadSettled}
              error={constraintsSummary.error}
              onRetry={() => void constraintsSummary.reload()}
              onAddConstraint={mutations.openAddDialog}
              onViewAllConstraints={openFullConsole}
              onOpenConstraintConsole={openFullConsole}
              onEditConstraintItem={mutations.openEditItem}
              onEditConstraint={handleEditLegacyConstraint}
              softPrefsRevision={mutations.softPrefsRevision}
              onSoftPrefsChanged={mutations.handleSoftPrefsChanged}
              constraintsApiList={constraintsApiList}
              budgetProfile={budgetQuery.data ?? null}
              onOpenFeasibilityReport={() =>
                navigate(`/dashboard/feasibility?tripId=${encodeURIComponent(tripId)}`)
              }
              onOpenDecisionProblem={(problemId) =>
                navigate(
                  `/dashboard/plan-studio?tripId=${encodeURIComponent(tripId)}&tab=schedule&decisionProblemId=${encodeURIComponent(problemId)}`,
                )
              }
            />
          </div>
        </SheetContent>
      </Sheet>

      <ConstraintMutationHost
        tripId={tripId}
        trip={trip}
        summary={constraintsSummary.summary}
        constraintsApiList={constraintsApiList}
        mutations={mutations}
      />
    </>
  );
}
