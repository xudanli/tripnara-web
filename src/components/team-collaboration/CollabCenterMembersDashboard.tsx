import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  ChevronRight,
  ClipboardList,
  Download,
  Footprints,
  Heart,
  Scale,
  Shield,
  Sparkles,
  ThumbsUp,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useTeamRequirementProfile } from '@/hooks/useTeamRequirementProfile';
import {
  buildRequirementRadarAxes,
  buildRequirementSummaryCards,
  computeMemberRequirementProgress,
  conflictRiskLabel,
  memberInitials,
  progressBarTone,
  REQUIREMENT_SECTIONS,
  type RequirementSectionId,
  type RequirementSummaryCard,
} from '@/lib/collab-members-requirement.util';
import { cn } from '@/lib/utils';
import { workbenchCard, workbenchPanelTitle } from '@/components/plan-studio/workbench/workbench-ui';
import { collabDashboardGrid, collabDashboardSpan, collabPageStack } from './collab-dashboard-layout';
import { RequirementSpreadRadarChart } from './widgets/RequirementSpreadRadarChart';
import { CollabRequirementStatusBanner } from './widgets/CollabRequirementStatusBanner';
import { MemberRoleInvitesEntryCard } from './widgets/MemberRoleInvitesEntryCard';
import type { TeamRequirementProfile } from '@/types/team-requirement-profile';
import type { TripDetail } from '@/types/trip';

const SECTION_ICONS: Record<RequirementSectionId, typeof Sparkles> = {
  'core-wish': Sparkles,
  experience: Shield,
  pace: Footprints,
  lodging: BedDouble,
  'diet-health': UtensilsCrossed,
  spending: Wallet,
};

const SUMMARY_CARD_STYLES: Record<
  RequirementSummaryCard['tone'],
  { border: string; icon: typeof Heart; iconWrap: string }
