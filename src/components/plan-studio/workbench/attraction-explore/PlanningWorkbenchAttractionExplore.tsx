import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { arrangeItineraryApi } from '@/api/arrange-itinerary';
import type { AttractionExploreItem, AttractionExploreMapPoint } from '@/types/attraction-explore';
import { ArrangeItineraryProposalDialog } from '../arrange-itinerary/ArrangeItineraryProposalDialog';
import { AttractionExploreCompiledIntentBar } from './AttractionExploreCompiledIntentBar';
import { AttractionExploreMapPlaceSuggestionsDialog } from './AttractionExploreMapPlaceSuggestionsDialog';
import { AttractionExploreCandidatesPanel } from './AttractionExploreCandidatesPanel';
import { AttractionExploreFiltersPanel } from './AttractionExploreFiltersPanel';
import { AttractionExploreRecommendPanel } from './AttractionExploreRecommendPanel';
import { AttractionExploreSearchBar } from './AttractionExploreSearchBar';
import { useAttractionExplore } from './useAttractionExplore';
import { workbenchAttractionExploreColumnSurface, workbenchScrollable } from '../workbench-ui';
import { useState } from 'react';

export interface PlanningWorkbenchAttractionExploreProps {
  tripId: string;
  onViewMap?: () => void;
  onEditPreferences?: () => void;
  onViewAttractionDetails?: (item: AttractionExploreItem) => void;
  onOpenArrangeItinerary?: (options?: { autoArrange?: boolean }) => void;
  className?: string;
}

