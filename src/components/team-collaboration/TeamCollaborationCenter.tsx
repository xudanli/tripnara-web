import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Handshake, UserPlus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { StructuredNegotiationDialog } from '@/components/domain-influence/StructuredNegotiationDialog';
import { cn } from '@/lib/utils';
import {
  COLLAB_CENTER_TABS,
  resolveCollabCenterTab,
  type CollabCenterTab,
} from '@/lib/collab-center-tabs';
import { mergeCollabDeepLink } from '@/lib/collab-center-navigation';
import { resolveTravelerCount } from '@/lib/planning-constraints.util';
import {
  trackCollabNegotiationStart,
  trackCollabTabSwitch,
} from '@/utils/collab-center-analytics';
import type { TripDetail } from '@/types/trip';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';
import type { DecisionProfilingSurface } from '@/lib/decision-profiling-navigation';
import { CollabCenterMembersTab } from './tabs/CollabCenterMembersTab';
import { CollabCenterDecisionsTab } from './tabs/CollabCenterDecisionsTab';
import { CollabCenterPersonaTab } from './tabs/CollabCenterPersonaTab';
import { CollabCenterWishesTab } from './tabs/CollabCenterWishesTab';
import { CollabCenterTasksTab } from './tabs/CollabCenterTasksTab';

export interface TeamCollaborationCenterProps {
  tripId: string;
  trip: TripDetail | null;
  onTripRefetch?: () => void | Promise<void>;
  onGoToSchedule?: () => void;
  onInviteMembers?: () => void;
  onOpenTeamSettings?: () => void;
  destinationLabel?: string;
  userDisplayName?: string;
  onWishSummaryChange?: () => void;
  decisionProfilingInitialStep?: DecisionProfilingStep | null;
  decisionProfilingForceQuiz?: boolean;
  decisionProfilingForceReuse?: boolean;
  decisionProfilingInitialSurface?: DecisionProfilingSurface | null;
  className?: string;
}

/** 团队协作中心 Shell：页头 + 五 Tab 导航 */
export function TeamCollaborationCenter({
  tripId,
  trip,
  onTripRefetch,
  onGoToSchedule,
  onInviteMembers,
  onOpenTeamSettings,
  destinationLabel,
  userDisplayName,
  onWishSummaryChange,
  decisionProfilingInitialStep,
  decisionProfilingForceQuiz,
  decisionProfilingForceReuse,
  decisionProfilingInitialSurface,
  className,
}: TeamCollaborationCenterProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const collabTab = resolveCollabCenterTab(searchParams.get('collabTab'));
  const [structuredNegotiationOpen, setStructuredNegotiationOpen] = useState(false);
  const negotiationRoundId = searchParams.get('roundId');
  const negotiationRoundDomain = searchParams.get('roundDomain');

  const memberCount = trip ? resolveTravelerCount(trip) : 1;

  const setCollabTab = useCallback(
    (tab: CollabCenterTab) => {
      trackCollabTabSwitch({ tripId, collabTab: tab });
      const next = mergeCollabDeepLink(searchParams, { collabTab: tab });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, tripId],
  );

  const handleNewNegotiation = () => {
    trackCollabNegotiationStart({ tripId });
    setCollabTab('decisions');
    setStructuredNegotiationOpen(true);
  };

  if (!trip) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-0', className)} role="region" aria-label="团队协作中心">
      <Tabs value={collabTab} onValueChange={(v) => setCollabTab(resolveCollabCenterTab(v))}>
        <div className="sticky top-0 z-10 -mx-4 border-b border-border/60 bg-background/95 px-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {onGoToSchedule ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1 px-1.5 text-xs text-muted-foreground"
                  onClick={onGoToSchedule}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="max-sm:sr-only">返回行程</span>
                </Button>
              ) : null}
              <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
                团队协作中心
              </h2>
              <span className="shrink-0 text-xs text-muted-foreground">
                · {memberCount} 位成员
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {onInviteMembers ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  aria-label="邀请成员"
                  onClick={onInviteMembers}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">邀请成员</span>
                </Button>
              ) : null}
              {onOpenTeamSettings ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  aria-label="团队设置"
                  onClick={onOpenTeamSettings}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">团队设置</span>
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={handleNewNegotiation}
              >
                <Handshake className="h-3.5 w-3.5" />
                新建协商
              </Button>
            </div>
          </header>

          <TabsList
            className="h-8 w-full justify-start overflow-x-auto rounded-none border-0 bg-transparent p-0"
            aria-label="协作中心分区"
          >
            {COLLAB_CENTER_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="h-8 shrink-0 rounded-none border-b-2 border-transparent px-2.5 text-xs text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:font-medium data-[state=active]:text-foreground sm:px-3 sm:text-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="members" forceMount className="mt-3 focus-visible:outline-none data-[state=inactive]:hidden">
          <CollabCenterMembersTab
            tripId={tripId}
            trip={trip}
            onTripRefetch={onTripRefetch}
            onGoToSchedule={onGoToSchedule}
          />
        </TabsContent>

        <TabsContent value="decisions" forceMount className="mt-3 focus-visible:outline-none data-[state=inactive]:hidden">
          <CollabCenterDecisionsTab tripId={tripId} />
        </TabsContent>

        <TabsContent value="persona" forceMount className="mt-3 focus-visible:outline-none data-[state=inactive]:hidden">
          <CollabCenterPersonaTab
            tripId={tripId}
            initialStep={decisionProfilingInitialStep}
            forceOpenQuiz={decisionProfilingForceQuiz}
            forceReuseProfile={decisionProfilingForceReuse}
            initialSurface={decisionProfilingInitialSurface}
          />
        </TabsContent>

        <TabsContent value="wishes" forceMount className="mt-3 focus-visible:outline-none data-[state=inactive]:hidden">
          <CollabCenterWishesTab
            tripId={tripId}
            destinationLabel={destinationLabel}
            userDisplayName={userDisplayName}
            onSummaryChange={onWishSummaryChange}
          />
        </TabsContent>

        <TabsContent value="tasks" forceMount className="mt-3 focus-visible:outline-none data-[state=inactive]:hidden">
          <CollabCenterTasksTab tripId={tripId} />
        </TabsContent>
      </Tabs>

      <StructuredNegotiationDialog
        tripId={tripId}
        open={structuredNegotiationOpen}
        onOpenChange={setStructuredNegotiationOpen}
        initialRoundId={negotiationRoundId}
        initialRoundDomain={negotiationRoundDomain}
      />
    </div>
  );
}
