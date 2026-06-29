import { useCallback, useMemo, useState } from 'react';
import { CalendarDays, Loader2, MapPin, MessageSquare, MoreHorizontal, PanelRightClose, PanelRightOpen } from 'lucide-react';
import CoveragePoiInspector from '@/components/plan-studio/CoveragePoiInspector';
import type { PlaceImageInfo } from '@/types/place-image';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import { resolveJourneyMapInspectorSelection } from '../lib/journey-map-inspector-selection';
import {
  buildInspectorActivityHeader,
  buildInspectorDiversionDetail,
  buildInspectorFitAssessment,
  buildInspectorMemberRows,
  buildInspectorRiskView,
} from '../lib/build-inspector-view-model';
import {
  activityIdCandidates,
  mergeActivityWithInspectorDetail,
  resolveActivityTypeLabel,
  resolveInspectorActivityContext,
} from '../lib/resolve-inspector-activity-context';
import { readTripConstraintsVersion } from '../lib/journey-map-trip-meta.util';
import { useInspectorActivityLazyLoad } from '../hooks/useInspectorActivityLazyLoad';
import type { JourneyMapDecisionItem, JourneyMapInspectorActivityContextDto } from '@/api/journey-map';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InspectorTab, JourneyActivity, JourneyMapModel } from '../types';
import type { JourneyMapInspectorBundle } from '../types-inspector';
import { INSPECTOR_TABS } from '../types';
import { JourneyMapActivityDetailPanel, buildActivityDetailPanelProps } from './JourneyMapActivityDetailPanel';
import { JourneyMapParticipantsPanel } from './JourneyMapParticipantsPanel';
import { JourneyMapDiversionDetailPanel } from './JourneyMapDiversionDetailPanel';
import { JourneyMapEvidencePanel } from './JourneyMapEvidencePanel';
import { JourneyMapRiskPanel } from './JourneyMapRiskPanel';
import { JourneyMapEditDiversionDialog } from './JourneyMapEditDiversionDialog';
import { JourneyMapCreateDecisionItemDialog } from './JourneyMapCreateDecisionItemDialog';
import {
  journeyMapFocusRing,
  journeyMapInspectorEmpty,
  journeyMapInspectorEmptyIcon,
  journeyMapPanelCollapsedRail,
  journeyMapPanelShellRight,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchPrimaryAction,
  workbenchTabTriggerCompact,
} from '../journey-map-ui';

export interface FullJourneyMapInspectorProps {
  model: JourneyMapModel;
  inspector: JourneyMapInspectorBundle;
  usingDemo: boolean;
  trip: TripDetail | null;
  tripId: string | null;
  enriching: boolean;
  inspectorReady: boolean;
  itineraryItems: ItineraryItemDetail[];
  placeImagesMap?: Map<number, PlaceImageInfo[]>;
  selectedDayIndex: number;
  selectedActivity: JourneyActivity | null;
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onDiscussWithNara?: () => void;
  onJumpToTimeline?: (dayIndex?: number) => void;
  onJoinTimeline?: () => void;
  onUpsertActivityContext?: (context: JourneyMapInspectorActivityContextDto) => void;
  onAppendDecisionItem?: (item: JourneyMapDecisionItem) => void;
  onApplyConstraintsVersion?: (version: number) => void;
  onRefresh?: () => void;
  onEditItineraryItem?: (item: ItineraryItemDetail) => void;
  onReplaceItineraryItem?: (item: ItineraryItemDetail) => void;
  onDeleteItineraryItem?: (item: ItineraryItemDetail) => void;
  embedded?: boolean;
  className?: string;
}