/** 规划工作台 · 探索景点（三栏：筛选 | 推荐 | 候选） */
export function PlanningWorkbenchAttractionExplore({
  tripId,
  onViewMap,
  onEditPreferences,
  onViewAttractionDetails,
  onOpenArrangeItinerary,
  className,
}: PlanningWorkbenchAttractionExploreProps) {
  const explore = useAttractionExplore(tripId);
  const [applyPending, setApplyPending] = useState(false);
  const [discardPending, setDiscardPending] = useState(false);

  const handleSearch = () => {
    void explore.compileAndSearch(explore.searchQuery).catch((error) => {
      toast.error(error instanceof Error ? error.message : '搜索失败');
    });
  };

  const handlePlaceMapPoint = async (point: AttractionExploreMapPoint) => {
    try {
      const result = await explore.requestMapPlaceProposal(point);
      if (result.suggestions.length <= 1) {
        toast.message('已生成地图插入草案，请确认后写入');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成插入草案失败');
    }
  };

  const handleApplyMapProposal = async (force = false) => {
    const proposal = explore.activeMapProposal;
    if (!proposal) return;
    setApplyPending(true);
    try {
      await arrangeItineraryApi.applyProposal(tripId, proposal.proposalId, {
        contextVersion: proposal.contextVersion,
        force,
      });
      explore.clearActiveMapProposal();
      explore.invalidateCandidates();
      window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
      toast.success('已应用插入草案');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '应用草案失败');
    } finally {
      setApplyPending(false);
    }
  };

  const handleDiscardMapProposal = async () => {
    const proposal = explore.activeMapProposal;
    if (!proposal) return;
    setDiscardPending(true);
    try {
      await arrangeItineraryApi.discardProposal(tripId, proposal.proposalId);
      explore.clearActiveMapProposal();
      toast.message('已放弃草案');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '放弃草案失败');
    } finally {
      setDiscardPending(false);
    }
  };

  const handleAutoArrange = () => {
    onOpenArrangeItinerary?.({ autoArrange: true });
  };

  const handleConsultAi = async () => {
    try {
      await explore.consultAi(undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI 分析失败');
    }
  };

  const handleRemoveCandidate = async (candidateId: string) => {
    try {
      await explore.handleRemoveFromCandidates(candidateId);
      toast.success('已移出候选');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '移出候选失败');
    }
  };

  const handleRemoveItemFromCandidates = async (item: AttractionExploreItem) => {
    try {
      await explore.handleRemoveItemFromCandidates(item);
      toast.success('已移出候选');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '移出候选失败');
    }
  };

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="shrink-0 space-y-1 border-b border-border/50 px-3 py-1.5 sm:px-4">
        <AttractionExploreSearchBar
          value={explore.searchQuery}
          onChange={explore.setSearchQuery}
          onSearch={handleSearch}
          useLlmIntent={explore.useLlmIntent}
          onUseLlmIntentChange={explore.setUseLlmIntent}
          useLiveRoutes={explore.useLiveRoutes}
          onUseLiveRoutesChange={explore.setUseLiveRoutes}
          liveRoutesAvailable={explore.liveRoutesAvailable}
        />
        <AttractionExploreCompiledIntentBar
          intent={explore.compiledIntent}
          compiling={explore.compileIntentPending || explore.recommendationsLoading}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto xl:grid-cols-[minmax(220px,18%)_minmax(0,1fr)_minmax(260px,24%)] xl:overflow-hidden">
        <aside
          className={cn(
            'min-h-0 xl:max-h-full xl:overflow-y-auto border-b border-border/60 xl:border-b-0 xl:border-r',
            workbenchAttractionExploreColumnSurface,
            workbenchScrollable,
          )}
        >
          <AttractionExploreFiltersPanel
            context={explore.context}
            selectedThemeIds={explore.selectedThemeIds}
            selectedSuitabilityIds={explore.selectedSuitabilityIds}
            onToggleTheme={explore.toggleTheme}
            onToggleSuitability={explore.toggleSuitability}
            onEditPreferences={onEditPreferences}
          />
        </aside>

        <main className={cn('flex min-h-0 h-full flex-col overflow-hidden', workbenchAttractionExploreColumnSurface)}>
          <AttractionExploreRecommendPanel
            className="h-full min-h-0"
            sections={explore.recommendations}
            loading={explore.recommendationsLoading}
            viewTab={explore.viewTab}
            onViewTabChange={explore.setViewTab}
            isInCandidates={explore.isInCandidates}
            addPending={explore.addCandidatePending}
            removePending={explore.removeCandidatePending}
            onAddToCandidates={explore.handleAddToCandidates}
            onRemoveFromCandidates={(item) => void handleRemoveItemFromCandidates(item)}
            onViewDetails={onViewAttractionDetails}
            onViewMap={onViewMap}
            mapPoints={explore.mapPoints}
            mapLoading={explore.mapLoading}
            onPlaceMapPoint={(point) => void handlePlaceMapPoint(point)}
            mapPlacePending={explore.mapPlaceProposalPending}
          />
        </main>

        <aside
          className={cn(
            'flex h-full min-h-0 flex-col overflow-hidden border-t border-border/60 xl:border-l xl:border-t-0',
            workbenchAttractionExploreColumnSurface,
          )}
        >
          <AttractionExploreCandidatesPanel
            className="h-full min-h-0"
            candidates={explore.candidates}
            summary={explore.summary}
            loading={explore.candidatesLoading}
            autoArrangePending={explore.autoArrangePending}
            consultAiPending={explore.consultAiPending}
            consultAiAnswer={explore.consultAiResult?.answer ?? null}
            onAutoArrange={() => void handleAutoArrange()}
            onCompare={() => toast.message('对比所选功能待后端 compare 接口就绪')}
            onViewMap={onViewMap}
            onConsultAi={() => void handleConsultAi()}
            onRemoveCandidate={(candidateId) => void handleRemoveCandidate(candidateId)}
            removePending={explore.removeCandidatePending}
          />
        </aside>
      </div>

      <AttractionExploreMapPlaceSuggestionsDialog
        open={explore.mapPlaceSuggestions != null}
        onOpenChange={(open) => {
          if (!open) explore.clearActiveMapProposal();
        }}
        placeName={explore.mapPlaceSuggestions?.placeName ?? ''}
        suggestions={explore.mapPlaceSuggestions?.suggestions ?? []}
        submitting={explore.mapPlaceProposalPending}
        onSelect={(index) => {
          void explore.selectMapPlaceSuggestion(index).then(() => {
            toast.message('已生成插入草案，请确认后写入');
          }).catch((error) => {
            toast.error(error instanceof Error ? error.message : '生成草案失败');
          });
        }}
      />

      <ArrangeItineraryProposalDialog
        open={explore.activeMapProposal != null && explore.mapPlaceSuggestions == null}
        onOpenChange={(open) => {
          if (!open) explore.clearActiveMapProposal();
        }}
        proposal={explore.activeMapProposal}
        aiAnswer={explore.mapProposalAnswer}
        applying={applyPending}
        discarding={discardPending}
        onApply={(force) => void handleApplyMapProposal(force)}
        onDiscard={() => void handleDiscardMapProposal()}
      />
    </div>
  );
}
