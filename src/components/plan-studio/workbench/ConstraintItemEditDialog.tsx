import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tripBudgetApi } from '@/api/trip-budget';
import { tripsApi } from '@/api/trips';
import { useWorkbenchBudgetProfile, workbenchKeys } from '@/pages/plan-studio/hooks/useWorkbenchData';
import { saveConstraintTimeRange, saveConstraintDailyDrive, saveConstraintAccommodation, saveConstraintTravelers, saveConstraintTransport, type ConstraintTransportValue } from '@/lib/planning-constraint-edit-meta';
import {
  formatConstraintSaveErrorMessage,
  handleConstraintApiError,
  removeSoftConstraint,
  serviceContextFromApiList,
  showConstraintSaveInfo,
  showConstraintSaveSuccess,
  applyConstraintListItemSave,
  updateSoftConstraintPriority,
  saveCatalogHardConstraint,
  patchTripConstraintItem,
} from '@/lib/constraint-console.service';
import { useTripConstraints } from '@/hooks/useTripConstraints';
import type { ConstraintPendingKey, PlanningConstraintsSummary } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import type { TripBudgetProfile } from '@/types/trip-budget';
import { TRIP_CONSTRAINT_LEGACY_IDS } from '@/types/trip-constraints';
import { uiConstraintIdToApi, draftToPreviewChange } from '@/lib/trip-constraints.adapter';
import { formatCurrency } from '@/utils/format';
import { EditConstraintDialog } from './EditConstraintDialog';
import type { ConstraintEditorDraft } from './constraint-console-types';
import {
  buildEditorDraftFromEntry,
  extractMustGoPlaces,
  isApiManagedHardConstraintId,
  isSoftConstraintId,
  type MustGoPlaceSummary,
} from './constraint-console-view.util';
import { buildHardConstraintMetadata } from '@/lib/constraint-metadata.util';
import {
  buildMemberOptionsFromContract,
  buildRouteSegmentOptionsFromTrip,
} from '@/lib/constraint-scope-options.util';
import { getHardConstraintTemplate } from './constraint-templates';
import { Lock } from 'lucide-react';

export interface ConstraintItemEditDialogProps {
  tripId: string;
  constraintId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: PlanningConstraintsSummary | null;
  trip?: TripDetail | null;
  onOpenLegacyEditor?: (key: ConstraintPendingKey) => void;
  onSaved?: () => void;
  /** 每日驾驶上限保存成功后同步行程 metadata（避免行程分析仍用旧上限） */
  onDailyDriveHoursSaved?: (hours: number) => void;
  onSoftPrefsChanged?: () => void;
  softPrefsRevision?: number;
  constraintsApiList?: import('@/types/trip-constraints').TripConstraintsListResponse | null;
  budgetProfile?: TripBudgetProfile | null;
}