> = {
  green: {
    border: 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20',
    icon: Heart,
    iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  red: {
    border: 'border-rose-200/80 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20',
    icon: Shield,
    iconWrap: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  blue: {
    border: 'border-sky-200/80 bg-sky-50/40 dark:border-sky-900/50 dark:bg-sky-950/20',
    icon: ThumbsUp,
    iconWrap: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  },
  orange: {
    border: 'border-amber-200/80 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20',
    icon: Scale,
    iconWrap: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
};

function DashboardSkeleton() {
  return (
    <div className={collabPageStack}>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className={collabDashboardGrid}>
        <Skeleton className={cn('h-96 rounded-xl', collabDashboardSpan({ md: 6, lg: 4 }))} />
        <Skeleton className={cn('h-96 rounded-xl', collabDashboardSpan({ md: 6, lg: 4 }))} />
        <Skeleton className={cn('h-96 rounded-xl', collabDashboardSpan({ md: 6, lg: 4 }))} />
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
}

function QuestionnaireProgressCard({ profile }: { profile: TeamRequirementProfile }) {
  const memberProgress = profile.members.map(computeMemberRequirementProgress);

  return (
    <section className={cn(workbenchCard, 'flex h-full min-h-0 flex-col p-3')}>
      <h3 className={workbenchPanelTitle}>行前需求问卷 · 填写进度</h3>
      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
        采集核心愿望、硬性限制、节奏、住宿、餐饮与预算倾向；仅展示完成度与缺失项。
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {REQUIREMENT_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.id];
          return (
            <span
              key={section.id}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground"
            >
              <Icon className="h-3 w-3" />
              {section.label}
            </span>
          );
        })}
      </div>

      <ul className="mt-3 min-h-0 flex-1 space-y-2">
        {memberProgress.map((member) => (
          <li key={member.userId} className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                {memberInitials(member.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-foreground">{member.displayName}</span>
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {member.completionPct}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', progressBarTone(member.completionPct))}
                  style={{ width: `${member.completionPct}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-auto shrink-0 border-t border-border/50 pt-3">
        <Button type="button" variant="link" className="h-auto p-0 text-xs text-primary">
          查看需求明细
          <ChevronRight className="ml-0.5 h-3 w-3" />
        </Button>
      </div>
    </section>
  );
}

function FrictionInsightsCard({
  profile,
  frictionEnabled,
  onFrictionEnabledChange,
  radarAxes,
}: {
  profile: TeamRequirementProfile;
  frictionEnabled: boolean;
  onFrictionEnabledChange: (value: boolean) => void;
  radarAxes: ReturnType<typeof buildRequirementRadarAxes>;
}) {
  const conflicts = profile.potentialConflicts.slice(0, 4);

  return (
    <section className={cn(workbenchCard, 'flex h-full min-h-0 flex-col p-3')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className={workbenchPanelTitle}>团队需求差异与冲突洞察</h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">差异强度越高，协商优先级越高</p>
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
          摩擦雷达
          <Switch checked={frictionEnabled} onCheckedChange={onFrictionEnabledChange} />
        </label>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex shrink-0 justify-center lg:w-[52%]">
          <RequirementSpreadRadarChart axes={radarAxes} showIdealBand={frictionEnabled} />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground">关键洞察</p>
          {conflicts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground">
              暂无显著冲突，团队需求整体较为一致。
            </p>
          ) : (
            conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-muted/10 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{conflict.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                    {conflict.description}
                  </p>
                </div>
                <Badge
                  variant={conflict.severity === 'high' ? 'destructive' : 'outline'}
                  className="shrink-0 text-[10px]"
                >
                  {conflictRiskLabel(conflict)}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-auto flex shrink-0 flex-wrap gap-3 pt-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-4 rounded-sm bg-primary/70" />
          团队差异强度
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-4 rounded-sm border border-dashed border-muted-foreground/50 bg-muted/40" />
          理想共识区间
        </span>
      </div>
    </section>
  );
}

function ProgressSummaryCard({ profile }: { profile: TeamRequirementProfile }) {
  const rows = profile.members.map(computeMemberRequirementProgress);

  const handleExport = () => {
    toast.message('汇总导出功能即将上线');
  };

  const handleNudge = (name: string) => {
    toast.success(`已向 ${name} 发送填写提醒`);
  };

  return (
    <section className={cn(workbenchCard, 'flex h-full min-h-0 flex-col p-3')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={workbenchPanelTitle}>填写进度与汇总视图</h3>
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-[10px]" onClick={handleExport}>
          <Download className="h-3 w-3" />
          导出汇总
        </Button>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-[11px]">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground">
              <th className="pb-2 pr-2 font-medium">成员</th>
              <th className="pb-2 pr-2 font-medium">完成度</th>
              <th className="pb-2 pr-2 font-medium">缺失项</th>
              <th className="pb-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId} className="border-b border-border/40 last:border-0">
                <td className="py-2.5 pr-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-muted text-[9px]">{memberInitials(row.displayName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{row.displayName}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-2 tabular-nums text-foreground">{row.completionPct}%</td>
                <td className="py-2.5 pr-2 text-muted-foreground">
                  {row.missingLabels.length > 0 ? row.missingLabels.join('、') : '—'}
                </td>
                <td className="py-2.5">
                  {row.completionPct >= 100 ? (
                    <Button type="button" variant="link" className="h-auto p-0 text-[10px]">
                      查看详情
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-[10px] text-primary"
                      onClick={() => handleNudge(row.displayName)}
                    >
                      催填
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-auto shrink-0 border-t border-border/50 pt-3">
        <Button type="button" variant="link" className="h-auto p-0 text-xs text-primary">
          查看完整汇总
          <ChevronRight className="ml-0.5 h-3 w-3" />
        </Button>
      </div>
    </section>
  );
}

function RequirementSummaryStrip({ cards }: { cards: RequirementSummaryCard[] }) {
  return (
    <section className={cn(workbenchCard, 'p-3')}>
      <h3 className={workbenchPanelTitle}>需求汇总</h3>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {cards.map((card) => {
          const style = SUMMARY_CARD_STYLES[card.tone];
          const Icon = style.icon;
          return (
            <article
              key={card.id}
              className={cn(
                'min-w-[220px] flex-1 rounded-xl border p-3 sm:min-w-[240px]',
                style.border,
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', style.iconWrap)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-xs font-semibold text-foreground">{card.title}</h4>
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {card.items.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {card.memberNames && card.memberNames.length > 0 ? (
                <div className="mt-2 flex items-center gap-1">
                  {card.memberNames.slice(0, 4).map((name) => (
                    <Avatar key={name} className="h-5 w-5 border border-background">
                      <AvatarFallback className="bg-primary/10 text-[8px] text-primary">
                        {memberInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export interface CollabCenterMembersDashboardProps {
  tripId: string;
  trip?: TripDetail;
  collaborators?: Array<{ userId: string; displayName?: string | null; role?: string }>;
  includeFriction?: boolean;
  advisorLed?: boolean;
  onOpenRoleInvites?: () => void;
  onTripRefetch?: () => void | Promise<void>;
  className?: string;
}

/** 团队协作中心 · 团队与需求 Tab 仪表盘 */
export function CollabCenterMembersDashboard({
  tripId,
  trip,
  collaborators,
  includeFriction = true,
  advisorLed = false,
  onOpenRoleInvites,
  onTripRefetch,
  className,
}: CollabCenterMembersDashboardProps) {
  const [frictionEnabled, setFrictionEnabled] = useState(true);
  const { profile, loading, error, dataSource, frictionMatrix } = useTeamRequirementProfile(tripId, {
    collaborators,
    includeFriction: includeFriction && frictionEnabled,
  });

  const radarAxes = useMemo(() => {
    if (!profile) return [];
    return buildRequirementRadarAxes(profile, frictionMatrix);
  }, [profile, frictionMatrix]);

  const summaryCards = useMemo(() => {
    if (!profile) return [];
    return buildRequirementSummaryCards(profile);
  }, [profile]);

  if (loading) {
    return (
      <div className={className}>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(workbenchCard, 'p-4 text-sm text-muted-foreground', className)}>
        <div className="mb-2 flex items-center gap-2 text-foreground">
          <AlertTriangle className="h-4 w-4" />
          加载团队需求失败
        </div>
        {(error as Error).message ?? '请稍后重试'}
      </div>
    );
  }

  if (!profile || (profile.members.length === 0 && profile.submittedCount === 0)) {
    return (
      <div className={cn(collabPageStack, className)}>
        {trip ? (
          <MemberRoleInvitesEntryCard
            trip={trip}
            onOpenInvites={onOpenRoleInvites}
            onTripRefetch={onTripRefetch}
            compact
          />
        ) : (
          <div className={cn(workbenchCard, 'flex items-center gap-3 p-3')}>
            <ClipboardList className="h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
              {advisorLed
                ? '发送邀请链接后，成员填写偏好问卷将在此展示进度。'
                : '生成邀请链接并发送给同行成员后，填写进度将显示在此。'}
            </p>
            {onOpenRoleInvites ? (
              <Button type="button" size="sm" className="h-7 shrink-0 text-xs" onClick={onOpenRoleInvites}>
                管理邀请
              </Button>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(collabPageStack, className)}>
      <CollabRequirementStatusBanner
        profile={profile}
        onManageInvites={onOpenRoleInvites}
      />

      {dataSource === 'trip_metadata' ? (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          画像 BFF 尚未就绪，当前展示 metadata 中的问卷数据；完整缺口与隐私脱敏将在接口就绪后自动补齐。
        </p>
      ) : null}

      <div className={cn(collabDashboardGrid, 'items-stretch')}>
        <div className={cn(collabDashboardSpan({ md: 6, lg: 4 }), 'h-full')}>
          <QuestionnaireProgressCard profile={profile} />
        </div>
        <div className={cn(collabDashboardSpan({ md: 6, lg: 4 }), 'h-full')}>
          <FrictionInsightsCard
            profile={profile}
            frictionEnabled={frictionEnabled}
            onFrictionEnabledChange={setFrictionEnabled}
            radarAxes={radarAxes}
          />
        </div>
        <div className={cn(collabDashboardSpan({ md: 6, lg: 4 }), 'h-full')}>
          <ProgressSummaryCard profile={profile} />
        </div>
      </div>

      <RequirementSummaryStrip cards={summaryCards} />

      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
        数据由成员问卷与行为数据生成；AI 分析仅供参考，最终决策请结合团队沟通确认。
      </p>
    </div>
  );
}
