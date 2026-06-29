import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import TeamTabContent from '@/components/trips/TeamTabContent';
import { useTeam } from '@/hooks/useOptimizationV2';
import { useCollabOverview, type CollabPendingItem } from '@/hooks/useCollabOverview';
import type { CollabCenterTab } from '@/lib/collab-center-tabs';
import { mergeCollabDeepLink, type CollabDeepLinkPatch } from '@/lib/collab-center-navigation';
import { trackCollabPendingClick } from '@/utils/collab-center-analytics';
import { cn } from '@/lib/utils';
import type { TripDetail } from '@/types/trip';
import { collabDashboardGrid, collabDashboardSpan } from './collab-dashboard-layout';
import { MembersRolesWidget } from './widgets/MembersRolesWidget';
import { TeamConsensusWidget } from './widgets/TeamConsensusWidget';
import { PendingItemsWidget } from './widgets/PendingItemsWidget';
import { TeamHealthWidget } from './widgets/TeamHealthWidget';
import { WishSummaryWidget } from './widgets/WishSummaryWidget';
import { VoteSummaryWidget } from './widgets/VoteSummaryWidget';
import { NegotiationSummaryWidget } from './widgets/NegotiationSummaryWidget';
import { TaskPreviewWidget } from './widgets/TaskPreviewWidget';

interface CollabCenterMembersDashboardProps {
  tripId: string;
  teamId: string;
  trip: TripDetail;
  onTripRefetch?: () => void | Promise<void>;
  onGoToSchedule?: () => void;
  className?: string;
}

export function CollabCenterMembersDashboard({
  tripId,
  teamId,
  trip,
  onTripRefetch,
  onGoToSchedule,
  className,
}: CollabCenterMembersDashboardProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const overview = useCollabOverview(tripId);
  const [showManagement, setShowManagement] = useState(false);

  const members = team?.members ?? [];

  const navigateCollabTab = useCallback(
    (tab: CollabCenterTab, patch?: Omit<CollabDeepLinkPatch, 'collabTab'>) => {
      const next = mergeCollabDeepLink(searchParams, { collabTab: tab, ...patch });
      setSearchParams(next);
      window.scrollTo(0, 0);
    },
    [searchParams, setSearchParams],
  );

  const handlePendingItem = useCallback(
    (item: CollabPendingItem) => {
      trackCollabPendingClick({
        tripId,
        itemId: item.id,
        itemType: item.kind,
      });
      if (item.kind === 'task') {
        navigateCollabTab('tasks');
        return;
      }
      if (item.kind === 'vote') {
        navigateCollabTab('decisions', { voteId: item.voteId ?? null });
        return;
      }
      navigateCollabTab('decisions', {
        roundId: item.roundId ?? null,
        roundDomain: item.domain ?? null,
      });
    },
    [navigateCollabTab, tripId],
  );

  if (overview.loading && teamLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        加载协作概览…
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      <div className={collabDashboardGrid}>
        <div className={collabDashboardSpan({ md: 6, lg: 4 })}>
          <MembersRolesWidget members={members} loading={teamLoading} />
        </div>
        <div className={collabDashboardSpan({ md: 6, lg: 4 })}>
          <TeamConsensusWidget
            overall={overview.overallConsensus}
            dimensions={overview.consensusDimensions}
            onDimensionClick={() => navigateCollabTab('decisions')}
          />
        </div>
        <div className={collabDashboardSpan({ md: 6, lg: 4 })}>
          <PendingItemsWidget items={overview.pendingItems} onHandleItem={handlePendingItem} />
        </div>
        <div className={collabDashboardSpan({ md: 3, lg: 3 })}>
          <TeamHealthWidget
            health={overview.teamHealth}
            loading={overview.loading}
          />
        </div>
        <div className={collabDashboardSpan({ md: 3, lg: 3 })}>
          <WishSummaryWidget
            summary={overview.wishSummary}
            onViewAll={() => navigateCollabTab('wishes')}
          />
        </div>
        <div className={collabDashboardSpan({ md: 3, lg: 3 })}>
          <VoteSummaryWidget
            votes={overview.votes}
            onViewAll={() => navigateCollabTab('decisions')}
            onFeaturedVoteClick={(voteId) => navigateCollabTab('decisions', { voteId })}
          />
        </div>
        <div className={collabDashboardSpan({ md: 3, lg: 3 })}>
          <NegotiationSummaryWidget
            tasks={overview.negotiationTasks}
            onViewAll={() => navigateCollabTab('decisions')}
          />
        </div>
        <div className={collabDashboardSpan({ md: 6, lg: 12 })}>
          <TaskPreviewWidget
            tasks={overview.flywheelTasks}
            onViewAll={() => navigateCollabTab('tasks')}
          />
        </div>
      </div>

      {showManagement ? (
        <TeamTabContent
          tripId={tripId}
          trip={trip}
          onTripRefetch={onTripRefetch}
          onGoToPlanStudio={onGoToSchedule}
          embedded
        />
      ) : (
        <button
          type="button"
          className="min-h-[44px] text-xs text-primary underline-offset-4 hover:underline"
          onClick={() => setShowManagement(true)}
        >
          展开成员管理与协调
        </button>
      )}
    </div>
  );
}
