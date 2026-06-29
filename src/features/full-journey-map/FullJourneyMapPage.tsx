import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { EditItineraryItemDialog } from '@/components/trips/EditItineraryItemDialog';
import { ReplaceItineraryItemDialog } from '@/components/trips/ReplaceItineraryItemDialog';
import { FullJourneyMapCanvas } from './components/FullJourneyMapCanvas';
import { FullJourneyMapHeader } from './components/FullJourneyMapHeader';
import { FullJourneyMapInspector } from './components/FullJourneyMapInspector';
import { FullJourneyMapLeftPanel } from './components/FullJourneyMapLeftPanel';
import { FullJourneyMapMobileChrome } from './components/FullJourneyMapMobileChrome';
import { useJourneyMapData } from './hooks/useJourneyMapData';
import type { InspectorTab, JourneyActivity, JourneyLayerKind, MemberGroupId } from './types';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePlaceImages } from '@/hooks/usePlaceImages';
import { useWorldModelGuards } from '@/hooks/useWorldModelGuards';
import { guardStructuralEditOrToast, guardItineraryItemStructuralEditOrToast } from '@/lib/world-model-guards';
import { sortItineraryItemsForDisplay } from '@/lib/itinerary-item-sort';
import { itineraryItemsApi } from '@/api/trips';
import type { ItineraryItem, ItineraryItemDetail } from '@/types/trip';
import { getTimezoneByCountry } from '@/utils/timezone';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  buildJourneyMapAssistantPrompt,
  navigateToAssistantDiscuss,
} from '@/lib/assistant-pending-message';
import {
  navigateToPlanStudioSchedule,
  resolveItineraryHighlightIds,
} from '@/lib/plan-studio-schedule-navigation';
import {
  journeyMapContextBar,
  journeyMapPageShell,
  journeyMapStatusBannerInfo,
  journeyMapStatusBannerWarn,
  journeyMapWorkspace,
} from './journey-map-ui';

const DEFAULT_LAYERS = new Set<JourneyLayerKind | 'all'>(['all']);

function resolveInitialDay(modelDayCount: number, dayParam: string | null): number {
  if (modelDayCount <= 0) return 0;
  if (dayParam) {
    const n = Number(dayParam);
    if (Number.isFinite(n)) {
      return Math.max(0, Math.min(modelDayCount - 1, n - 1));
    }
  }
  return 0;
}

function resolveInitialActivity(
  activities: JourneyActivity[],
  preferredDayIndex: number,
): JourneyActivity | null {
  return (
    activities.find((a) => a.dayIndex === preferredDayIndex && a.kind === 'activity') ??
    activities.find((a) => a.dayIndex === preferredDayIndex) ??
    activities.find((a) => a.kind === 'activity') ??
    activities[0] ??
    null
  );
}