/** 单条约束编辑弹窗（摘要面板 / 工作台共用，不跳转内页） */
export function ConstraintItemEditDialog({
  tripId,
  constraintId,
  open,
  onOpenChange,
  summary,
  trip,
  onOpenLegacyEditor,
  onSaved,
  onDailyDriveHoursSaved,
  onSoftPrefsChanged,
  softPrefsRevision = 0,
  constraintsApiList,
  budgetProfile: budgetProfileProp,
}: ConstraintItemEditDialogProps) {
  const queryClient = useQueryClient();
  const budgetQuery = useWorkbenchBudgetProfile(tripId, budgetProfileProp === undefined && open);
  const budgetProfile = budgetProfileProp ?? budgetQuery.data ?? null;
  const [intentMustPlaces, setIntentMustPlaces] = useState<number[]>([]);
  const [mustGoOverride, setMustGoOverride] = useState<MustGoPlaceSummary[] | null>(null);
  const [draftOverride, setDraftOverride] = useState<ConstraintEditorDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const tripConstraints = useTripConstraints({
    tripId,
    summary,
    trip,
    budgetProfile,
    intentMustPlaces,
    revision: softPrefsRevision,
    apiListOverride: constraintsApiList,
  });

  const { softPrefs, apiList, reload } = tripConstraints;
  const serviceCtx = useMemo(() => serviceContextFromApiList(apiList), [apiList]);

  const memberOptions = useMemo(
    () => buildMemberOptionsFromContract(apiList?.contract?.teamGovernance, trip),
    [apiList?.contract?.teamGovernance, trip],
  );

  const routeSegmentOptions = useMemo(
    () => buildRouteSegmentOptionsFromTrip(trip),
    [trip],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void tripsApi
      .getIntent(tripId)
      .then((intent) => {
        if (cancelled) return;
        setIntentMustPlaces(intent?.metadata?.constraints?.mustPlaces ?? []);
      })
      .catch(() => {
        if (!cancelled) setIntentMustPlaces([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, softPrefsRevision, open]);

  const selectedApiConstraint = useMemo(() => {
    if (!constraintId || !apiList?.items?.length) return null;
    const apiId = uiConstraintIdToApi(constraintId);
    return apiList.items.find((item) => item.id === apiId) ?? null;
  }, [constraintId, apiList?.items]);

  const mustGoPlacesSummary = useMemo(
    () => extractMustGoPlaces(trip, intentMustPlaces),
    [trip, intentMustPlaces],
  );

  const mustGoDraft =
    constraintId === 'must_go' ? (mustGoOverride ?? mustGoPlacesSummary) : mustGoPlacesSummary;

  useEffect(() => {
    if (!open) {
      setDraftOverride(null);
      setMustGoOverride(null);
      setSaveError(null);
    }
  }, [open, constraintId]);

  useEffect(() => {
    setSaveError(null);
  }, [draftOverride, constraintId]);

  const serverDraft = useMemo((): ConstraintEditorDraft | null => {
    if (!constraintId || constraintId.startsWith('external_')) return null;
    return buildEditorDraftFromEntry(constraintId, summary, trip, softPrefs, {
      intentMustPlaces,
      apiConstraint: selectedApiConstraint,
    });
  }, [constraintId, summary, trip, softPrefs, intentMustPlaces, selectedApiConstraint]);

  const draft = draftOverride ?? serverDraft;

  const selectedEntry = useMemo(() => {
    if (!constraintId) return null;
    return (
      tripConstraints.hardItems.find((item) => item.id === constraintId) ??
      tripConstraints.softItems.find((item) => item.id === constraintId) ??
      null
    );
  }, [constraintId, tripConstraints.hardItems, tripConstraints.softItems]);

  const editHardMetadata = useMemo(() => {
    if (!draft || draft.type === 'SOFT' || isSoftConstraintId(draft.id)) return null;
    const entry =
      selectedEntry ??
      ({
        id: draft.id,
        kind: 'hard' as const,
        label: draft.name,
        icon: getHardConstraintTemplate(draft.id)?.icon ?? Lock,
      });
    return buildHardConstraintMetadata({
      entry,
      apiConstraint: selectedApiConstraint,
      draft,
    });
  }, [draft, selectedEntry, selectedApiConstraint]);

  const handleDraftChange = useCallback(
    (patch: Partial<ConstraintEditorDraft>) => {
      setDraftOverride((prev) => {
        const base = prev ?? serverDraft;
        if (!base) return prev;
        return { ...base, ...patch };
      });
    },
    [serverDraft],
  );

  const refreshDraftFromServer = useCallback(() => {
    setDraftOverride(null);
    setMustGoOverride(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft) return;

    const finishSave = (successMessage: string) => {
      if (draft) {
        const currency = draft.currency ?? summary?.budget.currency ?? 'CNY';
        applyConstraintListItemSave(queryClient, tripId, draft, {
          mustGoPlaces: draft.id === 'must_go' ? mustGoDraft : undefined,
          travelersCount: summary?.travelers.count,
          budgetUsageLabel:
            budgetProfile?.actuals?.totalEstimated != null
              ? formatCurrency(budgetProfile.actuals.totalEstimated, currency)
              : undefined,
        });
      }
      refreshDraftFromServer();
      setSaveError(null);
      onOpenChange(false);
      showConstraintSaveSuccess(successMessage);
      void Promise.resolve(onSaved?.()).catch(() => undefined);
    };

    if (draft.id === 'time_range' && trip) {
      if (!draft.startDate || !draft.endDate) {
        toast.error('请选择出发与返程日期');
        return;
      }
      setSaving(true);
      try {
        await saveConstraintTimeRange(tripId, draft.startDate, draft.endDate, trip.name);
        finishSave('行程日期已保存');
      } catch (err) {
        handleConstraintApiError(err, err instanceof Error ? err.message : '保存失败');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (draft.id === 'budget') {
      setSaving(true);
      try {
        await tripBudgetApi.putIntent(tripId, {
          total: draft.targetValue,
          currency: draft.currency ?? summary?.budget.currency ?? 'CNY',
        });
        await queryClient.invalidateQueries({ queryKey: workbenchKeys.budgetProfile(tripId) });
        finishSave('预算上限已保存');
      } catch (err) {
        handleConstraintApiError(err, err instanceof Error ? err.message : '保存失败');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (draft.id === 'travelers') {
      if (!trip) {
        toast.error('行程数据未加载，请稍后重试');
        return;
      }
      const count = Math.round(draft.targetValue);
      if (!Number.isFinite(count) || count < 1 || count > 20) {
        toast.error('请输入 1–20 之间的出行人数');
        return;
      }
      setSaving(true);
      try {
        await saveConstraintTravelers(tripId, trip, count);
        finishSave('出行人数已保存');
      } catch (err) {
        handleConstraintApiError(err, err instanceof Error ? err.message : '保存失败');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (draft.id === 'transport') {
      if (!trip) {
        toast.error('行程数据未加载，请稍后重试');
        return;
      }
      if (!draft.transportMode) {
        toast.error('请选择基础交通方式');
        return;
      }
      setSaving(true);
      try {
        await saveConstraintTransport(
          tripId,
          trip,
          draft.transportMode as ConstraintTransportValue,
        );
        finishSave('基础交通已保存');
      } catch (err) {
        handleConstraintApiError(err, err instanceof Error ? err.message : '保存失败');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (isApiManagedHardConstraintId(draft.id)) {
      setSaving(true);
      try {
        const change = draftToPreviewChange(draft);
        await patchTripConstraintItem(
          tripId,
          TRIP_CONSTRAINT_LEGACY_IDS.MAX_SEGMENT_DISTANCE,
          change.patch,
          serviceCtx,
          { queryClient },
        );
        finishSave('单段最长行驶距离已保存');
      } catch (err) {
        handleConstraintApiError(err, err instanceof Error ? err.message : '保存失败');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (draft.id === 'daily_drive') {
      setSaving(true);
      try {
        await saveConstraintDailyDrive(tripId, draft.targetValue);
        onDailyDriveHoursSaved?.(draft.targetValue);
        finishSave('每日驾驶上限已保存');
      } catch (err) {
        const message = formatConstraintSaveErrorMessage(
          err instanceof Error ? err.message : '保存失败',
          trip?.metadata,
        );
        if (import.meta.env.DEV && trip?.metadata) {
          console.warn('[constraint] metadata size report', message);
        }
        setSaveError(message);
        handleConstraintApiError(err, err instanceof Error ? err.message : '保存失败');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (draft.id === 'must_go') {
      setSaving(true);
      try {
        const intent = await tripsApi.getIntent(tripId);
        const existing = intent.metadata?.constraints ?? {};
        await tripsApi.updateIntent(tripId, {
          pacingConfig: intent.pacingConfig
            ? {
                level: intent.pacingConfig.level as 'relaxed' | 'standard' | 'tight' | undefined,
                maxDailyActivities: intent.pacingConfig.maxDailyActivities,
              }
            : undefined,
          preferences: intent.metadata?.preferences,
          constraints: {
            dailyWalkLimit: existing.dailyWalkLimit,
            earlyRiser: existing.earlyRiser,
            nightOwl: existing.nightOwl,
            avoidPlaces: existing.avoidPlaces,
            mustPlaces: mustGoDraft.map((p) => p.id),
          },
          planningPolicy: intent.metadata?.planningPolicy as
            | 'safe'
            | 'experience'
            | 'challenge'
            | undefined,
          totalBudget: intent.budgetConfig?.totalBudget ?? intent.totalBudget,
        });
        setIntentMustPlaces(mustGoDraft.map((p) => p.id));
        setMustGoOverride(null);
        finishSave('必去地点已保存');
      } catch (err) {
        handleConstraintApiError(err, err instanceof Error ? err.message : '保存失败');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (draft.id === 'accommodation') {
      setSaving(true);
      try {
        await saveConstraintAccommodation(tripId, draft.targetValue);
        finishSave('住宿标准已保存');
      } catch (err) {
        const message = formatConstraintSaveErrorMessage(
          err instanceof Error ? err.message : '保存失败',
          trip?.metadata,
        );
        if (import.meta.env.DEV && trip?.metadata) {
          console.warn('[constraint] metadata size report', message);
        }
        setSaveError(message);
        handleConstraintApiError(err, err instanceof Error ? err.message : '保存失败');
      } finally {
        setSaving(false);
      }
      return;
    }

    const soft = softPrefs.find((p) => p.id === draft.id);
    if (soft) {
      const priority =
        draft.priority >= 7 ? ('高' as const) : draft.priority >= 4 ? ('中' as const) : ('低' as const);
      setSaving(true);
      try {
        await updateSoftConstraintPriority(tripId, draft.id, priority, serviceCtx, { queryClient });
        onSoftPrefsChanged?.();
        finishSave('软偏好已保存');
      } catch (err) {
        handleConstraintApiError(err);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (draft.type === 'HARD') {
      setSaving(true);
      try {
        const saved = await saveCatalogHardConstraint(tripId, draft, serviceCtx, { queryClient });
        if (saved) {
          finishSave('硬约束已保存');
          return;
        }
      } catch (err) {
        handleConstraintApiError(err, err instanceof Error ? err.message : '保存失败');
      } finally {
        setSaving(false);
      }
    }

    finishSave('约束已保存');
  }, [
    draft,
    trip,
    tripId,
    summary?.budget.currency,
    softPrefs,
    serviceCtx,
    onOpenLegacyEditor,
    onOpenChange,
    onSaved,
    onDailyDriveHoursSaved,
    onSoftPrefsChanged,
    refreshDraftFromServer,
    reload,
    mustGoDraft,
    queryClient,
  ]);

  const handleRemoveSoft = useCallback(() => {
    if (!draft || !isSoftConstraintId(draft.id)) return;
    const label = softPrefs.find((p) => p.id === draft.id)?.label ?? '软偏好';
    void (async () => {
      try {
        await removeSoftConstraint(tripId, draft.id, serviceCtx, { queryClient });
        onSoftPrefsChanged?.();
        toast.success(`已移除「${label}」`);
        onOpenChange(false);
        onSaved?.();
      } catch (err) {
        handleConstraintApiError(err);
      }
    })();
  }, [draft, softPrefs, tripId, serviceCtx, onSoftPrefsChanged, reload, onOpenChange, onSaved]);

  if (!draft) return null;

  return (
    <EditConstraintDialog
      open={open}
      onOpenChange={onOpenChange}
      draft={draft}
      onChange={handleDraftChange}
      onPreviewImpact={() => toast.message('保存前可在约束控制台查看影响预览')}
      onSave={() => void handleSave()}
      onRemoveSoft={isSoftConstraintId(draft.id) ? handleRemoveSoft : undefined}
      mustGoPlaces={mustGoDraft}
      onMustGoPlacesChange={setMustGoOverride}
      tripDestination={trip?.destination}
      saving={saving}
      errorMessage={saveError}
      budgetUsage={budgetProfile?.actuals?.totalEstimated ?? null}
      hardMetadata={editHardMetadata}
      tripDayCount={trip?.TripDay?.length ?? summary?.timeRange.dayCount ?? 7}
      memberOptions={memberOptions}
      routeSegmentOptions={routeSegmentOptions}
    />
  );
}
