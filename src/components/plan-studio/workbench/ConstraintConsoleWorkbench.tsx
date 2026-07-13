import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
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
  saveCatalogHardConstraint,
  patchTripConstraintItem,
  applyContractPatchToConstraintsCache,
} from '@/lib/constraint-console.service';
import { useConstraintImpactPreview } from '@/hooks/useConstraintImpactPreview';
import { useConstraintConsoleWithAssessments } from '@/hooks/useConstraintConsoleWithAssessments';
import { useTripConstraintsCheck } from '@/hooks/useTripConstraintsCheck';
import { useTravelStatus } from '@/hooks/useTravelStatus';
import { hasAutomationCatalogSummary } from '@/components/trip-automation/AutomationCatalogSummaryPanel';
import { isConstraintReadOnly, isWorldFeasibilityConstraint } from '@/lib/constraint-console-partition.util';
import { indexConstraintEntryScopeContexts } from '@/lib/constraint-entry-scope-context.util';
import { handleConstraintConflictClick } from '@/lib/constraint-conflict-repair-flow';
import type { ConstraintPendingKey, PlanningConstraintsSummary } from '@/types/planning-constraints';
import type { UsePlanningConflictsResult } from '@/hooks/usePlanningConflicts';
import type { TripDetail } from '@/types/trip';
import type { TripBudgetProfile } from '@/types/trip-budget';
import { ConstraintConsoleListSidebar } from './ConstraintConsoleListSidebar';
import { EditConstraintDialog } from './EditConstraintDialog';
import { ConstraintEditorPanel } from './ConstraintEditorPanel';
import { ConstraintConsoleDetailPanel } from './ConstraintConsoleDetailPanel';
import { ConstraintExternalDetailPanel } from './ConstraintExternalDetailPanel';
import type { ConstraintEditorDraft, ConstraintListEntry } from './constraint-console-types';
import { workbenchLinkClass, workbenchShell } from './workbench-ui';
import {
  buildEditorDraftFromEntry,
  extractMustGoPlaces,
  sliderToSoftPriority,
  isSoftConstraintId,
  isApiManagedHardConstraintId,
  resolveApiManagedHardConstraintApiId,
  listEntryPatchFromSavedDraft,
  type MustGoPlaceSummary,
} from './constraint-console-view.util';
import { dispatchConstraintListItemPatch } from '@/lib/plan-studio-constraints-events';
import { uiConstraintIdToApi, draftToPreviewChange } from '@/lib/trip-constraints.adapter';
import { formatCurrency } from '@/utils/format';
import {
  patchTravelDecisionContract,
  isConstraintsStaleError,
} from '@/api/frontend-travel-decision-contract-api-client';
import type { PatchTripConstraintsContractDto } from '@/types/trip-constraints';
import { TRIP_CONSTRAINT_LEGACY_IDS } from '@/types/trip-constraints';
import { buildHardConstraintMetadata } from '@/lib/constraint-metadata.util';
import { getHardConstraintTemplate } from './constraint-templates';
import { Lock } from 'lucide-react';
import {
  sectionKeyToSelectionId,
  selectionIdToSectionKey,
  travelGoalDimensionsToApiPrinciples,
} from '@/lib/trip-constraints-contract.util';
import {
  TRAVEL_GOALS_SECTION_ID,
  moveTravelGoal,
  writeStoredTravelGoalRanks,
} from '@/lib/travel-goals.util';
import {
  buildMemberOptionsFromContract,
  buildRouteSegmentOptionsFromTrip,
} from '@/lib/constraint-scope-options.util';
import type { TravelGoalDimension } from '@/types/travel-decision-contract';
import {
  flushPendingConstraintOps,
  upsertPendingOp,
  type ConstraintPendingSaveOp,
} from '@/lib/constraint-session-pending.util';
import { resolveConstraintEditorTemplateId } from '@/lib/constraint-catalog-editor.util';

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
  onSaved?: () => void | Promise<void>;
  onDailyDriveHoursSaved?: (hours: number) => void;
  onSoftPrefsChanged?: () => void;
  softPrefsRevision?: number;
  constraintsApiList?: import('@/types/trip-constraints').TripConstraintsListResponse | null;
  budgetProfile?: TripBudgetProfile | null;
  onOpenFeasibilityReport?: () => void;
  onOpenDecisionProblem?: (problemId: string) => void;
  /** 工作台规划待办 / 决策空间（PM 路由） */
  onOpenPlanningActions?: () => void;
  onOpenCollaborationCenter?: () => void;
  /** drawer = 嵌入右侧 Sheet；fullscreen = 整页三栏（兼容旧路由） */
  variant?: 'drawer' | 'fullscreen';
  /** drawer 模式下由 WorkbenchModeIndicatorBar 承担返回 */
  showTopBackBar?: boolean;
  /** 草稿/排序等未保存变更 */
  onDirtyChange?: (dirty: boolean) => void;
  focusMode?: import('@/lib/constraint-sidebar-focus.util').ConstraintSidebarFocusMode;
  onFocusAttention?: () => void;
  /** drawer 模式下延迟写入服务端，统一在会话栏保存 */
  deferSessionSave?: boolean;
  /** 待保存队列长度变化 */
  onPendingSaveCountChange?: (count: number) => void;
  onSessionCommittingChange?: (committing: boolean) => void;
  className?: string;
}

