import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addCustomSoftConstraint,
  addHardConstraintFromTemplate,
  addSoftConstraintFromTemplate,
  handleConstraintApiError,
  resolveSoftPreferences,
  serviceContextFromApiList,
} from '@/lib/constraint-console.service';
import {
  isBatchAddableConstraintTemplate,
  resolveConfiguredHardConstraintIds,
  shouldCatalogPostOnTemplatePick,
  type ConstraintTemplate,
} from '@/components/plan-studio/workbench/constraint-templates';
import { workbenchKeys } from '@/pages/plan-studio/hooks/useWorkbenchData';
import { useConstraintEditSession } from '@/hooks/useConstraintEditSession';
import { apiConstraintIdToUi } from '@/lib/trip-constraints.adapter';
import type { ConstraintPendingKey, PlanningConstraintsSummary } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import type { TripBudgetProfile } from '@/types/trip-budget';
import type { TripConstraintsListResponse } from '@/types/trip-constraints';

export interface UseConstraintMutationsOptions {
  tripId: string;
  trip?: TripDetail | null;
  summary: PlanningConstraintsSummary | null;
  constraintsApiList?: TripConstraintsListResponse | null;
  budgetProfile?: TripBudgetProfile | null;
  onLegacyEditor?: (key: ConstraintPendingKey) => void;
  onNaturalLanguageSubmit?: (text: string) => void;
  onDailyDriveHoursSaved?: (hours: number) => void;
  /** 选中模板创建 hard 约束后打开编辑器；返回 true 表示已由调用方处理 */
  onOpenEditorAfterCreate?: (constraintUiId: string) => boolean | void;
  /** 三栏约束控制台是否打开（参与编辑会话） */
  constraintConsoleOpen?: boolean;
  /** 会话结束合并评估后的附加刷新（decision-checker 等） */
  onAfterConstraintEvalCommit?: () => void | Promise<void>;
}

