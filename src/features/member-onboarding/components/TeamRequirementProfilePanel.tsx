import {
  AlertTriangle,
  BedDouble,
  ClipboardList,
  Footprints,
  Lock,
  ShieldAlert,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamRequirementProfile } from '@/hooks/useTeamRequirementProfile';
import { cn } from '@/lib/utils';
import type {
  TeamRequirementMemberView,
  TeamRequirementProfile,
  TeamSpreadInsight,
  TeamSpreadSeverity,
} from '@/types/team-requirement-profile';

export interface TeamRequirementProfilePanelProps {
  tripId: string;
  collaborators?: Array<{ userId: string; displayName?: string | null; role?: string }>;
  className?: string;
  /** 紧凑模式用于协作中心仪表盘 */
  compact?: boolean;
  /** 编排行程等窄侧栏：单列、弱化页眉 */
  sidebar?: boolean;
  /** 是否合并决策画像摩擦雷达（顾问制默认关闭） */
  includeFriction?: boolean;
}

function spreadSeverityClass(severity: TeamSpreadSeverity): string {
  if (severity === 'aligned') return 'border-gate-allow-border bg-gate-allow/10 text-gate-allow-foreground';
  if (severity === 'mixed') return 'border-gate-suggest-border bg-gate-suggest/10 text-gate-suggest-foreground';
  return 'border-gate-reject-border bg-gate-reject/10 text-gate-reject-foreground';
}

function conflictSeverityVariant(severity: 'high' | 'medium' | 'low') {
  if (severity === 'high') return 'destructive' as const;
  if (severity === 'medium') return 'outline' as const;
  return 'secondary' as const;
}

function SpreadCard({ insight }: { insight: TeamSpreadInsight }) {
  return (
    <div className={cn('rounded-lg border p-3', spreadSeverityClass(insight.severity))}>
      <p className="text-[11px] font-medium">{insight.label}</p>
      <p className="mt-1 text-xs leading-snug">{insight.summary}</p>
      {insight.detail ? (
        <p className="mt-1.5 text-[10px] leading-snug opacity-80">{insight.detail}</p>
      ) : null}
    </div>
  );
}