export interface ConstraintConsoleWorkbenchHandle {
  /** 刷写待保存项；成功返回 true */
  commitPendingSaves: () => Promise<boolean>;
  /** 丢弃待保存项与本地草稿 */
  discardPendingSaves: () => void;
  pendingSaveCount: number;
}

/** 约束控制台 · 完整三栏（PRD §5.2 + Trip Constraints SSOT） */
export const ConstraintConsoleWorkbench = forwardRef<
  ConstraintConsoleWorkbenchHandle,
  ConstraintConsoleWorkbenchProps
>(function ConstraintConsoleWorkbench(
  {
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
    onOpenDecisionProblem,
    onOpenPlanningActions,
    onOpenCollaborationCenter,
    variant = 'fullscreen',
    showTopBackBar = true,
    onDirtyChange,
    focusMode = 'full',
    onFocusAttention,
    deferSessionSave = false,
    onPendingSaveCountChange,
    onSessionCommittingChange,
    className,
  }: ConstraintConsoleWorkbenchProps,
  ref,
) {
  const queryClient = useQueryClient();
  const budgetQuery = useWorkbenchBudgetProfile(tripId, budgetProfileProp === undefined);
  const budgetProfile = budgetProfileProp ?? budgetQuery.data ?? null;
  const [intentMustPlaces, setIntentMustPlaces] = useState<number[]>([]);
  const [travelGoalOverride, setTravelGoalOverride] = useState<TravelGoalDimension[] | null>(null);
  const [travelGoalsSaving, setTravelGoalsSaving] = useState(false);
  const [contractSaving, setContractSaving] = useState(false);
  const [mustGoOverride, setMustGoOverride] = useState<MustGoPlaceSummary[] | null>(null);
  const [draftOverride, setDraftOverride] = useState<ConstraintEditorDraft | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [refreshingExternal, setRefreshingExternal] = useState(false);
  const [pendingOps, setPendingOps] = useState<ConstraintPendingSaveOp[]>([]);
  const [softSliderOverrides, setSoftSliderOverrides] = useState<Record<string, number>>({});
  const [sessionCommitting, setSessionCommitting] = useState(false);

  const constraintsCheck = useTripConstraintsCheck(tripId, {
    refreshKey: constraintsApiListProp?.meta?.constraintsVersion ?? softPrefsRevision,
  });

  const tripConstraints = useConstraintConsoleWithAssessments({
    tripId,
    summary,
    trip,
    budgetProfile,
    intentMustPlaces,
    revision: softPrefsRevision,
    apiListOverride: constraintsApiListProp,
    checkResult: constraintsCheck.checkResult,
  });

  const { softPrefs, apiList, meta, reload, reloadAssessments, source, partition, contract, sections, travelGoalOrderedIds: contractTravelGoals, assessments } = tripConstraints;

  const pendingDraftOps = useMemo(
    () =>
      deferSessionSave
        ? pendingOps.filter((op): op is Extract<ConstraintPendingSaveOp, { kind: 'draft' }> => op.kind === 'draft')
        : [],
    [deferSessionSave, pendingOps],
  );

  const matchesDraftEntry = useCallback(
    (itemId: string, draftId: string) =>
      itemId === draftId ||
      resolveConstraintEditorTemplateId(itemId) === draftId ||
      resolveConstraintEditorTemplateId(itemId) === resolveConstraintEditorTemplateId(draftId),
    [],
  );

  const applyLiveListOverrides = useCallback(
    (items: ConstraintListEntry[]) =>
      items.map((item) => {
        let next = item;
        const sliderOverride = softSliderOverrides[item.id];
        if (sliderOverride != null) {
          next = { ...next, sliderValue: sliderOverride };
        }
        const pendingDraft = pendingDraftOps.find((op) => matchesDraftEntry(item.id, op.id));
        if (pendingDraft) {
          const patch = listEntryPatchFromSavedDraft(pendingDraft.draft, {
            mustGoPlaces: pendingDraft.mustGoDraft,
            travelersCount: summary?.travelers.count,
          });
          next = { ...next, ...patch };
        }
        return next;
      }),
    [softSliderOverrides, pendingDraftOps, matchesDraftEntry, summary?.travelers.count],
  );

  const hasLiveListOverrides =
    deferSessionSave &&
    (Object.keys(softSliderOverrides).length > 0 || pendingDraftOps.length > 0);

  const partitionWithOverrides = useMemo(() => {
    if (!hasLiveListOverrides) {
      return partition;
    }

    return {
      ...partition,
      userHardItems: applyLiveListOverrides(partition.userHardItems),
      userSoftItems: applyLiveListOverrides(partition.userSoftItems),
    };
  }, [partition, hasLiveListOverrides, applyLiveListOverrides]);

  const sectionsWithOverrides = useMemo(() => {
    if (!hasLiveListOverrides) return sections;
    return sections.map((section) => ({
      ...section,
      items: applyLiveListOverrides(section.items),
    }));
  }, [sections, hasLiveListOverrides, applyLiveListOverrides]);

  const { status: travelStatus } = useTravelStatus({ tripId, enabled: Boolean(tripId) });
  const automationSummary = travelStatus?.automation ?? null;

  const visibleSections = useMemo(
    () =>
      sectionsWithOverrides.filter(
        (section) =>
          section.meta.key !== 'automation' ||
          hasAutomationCatalogSummary(automationSummary),
      ),
    [sectionsWithOverrides, automationSummary],
  );

  const travelGoalOrderedIds = travelGoalOverride ?? contractTravelGoals;

  const serviceCtx = useMemo(() => serviceContextFromApiList(apiList), [apiList]);

  const memberOptions = useMemo(
    () => buildMemberOptionsFromContract(contract?.teamGovernance, trip),
    [contract?.teamGovernance, trip],
  );

  const routeSegmentOptions = useMemo(
    () => buildRouteSegmentOptionsFromTrip(trip),
    [trip],
  );

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
      ...partitionWithOverrides.userHardItems,
      ...partitionWithOverrides.userSoftItems,
      ...partitionWithOverrides.officialRuleItems,
      ...(partitionWithOverrides.worldFeasibilityItem
        ? [partitionWithOverrides.worldFeasibilityItem]
        : []),
    ],
    [partitionWithOverrides],
  );

  useEffect(() => {
    setMustGoOverride(null);
    setDraftOverride(null);
  }, [selectedId]);

  useEffect(() => {
    const hasDraftPending = draftOverride != null;
    const dirty =
      hasDraftPending ||
      mustGoOverride != null ||
      travelGoalOverride != null ||
      pendingOps.length > 0;
    onDirtyChange?.(dirty);
    onPendingSaveCountChange?.(pendingOps.length + (hasDraftPending ? 1 : 0));
  }, [
    draftOverride,
    mustGoOverride,
    travelGoalOverride,
    pendingOps.length,
    onDirtyChange,
    onPendingSaveCountChange,
  ]);

  const handleSelectConstraint = useCallback(
    (id: string) => {
      onSelectedIdChange(id);
      if (id === TRAVEL_GOALS_SECTION_ID || selectionIdToSectionKey(id)) {
        setEditDialogOpen(false);
        return;
      }
      const entry = allEntries.find((item) => item.id === id);
      if (entry && (isConstraintReadOnly(entry) || isWorldFeasibilityConstraint(entry))) {
        setEditDialogOpen(false);
      }
    },
    [onSelectedIdChange, allEntries],
  );

  useEffect(() => {
    onSessionCommittingChange?.(sessionCommitting);
  }, [sessionCommitting, onSessionCommittingChange]);

  const pendingSaveIds = useMemo(() => {
    const ids = new Set<string>();
    for (const op of pendingOps) {
      if (op.kind === 'draft' || op.kind === 'soft_priority') ids.add(op.id);
    }
    return ids;
  }, [pendingOps]);

  const handleEditConstraintItem = useCallback(
    (id: string) => {
      onSelectedIdChange(id);
      if (variant === 'drawer' && deferSessionSave) return;
      const entry = allEntries.find((item) => item.id === id);
      if (entry && !isConstraintReadOnly(entry) && entry.kind !== 'external') {
        setEditDialogOpen(true);
      }
    },
    [onSelectedIdChange, allEntries, variant, deferSessionSave],
  );

  useEffect(() => {
    if (!openEditorForId || openEditorForId !== selectedId) return;
    const entry = allEntries.find((item) => item.id === openEditorForId);
    if (entry?.kind !== 'external' && !(variant === 'drawer' && deferSessionSave)) {
      setEditDialogOpen(true);
    }
    onOpenEditorConsumed?.();
  }, [openEditorForId, selectedId, allEntries, onOpenEditorConsumed, variant, deferSessionSave]);

  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setDraftOverride(null);
      setMustGoOverride(null);
      setSaveError(null);
    }
  }, []);

  const allSelectableIds = useMemo(
    () => [
      ...visibleSections.map((section) => sectionKeyToSelectionId(section.meta.key)),
      ...allEntries.map((item) => item.id),
    ],
    [visibleSections, allEntries],
  );

  const selectedEntry = useMemo((): ConstraintListEntry | null => {
    if (!selectedId || selectedId === TRAVEL_GOALS_SECTION_ID) return null;
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

  const showImpactPreview = useMemo(() => {
    if (showExternalDetail) return false;
    if (!selectedEntry) return false;
    if (isConstraintReadOnly(selectedEntry)) return false;
    if (selectedEntry.kind === 'external') return false;
    if (isWorldFeasibilityConstraint(selectedEntry)) return false;
    return true;
  }, [showExternalDetail, selectedEntry]);

  const serverDraft = useMemo((): ConstraintEditorDraft | null => {
    if (!selectedId || selectedEntry?.kind === 'external') return null;
    return buildEditorDraftFromEntry(selectedId, summary, trip, softPrefs, {
      ...consoleContext,
      apiConstraint: selectedApiConstraint,
    });
  }, [selectedId, selectedEntry, summary, trip, softPrefs, consoleContext, selectedApiConstraint]);

  const serverDraftRef = useRef(serverDraft);
  serverDraftRef.current = serverDraft;

  const pendingDraftForSelected = useMemo((): ConstraintEditorDraft | null => {
    if (!selectedId || !deferSessionSave) return null;
    const op = pendingOps.find(
      (item) => item.kind === 'draft' && matchesDraftEntry(selectedId, item.id),
    );
    return op?.draft ?? null;
  }, [selectedId, pendingOps, deferSessionSave, matchesDraftEntry]);

  const draft = draftOverride ?? pendingDraftForSelected ?? serverDraft;

  const editHardMetadata = useMemo(() => {
    if (!draft || draft.type === 'SOFT' || isSoftConstraintId(draft.id)) return null;
    const entry: ConstraintListEntry =
      selectedEntry ??
      ({
        id: draft.id,
        kind: 'hard',
        label: draft.name,
        icon: getHardConstraintTemplate(draft.id)?.icon ?? Lock,
      } as ConstraintListEntry);
    return buildHardConstraintMetadata({
      entry,
      apiConstraint: selectedApiConstraint,
      draft,
    });
  }, [draft, selectedEntry, selectedApiConstraint]);

  const savedHardMetadata = useMemo(() => {
    if (!serverDraft || serverDraft.type === 'SOFT' || isSoftConstraintId(serverDraft.id)) return null;
    const entry: ConstraintListEntry =
      selectedEntry ??
      ({
        id: serverDraft.id,
        kind: 'hard',
        label: serverDraft.name,
        icon: getHardConstraintTemplate(serverDraft.id)?.icon ?? Lock,
      } as ConstraintListEntry);
    return buildHardConstraintMetadata({
      entry,
      apiConstraint: selectedApiConstraint,
      draft: null,
    });
  }, [serverDraft, selectedEntry, selectedApiConstraint]);

  const handleDraftChange = useCallback((patch: Partial<ConstraintEditorDraft>) => {
    setSaveError(null);
    setDraftOverride((prev) => {
      const base = prev ?? pendingDraftForSelected ?? serverDraftRef.current;
      if (!base) return prev;
      return { ...base, ...patch };
    });
  }, [pendingDraftForSelected]);

  useEffect(() => {
    if (allSelectableIds.length === 0) return;
    if (!selectedId || !allSelectableIds.includes(selectedId)) {
      onSelectedIdChange(allSelectableIds[0]!);
    }
  }, [allSelectableIds, selectedId, onSelectedIdChange]);

  const persistTravelGoalOrder = useCallback(
    async (nextOrder: TravelGoalDimension[]) => {
      setTravelGoalsSaving(true);
      writeStoredTravelGoalRanks(tripId, nextOrder);
      try {
        if (source === 'bff' && serviceCtx.constraintsVersion != null) {
          await patchTravelDecisionContract(tripId, {
            objectives: { rankedPrinciples: travelGoalDimensionsToApiPrinciples(nextOrder) },
            constraintsVersion: serviceCtx.constraintsVersion,
          });
          await reload();
          setTravelGoalOverride(null);
        } else {
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
              mustPlaces: existing.mustPlaces,
            },
            travelGoalRanks: nextOrder,
            totalBudget: intent.budgetConfig?.totalBudget ?? intent.totalBudget,
          });
        }
      } catch (err) {
        if (isConstraintsStaleError(err)) {
          toast.error('约束版本已过期，正在刷新…');
          await reload();
          setTravelGoalOverride(null);
        } else {
          toast.message('目标排序已保存在本地', {
            description: '同步到服务端失败，下次打开仍会保留当前排序。',
          });
        }
      } finally {
        setTravelGoalsSaving(false);
      }
    },
    [tripId, source, serviceCtx.constraintsVersion, reload],
  );

  const handlePatchContract = useCallback(
    async (patch: PatchTripConstraintsContractDto) => {
      if (source !== 'bff' || serviceCtx.constraintsVersion == null) {
        toast.message('当前无法同步决策合同', {
          description: '请等待约束服务就绪后重试。',
        });
        return;
      }
      const body: PatchTripConstraintsContractDto = {
        ...patch,
        constraintsVersion: serviceCtx.constraintsVersion,
      };
      applyContractPatchToConstraintsCache(queryClient, tripId, body);
      if (deferSessionSave) {
        setPendingOps((prev) => upsertPendingOp(prev, { kind: 'contract_patch', patch: body }));
        return;
      }
      setContractSaving(true);
      try {
        const response = await patchTravelDecisionContract(tripId, body);
        applyContractPatchToConstraintsCache(queryClient, tripId, body, response);
        void queryClient.invalidateQueries({ queryKey: workbenchKeys.constraints(tripId) });
      } catch (err) {
        await reload();
        if (isConstraintsStaleError(err)) {
          toast.error('约束版本已过期，请重试');
        } else {
          toast.error('保存失败，请稍后重试');
        }
      } finally {
        setContractSaving(false);
      }
    },
    [tripId, source, serviceCtx.constraintsVersion, queryClient, reload, deferSessionSave],
  );

  const handleTravelGoalReorder = useCallback(
    (id: TravelGoalDimension, direction: 'up' | 'down') => {
      const nextOrder = moveTravelGoal(travelGoalOrderedIds, id, direction);
      if (nextOrder === travelGoalOrderedIds) return;
      setTravelGoalOverride(nextOrder);
      if (deferSessionSave) {
        setPendingOps((prev) => upsertPendingOp(prev, { kind: 'travel_goals', order: nextOrder }));
        return;
      }
      void persistTravelGoalOrder(nextOrder);
    },
    [travelGoalOrderedIds, persistTravelGoalOrder, deferSessionSave],
  );

  const refreshDraftFromServer = useCallback(() => {
    setDraftOverride(null);
    setMustGoOverride(null);
  }, []);

  const discardPendingSaves = useCallback(() => {
    setPendingOps([]);
    setSoftSliderOverrides({});
    setDraftOverride(null);
    setMustGoOverride(null);
    setTravelGoalOverride(null);
    setSaveError(null);
    void reload();
  }, [reload]);

  const commitPendingSaves = useCallback(async (): Promise<boolean> => {
    if (!deferSessionSave) return true;

    let ops = pendingOps;
    if (draftOverride) {
      if (draftOverride.id === 'time_range' && (!draftOverride.startDate || !draftOverride.endDate)) {
        toast.error('请选择出发与返程日期');
        return false;
      }
      if (draftOverride.id === 'travelers') {
        const count = Math.round(draftOverride.targetValue);
        if (!Number.isFinite(count) || count < 1 || count > 20) {
          toast.error('请输入 1–20 之间的出行人数');
          return false;
        }
      }
      if (draftOverride.id === 'transport' && !draftOverride.transportMode) {
        toast.error('请选择基础交通方式');
        return false;
      }
      ops = upsertPendingOp(ops, {
        kind: 'draft',
        id: draftOverride.id,
        draft: { ...draftOverride },
        mustGoDraft:
          draftOverride.id === 'must_go'
            ? (mustGoOverride ?? mustGoPlacesSummary)
            : undefined,
      });
    }

    if (ops.length === 0) return true;
    setSessionCommitting(true);
    try {
      await flushPendingConstraintOps({
        tripId,
        ops,
        trip,
        softPrefIds: softPrefs.map((p) => p.id),
        serviceCtx,
        queryClient,
        currency: summary?.budget.currency,
        conflicts,
        contractSource: source,
        constraintsVersion: serviceCtx.constraintsVersion,
        onDailyDriveHoursSaved,
        reload,
      });
      setPendingOps([]);
      setSoftSliderOverrides({});
      setDraftOverride(null);
      setMustGoOverride(null);
      setTravelGoalOverride(null);
      setEditDialogOpen(false);
      await onSaved?.();
      return true;
    } catch {
      return false;
    } finally {
      setSessionCommitting(false);
    }
  }, [
    deferSessionSave,
    pendingOps,
    draftOverride,
    mustGoOverride,
    mustGoPlacesSummary,
    tripId,
    trip,
    softPrefs,
    serviceCtx,
    queryClient,
    summary?.budget.currency,
    conflicts,
    source,
    onDailyDriveHoursSaved,
    reload,
    onSaved,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      commitPendingSaves,
      discardPendingSaves,
      pendingSaveCount: pendingOps.length + (draftOverride ? 1 : 0),
    }),
    [commitPendingSaves, discardPendingSaves, pendingOps.length, draftOverride],
  );

  const selectedContractSectionKey = selectionIdToSectionKey(selectedId);

  const drawerDeferredEdit = Boolean(
    variant === 'drawer' &&
      deferSessionSave &&
      draft &&
      !showExternalDetail &&
      !selectedContractSectionKey &&
      selectedId !== TRAVEL_GOALS_SECTION_ID &&
      selectedEntry &&
      !isConstraintReadOnly(selectedEntry) &&
      selectedEntry.kind !== 'external',
  );

  const canShowInlineEditor = drawerDeferredEdit;

  const impactPreviewDraft = useMemo(() => {
    if (
      showExternalDetail ||
      selectedId === TRAVEL_GOALS_SECTION_ID ||
      selectedContractSectionKey
    ) {
      return null;
    }
    if (drawerDeferredEdit) {
      return draftOverride ? null : pendingDraftForSelected;
    }
    return draft;
  }, [
    showExternalDetail,
    selectedId,
    selectedContractSectionKey,
    drawerDeferredEdit,
    draftOverride,
    pendingDraftForSelected,
    draft,
  ]);

  const impactPreviewEmptyHint =
    drawerDeferredEdit && (draftOverride || !pendingDraftForSelected)
      ? '修改条件并点击「确认修改」后，将在此显示影响估算。'
      : null;

  const {
    preview,
    loading: previewLoading,
    source: previewSource,
    error: previewError,
    retry: retryPreview,
  } = useConstraintImpactPreview({
    tripId,
    trip,
    constraintsVersion: serviceCtx.constraintsVersion,
    draft: impactPreviewDraft,
    assessments,
    feasibilityScore,
    apiConstraint: selectedApiConstraint,
  });

  const selectedHardMetadata = useMemo(() => {
    if (!selectedEntry || selectedEntry.kind !== 'hard') return null;
    return buildHardConstraintMetadata({
      entry: selectedEntry,
      apiConstraint: selectedApiConstraint,
      draft: drawerDeferredEdit ? null : draft,
    });
  }, [selectedEntry, selectedApiConstraint, draft, drawerDeferredEdit]);

  const scopeContextByEntryId = useMemo(
    () =>
      indexConstraintEntryScopeContexts({
        entries: allEntries,
        checkIssues: constraintsCheck.checkResult?.issues,
        conflicts: conflicts.items,
        preview,
        previewEntryId: selectedId,
      }),
    [allEntries, constraintsCheck.checkResult?.issues, conflicts.items, preview, selectedId],
  );

  const selectedScopeContext = selectedId ? scopeContextByEntryId.get(selectedId) ?? null : null;

  const handleSoftSliderChange = useCallback(
    (id: string, value: number) => {
      const priority = sliderToSoftPriority(value);
      if (deferSessionSave) {
        setSoftSliderOverrides((prev) => ({ ...prev, [id]: value }));
        setPendingOps((prev) => upsertPendingOp(prev, { kind: 'soft_priority', id, priority }));
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
        return;
      }
      void (async () => {
        try {
          await updateSoftConstraintPriority(tripId, id, priority, serviceCtx, { queryClient });
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
        } catch {
          // updateSoftConstraintPriority 已 toast
        }
      })();
    },
    [tripId, serviceCtx, queryClient, selectedId, onSoftPrefsChanged, reload, serverDraft, deferSessionSave],
  );

  const handleRemoveSoft = useCallback(
    (id: string) => {
      const label = softPrefs.find((p) => p.id === id)?.label ?? '软偏好';
      if (deferSessionSave) {
        setPendingOps((prev) => upsertPendingOp(prev, { kind: 'remove_soft', id }));
        toast.message(`「${label}」已标记移除`, {
          description: '点击右上角「保存并评估」后生效',
        });
        return;
      }
      void (async () => {
        try {
          await removeSoftConstraint(tripId, id, serviceCtx, { queryClient });
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
      deferSessionSave,
    ],
  );

  const handleSave = useCallback(async () => {
    if (!draft) return;

    const queueDraftForSession = () => {
      const currency = draft.currency ?? summary?.budget.currency ?? 'CNY';
      const patch = listEntryPatchFromSavedDraft(draft, {
        mustGoPlaces: draft.id === 'must_go' ? mustGoDraft : undefined,
        travelersCount: summary?.travelers.count,
        budgetUsageLabel:
          budgetProfile?.actuals?.totalEstimated != null
            ? formatCurrency(budgetProfile.actuals.totalEstimated, currency)
            : undefined,
      });
      if (Object.keys(patch).length > 0) {
        dispatchConstraintListItemPatch(tripId, draft.id, patch);
      }
      setPendingOps((prev) =>
        upsertPendingOp(prev, {
          kind: 'draft',
          id: draft.id,
          draft: { ...draft },
          mustGoDraft: draft.id === 'must_go' ? mustGoDraft : undefined,
        }),
      );
      refreshDraftFromServer();
      setSaveError(null);
      setEditDialogOpen(false);
      toast.message('修改已加入草稿', {
        description: '点击「保存并检查是否走得通」统一写入并重新检查',
      });
    };

    if (deferSessionSave) {
      if (draft.id === 'time_range' && (!draft.startDate || !draft.endDate)) {
        toast.error('请选择出发与返程日期');
        return;
      }
      if (draft.id === 'travelers') {
        const count = Math.round(draft.targetValue);
        if (!Number.isFinite(count) || count < 1 || count > 20) {
          toast.error('请输入 1–20 之间的出行人数');
          return;
        }
      }
      if (draft.id === 'transport' && !draft.transportMode) {
        toast.error('请选择基础交通方式');
        return;
      }
      queueDraftForSession();
      return;
    }

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
      void (async () => {
        await onSaved?.();
        await afterReload?.();
      })().catch(() => undefined);
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
        const apiId = resolveApiManagedHardConstraintApiId(draft.id);
        const successLabel =
          draft.id === 'no_night_drive' || draft.id === 'c_no_night_drive'
            ? '不夜间驾驶已保存'
            : '单段最长行驶距离已保存';
        await patchTripConstraintItem(tripId, apiId, change.patch, serviceCtx, { queryClient });
        const needsFeasibilityHint =
          preview?.recommendation?.includes('深度') || preview?.planLabel?.includes('深度');
        finishSave(successLabel, async () => {
          void conflicts.reload();
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
    onSaved,
    onDailyDriveHoursSaved,
    onSoftPrefsChanged,
    refreshDraftFromServer,
    reload,
    mustGoDraft,
    serverDraft,
    preview,
    conflicts,
    deferSessionSave,
    budgetProfile,
    queryClient,
  ]);

  const handleRefreshExternal = useCallback(async () => {
    setRefreshingExternal(true);
    try {
      await constraintsCheck.runCheck();
      await tripConstraints.reloadAssessments();
      await reload();
      toast.success('约束验证已刷新');
    } catch {
      toast.error('刷新失败，请稍后重试');
    } finally {
      setRefreshingExternal(false);
    }
  }, [constraintsCheck, reload, reloadAssessments]);

  const handleViewRepair = useCallback(
    (decisionProblemId: string) => {
      void (async () => {
        try {
          await handleConstraintConflictClick({
            tripId,
            decisionProblemId,
            runRepair: (id) => constraintsCheck.runRepair(id),
            onOpenDecisionProblem,
            onOpenFeasibilityReport,
          });
        } catch {
          toast.error('无法加载修复方案，请稍后重试');
        }
      })();
    },
    [constraintsCheck, onOpenFeasibilityReport, onOpenDecisionProblem, tripId],
  );

  if (tripConstraints.loading && allSelectableIds.length === 0) {
    return (
      <div className={cn('flex flex-1 items-center justify-center', className)}>
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!selectedId && allSelectableIds.length === 0) {
    return (
      <div className={cn('flex flex-1 items-center justify-center px-6 text-center', className)}>
        <p className="text-sm text-muted-foreground">暂无约束项，请先添加约束或返回工作台。</p>
      </div>
    );
  }

  if (!selectedId) {
    return (
      <div className={cn('flex flex-1 items-center justify-center', className)}>
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const showConsoleTopBar = showTopBackBar && variant === 'fullscreen';
  const drawerGridClass =
    variant === 'drawer'
      ? showExternalDetail
        ? 'lg:grid-cols-[minmax(240px,28%)_minmax(0,1fr)]'
        : canShowInlineEditor
          ? 'lg:grid-cols-[minmax(220px,28%)_minmax(280px,36%)_minmax(0,1fr)]'
          : 'lg:grid-cols-[minmax(260px,32%)_minmax(0,1fr)]'
      : showExternalDetail
        ? 'lg:grid-cols-[minmax(220px,24%)_minmax(0,1fr)]'
        : 'lg:grid-cols-[minmax(220px,28%)_minmax(0,1fr)]';

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', workbenchShell, className)}>
      {showConsoleTopBar ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-background px-4 py-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
            返回规划工作台
          </Button>
          {source === 'bff' && meta ? (
            <span className="text-[10px] text-muted-foreground">
              SSOT v{meta.constraintsVersion}
              {meta.conflictCount ? (
                onOpenPlanningActions ? (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={onOpenPlanningActions}
                      className={workbenchLinkClass}
                    >
                      {meta.conflictCount} 冲突
                    </button>
                  </>
                ) : (
                  ` · ${meta.conflictCount} 冲突`
                )
              ) : null}
            </span>
          ) : null}
        </div>
      ) : null}
      {variant === 'drawer' && source === 'bff' && meta?.conflictCount && onOpenPlanningActions ? (
        <div className="flex shrink-0 items-center border-b border-border/60 bg-background px-4 py-1.5">
          <span className="text-[10px] text-muted-foreground">
            <button
              type="button"
              onClick={onOpenPlanningActions}
              className={workbenchLinkClass}
            >
              {meta.conflictCount} 项需处理
            </button>
          </span>
        </div>
      ) : null}

      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-1',
          drawerGridClass,
        )}
      >
        <ConstraintConsoleListSidebar
          sections={visibleSections}
          contract={contract}
          trip={trip}
          automationSummary={automationSummary}
          selectedId={selectedId}
          travelGoalOrderedIds={travelGoalOrderedIds}
          onTravelGoalReorder={handleTravelGoalReorder}
          onSelect={handleSelectConstraint}
          onEditItem={handleEditConstraintItem}
          onAddConstraint={onAddConstraint}
          onSoftSliderChange={handleSoftSliderChange}
          onRemoveSoftPreference={handleRemoveSoft}
          onViewRepair={handleViewRepair}
          onOpenFeasibilityReport={onOpenFeasibilityReport}
          repairing={constraintsCheck.repairing}
          scopeContextByEntryId={scopeContextByEntryId}
          focusMode={focusMode}
          pendingSaveIds={pendingSaveIds}
          listTitle={variant === 'drawer' ? '条件列表' : undefined}
          listSubtitle={variant === 'drawer' ? '必须满足 · 尽量满足' : undefined}
          className="min-h-0"
        />
        {showExternalDetail && selectedExternalEntry ? (
          <ConstraintExternalDetailPanel
            entry={selectedExternalEntry}
            onRefresh={() => void handleRefreshExternal()}
            refreshing={refreshingExternal}
            onOpenFeasibilityReport={onOpenFeasibilityReport}
            className="min-h-0 border-x border-border/60"
          />
        ) : null}
        {canShowInlineEditor && draft ? (
          <ConstraintEditorPanel
            draft={draft}
            onChange={handleDraftChange}
            onCancel={() => {
              setDraftOverride(null);
              setMustGoOverride(null);
              setSaveError(null);
            }}
            onPreviewImpact={() => toast.message('影响估算已在右侧更新')}
            onSave={() => void handleSave()}
            onRemoveSoft={
              isSoftConstraintId(draft.id) ? () => handleRemoveSoft(draft.id) : undefined
            }
            mustGoPlaces={mustGoDraft}
            onMustGoPlacesChange={setMustGoOverride}
            tripDestination={trip?.destination}
            transportScope={summary?.transport.scope}
            saving={saving || sessionCommitting}
            saveLabel="确认修改"
            errorMessage={saveError}
            budgetUsage={budgetProfile?.actuals?.totalEstimated ?? null}
            hardMetadata={editHardMetadata}
            savedHardMetadata={savedHardMetadata}
            tripDayCount={trip?.TripDay?.length ?? summary?.timeRange.dayCount ?? 7}
            memberOptions={memberOptions}
            routeSegmentOptions={routeSegmentOptions}
            layoutMode="drawer-column"
            className="min-h-0 border-x border-border/60"
          />
        ) : null}
        {!showExternalDetail ? (
        <ConstraintConsoleDetailPanel
          selectedId={selectedId}
          tripId={tripId}
          contract={contract}
          automationSummary={automationSummary}
          travelGoalOrderedIds={travelGoalOrderedIds}
          onTravelGoalReorder={handleTravelGoalReorder}
          travelGoalsSaving={travelGoalsSaving}
          contractEditable={source === 'bff'}
          contractSaving={contractSaving}
          onPatchContract={handlePatchContract}
          onOpenCollaborationCenter={onOpenCollaborationCenter}
          destinationRuleItems={partition.officialRuleItems}
          onSelectDestinationRule={handleSelectConstraint}
          onOpenFeasibilityReport={onOpenFeasibilityReport}
          hardMetadata={selectedHardMetadata}
          hardConstraintLabel={selectedEntry?.label}
          hardEntry={selectedEntry?.kind === 'hard' ? selectedEntry : null}
          softEntry={selectedEntry?.kind === 'soft' ? selectedEntry : null}
          softScopeContext={selectedEntry?.kind === 'soft' ? selectedScopeContext : null}
          hardScopeContext={selectedEntry?.kind === 'hard' ? selectedScopeContext : null}
          onSoftPriorityChange={handleSoftSliderChange}
          preview={preview}
          previewLoading={previewLoading}
          previewSource={previewSource}
          previewError={previewError}
          onPreviewRetry={retryPreview}
          onRunConstraintCheck={() => void constraintsCheck.runCheck()}
          previewOnly={canShowInlineEditor}
          previewEmptyHint={impactPreviewEmptyHint}
          showImpactPreview={showImpactPreview}
          className="min-h-0"
        />
        ) : null}
      </div>

      {variant !== 'drawer' &&
      draft &&
      !showExternalDetail &&
      !selectedContractSectionKey &&
      selectedId !== TRAVEL_GOALS_SECTION_ID ? (
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
          transportScope={summary?.transport.scope}
          saving={saving || sessionCommitting}
          saveLabel={deferSessionSave ? '确认修改' : undefined}
          errorMessage={saveError}
          budgetUsage={budgetProfile?.actuals?.totalEstimated ?? null}
          hardMetadata={editHardMetadata}
          tripDayCount={trip?.TripDay?.length ?? summary?.timeRange.dayCount ?? 7}
          memberOptions={memberOptions}
          routeSegmentOptions={routeSegmentOptions}
        />
      ) : null}
    </div>
  );
});
