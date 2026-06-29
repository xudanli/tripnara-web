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
  className?: string;
}

/** 左侧 · 约束与偏好（摘要态） */
export function PlanningWorkbenchConstraintsPanel({
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
      className={cn(className)}
    />
  );
}

export type { ConstraintPendingKey };
