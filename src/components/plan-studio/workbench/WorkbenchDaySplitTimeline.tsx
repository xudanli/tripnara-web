import { Fragment } from 'react';
import {
  Car,
  Clock,
  Flame,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  segmentLabel,
  segmentHighlightsExcludingSubtitle,
  segmentSubtitle,
  resolveSegmentDurationLabel,
} from '@/lib/planning-day-split-display.util';
import type { Collaborator } from '@/types/trip';
import type {
  PlanningDaySplitBranchDto,
  PlanningDaySplitDto,
  PlanningDaySplitSegmentDto,
} from '@/types/planning-day-split';
import {
  SplitPlanGroupMembers,
  SplitPlanTimelineSegmentLines,
} from './split-plan-group-display';
import {
  workbenchFeasibilityBadge,
  workbenchSplitBranchTheme,
  type WorkbenchSplitBranchVariant,
  workbenchSplitForkArmArrowClass,
  workbenchSplitForkArmLineClass,
  workbenchSplitForkDot,
  workbenchSplitForkZone,
  workbenchSplitRejoinSurface,
  workbenchSplitSegmentRiskClass,
  workbenchSplitStatsBar,
  workbenchSplitTimelineShell,
  workbenchSecondaryMetric,
} from './workbench-ui';

export interface WorkbenchDaySplitTimelineProps {
  split: PlanningDaySplitDto;
  collaborators?: Collaborator[];
  className?: string;
}

/** 时间列 + 主轴 + 内容区 · 与 shared 行对齐 */
const TIMELINE_GRID =
  'grid grid-cols-[2.75rem_1.75rem_minmax(0,1fr)] gap-x-3';

/** 主轴圆心 X（相对 li） */
const TIMELINE_SPINE_X = 'left-[calc(2.75rem+0.75rem+0.875rem-0.5px)]';

function SplitBranchForkArm({
  branchIndex,
  branchVariant,
}: {
  branchIndex: number;
  branchVariant?: WorkbenchSplitBranchVariant;
}) {
  /** gap-x-3 + 主轴列半宽 → 从圆心引至卡片左缘 */
  const armSpan = 'w-[1.625rem] -left-[1.625rem]';

  return (
    <div
      className={cn(
        'pointer-events-none absolute top-[1.125rem] z-[2]',
        armSpan,
      )}
      aria-hidden
    >
      <span
        className={cn(
          'block w-full rounded-full',
          workbenchSplitForkArmLineClass(branchIndex, branchVariant),
        )}
      />
      <span
        className={cn(
          'absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2 translate-x-0.5 border-y-[3px] border-l-[4px] border-y-transparent',
          workbenchSplitForkArmArrowClass(branchIndex, branchVariant),
        )}
      />
    </div>
  );
}

