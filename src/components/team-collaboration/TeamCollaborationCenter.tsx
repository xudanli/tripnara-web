import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Handshake, UserPlus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
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
  };

  if (!trip) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', className)} role="region" aria-label="团队协作中心">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">团队协作中心</h2>
          <p className="text-sm text-muted-foreground">
            {memberCount} 位成员 · 一起把行程定下来
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onInviteMembers ? (
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onInviteMembers}>
              <UserPlus className="h-3.5 w-3.5" />
              邀请成员
            </Button>
          ) : null}
          {onOpenTeamSettings ? (
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onOpenTeamSettings}>
              <Settings2 className="h-3.5 w-3.5" />
              团队设置
            </Button>
          ) : null}
          <Button type="button" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleNewNegotiation}>
            <Handshake className="h-3.5 w-3.5" />
            新建协商
          </Button>
        </div>
      </header>

      <Tabs value={collabTab} onValueChange={(v) => setCollabTab(resolveCollabCenterTab(v))}>
        <TabsList
          className="h-9 w-full justify-start overflow-x-auto rounded-none border-b border-border/60 bg-transparent p-0"
          aria-label="协作中心分区"
        >
          {COLLAB_CENTER_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-9 shrink-0 rounded-none border-b-2 border-transparent px-3 text-sm text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:font-medium data-[state=active]:text-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="members" forceMount className="mt-5 focus-visible:outline-none data-[state=inactive]:hidden">
          <CollabCenterMembersTab
            tripId={tripId}
            trip={trip}
            onTripRefetch={onTripRefetch}
            onGoToSchedule={onGoToSchedule}
          />
        </TabsContent>

        <TabsContent value="decisions" forceMount className="mt-5 focus-visible:outline-none data-[state=inactive]:hidden">
          <CollabCenterDecisionsTab tripId={tripId} />
        </TabsContent>

        <TabsContent value="persona" forceMount className="mt-5 focus-visible:outline-none data-[state=inactive]:hidden">
          <CollabCenterPersonaTab
            tripId={tripId}
            initialStep={decisionProfilingInitialStep}
            forceOpenQuiz={decisionProfilingForceQuiz}
            forceReuseProfile={decisionProfilingForceReuse}
            initialSurface={decisionProfilingInitialSurface}
          />
        </TabsContent>

        <TabsContent value="wishes" forceMount className="mt-5 focus-visible:outline-none data-[state=inactive]:hidden">
          <CollabCenterWishesTab
            tripId={tripId}
            destinationLabel={destinationLabel}
            userDisplayName={userDisplayName}
            onSummaryChange={onWishSummaryChange}
          />
        </TabsContent>

        <TabsContent value="tasks" forceMount className="mt-5 focus-visible:outline-none data-[state=inactive]:hidden">
          <CollabCenterTasksTab tripId={tripId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
