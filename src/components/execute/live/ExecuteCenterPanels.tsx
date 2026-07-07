import { Footprints, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  workbenchSplitBranchBadgeClass,
  workbenchSplitBranchCardClass,
  workbenchSplitRejoinSurface,
} from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';
import { semanticWarnText } from '@/lib/semantic-ui-classes';
import { executeCenterUi } from './execute-center-ui';

export interface SplitGroupInfo {
  id: string;
  label: string;
  memberCount: number;
  activity: string;
  intensity: 'high' | 'low' | 'medium';
  leader?: string;
  gearStatus?: string;
  comfortRating?: string;
  meetingTime?: string;
  meetingPlace?: string;
}

interface ExecuteSplitArrangementPanelProps {
  groups: SplitGroupInfo[];
  reunionSummary?: string;
  className?: string;
}

function intensityLabel(intensity: SplitGroupInfo['intensity']): string {
  if (intensity === 'high') return 'Moderate intensity';
  if (intensity === 'low') return 'Low intensity';
  return 'Medium intensity';
}

export function ExecuteSplitArrangementPanel({
  groups,
  reunionSummary,
  className,
}: ExecuteSplitArrangementPanelProps) {
  if (groups.length === 0) return null;

  return (
    <section className={cn(executeCenterUi.card, className)}>
      <div className={executeCenterUi.cardHeader}>
        <h3 className={executeCenterUi.sectionTitle}>分流执行安排</h3>
      </div>
      <div className={cn(executeCenterUi.cardBody, 'space-y-3')}>
        {groups.map((group, index) => {
          const letter = index === 0 ? 'A' : 'B';
          return (
            <article
              key={group.id}
              className={cn('p-3 space-y-2', workbenchSplitBranchCardClass(index))}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-md px-1 text-[10px] font-bold',
                      workbenchSplitBranchBadgeClass(index),
                    )}
                  >
                    {letter}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{group.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{group.activity}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-[10px] shrink-0', executeCenterUi.badgeNeutral)}>
                  {intensityLabel(group.intensity)}
                </Badge>
              </div>

              {(group.meetingTime || group.meetingPlace) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {[group.meetingTime, group.meetingPlace].filter(Boolean).join(' · ')}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {group.leader ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    领队 {group.leader}
                  </span>
                ) : null}
                {group.gearStatus ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 border',
                      executeCenterUi.badgeSuccess,
                    )}
                  >
                    <Footprints className="h-3 w-3" />
                    {group.gearStatus}
                  </span>
                ) : null}
                {group.comfortRating ? <span>{group.comfortRating}</span> : null}
              </div>
            </article>
          );
        })}

        {reunionSummary ? (
          <div
            className={cn(
              workbenchSplitRejoinSurface,
              'flex min-h-[44px] items-center px-3 py-2.5 text-xs leading-snug text-muted-foreground',
            )}
          >
            {reunionSummary}
          </div>
        ) : null}
      </div>
    </section>
  );
}

interface ExecuteProgressSummaryCardsProps {
  routeProgressLabel?: string;
  arrivalEta?: string;
  delayMinutes?: number;
  nextActivityLabel?: string;
  nextActivityTime?: string;
  nextActivityStatus?: string;
  gatheringSplitNote?: string;
  className?: string;
}

export function ExecuteProgressSummaryCards({
  routeProgressLabel,
  arrivalEta,
  delayMinutes,
  nextActivityLabel,
  nextActivityTime,
  nextActivityStatus,
  gatheringSplitNote,
  className,
}: ExecuteProgressSummaryCardsProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {routeProgressLabel ? (
        <div className={executeCenterUi.progressCard}>
          <p className="text-[11px] font-medium text-muted-foreground">当前进行中</p>
          <p className="mt-1 text-sm font-semibold text-foreground leading-snug">{routeProgressLabel}</p>
          {arrivalEta ? (
            <p className="mt-1 text-xs">
              <span className="text-muted-foreground">预计到达 </span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  delayMinutes ? semanticWarnText : 'text-foreground',
                )}
              >
                {arrivalEta}
                {delayMinutes ? ` (延迟 ${delayMinutes} 分钟)` : ''}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {nextActivityLabel ? (
        <div className={executeCenterUi.summaryCard}>
          <p className="text-[11px] text-muted-foreground">下一项活动</p>
          <div className="mt-1 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{nextActivityLabel}</p>
              {nextActivityTime ? (
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{nextActivityTime} 开始</p>
              ) : null}
            </div>
            {nextActivityStatus ? (
              <Badge variant="outline" className={cn('text-[10px] h-5 shrink-0', executeCenterUi.badgeWarning)}>
                {nextActivityStatus}
              </Badge>
            ) : null}
          </div>
        </div>
      ) : null}

      {gatheringSplitNote ? (
        <div className={executeCenterUi.summaryCard}>
          <p className="text-[11px] text-muted-foreground">集合与分流</p>
          <p className="mt-1 text-sm text-foreground leading-snug">{gatheringSplitNote}</p>
        </div>
      ) : null}
    </div>
  );
}
