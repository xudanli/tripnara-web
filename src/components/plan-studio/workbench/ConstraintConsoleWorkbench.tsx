import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { tripBudgetApi } from '@/api/trip-budget';
import { tripsApi } from '@/api/trips';
import { useQueryClient } from '@tanstack/react-query';
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
} from '@/lib/constraint-console.service';
import { useConstraintImpactPreview } from '@/hooks/useConstraintImpactPreview';
import { useTripConstraints } from '@/hooks/useTripConstraints';
import { useTripConstraintsCheck } from '@/hooks/useTripConstraintsCheck';
import { isConstraintReadOnly, isWorldFeasibilityConstraint } from '@/lib/constraint-console-partition.util';
import type { ConstraintPendingKey, PlanningConstraintsSummary } from '@/types/planning-constraints';
import type { UsePlanningConflictsResult } from '@/hooks/usePlanningConflicts';
import type { TripDetail } from '@/types/trip';
import type { TripBudgetProfile } from '@/types/trip-budget';
import { ConstraintConsoleListSidebar } from './ConstraintConsoleListSidebar';
import { EditConstraintDialog } from './EditConstraintDialog';
import { ConstraintImpactPreviewPanel } from './ConstraintImpactPreviewPanel';
import { ConstraintExternalDetailPanel } from './ConstraintExternalDetailPanel';
import type { ConstraintEditorDraft, ConstraintListEntry } from './constraint-console-types';
import { workbenchShell } from './workbench-ui';
import {
  buildEditorDraftFromEntry,
  extractMustGoPlaces,
  sliderToSoftPriority,
  isSoftConstraintId,
  isApiManagedHardConstraintId,
  type MustGoPlaceSummary,
} from './constraint-console-view.util';
import { uiConstraintIdToApi, draftToPreviewChange } from '@/lib/trip-constraints.adapter';
import { formatCurrency } from '@/utils/format';
import { tripConstraintsApi } from '@/api/trip-constraints';
import { TRIP_CONSTRAINT_LEGACY_IDS } from '@/types/trip-constraints';

export interface ConstraintConsoleWorkbenchProps {
  tripId: string;
  summary: PlanningConstraintsSummary | null;
  trip?: TripDetail | null;
  conflicts: UsePlanningConflictsResult;
  feasibilityScore?: number | null;
  selectedId: string | null;
  onSelectedIdChange: (id: string) => void;
  onBack: () => void;
  onOpenLegacyEditor: (key: ConstraintPendingKey) => void;
  onAddConstraint?: () => void;
  /** 父级在添加模板等场景下请求打开编辑弹窗（消费后应调用 onOpenEditorConsumed） */
  openEditorForId?: string | null;
  onOpenEditorConsumed?: () => void;
  onSaved?: () => void;
  onDailyDriveHoursSaved?: (hours: number) => void;
  onSoftPrefsChanged?: () => void;
  softPrefsRevision?: number;
  constraintsApiList?: import('@/types/trip-constraints').TripConstraintsListResponse | null;
  budgetProfile?: TripBudgetProfile | null;
  onOpenFeasibilityReport?: () => void;
  className?: string;
}

