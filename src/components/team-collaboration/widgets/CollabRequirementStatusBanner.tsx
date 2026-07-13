import { Bell, ClipboardList, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { buildTeamStatusSummary } from '@/lib/collab-members-requirement.util';
import type { TeamRequirementProfile } from '@/types/team-requirement-profile';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface CollabRequirementStatusBannerProps {
  profile: TeamRequirementProfile;
  onRemind?: () => void;
  onManageInvites?: () => void;
  className?: string;
}

/** 团队与需求 · 填写进度单行顶栏（对齐 Decision/Wish Banner） */
export function CollabRequirementStatusBanner({
  profile,
  onRemind,
  onManageInvites,
  className,
}: CollabRequirementStatusBannerProps) {
  const expected = profile.expectedCount || profile.members.length;
  const pendingCount = Math.max(0, expected - profile.submittedCount);
  const summary = buildTeamStatusSummary(profile);

  const handleRemind = () => {
    if (onRemind) {
      onRemind();
      return;
    }
    const targets = profile.informationGaps.map((g) => g.displayName).join('、');
    if (!targets) {
      toast.message('所有成员均已提交问卷');
      return;
    }
    toast.success(`已发送填写提醒给：${targets}`);
  };

  return (
    <section className={cn(workbenchCard, 'p-2.5', className)}>
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-2.5">
        <div className="grid shrink-0 grid-cols-2 gap-x-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] text-muted-foreground">填写完成率</p>
              <p className="text-lg font-semibold tabular-nums leading-tight text-foreground">
                {profile.completionRate}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] text-muted-foreground">已提交</p>
              <p className="text-lg font-semibold tabular-nums leading-tight text-foreground">
                {profile.submittedCount}
                <span className="text-sm font-normal text-muted-foreground">/{expected}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="hidden shrink-0 self-stretch xl:block xl:w-px xl:bg-border/60" aria-hidden />

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <p className="min-w-0 truncate text-[10px] leading-snug text-muted-foreground" title={summary}>
            <span className="mr-1 font-semibold text-foreground">AI</span>
            {summary}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 self-start xl:self-center">
          {onManageInvites ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2.5 text-xs"
              onClick={onManageInvites}
            >
              管理邀请
            </Button>
          ) : null}
          {pendingCount > 0 ? (
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 px-2.5 text-xs"
              onClick={handleRemind}
            >
              <Bell className="h-3.5 w-3.5" />
              提醒填写
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
