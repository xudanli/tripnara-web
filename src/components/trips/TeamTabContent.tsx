import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { tripsApi } from '@/api/trips';
import type { TripDetail, Traveler } from '@/types/trip';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateTeamDialog } from '@/components/optimization';
import TeamCoordinationCard from '@/components/trips/team/TeamCoordinationCard';
import { TeamTabIntro, countPendingTeamMembers } from '@/components/trips/team/TeamTabIntro';
import {
  useCreateTeam,
  useTeam,
  useTeamNegotiation,
} from '@/hooks/useOptimizationV2';
import type { TeamMember, TeamNegotiationResponse } from '@/types/optimization-v2';
import { useAuth } from '@/hooks/useAuth';
import { useFitnessContext } from '@/contexts/FitnessContext';
import { tripDetailToRoutePlanDraft } from '@/utils/plan-converters';
import { buildWorldModelContext } from '@/utils/world-context-builder';
import {
  conflictsFromNegotiation,
  detectMemberConflicts,
} from '@/lib/team-tab-model';
import { resolveTravelerCount } from '@/lib/planning-constraints.util';
import { buildCreateTeamRequestFromPlannedTravelers, defaultNegotiationTeamName } from '@/lib/team-from-planned-travelers';
import { cn } from '@/lib/utils';

export interface TeamTabContentProps {
  tripId: string;
  trip: TripDetail;
  onTripRefetch?: () => void | Promise<void>;
  /** 打开规划工作台 / 时间轴（用于「去改行程」） */
  onGoToPlanStudio?: () => void;
  /** 嵌入规划工作台时去掉外层 padding */
  embedded?: boolean;
}

