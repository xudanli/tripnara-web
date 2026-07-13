import { memo } from 'react';
import { Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ConstraintConsolePanel,
  type ConstraintConsolePanelProps,
} from './ConstraintConsolePanel';
import type { PlanningConstraintsCardProps } from '@/components/plan-studio/PlanningConstraintsCard';
import type { ConstraintPendingKey } from '@/types/planning-constraints';
import type { TripBudgetProfile } from '@/types/trip-budget';
import type { TripConstraintsListResponse } from '@/types/trip-constraints';

export interface PlanningWorkbenchConstraintsPanelProps {
  tripId: string;
  constraints: PlanningConstraintsCardProps;
  trip?: PlanningConstraintsCardProps['trip'];
  conflictCount?: number;
  onAddConstraint?: () => void;
  onViewAllConstraints?: () => void;
  onOpenConstraintConsole?: (constraintId?: string) => void;
  onEditConstraintItem?: (constraintId: string) => void;
  softPrefsRevision?: number;
  onSoftPrefsChanged?: () => void;
  constraintsApiList?: TripConstraintsListResponse | null;
  budgetProfile?: TripBudgetProfile | null;
  onOpenFeasibilityReport?: () => void;
  onOpenDecisionProblem?: (problemId: string) => void;
  onOpenPlanningInbox?: () => void;
  focusMode?: import('@/lib/constraint-sidebar-focus.util').ConstraintSidebarFocusMode;
  onFocusAttention?: () => void;
  wishSummary?: import('@/types/trip-wishes').WishSummary | null;
  collaborators?: import('@/types/trip').Collaborator[] | null;
  onOpenCollaborationCenter?: () => void;
  onOpenBudgetTab?: () => void;
  selfDriveSettings?: ConstraintConsolePanelProps['selfDriveSettings'];
  className?: string;
}

/** 左侧 · 本次规划条件（摘要态） */
export const PlanningWorkbenchConstraintsPanel = memo(function PlanningWorkbenchConstraintsPanel({
  tripId,
  constraints,
  trip,
  conflictCount = 0,
  onAddConstraint,
  onViewAllConstraints,
  onOpenConstraintConsole,
  onEditConstraintItem,
  softPrefsRevision,
  onSoftPrefsChanged,
  constraintsApiList,
  budgetProfile,
  onOpenFeasibilityReport,
  onOpenDecisionProblem,
  onOpenPlanningInbox,
  focusMode,
  onFocusAttention,
  wishSummary,
  collaborators,
  onOpenCollaborationCenter,
  onOpenBudgetTab,
  selfDriveSettings,
  className,
}: PlanningWorkbenchConstraintsPanelProps) {
  const handleEdit: ConstraintConsolePanelProps['onEditConstraint'] = (key) => {
    constraints.onEditConstraint(key);
  };

  return (
    <ConstraintConsolePanel
      tripId={tripId}
      summary={constraints.summary}
      trip={trip ?? constraints.trip}
      loading={constraints.loading}
      loadSettled={constraints.loadSettled}
      error={constraints.error}
      onRetry={constraints.onRetry}
      conflictCount={conflictCount}
      pendingCount={constraints.summary?.pendingCount ?? constraints.planningInboxCount ?? 0}
      onAddConstraint={onAddConstraint}
      onViewAllConstraints={onViewAllConstraints}
      onOpenConstraintConsole={onOpenConstraintConsole}
      onEditConstraintItem={onEditConstraintItem}
      onEditConstraint={handleEdit}
      softPrefsRevision={softPrefsRevision}
      onSoftPrefsChanged={onSoftPrefsChanged}
      constraintsApiList={constraintsApiList}
      budgetProfile={budgetProfile}
      onOpenFeasibilityReport={onOpenFeasibilityReport}
      onOpenDecisionProblem={onOpenDecisionProblem}
      onOpenPlanningInbox={onOpenPlanningInbox}
      focusMode={focusMode}
      onFocusAttention={onFocusAttention}
      wishSummary={wishSummary}
      collaborators={collaborators}
      onOpenCollaborationCenter={onOpenCollaborationCenter}
      onOpenBudgetTab={onOpenBudgetTab}
      selfDriveSettings={selfDriveSettings}
      variant="workbench"
      className={cn(className)}
    />
  );
});

export type { ConstraintPendingKey };
