import { useMemo } from 'react';
import { Compass, GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TeamRequirementProfilePanel } from '@/features/member-onboarding';
import { isAdvisorLedTrip } from '@/lib/trip-collaboration-mode.util';
import type { Collaborator, TripDetail } from '@/types/trip';
import type { AttractionExploreCandidate } from '@/types/attraction-explore';
import { ArrangeItineraryItemLocksPanel } from './ArrangeItineraryItemLocksPanel';
import { ArrangeItineraryCopilotSuggestionsPanel } from './ArrangeItineraryCopilotSuggestionsPanel';
import { PlanningDecisionClusterQueueStrip } from './PlanningDecisionClusterQueueStrip';
import type { PlanningDecisionClusterSummary } from '@/dto/frontend-planning-decision-pack.types';
import type { ArrangeLodgingCoverageSummary } from '@/lib/arrange-itinerary-lodging-coverage.util';
import { ArrangeItineraryLodgingSection } from './ArrangeItineraryLodgingSection';
import { ArrangeItineraryLodgingSuggestionsPanel } from './ArrangeItineraryLodgingSuggestionsPanel';
import {
  workbenchAttractionExploreCandidateItem,
  workbenchAttractionExploreSectionTitle,
  workbenchLinkClass,
  workbenchPanelTitle,
  workbenchScrollable,
} from '../workbench-ui';

export interface ArrangeItineraryContextPanelProps {
  tripId: string;
  trip?: TripDetail | null;
  collaborators?: Collaborator[] | null;
  candidates: AttractionExploreCandidate[];
  onRemoveCandidate?: (candidateId: string) => void;
  onPlaceCandidate?: (candidateId: string) => void;
  placePending?: boolean;
  removePending?: boolean;
  onEditPreferences?: () => void;
  itemLocks?: import('@/types/arrange-itinerary').ArrangeItemLocksResponse | null;
  itemLocksLoading?: boolean;
  userLockedItemIds?: Set<string>;
  copilotSuggestions?: import('@/types/arrange-itinerary').CopilotSuggestion[];
  copilotSuggestionsLoading?: boolean;
  copilotActionPending?: boolean;
  onExecuteCopilotSuggestion?: (suggestion: import('@/types/arrange-itinerary').CopilotSuggestion) => void;
  decisionClusters?: PlanningDecisionClusterSummary[];
  activeProposalId?: string | null;
  onOpenActiveProposal?: () => void;
  decisionClustersLoading?: boolean;
  lodgingSummary?: ArrangeLodgingCoverageSummary;
  onAddLodging?: (dayIndex: number) => void;
  onEditLodging?: (itemId: string) => void;
  lodgingSuggestionsBundle?: import('@/types/arrange-itinerary').ArrangeLodgingSuggestionsBundle;
  onAdoptLodgingCandidate?: (
    dayIndex: number,
    candidate: import('@/types/arrange-itinerary').ArrangeLodgingSuggestionCandidate,
    night: import('@/types/arrange-itinerary').ArrangeLodgingSuggestion,
  ) => void;
  onAskNaraForLodgingNight?: (dayIndex: number) => void;
  adoptLodgingPending?: boolean;
  onOpenAttractionExplore?: () => void;
  className?: string;
}

function hasLodgingSuggestionCandidates(
  bundle?: import('@/types/arrange-itinerary').ArrangeLodgingSuggestionsBundle,
): boolean {
  return (
    bundle?.suggestions.some(
      (night) => night.status === 'suggested' && night.candidates.length > 0,
    ) ?? false
  );
}

