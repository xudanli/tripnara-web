import { Check, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CollaboratorAvatar,
  CollaboratorOverflowBadge,
} from '@/components/plan-studio/workbench/CollaboratorAvatar';
import {
  resolveBranchMemberCount,
  resolveBranchMembers,
  resolveSegmentDurationLabel,
  segmentHighlightsExcludingSubtitle,
  segmentLabel,
  segmentSubtitle,
} from '@/lib/planning-day-split-display.util';
import type { Collaborator } from '@/types/trip';
import type {
  PlanningDaySplitBranchDto,
  PlanningDaySplitMemberDto,
  PlanningDaySplitSegmentDto,
} from '@/types/planning-day-split';
import {
  workbenchSplitBranchBadgeClass,
  workbenchSplitBranchTheme,
  workbenchSplitGroupCardClass,
  workbenchSplitSegmentRiskClass,
  type WorkbenchSplitBranchVariant,
} from './workbench-ui';

function resolveBranchIndex(letter?: string, variant?: WorkbenchSplitBranchVariant): number {
  if (letter?.toUpperCase() === 'B') return 1;
  if (letter?.toUpperCase() === 'A') return 0;
  if (variant === 'orange') return 1;
  return 0;
}

export interface SplitPlanGroupMembersProps {
  memberCount: number;
  members?: PlanningDaySplitMemberDto[];
  memberIds?: string[];
  groupId?: string;
  groupLabel?: string;
  collaborators?: Collaborator[];
  branchIndex?: number;
  branchVariant?: WorkbenchSplitBranchVariant;
  /** 摘要卡仅展示头像堆叠（图3 右栏 / 时间轴卡片） */
  compact?: boolean;
}

export function SplitPlanGroupMembers({
  memberCount,
  members: membersProp,
  memberIds,
  groupId = '',
  groupLabel = '',
  collaborators,
  branchIndex = 0,
  branchVariant,
  compact = false,
}: SplitPlanGroupMembersProps) {
  const branchLike = {
    id: groupId,
    groupId,
    groupLabel,
    memberCount,
    members: membersProp,
    memberIds,
    segments: [],
  } satisfies PlanningDaySplitBranchDto;

  const members = resolveBranchMembers(branchLike, collaborators);
  const count = resolveBranchMemberCount(branchLike, members);
  const branchTheme = workbenchSplitBranchTheme(branchIndex, branchVariant);

  if (members.length === 0 && count === 0) return null;

  const visible = members.slice(0, compact ? 4 : 5);
  const overflow = members.length > visible.length ? members.length - visible.length : 0;

  return (
    <div className={cn('space-y-1.5', compact ? 'mt-2' : 'mt-2')}>
      {visible.length > 0 ? (
        <div className="flex items-center -space-x-1.5">
          {visible.map((member) => (
            <CollaboratorAvatar
              key={member.id}
              displayName={member.displayName}
              avatarUrl={member.avatarUrl}
              size="xs"
              className={cn('border-background', branchTheme.avatar)}
            />
          ))}
          {overflow > 0 ? <CollaboratorOverflowBadge count={overflow} size="xs" /> : null}
        </div>
      ) : null}
      {!compact && members.length > 0 ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {members.map((member) => member.displayName).join(' · ')}
        </p>
      ) : null}
    </div>
  );
}

/** 中栏时间轴 · 紧凑 POI 行（非嵌套卡片） */
export function SplitPlanTimelineSegmentLines({
  segments,
}: {
  segments: PlanningDaySplitSegmentDto[];
}) {
  if (segments.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {segments.map((segment) => {
        const place = segmentLabel(segment);
        const subtitle = segmentSubtitle(segment);
        const duration = resolveSegmentDurationLabel(segment);
        const highlights = segmentHighlightsExcludingSubtitle(segment);

        return (
          <li key={segment.id} className="flex items-start gap-2 text-[11px]">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-foreground">{place}</span>
                {duration ? (
                  <span className="shrink-0 tabular-nums text-muted-foreground">{duration}</span>
                ) : null}
              </div>
              {subtitle ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>
              ) : null}
              {highlights.map((item) => (
                <p key={item} className="mt-0.5 text-[10px] text-muted-foreground">
                  {item}
                </p>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 右栏分流 Tab · highlights 摘要（图3），不用 POI 列表 */
export function SplitPlanGroupHighlightList({
  items,
  branchIndex = 0,
  variant,
}: {
  items: string[];
  branchIndex?: number;
  variant?: WorkbenchSplitBranchVariant;
}) {
  if (items.length === 0) return null;

  const checkIconClass = workbenchSplitBranchTheme(branchIndex, variant).checkIcon;

  return (
    <ul className="mt-2 space-y-1">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Check className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', checkIconClass)} aria-hidden />
          <span className="leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export interface SplitGroupCardProps {
  label: string;
  /** BFF `activityTitle` — 组主题（高强度体验 / 舒适休息） */
  theme: string;
  highlights: string[];
  avatarUrls?: string[];
  members?: PlanningDaySplitMemberDto[];
  memberCount: number;
  variant?: 'blue' | 'orange' | 'purple';
  letter?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  costPerPerson?: string;
  className?: string;
}

function SplitGroupAvatarUrls({ urls, max = 4 }: { urls: string[]; max?: number }) {
  const visible = urls.slice(0, max);
  const overflow = urls.length > max ? urls.length - max : 0;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <div className="flex items-center -space-x-1.5">
        {visible.map((url, index) => (
          <CollaboratorAvatar key={`${url}-${index}`} avatarUrl={url} size="xs" />
        ))}
        {overflow > 0 ? <CollaboratorOverflowBadge count={overflow} size="xs" /> : null}
      </div>
    </div>
  );
}

/** 右栏 · 分流详情卡片（`splitPlan.groups[]` SSOT，图3） */
export function SplitGroupCard({
  label,
  theme,
  highlights,
  avatarUrls,
  members,
  memberCount,
  variant = 'blue',
  letter,
  riskLevel,
  costPerPerson,
  className,
}: SplitGroupCardProps) {
  const branchIndex = resolveBranchIndex(letter, variant);
  const branchTheme = workbenchSplitBranchTheme(branchIndex, variant);

  return (
    <div className={cn(workbenchSplitGroupCardClass(branchIndex, variant), className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">{label}</p>
          {theme ? (
            <p className={cn('mt-0.5 text-[11px] font-medium', branchTheme.themeText)}>{theme}</p>
          ) : null}
        </div>
        {letter ? (
          <span
            className={cn(
              'inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-md px-1 text-[10px] font-bold',
              workbenchSplitBranchBadgeClass(branchIndex, variant),
            )}
          >
            {letter}
          </span>
        ) : null}
      </div>

      <SplitPlanGroupHighlightList items={highlights} branchIndex={branchIndex} variant={variant} />

      {avatarUrls && avatarUrls.length > 0 ? (
        <SplitGroupAvatarUrls urls={avatarUrls} />
      ) : (
        <SplitPlanGroupMembers
          memberCount={memberCount}
          members={members}
          branchIndex={branchIndex}
          branchVariant={variant}
          compact
        />
      )}

      {riskLevel || costPerPerson ? (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          {riskLevel ? (
            <span
              className={cn(
                'rounded-md border px-2 py-0.5',
                workbenchSplitSegmentRiskClass(riskLevel),
              )}
            >
              风险 {riskLevel === 'low' ? '低' : riskLevel === 'medium' ? '中' : '高'}
            </span>
          ) : null}
          {costPerPerson ? (
            <span className="rounded-md border border-border/60 bg-background/80 px-2 py-0.5 font-medium text-foreground">
              {costPerPerson}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