export function FullJourneyMapInspector({
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
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  onDiscussWithNara,
  onJumpToTimeline,
  onJoinTimeline,
  onUpsertActivityContext,
  onAppendDecisionItem,
  onApplyConstraintsVersion,
  onRefresh,
  onEditItineraryItem,
  onReplaceItineraryItem,
  onDeleteItineraryItem,
  embedded = false,
  className,
}: FullJourneyMapInspectorProps) {
  const [editDiversionOpen, setEditDiversionOpen] = useState(false);
  const [createDecisionOpen, setCreateDecisionOpen] = useState(false);

  const handleContextLoaded = useCallback(
    (context: JourneyMapInspectorActivityContextDto) => {
      onUpsertActivityContext?.(context);
    },
    [onUpsertActivityContext],
  );

  const { lazyLoading, lazyError } = useInspectorActivityLazyLoad({
    tripId,
    usingDemo,
    enriching,
    inspectorReady,
    selectedActivity,
    inspector,
    members: model.members,
    onContextLoaded: handleContextLoaded,
  });

  const constraintsVersion = readTripConstraintsVersion(trip);
  const coverageSelection = useMemo(() => {
    if (usingDemo || !selectedActivity) return null;
    return resolveJourneyMapInspectorSelection(selectedActivity, {
      coverage: inspector.coverage,
      trip,
      itineraryItems,
    });
  }, [usingDemo, selectedActivity, inspector.coverage, trip, itineraryItems]);

  const dayLabel = useMemo(() => {
    const day = model.days[selectedDayIndex];
    return day?.label ?? `Day ${selectedDayIndex + 1}`;
  }, [model.days, selectedDayIndex]);

  const skipDemoEnrichment = Boolean(inspector.activityContexts?.length);

  const bffContext = useMemo(
    () =>
      selectedActivity
        ? resolveInspectorActivityContext(
            selectedActivity,
            inspector.activityContexts,
            model.members,
          )
        : undefined,
    [selectedActivity, inspector.activityContexts, model.members],
  );

  const displayActivity = useMemo(
    () =>
      selectedActivity
        ? mergeActivityWithInspectorDetail(selectedActivity, bffContext)
        : null,
    [selectedActivity, bffContext],
  );

  const activityHeader = useMemo(
    () =>
      displayActivity
        ? buildInspectorActivityHeader(displayActivity, dayLabel)
        : null,
    [displayActivity, dayLabel],
  );

  const memberRows = useMemo(
    () =>
      displayActivity
        ? buildInspectorMemberRows(displayActivity, model.members, bffContext, {
            skipDemoEnrichment,
          })
        : [],
    [displayActivity, model.members, bffContext, skipDemoEnrichment],
  );

  const fitAssessment = useMemo(
    () =>
      displayActivity
        ? buildInspectorFitAssessment(displayActivity, memberRows, bffContext, {
            skipDemoEnrichment,
          })
        : null,
    [displayActivity, memberRows, bffContext, skipDemoEnrichment],
  );

  const diversion = useMemo(() => {
    if (!selectedActivity) return null;
    return (
      model.diversions.find(
        (d) =>
          d.dayIndex === selectedActivity.dayIndex &&
          (d.groupA.activityId === selectedActivity.id ||
            d.groupB.activityId === selectedActivity.id),
      ) ?? model.diversions.find((d) => d.dayIndex === selectedActivity.dayIndex)
    );
  }, [selectedActivity, model.diversions]);

  const diversionDetail = useMemo(
    () =>
      diversion
        ? buildInspectorDiversionDetail(diversion, model, bffContext, { skipDemoEnrichment })
        : null,
    [diversion, model, bffContext, skipDemoEnrichment],
  );

  const riskView = useMemo(
    () =>
      displayActivity
        ? buildInspectorRiskView({
            activity: displayActivity,
            model,
            inspector,
            dayIndex: selectedDayIndex,
            bff: bffContext,
            skipDemoEnrichment,
          })
        : null,
    [displayActivity, model, inspector, selectedDayIndex, bffContext, skipDemoEnrichment],
  );

  const activityTypeLabel = useMemo(
    () =>
      displayActivity ? resolveActivityTypeLabel(displayActivity, bffContext) : undefined,
    [displayActivity, bffContext],
  );

  const activityDecisionItems = useMemo(() => {
    if (!selectedActivity || !inspector.decisionItems?.length) return [];
    const ids = new Set(activityIdCandidates(selectedActivity));
    return inspector.decisionItems.filter((item) => ids.has(item.activityId));
  }, [selectedActivity, inspector.decisionItems]);

  const evidenceConclusion = bffContext?.evidenceConclusion;

  const activityDetailProps = useMemo(() => {
    if (!displayActivity || !activityHeader) return null;
    const baseProps = buildActivityDetailPanelProps({
      activity: displayActivity,
      header: activityHeader,
      activityTypeLabel,
      itineraryItems,
      selectionItem: coverageSelection?.kind === 'poi' ? coverageSelection.item : null,
      coveragePoi: coverageSelection?.kind === 'poi' ? coverageSelection.poi : null,
      trip,
    });
    const placeId = baseProps.itineraryItem?.Place?.id;
    const props = {
      ...baseProps,
      placeImages: placeId ? placeImagesMap?.get(placeId) : undefined,
    };
    if (onEditItineraryItem) props.onEditItem = onEditItineraryItem;
    if (onReplaceItineraryItem) props.onReplaceItem = onReplaceItineraryItem;
    if (onDeleteItineraryItem) props.onDeleteItem = onDeleteItineraryItem;
    return props;
  }, [
    displayActivity,
    activityHeader,
    activityTypeLabel,
    itineraryItems,
    coverageSelection,
    trip,
    placeImagesMap,
    onEditItineraryItem,
    onReplaceItineraryItem,
    onDeleteItineraryItem,
  ]);

  const linkedItineraryItem = activityDetailProps?.itineraryItem ?? null;

  if (!embedded && collapsed) {
    return (
      <div className={cn(journeyMapPanelCollapsedRail, 'border-l', className)}>
        <Button
          variant="ghost"
          size="icon"
          className={cn('mx-auto mt-2 h-9 w-9', journeyMapFocusRing)}
          onClick={onToggleCollapse}
          aria-label="展开检查器"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        embedded ? 'h-full w-full bg-card' : journeyMapPanelShellRight,
        className,
      )}
    >
      <div className={cn(workbenchPanelHeader, 'flex items-center justify-between')}>
        <div>
          <h2 className={workbenchPanelTitle}>全程地图检查器</h2>
          <p className="text-[10px] text-muted-foreground">活动 · 参与人 · 分流 · 证据 · 风险</p>
        </div>
        {!embedded ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-9 w-9 shrink-0', journeyMapFocusRing)}
            onClick={onToggleCollapse}
            aria-label="收起检查器"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {!selectedActivity || !activityHeader ? (
        <div className={journeyMapInspectorEmpty}>
          <MapPin className={journeyMapInspectorEmptyIcon} aria-hidden />
          <div>
            <p className="text-sm font-medium text-foreground">选择地图标记以查看详情</p>
            <p className="mx-auto mt-1 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
              点击地图上的活动、住宿或风险点；或在左侧切换天数浏览当日安排
            </p>
          </div>
          {onJumpToTimeline ? (
            <div className="flex w-full max-w-[240px] flex-col gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                className={cn('h-10 w-full gap-2', journeyMapFocusRing)}
                onClick={() => onJumpToTimeline(selectedDayIndex)}
              >
                <CalendarDays className="h-4 w-4" aria-hidden />
                打开第 {selectedDayIndex + 1} 天时间轴
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => onTabChange(v as InspectorTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <ScrollArea className="shrink-0 border-b border-border/50">
            <TabsList className="mx-3 my-2 h-auto w-max min-w-full justify-start gap-0.5 bg-transparent p-0">
              {INSPECTOR_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className={workbenchTabTriggerCompact}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          {(lazyLoading || lazyError) && (
            <div className="border-b border-border/50 px-3 py-2 text-[10px] text-muted-foreground">
              {lazyLoading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  正在加载活动检查器详情…
                </span>
              ) : (
                lazyError
              )}
            </div>
          )}

          <ScrollArea className="flex-1">
            <TabsContent value="activity" className="mt-0 p-0">
              {coverageSelection?.kind === 'gap' && !usingDemo ? (
                <CoveragePoiInspector
                  selection={coverageSelection}
                  onEditItem={onEditItineraryItem}
                  onReplaceItem={onReplaceItineraryItem}
                  onJumpToScheduleDay={onJumpToTimeline}
                  className="border-0 shadow-none"
                />
              ) : activityDetailProps ? (
                <JourneyMapActivityDetailPanel {...activityDetailProps} />
              ) : null}
            </TabsContent>

            <TabsContent value="participants" className="mt-0 p-0">
              <JourneyMapParticipantsPanel
                header={activityHeader}
                memberRows={memberRows}
                fitAssessment={fitAssessment}
              />
            </TabsContent>

            <TabsContent value="diversion" className="mt-0 p-0">
              {diversionDetail ? (
                <JourneyMapDiversionDetailPanel
                  header={activityHeader}
                  detail={diversionDetail}
                  canEdit={Boolean(tripId && !usingDemo && diversion)}
                  onEdit={() => setEditDiversionOpen(true)}
                />
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  此活动无分流安排
                </div>
              )}
            </TabsContent>

            <TabsContent value="evidence" className="mt-0 p-0">
              {displayActivity && activityHeader ? (
                <JourneyMapEvidencePanel
                  inspector={inspector}
                  model={model}
                  activity={displayActivity}
                  dayIndex={selectedDayIndex}
                  header={activityHeader}
                  usingDemo={usingDemo}
                  bffContext={bffContext}
                  skipDemoEnrichment={skipDemoEnrichment}
                />
              ) : null}
            </TabsContent>

            <TabsContent value="risk" className="mt-0 p-0">
              {riskView ? (
                <JourneyMapRiskPanel
                  header={activityHeader}
                  riskView={riskView}
                  decisionItems={activityDecisionItems}
                  canCreateDecision={Boolean(tripId && !usingDemo)}
                  onCreateDecision={() => setCreateDecisionOpen(true)}
                />
              ) : null}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      )}

      {tripId && diversion && diversionDetail ? (
        <JourneyMapEditDiversionDialog
          open={editDiversionOpen}
          onOpenChange={setEditDiversionOpen}
          tripId={tripId}
          diversion={diversion}
          detail={diversionDetail}
          constraintsVersion={constraintsVersion}
          onSaved={onRefresh}
        />
      ) : null}

      {tripId && displayActivity && riskView ? (
        <JourneyMapCreateDecisionItemDialog
          open={createDecisionOpen}
          onOpenChange={setCreateDecisionOpen}
          tripId={tripId}
          activity={displayActivity}
          riskView={riskView}
          evidenceConclusion={evidenceConclusion}
          constraintsVersion={constraintsVersion}
          onCreated={(item, nextVersion) => {
            onAppendDecisionItem?.(item);
            if (nextVersion != null) onApplyConstraintsVersion?.(nextVersion);
          }}
        />
      ) : null}

      <div className="shrink-0 space-y-2 border-t border-border/60 p-3">
        <div className="flex gap-2">
          <Button
            className={cn('h-10 flex-1 gap-2', workbenchPrimaryAction, journeyMapFocusRing)}
            onClick={onDiscussWithNara}
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
            与 Nara 讨论
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn('h-10 w-10 shrink-0', journeyMapFocusRing)}
                aria-label="更多操作"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {linkedItineraryItem && onEditItineraryItem ? (
                <DropdownMenuItem onClick={() => onEditItineraryItem(linkedItineraryItem)}>
                  编辑行程项
                </DropdownMenuItem>
              ) : null}
              {linkedItineraryItem && onReplaceItineraryItem ? (
                <DropdownMenuItem onClick={() => onReplaceItineraryItem(linkedItineraryItem)}>
                  替换地点
                </DropdownMenuItem>
              ) : null}
              {linkedItineraryItem && onDeleteItineraryItem ? (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeleteItineraryItem(linkedItineraryItem)}
                >
                  删除行程项
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => onTabChange('activity')}>
                查看活动详情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('diversion')}>
                查看分流方案
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('participants')}>
                切换参与人视角
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onJoinTimeline}>加入时间轴</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
