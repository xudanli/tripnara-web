import { Link } from 'react-router-dom';
import { Crown, ExternalLink, Loader2, RefreshCw, UserRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { MatchSquareRoster } from '@/lib/match-square-trip-roster';

type MatchSquareRosterPanelProps = {
  roster: MatchSquareRoster | null;
  rosterLoading: boolean;
  isImporting: boolean;
  importError: string | null;
  onRetryImport: () => void;
  onManualCreate?: () => void;
};

export function MatchSquareRosterPanel({
  roster,
  rosterLoading,
  isImporting,
  importError,
  onRetryImport,
  onManualCreate,
}: MatchSquareRosterPanelProps) {
  const memberCount = roster?.members.length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              搭子车队
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {roster?.destination
                ? `来自搭子广场成团 · ${roster.destination}`
                : '来自搭子广场成团'}
            </CardDescription>
          </div>
          {roster?.recruitmentPostId && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
              <Link to={`/dashboard/tripnara/plaza/${roster.recruitmentPostId}`}>
                查看招募帖
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rosterLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : memberCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            暂未找到已通过队员。请先在招募帖管理页审批申请，或手动创建团队。
          </p>
        ) : (
          <ul className="space-y-2">
            {roster!.members.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border">
                    {member.role === 'captain' ? (
                      <Crown className="h-4 w-4 text-amber-500" aria-hidden />
                    ) : (
                      <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.displayName}</p>
                    {member.cardTitle && (
                      <p className="truncate text-xs text-muted-foreground">{member.cardTitle}</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                  {member.role === 'captain' ? '队长' : '队员'}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        {isImporting && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            正在导入搭子成员到行程团队…
          </div>
        )}

        {importError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm space-y-2">
            <p className="text-destructive">导入失败：{importError}</p>
            <Button size="sm" variant="outline" className="h-8" onClick={onRetryImport}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              重试导入
            </Button>
          </div>
        )}

        {!isImporting && !importError && memberCount > 0 && (
          <p className="text-xs text-muted-foreground">
            系统将自动把 {memberCount} 名搭子成员同步为行程团队成员，便于发起团队协商。
          </p>
        )}

        {onManualCreate && (
          <div className="flex justify-end pt-1">
            <Button variant="ghost" size="sm" className="text-xs" onClick={onManualCreate}>
              改为手动创建团队
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
