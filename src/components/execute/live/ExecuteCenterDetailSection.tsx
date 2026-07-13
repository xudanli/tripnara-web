import {
  CheckCircle2,
  Circle,
  Mountain,
  Star,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  workbenchDecisionCheckerBadgeClass,
  workbenchSplitBranchBadgeClass,
  workbenchSplitBranchCardClass,
  workbenchSplitBranchTheme,
  workbenchSplitRejoinSurface,
} from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';
import { semanticGoodText } from '@/lib/semantic-ui-classes';
import {
  executeTimelineStatusLabel,
  type ExecuteCenterDetailModel,
  type ExecuteDayTimelineEntry,
  type ExecuteSplitGroupDetail,
  type ExecuteTimelineEntryStatus,
} from '@/lib/execute-center-detail.util';
import { executeCenterUi } from './execute-center-ui';
import { executeSidebarUi, executeTimelineUi } from './execute-sidebar-ui';

interface ExecuteCenterDetailSectionProps {
  model: ExecuteCenterDetailModel;
  className?: string;
}

function intensityLabel(intensity: ExecuteSplitGroupDetail['intensity']): string {
  if (intensity === 'high') return '高强度';
  if (intensity === 'low') return '低强度';
  return '中等强度';
}

function TimelineStatusIcon({ status }: { status: ExecuteTimelineEntryStatus }) {
  if (status === 'done') {
    return <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0', semanticGoodText)} aria-hidden />;
  }
  if (status === 'current') {
    return (
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-foreground ring-2 ring-border/80"
        aria-hidden
      />
    );
  }
  return <Circle className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />;
}

function statusBadgeClass(status: ExecuteTimelineEntryStatus): string {
  if (status === 'done') return workbenchDecisionCheckerBadgeClass('success');
  if (status === 'current') return workbenchDecisionCheckerBadgeClass('warning');
  return workbenchDecisionCheckerBadgeClass('neutral');
}

function parseComfortStars(rating?: string): number {
  if (!rating) return 0;
  const match = rating.match(/^(\d+)/);
  if (!match) return 0;
  return Math.min(5, Math.max(0, parseInt(match[1], 10)));
}

function resolveSplitBranchIndex(group: ExecuteSplitGroupDetail, index: number): number {
  if (group.id === 'b' || group.id === 'rest') return 1;
  if (group.id === 'a' || group.id === 'trek') return 0;
  return index;
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 text-[10px] leading-snug">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 font-medium text-foreground">{value}</span>
    </div>
  );
}

function SplitGroupCard({
  group,
  branchIndex,
}: {
  group: ExecuteSplitGroupDetail;
  branchIndex: number;
}) {
  const branchTheme = workbenchSplitBranchTheme(branchIndex);
  const letter = branchIndex === 0 ? 'A' : 'B';
  const comfortStars = parseComfortStars(group.comfortRating);

  return (
    <article className={cn('min-w-0 p-2.5', workbenchSplitBranchCardClass(branchIndex))}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">{group.label}</p>
          <p className={cn('mt-0.5 text-[11px] font-medium leading-snug', branchTheme.themeText)}>
            {group.activity}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-md px-1 text-[10px] font-bold',
            workbenchSplitBranchBadgeClass(branchIndex),
          )}
        >
          {letter}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3 shrink-0" aria-hidden />
          {group.memberCount}人
        </span>
        <span className="inline-flex items-center gap-1">
          <Mountain className="h-3 w-3 shrink-0" aria-hidden />
          {intensityLabel(group.intensity)}
        </span>
      </div>

      <div className={cn('mt-2 space-y-1 border-t pt-2', branchTheme.divider)}>
        <DetailRow label="集合时间" value={group.meetingTime} />
        <DetailRow label="集合地点" value={group.meetingPlace} />
        <DetailRow label="负责人" value={group.leader} />
        <DetailRow label="交通安排" value={group.transportNote} />
        {group.gearStatus ? (
          <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 items-center text-[10px]">
            <span className="text-muted-foreground">装备状态</span>
            <Badge
              variant="outline"
              className={cn(
                executeTimelineUi.badge,
                'w-fit font-medium',
                workbenchDecisionCheckerBadgeClass('success'),
              )}
            >
              {group.gearStatus}
            </Badge>
          </div>
        ) : null}
        {comfortStars > 0 ? (
          <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 items-center text-[10px]">
            <span className="text-muted-foreground">舒适度</span>
            <div className="flex items-center gap-0.5" aria-label={`舒适度 ${comfortStars} / 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-2.5 w-2.5',
                    i < comfortStars
                      ? 'fill-foreground/60 text-foreground/60'
                      : 'text-muted-foreground/30',
                  )}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function TimelineRow({ entry }: { entry: ExecuteDayTimelineEntry }) {
  return (
    <li
      className={cn(
        'grid grid-cols-[2.25rem_0.75rem_minmax(0,1fr)_auto] items-start gap-x-1 px-1 py-0.5 rounded-md',
        entry.status === 'current' && executeCenterUi.timelineCurrent,
      )}
    >
      <span className={cn(executeSidebarUi.rowTime, 'pt-0')}>{entry.timeLabel}</span>
      <div className="pt-1">
        <TimelineStatusIcon status={entry.status} />
      </div>
      <div className="min-w-0">
        <p className={cn(executeTimelineUi.stepTitle, 'leading-snug truncate')}>{entry.title}</p>
        {entry.detail ? (
          <p className={cn(executeTimelineUi.stepMeta, 'mt-0.5 truncate')}>{entry.detail}</p>
        ) : null}
      </div>
      <Badge variant="outline" className={cn(executeTimelineUi.badge, statusBadgeClass(entry.status))}>
        {executeTimelineStatusLabel(entry.status)}
      </Badge>
    </li>
  );
}

export function ExecuteCenterDetailSection({
  model,
  className,
}: ExecuteCenterDetailSectionProps) {
  const { timeline, splitGroups, reunionSummary } = model;

  return (
    <section
      className={cn(
        'rounded-t-2xl border border-b-0 border-border bg-card shadow-sm',
        className,
      )}
      data-section="execute-center-detail"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <div className="border-b lg:border-b-0 lg:border-r border-border/70 p-1.5 sm:p-2 min-w-0">
          <h3 className={cn(executeTimelineUi.stepTitle, 'font-semibold mb-1')}>今日行程时间线</h3>
          {timeline.length > 0 ? (
            <ol className="space-y-0.5">
              {timeline.map((entry) => (
                <TimelineRow key={entry.id} entry={entry} />
              ))}
            </ol>
          ) : (
            <p className="px-1 py-3 text-xs text-muted-foreground">今日暂无行程安排，或数据同步中。</p>
          )}
        </div>

        <div className="p-1.5 sm:p-2 min-w-0">
          <h3 className={cn(executeTimelineUi.stepTitle, 'font-semibold mb-1')}>分流执行安排</h3>
          {splitGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {splitGroups.map((group, index) => (
                <SplitGroupCard
                  key={group.id}
                  group={group}
                  branchIndex={resolveSplitBranchIndex(group, index)}
                />
              ))}
            </div>
          ) : (
            <p className="py-3 text-xs text-muted-foreground">
              {reunionSummary
                ? '分流组详情同步中，汇合信息如下。'
                : '暂无分流安排。发起分组执行后将显示各组详情。'}
            </p>
          )}
          {reunionSummary ? (
            <div
              className={cn(
                workbenchSplitRejoinSurface,
                'mt-1.5 flex min-h-[44px] items-center px-3 py-2.5 text-xs leading-snug text-muted-foreground',
              )}
            >
              {reunionSummary}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
