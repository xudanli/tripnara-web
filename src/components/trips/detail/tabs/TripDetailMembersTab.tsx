import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BedDouble,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  ListTodo,
  Plus,
  Shield,
  Sparkles,
  Ticket,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { tripCollabApi } from '@/api/trip-detail-tab-client';
import { mergeCollabOverview } from '@/lib/trip-detail-tab-merge.util';
import { CollaboratorAvatar } from '@/components/plan-studio/workbench/CollaboratorAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeam } from '@/hooks/useOptimizationV2';
import { buildCollabCenterPlanStudioUrl } from '@/lib/collab-center-navigation';
import {
  buildPendingItemsFromCollabOverview,
  buildTaskBoardFromCollabOverview,
  mapCollabCollaborators,
  partitionCollabOverviewTasks,
  resolveCollabDiscussionCount,
  resolveCollabProgressPercent,
  resolveOverallConsensus,
} from '@/lib/collab-overview.util';
import {
  buildCollaborationProgress,
  buildPreferenceCards,
  buildTeamOverviewStats,
  collaboratorToCardView,
  groupTasksByColumn,
  TASK_COLUMNS,
  taskStatusClass,
  taskStatusLabel,
  teamMemberToCardView,
  type MemberCardView,
  type TaskBoardItem,
  type TaskColumnKey,
} from '@/lib/trip-detail-members.util';
import { cn } from '@/lib/utils';
import type { CollabOverviewResponse } from '@/types/collab-overview';
import type { Collaborator, TripDetail } from '@/types/trip';
import { TripDetailSection, TripDetailTwoColumn, tripDetailUi } from '../trip-detail-ui';

const PREFERENCE_ICONS = {
  pace: Compass,
  activity: Ticket,
  accommodation: BedDouble,
  dining: UtensilsCrossed,
  transport: Car,
  budget: Wallet,
} as const;

function MembersTabSkeleton() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-52 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

function CompactStatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] leading-none text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-bold leading-none text-foreground tabular-nums">{value}</p>
        </div>
        {icon ? <div className="shrink-0 text-muted-foreground">{icon}</div> : null}
      </div>
    </div>
  );
}

