import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import { tripsApi } from '@/api/trips';
import type { TripDetail, Traveler } from '@/types/trip';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateTeamDialog, InviteMemberDialog } from '@/components/optimization';
import { MatchSquareRosterPanel } from '@/features/match-square/components/MatchSquareRosterPanel';
import { useMatchSquareTeamBridge } from '@/features/match-square/hooks/useMatchSquareTeamBridge';
import TeamDecisionModeDialog from '@/components/trips/team/TeamDecisionModeDialog';
import TeamMembersList from '@/components/trips/team/TeamMembersList';
import TeamPreferenceSummary from '@/components/trips/team/TeamPreferenceSummary';
import TeamCoordinationCard from '@/components/trips/team/TeamCoordinationCard';
import {
  useAddTeamMember,
  useCreateTeam,
  useRemoveTeamMember,
  useTeam,
  useTeamNegotiation,
  useTeamWeights,
  useUpdateTeam,
  useUpdateTeamMember,
} from '@/hooks/useOptimizationV2';
import type { TeamMember, Team, TeamNegotiationResponse } from '@/types/optimization-v2';
import { useAuth } from '@/hooks/useAuth';
import { useFitnessContext } from '@/contexts/FitnessContext';
import { tripDetailToRoutePlanDraft } from '@/utils/plan-converters';
import { buildWorldModelContext } from '@/utils/world-context-builder';
import {
  aggregateTeamWeights,
  backendToGovernance,
  buildPreferenceSummary,
  conflictsFromNegotiation,
  detectMemberConflicts,
  governanceToBackend,
  type TeamGovernanceMode,
} from '@/lib/team-tab-model';
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
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [teamNegotiationResult, setTeamNegotiationResult] = useState<TeamNegotiationResponse | null>(null);

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

  const {
    isMatchSquareTrip,
    roster: matchSquareRoster,
    rosterLoading: matchSquareRosterLoading,
    isImporting: matchSquareImporting,
    importError: matchSquareImportError,
    retryImport: retryMatchSquareImport,
  } = useMatchSquareTeamBridge({
    tripId,
    trip,
    effectiveTeamId,
    onTeamImported: persistTeamId,
  });

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
  const { data: team, isLoading: teamLoading } = useTeam(effectiveTeamId);
  const updateTeamMutation = useUpdateTeam(effectiveTeamId ?? '');
  const addMemberMutation = useAddTeamMember(effectiveTeamId ?? '');
  const removeMemberMutation = useRemoveTeamMember(effectiveTeamId ?? '');
  const updateMemberMutation = useUpdateTeamMember(effectiveTeamId ?? '');
  const teamNegotiationMutation = useTeamNegotiation(effectiveTeamId ?? '');
  const { data: teamWeights } = useTeamWeights(effectiveTeamId);

  const { profile: fitnessProfile } = useFitnessContext();
  const planDraft = useMemo(() => tripDetailToRoutePlanDraft(trip), [trip]);
  const worldContext = useMemo(
    () => buildWorldModelContext(trip, { fitnessProfile }),
    [trip, fitnessProfile],
  );

  const members = team?.members ?? [];
  const memberCount = members.length;
  const isSoloTeam = memberCount <= 1;
  const hasPlan = (trip.TripDay ?? []).some((day) => (day.ItineraryItem?.length ?? 0) > 0);

  const governanceMode = backendToGovernance(team?.decisionWeightMode ?? 'LEADER_DOMINANT');

  const preferenceItems = useMemo(() => {
    const weights = teamWeights?.weights ?? aggregateTeamWeights(members);
    return buildPreferenceSummary(weights);
  }, [teamWeights?.weights, members]);

  const conflicts = useMemo(() => {
    const fromNegotiation = conflictsFromNegotiation(teamNegotiationResult);
    if (fromNegotiation.length > 0) return fromNegotiation;
    return detectMemberConflicts(members);
  }, [members, teamNegotiationResult]);

  const handleGovernanceChange = async (mode: TeamGovernanceMode) => {
    if (!effectiveTeamId || mode === governanceMode) return;
    try {
      await updateTeamMutation.mutateAsync({
        decisionWeightMode: governanceToBackend(mode),
      });
      toast.success('决策方式已更新');
    } catch {
      toast.error('更新决策方式失败');
    }
  };

  const handleAddMember = async (member: TeamMember, email?: string) => {
    if (!effectiveTeamId) return;
    try {
      await addMemberMutation.mutateAsync(member);

      // 如果有邮箱且用户已注册，自动添加为行程协作者
      if (email && !member.userId.startsWith('guest_')) {
        try {
          await tripsApi.addCollaborator(tripId, { email, role: 'EDITOR' });
        } catch (error) {
          console.error('添加协作者失败:', error);
          // 不阻止添加成员流程
        }
      }

      // 同步团队成员到行程的 travelers 配置
      await syncTeamMembersToTrip();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '添加成员失败';
      toast.error(message);
      throw error;
    }
  };

  // 同步团队成员到行程的 travelers 配置
  const syncTeamMembersToTrip = useCallback(async (teamMembers?: TeamMember[]) => {
    const membersToSync = teamMembers || team?.members;
    if (!membersToSync || !tripId) return;

    try {
      // 将团队成员转换为 Traveler 格式
      const travelers: Traveler[] = membersToSync.map((member) => {
        // 根据体力等级映射到 mobilityTag
        let mobilityTag: Traveler['mobilityTag'] = 'ACTIVE_SENIOR';
        if (member.fitnessLevel === 'BEGINNER') {
          mobilityTag = 'CITY_POTATO';
        } else if (member.fitnessLevel === 'EXPERT') {
          mobilityTag = 'IRON_LEGS';
        }

        // 根据经验等级映射到类型（简化处理，默认为成人）
        const type: Traveler['type'] = 'ADULT';

        return {
          type,
          mobilityTag,
        };
      });

      // 更新行程的 pacingConfig
      await tripsApi.update(tripId, {
        pacingConfig: {
          ...trip.pacingConfig,
          travelers,
        },
      });

      await onTripRefetch?.();
    } catch (error: unknown) {
      console.error('同步团队成员到行程失败:', error);
      // 不显示错误提示，因为添加成员已经成功
    }
  }, [team, tripId, trip.pacingConfig, onTripRefetch]);

  const handleEditMember = async (member: TeamMember) => {
    if (!effectiveTeamId) return;
    try {
      await updateMemberMutation.mutateAsync({
        userId: member.userId,
        updates: {
          displayName: member.displayName,
          role: member.role,
          fitnessLevel: member.fitnessLevel,
          experienceLevel: member.experienceLevel,
          decisionWeight: member.decisionWeight,
        },
      });
      toast.success(`已更新成员 ${member.displayName}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '更新成员失败';
      toast.error(message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!effectiveTeamId) return;
    try {
      await removeMemberMutation.mutateAsync(userId);
      toast.success('已移除成员');

      // 同步团队成员到行程的 travelers 配置
      await syncTeamMembersToTrip();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '移除成员失败';
      toast.error(message);
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

  const isLoading =
    teamLoading ||
    addMemberMutation.isPending ||
    removeMemberMutation.isPending ||
    updateMemberMutation.isPending;

  return (
    <div className={cn('space-y-5', !embedded && 'p-6')}>
      {!effectiveTeamId ? (
        isMatchSquareTrip ? (
          <MatchSquareRosterPanel
            roster={matchSquareRoster}
            rosterLoading={matchSquareRosterLoading}
            isImporting={matchSquareImporting}
            importError={matchSquareImportError}
            onRetryImport={retryMatchSquareImport}
            onManualCreate={() => setCreateTeamDialogOpen(true)}
          />
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">创建行程团队</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
                    邀请同行者一起旅行，设定决策方式后进入规划
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => setCreateTeamDialogOpen(true)}
                  disabled={!user?.id}
                  className="gap-2"
                >
                  <Users className="w-4 h-4" />
                  创建团队
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          <TeamMembersList
            members={members}
            loading={isLoading}
            creatorUserId={user?.id}
            openAddMember={addMemberDialogOpen}
            onOpenAddMemberChange={setAddMemberDialogOpen}
            onAddMember={handleAddMember}
            onEditMember={handleEditMember}
            onRemoveMember={handleRemoveMember}
            isEditMemberPending={updateMemberMutation.isPending}
            onInvite={() => setInviteDialogOpen(true)}
            onOpenDecisionRules={() => setDecisionDialogOpen(true)}
          />

          <TeamDecisionModeDialog
            open={decisionDialogOpen}
            onOpenChange={setDecisionDialogOpen}
            value={governanceMode}
            onChange={handleGovernanceChange}
            disabled={updateTeamMutation.isPending}
          />

          {!isSoloTeam ? (
            <TeamPreferenceSummary items={preferenceItems} defaultOpen={false} />
          ) : null}

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

          {isSoloTeam && onGoToPlanStudio ? (
            <div className="flex justify-end">
              <Button onClick={onGoToPlanStudio} className="gap-1.5">
                去规划行程
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        teamId={effectiveTeamId ?? ''}
        tripId={tripId}
        onAddMember={() => setAddMemberDialogOpen(true)}
      />

      <CreateTeamDialog
        open={createTeamDialogOpen}
        onOpenChange={setCreateTeamDialogOpen}
        onSubmit={async (req) => {
          const newTeam = await createTeamMutation.mutateAsync(req);
          await persistTeamId(newTeam.teamId);

          // 同步团队成员到行程的 travelers 配置
          await syncTeamMembersToTrip(newTeam.members);
        }}
        currentUserId={user?.id ?? ''}
        currentUserDisplayName={user?.displayName ?? user?.email ?? '我'}
        isSubmitting={createTeamMutation.isPending}
      />
    </div>
  );
}