function ForkBranchesSection({
  branches,
  forkTime,
  hasSpineAbove,
  hasSpineBelow,
  collaborators,
}: {
  branches: PlanningDaySplitBranchDto[];
  forkTime: string;
  hasSpineAbove: boolean;
  hasSpineBelow: boolean;
  collaborators?: Collaborator[];
}) {
  const rowCount = Math.max(branches.length, 1);

  return (
    <li className={cn('relative pb-5', TIMELINE_GRID, branches.length > 1 && 'gap-y-3', workbenchSplitForkZone)}>
      {hasSpineAbove ? (
        <span
          className={cn(
            'pointer-events-none absolute top-0 z-0 h-3 w-px bg-border/80',
            TIMELINE_SPINE_X,
          )}
          aria-hidden
        />
      ) : null}

      <div
        className="relative z-[1] flex justify-center self-start pt-0.5"
        style={{ gridColumn: 2, gridRow: `1 / span ${rowCount}` }}
      >
        <div className="flex w-7 flex-col items-center">
          <TimelineDot fork />
          {branches.length > 1 ? (
            <span
              className={cn(
                'mt-0.5 min-h-4 w-px flex-1 border-l border-dashed border-border/50',
              )}
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      {branches.map((branch, index) => (
        <Fragment key={branch.id}>
          <div className="pt-1" style={{ gridColumn: 1, gridRow: index + 1 }}>
            {index === 0 ? (
              <span className="text-xs font-semibold tabular-nums text-foreground">{forkTime}</span>
            ) : null}
          </div>
          <div className="relative min-w-0" style={{ gridColumn: 3, gridRow: index + 1 }}>
            <SplitBranchForkArm
              branchIndex={index}
              branchVariant={branch.variant as WorkbenchSplitBranchVariant | undefined}
            />
            <BranchActivityCard
              branch={branch}
              branchIndex={index}
              collaborators={collaborators}
            />
          </div>
        </Fragment>
      ))}

      {hasSpineBelow ? (
        <span
          className={cn(
            'pointer-events-none absolute bottom-5 z-0 h-5 w-px bg-border/80',
            TIMELINE_SPINE_X,
          )}
          aria-hidden
        />
      ) : null}
    </li>
  );
}

function branchLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function riskLabel(level: PlanningDaySplitSegmentDto['riskLevel']): string {
  if (level === 'low') return '低';
  if (level === 'medium') return '中';
  if (level === 'high') return '高';
  return '';
}

function riskToneClass(level: PlanningDaySplitSegmentDto['riskLevel']): string {
  if (level === 'low') return workbenchSplitSegmentRiskClass('low');
  if (level === 'medium') return workbenchSplitSegmentRiskClass('medium');
  if (level === 'high') return workbenchSplitSegmentRiskClass('high');
  return 'border-border/60 bg-muted/30 text-muted-foreground';
}

function intensityLabel(intensity: PlanningDaySplitSegmentDto['intensity']): string | null {
  if (intensity === 'high') return '高强度体验';
  if (intensity === 'medium') return '中等强度';
  if (intensity === 'low') return '轻松体验';
  return null;
}

function resolveBranchPeakRisk(
  segments: PlanningDaySplitSegmentDto[],
): PlanningDaySplitSegmentDto['riskLevel'] | undefined {
  const rank = { low: 1, medium: 2, high: 3 } as const;
  let peak: PlanningDaySplitSegmentDto['riskLevel'] | undefined;
  for (const segment of segments) {
    if (!segment.riskLevel) continue;
    if (!peak || rank[segment.riskLevel] > rank[peak]) peak = segment.riskLevel;
  }
  return peak;
}

function resolveTotalMemberCount(split: PlanningDaySplitDto): number | null {
  const sum = split.branches.reduce((acc, branch) => acc + branch.memberCount, 0);
  return sum > 0 ? sum : null;
}

function TimelineDot({ fork = false }: { fork?: boolean }) {
  return (
    <span
      className={cn(
        'relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background',
        fork && cn('h-7 w-7', workbenchSplitForkDot),
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full bg-primary/70',
          fork && 'h-2.5 w-2.5 bg-foreground/45',
        )}
      />
    </span>
  );
}

function BranchActivityCard({
  branch,
  branchIndex,
  collaborators,
}: {
  branch: PlanningDaySplitBranchDto;
  branchIndex: number;
  collaborators?: Collaborator[];
}) {
  const branchVariant = branch.variant as WorkbenchSplitBranchVariant | undefined;
  const theme = workbenchSplitBranchTheme(branchIndex, branchVariant);
  const letter = branchLetter(branchIndex);
  const segments = branch.segments;
  if (segments.length === 0) return null;

  const primary = segments[0]!;
  const intensity = intensityLabel(primary.intensity);
  const peakRisk = resolveBranchPeakRisk(segments);

  return (
    <div className="relative min-w-0 flex-1">
      <div
        className={cn(
          'flex min-w-0 items-stretch overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
          theme.card,
        )}
      >
        {/* 组信息 */}
        <div className={cn('min-w-[26%] shrink-0 border-r p-3', theme.divider)}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-md px-1 text-[10px] font-bold',
                theme.badge,
              )}
            >
              {letter}
            </span>
            <span className="text-[11px] font-semibold text-foreground">{branch.groupLabel}</span>
          </div>
          {intensity === '高强度体验' ? (
            <Badge
              variant="outline"
              className="mt-1 rounded-full border-border/60 bg-muted/10 px-1.5 py-0 text-[10px] font-normal text-warning hover:bg-muted/10"
            >
              <Flame className="mr-0.5 inline h-3 w-3" />
              {intensity}
            </Badge>
          ) : intensity ? (
            <Badge variant="outline" className="mt-1 rounded-full px-1.5 py-0 text-[10px] font-normal">
              {intensity}
            </Badge>
          ) : null}
          <SplitPlanGroupMembers
            memberCount={branch.memberCount}
            members={branch.members}
            memberIds={branch.memberIds}
            groupId={branch.groupId}
            groupLabel={branch.groupLabel}
            collaborators={collaborators}
            branchIndex={branchIndex}
            branchVariant={branchVariant}
            compact
          />
        </div>

        {/* POI 列表 */}
        <div className={cn('min-w-0 flex-1 border-r p-3', theme.divider)}>
          <SplitPlanTimelineSegmentLines segments={segments} />
        </div>

        {/* 风险（BFF segment.riskLevel） */}
        <div className="flex w-[22%] shrink-0 flex-col justify-center gap-1.5 p-2.5">
          {peakRisk ? (
            <span
              className={cn(
                'rounded-md border px-2 py-1 text-[10px] font-medium',
                riskToneClass(peakRisk),
              )}
            >
              风险等级：{riskLabel(peakRisk)}
            </span>
          ) : null}
        </div>

      </div>
    </div>
  );
}