export function ArrangeItineraryContextPanel({
  tripId,
  trip,
  collaborators,
  candidates,
  candidatesLoading = false,
  onRemoveCandidate,
  onPlaceCandidate,
  placePending = false,
  removePending = false,
  itemLocks,
  itemLocksLoading = false,
  userLockedItemIds,
  copilotSuggestions = [],
  copilotSuggestionsLoading = false,
  copilotActionPending = false,
  onExecuteCopilotSuggestion,
  decisionClusters = [],
  activeProposalId,
  onOpenActiveProposal,
  decisionClustersLoading = false,
  lodgingSummary,
  onAddLodging,
  onEditLodging,
  lodgingSuggestionsBundle,
  onAdoptLodgingCandidate,
  onAskNaraForLodgingNight,
  adoptLodgingPending = false,
  onEditPreferences,
  onOpenAttractionExplore,
  className,
}: ArrangeItineraryContextPanelProps) {
  const advisorLed = useMemo(() => isAdvisorLedTrip(trip), [trip]);
  const profileCollaborators = useMemo(
    () =>
      collaborators?.map((c) => ({
        userId: c.userId,
        displayName: c.displayName,
        role: c.role,
      })) ?? [],
    [collaborators],
  );
  const showLodgingSuggestions = hasLodgingSuggestionCandidates(lodgingSuggestionsBundle);

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="shrink-0 border-b border-border/50 px-3 py-1.5">
        <h2 className={workbenchPanelTitle}>行程配置</h2>
      </div>

      <div className={cn('min-h-0 flex-1 space-y-4 overflow-y-auto p-3', workbenchScrollable)}>
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={workbenchAttractionExploreSectionTitle}>待编排景点</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {candidates.length} 个
              </span>
              {onOpenAttractionExplore ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 rounded-md px-1.5 text-[10px]"
                  onClick={onOpenAttractionExplore}
                >
                  <Compass className="h-3 w-3" />
                  探索更多
                </Button>
              ) : null}
            </div>
          </div>
          {candidatesLoading ? (
            <p className="py-4 text-center text-[11px] text-muted-foreground">加载中…</p>
          ) : candidates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center">
              <p className="text-[11px] text-muted-foreground">
                暂无待编排候选，可先在探索景点中添加
              </p>
              {onOpenAttractionExplore ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 gap-1 rounded-md px-2 text-[10px]"
                  onClick={onOpenAttractionExplore}
                >
                  <Compass className="h-3 w-3" />
                  去探索景点
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-1">
              {candidates.map((candidate) => (
                <li key={candidate.id} className={workbenchAttractionExploreCandidateItem}>
                  <GripVertical
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                    aria-hidden
                  />
                  {candidate.imageUrl ? (
                    <img
                      src={candidate.imageUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/30 text-[10px] text-muted-foreground">
                      POI
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-foreground">
                      {candidate.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {candidate.priority === 'must_go' ? '必去' : '候选'}
                    </p>
                  </div>
                  {onPlaceCandidate ? (
                    <button
                      type="button"
                      className={cn(workbenchLinkClass, 'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] hover:bg-muted disabled:opacity-50')}
                      disabled={placePending}
                      onClick={() => onPlaceCandidate(candidate.id)}
                    >
                      排入
                    </button>
                  ) : null}
                  {onRemoveCandidate ? (
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                      aria-label={`移出 ${candidate.name}`}
                      disabled={removePending}
                      onClick={() => onRemoveCandidate(candidate.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {showLodgingSuggestions && lodgingSuggestionsBundle ? (
          <ArrangeItineraryLodgingSuggestionsPanel
            bundle={lodgingSuggestionsBundle}
            onAdoptCandidate={onAdoptLodgingCandidate}
            onAskNaraForNight={onAskNaraForLodgingNight}
            adoptPending={adoptLodgingPending}
          />
        ) : lodgingSummary && onAddLodging ? (
          <ArrangeItineraryLodgingSection
            summary={lodgingSummary}
            onAddLodging={onAddLodging}
            onEditLodging={onEditLodging}
            compact
          />
        ) : null}

        <PlanningDecisionClusterQueueStrip
          clusters={decisionClusters}
          activeProposalId={activeProposalId}
          loading={decisionClustersLoading}
          onOpenActiveProposal={onOpenActiveProposal}
        />
        <ArrangeItineraryCopilotSuggestionsPanel
          suggestions={copilotSuggestions}
          loading={copilotSuggestionsLoading}
          actionPending={copilotActionPending}
          onExecuteSuggestion={onExecuteCopilotSuggestion}
        />

        <ArrangeItineraryItemLocksPanel
          itemLocks={itemLocks}
          userLockedItemIds={userLockedItemIds}
          loading={itemLocksLoading}
        />

        <TeamRequirementProfilePanel
          tripId={tripId}
          collaborators={profileCollaborators}
          compact
          sidebar
          includeFriction={!advisorLed}
          className="border-border/70 shadow-none"
        />
        {onEditPreferences ? (
          <button
            type="button"
            className={cn(workbenchLinkClass, 'text-[10px]')}
            onClick={onEditPreferences}
          >
            查看完整团队与需求 →
          </button>
        ) : null}
      </div>
    </div>
  );
}