export default function FullJourneyMapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  const dayParam = searchParams.get('day');
  const isMobile = useIsMobile();

  const {
    model,
    loading,
    enriching,
    error,
    usingDemo,
    trip,
    itineraryItems,
    inspector,
    reload,
    inspectorReady,
    upsertActivityContext,
    appendDecisionItem,
    applyConstraintsVersion,
  } = useJourneyMapData(tripId);

  const initialDay = useMemo(
    () => resolveInitialDay(model.days.length, dayParam),
    [model.days.length, dayParam],
  );

  const [selectedDayIndex, setSelectedDayIndex] = useState(initialDay);
  const [selectedActivity, setSelectedActivity] = useState<JourneyActivity | null>(() =>
    resolveInitialActivity(model.activities, initialDay),
  );
  const [activeLayers, setActiveLayers] = useState(DEFAULT_LAYERS);
  const [memberFilter, setMemberFilter] = useState<MemberGroupId>('all');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('activity');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [modelSynced, setModelSynced] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [replacingItem, setReplacingItem] = useState<{ id: string; placeName?: string } | null>(
    null,
  );
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    id: string;
    tripDayId: string;
    placeName: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { worldModelGuards, canEditTiming, canEditStructure, lockedSegmentIds } =
    useWorldModelGuards();

  const timezone = useMemo(
    () => getTimezoneByCountry(trip?.destination || ''),
    [trip?.destination],
  );

  const handleOpenEditItem = useCallback(
    (item: ItineraryItemDetail) => {
      if (!tripId || usingDemo) {
        toast.info('演示模式下无法编辑行程项');
        return;
      }
      if (!canEditTiming) {
        toast.error(worldModelGuards?.banner_message_zh ?? '当前阶段不可编辑行程时间');
        return;
      }
      setEditingItem(item);
      setEditDialogOpen(true);
    },
    [tripId, usingDemo, canEditTiming, worldModelGuards],
  );

  const handleOpenReplaceItem = useCallback(
    (item: ItineraryItemDetail) => {
      if (!tripId || usingDemo) {
        toast.info('演示模式下无法替换地点');
        return;
      }
      if (!canEditStructure) {
        guardStructuralEditOrToast(worldModelGuards);
        return;
      }
      const placeName =
        item.Place?.nameCN?.trim() ||
        item.Place?.nameEN?.trim() ||
        selectedActivity?.title;
      setReplacingItem({ id: item.id, placeName });
      setReplaceDialogOpen(true);
    },
    [tripId, usingDemo, canEditStructure, worldModelGuards, selectedActivity?.title],
  );

  const handleItineraryEditSuccess = useCallback(async () => {
    reload();
  }, [reload]);

  const guardDeleteItem = useCallback(
    (item: ItineraryItemDetail) => {
      const tripDayId = item.tripDayId ?? item.TripDay?.id;
      const dayItems = sortItineraryItemsForDisplay(
        itineraryItems.filter((entry) => (entry.tripDayId ?? entry.TripDay?.id) === tripDayId),
      );
      const idx = dayItems.findIndex((entry) => entry.id === item.id);
      if (idx < 0) return guardStructuralEditOrToast(worldModelGuards);
      return guardItineraryItemStructuralEditOrToast(
        worldModelGuards,
        lockedSegmentIds,
        dayItems[idx],
        idx > 0 ? dayItems[idx - 1].id : undefined,
      );
    },
    [itineraryItems, worldModelGuards, lockedSegmentIds],
  );

  const handleOpenDeleteItem = useCallback(
    (item: ItineraryItemDetail) => {
      if (!tripId || usingDemo) {
        toast.info('演示模式下无法删除行程项');
        return;
      }
      if (!guardDeleteItem(item)) return;
      const placeName =
        item.Place?.nameCN?.trim() ||
        item.Place?.nameEN?.trim() ||
        selectedActivity?.title ||
        '行程项';
      setDeletingItem({
        id: item.id,
        tripDayId: item.tripDayId ?? item.TripDay?.id ?? '',
        placeName,
      });
      setDeleteDialogOpen(true);
    },
    [tripId, usingDemo, guardDeleteItem, selectedActivity?.title],
  );

  const confirmDeleteItem = useCallback(async () => {
    if (!deletingItem) return;
    const item = itineraryItems.find((entry) => entry.id === deletingItem.id);
    if (item) {
      if (!guardDeleteItem(item)) return;
    } else if (!guardStructuralEditOrToast(worldModelGuards)) {
      return;
    }

    const itemToDelete = deletingItem;

    try {
      await itineraryItemsApi.delete(itemToDelete.id);
      toast.success(`已删除「${itemToDelete.placeName}」`);
      setDeleteDialogOpen(false);
      setDeletingItem(null);

      if (
        selectedActivity &&
        (selectedActivity.id === `item-${itemToDelete.id}` ||
          selectedActivity.id === itemToDelete.id)
      ) {
        setSelectedActivity(null);
      }

      reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '删除失败';
      toast.error(message);
    }
  }, [deletingItem, guardDeleteItem, itineraryItems, worldModelGuards, selectedActivity, reload]);

  useEffect(() => {
    if (loading || modelSynced) return;
    const day = resolveInitialDay(model.days.length, dayParam);
    setSelectedDayIndex(day);
    setSelectedActivity(resolveInitialActivity(model.activities, day));
    setModelSynced(true);
  }, [loading, model, dayParam, modelSynced]);

  useEffect(() => {
    setModelSynced(false);
  }, [tripId, model.id]);

  const handleSelectDay = useCallback(
    (dayIndex: number) => {
      setSelectedDayIndex(dayIndex);
      const dayActivities = model.activities.filter((a) => a.dayIndex === dayIndex);
      const primary =
        dayActivities.find((a) => a.kind === 'activity') ?? dayActivities[0] ?? null;
      if (primary) {
        setSelectedActivity(primary);
        setInspectorTab('activity');
      }
      setLiveAnnouncement(`已切换至第 ${dayIndex + 1} 天，${model.days.find((d) => d.dayIndex === dayIndex)?.routeLabel ?? ''}`);
      if (isMobile) setMobileLeftOpen(false);
    },
    [model.activities, model.days, isMobile],
  );

  const handleSelectActivity = useCallback(
    (activity: JourneyActivity) => {
      setSelectedActivity(activity);
      setSelectedDayIndex(activity.dayIndex);
      if (activity.kind === 'risk') {
        setInspectorTab('risk');
      } else if (activity.kind === 'diversion') {
        setInspectorTab('diversion');
      } else {
        setInspectorTab('activity');
      }
      setLiveAnnouncement(`已选中：${activity.title}`);
      if (isMobile) setMobileRightOpen(true);
    },
    [isMobile],
  );

  const handleToggleLayer = useCallback((layer: JourneyLayerKind | 'all') => {
    setActiveLayers((prev) => {
      if (layer === 'all') return new Set(['all']);
      const next = new Set(prev);
      next.delete('all');
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      if (next.size === 0) return new Set(['all']);
      return next;
    });
  }, []);

  const handleDiscussWithNara = useCallback(() => {
    if (!tripId) {
      toast.info('请先关联行程后再与 Nara 讨论');
      return;
    }
    const prompt = selectedActivity
      ? buildJourneyMapAssistantPrompt(selectedActivity)
      : `关于 Day ${selectedDayIndex + 1} 的全程地图：请分析当日路线风险、活动安排与优化建议。`;
    navigateToAssistantDiscuss(navigate, tripId, prompt);
  }, [tripId, selectedActivity, selectedDayIndex, navigate]);

  const handleJumpToTimeline = useCallback(
    (dayIndex?: number) => {
      if (!tripId) {
        toast.info('演示模式下无法跳转时间轴');
        return;
      }
      const idx = dayIndex ?? selectedDayIndex;
      navigateToPlanStudioSchedule(navigate, tripId, {
        dayIndex: idx,
        highlightItemIds: selectedActivity
          ? resolveItineraryHighlightIds(selectedActivity)
          : undefined,
      });
    },
    [tripId, selectedDayIndex, selectedActivity, navigate],
  );

  const handleJoinTimeline = useCallback(() => {
    handleJumpToTimeline(selectedActivity?.dayIndex ?? selectedDayIndex);
  }, [handleJumpToTimeline, selectedActivity, selectedDayIndex]);

  const selectedActivityId = selectedActivity?.id ?? null;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' && selectedDayIndex > 0) {
        e.preventDefault();
        handleSelectDay(selectedDayIndex - 1);
      } else if (e.key === 'ArrowRight' && selectedDayIndex < model.days.length - 1) {
        e.preventDefault();
        handleSelectDay(selectedDayIndex + 1);
      } else if (e.key === 'Escape') {
        setSelectedActivity(null);
        if (isMobile) setMobileRightOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedDayIndex, model.days.length, handleSelectDay, isMobile]);

  const selectedDay = useMemo(
    () => model.days.find((d) => d.dayIndex === selectedDayIndex),
    [model.days, selectedDayIndex],
  );

  const dayHint = selectedDay?.routeLabel;

  const itineraryPlaceIdsKey = useMemo(() => {
    const ids = new Set<number>();
    for (const item of itineraryItems) {
      if (item.Place?.id) ids.add(item.Place.id);
    }
    return Array.from(ids).sort((a, b) => a - b).join(',');
  }, [itineraryItems]);

  const itineraryPlaces = useMemo(() => {
    const seen = new Set<number>();
    const places: Array<{ id: number; nameCN?: string; nameEN?: string | null; category?: string }> =
      [];
    for (const item of itineraryItems) {
      const place = item.Place;
      if (!place?.id || seen.has(place.id)) continue;
      seen.add(place.id);
      places.push({
        id: place.id,
        nameCN: place.nameCN,
        nameEN: place.nameEN,
        category: place.category,
      });
    }
    return places;
  }, [itineraryPlaceIdsKey, itineraryItems]);

  const { images: placeImagesMap } = usePlaceImages(itineraryPlaces, {
    enabled: Boolean(tripId) && !usingDemo,
    country: trip?.destination,
  });

  const mapContextLabel = useMemo(() => {
    if (!selectedDay) return null;
    const parts = [`Day ${selectedDayIndex + 1}`];
    if (selectedDay.theme) parts.push(selectedDay.theme);
    const dateMatch = selectedDay.label.match(/·\s*(.+)$/);
    if (dateMatch?.[1]) parts.push(dateMatch[1]);
    else if (dayHint) parts.push(dayHint);
    return parts.join(' · ');
  }, [selectedDay, selectedDayIndex, dayHint]);

  const leftPanelProps = {
    model,
    selectedDayIndex,
    onSelectDay: handleSelectDay,
    activeLayers,
    onToggleLayer: handleToggleLayer,
    memberFilter,
    onMemberFilterChange: setMemberFilter,
    collapsed: leftCollapsed,
    onToggleCollapse: () => setLeftCollapsed((v) => !v),
    lastRefreshedAt: inspector.coverage?.calculatedAt,
    enriching,
    onReload: tripId ? reload : undefined,
  };

  const inspectorProps = {
    model,
    inspector,
    usingDemo,
    trip,
    tripId,
    enriching,
    inspectorReady,
    itineraryItems,
    placeImagesMap,
    selectedDayIndex,
    selectedActivity,
    activeTab: inspectorTab,
    onTabChange: setInspectorTab,
    collapsed: rightCollapsed,
    onToggleCollapse: () => setRightCollapsed((v) => !v),
    onDiscussWithNara: handleDiscussWithNara,
    onJumpToTimeline: tripId ? handleJumpToTimeline : undefined,
    onJoinTimeline: tripId ? handleJoinTimeline : undefined,
    onUpsertActivityContext: upsertActivityContext,
    onAppendDecisionItem: appendDecisionItem,
    onApplyConstraintsVersion: applyConstraintsVersion,
    onRefresh: reload,
    onEditItineraryItem: tripId && !usingDemo ? handleOpenEditItem : undefined,
    onReplaceItineraryItem: tripId && !usingDemo ? handleOpenReplaceItem : undefined,
    onDeleteItineraryItem: tripId && !usingDemo ? handleOpenDeleteItem : undefined,
  };

  if (loading && tripId) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3">
        <LogoLoading size={48} />
        <p className="text-sm text-muted-foreground">加载全程地图…</p>
      </div>
    );
  }

  return (
    <div className={journeyMapPageShell}>
      <FullJourneyMapHeader
        tripTitle={model.tripTitle}
        subtitle={model.tripSubtitle}
        feasibilityScore={model.feasibilityScore}
        tripId={tripId}
        onDiscussWithNara={handleDiscussWithNara}
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {(error || usingDemo || enriching) && (
        <div
          className={cn(
            error ? journeyMapStatusBannerWarn : journeyMapStatusBannerInfo,
          )}
          role="status"
        >
          <div className="flex min-w-0 items-center gap-2">
            {error ? <AlertCircle className="h-3.5 w-3.5 shrink-0" /> : null}
            <span className="truncate">
              {error ??
                (enriching && tripId
                  ? '地图已就绪，正在加载证据与风险详情…'
                  : tripId
                    ? '部分地图数据尚未就绪，当前混合展示示例标注'
                    : '演示模式 · 冰岛南岸示例行程')}
            </span>
          </div>
          {tripId ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-[11px]"
              onClick={reload}
            >
              <RefreshCw className="h-3 w-3" />
              刷新
            </Button>
          ) : null}
        </div>
      )}

      <div className={journeyMapWorkspace}>
        {!isMobile ? <FullJourneyMapLeftPanel {...leftPanelProps} /> : null}

        <main className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col" aria-label="全程地图主视图">
          <FullJourneyMapCanvas
            model={model}
            selectedDayIndex={selectedDayIndex}
            selectedActivityId={selectedActivityId}
            activeLayers={activeLayers}
            memberFilter={memberFilter}
            onSelectActivity={handleSelectActivity}
            className="min-h-0 flex-1"
          />

          {mapContextLabel ? (
            <div className={journeyMapContextBar}>{mapContextLabel}</div>
          ) : null}

          {isMobile ? (
            <FullJourneyMapMobileChrome
              leftOpen={mobileLeftOpen}
              rightOpen={mobileRightOpen}
              onLeftOpenChange={setMobileLeftOpen}
              onRightOpenChange={setMobileRightOpen}
              hasSelection={Boolean(selectedActivity)}
              leftPanel={<FullJourneyMapLeftPanel {...leftPanelProps} embedded />}
              rightPanel={<FullJourneyMapInspector {...inspectorProps} embedded />}
            />
          ) : null}
        </main>

        {!isMobile ? <FullJourneyMapInspector {...inspectorProps} /> : null}
      </div>

      {editingItem ? (
        <EditItineraryItemDialog
          item={editingItem}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
          onSuccess={() => void handleItineraryEditSuccess()}
          timezone={timezone}
          tripDays={trip?.TripDay?.map((d) => ({ id: d.id, date: d.date })) ?? []}
          currentTripDayId={editingItem.tripDayId}
        />
      ) : null}

      {tripId && replacingItem ? (
        <ReplaceItineraryItemDialog
          tripId={tripId}
          itemId={replacingItem.id}
          placeName={replacingItem.placeName}
          open={replaceDialogOpen}
          onOpenChange={(open) => {
            setReplaceDialogOpen(open);
            if (!open) setReplacingItem(null);
          }}
          onSuccess={() => void handleItineraryEditSuccess()}
        />
      ) : null}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem
                ? `确定要删除「${deletingItem.placeName}」吗？此操作不可撤销。`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingItem(null);
              }}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeleteItem()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