function SharedTimelineRow({
  segment,
  groupTag,
  icon: Icon = MapPin,
  isLast = false,
  isForkAnchor = false,
}: {
  segment: PlanningDaySplitSegmentDto;
  groupTag?: string | null;
  icon?: LucideIcon;
  isLast?: boolean;
  isForkAnchor?: boolean;
}) {
  const label = segmentLabel(segment);
  const subtitle = segmentSubtitle(segment);
  const duration = resolveSegmentDurationLabel(segment);
  const highlights = segmentHighlightsExcludingSubtitle(segment);

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!isLast ? (
        <span
          className="absolute left-[11px] top-7 h-[calc(100%-12px)] w-px bg-border/80"
          aria-hidden
        />
      ) : null}
      <span className="w-11 shrink-0 pt-1 text-xs font-semibold tabular-nums text-foreground">
        {segment.startTime}
      </span>
      <TimelineDot fork={isForkAnchor} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div
          className={cn(
            'flex items-start justify-between gap-2',
            isForkAnchor && 'rounded-lg border border-border/40 bg-muted/10 px-2 py-1.5',
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-xs font-medium leading-snug text-foreground">{label}</p>
            </div>
            {subtitle ? (
              <p className="mt-0.5 pl-5 text-[11px] text-muted-foreground">{subtitle}</p>
            ) : null}
            {duration && segment.endTime ? (
              <p className="mt-0.5 pl-5 text-[11px] tabular-nums text-muted-foreground">{duration}</p>
            ) : null}
            {highlights.length > 0 ? (
              <ul className="mt-1 space-y-0.5 pl-5">
                {highlights.map((item) => (
                  <li key={item} className="text-[10px] text-muted-foreground">
                    · {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {groupTag ? (
            <Badge
              variant="outline"
              className="shrink-0 rounded-full border-border/70 px-2 py-0 text-[10px] font-normal text-muted-foreground"
            >
              {groupTag}
            </Badge>
          ) : null}
          {isForkAnchor ? (
            <Badge
              variant="outline"
              className="shrink-0 rounded-full border-border/45 bg-muted/12 px-2 py-0 text-[10px] font-normal text-foreground"
            >
              分叉
            </Badge>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function RejoinTimelineRow({
  segment,
  meetupTime,
  groupTag,
}: {
  segment: PlanningDaySplitSegmentDto;
  /** BFF stats.meetupTime — 汇合时刻 SSOT，不用分支末段 startTime */
  meetupTime?: string | null;
  groupTag?: string | null;
}) {
  const label = segmentLabel(segment);
  const time = meetupTime?.trim() || segment.startTime;
  const subtitle = segmentSubtitle(segment);

  return (
    <li className="relative flex gap-3 pb-5">
      <span
        className={cn(
          'pointer-events-none absolute top-0 z-0 h-7 w-px bg-border/80',
          TIMELINE_SPINE_X,
        )}
        aria-hidden
      />
      <span className="w-11 shrink-0 pt-1 text-xs font-semibold tabular-nums text-foreground">
        {time}
      </span>
      <TimelineDot fork />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className={cn(workbenchSplitRejoinSurface, 'px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]')}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>
            {groupTag ? (
              <Badge
                variant="outline"
                className="shrink-0 rounded-full border-border/70 bg-background/80 px-2 py-0 text-[10px] font-normal text-muted-foreground"
              >
                {groupTag}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/** 中栏 · 某日并行分流时间线（BFF `daySplits[]`，设计稿统一时间轴样式） */
export function WorkbenchDaySplitTimeline({
  split,
  collaborators,
  className,
}: WorkbenchDaySplitTimelineProps) {
  const { stats, sharedBefore, branches, rejoin, sharedAfter, title, dayNumber, dateLabel, fork } =
    split;

  const totalMembers = resolveTotalMemberCount(split);
  const groupTag = totalMembers ? `${totalMembers} 人一起` : null;
  const forkTime = fork?.startTime ?? branches[0]?.segments[0]?.startTime ?? '—';

  return (
    <div className={cn(workbenchSplitTimelineShell, 'flex min-h-[420px] flex-col overflow-hidden', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 bg-muted/8 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            Day {dayNumber}
            {dateLabel ? ` · ${dateLabel}` : ''} · {title}
          </h3>
          <p className="mt-0.5 text-[10px] font-medium text-foreground">并行分流预览</p>
        </div>
        {stats?.satisfactionBadge ? (
          <Badge className={cn('rounded-full px-2 py-0 text-[10px] font-medium', workbenchFeasibilityBadge)}>
            {stats.satisfactionBadge}
          </Badge>
        ) : null}
      </div>

      {stats && (stats.splitDuration || stats.meetupTime || stats.feasibility) ? (
        <div className={workbenchSplitStatsBar}>
          {stats.splitDuration ? (
            <div>
              <p className="text-[10px] text-muted-foreground">分流时长</p>
              <p className={cn(workbenchSecondaryMetric, 'text-xs font-semibold')}>{stats.splitDuration}</p>
            </div>
          ) : null}
          {stats.meetupTime ? (
            <div>
              <p className="text-[10px] text-muted-foreground">汇合时间</p>
              <p className={cn(workbenchSecondaryMetric, 'text-xs font-semibold')}>{stats.meetupTime}</p>
            </div>
          ) : null}
          {stats.feasibility ? (
            <div>
              <p className="text-[10px] text-muted-foreground">整体可行度</p>
              <p className={cn(workbenchSecondaryMetric, 'text-xs font-semibold text-success')}>
                {stats.feasibility}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <ol className="relative space-y-0 pl-1">
          {sharedBefore.map((segment, index) => (
            <SharedTimelineRow
              key={segment.id}
              segment={segment}
              groupTag={groupTag}
              icon={index === 0 ? Car : MapPin}
              isForkAnchor={fork?.afterSegmentId === segment.id}
              isLast={
                sharedBefore.length === 1 &&
                branches.length === 0 &&
                !rejoin &&
                sharedAfter.length === 0
              }
            />
          ))}

          {branches.length > 0 ? (
            <ForkBranchesSection
              branches={branches}
              forkTime={forkTime}
              hasSpineAbove={sharedBefore.length > 0}
              hasSpineBelow={Boolean(rejoin || sharedAfter.length > 0)}
              collaborators={collaborators}
            />
          ) : null}

          {rejoin ? (
            <RejoinTimelineRow segment={rejoin} meetupTime={stats?.meetupTime} groupTag={groupTag} />
          ) : null}

          {sharedAfter.map((segment, index) => (
            <SharedTimelineRow
              key={segment.id}
              segment={segment}
              groupTag={groupTag}
              icon={Clock}
              isLast={index === sharedAfter.length - 1}
            />
          ))}
        </ol>

        {sharedBefore.length === 0 &&
        branches.length === 0 &&
        !rejoin &&
        sharedAfter.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">暂无分流时间线数据</p>
        ) : null}
      </div>
    </div>
  );
}
