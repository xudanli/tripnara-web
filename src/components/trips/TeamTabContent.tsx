import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
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
import { TeamTabIntro, countPendingTeamMembers } from '@/components/trips/team/TeamTabIntro';
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
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
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
  const plannedTravelerCount = resolveTravelerCount(trip);
  const hasPlannedGroupTravel = plannedTravelerCount >= 2;
  const defaultTeamName = useMemo(() => defaultNegotiationTeamName(trip), [trip]);
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
      toast.success(`已创建 ${request.members.length} 人名单，请补充带「待补充」标记的成员`);
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

  const isLoading =
    teamLoading ||
    addMemberMutation.isPending ||
    removeMemberMutation.isPending ||
    updateMemberMutation.isPending;

  const pendingMemberCount = countPendingTeamMembers(members);
  const introPhase = !effectiveTeamId
    ? hasPlannedGroupTravel
      ? 'empty-group'
      : 'empty-solo'
    : pendingMemberCount > 0 || isSoloTeam
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
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="font-semibold text-lg">
                    {hasPlannedGroupTravel ? '还没有同行者名单' : '暂时只有您一人'}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {hasPlannedGroupTravel
                      ? `按约束里的 ${plannedTravelerCount} 人出行，一键生成名单；有协作者会自动填入。`
                      : '单人规划不需要建名单。邀请朋友同行时再来这里添加即可。'}
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
                    {hasPlannedGroupTravel ? '手动创建名单' : '添加同行者'}
                  </Button>
                </div>
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

          {!showAdvancedTeamTools && pendingMemberCount > 0 ? (
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
              <p className="font-medium">下一步：点成员卡片，填写姓名和体力偏好</p>
              <p className="mt-1 text-xs leading-relaxed opacity-90">
                填完后再检查大家是否合拍；「谁来做决定」可在成员列表右上角设置。
              </p>
            </div>
          ) : null}

          {!showAdvancedTeamTools && isSoloTeam && pendingMemberCount === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              名单里目前只有您一人。点击「添加成员」邀请同行者，或返回时间轴继续单人规划。
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
          ) : null}

          {showAdvancedTeamTools ? (
            <TeamPreferenceSummary items={preferenceItems} defaultOpen={false} />
          ) : null}

          {showAdvancedTeamTools ? (
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
        defaultName={defaultTeamName}
        isSubmitting={createTeamMutation.isPending}
      />
    </div>
  );
}