export default function TeamTabContent({
  tripId,
  trip,
  onTripRefetch,
  onGoToPlanStudio,
  embedded = false,
}: TeamTabContentProps) {
  const { user } = useAuth();
  const [localTeamId, setLocalTeamId] = useState<string | null>(null);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [teamNegotiationResult, setTeamNegotiationResult] = useState<TeamNegotiationResponse | null>(null);
  const [quickCreatePending, setQuickCreatePending] = useState(false);

  const tripMetadata = (trip as { metadata?: Record<string, unknown> })?.metadata;
  const teamIdFromTrip = (trip as { metadata?: { teamId?: string } })?.metadata?.teamId;
  const effectiveTeamId = localTeamId ?? teamIdFromTrip;

  const persistTeamId = useCallback(
    async (teamId: string) => {
      setLocalTeamId(teamId);
      try {
        localStorage.setItem(`trip_team_id:${tripId}`, teamId);
        await tripsApi.update(tripId, {
          metadata: { ...(tripMetadata || {}), teamId },
        });
        await onTripRefetch?.();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '团队已创建，但写入行程失败';
        toast.error(message);
      }
    },
    [tripId, tripMetadata, onTripRefetch],
  );

  useEffect(() => {
    if (teamIdFromTrip) {
      setLocalTeamId(null);
      return;
    }
    try {
      const stored = localStorage.getItem(`trip_team_id:${tripId}`);
      setLocalTeamId(stored || null);
    } catch {
      setLocalTeamId(null);
    }
  }, [tripId, teamIdFromTrip]);

  const createTeamMutation = useCreateTeam();
  const { data: team } = useTeam(effectiveTeamId);
  const teamNegotiationMutation = useTeamNegotiation(effectiveTeamId ?? '');

  const { profile: fitnessProfile } = useFitnessContext();
  const planDraft = useMemo(() => tripDetailToRoutePlanDraft(trip), [trip]);
  const worldContext = useMemo(
    () => buildWorldModelContext(trip, { fitnessProfile }),
    [trip, fitnessProfile],
  );

  const members = team?.members ?? [];
  const memberCount = members.length;
  const plannedTravelerCount = resolveTravelerCount(trip);
  const hasPlannedGroupTravel = plannedTravelerCount >= 2;
  const defaultTeamName = useMemo(() => defaultNegotiationTeamName(trip), [trip]);
  const hasPlan = (trip.TripDay ?? []).some((day) => (day.ItineraryItem?.length ?? 0) > 0);

  const conflicts = useMemo(() => {
    const fromNegotiation = conflictsFromNegotiation(teamNegotiationResult);
    if (fromNegotiation.length > 0) return fromNegotiation;
    return detectMemberConflicts(members);
  }, [members, teamNegotiationResult]);

  const syncTeamMembersToTrip = useCallback(async (teamMembers?: TeamMember[]) => {
    const membersToSync = teamMembers || team?.members;
    if (!membersToSync || !tripId) return;

    try {
      const travelers: Traveler[] = membersToSync.map((member) => {
        let mobilityTag: Traveler['mobilityTag'] = 'ACTIVE_SENIOR';
        if (member.fitnessLevel === 'BEGINNER') {
          mobilityTag = 'CITY_POTATO';
        } else if (member.fitnessLevel === 'EXPERT') {
          mobilityTag = 'IRON_LEGS';
        }

        return {
          type: 'ADULT' as const,
          mobilityTag,
        };
      });

      await tripsApi.update(tripId, {
        pacingConfig: {
          ...trip.pacingConfig,
          travelers,
        },
      });

      await onTripRefetch?.();
    } catch (error: unknown) {
      console.error('同步团队成员到行程失败:', error);
    }
  }, [team, tripId, trip.pacingConfig, onTripRefetch]);

  const handleQuickCreateFromTravelers = async () => {
    if (!user?.id) return;
    setQuickCreatePending(true);
    try {
      const collaborators = await tripsApi.getCollaborators(tripId).catch(() => []);
      const request = buildCreateTeamRequestFromPlannedTravelers({
        trip,
        currentUserId: user.id,
        currentUserDisplayName: user.displayName ?? user.email ?? '我',
        collaborators,
      });
      const newTeam = await createTeamMutation.mutateAsync(request);
      await persistTeamId(newTeam.teamId);
      await syncTeamMembersToTrip(newTeam.members);
      toast.success(`已创建 ${request.members.length} 人名单`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '一键建团失败';
      toast.error(message);
    } finally {
      setQuickCreatePending(false);
    }
  };

  const handleStartCoordination = async () => {
    if (!effectiveTeamId) return;
    if (memberCount < 2) {
      toast.message('单人行程无需协调');
      return;
    }
    if (!hasPlan) {
      toast.error('请先在时间轴生成行程');
      return;
    }
    try {
      const result = await teamNegotiationMutation.mutateAsync({
        plan: planDraft,
        world: worldContext,
        tripId,
      });
      setTeamNegotiationResult(result);
      toast.success('协调完成');
    } catch {
      toast.error('协调流程失败');
    }
  };

  const pendingMemberCount = countPendingTeamMembers(members);
  const introPhase = !effectiveTeamId
    ? hasPlannedGroupTravel
      ? 'empty-group'
      : 'empty-solo'
    : pendingMemberCount > 0 || memberCount <= 1
      ? 'setup'
      : 'ready';
  const showAdvancedTeamTools = memberCount >= 2 && pendingMemberCount === 0;

  return (
    <div className={cn('space-y-5', !embedded && 'p-6')}>
      <TeamTabIntro
        phase={introPhase}
        plannedTravelerCount={plannedTravelerCount}
        memberCount={memberCount}
        pendingMemberCount={pendingMemberCount}
      />

      {!effectiveTeamId ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="font-semibold text-lg">
                  {hasPlannedGroupTravel ? '还没有团队名单' : '暂时只有您一人'}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {hasPlannedGroupTravel
                    ? `按约束里的 ${plannedTravelerCount} 人出行，可一键生成协调用名单。成员偏好请通过邀请问卷采集。`
                    : '单人规划不需要建名单。多人出行时请通过邀请码收集成员偏好。'}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                {hasPlannedGroupTravel ? (
                  <Button
                    size="lg"
                    onClick={() => void handleQuickCreateFromTravelers()}
                    disabled={!user?.id || quickCreatePending || createTeamMutation.isPending}
                    className="gap-2"
                  >
                    <Users className="w-4 h-4" />
                    {quickCreatePending || createTeamMutation.isPending
                      ? '创建中…'
                      : `按 ${plannedTravelerCount} 人出行创建名单`}
                  </Button>
                ) : null}
                <Button
                  size={hasPlannedGroupTravel ? 'default' : 'lg'}
                  variant="outline"
                  onClick={() => setCreateTeamDialogOpen(true)}
                  disabled={!user?.id || quickCreatePending}
                  className="gap-2"
                >
                  {hasPlannedGroupTravel ? '手动创建名单' : '创建团队'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : showAdvancedTeamTools ? (
        <TeamCoordinationCard
          memberCount={memberCount}
          conflicts={conflicts}
          hasPlan={hasPlan}
          negotiating={teamNegotiationMutation.isPending}
          negotiationResult={teamNegotiationResult}
          tripId={tripId}
          userId={user?.id}
          onStartCoordination={handleStartCoordination}
          onGoToPlan={onGoToPlanStudio}
        />
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          成员偏好与缺口请查看上方「团队需求画像」。名单满足协调条件后，可在此发起行程协调。
          {onGoToPlanStudio ? (
            <Button
              variant="link"
              className="h-auto p-0 ml-1 text-sm"
              onClick={onGoToPlanStudio}
            >
              去时间轴
            </Button>
          ) : null}
        </div>
      )}

      <CreateTeamDialog
        open={createTeamDialogOpen}
        onOpenChange={setCreateTeamDialogOpen}
        onSubmit={async (req) => {
          const newTeam = await createTeamMutation.mutateAsync(req);
          await persistTeamId(newTeam.teamId);
          await syncTeamMembersToTrip(newTeam.members);
        }}
        currentUserId={user?.id ?? ''}
        currentUserDisplayName={user?.displayName ?? user?.email ?? '我'}
        defaultName={defaultTeamName}
        isSubmitting={createTeamMutation.isPending}
      />
    </div>
  );
}