function MemberDetailCard({
  member,
  onManage,
}: {
  member: MemberCardView;
  onManage?: () => void;
}) {
  return (
    <div className={cn(tripDetailUi.card, 'flex flex-col gap-2 p-3 shadow-none')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <CollaboratorAvatar displayName={member.displayName} size="sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="truncate text-sm font-semibold text-foreground">{member.displayName}</h4>
              <Badge variant="outline" className="h-5 text-[10px]">
                {member.roleLabel}
              </Badge>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'mt-1 h-5 text-[10px]',
                member.confirmed ? tripDetailUi.tagVerified : tripDetailUi.tagConfirm,
              )}
            >
              {member.confirmed ? '已确认' : '待确认'}
            </Badge>
          </div>
        </div>
      </div>

      {member.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {member.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="rounded-md border border-border/60 px-2.5 py-1.5 text-[10px] text-muted-foreground">
        权限 · {member.permissionLabel}
      </div>

      <div className="space-y-2">
        <div>
          <div className="mb-0.5 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">参与天数</span>
            <span className="tabular-nums text-foreground">
              {member.participationDays}/{member.totalDays} 天
            </span>
          </div>
          <Progress
            value={(member.participationDays / Math.max(member.totalDays, 1)) * 100}
            className="h-1"
          />
        </div>
        <div>
          <div className="mb-0.5 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">完成任务</span>
            <span className="tabular-nums text-foreground">
              {member.completedTasks}/{member.totalTasks}
            </span>
          </div>
          <Progress
            value={(member.completedTasks / Math.max(member.totalTasks, 1)) * 100}
            className="h-1"
          />
        </div>
        <div>
          <div className="mb-0.5 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">提出建议</span>
            <span className="tabular-nums text-foreground">{member.suggestionsCount}</span>
          </div>
          <Progress value={Math.min(100, member.suggestionsCount * 12)} className="h-1" />
        </div>
      </div>

      {onManage ? (
        <Button variant="outline" size="sm" className="mt-auto h-8 w-full text-xs" onClick={onManage}>
          管理成员
        </Button>
      ) : null}
    </div>
  );
}

function InviteMemberCard({ onInvite }: { onInvite?: () => void }) {
  return (
    <button
      type="button"
      onClick={onInvite}
      className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-3 text-center transition-colors hover:bg-muted/20"
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-muted">
        <Plus className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-xs font-medium text-foreground">邀请成员</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">通过链接或邮箱邀请同行者</p>
    </button>
  );
}

function TaskColumn({
  column,
  tasks,
  onViewAll,
}: {
  column: { key: TaskColumnKey; label: string };
  tasks: TaskBoardItem[];
  onViewAll?: () => void;
}) {
  const preview = tasks.slice(0, 3);
  return (
    <div className="min-w-[168px] flex-1 rounded-xl border border-border bg-card p-2.5 shadow-none">
      <h4 className="mb-2 text-xs font-semibold text-foreground">{column.label}</h4>
      {preview.length === 0 ? (
        <p className="py-2 text-[10px] text-muted-foreground">暂无任务</p>
      ) : (
        <ul className="space-y-2">
          {preview.map((task) => (
            <li key={task.id} className="space-y-1">
              <p className="line-clamp-2 text-[11px] font-medium text-foreground">{task.title}</p>
              <div className="flex items-center justify-between gap-1.5">
                {task.assigneeLabel ? (
                  <div className="flex min-w-0 items-center gap-1">
                    <CollaboratorAvatar displayName={task.assigneeLabel} size="xs" />
                    <span className="truncate text-[10px] text-muted-foreground">
                      {task.assigneeLabel}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground">未分配</span>
                )}
                <Badge variant="outline" className={cn('h-5 shrink-0 text-[10px]', taskStatusClass(task.status))}>
                  {taskStatusLabel(task.status)}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
      {tasks.length > 0 && onViewAll ? (
        <Button variant="link" className={cn(tripDetailUi.linkInline, 'mt-2')} onClick={onViewAll}>
          查看全部
        </Button>
      ) : null}
    </div>
  );
}

interface TripDetailMembersTabProps {
  tripId: string;
  trip: TripDetail;
  onInviteMembers?: () => void;
  onOpenCollabCenter?: () => void;
  /** 父级 Phase1/2 预加载；有则不再自行请求 shell/full */
  collabOverview?: CollabOverviewResponse | null;
  collabOverviewLoading?: boolean;
}

export default function TripDetailMembersTab({
  tripId,
  trip,
  onInviteMembers,
  onOpenCollabCenter,
  collabOverview: collabOverviewProp,
  collabOverviewLoading: collabOverviewLoadingProp,
}: TripDetailMembersTabProps) {
  const [localCollabOverview, setLocalCollabOverview] = useState<CollabOverviewResponse | null>(null);
  const [localCollabLoading, setLocalCollabLoading] = useState(true);
  const useParentCollab = collabOverviewProp !== undefined;

  const tripMetadata = trip.metadata as { teamId?: string } | undefined;
  const [localTeamId, setLocalTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (tripMetadata?.teamId) {
      setLocalTeamId(null);
      return;
    }
    try {
      setLocalTeamId(localStorage.getItem(`trip_team_id:${tripId}`));
    } catch {
      setLocalTeamId(null);
    }
  }, [tripId, tripMetadata?.teamId]);

  useEffect(() => {
    if (useParentCollab) return;
    let cancelled = false;
    setLocalCollabLoading(true);
    (async () => {
      try {
        const shell = await tripCollabApi.getShellOverview(tripId);
        if (!cancelled) setLocalCollabOverview(shell);
        const phase2 = await tripCollabApi.getPhase2Overview(tripId);
        if (!cancelled) {
          setLocalCollabOverview((prev) => mergeCollabOverview(prev, phase2));
        }
      } catch {
        if (!cancelled) setLocalCollabOverview(null);
      } finally {
        if (!cancelled) setLocalCollabLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId, useParentCollab]);

  const collabOverview = useParentCollab ? collabOverviewProp : localCollabOverview;
  const collabLoading = useParentCollab ? Boolean(collabOverviewLoadingProp) : localCollabLoading;

  const effectiveTeamId =
    collabOverview?.teamId ??
    collabOverview?.team?.teamId ??
    tripMetadata?.teamId ??
    localTeamId ??
    undefined;
  const { data: team, isLoading: teamLoading } = useTeam(effectiveTeamId);

  const collaborators = useMemo(
    () =>
      collabOverview?.collaborators?.length
        ? mapCollabCollaborators(collabOverview.collaborators, tripId)
        : ([] as Collaborator[]),
    [collabOverview, tripId],
  );

  const pendingItems = useMemo(
    () => (collabOverview ? buildPendingItemsFromCollabOverview(collabOverview) : []),
    [collabOverview],
  );

  const derived = useMemo(() => {
    const tasks = collabOverview?.collaborativeTasks ?? [];
    const { flywheelTasks, negotiationTasks } = partitionCollabOverviewTasks(tasks);
    const taskItems = buildTaskBoardFromCollabOverview(tasks);
    const groupedTasks = groupTasksByColumn(taskItems);

    const teamMembers = team?.members ?? [];
    let memberCards: MemberCardView[] = [];

    if (teamMembers.length > 0) {
      memberCards = teamMembers.map((m) => teamMemberToCardView(m, trip, taskItems));
    } else if (collaborators.length > 0) {
      memberCards = collaborators.map((c) => collaboratorToCardView(c, trip, taskItems));
    }

    const stats = buildTeamOverviewStats(memberCards, flywheelTasks, pendingItems);
    const collaboration = buildCollaborationProgress(taskItems);
    const overallConsensus = collabOverview ? resolveOverallConsensus(collabOverview) : 0;
    const preferenceCards = buildPreferenceCards(trip, teamMembers, overallConsensus);

    const unconfirmed = memberCards.filter((m) => !m.confirmed);
    const confirmedRatio =
      stats.totalMembers > 0 ? Math.round((stats.confirmedCount / stats.totalMembers) * 100) : 0;

    return {
      taskItems,
      groupedTasks,
      memberCards,
      stats,
      collaboration,
      preferenceCards,
      unconfirmed,
      confirmedRatio,
      overallConsensus,
      progressPercent: collabOverview ? resolveCollabProgressPercent(collabOverview) : 0,
      discussionCount: collabOverview ? resolveCollabDiscussionCount(collabOverview) : 0,
      flywheelTasks,
      negotiationTasks,
    };
  }, [team, collaborators, trip, collabOverview, pendingItems]);

  const openCollabCenter =
    onOpenCollabCenter ??
    (() => {
      window.location.href = buildCollabCenterPlanStudioUrl(tripId, { collabTab: 'members' });
    });

  const loading = collabLoading || teamLoading;

  if (loading && derived.memberCards.length === 0) {
    return <MembersTabSkeleton />;
  }

  const donutData = [
    { name: '已完成', value: derived.collaboration.completedPercent, color: 'hsl(var(--chart-1))' },
    { name: '进行中', value: derived.collaboration.inProgressPercent, color: 'hsl(var(--chart-3))' },
    { name: '待处理', value: derived.collaboration.pendingPercent, color: 'hsl(var(--chart-5))' },
  ].filter((d) => d.value > 0);

  return (
    <TripDetailTwoColumn
      className="gap-3"
      mainClassName="space-y-2.5"
      sidebarClassName="space-y-2.5"
      main={
        <div className="space-y-2.5">
          {derived.stats.totalMembers === 0 ? (
            <div className={cn(tripDetailUi.card, 'p-4 text-center shadow-none')}>
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">还没有同行成员</h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                邀请协作者后，可在此查看偏好对齐、任务分工与共识进度。
              </p>
              <Button
                className="mt-3 h-8 bg-primary text-xs hover:bg-primary/90 text-primary-foreground"
                onClick={onInviteMembers ?? openCollabCenter}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                邀请成员
              </Button>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-5">
              <CompactStatCard
                label="总成员"
                value={derived.stats.totalMembers}
                icon={<Users className="h-4 w-4" />}
              />
              <CompactStatCard
                label="已确认"
                value={derived.stats.confirmedCount}
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <CompactStatCard
                label="待确认"
                value={derived.stats.pendingCount}
                icon={<Clock className="h-4 w-4" />}
              />
              <CompactStatCard
                label="共享任务"
                value={derived.stats.sharedTasks}
                icon={<ListTodo className="h-4 w-4" />}
              />
              <CompactStatCard
                label="待审批"
                value={derived.stats.pendingApproval}
                icon={<Shield className="h-4 w-4" />}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="link" className={tripDetailUi.linkInline} onClick={openCollabCenter}>
              进入团队协作中心
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>
          </div>

          <TripDetailSection
            title="成员与角色"
            className="shadow-none"
            headerClassName="px-3 py-2"
            bodyClassName="p-3"
          >
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {derived.memberCards.map((member) => (
                <MemberDetailCard key={member.id} member={member} onManage={openCollabCenter} />
              ))}
              <InviteMemberCard onInvite={onInviteMembers ?? openCollabCenter} />
            </div>
          </TripDetailSection>

          <TripDetailSection
            title="任务分工"
            className="shadow-none"
            headerClassName="px-3 py-2"
            bodyClassName="p-3"
          >
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {TASK_COLUMNS.map((column) => (
                <TaskColumn
                  key={column.key}
                  column={column}
                  tasks={derived.groupedTasks[column.key]}
                  onViewAll={() => openCollabCenter()}
                />
              ))}
            </div>
          </TripDetailSection>

          <TripDetailSection
            title="参与与偏好摘要"
            className="shadow-none"
            headerClassName="px-3 py-2"
            bodyClassName="p-3"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {derived.preferenceCards.slice(0, 5).map((pref) => {
                const Icon =
                  PREFERENCE_ICONS[pref.id as keyof typeof PREFERENCE_ICONS] ?? Sparkles;
                return (
                  <div
                    key={pref.id}
                    className="flex gap-2 rounded-lg border border-border/60 p-2.5"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-foreground">{pref.label}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                        {pref.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </TripDetailSection>
        </div>
      }
      sidebar={
        <>
          <TripDetailSection
            title="协作状态"
            className="shadow-none"
            headerClassName="px-3 py-2"
            bodyClassName="p-3"
          >
            <div className="flex items-center gap-3">
              {donutData.length > 0 ? (
                <ResponsiveContainer width={72} height={72}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      innerRadius={22}
                      outerRadius={32}
                      paddingAngle={1}
                    >
                      {donutData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {derived.progressPercent || derived.collaboration.overallPercent}%
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">整体协作进度</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div>
                <p className="font-semibold tabular-nums text-foreground">
                  {derived.collaboration.completedPercent}%
                </p>
                <p className="text-muted-foreground">已完成</p>
              </div>
              <div>
                <p className="font-semibold tabular-nums text-foreground">
                  {derived.collaboration.inProgressPercent}%
                </p>
                <p className="text-muted-foreground">进行中</p>
              </div>
              <div>
                <p className="font-semibold tabular-nums text-foreground">
                  {derived.collaboration.pendingPercent}%
                </p>
                <p className="text-muted-foreground">待处理</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-border/60 pt-2.5 text-center text-[10px]">
              <div>
                <p className="font-semibold text-foreground">{derived.stats.sharedTasks}</p>
                <p className="text-muted-foreground">共享任务</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">{derived.stats.pendingApproval}</p>
                <p className="text-muted-foreground">待审批</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">{derived.discussionCount}</p>
                <p className="text-muted-foreground">讨论消息</p>
              </div>
            </div>
          </TripDetailSection>

          {derived.unconfirmed.length > 0 ? (
            <TripDetailSection
              title="未确认成员"
              className="shadow-none"
              headerClassName="px-3 py-2"
              bodyClassName="p-3"
            >
              <ul className="space-y-2">
                {derived.unconfirmed.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <CollaboratorAvatar displayName={member.displayName} size="sm" />
                      <span className="truncate text-xs text-foreground">{member.displayName}</span>
                      <Badge variant="outline" className={cn('h-5 text-[10px]', tripDetailUi.tagConfirm)}>
                        待确认
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" className="h-6 shrink-0 px-2 text-[10px]">
                      提醒
                    </Button>
                  </li>
                ))}
              </ul>
              <Button variant="link" className={cn(tripDetailUi.linkInline, 'mt-1.5')}>
                重新发送邀请
              </Button>
            </TripDetailSection>
          ) : null}

          <TripDetailSection
            title="成员分布"
            className="shadow-none"
            headerClassName="px-3 py-2"
            bodyClassName="p-3"
          >
            <div className="space-y-1.5">
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${derived.confirmedRatio}%` }}
                />
                <div
                  className="h-full bg-muted-foreground/30"
                  style={{ width: `${100 - derived.confirmedRatio}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>已确认 {derived.confirmedRatio}%</span>
                <span>待确认 {100 - derived.confirmedRatio}%</span>
              </div>
            </div>
          </TripDetailSection>

          <TripDetailSection
            title="待处理事项"
            className="shadow-none"
            headerClassName="px-3 py-2"
            bodyClassName="p-3"
          >
            {pendingItems.length > 0 ? (
              <ul className="space-y-2">
                {pendingItems.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-2 text-xs">
                    <div className="flex min-w-0 items-start gap-1.5">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate-confirm-foreground" />
                      <span className="line-clamp-2 text-foreground">{item.title}</span>
                    </div>
                    <Button variant="link" className={tripDetailUi.linkInline} onClick={openCollabCenter}>
                      查看
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">暂无待处理事项</p>
            )}
            {pendingItems.length > 0 ? (
              <Button variant="link" className={cn(tripDetailUi.linkInline, 'mt-1.5')} onClick={openCollabCenter}>
                查看全部 {pendingItems.length} 项
                <ChevronRight className="ml-0.5 h-3 w-3" />
              </Button>
            ) : null}
          </TripDetailSection>
        </>
      }
    />
  );
}
