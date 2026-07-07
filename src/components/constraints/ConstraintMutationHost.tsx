import {
  AddConstraintDialog,
  ConstraintItemEditDialog,
} from '@/components/plan-studio/workbench';
import type { ConstraintMutationsController } from '@/hooks/useConstraintMutations';
import type { PlanningConstraintsSummary } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import type { TripConstraintsListResponse } from '@/types/trip-constraints';

export interface ConstraintMutationHostProps {
  tripId: string;
  trip?: TripDetail | null;
  summary: PlanningConstraintsSummary | null;
  constraintsApiList?: TripConstraintsListResponse | null;
  mutations: ConstraintMutationsController;
}

/** 规划 / 行中共用的约束新增与单条编辑弹窗 */
export function ConstraintMutationHost({
  tripId,
  trip,
  summary,
  constraintsApiList,
  mutations,
}: ConstraintMutationHostProps) {
  const {
    showAddDialog,
    setShowAddDialog,
    itemEditConstraintId,
    setItemEditConstraintId,
    activeSoftIds,
    configuredHardIds,
    handleSelectTemplate,
    handleBatchAddTemplates,
    handleAddCustomSoft,
    handleSoftPrefsChanged,
    handleConstraintSaved,
    onDailyDriveHoursSaved,
    onLegacyEditor,
    onNaturalLanguageSubmit,
    softPrefsRevision,
    budgetProfile,
  } = mutations;

  return (
    <>
      <AddConstraintDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        trip={trip}
        activeSoftIds={activeSoftIds}
        configuredHardIds={configuredHardIds}
        onSelectTemplate={handleSelectTemplate}
        onBatchAddTemplates={handleBatchAddTemplates}
        onAddCustomSoft={handleAddCustomSoft}
        onOpenLegacyEditor={onLegacyEditor}
        onNaturalLanguageSubmit={onNaturalLanguageSubmit}
      />

      <ConstraintItemEditDialog
        tripId={tripId}
        constraintId={itemEditConstraintId}
        open={itemEditConstraintId != null}
        onOpenChange={(open) => {
          if (!open) setItemEditConstraintId(null);
        }}
        summary={summary}
        trip={trip}
        onOpenLegacyEditor={onLegacyEditor}
        onSaved={() => void handleConstraintSaved()}
        onDailyDriveHoursSaved={onDailyDriveHoursSaved}
        onSoftPrefsChanged={handleSoftPrefsChanged}
        softPrefsRevision={softPrefsRevision}
        constraintsApiList={constraintsApiList}
        budgetProfile={budgetProfile ?? null}
      />
    </>
  );
}