function MemberRequirementCard({ member }: { member: TeamRequirementMemberView }) {
  const wishes = member.coreWishes.length > 0 ? member.coreWishes.join('、') : '—';

  return (
    <article
      className={cn(
        'rounded-xl border border-border/70 bg-card p-3',
        !member.submitted && 'opacity-75',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{member.displayName}</p>
          {member.roleLabel ? (
            <p className="text-[10px] text-muted-foreground">{member.roleLabel}</p>
          ) : null}
        </div>
        <Badge variant={member.submitted ? 'secondary' : 'outline'} className="shrink-0 text-[10px]">
          {member.submitted ? '已提交' : '待填写'}
        </Badge>
      </div>

      {member.submitted ? (
        <dl className="mt-3 space-y-2 text-[11px]">
          <div>
            <dt className="flex items-center gap-1 font-medium text-foreground">
              <Sparkles className="h-3 w-3 text-muted-foreground" />
              核心愿望
            </dt>
            <dd className="mt-0.5 text-muted-foreground">{wishes}</dd>
          </div>

          {(member.hardConstraints.must || member.hardConstraints.avoid) && (
            <div>
              <dt className="flex items-center gap-1 font-medium text-foreground">
                <ShieldAlert className="h-3 w-3 text-muted-foreground" />
                硬性限制
              </dt>
              <dd className="mt-0.5 space-y-0.5 text-muted-foreground">
                {member.hardConstraints.must ? <p>必体验：{member.hardConstraints.must}</p> : null}
                {member.hardConstraints.avoid ? <p>需避开：{member.hardConstraints.avoid}</p> : null}
              </dd>
            </div>
          )}

          <div>
            <dt className="flex items-center gap-1 font-medium text-foreground">
              <Footprints className="h-3 w-3 text-muted-foreground" />
              体力节奏
            </dt>
            <dd className="mt-0.5 text-muted-foreground">
              {member.pace.preferenceLabel}
              {member.pace.maxDailyWalkKm != null ? ` · 日步行约 ${member.pace.maxDailyWalkKm} km` : ''}
              {member.pace.earlyRiser ? ' · 可早起' : ' · 不偏好早起'}
            </dd>
          </div>

          {member.lodging ? (
            <div>
              <dt className="flex items-center gap-1 font-medium text-foreground">
                <BedDouble className="h-3 w-3 text-muted-foreground" />
                住宿偏好
              </dt>
              <dd className="mt-0.5 text-muted-foreground">{member.lodging}</dd>
            </div>
          ) : null}

          {(member.diet.restrictions || member.diet.healthNotes) && (
            <div>
              <dt className="flex items-center gap-1 font-medium text-foreground">
                <UtensilsCrossed className="h-3 w-3 text-muted-foreground" />
                饮食健康
              </dt>
              <dd className="mt-0.5 text-muted-foreground">
                {[member.diet.restrictions, member.diet.healthNotes].filter(Boolean).join('；') || '—'}
              </dd>
            </div>
          )}

          <div>
            <dt className="flex items-center gap-1 font-medium text-foreground">
              <Wallet className="h-3 w-3 text-muted-foreground" />
              消费倾向
            </dt>
            <dd className="mt-0.5 text-muted-foreground">
              {member.spending.levelLabel}
              {member.spending.notes ? `（${member.spending.notes}）` : ''}
            </dd>
          </div>

          <div>
            <dt className="font-medium text-foreground">分流态度</dt>
            <dd className="mt-0.5 text-muted-foreground">
              {member.splitGroup.acceptLabel}
              {member.splitGroup.notes ? `：${member.splitGroup.notes}` : ''}
            </dd>
          </div>

          {member.privateConcern.hasNotes ? (
            <div className="rounded-md border border-dashed border-border/80 bg-muted/30 p-2">
              <dt className="flex items-center gap-1 font-medium text-foreground">
                <Lock className="h-3 w-3 text-muted-foreground" />
                私密顾虑
              </dt>
              <dd className="mt-0.5 text-muted-foreground">
                {member.privateConcern.advisorVisible
                  ? member.privateConcern.summary
                  : '已提交私密信息（仅分析师可见）'}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground">尚未提交偏好问卷，无法纳入规划画像。</p>
      )}
    </article>
  );
}

function ProfileContent({
  profile,
  compact,
  sidebar,
}: {
  profile: TeamRequirementProfile;
  compact?: boolean;
  sidebar?: boolean;
}) {
  const hasSubmitted = profile.submittedCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {profile.submittedCount}/{profile.expectedCount || profile.members.length} 人已提交
          </span>
        </div>
        <div className="flex min-w-[140px] flex-1 items-center gap-2 sm:max-w-xs">
          <Progress value={profile.completionRate} className="h-1.5" />
          <span className="text-[10px] tabular-nums text-muted-foreground">{profile.completionRate}%</span>
        </div>
      </div>

      {hasSubmitted ? (
        <div
          className={cn(
            'grid gap-2',
            sidebar ? 'grid-cols-1' : compact ? 'sm:grid-cols-3' : 'sm:grid-cols-3',
          )}
        >
          <SpreadCard insight={profile.paceSpread} />
          <SpreadCard insight={profile.spendingSpread} />
          <SpreadCard insight={profile.splitWillingness} />
        </div>
      ) : null}

      <div>
        <h4 className="mb-2 text-xs font-semibold text-foreground">成员需求明细</h4>
        <div
          className={cn(
            'grid gap-2',
            sidebar
              ? 'grid-cols-1'
              : compact
                ? 'sm:grid-cols-2 lg:grid-cols-3'
                : 'md:grid-cols-2 xl:grid-cols-3',
          )}
        >
          {profile.members.map((member) => (
            <MemberRequirementCard key={member.userId} member={member} />
          ))}
        </div>
      </div>

      {profile.potentialConflicts.length > 0 ? (
        <div className="rounded-xl border border-gate-reject-border/50 bg-gate-reject/5 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            潜在冲突
          </h4>
          <ul className="mt-2 space-y-2">
            {profile.potentialConflicts.map((conflict) => (
              <li key={conflict.id} className="rounded-lg border border-border/60 bg-card p-2.5 text-[11px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{conflict.title}</span>
                  <Badge variant={conflictSeverityVariant(conflict.severity)} className="text-[10px]">
                    {conflict.severity === 'high' ? '高' : conflict.severity === 'medium' ? '中' : '低'}
                  </Badge>
                </div>
                <p className="mt-1 leading-snug text-muted-foreground">{conflict.description}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {profile.informationGaps.length > 0 ? (
        <div className="rounded-xl border border-border/70 bg-card p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <ClipboardList className="h-3.5 w-3.5" />
            信息缺口
          </h4>
          <ul className="mt-2 space-y-1.5">
            {profile.informationGaps.map((gap) => (
              <li
                key={gap.userId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 px-2.5 py-2 text-[11px]"
              >
                <div>
                  <span className="font-medium text-foreground">{gap.displayName}</span>
                  {gap.role ? (
                    <span className="ml-1.5 text-muted-foreground">{gap.role}</span>
                  ) : null}
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {gap.reasonLabel}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {profile.privacySummary.totalWithPrivateNotes > 0 ? (
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <Badge variant="secondary">
            私密信息 {profile.privacySummary.totalWithPrivateNotes} 条
          </Badge>
          {profile.privacySummary.sanitizedToAdvisorCount > 0 ? (
            <Badge variant="outline">
              脱敏可见 {profile.privacySummary.sanitizedToAdvisorCount}
            </Badge>
          ) : null}
          {profile.privacySummary.analystOnlyCount > 0 ? (
            <Badge variant="outline">
              仅分析师 {profile.privacySummary.analystOnlyCount}
            </Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PanelSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-48" />
      <div className="grid gap-2 sm:grid-cols-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <div className={cn('grid gap-2', compact ? 'sm:grid-cols-2' : 'md:grid-cols-2')}>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}

export function TeamRequirementProfilePanel({
  tripId,
  collaborators,
  className,
  compact = false,
  sidebar = false,
  includeFriction = true,
}: TeamRequirementProfilePanelProps) {
  const { profile, loading, error, dataSource } = useTeamRequirementProfile(tripId, {
    collaborators,
    includeFriction,
  });

  const panelPadding = sidebar ? 'p-2.5' : compact ? 'p-3' : 'p-4';

  if (loading) {
    return (
      <section className={cn('rounded-xl border border-border bg-card', panelPadding, className)}>
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">团队需求画像</h3>
        </div>
        <PanelSkeleton compact={compact || sidebar} />
      </section>
    );
  }

  if (error) {
    return (
      <section className={cn('rounded-xl border border-border bg-card', panelPadding, className)}>
        <div className="mb-2 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">团队需求画像</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          加载失败：{(error as Error).message ?? '请稍后重试'}
        </p>
      </section>
    );
  }

  if (!profile) {
    return null;
  }

  const empty = profile.members.length === 0 && profile.submittedCount === 0;

  return (
    <section className={cn('rounded-xl border border-border bg-card', panelPadding, className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">团队需求画像</h3>
            {!sidebar ? (
              <p className="text-[10px] text-muted-foreground">
                由成员偏好问卷整理，可直接用于行程规划（非原始问卷堆积）
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground">成员问卷汇总 · 编排参考</p>
            )}
          </div>
        </div>
        {profile.submittedCount > 0 ? (
          <Badge variant="secondary" className="text-[10px]">
            可用于规划
          </Badge>
        ) : null}
      </div>

      {dataSource === 'trip_metadata' ? (
        <p className="mb-3 rounded-md border border-amber-200/80 bg-amber-50/60 px-2.5 py-2 text-[10px] text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          画像 BFF 尚未就绪，当前仅显示 metadata 中已提交的问卷；待后端注册
          {' '}
          <code className="text-[10px]">GET /trips/:tripId/member-onboarding-profiles</code>
          {' '}
          后将展示完整缺口与隐私脱敏。
        </p>
      ) : null}

      {empty ? (
        <p className="text-xs text-muted-foreground">
          成员提交偏好问卷后，将在此展示核心愿望、硬性限制、节奏差异等团队画像。
        </p>
      ) : (
        <ProfileContent profile={profile} compact={compact || sidebar} sidebar={sidebar} />
      )}
    </section>
  );
}