export function useConstraintMutations({
  tripId,
  trip,
  summary,
  constraintsApiList,
  budgetProfile,
  onLegacyEditor,
  onNaturalLanguageSubmit,
  onDailyDriveHoursSaved,
  onOpenEditorAfterCreate,
  constraintConsoleOpen = false,
  onAfterConstraintEvalCommit,
}: UseConstraintMutationsOptions) {
  const queryClient = useQueryClient();
  const [softPrefsRevision, setSoftPrefsRevision] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [itemEditConstraintId, setItemEditConstraintId] = useState<string | null>(null);

  const sessionUiActive =
    constraintConsoleOpen || showAddDialog || itemEditConstraintId != null;

  const constraintEditSession = useConstraintEditSession({
    tripId,
    queryClient,
    sessionUiActive,
    onAfterCommit: onAfterConstraintEvalCommit,
  });

  const handleSoftPrefsChanged = useCallback(() => {
    setSoftPrefsRevision((revision) => revision + 1);
    void queryClient.invalidateQueries({ queryKey: workbenchKeys.constraints(tripId) });
  }, [queryClient, tripId]);

  const handleConstraintSaved = constraintEditSession.notifyConstraintSaved;

  const openAddDialog = useCallback(() => setShowAddDialog(true), []);
  const openEditItem = useCallback((constraintId: string) => {
    setItemEditConstraintId(constraintId);
  }, []);

  const openEditor = useCallback(
    (editorId: string) => {
      if (onOpenEditorAfterCreate?.(editorId) === true) return;
      setItemEditConstraintId(editorId);
    },
    [onOpenEditorAfterCreate],
  );

  const activeSoftIds = useMemo(() => {
    const ctx = serviceContextFromApiList(constraintsApiList);
    return resolveSoftPreferences(tripId, ctx).map((preference) => preference.id);
  }, [tripId, softPrefsRevision, constraintsApiList]);

  const configuredHardIds = useMemo(
    () =>
      resolveConfiguredHardConstraintIds({
        apiList: constraintsApiList,
        summary,
        trip,
      }),
    [constraintsApiList, summary, trip],
  );

  const readServiceContext = useCallback(() => {
    return serviceContextFromApiList(
      queryClient.getQueryData<TripConstraintsListResponse>(workbenchKeys.constraints(tripId)) ??
        constraintsApiList,
    );
  }, [constraintsApiList, queryClient, tripId]);

  const handleSelectTemplate = useCallback(
    (constraintId: string, template: ConstraintTemplate) => {
      const mutationOptions = { queryClient };

      if (template.kind === 'soft') {
        void (async () => {
          try {
            const ctx = readServiceContext();
            const before = resolveSoftPreferences(tripId, ctx);
            const after = await addSoftConstraintFromTemplate(
              tripId,
              constraintId,
              ctx,
              undefined,
              mutationOptions,
            );
            if (after.length > before.length) {
              setSoftPrefsRevision((revision) => revision + 1);
              handleConstraintSaved();
              await queryClient.invalidateQueries({
                queryKey: workbenchKeys.constraints(tripId),
              });
              toast.success(`已添加软偏好「${template.label}」`);
            }
          } catch (err) {
            handleConstraintApiError(err);
          }
        })();
      }

      if (template.kind === 'hard' && shouldCatalogPostOnTemplatePick(template)) {
        void (async () => {
          try {
            const ctx = readServiceContext();
            const created = await addHardConstraintFromTemplate(
              tripId,
              template,
              ctx,
              mutationOptions,
            );
            if (created) {
              handleConstraintSaved();
              await queryClient.invalidateQueries({
                queryKey: workbenchKeys.constraints(tripId),
              });
              toast.success(`已添加硬约束「${template.label}」`);
              openEditor(apiConstraintIdToUi(created.id));
              return;
            }
          } catch (err) {
            handleConstraintApiError(err);
          }
        })();
        return;
      }

      openEditor(constraintId);
    },
    [handleConstraintSaved, openEditor, queryClient, readServiceContext, tripId],
  );

  const handleBatchAddTemplates = useCallback(
    async (templates: ConstraintTemplate[]) => {
      const batchable = templates.filter(isBatchAddableConstraintTemplate);
      if (batchable.length === 0) return 0;

      const mutationOptions = { queryClient };
      let addedCount = 0;
      const addedLabels: string[] = [];

      for (const template of batchable) {
        try {
          const ctx = readServiceContext();
          if (template.kind === 'soft') {
            const before = resolveSoftPreferences(tripId, ctx);
            const after = await addSoftConstraintFromTemplate(
              tripId,
              template.id,
              ctx,
              undefined,
              mutationOptions,
            );
            if (after.length > before.length) {
              addedCount += 1;
              addedLabels.push(template.label);
              setSoftPrefsRevision((revision) => revision + 1);
              handleConstraintSaved();
            }
          } else if (template.kind === 'hard') {
            const created = await addHardConstraintFromTemplate(
              tripId,
              template,
              ctx,
              mutationOptions,
            );
            if (created) {
              addedCount += 1;
              addedLabels.push(template.label);
              handleConstraintSaved();
            }
          }
        } catch (err) {
          handleConstraintApiError(err);
        }
      }

      if (addedCount > 0) {
        await queryClient.invalidateQueries({ queryKey: workbenchKeys.constraints(tripId) });
        if (addedCount === 1) {
          toast.success(`已添加「${addedLabels[0]}」`);
        } else {
          toast.success(`已添加 ${addedCount} 项约束`);
        }
      }
      return addedCount;
    },
    [handleConstraintSaved, queryClient, readServiceContext, tripId],
  );

  const handleAddCustomSoft = useCallback(
    (label: string, options?: { openEditor?: boolean }) => {
      void (async () => {
        try {
          const ctx = readServiceContext();
          const before = resolveSoftPreferences(tripId, ctx);
          const after = await addCustomSoftConstraint(tripId, label, ctx, '中', { queryClient });
          if (after.length <= before.length) return;
          setSoftPrefsRevision((revision) => revision + 1);
          handleConstraintSaved();
          await queryClient.invalidateQueries({
            queryKey: workbenchKeys.constraints(tripId),
          });
          toast.success(`已添加自定义软偏好「${label}」`);
          const added = after[after.length - 1];
          if (added && options?.openEditor !== false) {
            openEditor(added.id);
          }
        } catch (err) {
          handleConstraintApiError(err);
        }
      })();
    },
    [handleConstraintSaved, openEditor, queryClient, readServiceContext, tripId],
  );

  return {
    softPrefsRevision,
    showAddDialog,
    setShowAddDialog,
    itemEditConstraintId,
    setItemEditConstraintId,
    openAddDialog,
    openEditItem,
    activeSoftIds,
    configuredHardIds,
    handleSelectTemplate,
    handleBatchAddTemplates,
    handleAddCustomSoft,
    handleSoftPrefsChanged,
    handleConstraintSaved,
    constraintEditSession,
    onDailyDriveHoursSaved,
    onLegacyEditor,
    onNaturalLanguageSubmit,
    budgetProfile,
  };
}

export type ConstraintMutationsController = ReturnType<typeof useConstraintMutations>;
