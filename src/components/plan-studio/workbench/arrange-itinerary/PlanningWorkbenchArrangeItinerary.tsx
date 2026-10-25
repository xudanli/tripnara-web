import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { itineraryItemsApi } from '@/api/trips';
import { guardStructuralEditOrToast } from '@/lib/world-model-guards';
import { getPlanProposal } from '@/dto/frontend-arrange-itinerary-api-client';
import { EditItineraryItemDialog } from '@/components/trips/EditItineraryItemDialog';
import { EnhancedAddItineraryItemDialog } from '@/components/trips/EnhancedAddItineraryItemDialog';
import type { Collaborator, ItineraryItemDetail, TripDetail } from '@/types/trip';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import { useWorldModelGuards } from '@/hooks/useWorldModelGuards';
import { extractHmFromWindow } from '@/lib/itinerary-item-card-format';
import { mergeSplitPlanNoteIntoNote } from '@/lib/itinerary-split-note.util';
import {
  buildManualSplitMarker,
  nextSplitLetter,
  remainingMemberIds,
  resolveTripMemberOptions,
} from '@/lib/itinerary-split-participants.util';
import { resolveDestinationTimezone } from '@/utils/timezone';
import { isArrangeProposalWriteResponse } from '@/types/arrange-itinerary';
import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';
import {
  buildArrangeLodgingAssistantPrompt,
} from '@/lib/arrange-itinerary-lodging-coverage.util';
import {
  buildLodgingCandidateAssistantPrompt,
  pickNightSuggestionForDay,
  pickRecommendedLodgingCandidate,
} from '@/lib/arrange-itinerary-lodging-suggestions.util';
import type {
  ArrangeLodgingSuggestion,
  ArrangeLodgingSuggestionCandidate,
  CopilotSuggestion,
} from '@/types/arrange-itinerary';
import { ArrangeItineraryAddItemDialog } from './ArrangeItineraryAddItemDialog';
import type { ArrangeItineraryAddItemSubmitPayload } from './ArrangeItineraryAddItemDialog';
import { extractCountryCodeFromDestination } from '@/lib/planning-assistant-v2-context';
import { ArrangeItineraryAddLodgingSheet } from './ArrangeItineraryAddLodgingSheet';
import { ArrangeItineraryPlaceCandidateDialog } from './ArrangeItineraryPlaceCandidateDialog';
import { ArrangeItineraryRightPanel } from './ArrangeItineraryRightPanel';
import { ArrangeItineraryCompletionBanner } from './ArrangeItineraryCompletionBanner';
import { ArrangeItineraryContextPanel } from './ArrangeItineraryContextPanel';
import { ArrangeItineraryInsertGapDialog } from './ArrangeItineraryInsertGapDialog';
import { ArrangeItineraryMoveItemDialog } from './ArrangeItineraryMoveItemDialog';
import { PlanProposalDecisionSheet } from './PlanProposalDecisionSheet';
import { ArrangeItineraryTimelinePanel } from './ArrangeItineraryTimelinePanel';
import { ArrangeItineraryToolbar } from './ArrangeItineraryToolbar';
import { WorkbenchDeleteItineraryEntryDialog } from '../WorkbenchDeleteItineraryEntryDialog';
import { useArrangeItinerary } from './useArrangeItinerary';
import type { ArrangeItineraryAiAction } from './types';
import {
  workbenchArrangeItineraryColumnSurface,
  workbenchColumnSurface,
  workbenchScrollable,
} from '../workbench-ui';

export interface PlanningWorkbenchArrangeItineraryProps {
  tripId: string;
  trip: TripDetail | null;
  conflicts: PlanningConflictItem[];
  refreshKey?: number;
  autoArrangeOnMount?: boolean;
  onAutoArrangeIntentConsumed?: () => void;
  onViewMap?: (dayIndex?: number) => void;
  onEditPreferences?: () => void;
  onItineraryChanged?: () => void;
  collaborators?: Collaborator[] | null;
  onOpenFullSchedule?: (dayIndex?: number) => void;
  onOpenAttractionExplore?: () => void;
  onOpenItineraryDiagnosis?: () => void;
  onOpenConstraints?: () => void;
  /** 打开决策空间并定位到指定冲突 */
  onOpenDecisionSpace?: (context?: { conflictId?: string; dayIndex?: number }) => void;
  conflictMustHandleCount?: number;
  tepFlexibilityEnabled?: boolean;
  className?: string;
}

function resolveApiError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const code = (error as Error & { code?: string; status?: number }).code;
    if (code === 'CONTEXT_STALE' || (error as Error & { status?: number }).status === 409) {
      return '行程上下文已变化，请刷新后重试';
    }
    return error.message || fallback;
  }
  return fallback;
}

