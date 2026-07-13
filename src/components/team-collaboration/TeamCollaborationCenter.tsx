import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Handshake,
  Plus,
  UserPlus,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { StructuredNegotiationDialog } from '@/components/domain-influence/StructuredNegotiationDialog';
import { cn } from '@/lib/utils';
import { type CollabCenterTab } from '@/lib/collab-center-tabs';
import { mergeCollabDeepLink } from '@/lib/collab-center-navigation';
import {
  isAdvisorLedTrip,
  resolveCollabCenterTabForTrip,
  resolveCollabCenterTabsForTrip,
} from '@/lib/trip-collaboration-mode.util';
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
import { CollabCenterRoleInvitesTab } from './tabs/CollabCenterRoleInvitesTab';
import { CollabCenterAdvisorVotesTab } from './tabs/CollabCenterAdvisorVotesTab';

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

/** 团队协作中心 Shell：页头 + Tab 导航（顾问制 / 自由行 Tab 集不同） */
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
  const advisorLed = trip ? isAdvisorLedTrip(trip) : false;
  const collabTabs = useMemo(
    () => (trip ? resolveCollabCenterTabsForTrip(trip) : []),
    [trip],
  );
  const collabTab = trip
    ? resolveCollabCenterTabForTrip(searchParams.get('collabTab'), trip)
    : 'members';
  const [structuredNegotiationOpen, setStructuredNegotiationOpen] = useState(false);
  const [createVoteNonce, setCreateVoteNonce] = useState(0);
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

  const handleInviteMembers = useCallback(() => {
    setCollabTab('invites');
  }, [setCollabTab]);

  const handleCreateVote = useCallback(() => {
    setCollabTab('decisions');
    setCreateVoteNonce((n) => n + 1);
  }, [setCollabTab]);

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

  const showInviteButton = true;
  const showNewNegotiation = !advisorLed && collabTab !== 'decisions' && collabTab !== 'invites';
  /** 全部行程、全部 Tab 固定展示 */
  const showCreateVote = true;

  return (
    <div className={cn('space-y-0', className)} role="region" aria-label="团队协作中心">
      <Tabs
        value={collabTab}
        onValueChange={(v) => setCollabTab(resolveCollabCenterTabForTrip(v, trip))}
      >
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
              {showCreateVote ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={handleCreateVote}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">新增投票</span>
                </Button>
              ) : null}
              {showInviteButton ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  aria-label={advisorLed ? '角色邀请' : '邀请成员'}
                  onClick={handleInviteMembers}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{advisorLed ? '角色邀请' : '邀请成员'}</span>
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
              {showNewNegotiation ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={handleNewNegotiation}
                >
                  <Handshake className="h-3.5 w-3.5" />
                  新建协商
                </Button>
              ) : null}
            </div>
          </header>

          <TabsList
            className="h-8 w-full justify-start overflow-x-auto rounded-none border-0 bg-transparent p-0"
            aria-label="协作中心分区"
          >
            {collabTabs.map((tab) => (
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

        <TabsContent value="members" forceMount className="mt-2 focus-visible:outline-none data-[state=inactive]:hidden">
          <CollabCenterMembersTab
            tripId={tripId}
            trip={trip}
            onTripRefetch={onTripRefetch}
            onGoToSchedule={onGoToSchedule}
            onOpenRoleInvites={() => setCollabTab('invites')}
          />
        </TabsContent>

        <TabsContent value="invites" forceMount className="mt-2 focus-visible:outline-none data-[state=inactive]:hidden">
          <CollabCenterRoleInvitesTab
            tripId={tripId}
            trip={trip}
            onTripRefetch={onTripRefetch}
          />
        </TabsContent>

        <TabsContent value="decisions" forceMount className="mt-2 focus-visible:outline-none data-[state=inactive]:hidden">
          {advisorLed ? (
            <CollabCenterAdvisorVotesTab
              tripId={tripId}
              createVoteNonce={createVoteNonce}
              onOpenRoleInvites={() => setCollabTab('invites')}
            />
          ) : (
            <CollabCenterDecisionsTab
              tripId={tripId}
              createVoteNonce={createVoteNonce}
              onStartNegotiation={handleNewNegotiation}
            />
          )}
        </TabsContent>

        {!advisorLed ? (
          <>
            <TabsContent value="persona" forceMount className="mt-2 focus-visible:outline-none data-[state=inactive]:hidden">
              <CollabCenterPersonaTab
                tripId={tripId}
                initialStep={decisionProfilingInitialStep}
                forceOpenQuiz={decisionProfilingForceQuiz}
                forceReuseProfile={decisionProfilingForceReuse}
                initialSurface={decisionProfilingInitialSurface}
              />
            </TabsContent>

            <TabsContent value="wishes" forceMount className="mt-2 focus-visible:outline-none data-[state=inactive]:hidden">
              <CollabCenterWishesTab
                tripId={tripId}
                destinationLabel={destinationLabel}
                userDisplayName={userDisplayName}
                onSummaryChange={onWishSummaryChange}
              />
            </TabsContent>

            <TabsContent value="tasks" forceMount className="mt-2 focus-visible:outline-none data-[state=inactive]:hidden">
              <CollabCenterTasksTab tripId={tripId} />
            </TabsContent>
          </>
        ) : null}
      </Tabs>

      {!advisorLed ? (
        <StructuredNegotiationDialog
          tripId={tripId}
          open={structuredNegotiationOpen}
          onOpenChange={setStructuredNegotiationOpen}
          initialRoundId={negotiationRoundId}
          initialRoundDomain={negotiationRoundDomain}
        />
      ) : null}
    </div>
  );
}
