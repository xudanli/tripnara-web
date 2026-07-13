import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { personaMemberTagClasses } from '@/components/team-collaboration/persona-ui';
import type { TeamTravelStyleItem } from '@/types/trip-decision-profiling';
import { cn } from '@/lib/utils';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';

interface MemberPersonaCardsWidgetProps {
  members: TeamTravelStyleItem[];
  loading?: boolean;
  /** 列数，默认 4 */
  columns?: 2 | 4;
}

function memberInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.slice(0, 1).toUpperCase();
}

function keywordChips(member: TeamTravelStyleItem): string[] {
  if (member.coreDrivers?.length) return member.coreDrivers.slice(0, 3);
  return member.compatibilityHints.slice(0, 3);
}

export function MemberPersonaCardsWidget({ members, loading, columns = 4 }: MemberPersonaCardsWidgetProps) {
  const gridClass =
    columns === 2 ? 'grid gap-2 sm:grid-cols-2' : 'grid gap-2 sm:grid-cols-2 lg:grid-cols-4';

  if (loading) {
    return (
      <div className={gridClass}>
        {[1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className={cn(workbenchCard, 'p-3')}>
        <p className="text-xs text-muted-foreground">成员完成调查后将显示画像卡片。</p>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {members.map((member, index) => {
        const confidencePct =
          member.confidence != null ? Math.round(member.confidence * 100) : null;
        const chips = keywordChips(member);
        const insight =
          member.compatibilityHints[0] ??
          member.teamRole ??
          '完成调查后将生成画像洞察。';
        const tagClass = personaMemberTagClasses[index % personaMemberTagClasses.length];

        return (
          <article key={member.userId} className={cn(workbenchCard, 'flex h-full flex-col p-2.5')}>
            <div className="flex items-start gap-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                aria-hidden
              >
                {memberInitials(member.displayName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {member.displayName}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn('shrink-0 text-[10px] font-normal', tagClass)}
                  >
                    {member.styleLabel}
                  </Badge>
                </div>
              </div>
            </div>
            {confidencePct != null ? (
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>置信度</span>
                  <span className="tabular-nums font-medium text-foreground">
                    {confidencePct}%
                  </span>
                </div>
                <Progress value={confidencePct} className="h-1 bg-muted [&>div]:bg-primary" />
              </div>
            ) : null}
            {chips.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">关键词</p>
                <div className="flex flex-wrap gap-1">
                  {chips.map((chip) => (
                    <Badge
                      key={chip}
                      variant="outline"
                      className="border-border/80 bg-muted/30 text-[10px] font-normal text-muted-foreground"
                    >
                      {chip}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-auto pt-3">
              <p className="mb-1 text-[10px] font-medium text-muted-foreground">协作提示</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{insight}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