/** 约束控制台 · 完整三栏（PRD §5.2 + Trip Constraints SSOT） */
export function ConstraintConsoleWorkbench({
  tripId,
  summary,
  trip,
  conflicts,
  feasibilityScore,
  selectedId,
  onSelectedIdChange,
  onBack,
  onOpenLegacyEditor,
  onAddConstraint,
  openEditorForId,
  onOpenEditorConsumed,
  onSaved,
  onDailyDriveHoursSaved,
  onSoftPrefsChanged,
  softPrefsRevision = 0,
  constraintsApiList: constraintsApiListProp,
  budgetProfile: budgetProfileProp,
  onOpenFeasibilityReport,
  className,
}: ConstraintConsoleWorkbenchProps) {
  const queryClient = useQueryClient();
  const budgetQuery = useWorkbenchBudgetProfile(tripId, budgetProfileProp === undefined);
  const budgetProfile = budgetProfileProp ?? budgetQuery.data ?? null;
  const [intentMustPlaces, setIntentMustPlaces] = useState<number[]>([]);
  const [mustGoOverride, setMustGoOverride] = useState<MustGoPlaceSummary[] | null>(null);
  const [draftOverride, setDraftOverride] = useState<ConstraintEditorDraft | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [refreshingExternal, setRefreshingExternal] = useState(false);

  const constraintsCheck = useTripConstraintsCheck(tripId, {
    refreshKey: constraintsApiListProp?.meta?.constraintsVersion ?? softPrefsRevision,
  });

  const tripConstraints = useTripConstraints({
    tripId,
    summary,
    trip,
    budgetProfile,
    intentMustPlaces,
    revision: softPrefsRevision,
    apiListOverride: constraintsApiListProp,
    checkResult: constraintsCheck.checkResult,
  });

  const { softPrefs, apiList, meta, reload, source, partition } = tripConstraints;

  const serviceCtx = useMemo(() => serviceContextFromApiList(apiList), [apiList]);

  useEffect(() => {
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
  }, [tripId, softPrefsRevision]);

  const consoleContext = useMemo(
    () => ({ intentMustPlaces }),
    [intentMustPlaces],
  );

  const selectedApiConstraint = useMemo(() => {
    if (!selectedId || !apiList?.items?.length) return null;
    const apiId = uiConstraintIdToApi(selectedId);
    return apiList.items.find((item) => item.id === apiId) ?? null;
  }, [selectedId, apiList?.items]);

  const mustGoPlacesSummary = useMemo(
    () => extractMustGoPlaces(trip, intentMustPlaces),
    [trip, intentMustPlaces],
  );

  const mustGoDraft =
    selectedId === 'must_go' ? (mustGoOverride ?? mustGoPlacesSummary) : mustGoPlacesSummary;

  const allEntries = useMemo(
    () => [
      ...partition.userHardItems,
      ...partition.userSoftItems,
      ...partition.officialRuleItems,
      ...(partition.worldFeasibilityItem ? [partition.worldFeasibilityItem] : []),
    ],
    [partition],
  );

  useEffect(() => {
    setMustGoOverride(null);
    setDraftOverride(null);
  }, [selectedId]);

  const handleSelectConstraint = useCallback(
    (id: string) => {
      onSelectedIdChange(id);
      const entry = allEntries.find((item) => item.id === id);
      if (entry && (isConstraintReadOnly(entry) || isWorldFeasibilityConstraint(entry))) {
        setEditDialogOpen(false);
      }
    },
    [onSelectedIdChange, allEntries],
  );

  const handleEditConstraintItem = useCallback(
    (id: string) => {
      onSelectedIdChange(id);
      const entry = allEntries.find((item) => item.id === id);
      if (entry && !isConstraintReadOnly(entry) && entry.kind !== 'external') {
        setEditDialogOpen(true);
      }
    },
    [onSelectedIdChange, allEntries],
  );

  useEffect(() => {
    if (!openEditorForId || openEditorForId !== selectedId) return;
    const entry = allEntries.find((item) => item.id === openEditorForId);
    if (entry?.kind !== 'external') {
      setEditDialogOpen(true);
    }
    onOpenEditorConsumed?.();
  }, [openEditorForId, selectedId, allEntries, onOpenEditorConsumed]);

  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setDraftOverride(null);
      setMustGoOverride(null);
      setSaveError(null);
    }
  }, []);

  const allSelectableIds = useMemo(
    () => allEntries.map((item) => item.id),
    [allEntries],
  );

  const selectedEntry = useMemo((): ConstraintListEntry | null => {
    if (!selectedId) return null;
    return allEntries.find((item) => item.id === selectedId) ?? null;
  }, [selectedId, allEntries]);

  const selectedExternalEntry = useMemo(() => {
    if (!selectedEntry) return null;
    if (isWorldFeasibilityConstraint(selectedEntry)) return null;
    if (isConstraintReadOnly(selectedEntry) || selectedEntry.kind === 'external') {
      return selectedEntry;
    }
    return null;
  }, [selectedEntry]);

  const showExternalDetail = Boolean(selectedExternalEntry);

  const serverDraft = useMemo((): ConstraintEditorDraft | null => {
    if (!selectedId || selectedEntry?.kind === 'external') return null;
    return buildEditorDraftFromEntry(selectedId, summary, trip, softPrefs, {
      ...consoleContext,
      apiConstraint: selectedApiConstraint,
    });
  }, [selectedId, selectedEntry, summary, trip, softPrefs, consoleContext, selectedApiConstraint]);

  const draft = draftOverride ?? serverDraft;

  const handleDraftChange = useCallback((patch: Partial<ConstraintEditorDraft>) => {
    setSaveError(null);
    setDraftOverride((prev) => {
      const base = prev ?? serverDraft;
      if (!base) return prev;
      return { ...base, ...patch };
    });
  }, [serverDraft]);

  useEffect(() => {
    if (allSelectableIds.length === 0) return;
    if (!selectedId || !allSelectableIds.includes(selectedId)) {
      onSelectedIdChange(allSelectableIds[0]!);
    }
  }, [allSelectableIds, selectedId, onSelectedIdChange]);

  const refreshDraftFromServer = useCallback(() => {
    setDraftOverride(null);
    setMustGoOverride(null);
  }, []);

  const {
    preview,
    loading: previewLoading,
    source: previewSource,
    error: previewError,
    retry: retryPreview,
  } = useConstraintImpactPreview({
    tripId,
    draft: showExternalDetail ? null : draft,
  });

  const handleSoftSliderChange = useCallback(
    (id: string, value: number) => {
      const priority = sliderToSoftPriority(value);
      void (async () => {
        try {
          await updateSoftConstraintPriority(tripId, id, priority, serviceCtx);
          onSoftPrefsChanged?.();
          await reload();
          if (selectedId === id) {
            setDraftOverride((prev) => {
              const base = prev ?? serverDraft;
              if (!base) return prev;
              return {
                ...base,
                priority: priority === '高' ? 8 : priority === '中' ? 5 : 3,
              };
            });
          }
        } catch (err) {
          handleConstraintApiError(err);
        }
      })();
    },
    [tripId, serviceCtx, selectedId, onSoftPrefsChanged, reload, serverDraft],
  );

  const handleRemoveSoft = useCallback(
    (id: string) => {
      const label = softPrefs.find((p) => p.id === id)?.label ?? '软偏好';
      void (async () => {
        try {
          await removeSoftConstraint(tripId, id, serviceCtx);
          onSoftPrefsChanged?.();
          await reload();
          if (selectedId === id) {
            setEditDialogOpen(false);
            const fallback =
              partition.userHardItems.find((item) => item.id !== id)?.id ??
              partition.userSoftItems.find((item) => item.id !== id)?.id ??
              partition.officialRuleItems[0]?.id ??
              partition.worldFeasibilityItem?.id ??
              null;
            if (fallback) onSelectedIdChange(fallback);
          }
          toast.success(`已移除「${label}」`);
          onSaved?.();
        } catch (err) {
          handleConstraintApiError(err);
        }
      })();
    },
    [
      tripId,
      softPrefs,
      serviceCtx,
      selectedId,
      partition,
      onSelectedIdChange,
      onSoftPrefsChanged,
      onSaved,
      reload,
    ],
  );

  const handleSave = useCallback(async () => {
    if (!draft) return;

    const finishSave = (successMessage: string, afterReload?: () => Promise<void>) => {
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
      setEditDialogOpen(false);
      showConstraintSaveSuccess(successMessage);
      void afterReload?.().catch(() => undefined);
      onSaved?.();
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
        await tripConstraintsApi.patch(
          tripId,
          TRIP_CONSTRAINT_LEGACY_IDS.MAX_SEGMENT_DISTANCE,
          {
            ...change.patch,
            constraintsVersion: serviceCtx.constraintsVersion,
          },
        );
        const needsFeasibilityHint =
          preview?.recommendation?.includes('深度') || preview?.planLabel?.includes('深度');
        finishSave('单段最长行驶距离已保存', async () => {
          await conflicts.reload();
          if (needsFeasibilityHint) {
            showConstraintSaveInfo('建议重新验证可行性', '该约束变更影响范围较大，冲突列表已刷新');
          }
        });
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
        await updateSoftConstraintPriority(tripId, draft.id, priority, serviceCtx);
        onSoftPrefsChanged?.();
        finishSave('软偏好已保存');
      } catch (err) {
        handleConstraintApiError(err);
      } finally {
        setSaving(false);
      }
      return;
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
    onSaved,
    onDailyDriveHoursSaved,
    onSoftPrefsChanged,
    refreshDraftFromServer,
    reload,
    mustGoDraft,
    serverDraft,
    preview,
    conflicts,
  ]);

  const handleRefreshExternal = useCallback(async () => {
    setRefreshingExternal(true);
    try {
      await constraintsCheck.runCheck();
      await reload();
      toast.success('约束验证已刷新');
    } catch {
      toast.error('刷新失败，请稍后重试');
    } finally {
      setRefreshingExternal(false);
    }
  }, [constraintsCheck, reload]);

  const handleViewRepair = useCallback(
    (issueId: string) => {
      void (async () => {
        try {
          await constraintsCheck.runRepair(issueId);
          onOpenFeasibilityReport?.();
        } catch {
          toast.error('无法加载修复方案，请稍后重试');
        }
      })();
    },
    [constraintsCheck, onOpenFeasibilityReport],
  );

  if (tripConstraints.loading && allSelectableIds.length === 0) {
    return (
      <div className={cn('flex flex-1 items-center justify-center', className)}>
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!selectedEntry && allSelectableIds.length === 0) {
    return (
      <div className={cn('flex flex-1 items-center justify-center px-6 text-center', className)}>
        <p className="text-sm text-muted-foreground">暂无约束项，请先添加约束或返回工作台。</p>
      </div>
    );
  }

  if (!selectedEntry) {
    return (
      <div className={cn('flex flex-1 items-center justify-center', className)}>
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', workbenchShell, className)}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-background px-4 py-2">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          返回规划工作台
        </Button>
        {source === 'bff' && meta ? (
          <span className="text-[10px] text-muted-foreground">
            SSOT v{meta.constraintsVersion}
            {meta.conflictCount ? ` · ${meta.conflictCount} 冲突` : ''}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-1',
          showExternalDetail
            ? 'lg:grid-cols-[minmax(220px,24%)_minmax(0,1fr)_minmax(260px,30%)]'
            : 'lg:grid-cols-[minmax(220px,28%)_minmax(0,1fr)]',
        )}
      >
        <ConstraintConsoleListSidebar
          partition={partition}
          selectedId={selectedId}
          onSelect={handleSelectConstraint}
          onEditItem={handleEditConstraintItem}
          onAddConstraint={onAddConstraint}
          onSoftSliderChange={handleSoftSliderChange}
          onRemoveSoftPreference={handleRemoveSoft}
          onViewRepair={handleViewRepair}
          onOpenFeasibilityReport={onOpenFeasibilityReport}
          repairing={constraintsCheck.repairing}
          className="min-h-0"
        />
        {showExternalDetail && selectedExternalEntry ? (
          <ConstraintExternalDetailPanel
            entry={selectedExternalEntry}
            onRefresh={() => void handleRefreshExternal()}
            refreshing={refreshingExternal}
            className="min-h-0 border-x border-border/60"
          />
        ) : null}
        <ConstraintImpactPreviewPanel
          preview={preview}
          loading={previewLoading}
          source={previewSource}
          error={previewError}
          onRetry={retryPreview}
          className={cn('min-h-0', !showExternalDetail && 'border-l border-border/60')}
        />
      </div>

      {draft && !showExternalDetail ? (
        <EditConstraintDialog
          open={editDialogOpen}
          onOpenChange={handleEditDialogOpenChange}
          draft={draft}
          onChange={handleDraftChange}
          onPreviewImpact={() => toast.message('影响预览已在右侧实时更新')}
          onSave={() => void handleSave()}
          onRemoveSoft={
            isSoftConstraintId(draft.id) ? () => handleRemoveSoft(draft.id) : undefined
          }
          mustGoPlaces={mustGoDraft}
          onMustGoPlacesChange={setMustGoOverride}
          tripDestination={trip?.destination}
          saving={saving}
          errorMessage={saveError}
          budgetUsage={budgetProfile?.actuals?.totalEstimated ?? null}
        />
      ) : null}
    </div>
  );
}