/** 规划工作台 · 编排行程（三栏：配置 | 时间轴 | 地图与 AI） */
export function PlanningWorkbenchArrangeItinerary({
  tripId,
  trip,
  conflicts,
  refreshKey = 0,
  autoArrangeOnMount = false,
  onAutoArrangeIntentConsumed,
  onViewMap,
  onEditPreferences,
  onItineraryChanged,
  collaborators,
  onOpenFullSchedule,
  onOpenAttractionExplore,
  onOpenItineraryDiagnosis,
  onOpenConstraints,
  onOpenDecisionSpace,
  conflictMustHandleCount = 0,
  tepFlexibilityEnabled = false,
  className,
}: PlanningWorkbenchArrangeItineraryProps) {
  const arrange = useArrangeItinerary(tripId, trip, conflicts, refreshKey);
  const { sendAssistantMessage } = useAssistantSidebar();
  const { canEditTiming, worldModelGuards } = useWorldModelGuards();
  const [editingItem, setEditingItem] = useState<ItineraryItemDetail | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogDayIndex, setAddDialogDayIndex] = useState<number | null>(null);
  const [placeCandidateId, setPlaceCandidateId] = useState<string | null>(null);
  const [productAddPending, setProductAddPending] = useState(false);
  const [parallelDialog, setParallelDialog] = useState<{
    dayIndex: number;
    startTime: string;
    endTime: string;
    remainingIds: string[];
    letter: string;
    splitPlanId?: string;
    remainingCount: number;
  } | null>(null);
  const [lodgingSheetDayIndex, setLodgingSheetDayIndex] = useState<number | null>(null);
  const [lodgingSearchDayIndex, setLodgingSearchDayIndex] = useState<number | null>(null);
  const [gapDialogDayIndex, setGapDialogDayIndex] = useState<number | null>(null);
  const [moveDialog, setMoveDialog] = useState<{
    itemId: string;
    dayIndex: number;
    label: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const scheduleTimezone = resolveDestinationTimezone(trip?.destination);
  const editTripDays = useMemo(
    () => trip?.TripDay?.map((d) => ({ id: d.id, date: d.date })) ?? [],
    [trip?.TripDay],
  );
  const lodgingNightByDayIndex = useMemo(
    () => new Map(arrange.lodgingCoverage.nights.map((night) => [night.dayIndex, night])),
    [arrange.lodgingCoverage.nights],
  );
  const lodgingSheetNight =
    lodgingSheetDayIndex != null ? lodgingNightByDayIndex.get(lodgingSheetDayIndex) ?? null : null;
  const lodgingSearchDay =
    lodgingSearchDayIndex != null ? trip?.TripDay?.[lodgingSearchDayIndex] ?? null : null;
  const memberOptions = useMemo(
    () => resolveTripMemberOptions(collaborators),
    [collaborators],
  );
  const memberLabelById = useMemo(
    () => new Map(memberOptions.map((m) => [m.id, m.label])),
    [memberOptions],
  );
  const memberCount = memberOptions.length;

  const lodgingIncomplete =
    arrange.lodgingCoverage.totalNights > 0 && !arrange.lodgingCoverage.isComplete;

  const handleSelectTimelineEntry = useCallback(
    (entryId: string) => {
      arrange.setSelectedTimelineEntryId(entryId);
    },
    [arrange],
  );

  const handleOpenAddLodging = useCallback(
    (dayIndex: number) => {
      if (!guardStructuralEditOrToast(worldModelGuards)) return;
      if (!trip?.TripDay?.[dayIndex]) {
        toast.error('未找到对应日程');
        return;
      }
      setLodgingSheetDayIndex(dayIndex);
    },
    [trip?.TripDay, worldModelGuards],
  );

  const handleOpenLodgingHotelSearch = useCallback(() => {
    if (lodgingSheetDayIndex == null) return;
    setLodgingSearchDayIndex(lodgingSheetDayIndex);
    setLodgingSheetDayIndex(null);
  }, [lodgingSheetDayIndex]);

  const lodgingStandardLabel =
    arrange.lodgingSuggestionsBundle.accommodationStandardLabel ?? '3 星或以上';

  const handleFillLodgingWithAssistant = useCallback(() => {
    sendAssistantMessage(
      buildArrangeLodgingAssistantPrompt(arrange.lodgingCoverage, lodgingStandardLabel),
    );
  }, [arrange.lodgingCoverage, lodgingStandardLabel, sendAssistantMessage]);

  const handleAskAssistantForLodgingDay = useCallback(
    (dayIndex: number) => {
      const night = arrange.lodgingCoverage.nights.find((item) => item.dayIndex === dayIndex);
      if (!night) {
        handleFillLodgingWithAssistant();
        return;
      }
      sendAssistantMessage(
        `请根据当前已排好的景点路线，为 Day ${night.dayNumber}（${night.dateLabel}）推荐当晚住宿并加入行程。优先减少次日早晨车程，并符合团队住宿标准（${lodgingStandardLabel}）。`,
      );
    },
    [
      arrange.lodgingCoverage.nights,
      handleFillLodgingWithAssistant,
      lodgingStandardLabel,
      sendAssistantMessage,
    ],
  );

  const handleAdoptLodgingCandidate = useCallback(
    (
      dayIndex: number,
      candidate: ArrangeLodgingSuggestionCandidate,
      _night: ArrangeLodgingSuggestion,
    ) => {
      const coverageNight = arrange.lodgingCoverage.nights.find((item) => item.dayIndex === dayIndex);
      if (!coverageNight) {
        toast.error('未找到对应夜晚');
        return;
      }

      if (candidate.placeId != null) {
        setLodgingSearchDayIndex(dayIndex);
        setLodgingSheetDayIndex(null);
      }

      sendAssistantMessage(
        buildLodgingCandidateAssistantPrompt(coverageNight, candidate, lodgingStandardLabel),
      );
    },
    [arrange.lodgingCoverage.nights, lodgingStandardLabel, sendAssistantMessage],
  );

  const handleLodgingAdded = useCallback(() => {
    void arrange.reloadAll();
    onItineraryChanged?.();
    setLodgingSearchDayIndex(null);
    setLodgingSheetDayIndex(null);
  }, [arrange, onItineraryChanged]);

  const notifyWriteResult = useCallback(
    (result: unknown, directSuccessMessage: string) => {
      if (isArrangeProposalWriteResponse(result)) {
        toast.message('已生成编排草案，请确认后写入');
        return;
      }
      toast.success(directSuccessMessage);
      onItineraryChanged?.();
    },
    [onItineraryChanged],
  );

  const handleAutoArrange = useCallback(async () => {
    if (!arrange.copilotEnabled) {
      toast.message('手动模式下请使用局部调整，或切换为智能编排');
      return;
    }
    try {
      const result = await arrange.autoArrange();
      if (result.mode === 'direct') {
        toast.success(result.message ?? '已提交自动编排');
        onItineraryChanged?.();
      } else {
        toast.message('已生成自动编排草案，请确认后写入');
      }
    } catch (error) {
      toast.error(resolveApiError(error, '自动编排失败'));
    }
  }, [arrange, onItineraryChanged]);

  const autoArrangeOnMountTriggeredRef = useRef(false);
  useEffect(() => {
    if (!autoArrangeOnMount || autoArrangeOnMountTriggeredRef.current) return;
    if (arrange.candidatesLoading) return;
    autoArrangeOnMountTriggeredRef.current = true;
    onAutoArrangeIntentConsumed?.();
    void handleAutoArrange();
  }, [
    autoArrangeOnMount,
    arrange.candidatesLoading,
    handleAutoArrange,
    onAutoArrangeIntentConsumed,
  ]);

  const handleRemoveCandidate = async (candidateId: string) => {
    try {
      await arrange.handleRemoveFromCandidates(candidateId);
      toast.success('已移出候选');
    } catch (error) {
      toast.error(resolveApiError(error, '移出候选失败'));
    }
  };

  const handlePlaceCandidate = (candidateId: string) => {
    setPlaceCandidateId(candidateId);
  };

  const placeCandidateForDialog = useMemo(
    () => arrange.candidates.find((item) => item.id === placeCandidateId) ?? null,
    [arrange.candidates, placeCandidateId],
  );

  const handleConfirmPlaceCandidate = async (payload: {
    dayIndex: number;
    startTime: string;
    endTime: string;
  }) => {
    if (!placeCandidateId) return;
    try {
      const result = await arrange.placeCandidate(placeCandidateId, payload.dayIndex, {
        startTime: payload.startTime,
        endTime: payload.endTime,
        commitMode: 'direct',
      });
      setPlaceCandidateId(null);
      notifyWriteResult(result, '已加入日程');
    } catch (error) {
      toast.error(resolveApiError(error, '加入日程失败'));
    }
  };

  const handleAiAction = async (action: ArrangeItineraryAiAction) => {
    if (action === 'arrange_lodging') {
      handleFillLodgingWithAssistant();
      return;
    }
    if (!arrange.copilotEnabled) {
      toast.message('手动模式下 AI 编排动作已关闭');
      return;
    }
    try {
      const result = await arrange.runAiAction({
        action,
        dayIndex: arrange.selectedDayIndex + 1,
      });
      if (isArrangeProposalWriteResponse(result)) {
        toast.message('已生成 AI 编排草案，请确认后写入');
      } else {
        toast.success('AI 分析完成');
      }
    } catch (error) {
      toast.error(resolveApiError(error, 'AI 分析失败'));
    }
  };

  const handleOpenConflict = useCallback(
    (conflictId: string, dayIndex: number) => {
      const isSynthetic =
        conflictId === 'drive-over-limit' || conflictId.startsWith('metric-');
      const resolvedId = isSynthetic
        ? conflicts.find((item) => {
            const days = item.affectedDays ?? item.issue?.affectedDays;
            return days?.includes(dayIndex + 1);
          })?.id
        : conflictId;
      if (onOpenDecisionSpace) {
        onOpenDecisionSpace({
          conflictId: resolvedId ?? conflictId,
          dayIndex,
        });
        return;
      }
      onOpenItineraryDiagnosis?.();
    },
    [conflicts, onOpenDecisionSpace, onOpenItineraryDiagnosis],
  );

  const handleAddActivity = useCallback((dayIndex: number) => {
    if (arrange.candidates.length === 0) {
      toast.message('请先在探索景点中添加候选');
      return;
    }
    setParallelDialog(null);
    setAddDialogDayIndex(dayIndex);
  }, [arrange.candidates.length]);

  const handleAddParallelEntry = useCallback(
    (entryId: string, dayIndex: number) => {
      if (arrange.candidates.length === 0) {
        toast.message('请先在探索景点中添加候选');
        return;
      }
      const day = arrange.daySnapshots[dayIndex];
      const entry = day?.timeline.find((item) => item.id === entryId);
      if (!entry) return;
      const allIds = memberOptions.map((m) => m.id);
      const remaining = remainingMemberIds(allIds, entry.participantIds ?? []);
      if (remaining.length === 0) {
        toast.message('当前时段成员已全部分配');
        return;
      }
      const usedLetters = day.timeline.map((item) => item.splitLetter);
      const letter = nextSplitLetter(usedLetters);
      setAddDialogDayIndex(null);
      setParallelDialog({
        dayIndex,
        startTime: extractHmFromWindow(entry.startTime ?? undefined, scheduleTimezone) || '10:30',
        endTime: extractHmFromWindow(entry.endTime ?? undefined, scheduleTimezone) || '12:00',
        remainingIds: remaining,
        letter,
        splitPlanId: entry.splitPlanId,
        remainingCount: remaining.length,
      });
    },
    [arrange.candidates.length, arrange.daySnapshots, memberOptions, scheduleTimezone],
  );

  const handleInsertGap = useCallback((dayIndex: number) => {
    setGapDialogDayIndex(dayIndex);
  }, []);

  const handleAddItemSubmit = async (payload: ArrangeItineraryAddItemSubmitPayload) => {
    const dayIndex = parallelDialog?.dayIndex ?? addDialogDayIndex;
    if (dayIndex == null) return;
    const tripDay = trip?.TripDay?.[dayIndex];
    try {
      if (payload.source === 'experience') {
        if (!tripDay?.id) {
          toast.error('缺少行程日信息');
          return;
        }
        if (!payload.placeId || !payload.experienceDefinitionId) {
          toast.error('请选择地点与体验项目');
          return;
        }
        if (!payload.startTimeIso || !payload.endTimeIso) {
          toast.error('请填写活动时段');
          return;
        }
        setProductAddPending(true);
        try {
          // 1) 先创建：placeId + experienceDefinitionId（不强制 Offering）
          const created = await itineraryItemsApi.create({
            tripDayId: tripDay.id,
            type: 'ACTIVITY',
            placeId: payload.placeId,
            startTime: payload.startTimeIso,
            endTime: payload.endTimeIso,
            experienceDefinitionId: payload.experienceDefinitionId,
            note: payload.note,
            forceCreate: true,
          });
          const itemId =
            created && typeof created === 'object' && 'item' in created
              ? (created as { item?: { id?: string } }).item?.id
              : (created as { id?: string } | null)?.id;

          // 2) 可选升格：有 Offering/Session 再 PATCH
          if (
            itemId &&
            payload.upgradeSession &&
            payload.productOfferingId &&
            payload.productSessionId
          ) {
            await itineraryItemsApi.update(itemId, {
              productOfferingId: payload.productOfferingId,
              productSessionId: payload.productSessionId,
              experienceDefinitionId: payload.experienceDefinitionId,
              startTime: payload.startTimeIso,
              endTime: payload.endTimeIso,
              note: payload.note,
              forceCreate: true,
            });
            if (payload.travelFromPreviousDuration != null) {
              await itineraryItemsApi.updateTravelInfo(itemId, {
                travelFromPreviousDuration: payload.travelFromPreviousDuration,
              });
            }
            toast.success(
              payload.experienceName
                ? `已添加「${payload.experienceName}」并绑定班次`
                : '已添加体验并绑定班次',
            );
          } else {
            toast.success(
              payload.experienceName
                ? `已添加体验「${payload.experienceName}」`
                : '已添加体验项目',
            );
          }

          setAddDialogDayIndex(null);
          setParallelDialog(null);
          void arrange.reloadAll();
          onItineraryChanged?.();
        } finally {
          setProductAddPending(false);
        }
        return;
      }

      const noteWithSplit = parallelDialog
        ? mergeSplitPlanNoteIntoNote(
            payload.note || `并行分流 · 分组 ${parallelDialog.letter}`,
            buildManualSplitMarker({
              memberIds: parallelDialog.remainingIds,
              phase: 'branch',
              letter: parallelDialog.letter,
              groupLabel: `分组 ${parallelDialog.letter}`,
              splitPlanId: parallelDialog.splitPlanId,
            }),
          )
        : payload.note;

      let result: unknown;
      // 并行分流需写入 note 成员标记；优先 addItem；普通添加可用 placeCandidate
      if (parallelDialog && payload.placeId) {
        result = await arrange.addItem({
          dayIndex: dayIndex + 1,
          type: 'ACTIVITY',
          placeId: payload.placeId,
          startTime: payload.startTime,
          endTime: payload.endTime,
          note: noteWithSplit,
          insertMode: 'append',
          forceCreate: true,
        });
      } else if (payload.candidateId && !parallelDialog) {
        result = await arrange.placeCandidate(payload.candidateId, dayIndex, {
          startTime: payload.startTime,
          endTime: payload.endTime,
        });
      } else if (payload.placeId) {
        result = await arrange.addItem({
          dayIndex: dayIndex + 1,
          type: 'ACTIVITY',
          placeId: payload.placeId,
          startTime: payload.startTime,
          endTime: payload.endTime,
          note: noteWithSplit,
          insertMode: 'append',
          forceCreate: true,
        });
      } else {
        toast.error('缺少候选景点信息');
        return;
      }
      notifyWriteResult(result, parallelDialog ? '已添加并行活动' : '已添加活动');
      setAddDialogDayIndex(null);
      setParallelDialog(null);
    } catch (error) {
      toast.error(resolveApiError(error, '添加活动失败'));
    }
  };

  const handleInsertGapSubmit = async (payload: {
    startTime: string;
    endTime: string;
    label?: string;
  }) => {
    if (gapDialogDayIndex == null) return;
    try {
      const result = await arrange.insertGap({
        dayIndex: gapDialogDayIndex + 1,
        startTime: payload.startTime,
        endTime: payload.endTime,
        label: payload.label,
      });
      notifyWriteResult(result, '已插入空档');
      setGapDialogDayIndex(null);
    } catch (error) {
      toast.error(resolveApiError(error, '插入空档失败'));
    }
  };

  const handleApplyProposal = async (force = false) => {
    try {
      await arrange.applyActiveProposal(force);
      toast.success('已写入正式行程');
      onItineraryChanged?.();
    } catch (error) {
      toast.error(resolveApiError(error, '写入行程失败'));
      void arrange.reloadAll();
    }
  };

  const handleDiscardProposal = async () => {
    try {
      await arrange.discardActiveProposal();
      toast.message('已丢弃编排草案');
    } catch (error) {
      toast.error(resolveApiError(error, '丢弃草案失败'));
    }
  };

  const handleEditEntry = useCallback(
    async (itemId: string) => {
      arrange.setSelectedTimelineEntryId(itemId);
      if (!canEditTiming) {
        toast.error(worldModelGuards?.banner_message_zh ?? '当前阶段不可编辑行程时间');
        return;
      }
      try {
        const item = await itineraryItemsApi.getById(itemId);
        setEditingItem(item);
        setEditDialogOpen(true);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : '加载行程项失败');
      }
    },
    [arrange, canEditTiming, worldModelGuards],
  );

  const handleEditSaved = () => {
    void arrange.reloadAll();
    onItineraryChanged?.();
  };

  const resolveEntryTitle = useCallback(
    (entryId: string) => {
      for (const day of arrange.daySnapshots) {
        const entry = day.timeline.find((item) => item.id === entryId);
        if (entry) return entry.title;
      }
      return '行程项';
    },
    [arrange.daySnapshots],
  );

  const handleDeleteEntry = useCallback(
    (entryId: string) => {
      if (!guardStructuralEditOrToast(worldModelGuards)) return;
      if (arrange.userLockedItemIds?.has(entryId)) {
        toast.error('该行程项已锁定，请先解除锁定后再删除');
        return;
      }
      setDeleteTarget({ id: entryId, title: resolveEntryTitle(entryId) });
    },
    [arrange.userLockedItemIds, resolveEntryTitle, worldModelGuards],
  );

  const handleConfirmDeleteEntry = async () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      await itineraryItemsApi.delete(deleteTarget.id);
      toast.success(`已删除「${deleteTarget.title}」`);
      setDeleteTarget(null);
      await arrange.reloadAll();
      onItineraryChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setDeletePending(false);
    }
  };

  const handleAnalyzeMoveEntry = (entryId: string, dayIndex: number) => {
    const day = arrange.daySnapshots[dayIndex];
    const entry = day?.timeline.find((item) => item.id === entryId);
    setMoveDialog({
      itemId: entryId,
      dayIndex,
      label: entry?.title ?? '行程项',
    });
  };

  const handleMoveSubmit = async (payload: {
    dayIndex: number;
    startTime: string;
    endTime: string;
  }) => {
    if (!moveDialog) return;
    try {
      const result = await arrange.analyzeMove(
        moveDialog.itemId,
        payload.dayIndex - 1,
        payload.startTime,
        payload.endTime,
      );
      notifyWriteResult(result, '已分析移动影响');
      setMoveDialog(null);
    } catch (error) {
      toast.error(resolveApiError(error, '移动分析失败'));
    }
  };

  const handleToggleUserLock = async (itemId: string, locked: boolean) => {
    try {
      await arrange.toggleUserLock(itemId, locked);
      toast.success(locked ? '已手动锁定' : '已解除锁定');
      onItineraryChanged?.();
    } catch (error) {
      toast.error(resolveApiError(error, '更新锁定失败'));
    }
  };

  const handleExecuteCopilotSuggestion = async (suggestion: CopilotSuggestion) => {
    if (suggestion.kind === 'suggest_lodging_for_day') {
      const dayIndexOneBased = suggestion.actionHint?.dayIndex;
      if (dayIndexOneBased != null) {
        handleOpenAddLodging(dayIndexOneBased - 1);
        return;
      }
      handleFillLodgingWithAssistant();
      return;
    }

    if (suggestion.actionHint?.type === 'apply_lodging_suggestion') {
      const dayIndexOneBased = suggestion.actionHint.dayIndex;
      if (dayIndexOneBased != null) {
        const nightSuggestion = pickNightSuggestionForDay(
          arrange.lodgingSuggestionsBundle,
          dayIndexOneBased - 1,
        );
        const candidate = nightSuggestion
          ? pickRecommendedLodgingCandidate(nightSuggestion)
          : undefined;
        if (nightSuggestion && candidate) {
          handleAdoptLodgingCandidate(dayIndexOneBased - 1, candidate, nightSuggestion);
          return;
        }
      }
      handleFillLodgingWithAssistant();
      return;
    }

    if (suggestion.actionHint?.type === 'suggest_lodging') {
      const dayIndexOneBased = suggestion.actionHint.dayIndex;
      if (dayIndexOneBased != null) {
        handleOpenAddLodging(dayIndexOneBased - 1);
        return;
      }
      handleFillLodgingWithAssistant();
      return;
    }

    if (!arrange.copilotEnabled) {
      toast.message('手动模式下 Copilot 动作已关闭');
      return;
    }
    if (arrange.pendingProposalCount > 0) {
      toast.message('已有待确认草案，请先处理后再执行协同动作');
      return;
    }
    try {
      if (suggestion.kind === 'pending_proposal' && suggestion.actionHint?.proposalId) {
        const proposal = await getPlanProposal(tripId, suggestion.actionHint.proposalId);
        arrange.captureProposalResult({
          mode: 'proposal',
          tripId,
          proposal,
          orchestrationState: arrange.orchestrationState ?? {
            tripId,
            phase: 'AWAITING_CONFIRMATION',
            activeProposalId: suggestion.actionHint.proposalId,
            contextVersion: proposal.contextVersion,
          },
        });
        toast.message('已打开待确认草案');
        return;
      }
      if (suggestion.option && suggestion.actionHint?.proposalId) {
        const proposal = await getPlanProposal(tripId, suggestion.actionHint.proposalId);
        arrange.captureProposalResult({
          mode: 'proposal',
          tripId,
          proposal,
          orchestrationState: arrange.orchestrationState ?? {
            tripId,
            phase: 'AWAITING_CONFIRMATION',
            activeProposalId: suggestion.actionHint.proposalId,
            contextVersion: proposal.contextVersion,
          },
        });
        toast.message('已打开完整决策草案');
        return;
      }
      await arrange.runCopilotAction({
        action: 'execute_suggestion',
        suggestionId: suggestion.id,
        candidateId: suggestion.actionHint?.candidateId,
        dayIndex: suggestion.actionHint?.dayIndex,
      });
      toast.message('已生成协同草案，请确认后写入');
    } catch (error) {
      toast.error(resolveApiError(error, '执行 Copilot 建议失败'));
    }
  };

  const dayCount = arrange.overview?.dayCount ?? trip?.TripDay?.length ?? 0;
  const orchestrationMessage = arrange.orchestrationState?.message;
  const orchestrationPhase = arrange.orchestrationState?.phase;

  return (
    <>
      <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
        {orchestrationPhase && orchestrationPhase !== 'IDLE' && orchestrationPhase !== 'COMPLETED' ? (
          <div className="shrink-0 border-b border-border/50 bg-background px-3 py-1.5 text-[11px] text-muted-foreground">
            {orchestrationMessage ?? `编排状态：${orchestrationPhase}`}
          </div>
        ) : null}

        <ArrangeItineraryToolbar
          trip={trip}
          viewMode={arrange.viewMode}
          onViewModeChange={arrange.setViewMode}
          mapSyncEnabled={arrange.mapSyncEnabled}
          onMapSyncChange={arrange.setMapSyncEnabled}
          autoArrangePending={arrange.autoArrangePending}
          onAutoArrange={() => void handleAutoArrange()}
          planningMode={arrange.planningMode}
          planningModePending={arrange.planningModePending}
          onPlanningModeChange={(mode) => {
            void arrange.setPlanningMode(mode).catch((error) => {
              toast.error(resolveApiError(error, '切换规划模式失败'));
            });
          }}
          onOpenItineraryDiagnosis={onOpenItineraryDiagnosis}
          onOpenConstraints={onOpenConstraints}
          conflictMustHandleCount={conflictMustHandleCount}
        />

        <ArrangeItineraryCompletionBanner
          activityCount={arrange.activityCount}
          lodgingSummary={arrange.lodgingCoverage}
          onFillLodgingWithAssistant={handleFillLodgingWithAssistant}
        />

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto xl:grid-cols-[minmax(220px,18%)_minmax(0,1fr)_minmax(260px,24%)] xl:overflow-hidden">
          <aside
            className={cn(
              'min-h-0 xl:max-h-full xl:overflow-y-auto border-b border-border/60 xl:border-b-0 xl:border-r',
              workbenchArrangeItineraryColumnSurface,
              workbenchScrollable,
            )}
          >
            <ArrangeItineraryContextPanel
              tripId={tripId}
              trip={trip}
              collaborators={collaborators}
              candidates={arrange.candidates}
              candidatesLoading={arrange.candidatesLoading || arrange.overviewLoading}
              onRemoveCandidate={(candidateId) => void handleRemoveCandidate(candidateId)}
              onPlaceCandidate={(candidateId) => handlePlaceCandidate(candidateId)}
              placePending={arrange.placeCandidatePending || arrange.writePending}
              removePending={arrange.removeCandidatePending}
              itemLocks={arrange.itemLocks}
              itemLocksLoading={arrange.itemLocksLoading}
              userLockedItemIds={arrange.userLockedItemIds}
              copilotSuggestions={arrange.copilotEnabled ? arrange.copilotSuggestions : []}
              copilotSuggestionsLoading={arrange.copilotSuggestionsLoading}
              copilotActionPending={arrange.writePending || arrange.copilotActionPending}
              onExecuteCopilotSuggestion={(suggestion) =>
                void handleExecuteCopilotSuggestion(suggestion)
              }
              decisionClusters={arrange.workbenchDecisionClusters}
              activeProposalId={arrange.orchestrationState?.activeProposalId}
              decisionClustersLoading={arrange.workbenchSnapshotLoading}
              onOpenActiveProposal={() => void arrange.loadActiveProposal()}
              onEditPreferences={onEditPreferences}
              lodgingSummary={arrange.lodgingCoverage}
              lodgingSuggestionsBundle={arrange.lodgingSuggestionsBundle}
              onAdoptLodgingCandidate={handleAdoptLodgingCandidate}
              onAskNaraForLodgingNight={handleAskAssistantForLodgingDay}
              adoptLodgingPending={arrange.writePending}
              onAddLodging={handleOpenAddLodging}
              onEditLodging={(itemId) => void handleEditEntry(itemId)}
              onOpenAttractionExplore={onOpenAttractionExplore}
            />
          </aside>

          <main className={cn('flex min-h-0 h-full flex-col overflow-hidden', workbenchColumnSurface)}>
            <ArrangeItineraryTimelinePanel
              className="h-full min-h-0"
              viewMode={arrange.viewMode}
              daySnapshots={arrange.daySnapshots}
              selectedDayIndex={arrange.selectedDayIndex}
              onSelectedDayChange={arrange.setSelectedDayIndex}
              loading={arrange.itineraryLoading}
              destinationLabel={trip?.destination?.trim()}
              weatherLabel={arrange.context?.tripContext?.weatherLabel}
              onEditEntry={(entryId) => void handleEditEntry(entryId)}
              onDeleteEntry={handleDeleteEntry}
              onAddParallelEntry={handleAddParallelEntry}
              onOpenConflict={handleOpenConflict}
              memberLabelById={memberLabelById}
              memberCount={memberCount}
              onAddActivity={handleAddActivity}
              onAddLodging={handleOpenAddLodging}
              onEditLodging={(itemId) => void handleEditEntry(itemId)}
              onAskAssistantForLodging={handleAskAssistantForLodgingDay}
              lodgingNightByDayIndex={lodgingNightByDayIndex}
              onInsertGap={handleInsertGap}
              onAnalyzeMoveEntry={handleAnalyzeMoveEntry}
              itemLocks={arrange.itemLocks}
              userLockedItemIds={arrange.userLockedItemIds}
              onToggleUserLock={(itemId, locked) => void handleToggleUserLock(itemId, locked)}
              copilotEnabled={arrange.copilotEnabled}
              selectedEntryId={arrange.selectedTimelineEntryId}
              onSelectEntry={handleSelectTimelineEntry}
            />
          </main>

          <aside
            className={cn(
              'flex h-full min-h-0 flex-col overflow-hidden border-t border-border/60 xl:border-l xl:border-t-0',
              workbenchArrangeItineraryColumnSurface,
            )}
          >
            <ArrangeItineraryRightPanel
              className="h-full min-h-0"
              assistantProps={{
                mapPoints: arrange.mapPoints,
                mapLodgingLegs: arrange.mapLodgingLegs,
                mapLoading: arrange.mapLoading,
                mapSyncEnabled: arrange.mapSyncEnabled,
                aiPending: arrange.aiActionPending,
                aiAnswer: arrange.proposalAiAnswer,
                onViewMap: () => onViewMap?.(arrange.selectedDayIndex),
                onAiAction: (action) => void handleAiAction(action),
                copilotEnabled: arrange.copilotEnabled,
                lodgingIncomplete,
              }}
            />
          </aside>
        </div>
      </div>

      <PlanProposalDecisionSheet
        tripId={tripId}
        open={arrange.activeProposal != null}
        onOpenChange={(open) => {
          if (!open) arrange.clearActiveProposal();
        }}
        proposal={arrange.activeProposal}
        aiAnswer={arrange.proposalAiAnswer}
        applying={arrange.applyProposalPending}
        discarding={arrange.discardProposalPending}
        applyComplete={arrange.proposalApplyComplete}
        executionSteps={arrange.proposalExecutionSteps}
        validUntil={arrange.proposalValidUntil}
        tripConflicts={arrange.tripConflictDiagnostics}
        monitorStale={arrange.proposalMonitorStale}
        monitorStaleReason={arrange.proposalMonitorStaleReason}
        lodgingCoverage={arrange.lodgingCoverage}
        onFillLodging={handleFillLodgingWithAssistant}
        onApply={(force) => void handleApplyProposal(force)}
        onDiscard={() => void handleDiscardProposal()}
      />

      <ArrangeItineraryAddLodgingSheet
        open={lodgingSheetDayIndex != null}
        onOpenChange={(open) => {
          if (!open) setLodgingSheetDayIndex(null);
        }}
        night={lodgingSheetNight}
        missingLodgingNights={arrange.lodgingCoverage.missingNights}
        onOpenHotelSearch={handleOpenLodgingHotelSearch}
        onAskNara={
          lodgingSheetDayIndex != null
            ? () => handleAskAssistantForLodgingDay(lodgingSheetDayIndex)
            : undefined
        }
        onFillAllWithNara={handleFillLodgingWithAssistant}
      />

      <ArrangeItineraryPlaceCandidateDialog
        open={placeCandidateId != null}
        onOpenChange={(open) => {
          if (!open) setPlaceCandidateId(null);
        }}
        candidate={placeCandidateForDialog}
        initialDayIndex={arrange.selectedDayIndex}
        dayCount={trip?.TripDay?.length || arrange.daySnapshots.length || 1}
        submitting={arrange.placeCandidatePending || arrange.writePending}
        onSubmit={(payload) => void handleConfirmPlaceCandidate(payload)}
      />

      <ArrangeItineraryAddItemDialog
        open={addDialogDayIndex != null || parallelDialog != null}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogDayIndex(null);
            setParallelDialog(null);
          }
        }}
        dayNumber={(parallelDialog?.dayIndex ?? addDialogDayIndex ?? 0) + 1}
        dayDate={
          trip?.TripDay?.[parallelDialog?.dayIndex ?? addDialogDayIndex ?? 0]?.date?.slice(
            0,
            10,
          ) ?? null
        }
        timezone={scheduleTimezone}
        countryCode={extractCountryCodeFromDestination(trip?.destination) ?? 'IS'}
        candidates={arrange.candidates}
        submitting={
          arrange.placeCandidatePending || arrange.addItemPending || productAddPending
        }
        initialStartTime={parallelDialog?.startTime}
        initialEndTime={parallelDialog?.endTime}
        parallelHint={
          parallelDialog
            ? `同一时段为剩余 ${parallelDialog.remainingCount} 人创建并行分流活动（分组 ${parallelDialog.letter}）`
            : undefined
        }
        onSubmit={(payload) => void handleAddItemSubmit(payload)}
      />

      <ArrangeItineraryInsertGapDialog
        open={gapDialogDayIndex != null}
        onOpenChange={(open) => {
          if (!open) setGapDialogDayIndex(null);
        }}
        dayNumber={(gapDialogDayIndex ?? 0) + 1}
        submitting={arrange.insertGapPending}
        onSubmit={(payload) => void handleInsertGapSubmit(payload)}
      />

      <ArrangeItineraryMoveItemDialog
        open={moveDialog != null}
        onOpenChange={(open) => {
          if (!open) setMoveDialog(null);
        }}
        itemLabel={moveDialog?.label ?? ''}
        dayCount={dayCount}
        initialDayIndex={moveDialog?.dayIndex ?? 0}
        submitting={arrange.analyzeMovePending}
        onSubmit={(payload) => void handleMoveSubmit(payload)}
      />

      {lodgingSearchDay ? (
        <EnhancedAddItineraryItemDialog
          tripId={tripId}
          tripDay={lodgingSearchDay}
          tripDays={trip?.TripDay}
          countryCode={trip?.destination}
          open={lodgingSearchDayIndex != null}
          onOpenChange={(open) => {
            if (!open) setLodgingSearchDayIndex(null);
          }}
          onSuccess={handleLodgingAdded}
          initialCategory="HOTEL"
        />
      ) : null}

      {editingItem ? (
        <EditItineraryItemDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
          timezone={scheduleTimezone}
          tripDays={editTripDays}
          currentTripDayId={editingItem.tripDayId ?? editingItem.TripDay?.id}
          onSuccess={handleEditSaved}
          tepFlexibilityEnabled={tepFlexibilityEnabled}
          collaborators={collaborators}
        />
      ) : null}

      <WorkbenchDeleteItineraryEntryDialog
        open={deleteTarget != null}
        title={deleteTarget?.title}
        pending={deletePending}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDeleteEntry}
      />
    </>
  );
}
